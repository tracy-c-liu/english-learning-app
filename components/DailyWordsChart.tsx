import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { getDailyProgress } from '../utils/api';
import { getDailyWords } from '../utils/storage';

export default function DailyWordsChart() {
  const [dailyData, setDailyData] = useState<Array<{ date: string; count: number }>>([]);

  useFocusEffect(
    React.useCallback(() => {
      loadData();
    }, [])
  );

  const loadData = async () => {
    try {
      // Try backend first
      const backendData = await getDailyProgress();
      
      if (backendData.length > 0) {
        setDailyData(backendData);
      } else {
        // Fallback to local storage
        const localData = await getDailyWords();
        // Get last 7 days
        const last7Days = [];
        for (let i = 6; i >= 0; i--) {
          const date = new Date();
          date.setDate(date.getDate() - i);
          const dateStr = date.toDateString();
          const dayData = localData.find(d => d.date === dateStr);
          last7Days.push({
            date: dateStr,
            count: dayData ? dayData.count : 0,
          });
        }
        setDailyData(last7Days);
      }
    } catch (error) {
      console.error('Error loading daily progress:', error);
      // Fallback to local storage
      const localData = await getDailyWords();
      const last7Days = [];
      for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = date.toDateString();
        const dayData = localData.find(d => d.date === dateStr);
        last7Days.push({
          date: dateStr,
          count: dayData ? dayData.count : 0,
        });
      }
      setDailyData(last7Days);
    }
  };

  const maxCount = Math.max(...dailyData.map(d => d.count), 1);
  const chartHeight = 120;

  const getDayLabel = (dateStr: string) => {
    const date = new Date(dateStr);
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    return days[date.getDay()];
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Daily Saved Words</Text>
      <View style={styles.chartContainer}>
        <View style={styles.chart}>
          {dailyData.map((day, index) => {
            const barHeight = maxCount > 0 ? (day.count / maxCount) * chartHeight : 0;
            return (
              <View key={index} style={styles.barWrapper}>
                <View style={styles.barContainer}>
                  <View
                    style={[
                      styles.bar,
                      {
                        height: Math.max(barHeight, 4),
                        backgroundColor: day.count > 0 ? '#4A235A' : '#E0E0E0',
                      },
                    ]}
                  />
                </View>
                <Text style={styles.dayLabel}>{getDayLabel(day.date)}</Text>
                {day.count > 0 && (
                  <Text style={styles.countLabel}>{day.count}</Text>
                )}
              </View>
            );
          })}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    margin: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#4A235A',
    marginBottom: 20,
    textAlign: 'center',
  },
  chartContainer: {
    height: 160,
  },
  chart: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-end',
    height: 120,
    paddingBottom: 10,
  },
  barWrapper: {
    alignItems: 'center',
    flex: 1,
  },
  barContainer: {
    height: 120,
    justifyContent: 'flex-end',
    alignItems: 'center',
    width: '100%',
  },
  bar: {
    width: '60%',
    minHeight: 4,
    borderRadius: 4,
    marginBottom: 4,
  },
  dayLabel: {
    fontSize: 12,
    color: '#7F8C8D',
    marginTop: 4,
  },
  countLabel: {
    fontSize: 10,
    color: '#4A235A',
    fontWeight: '600',
    marginTop: 2,
  },
});

