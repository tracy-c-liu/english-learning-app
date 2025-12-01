import AsyncStorage from '@react-native-async-storage/async-storage';
import { Word } from '../types';

const WORDS_KEY = '@english_learning_words';
const QUIZ_RESULTS_KEY = '@english_learning_quiz_results';
const DAILY_WORDS_KEY = '@english_learning_daily_words';

export const saveWord = async (word: Word): Promise<void> => {
  try {
    const words = await getWords();
    const existingIndex = words.findIndex(w => w.id === word.id);
    const isNewWord = existingIndex < 0;
    
    if (existingIndex >= 0) {
      words[existingIndex] = word;
    } else {
      words.push(word);
    }
    
    await AsyncStorage.setItem(WORDS_KEY, JSON.stringify(words));
    
    // Track daily saved words
    if (isNewWord) {
      const today = new Date().toDateString();
      const dailyWords = await getDailyWords();
      const dayIndex = dailyWords.findIndex(d => d.date === today);
      
      if (dayIndex >= 0) {
        dailyWords[dayIndex].count += 1;
      } else {
        dailyWords.push({ date: today, count: 1 });
        // Keep only last 7 days
        if (dailyWords.length > 7) {
          dailyWords.shift();
        }
      }
      
      await AsyncStorage.setItem(DAILY_WORDS_KEY, JSON.stringify(dailyWords));
    }
  } catch (error) {
    console.error('Error saving word:', error);
  }
};

export const getDailyWords = async (): Promise<Array<{ date: string; count: number }>> => {
  try {
    const data = await AsyncStorage.getItem(DAILY_WORDS_KEY);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('Error getting daily words:', error);
    return [];
  }
};

export const getWords = async (): Promise<Word[]> => {
  try {
    const data = await AsyncStorage.getItem(WORDS_KEY);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('Error getting words:', error);
    return [];
  }
};

export const updateWordBucket = async (wordId: string, isCorrect: boolean): Promise<void> => {
  try {
    const words = await getWords();
    const word = words.find(w => w.id === wordId);
    
    if (!word) return;
    
    if (isCorrect) {
      // Move up one bucket
      if (word.bucket === 'needs work') {
        word.bucket = 'familiar';
      } else if (word.bucket === 'familiar') {
        word.bucket = 'well known';
      }
      // 'well known' stays as is
    } else {
      // Demote to needs work
      word.bucket = 'needs work';
    }
    
    word.lastReviewed = Date.now();
    await saveWord(word);
  } catch (error) {
    console.error('Error updating word bucket:', error);
  }
};

export const saveQuizResult = async (wordId: string, isCorrect: boolean): Promise<void> => {
  try {
    const results = await getQuizResults();
    results.push({
      wordId,
      isCorrect,
      timestamp: Date.now(),
    });
    await AsyncStorage.setItem(QUIZ_RESULTS_KEY, JSON.stringify(results));
    await updateWordBucket(wordId, isCorrect);
  } catch (error) {
    console.error('Error saving quiz result:', error);
  }
};

export const getQuizResults = async (): Promise<Array<{ wordId: string; isCorrect: boolean; timestamp: number }>> => {
  try {
    const data = await AsyncStorage.getItem(QUIZ_RESULTS_KEY);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('Error getting quiz results:', error);
    return [];
  }
};

