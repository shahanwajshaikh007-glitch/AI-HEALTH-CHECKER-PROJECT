/**
 * BottomNav.jsx — Mobile & Desktop Tab Navigation Bar.
 * Enables quick switching between Home, Check Symptoms, Ask AI, History, Profile, and Admin views.
 */

import { Home, Stethoscope, MessageSquare, Clock, User, ShieldCheck } from 'lucide-react';

export default function BottomNav({ activeTab, setActiveTab, userRole = 'user' }) {
  const tabs = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'check', label: 'Check', icon: Stethoscope },
    { id: 'ai', label: 'AI Chat', icon: MessageSquare },
    { id: 'history', label: 'History', icon: Clock },
    { id: 'profile', label: 'Profile', icon: User },
  ];

  if (userRole === 'admin') {
    tabs.push({ id: 'admin', label: 'Admin', icon: ShieldCheck });
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 py-2 px-4 shadow-lg z-40 md:sticky md:bottom-auto md:top-16 md:border-b md:border-t-0 md:shadow-none">
      <div className="max-w-4xl mx-auto flex items-center justify-around">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex flex-col md:flex-row items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs md:text-sm font-medium transition-all duration-200 ${
                isActive
                  ? 'text-blue-600 bg-blue-50 md:bg-blue-600 md:text-white'
                  : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <Icon className={`w-5 h-5 ${isActive ? 'text-blue-600 md:text-white' : 'text-slate-400'}`} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
