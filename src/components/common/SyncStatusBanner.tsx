import React from "react";
import { useApp } from "../../context/AppContext";
import {
  Wifi,
  WifiOff,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";

export const SyncStatusBanner: React.FC = () => {
  const {
    isOnline,
    toggleOnlineSimulation,
    pendingSyncCount,
    triggerSync,
    isSyncing,
  } = useApp();

  return (
    <div className="relative z-30 bg-slate-900 border-b border-slate-800 px-3 sm:px-6 py-1.5 sm:py-2 text-xs overflow-hidden">
      <div className="w-full max-w-[1560px] mx-auto flex items-center justify-between gap-2">
        {/* Network status indicator */}
      <div className="flex items-center gap-2 min-w-0">
        {/* Network status pill (responsive across mobile & desktop) */}
        <div
          className={`flex items-center gap-1.5 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full font-medium text-[11px] sm:text-xs ${
            isOnline
              ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
              : "bg-amber-500/10 text-amber-400 border border-amber-500/30"
          }`}
        >
          {isOnline ? (
            <>
              <Wifi className="w-3.5 h-3.5" />
              <span>Online Mode</span>
            </>
          ) : (
            <>
              <WifiOff className="w-3.5 h-3.5" />
              <span>Offline First Active</span>
            </>
          )}
        </div>

        {/* Simulate Offline toggle button (visible on desktop and mobile) */}
        <button
          id="simulate-offline-btn"
          onClick={toggleOnlineSimulation}
          className="text-slate-400 hover:text-slate-200 underline text-[11px] ml-1 transition cursor-pointer whitespace-nowrap"
          title="Simulate network disconnect without browser devtools"
        >
          {isOnline ? "Simulate Offline" : "Go Back Online"}
        </button>
      </div>

      {/* Sync queue indicator */}
      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        {pendingSyncCount > 0 ? (
          <div className="flex items-center gap-1.5 sm:gap-2">
            <span className="flex items-center gap-1 text-amber-400 font-semibold bg-amber-400/10 px-2 py-0.5 rounded border border-amber-400/20 text-[11px] sm:text-xs">
              <AlertTriangle className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
              <span>
                {pendingSyncCount} pending order{pendingSyncCount > 1 ? "s" : ""}
                <span className="hidden sm:inline"> in IndexedDB</span>
              </span>
            </span>
            <button
              onClick={() => triggerSync()}
              disabled={!isOnline || isSyncing}
              className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1 rounded font-medium text-[11px] sm:text-xs transition ${
                isOnline
                  ? "bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer shadow-sm active:scale-95"
                  : "bg-slate-800 text-slate-500 cursor-not-allowed"
              }`}
            >
              <RefreshCw
                className={`w-3 h-3 sm:w-3.5 sm:h-3.5 ${isSyncing ? "animate-spin" : ""}`}
              />
              <span className="hidden sm:inline">
                {isSyncing ? "Syncing..." : "Sync Now"}
              </span>
              <span className="sm:hidden">
                {isSyncing ? "..." : "Sync"}
              </span>
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 text-slate-400 text-[11px] sm:text-xs">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
            <span className="text-slate-400">Local DB fully synced</span>
          </div>
        )}
      </div>
    </div>
  </div>
);
};
