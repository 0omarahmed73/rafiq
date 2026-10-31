<div align="center">

# رفيق · Rafiq

**رفيقٌ يرافقني في رحلة العناية بنفسي**
*A calm, private companion for a ten-step self-healing journey, in Arabic.*

[![Live app](https://img.shields.io/badge/Live%20app-rafiq--iota--neon.vercel.app-2F6F66?style=for-the-badge&logo=vercel&logoColor=white)](https://rafiq-iota-neon.vercel.app)

![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178C6?logo=typescript&logoColor=white)
![PWA](https://img.shields.io/badge/PWA-offline--first-5A0FC8?logo=pwa&logoColor=white)
![Tests](https://img.shields.io/badge/tests-500%2B%20passing-2F6F66)
![Privacy](https://img.shields.io/badge/data-stays%20on%20your%20device-2F6F66)

### 👉 [**Open the app: rafiq-iota-neon.vercel.app**](https://rafiq-iota-neon.vercel.app)

*Install it from the browser menu («إضافة إلى الشاشة الرئيسية») and it works offline.*

</div>

<table>
  <tr>
    <td align="center"><img src="screenshots/home.png" width="190" alt="الرئيسية"><br><sub>الرئيسية</sub></td>
    <td align="center"><img src="screenshots/journey.png" width="190" alt="الرحلة"><br><sub>الرحلة</sub></td>
    <td align="center"><img src="screenshots/tracker.png" width="190" alt="التتبّع"><br><sub>التتبّع</sub></td>
    <td align="center"><img src="screenshots/summary.png" width="190" alt="ملخّص للمعالج"><br><sub>ملخّص للمعالج</sub></td>
  </tr>
</table>

<sub>Screenshots use sample data, not real entries.</sub>

## ما هو رفيق؟

تطبيق عربي (من اليمين إلى اليسار) يرافقني في عشر خطوات للعناية بنفسي: تصديق المشاعر، تقبّل الذات، تنظيم الذات،
فهم الذات، التعاطف مع الذات، مسامحة الذات، الحدود واحترام الذات، الثقة بالنفس، العناية والعادات، القيم والاتجاه.
كل ما أكتبه يبقى **على جهازي فقط**، ولا حساب ولا خادم ولا تتبّع. رفيق يدعمني ولا يحلّ محل العلاج النفسي.

## What it does

| | |
|---|---|
| 🧭 **Ten-step journey** | Guided practices per step, with branching questions, drafts that autosave, and a gentle check on readiness. Steps 1–3 follow the structure given by the author's therapist. |
| 💬 **Check-ins** | Pick several emotions at once, set an intensity, add a note, and flag it for the next session. |
| 📈 **Tracker** | A month calendar of only the days you logged, an intensity curve, and your most frequent emotions. No streaks, no guilt. |
| 🧑‍⚕️ **Therapist corner** | Session notes, homework you can tick, edit and delete, and an agenda for what to discuss next time. |
| 🖨️ **Printable summary** | A clean A4 summary (name, period, totals, check-ins, practices). You choose what goes in; nothing is sent anywhere. |
| 🗓️ **Yearly plan** | A 12-month plan with a vision, goals, weekly steps, notes under each step and a year review. Set your age and start month. |
| 🌬️ **Calm space** | A «أحتاج تهدئة» page one tap from the home screen. |
| 🎨 **Your colour** | Choose an accent; it themes the whole app (background, cards, text) in light and dark. |
| 💾 **Backup & restore** | Export your data as a file, restore or merge it on another device. |

## Privacy by design

- Everything is stored in your browser's **IndexedDB**. Nothing is uploaded.
- Sharing is opt-in: notes and practices are private unless you switch sharing on, and the therapist summary contains only what you select.
- Backups are validated before they touch your data, and restoring is all-or-nothing.
- No analytics, no cookies, no external fonts: the font (IBM Plex Sans Arabic) is served from the app itself.

## Tech

React 18 · TypeScript (strict) · Vite 5 · React Router 6 · Tailwind CSS (logical properties, CSS-variable tokens) ·
Dexie over IndexedDB · Zod · vite-plugin-pwa · Vitest + Testing Library · Playwright.

## Run it locally

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # unit and component tests (Vitest)
npx tsc --noEmit   # type check
npm run build      # type check + production build (with the service worker)
npm run preview    # serve the production build
npm run e2e        # end-to-end tests (Playwright, installed Google Chrome)
```

## Project layout

```
src/content/    steps, practices, emotions, yearly plan (typed, validated)
src/db/         record types, Repo interface, Dexie + in-memory stores, backup
src/features/   home, checkin, tracker, journey, step, practice, therapist, summary, yearplan, calm, settings
src/components/ shared UI
src/lib/        dates, digits, ordinals, accents, splash, trends, reminders
e2e/            end-to-end flows (a day with Rafiq, offline use)
```

## Deploy

A static site. `vercel deploy --prod` publishes it, and `vercel.json` rewrites every path to `index.html` so deep
links work. No server and no environment variables.

## Status

Built test-first. `HANDOFF.md` records where the project stands and every decision taken while building.
The content for steps 4–10 and some questions are drafts that a therapist should review before wider use.

## Disclaimer

Rafiq is a self-help tool. It is not a medical device and does not give diagnoses or treatment.
If you are in crisis, contact local emergency services or a trusted person right away.
