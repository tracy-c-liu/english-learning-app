import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { Word, WordBucket } from '../types';
import { getUserWords } from '../utils/api';
import { getWords as getLocalWords } from '../utils/storage';
import DailyWordsChart from '../components/DailyWordsChart';

const bucketColors: Record<WordBucket, string> = {
  'needs work': '#FF6B6B',
  'familiar': '#FFD93D',
  'well known': '#6BCB77',
};

const bucketLabels: Record<WordBucket, string> = {
  'needs work': 'Needs Work',
  'familiar': 'Familiar',
  'well known': 'Well Known',
};

export default function HomeScreen() {
  const [words, setWords] = useState<Word[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [expandedBuckets, setExpandedBuckets] = useState<Record<WordBucket, boolean>>({
    'needs work': false,
    'familiar': false,
    'well known': false,
  });

  const loadWords = async () => {
    try {
      // Try backend first
      const loadedWords = await getUserWords();
      if (loadedWords.length > 0) {
        setWords(loadedWords);
      } else {
        // Fallback to local storage
        const localWords = await getLocalWords();
        setWords(localWords);
      }
    } catch (error) {
      console.error('Error loading words:', error);
      // Fallback to local storage
      const localWords = await getLocalWords();
      setWords(localWords);
    }
  };

  useEffect(() => {
    loadWords();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadWords();
    setRefreshing(false);
  };

  const getWordsByBucket = (bucket: WordBucket): Word[] => {
    return words.filter(w => w.bucket === bucket);
  };

  const toggleBucket = (bucket: WordBucket) => {
    setExpandedBuckets(prev => ({
      ...prev,
      [bucket]: !prev[bucket],
    }));
  };

  const renderBucket = (bucket: WordBucket) => {
    const bucketWords = getWordsByBucket(bucket);
    const color = bucketColors[bucket];
    const label = bucketLabels[bucket];
    const isExpanded = expandedBuckets[bucket];

    return (
      <View key={bucket} style={styles.bucketContainer}>
        <TouchableOpacity
          style={[styles.bucketHeader, { backgroundColor: color }]}
          onPress={() => toggleBucket(bucket)}
          activeOpacity={0.7}
        >
          <Text style={styles.bucketTitle}>{label}</Text>
          <View style={styles.bucketHeaderRight}>
            <Text style={styles.bucketCount}>{bucketWords.length} words</Text>
            <Text style={[styles.expandIcon, { marginLeft: 10 }]}>{isExpanded ? '▼' : '▶'}</Text>
          </View>
        </TouchableOpacity>
        {isExpanded && (
          <ScrollView style={styles.wordsList} nestedScrollEnabled>
            {bucketWords.length === 0 ? (
              <Text style={styles.emptyText}>No words in this bucket yet</Text>
            ) : (
              bucketWords.map((word) => (
                <View key={word.id} style={styles.wordCard}>
                  <Text style={styles.wordText}>{word.word}</Text>
                  <Text style={styles.definitionText} numberOfLines={2}>
                    {word.definition}
                  </Text>
                </View>
              ))
            )}
          </ScrollView>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>My Dictionary</Text>
        <Text style={styles.subtitle}>Total: {words.length} words</Text>
      </View>
      
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <DailyWordsChart />
        {renderBucket('needs work')}
        {renderBucket('familiar')}
        {renderBucket('well known')}
      </ScrollView>
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
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#7F8C8D',
    textAlign: 'center',
  },
  scrollView: {
    flex: 1,
  },
  bucketContainer: {
    margin: 20,
    marginBottom: 20,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  bucketHeader: {
    padding: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  bucketTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  bucketHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  bucketCount: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '600',
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  expandIcon: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  wordsList: {
    maxHeight: 300,
  },
  wordCard: {
    padding: 18,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
  },
  wordText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#4A235A',
    marginBottom: 6,
  },
  definitionText: {
    fontSize: 14,
    color: '#7F8C8D',
    lineHeight: 20,
  },
  emptyText: {
    padding: 30,
    textAlign: 'center',
    color: '#BDC3C7',
    fontSize: 14,
  },
});

