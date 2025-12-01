# English Learning App - Backend API

Backend server for the English Learning App with LLM-powered quiz generation, advanced word database, and progress tracking.

## Features

- 📚 **Advanced Word Database**: Store and retrieve advanced English words with difficulty levels
- 🤖 **LLM-Powered Quiz Generation**: Generate contextual quiz articles using OpenAI
- 💾 **Smart Caching**: Multi-layer caching to reduce LLM API calls and costs
- 📊 **Progress Tracking**: Track user learning progress, quiz results, and daily statistics
- ⚡ **Performance Optimized**: Rate limiting, compression, and efficient database queries

## Cost & Latency Optimization

### Caching Strategy

1. **In-Memory Cache** (Fastest)
   - Stores recently generated articles in RAM
   - TTL: 1 hour (configurable)
   - Max keys: 1000 (configurable)

2. **Database Cache** (Persistent)
   - Stores articles in SQLite database
   - Persists across server restarts
   - TTL: 7 days (configurable)
   - Auto-cleanup of old entries

3. **Cache Key Strategy**
   - Uses sorted word IDs as cache key
   - Same word combination = cache hit
   - Reduces redundant LLM calls by ~80-90%

### Cost Reduction Techniques

- **Caching**: Reduces LLM API calls by 80-90%
- **Token Limits**: Max 300 tokens per article generation
- **Model Selection**: Uses GPT-3.5-turbo (cheaper than GPT-4)
- **Rate Limiting**: Prevents abuse and controls costs
- **Fallback Generator**: Simple template-based generator if LLM fails

### Latency Optimization

- **Multi-layer caching**: Memory cache (ms) → Database cache (ms) → LLM (seconds)
- **Response compression**: Reduces payload size
- **Database indexing**: Fast queries on word IDs, user IDs, buckets
- **Connection pooling**: Efficient database connections

## Setup

### Prerequisites

- Node.js 18+ 
- npm or yarn
- OpenAI API key (for LLM features)

### Installation

```bash
cd backend
npm install
```

### Configuration

1. Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

2. Set your OpenAI API key:
```env
OPENAI_API_KEY=your_api_key_here
```

### Running

**Development:**
```bash
npm run dev
```

**Production:**
```bash
npm run build
npm start
```

Server runs on `http://localhost:3000` by default.

## API Endpoints

### Words

- `GET /api/words` - Get words (with filters: difficulty, category, search)
- `GET /api/words/:id` - Get specific word
- `GET /api/words/random/:count` - Get random words for learning

### Quiz

- `POST /api/quiz/generate` - Generate quiz article from word IDs
- `GET /api/quiz/words/:userId` - Get words for quiz (prioritizes "needs work")
- `GET /api/quiz/cache-stats` - Get cache statistics

### Progress

- `POST /api/progress/user` - Create/get user by device ID
- `POST /api/progress/save-word` - Save word to user's dictionary
- `GET /api/progress/words/:userId` - Get user's saved words
- `POST /api/progress/quiz-result` - Save quiz result and update bucket
- `GET /api/progress/daily/:userId` - Get daily progress
- `GET /api/progress/stats/:userId` - Get overall statistics

## Database Schema

- **words**: Advanced English words with definitions, difficulty levels
- **users**: User accounts (device-based)
- **user_words**: User's saved words with buckets
- **quiz_results**: Quiz performance tracking
- **cached_articles**: LLM-generated articles cache
- **daily_progress**: Daily learning statistics

## Monitoring

Check cache effectiveness:
```bash
curl http://localhost:3000/api/quiz/cache-stats
```

## Deployment

### Environment Variables

- `PORT`: Server port (default: 3000)
- `DATABASE_PATH`: SQLite database path
- `OPENAI_API_KEY`: OpenAI API key (required)
- `OPENAI_MODEL`: Model to use (default: gpt-3.5-turbo)
- `CACHE_TTL_SECONDS`: Memory cache TTL (default: 3600)
- `RATE_LIMIT_MAX_REQUESTS`: Max requests per window (default: 100)

### Production Considerations

1. **Database**: Consider upgrading to PostgreSQL for production
2. **Caching**: Use Redis for distributed caching
3. **Monitoring**: Add logging and metrics (e.g., Prometheus)
4. **Security**: Add authentication/authorization
5. **Scaling**: Use load balancer for multiple instances

## Cost Estimation

With caching enabled:
- **First quiz generation**: ~$0.001-0.002 per article (GPT-3.5-turbo)
- **Cached requests**: $0 (no API call)
- **Estimated monthly cost**: $5-20 for 1000 active users (with 80% cache hit rate)

Without caching: ~$50-100/month for same usage.

