# IRL v2

iOS-native Expo app + Supabase. Rewritten ground-up with strict TypeScript, 100% test coverage, and a rigorous CI/CD pipeline.

## Stack
- **Client**: Expo SDK 55+, React Native 0.83, React 19, expo-router (typed routes)
- **State**: TanStack Query v5 + supabase-cache-helpers
- **Forms**: react-hook-form + zod
- **Styling**: react-native-unistyles 3
- **Animation**: react-native-reanimated 4
- **Backend**: Supabase (Postgres + Auth + Storage + Realtime)
- **Testing**: Jest + RNTL (units) + Maestro (E2E)
- **Lint**: ESLint 9 flat config (strict), Prettier 3
- **CI/CD**: GitHub Actions + EAS Build + semantic-release

## Quickstart
```bash
pnpm install
cp env.example .env       # fill in Supabase URL + anon key
pnpm supabase:start       # local Postgres + studio
pnpm supabase:types       # generate Database types
pnpm start                # Expo dev server (press `i` for iOS sim)
```

## Scripts
| Command | Purpose |
|---|---|
| `pnpm typecheck` | strict tsc --noEmit |
| `pnpm lint` | ESLint, max-warnings=0 |
| `pnpm format` | Prettier write |
| `pnpm test` | Jest |
| `pnpm test:coverage` | Jest with 100% gate |
| `pnpm test:mutation` | Stryker on hooks + lib |
| `pnpm supabase:types` | regenerate Database types |
| `pnpm maestro:test` | run E2E flows on iOS sim |

## Engineering rules (non-negotiable)
- **TypeScript**: strict + `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `useUnknownInCatchVariables`, `verbatimModuleSyntax`. No `any`. No `as` casts outside `src/lib/brand.ts`.
- **Lint**: ESLint runs on every commit (lefthook) and gates merges. `--max-warnings=0`.
- **Coverage**: 100% lines/branches/functions/statements on every PR. Mutation score gate at 85%.
- **Commits**: Conventional commits (`feat:`, `fix:`, `refactor:`…). Enforced by commitlint.
- **Pre-push**: `typecheck && lint && test:coverage` runs locally; CI repeats.
- **Schema drift**: CI regenerates Supabase types and fails if `types.generated.ts` is stale.
- **Branch protection on `main`**: typecheck, lint, format, schema-drift, unit, mutation (on `main` PRs), maestro (on label) must all pass; 1 approval; linear history; signed commits.

## Layout
- `app/` — Expo Router routes (thin shells only).
- `src/features/<pillar>/` — feature-scoped hooks, screens, schemas.
- `src/api/` — Supabase client, generated types, query-key factory, realtime channel factory.
- `src/lib/` — pure utilities (Result, branded types, signed-URL cache, logger, date).
- `src/ui/` — design-system primitives (Screen, Text, Button, Avatar).
- `src/theme/` — Unistyles tokens.
- `src/providers/` — App providers (QueryClient, Session, Realtime, Notifications).
- `src/config/` — Zod-parsed env, city config, feature flags.
- `supabase/migrations/` — forward-only SQL migrations.
- `.maestro/` — E2E flows.
- `.github/workflows/` — CI + Release.

## Migration from v1
- Same Supabase project, same iOS bundle id (`com.irl.app`).
- Forward migrations 0018–0024 are non-destructive; v1 clients keep working during rollout.
- Ship as `2.0.0` via TestFlight internal → external (10% cohort) → App Store phased release (7 days).
- Backfills handled in migrations: `chat_receipts` for old messages; `profiles.onboarding_complete` for completed users.

## Out of scope for v1
Android. Web. Block / report / unmatch. Photo verification. Apple Sign In. Phone OTP. Discovery search/filter. Device geolocation permissions (NYC bbox via `city.ts`). Video/voice/group chat. IAP. Offline write queue.
