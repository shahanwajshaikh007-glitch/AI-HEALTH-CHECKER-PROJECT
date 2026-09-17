/**
 * PublicLayout — wraps public pages (Landing, Login, Register).
 * Includes Navbar + Footer. Will be fleshed out in Phase 5.
 */

import { Outlet } from 'react-router-dom';
import Navbar from '../components/Navbar';

export default function PublicLayout() {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1">
        <Outlet />
      </main>
    </div>
  );
}
