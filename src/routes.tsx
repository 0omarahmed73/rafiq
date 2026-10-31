import { Navigate, type RouteObject } from 'react-router-dom';
import { Layout } from './Layout';
import { CheckinPage } from './features/checkin/CheckinPage';
import { HomePage } from './features/home/HomePage';
import { TrackerPage } from './features/tracker/TrackerPage';

export const routes: RouteObject[] = [
  {
    path: '/',
    element: <Layout />,
    children: [
      { index: true, element: <HomePage /> },
      { path: 'checkin', element: <CheckinPage /> },
      { path: 'tracker', element: <TrackerPage /> },
      { path: '*', element: <Navigate to="/" replace /> },
    ],
  },
];
