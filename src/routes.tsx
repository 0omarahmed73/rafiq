import { Navigate, type RouteObject } from 'react-router-dom';
import { Layout } from './Layout';

export const routes: RouteObject[] = [
  {
    path: '/',
    element: <Layout />,
    children: [
      { index: true, element: <h1 className="text-2xl font-bold">رفيق</h1> },
      { path: '*', element: <Navigate to="/" replace /> },
    ],
  },
];
