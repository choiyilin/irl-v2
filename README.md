# IRL

Expo (React Native) app using Expo Router and Supabase. Use the steps below to install dependencies, configure env, and run the dev server.

## Prerequisites

- **Node.js** 20 or newer (LTS recommended)
- **npm** (comes with Node)
- **Expo Go** on a physical phone ([iOS](https://apps.apple.com/app/expo-go/id982107779) / [Android](https://play.google.com/store/apps/details?id=host.exp.exponent)) if you want to run on device via QR code
- For **iOS Simulator**: Xcode (macOS only)
- For **Android Emulator**: Android Studio + an AVD

## 1. Install

Clone the repository, `cd` into it, then:

```bash
npm install
```

## 2. Environment

Create a `.env` file in the project root (Expo loads `EXPO_PUBLIC_*` variables automatically):

```bash
cp env.example .env
```

Edit `.env` and set:

| Variable | Description |
|----------|-------------|
| `EXPO_PUBLIC_SUPABASE_URL` | Your Supabase project URL |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Your Supabase anon (public) key |

Apply the SQL in `supabase/migrations/` to your Supabase project so the app’s tables and RPCs exist.

## 3. Launch (development)

Start the Expo dev server:

```bash
npm start
```

Then:

- **Physical device**: open the Camera app (iOS) or Expo Go (Android), scan the QR code from the terminal or Dev Tools page.
- **iOS Simulator** (macOS): press `i` in the terminal or run:

  ```bash
  npm run ios
  ```

- **Android Emulator**: start an emulator, then press `a` in the terminal or run:

  ```bash
  npm run android
  ```

- **Web**:

  ```bash
  npm run web
  ```

If Metro shows a stale bundle, restart with a clean cache:

```bash
npx expo start -c
```

## Scripts

| Command | Purpose |
|---------|---------|
| `npm start` | Dev server (Expo) |
| `npm run ios` | Open in iOS Simulator |
| `npm run android` | Open in Android emulator |
| `npm run web` | Open in browser |
| `npm run typecheck` | TypeScript check |
| `npm run lint` | ESLint (Expo config) |
