# رفيق (Rafiq)

An offline-first Arabic (right-to-left) web app and PWA that guides a ten-step self-healing journey, tracks check-ins,
and builds a printable summary for the user's therapist. Everything the user writes stays on their device
(IndexedDB). It supports the user and does not replace therapy.

- Design spec: `docs/superpowers/specs/2026-10-31-rafiq-design.md`
- Implementation plan: `docs/superpowers/plans/2026-10-31-rafiq.md`
- Where the project stands and every decision taken while building: `HANDOFF.md`

## Commands

```bash
npm install
npm run dev        # development server on http://localhost:5173
npm test           # unit and component tests (Vitest)
npx tsc --noEmit   # type check
npm run build      # type check + production build (with the service worker)
npm run preview    # serve the production build
npm run e2e        # end-to-end tests (Playwright, uses the installed Google Chrome)
```

## Deploy

A static site: deploy the `dist/` folder (for example on Vercel). `vercel.json` rewrites every path to
`index.html` so deep links work. No server, no environment variables, no analytics.

## Layout

```
src/content/    steps, practices, emotions, readiness questions (typed, validated)
src/db/         record types, Repo interface, Dexie + in-memory stores, backup
src/features/   home, checkin, tracker, journey, step, practice, therapist, summary, calm, settings
src/components/ shared UI
src/lib/        dates, digits, trend, shade, weekly review, reminders, accents, colour helpers
e2e/            end-to-end flow
```
