# Live Stream Word Cloud - Audience-Driven Project Voting

A real-time, collaborative word cloud application for live stream audiences to submit and vote on project ideas. Perfect for engaging a YouTube live stream audience in deciding what coding challenge to tackle.

## Features

- **Anonymous Participation**: No authentication required - just visit the site and participate
- **Idea Submission**: Submit text describing what you want built (max 200 characters)
- **Smart Phrase Extraction**: Automatically extracts meaningful 1-3 word phrases from submissions
- **Interactive Word Cloud**: Visualize popular ideas with font size based on score
- **Real-time Voting**: Click phrases to upvote them - one vote per phrase per session
- **Live Updates**: See new submissions and votes appear instantly via WebSocket
- **Live Stats Dashboard**: Track total submissions, votes, and top phrases
- **Rate Limiting**: Submissions limited to once per 5 minutes to prevent spam
- **Profanity Filter**: Client-side filtering keeps content appropriate
- **Dark Mode UI**: Professional dark blue/black theme optimized for streaming

## Tech Stack

- **Frontend**: React + Vite
- **Styling**: Tailwind CSS (dark mode only)
- **Database**: Supabase (PostgreSQL)
- **Real-time**: Supabase real-time subscriptions
- **Word Cloud**: react-wordcloud / d3-cloud
- **Notifications**: react-hot-toast

## Quick Start

### Prerequisites

- Node.js 18+
- npm or pnpm

### Setup

```bash
# Install dependencies
npm install

# Create .env file with these contents:
VITE_SUPABASE_URL=https://vmgxvjmgfqrsvxcekrqr.supabase.co
VITE_SUPABASE_ANON_KEY=<your-anon-key>

# Start dev server
npm run dev
```

## Project Structure

```
├── src/
│   ├── components/
│   │   ├── Header.jsx           # App header with title
│   │   ├── SubmissionForm.jsx   # Idea submission form
│   │   ├── WordCloudVisualization.jsx  # Interactive word cloud
│   │   ├── StatsDashboard.jsx   # Live statistics panel
│   │   ├── Footer.jsx           # Session info and credits
│   │   └── RateLimitCountdown.jsx  # Rate limit timer
│   ├── hooks/
│   │   ├── useSession.js        # Session management
│   │   ├── useSubmissions.js    # Submissions data & real-time
│   │   ├── useVotes.js          # Voting logic
│   │   └── usePhrases.js        # Phrase extraction
│   ├── lib/
│   │   ├── supabase.js          # Supabase client
│   │   ├── phraseExtraction.js  # N-gram extraction logic
│   │   └── stopWords.js         # Stop word list
│   ├── utils/
│   │   ├── localStorage.js      # LocalStorage helpers
│   │   └── rateLimiting.js      # Rate limit logic
│   ├── App.jsx                  # Main app component
│   ├── main.jsx                 # Entry point
│   └── index.css                # Tailwind imports
├── .env                         # Environment variables (not committed)
├── .env.example                 # Environment template
├── feature_list.json            # Test cases for validation
├── init.sh                      # Setup script
├── tailwind.config.js           # Tailwind configuration
├── vite.config.js               # Vite configuration
└── package.json                 # Dependencies
```

## Database Schema

The Supabase database needs tables:

### `submissions` table
- `id`: UUID (primary key)
- `text`: TEXT (3-200 characters)
- `session_id`: TEXT (client UUID)
- `created_at`: TIMESTAMP

### `phrase_votes` table
- `id`: UUID (primary key)
- `phrase_text`: TEXT (lowercase phrase)
- `session_id`: TEXT (client UUID)
- `created_at`: TIMESTAMP
- UNIQUE constraint on (phrase_text, session_id)

**Note**: Row Level Security (RLS) is **disabled** for anonymous access.

## Usage

1. **Submit Ideas**: Type your idea (3-200 chars) and click "Submit"
2. **Vote on Phrases**: Click any phrase in the word cloud to upvote
3. **View Stats**: Check the dashboard for live metrics
4. **Rate Limits**: Wait 5 minutes between submissions

## Development

```bash
# Start dev server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Lint code
npm run lint
```

## Design System

- **Background**: #0A0E27 (dark blue-black)
- **Surface**: #141B34 (cards, elevated)
- **Primary Blue**: #3B82F6 (CTAs)
- **Cyan Accent**: #06B6D4 (voted phrases)
- **Text**: #F3F4F6 (primary), #9CA3AF (secondary)

## Contributing

This project uses `feature_list.json` to track all test cases. When implementing features:

1. Work on one feature at a time
2. Test thoroughly
3. Mark test as passing: `"passes": true`
4. **Never remove or edit feature descriptions**

## License

MIT

---

Built with React + Supabase for live stream audience engagement.
