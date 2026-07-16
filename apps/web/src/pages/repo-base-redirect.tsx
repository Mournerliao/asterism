import { Navigate, useLocation } from 'react-router-dom';

export function RepoBaseRedirect() {
  const location = useLocation();
  return <Navigate to="readme" replace state={location.state} relative="path" />;
}
