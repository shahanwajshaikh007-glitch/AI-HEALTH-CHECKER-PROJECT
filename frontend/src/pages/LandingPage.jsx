/**
 * LandingPage — Phase 1 version.
 * Shows the hero section and verifies backend connectivity.
 * Full landing page design will be built in Phase 5.
 */

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Mic, Search, Brain, CheckCircle, XCircle, Loader2, Activity, Shield, FileText, Bell } from 'lucide-react';
import { checkHealth } from '../services/healthService';

// ─── Backend Status Banner ─────────────────────────────────────────
function BackendStatus() {
  const [status, setStatus] = useState('checking'); // checking | ok | error
  const [info, setInfo]     = useState(null);

  useEffect(() => {
    let cancelled = false;
    checkHealth()
      .then((data) => { if (!cancelled) { setInfo(data); setStatus('ok'); } })
      .catch(() => { if (!cancelled) setStatus('error'); });
    return () => { cancelled = true; };
  }, []);

  if (status === 'checking') {
    return (
      <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-amber-50 border border-amber-200 text-amber-700 text-sm">
        <Loader2 className="w-4 h-4 animate-spin" />
        Connecting to backend…
      </div>
    );
  }
  if (status === 'ok') {
    return (
      <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-green-50 border border-green-200 text-green-700 text-sm">
        <CheckCircle className="w-4 h-4" />
        Backend connected — {info?.service} v{info?.version}
      </div>
    );
  }
  return (
    <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-red-50 border border-red-200 text-red-700 text-sm">
      <XCircle className="w-4 h-4" />
      Backend offline — connecting to Cloudflare API...
    </div>
  );
}

// ─── Feature Card ──────────────────────────────────────────────────
function FeatureCard({ icon: Icon, title, description, color }) {
  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200">
      <div className={`w-12 h-12 rounded-xl ${color} flex items-center justify-center mb-4`}>
        <Icon className="w-6 h-6 text-white" />
      </div>
      <h3 className="font-semibold text-slate-900 mb-2">{title}</h3>
      <p className="text-slate-500 text-sm leading-relaxed">{description}</p>
    </div>
  );
}

// ─── Main Landing Page ─────────────────────────────────────────────
export default function LandingPage() {
  const features = [
    {
      icon: Mic,
      title: 'Voice Symptom Input',
      description: 'Speak naturally and let AI convert your voice into symptoms.',
      color: 'bg-red-500',
    },
    {
      icon: Brain,
      title: 'AI Medical Assistant',
      description: 'Ask questions about your symptoms and receive easy-to-understand information.',
      color: 'bg-violet-600',
    },
    {
      icon: Activity,
      title: 'Disease Prediction',
      description: 'Machine learning analyzes entered symptoms and identifies possible conditions.',
      color: 'bg-blue-600',
    },
    {
      icon: Bell,
      title: 'Emergency Warning',
      description: 'Detect potentially serious warning signs and recommend urgent professional care.',
      color: 'bg-orange-500',
    },
    {
      icon: FileText,
      title: 'Health Reports',
      description: 'Generate downloadable PDF assessment reports with full analysis.',
      color: 'bg-emerald-600',
    },
    {
      icon: Shield,
      title: 'Secure & Private',
      description: 'Your health data stays private with JWT authentication and encryption.',
      color: 'bg-cyan-600',
    },
  ];

  return (
    <div className="bg-slate-50">
      {/* ── Hero Section ─────────────────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-24 text-center">
        {/* Phase 1 Backend Status Indicator */}
        <div className="flex justify-center mb-8">
          <BackendStatus />
        </div>

        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-sm font-medium mb-6">
          <Activity className="w-4 h-4" />
          AI-Powered Health Analysis
        </div>

        {/* Headline */}
        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-slate-900 leading-tight mb-6">
          Understand Your Symptoms.<br />
          <span className="text-blue-600">Make Better Health Decisions.</span>
        </h1>

        {/* Subtitle */}
        <p className="max-w-2xl mx-auto text-lg sm:text-xl text-slate-500 mb-10 leading-relaxed">
          AI-powered symptom analysis, machine-learning based predictions, and intelligent
          health guidance in one place.
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            to="/register"
            className="flex items-center gap-2 px-8 py-3.5 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 transition-colors shadow-lg shadow-blue-200"
          >
            <Search className="w-5 h-5" />
            Check Symptoms
          </Link>
          <Link
            to="/register"
            className="flex items-center gap-2 px-8 py-3.5 bg-white text-slate-800 font-semibold rounded-xl border border-slate-200 hover:border-blue-300 hover:text-blue-600 transition-colors shadow-sm"
          >
            <Mic className="w-5 h-5" />
            Try Voice Input
          </Link>
        </div>
      </section>

      {/* ── Features Section ─────────────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-24">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-slate-900 mb-3">Everything You Need</h2>
          <p className="text-slate-500">Powerful features built for modern health understanding.</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((f) => (
            <FeatureCard key={f.title} {...f} />
          ))}
        </div>
      </section>
    </div>
  );
}
