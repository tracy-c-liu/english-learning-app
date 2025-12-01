import express from 'express';
import { db } from '../database/init';
import { generateQuizArticle, getCacheStats } from '../services/llmService';

const router = express.Router();

/**
 * POST /api/quiz/generate
 * Generate a quiz article from selected words
 */
router.post('/generate', async (req, res, next) => {
  try {
    const { wordIds, userId } = req.body;
    
    if (!wordIds || !Array.isArray(wordIds) || wordIds.length === 0) {
      return res.status(400).json({ error: 'wordIds array is required' });
    }
    
    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }
    
    // Get word details
    const placeholders = wordIds.map(() => '?').join(',');
    const words = db
      .prepare(`SELECT id, word, definition FROM words WHERE id IN (${placeholders})`)
      .all(...wordIds) as any[];
    
    if (words.length !== wordIds.length) {
      return res.status(400).json({ error: 'Some word IDs are invalid' });
    }
    
    // Generate article (with caching)
    const article = await generateQuizArticle(words);
    
    res.json({
      article,
      words: words.map(w => ({
        id: w.id,
        word: w.word,
        definition: w.definition,
      })),
    });
  } catch (error: any) {
    next(error);
  }
});

/**
 * GET /api/quiz/words/:userId
 * Get words for quiz based on user's progress (prioritizes "needs work" bucket)
 */
router.get('/words/:userId', async (req, res, next) => {
  try {
    const { userId } = req.params;
    const { limit = '5' } = req.query;
    const maxWords = parseInt(limit as string);
    
    // Get user's words, prioritizing "needs work" bucket
    const words = db
      .prepare(`
        SELECT 
          w.*,
          uw.bucket,
          uw.last_reviewed,
          uw.review_count,
          uw.correct_count,
          uw.incorrect_count
        FROM user_words uw
        JOIN words w ON uw.word_id = w.id
        WHERE uw.user_id = ?
        ORDER BY 
          CASE uw.bucket
            WHEN 'needs work' THEN 1
            WHEN 'familiar' THEN 2
            WHEN 'well known' THEN 3
          END,
          uw.last_reviewed ASC NULLS FIRST
        LIMIT ?
      `)
      .all(userId, maxWords) as any[];
    
    if (words.length === 0) {
      return res.json({
        words: [],
        message: 'No words available. Save some words in Learning mode first!',
      });
    }
    
    // Format words
    const formattedWords = words.map(word => ({
      id: word.id,
      word: word.word,
      pronunciation: word.pronunciation,
      definition: word.definition,
      synonym: word.synonym,
      contextDifference: word.context_difference,
      usages: JSON.parse(word.usages || '[]'),
      bucket: word.bucket,
      lastReviewed: word.last_reviewed,
    }));
    
    res.json({
      words: formattedWords,
      count: formattedWords.length,
    });
  } catch (error: any) {
    next(error);
  }
});

/**
 * GET /api/quiz/cache-stats
 * Get cache statistics (for monitoring costs)
 */
router.get('/cache-stats', async (req, res, next) => {
  try {
    const stats = getCacheStats();
    res.json(stats);
  } catch (error: any) {
    next(error);
  }
});

export default router;

