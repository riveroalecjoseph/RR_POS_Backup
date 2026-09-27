import React from "react";
import { useApp } from "../../context/AppContext";
import { ArrowRight } from "lucide-react";

export const PracticeModeBanner: React.FC = () => {
  const { isPracticeMode, togglePracticeMode, currentBranch, currentUser } = useApp();

  if (!isPracticeMode) return null;

  const isSuperAdmin = currentUser?.role === "super_admin";

  return (
    <aside
      id="practice-mode-banner"
      role="status"
      aria-label="Practice Mode Active"
      className="bg-amber-500/15 border-b border-amber-500/30 text-amber-200 px-4 py-2 text-xs font-semibold flex flex-wrap items-center justify-between gap-2 shadow-inner z-50 sticky top-0"
    >
      <div className="flex items-center gap-2">
        <span className="text-base select-none" aria-hidden="true">
          ⚠️
        </span>
        <span className="font-bold tracking-wide">
          PRACTICE / TRAINING SANDBOX ACTIVE FOR{" "}
          <span className="underline decoration-amber-400 uppercase font-black">
            {currentBranch?.name || "THIS STORE"}
          </span>
          {currentBranch?.code ? ` (${currentBranch.code})` : ""} — Sales &amp; inventory changes for this store are simulated locally and will not affect live database records.
        </span>
      </div>

      {isSuperAdmin && (
        <button
          type="button"
          onClick={togglePracticeMode}
          className="text-amber-400 hover:text-white underline text-[11px] font-bold flex items-center gap-1 cursor-pointer transition active:scale-95 ml-auto"
        >
          <span>Exit Sandbox ({currentBranch?.name || "Store"})</span>
          <ArrowRight className="w-3 h-3" />
        </button>
      )}
    </aside>
  );
};
