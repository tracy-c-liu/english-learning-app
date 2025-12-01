import { db, initializeDatabase } from './init';
import OpenAI from 'openai';
import { GoogleGenerativeAI } from '@google/generative-ai';
import * as dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../.env') });

type LLMProvider = 'openai' | 'gemini';

interface WordData {
  word: string;
  pronunciation: string;
  definition: string;
  synonym: string;
  context_difference: string;
  usages: string[];
  difficulty_level: number;
  category: string;
}

const CATEGORIES = [
  { name: 'professional workspace', wordsPerBatch: 10, totalWords: 10 },
  { name: 'academic', wordsPerBatch: 10, totalWords: 10 },
  { name: 'journalism', wordsPerBatch: 10, totalWords: 10 },
  { name: 'advanced idiom', wordsPerBatch: 10, totalWords: 10 },
];

// Initialize API clients
let openaiClient: OpenAI | null = null;
let geminiClient: GoogleGenerativeAI | null = null;

function getOpenAIClient(): OpenAI {
  if (!openaiClient) {
    const key = (process.env.OPENAI_API_KEY || '').trim().replace(/^["']|["']$/g, '');
    if (!key || key.length === 0) {
      throw new Error('OPENAI_API_KEY is not set in .env file');
    }
    openaiClient = new OpenAI({ apiKey: key });
  }
  return openaiClient;
}

function getGeminiClient(): GoogleGenerativeAI {
  if (!geminiClient) {
    const key = (process.env.GEMINI_API_KEY || '').trim().replace(/^["']|["']$/g, '');
    if (!key || key.length === 0) {
      throw new Error('GEMINI_API_KEY is not set in .env file');
    }
    geminiClient = new GoogleGenerativeAI(key);
  }
  return geminiClient;
}

function getAvailableProviders(): LLMProvider[] {
  const providers: LLMProvider[] = [];
  
  const openaiKey = (process.env.OPENAI_API_KEY || '').trim().replace(/^["']|["']$/g, '');
  const geminiKey = (process.env.GEMINI_API_KEY || '').trim().replace(/^["']|["']$/g, '');
  
  if (openaiKey && openaiKey.length > 0) {
    providers.push('openai');
  }
  
  if (geminiKey && geminiKey.length > 0) {
    providers.push('gemini');
  }
  
  if (providers.length === 0) {
    throw new Error('At least one API key must be set: OPENAI_API_KEY or GEMINI_API_KEY');
  }
  
  return providers;
}

/**
 * Parse JSON response from LLM
 */
function parseWordsResponse(content: string): WordData[] {
  let words: WordData[];
  
  try {
    const parsed = JSON.parse(content);
    // Check if it's wrapped in an object with "words" key
    if (parsed.words && Array.isArray(parsed.words)) {
      words = parsed.words;
    } else if (Array.isArray(parsed)) {
      words = parsed;
    } else {
      throw new Error('Invalid response format');
    }
  } catch (e) {
    // Try to extract JSON from markdown code blocks
    const jsonMatch = content.match(/```(?:json)?\s*(\[[\s\S]*\]|{[\s\S]*"words"[\s\S]*})/);
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[1]);
        if (parsed.words && Array.isArray(parsed.words)) {
          words = parsed.words;
        } else if (Array.isArray(parsed)) {
          words = parsed;
        } else {
          throw new Error('Invalid JSON structure');
        }
      } catch (parseError) {
        // Try to find JSON object/array directly
        const directJsonMatch = content.match(/(\{[\s\S]*"words"[\s\S]*\}|\[[\s\S]*\])/);
        if (directJsonMatch) {
          const parsed = JSON.parse(directJsonMatch[1]);
          words = parsed.words || parsed;
        } else {
          throw new Error('Could not parse JSON from response');
        }
      }
    } else {
      throw new Error('Could not parse JSON from response');
    }
  }
  
  return words;
}

/**
 * Generate words using OpenAI API
 */
async function generateWordsWithOpenAI(category: string, count: number): Promise<WordData[]> {
  const openai = getOpenAIClient();
  const prompt = buildPrompt(category, count);
  
  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content: 'You are an expert English vocabulary teacher. Generate accurate, educational vocabulary words with proper metadata.',
      },
      {
        role: 'user',
        content: prompt,
      },
    ],
    temperature: 0.7,
    response_format: { type: 'json_object' },
  });

  const content = completion.choices[0]?.message?.content?.trim() || '';
  return parseWordsResponse(content);
}

/**
 * Generate words using Google Gemini API
 */
async function generateWordsWithGemini(category: string, count: number): Promise<WordData[]> {
  const genAI = getGeminiClient();
  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
  const prompt = buildPrompt(category, count);
  
  const result = await model.generateContent(prompt);
  const response = await result.response;
  const content = response.text().trim();
  
  return parseWordsResponse(content);
}

/**
 * Build the prompt for word generation
 */
function buildPrompt(category: string, count: number): string {
  return `Generate exactly ${count} advanced English vocabulary words for the category "${category}".

For each word, provide:
- word: the vocabulary word (string)
- pronunciation: IPA pronunciation (string, format: /.../)
- definition: clear definition (string)
- synonym: a common synonym (string)
- context_difference: explanation of how this word differs from its synonym (string, 1-2 sentences)
- usages: array of 2-3 example sentences using the word (array of strings)
- difficulty_level: integer from 3-4 (3=advanced, 4=expert)

Requirements:
- All words must be advanced/expert level (difficulty 3 or 4)
- Words should be relevant to ${category}
- Provide accurate pronunciations in IPA format
- Example sentences should be clear and educational
- Return a JSON object with a "words" key containing an array

Return format (JSON object):
{
  "words": [
    {
      "word": "example",
      "pronunciation": "/ɪɡˈzæmpəl/",
      "definition": "a thing characteristic of its kind",
      "synonym": "instance",
      "context_difference": "Example refers to a representative instance, while instance is more general.",
      "usages": ["This is a good example of modern architecture.", "Can you give me an example?"],
      "difficulty_level": 3
    }
  ]
}`;
}

/**
 * Generate words using the specified provider
 */
async function generateWordsBatch(
  category: string,
  count: number,
  batchNumber: number,
  provider: LLMProvider
): Promise<WordData[]> {
  const providerName = provider === 'openai' ? 'OpenAI' : 'Gemini';
  console.log(`Generating batch ${batchNumber} of ${count} words for category: ${category} using ${providerName}...`);
  
  try {
    let words: WordData[];
    
    if (provider === 'openai') {
      words = await generateWordsWithOpenAI(category, count);
    } else {
      words = await generateWordsWithGemini(category, count);
    }
    
    // Add category to each word
    return words.map(word => ({
      ...word,
      category: category.toLowerCase(),
    }));
  } catch (error: any) {
    console.error(`Error generating words with ${providerName} for ${category} batch ${batchNumber}:`, error.message);
    throw error;
  }
}

/**
 * Insert words into database
 */
function insertWords(words: WordData[]): void {
  const insert = db.prepare(`
    INSERT OR IGNORE INTO words (id, word, pronunciation, definition, synonym, context_difference, usages, difficulty_level, category)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertMany = db.transaction((words: WordData[]) => {
    for (const word of words) {
      const id = `word-${word.category}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      insert.run(
        id,
        word.word.toLowerCase(),
        word.pronunciation,
        word.definition,
        word.synonym,
        word.context_difference,
        JSON.stringify(word.usages),
        word.difficulty_level,
        word.category
      );
    }
  });

  insertMany(words);
  console.log(`✅ Inserted ${words.length} words into database`);
}

/**
 * Main function to populate database
 */
async function populateDatabase() {
  console.log('🚀 Starting database population...\n');
  
  // Check available providers
  const availableProviders = getAvailableProviders();
  console.log(`📡 Available LLM providers: ${availableProviders.join(', ')}\n`);
  
  // Ensure database is initialized
  initializeDatabase();

  // Check existing words
  const existingCount = db.prepare('SELECT COUNT(*) as count FROM words').get() as { count: number };
  console.log(`Current words in database: ${existingCount.count}\n`);

  // Track provider usage for alternating
  let providerIndex = 0;
  const providerStats = {
    openai: { batches: 0, words: 0 },
    gemini: { batches: 0, words: 0 },
  };

  for (const category of CATEGORIES) {
    console.log(`\n📚 Processing category: ${category.name}`);
    console.log(`Target: ${category.totalWords} words\n`);

    // Check how many words already exist for this category
    const existingCategoryCount = db.prepare('SELECT COUNT(*) as count FROM words WHERE category = ?')
      .get(category.name.toLowerCase()) as { count: number };
    
    const needed = category.totalWords - existingCategoryCount.count;
    
    if (needed <= 0) {
      console.log(`✅ Category "${category.name}" already has ${existingCategoryCount.count} words (target: ${category.totalWords})`);
      continue;
    }

    console.log(`Need to add ${needed} more words for "${category.name}"`);

    // Track words added in this category
    const wordsAddedBefore = existingCategoryCount.count;

    // Generate words in batches
    const batches = Math.ceil(needed / category.wordsPerBatch);
    
    for (let i = 0; i < batches; i++) {
      const batchSize = Math.min(category.wordsPerBatch, needed - (i * category.wordsPerBatch));
      
      if (batchSize <= 0) break;

      // Alternate between available providers
      const provider = availableProviders[providerIndex % availableProviders.length];
      providerIndex++;

      let retryCount = 0;
      const maxRetries = availableProviders.length; // Try all providers before giving up
      let batchSuccess = false;
      
      while (retryCount < maxRetries) {
        try {
          const words = await generateWordsBatch(category.name, batchSize, i + 1, provider);
          insertWords(words);
          
          // Update stats
          providerStats[provider].batches++;
          providerStats[provider].words += words.length;
          
          batchSuccess = true;
          
          // Add delay to avoid rate limiting (2 seconds between batches)
          await new Promise(resolve => setTimeout(resolve, 2000));
          break; // Success, exit retry loop
        } catch (error: any) {
          retryCount++;
          console.error(`❌ Error with ${provider} in batch ${i + 1} for ${category.name}:`, error.message);
          
          if (retryCount < maxRetries) {
            // Try next provider
            const nextProviderIndex = (providerIndex - 1 + retryCount) % availableProviders.length;
            const nextProvider = availableProviders[nextProviderIndex];
            console.log(`🔄 Retrying with ${nextProvider}...`);
            providerIndex = nextProviderIndex;
          } else {
            console.error(`❌ All providers failed for batch ${i + 1}. Continuing with next batch...`);
          }
        }
      }
    }

    // Verify count after processing
    const finalCount = db.prepare('SELECT COUNT(*) as count FROM words WHERE category = ?')
      .get(category.name.toLowerCase()) as { count: number };
    const wordsAdded = finalCount.count - wordsAddedBefore;
    
    if (wordsAdded > 0) {
      console.log(`✅ Category "${category.name}" now has ${finalCount.count} words (added ${wordsAdded} words)\n`);
    } else if (needed > 0) {
      console.log(`⚠️  Category "${category.name}" still has ${finalCount.count} words (failed to add ${needed} needed words)\n`);
    } else {
      console.log(`✅ Category "${category.name}" now has ${finalCount.count} words\n`);
    }
  }

  // Final summary
  const finalTotal = db.prepare('SELECT COUNT(*) as count FROM words').get() as { count: number };
  console.log(`\n🎉 Database population complete!`);
  console.log(`Total words in database: ${finalTotal.count}`);
  
  // Show breakdown by category
  const breakdown = db.prepare(`
    SELECT category, COUNT(*) as count 
    FROM words 
    GROUP BY category 
    ORDER BY category
  `).all() as Array<{ category: string; count: number }>;
  
  console.log('\n📊 Words by category:');
  breakdown.forEach(({ category, count }) => {
    console.log(`  ${category}: ${count} words`);
  });
  
  // Show provider usage stats
  console.log('\n📈 Provider usage statistics:');
  if (providerStats.openai.batches > 0) {
    console.log(`  OpenAI: ${providerStats.openai.batches} batches, ${providerStats.openai.words} words`);
  }
  if (providerStats.gemini.batches > 0) {
    console.log(`  Gemini: ${providerStats.gemini.batches} batches, ${providerStats.gemini.words} words`);
  }
}

// Run if called directly
if (require.main === module) {
  populateDatabase()
    .then(() => {
      console.log('\n✅ Script completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Script failed:', error);
      process.exit(1);
    });
}

export { populateDatabase };
