# رفيق (Rafiq): Handoff

Any model or person can continue from this file. It is updated with every task commit.
Last updated: Task 14 done. Next: Task 15 (weekly review).

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
| 6b | Several emotions per day (owner request) | done |
| 7 | Tracker | done |
| 8 | Practice engine and runner | done |
| 9 | Steps 1-3 practices | done |
| 10 | Journey and Step page | done |
| 11 | Readiness check | done |
| 12 | Steps 4-10 practices | done |
| 13 | Therapist sessions and agenda | done |
| 14 | Summary builder and print | done |
| 15 | Weekly review | pending |
| 16 | Backup export and import | pending |
| 17 | Calm, disclaimer, settings, reminders | pending |
| 17b | Favourite accent colour (owner request) | pending |
| 18 | PWA, deploy, e2e | pending |
| - | Final whole-branch review, then finish branch | pending |

## Rulings (decisions that deviate from, or fill gaps in, the plan)
1. `rafiq/` is its own git repo, not part of the Mashhad repo. Reason: the parent `.gitignore` is an allow-list that ignores `rafiq/`, and the parent publishes to a Vercel deploy. Cost if wrong: one remote/URL change later.
2. Task 1: `src/test/setup.ts` wraps `globalThis.Request` to drop `init.signal`. Reason: under jsdom, Node's native `Request` rejects jsdom's `AbortSignal`, which React Router's data router passes on navigation (redirect test failed without it). Test-only; cost if wrong: remove the wrapper if jsdom/Node versions align later.
3. Task 1: App takes a `router` prop (`App({ router })`) instead of using `BrowserRouter` directly, so tests can pass `createMemoryRouter`. Same behaviour in the browser (`createBrowserRouter` in `main.tsx`).
4. Task 4: added `src/db/repoCore.ts`: one `createRepo(store)` implementation over a tiny `Store` interface (Dexie store and in-memory store both implement it). Reason: avoids duplicating ~25 repo methods; the contract suite runs against both. Cost if wrong: split into two classes.
5. Task 4: `Settings` gained `lastReminderDay` (Task 17's `reminderDue` needs it); `AllData.settings` is an array of 0..1 rows so every table merges the same way; `addSoothing` ignores duplicate text. Cost if wrong: small edits in Tasks 16/17.
6. Task 8: practice answers: chips are `{values, text?}` (not `string[]`) so "which need + why" and "chip + editable sentence" fit one prompt; the draft position lives in `answers._position`; answers of hidden (showWhen) prompts are dropped on finish; no prompt is required (Next is always enabled). Cost if wrong: small edits to prompts/tests.
7. Task 9: new sink `followup`: finishing `regulation-followup` stores a `Followup` row against the latest completed `regulation` record (skipped if none, or if "did it help" is unanswered). Reason: spec §5 has a `followups` table that no task wrote to.
8. Task 9: content wording is first person (no gendered imperatives); the regulation record is 5 prompts (one per screen), not the canvas's single-screen form. Dark-mode calendar shades were lightened after a visual check.
9. Task 6b (owner request): "multi emotions in the same day" was read as (a) the quick check-in takes several emotions with one shared intensity, and (b) tapping a day in the tracker lists all of that day's check-ins (time, emotions, intensity, note). If the owner meant per-emotion intensities within one check-in, that is a data-model change (not done).
10. Owner request queued: favourite accent colour (six palettes, light and dark, contrast tested, stored in `settings.accent`). Planned as Task 17b, built with the Settings page. See spec section 16 and the plan.
11. Task 11: readiness result messages are gender-neutral (not the plan's «يبدو أنك مستعد» / «ابقَ قليلًا»): «يبدو أن الوقت مناسب للانتقال إلى الخطوة التالية.» and «من الأفضل البقاء قليلًا في هذه الخطوة.»; threshold is a mean of 3.5 or more out of 5; the check never blocks navigation and the user can always press «أنهيتُ هذه الخطوة».
12. Task 12: new prompt setting `saveToSoothing` ('step1' | 'step9') + `applySoothing()`: finished practices add their list items to the soothing list (duplicates ignored); `ListPrompt` prefills from the soothing list only the first time (an emptied list stays empty). The extra exercises in `docs/content/steps-4-10.html` (critic vs compassionate voice, soothing touch, gradual trust, evidence log, weekly pattern review) were NOT turned into practices; only the numbered prompts were.
13. Task 13: agenda points are closed with a «تمت مناقشتها» checkbox (they then leave the list); homework ticks in a session note are saved with «حفظ الملاحظات»; session notes are private and never reach the summary.
14. Task 14: summary rules: check-ins/curve/weekly reviews/practices only when their switch is on; practices only if `share`; weekly reviews only if `share`; flagged («للنقاش») items appear once (not repeated if shown elsewhere); session notes never; with every switch off the page says «لم أختر ما يدخل في الملخّص», with no data «لا توجد بيانات في هذه الفترة». Print forces light colours (`print.css`).

## Open items for the owner
- Steps 4-10 content and the readiness questions for steps 1-3 are drafts: the owner's therapist must review them before release.
- Help-line numbers per country are not added yet (they must be verified, never invented).
- Weekly-review question list has one given question; five more are written by the implementer and flagged for the owner's review (Task 15).

## Changes log (newest first)
- Task 14: `/therapist/summary`: date range (default this month), five include-switches, live preview, 'حفظ كملف PDF' (window.print). `buildSummary` enforces privacy (shared/flagged only, no sessions), `formatAnswer` renders practice answers, `SummaryPrint` with empty states, `print.css` (A4, light colours); tab bar hidden when printing.
- Task 13: `/therapist` (agenda of items flagged for the next session + open points, add/close points, past sessions with homework progress), `/therapist/note[/:id]` (date, what was said, takeaway, homework checklist; private), `agendaItems(repo)` (after the latest session, newest first).
- Task 12: Practices `understand`, `compassion` (+ `compassion-letter`, `gratitude-letter`), `forgive` (+ `forgiveness-letter`), `boundaries`, `trust`, `care`, `values`; prompt setting `saveToSoothing` + `applySoothing`; `ListPrompt` prefill from the soothing list; `useOptionalRepo`. Every step now has practices.
- Task 11: `ReadinessCheck` on every step page: 3 statements per step (1-5, labelled ends), `readinessMessage` (mean >= 3.5 is ready), saved in step progress, never blocks; user can mark the step done. `content/readiness.ts` holds the 30 statements.
- Task 10: `/journey` (10 steps as links, nothing locked, status labels, current step marked) and `/step/:id` (core question, lesson, practice links, acceptance decision card, privacy line); `markPracticed` called when a practice finishes. HANDOFF status table gained rows 6b and 17b.
- Task 6b: Owner request: quick check-in accepts several emotions (one shared intensity); tracker days are buttons and `DayDetail` lists every check-in of the chosen day (default today); `formatArabicTime`; calendar cells are now 44px buttons. Spec section 16 and plan Task 17b added for the favourite-colour request.
- Task 9: Practices `validate` (5 parts), `accept` (7 questions, branch on 'need', saves keep/change decision), `regulation` (5 prompts), `regulation-followup` (sink `followup` -> Followup row); registry in `content/practices/index.ts` is validated by `validateContent`. Dark-mode calendar shades lightened; legend swatch ringed.
- Task 8: Practice engine (`features/practice`): `visiblePrompts`, `nextPromptId`/`previousPromptId` (showWhen branching), `applySink` (letters, acceptance decision), `PracticeRunner` (one prompt per screen, autosaved drafts resumed at the same prompt, final screen with 'للنقاش' and 'مشاركة' switches, both off by default), 7 prompt components, `PracticePage` at `/practice/:practiceId`, `validatePractice` + Prompt/PracticeDef schemas in `content/schema.ts`, empty practice registry `content/practices/index.ts`. Chips answers are `{values,text?}`.
- Task 7: `/tracker`: `shadeFor`, `trendOf`, `MonthCalendar` (only logged days, grid-placed, Saturday-first), `IntensityCurve` (last 7 logged days, right-to-left), `TopEmotions`, neutral intro text (no failure/streak wording). Shade tokens added (light/dark). `formatArabicMonthYear` added to dates.
- Task 6: `saveCheckin` + `ValidationError` (rejects no emotion / intensity outside integer 0..10; files by local day), `QuickCheckin` (chip + slider default 5 + حفظ), `CheckinPage`, `HomePage` (calm button, quick check-in, current step card), `currentStepId` pulled forward from Task 10 (Task 10 adds `markPracticed`). Routes: `/`, `/checkin`.
- Task 5: Components: `Chip`, `Switch`, `IntensitySlider` (0-10, Arabic digits), `ProgressSegments`, `Banner`, `StorageBanner`. `App` now takes `router`, `repo`, `persistent` and provides the repo; `main.tsx` opens the DB in `boot()` before rendering.
- Task 4: `src/db`: record types (`schema.ts`), `Repo` interface (`repo.ts`), shared `createRepo` (`repoCore.ts`), Dexie store + `RafiqDB` (`dexieRepo.ts`), memory store (`memoryRepo.ts`), `openDb` with in-memory fallback (`open.ts`), `RepoProvider`/`useRepo`. Contract tests run on both stores.
- Task 3: `src/content`: Zod schemas, 10 steps (title, core question, lesson), 6 emotion groups / 42 words, `emotionLabel`, `validateContent`. Step 5 lesson reworded gender-neutral.
- Task 2: `src/lib/dates.ts` (dayKey, addDays, weekStartSaturday, formatArabicDate, DayKey) and `src/lib/digits.ts` (toArabicDigits), local-time based, fixed Arabic weekday/month tables, no Intl.
- Task 1: Vite + React + TS (strict) + Tailwind 3 + Vitest scaffold; RTL `index.html`; CSS tokens (light/dark); `TabBar` (4 tabs), `Layout`, `routes` (home placeholder + catch-all redirect), `App`, `main.tsx` (self-hosted IBM Plex Sans Arabic via @fontsource). Tests: `TabBar.test.tsx`, `App.test.tsx`.
