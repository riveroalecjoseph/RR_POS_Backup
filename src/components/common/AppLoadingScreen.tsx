import React from "react";
import { Store, Loader2, ShieldCheck } from "lucide-react";

export const AppLoadingScreen: React.FC = () => {
  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center px-4 relative overflow-hidden select-none">
      {/* Ambient background glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none animate-pulse duration-1000" />

      <div className="relative z-10 flex flex-col items-center text-center max-w-sm animate-in fade-in duration-300">
        {/* Brand Icon */}
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-400 shadow-2xl shadow-emerald-950/80 mb-4 ring-1 ring-emerald-500/30">
          <Store className="w-9 h-9 text-white animate-pulse" />
        </div>

        {/* Title */}
        <h1 className="text-2xl font-black tracking-tight text-white mb-1">
          RR Multi-Branch POS
        </h1>
        <p className="text-xs text-slate-400 mb-6 font-medium">
          Enterprise Multi-Branch Point of Sale &amp; Inventory System
        </p>

        {/* Loading Indicator */}
        <div className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full bg-slate-900/80 border border-slate-800 text-xs text-slate-300 shadow-lg">
          <Loader2 className="w-3.5 h-3.5 text-emerald-400 animate-spin" />
          <span className="tracking-wide">Restoring secure session...</span>
        </div>

        {/* Sub-badge */}
        <div className="mt-8 flex items-center gap-1.5 text-[11px] text-slate-600 font-medium">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-500/70" />
          <span>PostgreSQL RLS Protected</span>
        </div>
      </div>
    </div>
  );
};
