# Synthetic Boardroom

Upload your personality. Let your digital self debate with others.

## Stack
- Next.js 14 (App Router)
- Supabase (Postgres + Realtime)
- Anthropic Claude
- Tailwind CSS

## Setup

1. `npm install`
2. Copy `.env.local.example` to `.env.local` and fill in your keys
3. Run the SQL in `supabase-schema.sql` in your Supabase project
4. `npm run dev`

## Deploy

```bash
npx vercel
```
Add env vars in Vercel dashboard.