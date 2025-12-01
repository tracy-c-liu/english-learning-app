import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { Word, WordBucket } from '../types';
import { fetchRandomWords, saveWordToBackend } from '../utils/api';

// Fallback sample words if backend is unavailable
const FALLBACK_WORDS: Omit<Word, 'id' | 'bucket' | 'createdAt'>[] = [
  {
    word: 'Ephemeral',
    pronunciation: '/ɪˈfem.ər.əl/',
    definition: 'Lasting for a very short time',
    synonym: 'Temporary',
    contextDifference: 'Ephemeral emphasizes the fleeting nature, often with poetic or philosophical connotations, while temporary is more neutral and practical.',
    usages: [
      'The beauty of cherry blossoms is ephemeral, lasting only a few weeks each spring.',
      'Social media trends are ephemeral, quickly replaced by new ones.',
    ],
  },
  {
    word: 'Ubiquitous',
    pronunciation: '/juːˈbɪk.wɪ.təs/',
    definition: 'Present, appearing, or found everywhere',
    synonym: 'Widespread',
    contextDifference: 'Ubiquitous suggests something is everywhere simultaneously, while widespread indicates broad distribution but not necessarily universal presence.',
    usages: [
      'Smartphones have become ubiquitous in modern society.',
      'The company\'s logo is ubiquitous across all their products.',
    ],
  },
  {
    word: 'Serendipity',
    pronunciation: '/ˌser.ənˈdɪp.ə.ti/',
    definition: 'The occurrence of pleasant things that happen by chance',
    synonym: 'Luck',
    contextDifference: 'Serendipity implies a fortunate discovery made by accident, often with positive outcomes, while luck is more general and can be good or bad.',
    usages: [
      'Finding that rare book in the small bookstore was pure serendipity.',
      'Their meeting was serendipity, leading to a lifelong friendship.',
    ],
  },
  {
    word: 'Eloquent',
    pronunciation: '/ˈel.ə.kwənt/',
    definition: 'Fluent or persuasive in speaking or writing',
    synonym: 'Articulate',
    contextDifference: 'Eloquent emphasizes persuasive and expressive communication with emotional impact, while articulate focuses on clear and coherent communication.',
    usages: [
      'The speaker delivered an eloquent speech that moved the audience.',
      'Her eloquent writing style captivated readers worldwide.',
    ],
  },
  {
    word: 'Resilient',
    pronunciation: '/rɪˈzɪl.jənt/',
    definition: 'Able to recover quickly from difficulties',
    synonym: 'Tough',
    contextDifference: 'Resilient emphasizes the ability to bounce back and adapt, often with positive growth, while tough simply means strong or durable.',
    usages: [
      'The community proved resilient after the natural disaster.',
      'Children are remarkably resilient and adapt quickly to change.',
    ],
  },
  {
    word: 'Meticulous',
    pronunciation: '/məˈtɪk.jə.ləs/',
    definition: 'Showing great attention to detail; very careful and precise',
    synonym: 'Careful',
    contextDifference: 'Meticulous implies extreme attention to every detail with precision, while careful is more general and means taking precautions.',
    usages: [
      'The scientist was meticulous in recording every observation.',
      'Her meticulous planning ensured the event\'s success.',
    ],
  },
  {
    word: 'Ambiguous',
    pronunciation: '/æmˈbɪɡ.ju.əs/',
    definition: 'Having more than one possible meaning; unclear',
    synonym: 'Unclear',
    contextDifference: 'Ambiguous specifically means having multiple interpretations, while unclear is broader and can mean confusing, vague, or hard to understand.',
    usages: [
      'The politician\'s statement was deliberately ambiguous.',
      'The instructions were ambiguous, leaving room for interpretation.',
    ],
  },
  {
    word: 'Pragmatic',
    pronunciation: '/præɡˈmæt.ɪk/',
    definition: 'Dealing with things in a practical way based on real situations',
    synonym: 'Practical',
    contextDifference: 'Pragmatic emphasizes a realistic, results-oriented approach, often in contrast to idealistic theories, while practical is more general.',
    usages: [
      'The manager took a pragmatic approach to solving the problem.',
      'Her pragmatic decision-making saved the company time and resources.',
    ],
  },
];

const WORDS_PER_SESSION = 5;

