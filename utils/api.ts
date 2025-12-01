import { Word, WordBucket } from '../types';

// Use 127.0.0.1 instead of localhost for better iOS Simulator compatibility
const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://127.0.0.1:3000/api';

// Generate a device ID (persists in AsyncStorage)
let deviceId: string | null = null;
let userId: string | null = null;

// Get or create device ID
async function getDeviceId(): Promise<string> {
  if (deviceId) return deviceId;
  
  const AsyncStorage = require('@react-native-async-storage/async-storage').default;
  const stored = await AsyncStorage.getItem('@device_id');
  
  if (stored) {
    deviceId = stored;
    return deviceId;
  }
  
  // Generate new device ID
  deviceId = `device-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  await AsyncStorage.setItem('@device_id', deviceId);
  return deviceId;
}

// Get or create user ID
async function getUserId(): Promise<string> {
  if (userId) return userId;
  
  const device = await getDeviceId();
  
  try {
    const response = await fetch(`${API_BASE_URL}/progress/user`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ deviceId: device }),
    });
    
    const data = await response.json();
    userId = data.userId;
    return userId;
  } catch (error) {
    console.error('Error getting user ID:', error);
    // Fallback to device ID if API fails
    return device;
  }
}

// API Functions

export async function fetchWords(options?: {
  difficulty?: number;
  category?: string;
  search?: string;
  limit?: number;
}): Promise<Word[]> {
  try {
    const params = new URLSearchParams();
    if (options?.difficulty) params.append('difficulty', options.difficulty.toString());
    if (options?.category) params.append('category', options.category);
    if (options?.search) params.append('search', options.search);
    if (options?.limit) params.append('limit', options.limit.toString());
    
    const response = await fetch(`${API_BASE_URL}/words?${params.toString()}`);
    const data = await response.json();
    return data.words || [];
  } catch (error) {
    console.error('Error fetching words:', error);
    return [];
  }
}

export async function fetchRandomWords(count: number = 5, difficulty?: number): Promise<Word[]> {
  try {
    const params = new URLSearchParams();
    if (difficulty) params.append('difficulty', difficulty.toString());
    
    const response = await fetch(`${API_BASE_URL}/words/random/${count}?${params.toString()}`);
    const data = await response.json();
    return data.words || [];
  } catch (error) {
    console.error('Error fetching random words:', error);
    return [];
  }
}

export async function saveWordToBackend(wordId: string): Promise<boolean> {
  try {
    const userId = await getUserId();
    const response = await fetch(`${API_BASE_URL}/progress/save-word`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, wordId }),
    });
    
    return response.ok;
  } catch (error) {
    console.error('Error saving word:', error);
    return false;
  }
}

export async function getUserWords(): Promise<Word[]> {
  try {
    const userId = await getUserId();
    const response = await fetch(`${API_BASE_URL}/progress/words/${userId}`);
    const data = await response.json();
    return data.words || [];
  } catch (error) {
    console.error('Error fetching user words:', error);
    return [];
  }
}

export async function getWordsForQuiz(maxWords: number = 5): Promise<Word[]> {
  try {
    const userId = await getUserId();
    const response = await fetch(`${API_BASE_URL}/quiz/words/${userId}?limit=${maxWords}`);
    const data = await response.json();
    return data.words || [];
  } catch (error) {
    console.error('Error fetching quiz words:', error);
    return [];
  }
}

export async function generateQuizArticle(wordIds: string[]): Promise<{ article: string; words: Word[] } | null> {
  try {
    const userId = await getUserId();
    const response = await fetch(`${API_BASE_URL}/quiz/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, wordIds }),
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMessage = errorData.error || `Server returned ${response.status}`;
      console.warn('Quiz article generation failed:', errorMessage);
      return null;
    }
    
    const data = await response.json();
    return data;
  } catch (error: any) {
    // Network errors (connection refused, timeout, etc.)
    if (error.message?.includes('Network request failed') || 
        error.message?.includes('Failed to fetch') ||
        error.code === 'ECONNREFUSED') {
      console.warn('Backend server unavailable, will use local fallback');
    } else {
      console.warn('Error generating quiz article:', error.message || error);
    }
    return null;
  }
}

export async function saveQuizResult(wordId: string, isCorrect: boolean): Promise<boolean> {
  try {
    const userId = await getUserId();
    const response = await fetch(`${API_BASE_URL}/progress/quiz-result`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, wordId, isCorrect }),
    });
    
    return response.ok;
  } catch (error) {
    console.error('Error saving quiz result:', error);
    return false;
  }
}

export async function getDailyProgress(): Promise<Array<{ date: string; count: number }>> {
  try {
    const userId = await getUserId();
    const response = await fetch(`${API_BASE_URL}/progress/daily/${userId}?days=7`);
    const data = await response.json();
    
    // Convert to format expected by DailyWordsChart
    return (data.progress || []).map((p: any) => ({
      date: new Date(p.date).toDateString(),
      count: p.wordsSaved || 0,
    }));
  } catch (error) {
    console.error('Error fetching daily progress:', error);
    return [];
  }
}

