import { Word } from '../types';
import { getWords } from './storage';

const bucketPriority: Record<string, number> = {
  'needs work': 3,
  'familiar': 2,
  'well known': 1,
};

export const selectWordsForQuiz = async (maxWords: number = 5): Promise<Word[]> => {
  const words = await getWords();
  
  if (words.length === 0) return [];
  
  // Sort by priority (needs work > familiar > well known)
  const sortedWords = [...words].sort((a, b) => {
    return bucketPriority[b.bucket] - bucketPriority[a.bucket];
  });
  
  // Take up to maxWords
  return sortedWords.slice(0, Math.min(maxWords, sortedWords.length));
};

export const generateArticle = (words: Word[]): string => {
  if (words.length === 0) return '';
  
  // Create contextually appropriate sentences for each word
  const sentences: string[] = [];
  
  words.forEach((word, index) => {
    // Use the word's definition and context to create a sentence
    const wordLower = word.word.toLowerCase();
    
    // Create sentences based on word type/context
    // Use a placeholder that we'll replace later to ensure exact match
    const placeholder = `__WORD_${index}__`;
    
    if (word.definition.includes('time') || word.definition.includes('short')) {
      sentences.push(`The ${placeholder} nature of the event made it all the more special.`);
    } else if (word.definition.includes('everywhere') || word.definition.includes('present')) {
      sentences.push(`Technology has become ${placeholder} in our daily lives.`);
    } else if (word.definition.includes('chance') || word.definition.includes('discovery')) {
      sentences.push(`Finding that solution was pure ${placeholder}.`);
    } else if (word.definition.includes('speaking') || word.definition.includes('writing')) {
      sentences.push(`Her ${placeholder} presentation captivated the entire audience.`);
    } else if (word.definition.includes('recover') || word.definition.includes('difficulties')) {
      sentences.push(`The community proved to be remarkably ${placeholder} after the crisis.`);
    } else if (word.definition.includes('detail') || word.definition.includes('careful')) {
      sentences.push(`His ${placeholder} approach ensured nothing was overlooked.`);
    } else if (word.definition.includes('meaning') || word.definition.includes('unclear')) {
      sentences.push(`The instructions were intentionally ${placeholder}, leaving room for interpretation.`);
    } else if (word.definition.includes('practical') || word.definition.includes('real')) {
      sentences.push(`We need a more ${placeholder} solution to this problem.`);
    } else {
      // Generic sentence structure - use as adjective or noun
      if (wordLower.endsWith('ly') || word.definition.includes('way') || word.definition.includes('manner')) {
        sentences.push(`She handled the situation ${placeholder}, demonstrating great skill.`);
      } else {
        sentences.push(`The concept of ${placeholder} is essential in this context.`);
      }
    }
  });
  
  // Combine sentences into a coherent article
  let article = sentences.join(' ');
  
  // Replace placeholders with blanks in order
  words.forEach((word, index) => {
    const placeholder = `__WORD_${index}__`;
    article = article.replace(placeholder, '______');
  });
  
  return article;
};

export const extractBlanks = (article: string): number => {
  return (article.match(/______/g) || []).length;
};

