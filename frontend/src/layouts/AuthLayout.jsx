/**
 * AuthLayout — wraps protected pages (Dashboard, Symptom Checker, etc.)
 * Performs auth guard check. Will be enhanced in Phase 3 (JWT auth).
 */

import { Outlet, Navigate } from 'react-router-dom';

export default function AuthLayout() {
  // Phase 1 stub: always allow. Phase 3 will check JWT.
  const token = localStorage.getItem('access_token');

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Outlet />
    </div>
  );
}
