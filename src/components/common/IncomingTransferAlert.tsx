import React, { useEffect } from "react";
import { useApp } from "../../context/AppContext";
import { PackageCheck, ArrowRight, X, Truck } from "lucide-react";

export const IncomingTransferAlert: React.FC = () => {
  const { incomingTransferAlert, clearIncomingTransferAlert, setActiveTab } =
    useApp();

  // Auto-dismiss after 10 seconds
  useEffect(() => {
    if (incomingTransferAlert) {
      const timer = setTimeout(() => {
        clearIncomingTransferAlert();
      }, 10000);
      return () => clearTimeout(timer);
    }
  }, [incomingTransferAlert, clearIncomingTransferAlert]);

  if (!incomingTransferAlert) return null;

  const handleInspect = () => {
    setActiveTab("transfers");
    clearIncomingTransferAlert();
  };

  return (
    <div className="fixed top-14 sm:top-16 right-3 sm:right-6 z-50 max-w-md w-[calc(100%-1.5rem)] sm:w-auto animate-in fade-in slide-in-from-top-4 duration-300">
      <div className="bg-slate-900/95 backdrop-blur-md border border-amber-500/40 rounded-2xl p-4 shadow-2xl shadow-black/60 flex items-start gap-3.5 text-slate-100 ring-1 ring-amber-500/20">
        <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0 mt-0.5">
          <Truck className="w-5 h-5 animate-pulse" />
        </div>

        <div className="flex-1 min-w-0 pr-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
              New Delivery Dispatched
            </span>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
          </div>

          <h4 className="text-xs sm:text-sm font-bold text-white truncate">
            Transfer #{incomingTransferAlert.transferNumber}
          </h4>

          <p className="text-[11px] text-slate-300 mt-0.5 line-clamp-2">
            Dispatched from{" "}
            <span className="font-semibold text-emerald-400">
              {incomingTransferAlert.sourceBranchName}
            </span>{" "}
            and currently in transit to your branch.
          </p>

          <div className="flex items-center gap-2 mt-3">
            <button
              type="button"
              onClick={handleInspect}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition shadow-md shadow-emerald-950/40 active:scale-95 cursor-pointer"
            >
              <PackageCheck className="w-3.5 h-3.5" />
              <span>Inspect &amp; Confirm</span>
              <ArrowRight className="w-3 h-3 ml-0.5" />
            </button>

            <button
              type="button"
              onClick={clearIncomingTransferAlert}
              className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        </div>

        <button
          type="button"
          onClick={clearIncomingTransferAlert}
          className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition shrink-0"
          aria-label="Close notification"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
