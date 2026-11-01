import { Navigate, type RouteObject } from 'react-router-dom';
import { Layout } from './Layout';
import { CalmPage } from './features/calm/CalmPage';
import { CheckinPage } from './features/checkin/CheckinPage';
import { SettingsPage } from './features/settings/SettingsPage';
import { HomePage } from './features/home/HomePage';
import { JourneyPage } from './features/journey/JourneyPage';
import { PracticePage } from './features/practice/PracticePage';
import { StepPage } from './features/step/StepPage';
import { SummaryPage } from './features/summary/SummaryPage';
import { HomeworkListPage } from './features/therapist/HomeworkListPage';
import { HomeworkPage } from './features/therapist/HomeworkPage';
import { NotesPage } from './features/therapist/NotesPage';
import { SessionNotePage } from './features/therapist/SessionNotePage';
import { TherapistPage } from './features/therapist/TherapistPage';
import { YearPlanPage } from './features/yearplan/YearPlanPage';
import { TriggerJournalPage } from './features/triggers/TriggerJournalPage';
import { TrackerPage } from './features/tracker/TrackerPage';

export const routes: RouteObject[] = [
  {
    path: '/',
    element: <Layout />,
    children: [
      { index: true, element: <HomePage /> },
      { path: 'checkin', element: <CheckinPage /> },
      { path: 'tracker', element: <TrackerPage /> },
      { path: 'triggers', element: <TriggerJournalPage /> },
      { path: 'journey', element: <JourneyPage /> },
      { path: 'calm', element: <CalmPage /> },
      { path: 'year', element: <YearPlanPage /> },
      { path: 'settings', element: <SettingsPage /> },
      { path: 'therapist', element: <TherapistPage /> },
      { path: 'therapist/summary', element: <SummaryPage /> },
      { path: 'therapist/note', element: <SessionNotePage /> },
      { path: 'therapist/note/:id', element: <SessionNotePage /> },
      { path: 'therapist/homework', element: <HomeworkListPage /> },
      { path: 'therapist/notes', element: <NotesPage /> },
      { path: 'therapist/homework/:id', element: <HomeworkPage /> },
      { path: 'step/:id', element: <StepPage /> },
      { path: 'practice/:practiceId', element: <PracticePage /> },
    ],
  },
  // Outside the layout so an unknown address redirects even while the disclaimer is showing.
  { path: '*', element: <Navigate to="/" replace /> },
];
