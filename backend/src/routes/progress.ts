import express from 'express';
import { db } from '../database/init';

const router = express.Router();

/**
 * POST /api/progress/user
 * Create or get user (by device ID)
 */
router.post('/user', async (req, res, next) => {
  try {
    const { deviceId } = req.body;
    
    if (!deviceId) {
      return res.status(400).json({ error: 'deviceId is required' });
    }
    
    // Check if user exists
    let user = db
      .prepare('SELECT * FROM users WHERE device_id = ?')
      .get(deviceId) as any;
    
    if (!user) {
      // Create new user
      const userId = `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      db.prepare('INSERT INTO users (id, device_id) VALUES (?, ?)').run(userId, deviceId);
      user = { id: userId, device_id: deviceId };
    } else {
      // Update last active
      db.prepare('UPDATE users SET last_active = strftime(\'%s\', \'now\') WHERE id = ?').run(user.id);
    }
    
    res.json({
      userId: user.id,
      deviceId: user.device_id,
    });
  } catch (error: any) {
    next(error);
  }
});

/**
 * POST /api/progress/save-word
 * Save a word to user's dictionary
 */
router.post('/save-word', async (req, res, next) => {
  try {
    const { userId, wordId } = req.body;
    
    if (!userId || !wordId) {
      return res.status(400).json({ error: 'userId and wordId are required' });
    }
    
    // Check if word exists
    const word = db.prepare('SELECT * FROM words WHERE id = ?').get(wordId) as any;
    if (!word) {
      return res.status(404).json({ error: 'Word not found' });
    }
    
    // Check if user word already exists
    const existing = db
      .prepare('SELECT * FROM user_words WHERE user_id = ? AND word_id = ?')
      .get(userId, wordId) as any;
    
    if (existing) {
      return res.json({
        message: 'Word already saved',
        userWordId: existing.id,
      });
    }
    
    // Save word to user's dictionary
    const userWordId = `uw-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    db.prepare(`
      INSERT INTO user_words (id, user_id, word_id, bucket)
      VALUES (?, ?, ?, 'needs work')
    `).run(userWordId, userId, wordId);
    
    // Update daily progress
    const today = new Date().toISOString().split('T')[0];
    const dailyProgress = db
      .prepare('SELECT * FROM daily_progress WHERE user_id = ? AND date = ?')
      .get(userId, today) as any;
    
    if (dailyProgress) {
      db.prepare(`
        UPDATE daily_progress 
        SET words_saved = words_saved + 1
        WHERE id = ?
      `).run(dailyProgress.id);
    } else {
      const progressId = `dp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      db.prepare(`
        INSERT INTO daily_progress (id, user_id, date, words_saved)
        VALUES (?, ?, ?, 1)
      `).run(progressId, userId, today);
    }
    
    res.json({
      message: 'Word saved successfully',
      userWordId,
    });
  } catch (error: any) {
    next(error);
  }
});

/**
 * GET /api/progress/words/:userId
 * Get all words saved by user, organized by bucket
 */
router.get('/words/:userId', async (req, res, next) => {
  try {
    const { userId } = req.params;
    
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
        ORDER BY uw.created_at DESC
      `)
      .all(userId) as any[];
    
    const formattedWords = words.map(word => ({
      id: word.id,
      word: word.word,
      pronunciation: word.pronunciation,
      definition: word.definition,
      synonym: word.synonym,
      contextDifference: word.context_difference,
      usages: JSON.parse(word.usages || '[]'),
      bucket: word.bucket,
      createdAt: word.created_at,
      lastReviewed: word.last_reviewed,
      reviewCount: word.review_count,
      correctCount: word.correct_count,
      incorrectCount: word.incorrect_count,
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
 * POST /api/progress/quiz-result
 * Save quiz result and update word bucket
 */
router.post('/quiz-result', async (req, res, next) => {
  try {
    const { userId, wordId, isCorrect } = req.body;
    
    if (!userId || !wordId || typeof isCorrect !== 'boolean') {
      return res.status(400).json({ error: 'userId, wordId, and isCorrect are required' });
    }
    
    // Validate user exists
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId) as any;
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Validate word exists
    const word = db.prepare('SELECT * FROM words WHERE id = ?').get(wordId) as any;
    if (!word) {
      return res.status(404).json({ error: 'Word not found' });
    }
    
    // Save quiz result
    const resultId = `qr-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    db.prepare(`
      INSERT INTO quiz_results (id, user_id, word_id, is_correct)
      VALUES (?, ?, ?, ?)
    `).run(resultId, userId, wordId, isCorrect ? 1 : 0);
    
    // Update user word bucket and stats
    const userWord = db
      .prepare('SELECT * FROM user_words WHERE user_id = ? AND word_id = ?')
      .get(userId, wordId) as any;
    
    if (userWord) {
      let newBucket = userWord.bucket;
      
      if (isCorrect) {
        // Move up one bucket
        if (userWord.bucket === 'needs work') {
          newBucket = 'familiar';
        } else if (userWord.bucket === 'familiar') {
          newBucket = 'well known';
        }
        // 'well known' stays as is
      } else {
        // Demote to needs work
        newBucket = 'needs work';
      }
      
      // Update user word
      db.prepare(`
        UPDATE user_words 
        SET bucket = ?,
            last_reviewed = strftime('%s', 'now'),
            review_count = review_count + 1,
            correct_count = correct_count + ?,
            incorrect_count = incorrect_count + ?
        WHERE id = ?
      `).run(
        newBucket,
        isCorrect ? 1 : 0,
        isCorrect ? 0 : 1,
        userWord.id
      );
      
      // Update daily progress
      const today = new Date().toISOString().split('T')[0];
      const dailyProgress = db
        .prepare('SELECT * FROM daily_progress WHERE user_id = ? AND date = ?')
        .get(userId, today) as any;
      
      if (dailyProgress) {
        db.prepare(`
          UPDATE daily_progress 
          SET words_reviewed = words_reviewed + 1
          WHERE id = ?
        `).run(dailyProgress.id);
      } else {
        const progressId = `dp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        db.prepare(`
          INSERT INTO daily_progress (id, user_id, date, words_reviewed)
          VALUES (?, ?, ?, 1)
        `).run(progressId, userId, today);
      }
    }
    
    res.json({
      message: 'Quiz result saved',
      resultId,
      newBucket: userWord ? newBucket : null,
    });
  } catch (error: any) {
    next(error);
  }
});

/**
 * GET /api/progress/daily/:userId
 * Get daily progress statistics
 */
router.get('/daily/:userId', async (req, res, next) => {
  try {
    const { userId } = req.params;
    const { days = '7' } = req.query;
    const dayCount = parseInt(days as string);
    
    const progress = db
      .prepare(`
        SELECT * FROM daily_progress
        WHERE user_id = ?
        ORDER BY date DESC
        LIMIT ?
      `)
      .all(userId, dayCount) as any[];
    
    res.json({
      progress: progress.map(p => ({
        date: p.date,
        wordsSaved: p.words_saved,
        quizzesCompleted: p.quizzes_completed,
        wordsReviewed: p.words_reviewed,
      })),
    });
  } catch (error: any) {
    next(error);
  }
});

/**
 * GET /api/progress/stats/:userId
 * Get overall learning statistics
 */
router.get('/stats/:userId', async (req, res, next) => {
  try {
    const { userId } = req.params;
    
    // Total words saved
    const totalWords = db
      .prepare('SELECT COUNT(*) as count FROM user_words WHERE user_id = ?')
      .get(userId) as { count: number };
    
    // Words by bucket
    const bucketStats = db
      .prepare(`
        SELECT bucket, COUNT(*) as count
        FROM user_words
        WHERE user_id = ?
        GROUP BY bucket
      `)
      .all(userId) as any[];
    
    // Quiz statistics
    const quizStats = db
      .prepare(`
        SELECT 
          COUNT(*) as total_quizzes,
          SUM(CASE WHEN is_correct = 1 THEN 1 ELSE 0 END) as correct_answers,
          SUM(CASE WHEN is_correct = 0 THEN 1 ELSE 0 END) as incorrect_answers
        FROM quiz_results
        WHERE user_id = ?
      `)
      .get(userId) as any;
    
    res.json({
      totalWords: totalWords.count,
      wordsByBucket: bucketStats.reduce((acc, stat) => {
        acc[stat.bucket] = stat.count;
        return acc;
      }, {} as Record<string, number>),
      quizStats: {
        totalQuizzes: quizStats.total_quizzes || 0,
        correctAnswers: quizStats.correct_answers || 0,
        incorrectAnswers: quizStats.incorrect_answers || 0,
        accuracy: quizStats.total_quizzes > 0
          ? ((quizStats.correct_answers || 0) / quizStats.total_quizzes * 100).toFixed(1)
          : '0',
      },
    });
  } catch (error: any) {
    next(error);
  }
});

export default router;

