import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const DB_PATH = process.env.DATABASE_PATH || path.join(__dirname, '../../data/english_learning.db');
const DB_DIR = path.dirname(DB_PATH);

// Ensure data directory exists
if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}

export const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL'); // Better performance

export function initializeDatabase() {
  console.log('📦 Initializing database...');

  // Words table - stores advanced English words
  db.exec(`
    CREATE TABLE IF NOT EXISTS words (
      id TEXT PRIMARY KEY,
      word TEXT NOT NULL UNIQUE,
      pronunciation TEXT,
      definition TEXT NOT NULL,
      synonym TEXT,
      context_difference TEXT,
      usages TEXT, -- JSON array of usage examples
      difficulty_level INTEGER DEFAULT 1, -- 1=beginner, 2=intermediate, 3=advanced, 4=expert
      category TEXT, -- e.g., 'academic', 'business', 'literary'
      created_at INTEGER DEFAULT (strftime('%s', 'now')),
      updated_at INTEGER DEFAULT (strftime('%s', 'now'))
    );

    CREATE INDEX IF NOT EXISTS idx_words_difficulty ON words(difficulty_level);
    CREATE INDEX IF NOT EXISTS idx_words_category ON words(category);
  `);

  // Users table - for multi-user support (optional, can use device ID)
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      device_id TEXT UNIQUE,
      created_at INTEGER DEFAULT (strftime('%s', 'now')),
      last_active INTEGER DEFAULT (strftime('%s', 'now'))
    );
  `);

  // User words table - tracks words saved by users
  db.exec(`
    CREATE TABLE IF NOT EXISTS user_words (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      word_id TEXT NOT NULL,
      bucket TEXT NOT NULL DEFAULT 'needs work', -- 'needs work', 'familiar', 'well known'
      created_at INTEGER DEFAULT (strftime('%s', 'now')),
      last_reviewed INTEGER,
      review_count INTEGER DEFAULT 0,
      correct_count INTEGER DEFAULT 0,
      incorrect_count INTEGER DEFAULT 0,
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (word_id) REFERENCES words(id),
      UNIQUE(user_id, word_id)
    );

    CREATE INDEX IF NOT EXISTS idx_user_words_user ON user_words(user_id);
    CREATE INDEX IF NOT EXISTS idx_user_words_bucket ON user_words(bucket);
    CREATE INDEX IF NOT EXISTS idx_user_words_word ON user_words(word_id);
  `);

  // Quiz results table - tracks quiz performance
  db.exec(`
    CREATE TABLE IF NOT EXISTS quiz_results (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      word_id TEXT NOT NULL,
      is_correct INTEGER NOT NULL, -- 0 or 1
      quiz_type TEXT DEFAULT 'fill_blank',
      timestamp INTEGER DEFAULT (strftime('%s', 'now')),
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (word_id) REFERENCES words(id)
    );

    CREATE INDEX IF NOT EXISTS idx_quiz_results_user ON quiz_results(user_id);
    CREATE INDEX IF NOT EXISTS idx_quiz_results_word ON quiz_results(word_id);
    CREATE INDEX IF NOT EXISTS idx_quiz_results_timestamp ON quiz_results(timestamp);
  `);

  // Cached quiz articles - to reduce LLM API calls
  db.exec(`
    CREATE TABLE IF NOT EXISTS cached_articles (
      id TEXT PRIMARY KEY,
      word_ids TEXT NOT NULL, -- Comma-separated sorted word IDs (for cache key)
      article_text TEXT NOT NULL,
      created_at INTEGER DEFAULT (strftime('%s', 'now')),
      access_count INTEGER DEFAULT 0,
      last_accessed INTEGER DEFAULT (strftime('%s', 'now'))
    );

    CREATE INDEX IF NOT EXISTS idx_cached_articles_word_ids ON cached_articles(word_ids);
  `);

  // Daily progress table - tracks daily learning statistics
  db.exec(`
    CREATE TABLE IF NOT EXISTS daily_progress (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      date TEXT NOT NULL, -- YYYY-MM-DD format
      words_saved INTEGER DEFAULT 0,
      quizzes_completed INTEGER DEFAULT 0,
      words_reviewed INTEGER DEFAULT 0,
      created_at INTEGER DEFAULT (strftime('%s', 'now')),
      FOREIGN KEY (user_id) REFERENCES users(id),
      UNIQUE(user_id, date)
    );

    CREATE INDEX IF NOT EXISTS idx_daily_progress_user_date ON daily_progress(user_id, date);
  `);

  console.log('✅ Database initialized successfully');
  
  // Seed some advanced words if database is empty
  seedAdvancedWords();
}

interface WordSeed {
  id: string;
  word: string;
  pronunciation: string;
  definition: string;
  synonym: string;
  contextDifference: string;
  usages: string;
  difficulty_level: number;
  category: string;
}

function seedAdvancedWords() {
  const count = db.prepare('SELECT COUNT(*) as count FROM words').get() as { count: number };
  
  if (count.count === 0) {
    console.log('🌱 Seeding advanced words...');
    const advancedWords: WordSeed[] = [
      {
        id: 'word-1',
        word: 'Serendipity',
        pronunciation: '/ˌser.ənˈdɪp.ə.ti/',
        definition: 'The occurrence of pleasant things that happen by chance',
        synonym: 'Luck',
        contextDifference: 'Serendipity implies a fortunate discovery made by accident, often with positive outcomes, while luck is more general.',
        usages: JSON.stringify([
          'Finding that rare book in the small bookstore was pure serendipity.',
          'Their meeting was serendipity, leading to a lifelong friendship.'
        ]),
        difficulty_level: 3,
        category: 'literary'
      },
      {
        id: 'word-2',
        word: 'Ubiquitous',
        pronunciation: '/juːˈbɪk.wɪ.təs/',
        definition: 'Present, appearing, or found everywhere',
        synonym: 'Widespread',
        contextDifference: 'Ubiquitous suggests something is everywhere simultaneously, while widespread indicates broad distribution.',
        usages: JSON.stringify([
          'Smartphones have become ubiquitous in modern society.',
          'The company\'s logo is ubiquitous across all their products.'
        ]),
        difficulty_level: 3,
        category: 'academic'
      },
      {
        id: 'word-3',
        word: 'Ephemeral',
        pronunciation: '/ɪˈfem.ər.əl/',
        definition: 'Lasting for a very short time',
        synonym: 'Temporary',
        contextDifference: 'Ephemeral emphasizes the fleeting nature, often with poetic connotations, while temporary is more neutral.',
        usages: JSON.stringify([
          'The beauty of cherry blossoms is ephemeral, lasting only a few weeks each spring.',
          'Social media trends are ephemeral, quickly replaced by new ones.'
        ]),
        difficulty_level: 3,
        category: 'literary'
      },
      {
        id: 'word-4',
        word: 'Pernicious',
        pronunciation: '/pərˈnɪʃ.əs/',
        definition: 'Having a harmful effect, especially in a gradual or subtle way',
        synonym: 'Harmful',
        contextDifference: 'Pernicious implies subtle, gradual harm that may not be immediately obvious, while harmful is more general.',
        usages: JSON.stringify([
          'The pernicious effects of misinformation spread slowly through social networks.',
          'His pernicious influence corrupted the entire organization.'
        ]),
        difficulty_level: 4,
        category: 'academic'
      },
      {
        id: 'word-5',
        word: 'Ineffable',
        pronunciation: '/ɪˈnef.ə.bəl/',
        definition: 'Too great or extreme to be expressed or described in words',
        synonym: 'Indescribable',
        contextDifference: 'Ineffable emphasizes something beyond verbal expression, often with spiritual or emotional depth.',
        usages: JSON.stringify([
          'The ineffable beauty of the sunset left them speechless.',
          'She felt an ineffable sense of peace after meditation.'
        ]),
        difficulty_level: 4,
        category: 'literary'
      },
      {
        id: 'word-6',
        word: 'Perspicacious',
        pronunciation: '/ˌpɜː.spɪˈkeɪ.ʃəs/',
        definition: 'Having keen mental perception and understanding',
        synonym: 'Insightful',
        contextDifference: 'Perspicacious emphasizes sharp intellectual perception, while insightful focuses on deep understanding.',
        usages: JSON.stringify([
          'The perspicacious analyst predicted the market crash months in advance.',
          'Her perspicacious observations revealed hidden patterns in the data.'
        ]),
        difficulty_level: 4,
        category: 'academic'
      },
      {
        id: 'word-7',
        word: 'Laconic',
        pronunciation: '/ləˈkɒn.ɪk/',
        definition: 'Using very few words; concise to the point of seeming rude',
        synonym: 'Brief',
        contextDifference: 'Laconic implies extreme brevity that may seem terse or abrupt, while brief simply means short.',
        usages: JSON.stringify([
          'His laconic response left no room for further discussion.',
          'The laconic style of the author appealed to readers who preferred minimalism.'
        ]),
        difficulty_level: 3,
        category: 'literary'
      },
      {
        id: 'word-8',
        word: 'Mellifluous',
        pronunciation: '/məˈlɪf.lu.əs/',
        definition: 'Having a sweet, smooth, flowing sound',
        synonym: 'Harmonious',
        contextDifference: 'Mellifluous specifically describes pleasant sounds, especially voices or music, while harmonious is broader.',
        usages: JSON.stringify([
          'The singer\'s mellifluous voice captivated the entire audience.',
          'The mellifluous tones of the violin filled the concert hall.'
        ]),
        difficulty_level: 3,
        category: 'literary'
      }
    ];

    const insert = db.prepare(`
      INSERT INTO words (id, word, pronunciation, definition, synonym, context_difference, usages, difficulty_level, category)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const insertMany = db.transaction((words: WordSeed[]) => {
      for (const word of words) {
        insert.run(
          word.id,
          word.word,
          word.pronunciation,
          word.definition,
          word.synonym,
          word.contextDifference,
          word.usages,
          word.difficulty_level,
          word.category
        );
      }
    });

    insertMany(advancedWords);
    console.log(`✅ Seeded ${advancedWords.length} advanced words`);
  }
}

