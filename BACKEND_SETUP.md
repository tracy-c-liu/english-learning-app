# Backend Setup Guide

This guide explains how to set up and run the backend server for the English Learning App.

## Quick Start

### 1. Install Backend Dependencies

```bash
cd backend
npm install
```

### 2. Configure Environment

Copy the example environment file:
```bash
cp .env.example .env
```

Edit `.env` and add your API keys (at least one is required):
```env
OPENAI_API_KEY=your_actual_openai_api_key_here
GEMINI_API_KEY=your_actual_gemini_api_key_here
```

**Note**: You can use either OpenAI or Gemini, or both. Using both will reduce costs by alternating between providers. Get your keys from:
- OpenAI: https://platform.openai.com/account/api-keys
- Gemini: https://makersuite.google.com/app/apikey (free tier available)

### 3. Run the Backend

**Development mode (with auto-reload):**
```bash
npm run dev
```

**Production mode:**
```bash
npm run build
npm start
```

The server will start on `http://localhost:3000` by default.

### 4. Update Frontend API URL

In your React Native app, set the API URL:

**Option 1: Environment variable (recommended)**
Create a `.env` file in the root directory:
```
EXPO_PUBLIC_API_URL=http://localhost:3000/api
```

For iOS Simulator, use:
```
EXPO_PUBLIC_API_URL=http://localhost:3000/api
```

For physical device, use your computer's IP:
```
EXPO_PUBLIC_API_URL=http://192.168.1.100:3000/api
```

**Option 2: Update directly in `utils/api.ts`**
Change the `API_BASE_URL` constant.

## Cost & Latency Optimization

### How Caching Works

The backend uses a **three-layer caching strategy** to minimize LLM API calls:

1. **Memory Cache** (Fastest - milliseconds)
   - Stores articles in RAM
   - TTL: 1 hour
   - Cleared on server restart

2. **Database Cache** (Fast - milliseconds)
   - Stores articles in SQLite
   - Persists across restarts
   - TTL: 7 days
   - Auto-cleanup of old entries

3. **LLM API** (Slowest - 1-3 seconds)
   - Only called if cache miss
   - Uses GPT-3.5-turbo (cost-effective)
   - Limited to 300 tokens per request

### Cache Hit Rate

With typical usage:
- **First quiz**: Cache miss → LLM call (~$0.001-0.002)
- **Subsequent quizzes with same words**: Cache hit → $0
- **Expected cache hit rate**: 80-90% after initial usage

### Cost Estimation

**Per Article Generation:**
- First generation: ~$0.001-0.002 (GPT-3.5-turbo)
- Cached requests: $0

**Monthly Estimates (1000 active users):**
- Without caching: ~$50-100/month
- With caching (80% hit rate): ~$5-20/month

### Monitoring Cache Performance

Check cache statistics:
```bash
curl http://localhost:3000/api/quiz/cache-stats
```

Response:
```json
{
  "memory": {
    "keys": 150,
    "hits": 1200,
    "misses": 200,
    "hitRate": 0.857
  },
  "database": {
    "cachedArticles": 500,
    "totalAccesses": 2000
  }
}
```

## API Endpoints

### Words
- `GET /api/words` - Get words (filters: difficulty, category, search)
- `GET /api/words/:id` - Get specific word
- `GET /api/words/random/:count` - Get random words

### Quiz
- `POST /api/quiz/generate` - Generate quiz article (with LLM caching)
- `GET /api/quiz/words/:userId` - Get words for quiz
- `GET /api/quiz/cache-stats` - Cache statistics

### Progress
- `POST /api/progress/user` - Create/get user
- `POST /api/progress/save-word` - Save word to dictionary
- `GET /api/progress/words/:userId` - Get user's words
- `POST /api/progress/quiz-result` - Save quiz result
- `GET /api/progress/daily/:userId` - Daily progress
- `GET /api/progress/stats/:userId` - Overall statistics

## Database

The backend uses SQLite by default (easy to upgrade to PostgreSQL).

**Database location:** `backend/data/english_learning.db`

**Tables:**
- `words` - Advanced English words
- `users` - User accounts
- `user_words` - User's saved words
- `quiz_results` - Quiz performance
- `cached_articles` - LLM article cache
- `daily_progress` - Daily statistics

## Troubleshooting

### Backend won't start
- Check if port 3000 is available
- Verify Node.js version (18+)
- Check `.env` file exists and has valid values

### LLM errors
- Verify `OPENAI_API_KEY` is set correctly
- Check API key has sufficient credits
- Review error logs in console

### Frontend can't connect
- For iOS Simulator: Use `localhost:3000`
- For physical device: Use your computer's IP address
- Check firewall settings
- Verify backend is running

### High costs
- Check cache hit rate: `GET /api/quiz/cache-stats`
- Reduce `CACHE_TTL_SECONDS` if needed
- Consider using fallback generator (disable LLM)

## Production Deployment

### Recommended Setup

1. **Database**: Upgrade to PostgreSQL
2. **Caching**: Use Redis for distributed caching
3. **Hosting**: Deploy to Heroku, Railway, or AWS
4. **Environment**: Set `NODE_ENV=production`
5. **Monitoring**: Add logging and metrics

### Environment Variables for Production

```env
NODE_ENV=production
PORT=3000
DATABASE_PATH=/var/lib/app/data.db
OPENAI_API_KEY=your_key
RATE_LIMIT_MAX_REQUESTS=200
CACHE_TTL_SECONDS=7200
```

## Security Considerations

- Add authentication/authorization
- Use HTTPS in production
- Validate and sanitize inputs
- Rate limit API endpoints
- Monitor for abuse

