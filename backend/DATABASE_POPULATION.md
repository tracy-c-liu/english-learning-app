# Database Population Guide

This guide explains how to populate the database with advanced English vocabulary words.

## Overview

The database population script will add 3200 advanced English words across 4 categories:
- **Professional Workspace**: 800 words
- **Academic**: 800 words
- **Journalism**: 800 words
- **Advanced Idiom**: 800 words

## Prerequisites

1. Ensure you have at least one API key set in your `.env` file:
   ```
   OPENAI_API_KEY=your_openai_api_key_here
   GEMINI_API_KEY=your_gemini_api_key_here
   ```
   
   **Note**: You can use either or both API keys. The script will automatically alternate between available providers to reduce costs and improve reliability.

2. Make sure the database is initialized (this happens automatically when you run the script).

## Running the Script

From the `backend` directory, run:

```bash
npm run populate-words
```

Or directly with ts-node:

```bash
npx ts-node src/database/populateAdvancedWords.ts
```

## How It Works

1. The script checks existing words in the database to avoid duplicates
2. For each category, it generates words in batches of 50, **alternating between OpenAI and Gemini APIs** (if both are configured)
3. If one provider fails, the script automatically retries with the other provider
4. Words are inserted into the database with all required metadata:
   - Word and pronunciation
   - Definition and synonym
   - Context differences
   - Usage examples
   - Difficulty level (3-4 for advanced/expert)

### LLM Providers

- **OpenAI**: Uses GPT-4o-mini model (cost-effective)
- **Google Gemini**: Uses Gemini 1.5 Flash model (free tier available)

The script intelligently alternates between providers to:
- **Reduce costs** by distributing API calls across providers
- **Improve reliability** with automatic failover
- **Avoid rate limits** by using multiple services

## Cost Considerations

### With OpenAI Only
- Uses GPT-4o-mini (cost-effective model)
- Generating 3200 words requires approximately 64 API calls (50 words per batch)
- Estimated cost: $2-5 USD

### With Gemini Only
- Uses Gemini 1.5 Flash (free tier available with generous limits)
- Same number of API calls as OpenAI
- **Free tier**: Up to 15 requests per minute, 1,500 requests per day
- **Paid tier**: Very affordable pricing

### With Both Providers (Recommended)
- **Cost reduction**: Distributes API calls between providers, reducing costs by ~50%
- **Better reliability**: Automatic failover if one provider has issues
- **Rate limit protection**: Alternating reduces chance of hitting rate limits
- Estimated cost: $1-3 USD (depending on usage split)

The script includes 2-second delays between batches to avoid rate limiting.

## Resuming

If the script is interrupted, you can safely run it again. It will:
- Skip categories that already have 800 words
- Only generate the remaining words needed for each category

## Verification

After running, the script will display:
- Total words in database
- Breakdown by category
- Provider usage statistics (how many batches/words from each provider)
- Confirmation of successful completion

## Troubleshooting

**Error: At least one API key must be set**
- Make sure you have a `.env` file in the `backend` directory
- Add at least one API key:
  - `OPENAI_API_KEY=your_key_here` (get from https://platform.openai.com/account/api-keys)
  - `GEMINI_API_KEY=your_key_here` (get from https://makersuite.google.com/app/apikey)

**Rate Limiting Errors**
- The script includes 2-second delays between batches
- If you still hit rate limits, the script will automatically try the other provider
- For Gemini free tier: Stay within 15 requests/minute limit
- Consider using both providers to distribute the load

**Provider-Specific Errors**
- If one provider consistently fails, the script will automatically use the other provider
- Check your API keys are valid and have sufficient credits/quota

**Database Errors**
- Ensure the database directory exists and is writable
- Check that the database schema is initialized correctly

## Notes

- Words are inserted with `INSERT OR IGNORE` to prevent duplicates
- The script uses transactions for efficient batch inserts
- All words are stored with lowercase word text for consistency
- The script automatically alternates between providers for each batch
- Provider statistics are shown at the end to track usage and costs

## Getting API Keys

### OpenAI API Key
1. Go to https://platform.openai.com/account/api-keys
2. Sign up or log in
3. Create a new API key
4. Add to `.env`: `OPENAI_API_KEY=sk-...`

### Google Gemini API Key
1. Go to https://makersuite.google.com/app/apikey
2. Sign in with your Google account
3. Create a new API key (free tier available)
4. Add to `.env`: `GEMINI_API_KEY=...`


