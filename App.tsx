import React from 'react';
import { View, Text } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { StatusBar } from 'expo-status-bar';
import HomeScreen from './screens/HomeScreen';
import LearningScreen from './screens/LearningScreen';
import QuizScreen from './screens/QuizScreen';

const Tab = createBottomTabNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <StatusBar style="dark" />
      <Tab.Navigator
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: '#4A235A',
          tabBarInactiveTintColor: '#BDC3C7',
          tabBarStyle: {
            backgroundColor: '#FFFFFF',
            borderTopWidth: 0,
            height: 70,
            paddingBottom: 10,
            paddingTop: 10,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: -2 },
            shadowOpacity: 0.1,
            shadowRadius: 4,
            elevation: 5,
          },
          tabBarLabelStyle: {
            fontSize: 12,
            fontWeight: '600',
          },
        }}
      >
        <Tab.Screen
          name="Home"
          component={HomeScreen}
          options={{
            tabBarIcon: ({ color }) => (
              <TabIcon name="home" color={color} />
            ),
          }}
        />
        <Tab.Screen
          name="Learn"
          component={LearningScreen}
          options={{
            tabBarIcon: ({ color }) => (
              <TabIcon name="book" color={color} />
            ),
          }}
        />
        <Tab.Screen
          name="Quiz"
          component={QuizScreen}
          options={{
            tabBarIcon: ({ color }) => (
              <TabIcon name="quiz" color={color} />
            ),
          }}
        />
      </Tab.Navigator>
    </NavigationContainer>
  );
}

// Simple outlined icon component
const TabIcon = ({ name, color }: { name: string; color: string }) => {
  const size = 24;
  const stroke = 2;
  
  if (name === 'home') {
    return (
      <View style={{ width: size, height: size, justifyContent: 'center', alignItems: 'center' }}>
        {/* House roof */}
        <View style={{
          width: 0,
          height: 0,
          borderLeftWidth: size * 0.4,
          borderRightWidth: size * 0.4,
          borderBottomWidth: size * 0.3,
          borderLeftColor: 'transparent',
          borderRightColor: 'transparent',
          borderBottomColor: color,
          borderStyle: 'solid',
          marginBottom: -size * 0.15,
        }} />
        {/* House body */}
        <View style={{
          width: size * 0.7,
          height: size * 0.5,
          borderWidth: stroke,
          borderColor: color,
          borderStyle: 'solid',
        }} />
      </View>
    );
  }
  
  if (name === 'book') {
    return (
      <View style={{ width: size, height: size, justifyContent: 'center', alignItems: 'center' }}>
        {/* Book cover */}
        <View style={{
          width: size * 0.7,
          height: size * 0.8,
          borderWidth: stroke,
          borderColor: color,
          borderStyle: 'solid',
          borderRightWidth: 0,
          borderTopLeftRadius: 2,
          borderBottomLeftRadius: 2,
        }} />
        {/* Book pages */}
        <View style={{
          position: 'absolute',
          left: size * 0.15,
          width: size * 0.5,
          height: stroke,
          backgroundColor: color,
        }} />
        <View style={{
          position: 'absolute',
          left: size * 0.15,
          top: size * 0.4,
          width: size * 0.5,
          height: stroke,
          backgroundColor: color,
        }} />
      </View>
    );
  }
  
  if (name === 'quiz') {
    return (
      <View style={{ width: size, height: size, justifyContent: 'center', alignItems: 'center' }}>
        {/* Brain shape - simplified as rounded rectangle with curves */}
        <View style={{
          width: size * 0.65,
          height: size * 0.7,
          borderWidth: stroke,
          borderColor: color,
          borderStyle: 'solid',
          borderRadius: size * 0.3,
          borderTopLeftRadius: size * 0.4,
          borderTopRightRadius: size * 0.4,
        }} />
        {/* Brain details */}
        <View style={{
          position: 'absolute',
          top: size * 0.2,
          left: size * 0.25,
          width: size * 0.12,
          height: size * 0.12,
          borderWidth: stroke,
          borderColor: color,
          borderStyle: 'solid',
          borderRadius: size * 0.06,
        }} />
        <View style={{
          position: 'absolute',
          top: size * 0.2,
          right: size * 0.25,
          width: size * 0.12,
          height: size * 0.12,
          borderWidth: stroke,
          borderColor: color,
          borderStyle: 'solid',
          borderRadius: size * 0.06,
        }} />
      </View>
    );
  }
  
  return <View style={{ width: size, height: size }} />;
};

