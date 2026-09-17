/**
 * EmergencyBanner.jsx — Prominent Emergency Warning UI component.
 * Highlighted when critical red-flag emergency symptoms are detected.
 */

import { AlertTriangle, PhoneCall } from 'lucide-react';

export default function EmergencyBanner({ warnings = [] }) {
  if (!warnings || warnings.length === 0) return null;

  return (
    <div className="bg-red-600 text-white rounded-2xl p-6 shadow-xl border border-red-700 mb-8 animate-bounce-subtle">
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
          <AlertTriangle className="w-7 h-7 text-white" />
        </div>
        <div className="flex-1">
          <h3 className="text-xl font-bold mb-2 flex items-center gap-2">
            🚨 Urgent Medical Attention Recommended
          </h3>
          <p className="text-red-100 text-sm leading-relaxed mb-4">
            Our safety system detected critical warning signs that require immediate professional medical evaluation.
          </p>
          <div className="bg-red-800/60 rounded-xl p-3 mb-4 space-y-1 text-xs">
            {warnings.map((w, idx) => (
              <p key={idx} className="font-semibold text-white">⚠️ {w}</p>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <a
              href="tel:102"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-white text-red-700 font-bold text-sm rounded-xl hover:bg-red-50 transition-colors shadow-sm"
            >
              <PhoneCall className="w-4 h-4" /> Call Emergency (102 / 911)
            </a>
            <span className="text-xs text-red-200">Please visit the nearest emergency hospital immediately.</span>
          </div>
        </div>
      </div>
    </div>
  );
}
