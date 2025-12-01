import OpenAI from 'openai';
import { db } from '../database/init';
import NodeCache from 'node-cache';

// Get and validate API key (trim quotes and whitespace)
const getApiKey = (): string => {
  const key = (process.env.OPENAI_API_KEY || '').trim().replace(/^["']|["']$/g, '');
  if (!key || key.length === 0) {
    throw new Error(
      'OPENAI_API_KEY is not set. Please add your OpenAI API key to the .env file in the backend directory.\n' +
      'Get your API key from: https://platform.openai.com/account/api-keys'
    );
  }
  return key;
};

// Initialize OpenAI client lazily (only when needed)
let openaiClient: OpenAI | null = null;
const getOpenAIClient = (): OpenAI => {
  if (!openaiClient) {
    openaiClient = new OpenAI({
      apiKey: getApiKey(),
    });
  }
  return openaiClient;
};

const MODEL = process.env.OPENAI_MODEL || 'gpt-3.5-turbo';

// In-memory cache for LLM responses (fast access)
const memoryCache = new NodeCache({
  stdTTL: parseInt(process.env.CACHE_TTL_SECONDS || '3600'), // 1 hour default
  checkperiod: 600, // Check for expired keys every 10 minutes
  maxKeys: parseInt(process.env.MAX_CACHED_ARTICLES || '1000'),
});

interface Word {
  id: string;
  word: string;
  definition: string;
}

/**
 * Generate a quiz article using LLM with caching to reduce costs and latency
 */
export async function generateQuizArticle(words: Word[]): Promise<string> {
  if (words.length === 0) {
    throw new Error('No words provided for article generation');
  }

  // Create cache key from sorted word IDs
  const cacheKey = words
    .map(w => w.id)
    .sort()
    .join(',');

  // Check in-memory cache first (fastest)
  const cachedMemory = memoryCache.get<string>(cacheKey);
  if (cachedMemory) {
    console.log('📦 Cache hit (memory) for article generation');
    return cachedMemory;
  }

  // Check database cache (persistent across restarts)
  const cachedDb = db
    .prepare('SELECT article_text FROM cached_articles WHERE word_ids = ?')
    .get(cacheKey) as { article_text: string } | undefined;

  if (cachedDb) {
    console.log('💾 Cache hit (database) for article generation');
    // Update access stats
    db.prepare(`
      UPDATE cached_articles 
      SET access_count = access_count + 1, 
          last_accessed = strftime('%s', 'now')
      WHERE word_ids = ?
    `).run(cacheKey);

    // Store in memory cache for faster future access
    memoryCache.set(cacheKey, cachedDb.article_text);
    return cachedDb.article_text;
  }

  // Cache miss - generate new article using LLM
  console.log('🤖 Generating new article with LLM...');
  const article = await generateArticleWithLLM(words);

  // Store in both caches
  memoryCache.set(cacheKey, article);
  
  // Store in database cache
  const articleId = `article-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  db.prepare(`
    INSERT INTO cached_articles (id, word_ids, article_text)
    VALUES (?, ?, ?)
  `).run(articleId, cacheKey, article);

  // Clean up old cached articles (keep only recent ones)
  cleanupOldCache();

  return article;
}

/**
 * Generate article using OpenAI API
 */
async function generateArticleWithLLM(words: Word[]): Promise<string> {
  // Get OpenAI client (will throw if API key is missing)
  const openai = getOpenAIClient();

  const wordList = words.map(w => `- ${w.word}: ${w.definition}`).join('\n');

  const prompt = `Generate a coherent, engaging article (3-5 sentences) that naturally incorporates these ${words.length} English words. The article should be educational and contextually appropriate. Use the placeholder "______" where each word should appear.

Words to include:
${wordList}

Requirements:
1. Create a meaningful, flowing article
2. Use "______" as a placeholder for each word (one placeholder per word)
3. Make the article educational and interesting
4. Ensure the context makes it clear which word fits in each blank
5. Keep it concise (3-5 sentences total)

Article:`;

  try {
    const completion = await openai.chat.completions.create({
      model: MODEL,
      messages: [
        {
          role: 'system',
          content: 'You are an expert English teacher who creates engaging educational content. Generate articles that help students learn vocabulary in context.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.7,
      max_tokens: 300, // Limit tokens to control costs
    });

    const article = completion.choices[0]?.message?.content?.trim() || '';
    
    if (!article) {
      throw new Error('Empty response from LLM');
    }

    // Validate that article has correct number of blanks
    const blankCount = (article.match(/______/g) || []).length;
    if (blankCount !== words.length) {
      console.warn(`⚠️ Warning: Article has ${blankCount} blanks but ${words.length} words provided`);
    }

    return article;
  } catch (error: any) {
    console.error('❌ Error generating article with LLM:', error.message);
    
    // Fallback to simple template if LLM fails
    return generateFallbackArticle(words);
  }
}

/**
 * Fallback article generator if LLM fails (cost-free alternative)
 */
function generateFallbackArticle(words: Word[]): string {
  const sentences: string[] = [];
  
  words.forEach((word, index) => {
    const wordLower = word.word.toLowerCase();
    const definition = word.definition.toLowerCase();
    
    if (definition.includes('time') || definition.includes('short')) {
      sentences.push(`The ______ nature of the event made it all the more special.`);
    } else if (definition.includes('everywhere') || definition.includes('present')) {
      sentences.push(`Technology has become ______ in our daily lives.`);
    } else if (definition.includes('chance') || definition.includes('discovery')) {
      sentences.push(`Finding that solution was pure ______.`);
    } else if (definition.includes('speaking') || definition.includes('writing')) {
      sentences.push(`Her ______ presentation captivated the entire audience.`);
    } else if (definition.includes('recover') || definition.includes('difficulties')) {
      sentences.push(`The community proved to be remarkably ______ after the crisis.`);
    } else if (definition.includes('detail') || definition.includes('careful')) {
      sentences.push(`His ______ approach ensured nothing was overlooked.`);
    } else if (definition.includes('meaning') || definition.includes('unclear')) {
      sentences.push(`The instructions were intentionally ______, leaving room for interpretation.`);
    } else if (definition.includes('practical') || definition.includes('real')) {
      sentences.push(`We need a more ______ solution to this problem.`);
    } else {
      // Generic sentence
      sentences.push(`The concept of ______ is essential in this context.`);
    }
  });
  
  return sentences.join(' ');
}

/**
 * Clean up old cached articles to manage database size
 */
function cleanupOldCache() {
  const maxAge = parseInt(process.env.QUIZ_CACHE_TTL_SECONDS || '86400'); // 7 days default
  const cutoffTime = Math.floor(Date.now() / 1000) - maxAge;
  
  // Delete old cache entries
  const deleted = db
    .prepare('DELETE FROM cached_articles WHERE last_accessed < ?')
    .run(cutoffTime);
  
  if (deleted.changes > 0) {
    console.log(`🧹 Cleaned up ${deleted.changes} old cached articles`);
  }
  
  // Also limit total cache size (keep most recently accessed)
  const totalCount = db.prepare('SELECT COUNT(*) as count FROM cached_articles').get() as { count: number };
  const maxCacheSize = parseInt(process.env.MAX_CACHED_ARTICLES || '1000');
  
  if (totalCount.count > maxCacheSize) {
    // Delete oldest entries
    const toDelete = totalCount.count - maxCacheSize;
    db.prepare(`
      DELETE FROM cached_articles 
      WHERE id IN (
        SELECT id FROM cached_articles 
        ORDER BY last_accessed ASC 
        LIMIT ?
      )
    `).run(toDelete);
    console.log(`🧹 Trimmed cache to ${maxCacheSize} entries`);
  }
}

/**
 * Get cache statistics for monitoring
 */
export function getCacheStats() {
  const memoryStats = memoryCache.getStats();
  const dbStats = db
    .prepare('SELECT COUNT(*) as count, SUM(access_count) as total_access FROM cached_articles')
    .get() as { count: number; total_access: number };
  
  return {
    memory: {
      keys: memoryStats.keys,
      hits: memoryStats.hits,
      misses: memoryStats.misses,
      hitRate: memoryStats.hits / (memoryStats.hits + memoryStats.misses) || 0,
    },
    database: {
      cachedArticles: dbStats.count || 0,
      totalAccesses: dbStats.total_access || 0,
    },
  };
}

