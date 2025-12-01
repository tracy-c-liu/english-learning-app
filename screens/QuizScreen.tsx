import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  Alert,
} from 'react-native';
import { Word } from '../types';
import { getWordsForQuiz, generateQuizArticle, saveQuizResult as saveQuizResultToBackend } from '../utils/api';
import { selectWordsForQuiz, generateArticle } from '../utils/quizGenerator';
import { saveQuizResult as saveQuizResultLocal, getWords } from '../utils/storage';

interface BlankPosition {
  index: number;
  wordId: string | null;
  correctWordId: string;
}

export default function QuizScreen() {
  const [words, setWords] = useState<Word[]>([]);
  const [article, setArticle] = useState<string>('');
  const [blanks, setBlanks] = useState<BlankPosition[]>([]);
  const [availableWords, setAvailableWords] = useState<Word[]>([]);
  const [submitted, setSubmitted] = useState(false);
  const [selectedWord, setSelectedWord] = useState<Word | null>(null);
  const [showDefinition, setShowDefinition] = useState(false);

  const loadQuiz = async () => {
    try {
      // Try backend first
      let selectedWords = await getWordsForQuiz(5);
      
      // Fallback to local storage if backend unavailable
      if (selectedWords.length === 0) {
        selectedWords = await selectWordsForQuiz(5);
      }
      
      if (selectedWords.length === 0) {
        Alert.alert(
          'No Words Available',
          'Please save some words in Learning mode first!',
        );
        return;
      }

      setWords(selectedWords);
      
      // Try to generate article from backend (with LLM)
      const wordIds = selectedWords.map(w => w.id);
      const quizData = await generateQuizArticle(wordIds);
      
      let generatedArticle: string;
      if (quizData && quizData.article) {
        // Use LLM-generated article from backend
        generatedArticle = quizData.article;
      } else {
        // Fallback to local article generator
        generatedArticle = generateArticle(selectedWords);
      }
      
      setArticle(generatedArticle);

      // Extract blank positions
      const blankPositions: BlankPosition[] = [];
      let blankIndex = 0;
      selectedWords.forEach((word) => {
        blankPositions.push({
          index: blankIndex++,
          wordId: null,
          correctWordId: word.id,
        });
      });

      setBlanks(blankPositions);
      setAvailableWords([...selectedWords]);
      setSubmitted(false);
    } catch (error) {
      console.error('Error loading quiz:', error);
      Alert.alert('Error', 'Failed to load quiz. Please try again.');
    }
  };

  useEffect(() => {
    loadQuiz();
  }, []);

  const handleWordSelect = (word: Word) => {
    if (submitted) {
      // Show definition dialog
      setSelectedWord(word);
      setShowDefinition(true);
      return;
    }

    // Before submission, only allow selecting available words
    const isAvailable = availableWords.some((w) => w.id === word.id);
    if (!isAvailable) {
      // Word is already used, do nothing
      return;
    }

    // Find first empty blank
    const emptyBlankIndex = blanks.findIndex((b) => b.wordId === null);
    if (emptyBlankIndex === -1) {
      // No empty blanks, do nothing
      return;
    }

    // Update blank
    const newBlanks = [...blanks];
    newBlanks[emptyBlankIndex].wordId = word.id;
    setBlanks(newBlanks);

    // Remove word from available
    const newAvailable = availableWords.filter((w) => w.id !== word.id);
    setAvailableWords(newAvailable);
  };

  const handleRemoveBlank = (blankIndex: number) => {
    if (submitted) return;

    const blank = blanks[blankIndex];
    if (!blank.wordId) return;

    // Find the word and add it back
    const word = words.find((w) => w.id === blank.wordId);
    if (word) {
      setAvailableWords([...availableWords, word]);
    }

    // Clear blank
    const newBlanks = [...blanks];
    newBlanks[blankIndex].wordId = null;
    setBlanks(newBlanks);
  };

  const handleSubmit = async () => {
    if (blanks.some((b) => b.wordId === null)) {
      Alert.alert('Incomplete', 'Please fill all blanks before submitting.');
      return;
    }

    setSubmitted(true);

    // Check answers and save results
    for (const blank of blanks) {
      const isCorrect = blank.wordId === blank.correctWordId;
      
      // Try backend first
      const success = await saveQuizResultToBackend(blank.correctWordId, isCorrect);
      
      if (!success) {
        // Fallback to local storage
        await saveQuizResultLocal(blank.correctWordId, isCorrect);
      }
    }
  };

  const renderArticle = () => {
    if (!article || blanks.length === 0) {
      return <Text style={styles.articleTextPart}>Loading quiz...</Text>;
    }

    const parts = article.split('______');
    const elements: JSX.Element[] = [];
    let blankIndex = 0;

    parts.forEach((part, i) => {
      // Add text part (keep original spacing)
      if (part.length > 0) {
        elements.push(
          <Text key={`text-${i}`} style={styles.articleTextPart}>
            {part}
          </Text>
        );
      }
      
      // Add blank if not the last part
      if (i < parts.length - 1 && blankIndex < blanks.length) {
        const blank = blanks[blankIndex];
        if (!blank) {
          blankIndex++;
          return;
        }
        
        const isFilled = blank.wordId !== null;
        const isCorrect = submitted && blank.wordId === blank.correctWordId;
        const isWrong = submitted && blank.wordId !== blank.correctWordId && isFilled;
        
        const word = words.find((w) => w.id === blank.wordId);
        
        elements.push(
          <TouchableOpacity
            key={`blank-${blankIndex}`}
            style={[
              styles.blank,
              isFilled && styles.blankFilled,
              isCorrect && styles.blankCorrect,
              isWrong && styles.blankWrong,
            ]}
            onPress={() => {
              if (isFilled && !submitted) {
                handleRemoveBlank(blankIndex);
              } else if (submitted && word) {
                setSelectedWord(word);
                setShowDefinition(true);
              }
            }}
          >
            <Text
              style={[
                styles.blankText,
                isFilled && styles.blankTextFilled,
                isCorrect && styles.blankTextCorrect,
                isWrong && styles.blankTextWrong,
              ]}
            >
              {isFilled ? word?.word : '______'}
            </Text>
          </TouchableOpacity>
        );
        blankIndex++;
      }
    });

    return elements;
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Quiz Mode</Text>
        <TouchableOpacity onPress={loadQuiz} style={styles.newQuizButton}>
          <Text style={styles.newQuizButtonText}>New Quiz</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.articleContainer}>
          <Text style={styles.articleSubtitle}>Drag words into the blanks</Text>
          <View style={styles.articleTextContainer}>
            {renderArticle()}
          </View>
        </View>

        <View style={styles.wordsContainer}>
          <Text style={styles.wordsTitle}>WORD BANK</Text>
          <View style={styles.wordsGrid}>
            {words.map((word) => {
              const isUsed = blanks.some((b) => b.wordId === word.id);
              const isAvailable = availableWords.some((w) => w.id === word.id);
              
              return (
                <TouchableOpacity
                  key={word.id}
                  style={[
                    styles.wordChip,
                    !isAvailable && styles.wordChipUsed,
                    submitted && isUsed && styles.wordChipSubmitted,
                  ]}
                  onPress={() => handleWordSelect(word)}
                  disabled={!isAvailable && !submitted}
                >
                  <Text
                    style={[
                      styles.wordChipText,
                      !isAvailable && styles.wordChipTextUsed,
                    ]}
                  >
                    {word.word}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </ScrollView>

      {!submitted && (
        <View style={styles.submitContainer}>
          <TouchableOpacity
            style={[
              styles.submitButton,
              blanks.some((b) => b.wordId === null) && styles.submitButtonDisabled,
            ]}
            onPress={handleSubmit}
            disabled={blanks.some((b) => b.wordId === null)}
          >
            <Text style={styles.submitButtonText}>Submit Quiz</Text>
          </TouchableOpacity>
        </View>
      )}

      <Modal
        visible={showDefinition}
        transparent
        animationType="fade"
        onRequestClose={() => setShowDefinition(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {selectedWord && (
              <>
                <Text style={styles.modalWord}>{selectedWord.word}</Text>
                <Text style={styles.modalPronunciation}>
                  {selectedWord.pronunciation}
                </Text>
                <Text style={styles.modalDefinition}>
                  {selectedWord.definition}
                </Text>
                <TouchableOpacity
                  style={styles.modalCloseButton}
                  onPress={() => setShowDefinition(false)}
                >
                  <Text style={styles.modalCloseButtonText}>Close</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#E0F7FA',
  },
  header: {
    padding: 25,
    paddingTop: 60,
    backgroundColor: 'transparent',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#4A235A',
  },
  newQuizButton: {
    backgroundColor: '#4A235A',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 16,
  },
  newQuizButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  articleContainer: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderRadius: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  articleSubtitle: {
    fontSize: 14,
    color: '#7F8C8D',
    marginBottom: 15,
    textAlign: 'center',
  },
  articleTextContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
  },
  articleTextPart: {
    fontSize: 16,
    lineHeight: 26,
    color: '#2C3E50',
  },
  blank: {
    minWidth: 80,
    height: 36,
    borderWidth: 1.5,
    borderColor: '#BDC3C7',
    borderStyle: 'dashed',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 4,
    marginVertical: 2,
    backgroundColor: '#F8F9FA',
    paddingHorizontal: 8,
  },
  blankFilled: {
    borderStyle: 'solid',
    backgroundColor: '#B2EBF2',
    borderColor: '#4A235A',
  },
  blankCorrect: {
    backgroundColor: '#D4EDDA',
    borderColor: '#6BCB77',
  },
  blankWrong: {
    backgroundColor: '#F8D7DA',
    borderColor: '#FF6B6B',
  },
  blankText: {
    fontSize: 13,
    color: '#BDC3C7',
    fontWeight: '600',
  },
  blankTextFilled: {
    color: '#4A235A',
  },
  blankTextCorrect: {
    color: '#6BCB77',
  },
  blankTextWrong: {
    color: '#FF6B6B',
  },
  wordsContainer: {
    backgroundColor: '#FFFFFF',
    padding: 25,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  wordsTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#4A235A',
    marginBottom: 15,
    textAlign: 'left',
    letterSpacing: 1,
  },
  wordsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  wordChip: {
    backgroundColor: '#B2EBF2',
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 20,
    marginRight: 10,
    marginBottom: 10,
  },
  wordChipUsed: {
    backgroundColor: '#ECF0F1',
    opacity: 0.5,
  },
  wordChipSubmitted: {
    opacity: 1,
  },
  wordChipText: {
    color: '#4A235A',
    fontSize: 14,
    fontWeight: '600',
  },
  wordChipTextUsed: {
    color: '#7F8C8D',
  },
  submitContainer: {
    padding: 25,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  submitButton: {
    backgroundColor: '#4A235A',
    padding: 18,
    borderRadius: 16,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    backgroundColor: '#BDC3C7',
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 30,
    width: '85%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
  modalWord: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#4A235A',
    marginBottom: 10,
    textAlign: 'center',
  },
  modalPronunciation: {
    fontSize: 18,
    color: '#7F8C8D',
    marginBottom: 15,
    fontStyle: 'italic',
    textAlign: 'center',
  },
  modalDefinition: {
    fontSize: 16,
    color: '#7F8C8D',
    lineHeight: 24,
    marginBottom: 20,
    textAlign: 'center',
  },
  modalCloseButton: {
    backgroundColor: '#4A235A',
    padding: 14,
    borderRadius: 16,
    alignItems: 'center',
  },
  modalCloseButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