export default function LearningScreen() {
  const [currentSession, setCurrentSession] = useState<Word[]>([]);
  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const [sessionComplete, setSessionComplete] = useState(false);

  const generateSession = async () => {
    try {
      // Try to fetch from backend first
      const words = await fetchRandomWords(WORDS_PER_SESSION);
      
      if (words.length > 0) {
        // Use backend words
        setCurrentSession(words);
      } else {
        // Fallback to local words if backend unavailable
        const shuffled = [...FALLBACK_WORDS].sort(() => Math.random() - 0.5);
        const selected = shuffled.slice(0, WORDS_PER_SESSION).map((word, index) => ({
          ...word,
          id: `word-${Date.now()}-${index}`,
          bucket: 'needs work' as WordBucket,
          createdAt: Date.now(),
        }));
        setCurrentSession(selected);
      }
      setCurrentWordIndex(0);
      setSessionComplete(false);
    } catch (error) {
      console.error('Error generating session:', error);
      // Fallback to local words
      const shuffled = [...FALLBACK_WORDS].sort(() => Math.random() - 0.5);
      const selected = shuffled.slice(0, WORDS_PER_SESSION).map((word, index) => ({
        ...word,
        id: `word-${Date.now()}-${index}`,
        bucket: 'needs work' as WordBucket,
        createdAt: Date.now(),
      }));
      setCurrentSession(selected);
      setCurrentWordIndex(0);
      setSessionComplete(false);
    }
  };

  useEffect(() => {
    generateSession();
  }, []);

  const handleSaveWord = async () => {
    const word = currentSession[currentWordIndex];
    
    // Save to backend
    const success = await saveWordToBackend(word.id);
    
    if (!success) {
      // Fallback to local storage if backend fails
      const { saveWord } = require('../utils/storage');
      await saveWord(word);
    }
    
    // Move to next word after saving
    if (currentWordIndex < currentSession.length - 1) {
      setCurrentWordIndex(currentWordIndex + 1);
    } else {
      setSessionComplete(true);
    }
  };

  const handleNextWord = () => {
    if (currentWordIndex < currentSession.length - 1) {
      setCurrentWordIndex(currentWordIndex + 1);
    } else {
      setSessionComplete(true);
    }
  };

  const handleContinueSession = () => {
    generateSession();
  };

  if (sessionComplete) {
    return (
      <View style={styles.container}>
        <View style={styles.completeContainer}>
          <Text style={styles.completeTitle}>Session Complete! 🎉</Text>
          <Text style={styles.completeText}>
            You've completed learning {currentSession.length} words.
          </Text>
          <TouchableOpacity
            style={styles.continueButton}
            onPress={handleContinueSession}
          >
            <Text style={styles.continueButtonText}>Learn More Words</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (currentSession.length === 0) {
    return (
      <View style={styles.container}>
        <Text style={styles.loadingText}>Loading words...</Text>
      </View>
    );
  }

  const currentWord = currentSession[currentWordIndex];
  const isLastWord = currentWordIndex === currentSession.length - 1;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Learning Mode</Text>
        <View style={styles.progressContainer}>
          <Text style={styles.progress}>
            {currentWordIndex + 1} / {currentSession.length}
          </Text>
        </View>
      </View>

      <ScrollView 
        style={styles.content} 
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.wordCard}>
          <Text style={styles.word}>{currentWord.word}</Text>
          <Text style={styles.pronunciation}>{currentWord.pronunciation}</Text>
          <Text style={styles.definition}>{currentWord.definition}</Text>
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Synonym & Context</Text>
          <Text style={styles.synonym}>
            <Text style={styles.label}>Synonym: </Text>
            {currentWord.synonym}
          </Text>
          <Text style={styles.contextDifference}>
            <Text style={styles.label}>Difference: </Text>
            {currentWord.contextDifference}
          </Text>
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Usage Examples</Text>
          {currentWord.usages.map((usage, index) => (
            <View key={index} style={styles.usageItem}>
              <Text style={styles.usageNumber}>{index + 1}.</Text>
              <Text style={styles.usageText}>{usage}</Text>
            </View>
          ))}
        </View>
      </ScrollView>

      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.button, styles.saveButton]}
          onPress={handleSaveWord}
        >
          <Text style={styles.saveButtonText}>Save to Dictionary</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.button, styles.nextButton]}
          onPress={handleNextWord}
        >
          <Text style={styles.nextButtonText}>
            {isLastWord ? 'Finish Session' : 'Next Word'}
          </Text>
        </TouchableOpacity>
      </View>
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
    alignItems: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#4A235A',
    marginBottom: 8,
  },
  progressContainer: {
    marginTop: 8,
  },
  progress: {
    fontSize: 16,
    color: '#7F8C8D',
    fontWeight: '600',
    backgroundColor: '#B2EBF2',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 16,
    textAlign: 'center',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
    paddingBottom: 100,
  },
  wordCard: {
    backgroundColor: '#FFFFFF',
    padding: 30,
    borderRadius: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
    alignItems: 'center',
  },
  word: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#4A235A',
    marginBottom: 12,
    textAlign: 'center',
  },
  pronunciation: {
    fontSize: 18,
    color: '#7F8C8D',
    marginBottom: 20,
    fontStyle: 'italic',
    textAlign: 'center',
  },
  definition: {
    fontSize: 16,
    color: '#7F8C8D',
    lineHeight: 24,
    textAlign: 'center',
  },
  sectionCard: {
    backgroundColor: '#FFFFFF',
    padding: 25,
    borderRadius: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#4A235A',
    marginBottom: 18,
    textAlign: 'center',
  },
  synonym: {
    fontSize: 16,
    color: '#7F8C8D',
    marginBottom: 18,
    lineHeight: 24,
  },
  contextDifference: {
    fontSize: 16,
    color: '#7F8C8D',
    lineHeight: 24,
  },
  label: {
    fontWeight: '600',
    color: '#4A235A',
  },
  usageItem: {
    flexDirection: 'row',
    marginBottom: 18,
  },
  usageNumber: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FF6B6B',
    marginRight: 12,
    width: 25,
  },
  usageText: {
    flex: 1,
    fontSize: 16,
    color: '#7F8C8D',
    lineHeight: 24,
  },
  actions: {
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
  button: {
    padding: 18,
    borderRadius: 16,
    alignItems: 'center',
    marginBottom: 12,
  },
  saveButton: {
    backgroundColor: '#4A235A',
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  nextButton: {
    backgroundColor: '#B2EBF2',
  },
  nextButtonText: {
    color: '#4A235A',
    fontSize: 16,
    fontWeight: '600',
  },
  completeContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
    backgroundColor: '#E0F7FA',
  },
  completeTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#4A235A',
    marginBottom: 15,
    textAlign: 'center',
  },
  completeText: {
    fontSize: 18,
    color: '#7F8C8D',
    marginBottom: 30,
    textAlign: 'center',
  },
  continueButton: {
    backgroundColor: '#4A235A',
    padding: 18,
    borderRadius: 16,
    minWidth: 200,
    alignItems: 'center',
  },
  continueButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  loadingText: {
    fontSize: 18,
    color: '#7F8C8D',
    textAlign: 'center',
    marginTop: 50,
  },
});

