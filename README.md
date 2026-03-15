# IRL (In Real Love)

Mobile dating app MVP built with Expo Router + Supabase.

## Stack

- Expo (React Native, TypeScript)
- Expo Router
- Supabase Auth + Postgres + Realtime

## Design Defaults

- Primary background: `#FFFFFF`
- Accent/surface: `#FFB6C1`
- Text: `#000000`
- Typeface: Neue Haas Grotesk (with safe platform fallbacks)

## Prerequisites

- Node.js 20+
- Expo Go app on iOS/Android
- Supabase project

## Environment

Copy `env.example` to `.env` and fill in values:

```bash
cp env.example .env
```

Required variables:

- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`

## Run Locally

```bash
npm install
npm run start
```

Then scan the QR code in Expo Go.

## Quality Checks

```bash
npm run typecheck
npm run lint
```

## Supabase Schema

Initial migration file:

- `supabase/migrations/0001_initial.sql`

It creates:

- `profiles`
- `business_promotions`
- `chat_rooms`
- `chat_room_members`
- `chat_messages`

with baseline RLS policies for authenticated access.

## Current App Sections

- `Explore`: profile feed placeholder
- `Discovery`: nearby date-promo placeholder
- `Chat`: live-chat placeholder
- `Profile`: account/settings placeholder + sign out

