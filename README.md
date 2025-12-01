# English Learning App

An advanced English learning iPhone app built with React Native and Expo, featuring spaced repetition learning and interactive quizzes.

## Features

### Home Screen
- View all saved words organized in three buckets:
  - **Needs Work** (red) - Words that need more practice
  - **Familiar** (yellow) - Words you're getting comfortable with
  - **Well Known** (green) - Words you've mastered
- Spaced repetition algorithm automatically moves words between buckets based on quiz performance

### Learning Mode
- Learn 5 new words per session
- For each word, you'll see:
  - Word with pronunciation
  - Definition
  - Synonym and context usage differences
  - Two usage examples
- Save words to your dictionary for future practice
- Skip words you already know

### Quiz Mode
- Interactive fill-in-the-blank quizzes using your saved words
- Drag words from the bottom to fill blanks in a meaningful article
- Submit to see which answers are correct
- Tap words after submission to see definitions
- Quiz prioritizes words from "needs work" bucket

## Spaced Repetition Algorithm

- **Initial Save**: Words start in "needs work" bucket
- **Correct Answer**: Word moves up one bucket (needs work → familiar → well known)
- **Incorrect Answer**: Word is immediately demoted back to "needs work"

## Getting Started

### Prerequisites
- Node.js (v14 or higher)
- npm or yarn
- Expo CLI (`npm install -g expo-cli`)
- iOS Simulator (for Mac) or Expo Go app on your iPhone

### Installation

1. Install dependencies:
```bash
npm install
```

2. Start the development server:
```bash
npm start
```

3. Run on iOS:
```bash
npm run ios
```

Or scan the QR code with Expo Go app on your iPhone.

## Project Structure

```
├── App.tsx                 # Main app component with navigation
├── screens/
│   ├── HomeScreen.tsx      # Home screen with word buckets
│   ├── LearningScreen.tsx  # Learning mode
│   └── QuizScreen.tsx      # Quiz mode
├── utils/
│   ├── storage.ts          # AsyncStorage utilities
│   └── quizGenerator.ts    # Quiz generation logic
└── types.ts                # TypeScript type definitions
```

## Technologies Used

- React Native
- Expo
- TypeScript
- React Navigation (Bottom Tabs)
- AsyncStorage (for data persistence)

## Future Enhancements

- AI-powered article generation for quizzes
- Audio pronunciation playback
- Progress statistics and analytics
- Word search and filtering
- Custom word lists
- Export/import functionality

