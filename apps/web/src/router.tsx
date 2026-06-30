import { createBrowserRouter } from 'react-router-dom';
import { RequireAnon, RequireAuth } from './auth/guards';
import { HomePage } from './pages/home';
import { LoginPage } from './pages/login';

export const router = createBrowserRouter([
  {
    path: '/login',
    element: (
      <RequireAnon>
        <LoginPage />
      </RequireAnon>
    ),
  },
  {
    path: '/',
    element: (
      <RequireAuth>
        <HomePage />
      </RequireAuth>
    ),
  },
]);
