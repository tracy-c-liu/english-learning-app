import express from 'express';
import { db } from '../database/init';

const router = express.Router();

/**
 * GET /api/words
 * Get words with optional filtering by difficulty, category, or search
 */
router.get('/', async (req, res, next) => {
  try {
    const { difficulty, category, search, limit = '50', offset = '0' } = req.query;
    
    let query = 'SELECT * FROM words WHERE 1=1';
    const params: any[] = [];
    
    if (difficulty) {
      query += ' AND difficulty_level = ?';
      params.push(parseInt(difficulty as string));
    }
    
    if (category) {
      query += ' AND category = ?';
      params.push(category);
    }
    
    if (search) {
      query += ' AND (word LIKE ? OR definition LIKE ?)';
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm);
    }
    
    query += ' ORDER BY difficulty_level DESC, word ASC LIMIT ? OFFSET ?';
    params.push(parseInt(limit as string), parseInt(offset as string));
    
    const words = db.prepare(query).all(...params) as any[];
    
    // Parse JSON usages
    const formattedWords = words.map(word => ({
      ...word,
      usages: JSON.parse(word.usages || '[]'),
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
 * GET /api/words/:id
 * Get a specific word by ID
 */
router.get('/:id', async (req, res, next) => {
  try {
    const word = db.prepare('SELECT * FROM words WHERE id = ?').get(req.params.id) as any;
    
    if (!word) {
      return res.status(404).json({ error: 'Word not found' });
    }
    
    word.usages = JSON.parse(word.usages || '[]');
    res.json(word);
  } catch (error: any) {
    next(error);
  }
});

/**
 * GET /api/words/random/:count
 * Get random words for learning session
 */
router.get('/random/:count', async (req, res, next) => {
  try {
    const count = parseInt(req.params.count) || 5;
    const { difficulty, category } = req.query;
    
    let query = 'SELECT * FROM words WHERE 1=1';
    const params: any[] = [];
    
    if (difficulty) {
      query += ' AND difficulty_level = ?';
      params.push(parseInt(difficulty as string));
    }
    
    if (category) {
      query += ' AND category = ?';
      params.push(category);
    }
    
    query += ' ORDER BY RANDOM() LIMIT ?';
    params.push(count);
    
    const words = db.prepare(query).all(...params) as any[];
    
    const formattedWords = words.map(word => ({
      ...word,
      usages: JSON.parse(word.usages || '[]'),
    }));
    
    res.json({
      words: formattedWords,
      count: formattedWords.length,
    });
  } catch (error: any) {
    next(error);
  }
});

export default router;

