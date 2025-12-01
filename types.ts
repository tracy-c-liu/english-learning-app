export type WordBucket = 'needs work' | 'familiar' | 'well known';

export interface Word {
  id: string;
  word: string;
  pronunciation: string;
  definition: string;
  synonym: string;
  contextDifference: string;
  usages: string[];
  bucket: WordBucket;
  createdAt: number;
  lastReviewed?: number;
}

export interface QuizResult {
  wordId: string;
  isCorrect: boolean;
  timestamp: number;
}

