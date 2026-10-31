# رفيق (Rafiq): Handoff

Any model or person can continue from this file. It is updated with every task commit.
Last updated: Task 7 done. Next: Task 8 (practice engine and runner).

## What this is
An offline-first Arabic (RTL) web app / PWA that guides a 10-step self-healing journey, tracks check-ins, and builds a printable summary for the user's therapist. All data stays on the device (IndexedDB). It is a supportive tool, not therapy.

## Where things are
- Project root: `/home/omarahmed/Downloads/OmarFelix/rafiq/` (its **own git repo**; the parent repo ignores this folder on purpose)
- Branch: `feat/build` (initial docs commit is on `main`)
- Spec (binding authority): `docs/superpowers/specs/2026-10-31-rafiq-design.md`
- Plan (18 tasks, TDD, exact test assertions): `docs/superpowers/plans/2026-10-31-rafiq.md`
- Step 4-10 content (Arabic wording to transcribe): `docs/content/steps-4-10.html`
- Visual design (22 screens, Arabic RTL, 390x844): https://claude.ai/artifact/67YSZmofyCQ2Fw6gibMTD2
- Execution ledger (git-ignored, one line per finished task and every ruling): `.superpowers/sdd/2026-10-31-rafiq/progress.md`

## How to work
- Follow the plan task by task, in order. Each step is TDD: write the failing test, run it and watch it fail, implement, run it and watch it pass, commit.
- Run from this folder: `npx vitest run <file>` for one test file, `npx vitest run` for the suite, `npx tsc --noEmit` for types.
- Commit messages end with: `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`
- Deviating from the plan is allowed only with a written ruling (see "Rulings" below). The spec wins over the plan.
- Do not push, publish, or deploy anything without the owner's go-ahead.

## Hard rules (from the spec)
- `<html lang="ar" dir="rtl">`; all user-facing copy in simple standard Arabic, first person; digits shown Arabic-Indic, stored as normal numbers.
- Intensity is an integer 0..10. Day keys are `YYYY-MM-DD` in local time.
- Privacy defaults: `share=false`, `forNextSession=false`; session notes never enter the summary.
- No streak counter; empty days are hidden, never described as failure.
- No analytics, no network calls with user data, fonts self-hosted.
- Touch targets >= 44px, contrast >= 4.5:1, real buttons/labels.
- Never write help-line phone numbers from memory.

## Status
| Task | What | State |
|---|---|---|
| 1 | Scaffold, RTL shell, tab bar | done |
| 2 | Date and digit helpers | done |
| 3 | Content schema, steps, emotions | done |
| 4 | Data layer (Repo, Dexie, memory) | done |
| 5 | Shared UI components | done |
| 6 | Check-in and Home | done |
| 7 | Tracker | done |
| 8 | Practice engine and runner | pending |
| 9 | Steps 1-3 practices | pending |
| 10 | Journey and Step page | pending |
| 11 | Readiness check | pending |
| 12 | Steps 4-10 practices | pending |
| 13 | Therapist sessions and agenda | pending |
| 14 | Summary builder and print | pending |
| 15 | Weekly review | pending |
| 16 | Backup export and import | pending |
| 17 | Calm, disclaimer, settings, reminders | pending |
| 18 | PWA, deploy, e2e | pending |
| - | Final whole-branch review, then finish branch | pending |

## Rulings (decisions that deviate from, or fill gaps in, the plan)
1. `rafiq/` is its own git repo, not part of the Mashhad repo. Reason: the parent `.gitignore` is an allow-list that ignores `rafiq/`, and the parent publishes to a Vercel deploy. Cost if wrong: one remote/URL change later.
2. Task 1: `src/test/setup.ts` wraps `globalThis.Request` to drop `init.signal`. Reason: under jsdom, Node's native `Request` rejects jsdom's `AbortSignal`, which React Router's data router passes on navigation (redirect test failed without it). Test-only; cost if wrong: remove the wrapper if jsdom/Node versions align later.
3. Task 1: App takes a `router` prop (`App({ router })`) instead of using `BrowserRouter` directly, so tests can pass `createMemoryRouter`. Same behaviour in the browser (`createBrowserRouter` in `main.tsx`).
4. Task 4: added `src/db/repoCore.ts`: one `createRepo(store)` implementation over a tiny `Store` interface (Dexie store and in-memory store both implement it). Reason: avoids duplicating ~25 repo methods; the contract suite runs against both. Cost if wrong: split into two classes.
5. Task 4: `Settings` gained `lastReminderDay` (Task 17's `reminderDue` needs it); `AllData.settings` is an array of 0..1 rows so every table merges the same way; `addSoothing` ignores duplicate text. Cost if wrong: small edits in Tasks 16/17.

## Open items for the owner
- Steps 4-10 content and the readiness questions for steps 1-3 are drafts: the owner's therapist must review them before release.
- Help-line numbers per country are not added yet (they must be verified, never invented).
- Weekly-review question list has one given question; five more are written by the implementer and flagged for the owner's review (Task 15).

## Changes log (newest first)
- Task 7: `/tracker`: `shadeFor`, `trendOf`, `MonthCalendar` (only logged days, grid-placed, Saturday-first), `IntensityCurve` (last 7 logged days, right-to-left), `TopEmotions`, neutral intro text (no failure/streak wording). Shade tokens added (light/dark). `formatArabicMonthYear` added to dates.
- Task 6: `saveCheckin` + `ValidationError` (rejects no emotion / intensity outside integer 0..10; files by local day), `QuickCheckin` (chip + slider default 5 + حفظ), `CheckinPage`, `HomePage` (calm button, quick check-in, current step card), `currentStepId` pulled forward from Task 10 (Task 10 adds `markPracticed`). Routes: `/`, `/checkin`.
- Task 5: Components: `Chip`, `Switch`, `IntensitySlider` (0-10, Arabic digits), `ProgressSegments`, `Banner`, `StorageBanner`. `App` now takes `router`, `repo`, `persistent` and provides the repo; `main.tsx` opens the DB in `boot()` before rendering.
- Task 4: `src/db`: record types (`schema.ts`), `Repo` interface (`repo.ts`), shared `createRepo` (`repoCore.ts`), Dexie store + `RafiqDB` (`dexieRepo.ts`), memory store (`memoryRepo.ts`), `openDb` with in-memory fallback (`open.ts`), `RepoProvider`/`useRepo`. Contract tests run on both stores.
- Task 3: `src/content`: Zod schemas, 10 steps (title, core question, lesson), 6 emotion groups / 42 words, `emotionLabel`, `validateContent`. Step 5 lesson reworded gender-neutral.
- Task 2: `src/lib/dates.ts` (dayKey, addDays, weekStartSaturday, formatArabicDate, DayKey) and `src/lib/digits.ts` (toArabicDigits), local-time based, fixed Arabic weekday/month tables, no Intl.
- Task 1: Vite + React + TS (strict) + Tailwind 3 + Vitest scaffold; RTL `index.html`; CSS tokens (light/dark); `TabBar` (4 tabs), `Layout`, `routes` (home placeholder + catch-all redirect), `App`, `main.tsx` (self-hosted IBM Plex Sans Arabic via @fontsource). Tests: `TabBar.test.tsx`, `App.test.tsx`.
