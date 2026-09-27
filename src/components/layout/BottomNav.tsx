import React from "react";
import { useApp } from "../../context/AppContext";
import { Store, ArrowLeftRight, Users, BarChart3 } from "lucide-react";

interface BottomNavProps {
  activeTab: "pos" | "inventory" | "admin";
  setActiveTab: (tab: "pos" | "inventory" | "admin") => void;
  onOpenAnalytics: () => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  activeTab,
  setActiveTab,
  onOpenAnalytics,
}) => {
  const { currentUser, pendingReceiptsCount } = useApp();
  const isSuperAdmin = currentUser?.role === "super_admin";
  const isBranchManager =
    currentUser?.role === "branch_manager" ||
    currentUser?.role === "inventory_manager";
  const isCashier = currentUser?.role === "cashier";

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-slate-900/95 backdrop-blur border-t border-slate-800 px-3 pt-2 pb-safe">
      <div className="flex items-center justify-around">
        {(isCashier || isBranchManager || isSuperAdmin) && (
          <button
            id="mobile-nav-pos-btn"
            onClick={() => setActiveTab("pos")}
            className={`flex flex-col items-center gap-1 px-3 py-1 rounded-lg text-[11px] font-medium transition ${
              activeTab === "pos"
                ? "text-emerald-400 font-bold"
                : "text-slate-400"
            }`}
          >
            <Store className="w-5 h-5" />
            <span>POS</span>
          </button>
        )}

        {(isBranchManager || isSuperAdmin) && (
          <button
            id="mobile-nav-inventory-btn"
            onClick={() => setActiveTab("inventory")}
            className={`relative flex flex-col items-center gap-1 px-3 py-1 rounded-lg text-[11px] font-medium transition ${
              activeTab === "inventory"
                ? "text-emerald-400 font-bold"
                : "text-slate-400"
            }`}
          >
            <div className="relative">
              <ArrowLeftRight className="w-5 h-5" />
              {pendingReceiptsCount > 0 && (
                <span className="absolute -top-1 -right-2 flex items-center justify-center w-4 h-4 text-[9px] font-bold text-white bg-amber-500 rounded-full animate-pulse">
                  {pendingReceiptsCount}
                </span>
              )}
            </div>
            <span>Inventory</span>
          </button>
        )}

        <button
          id="mobile-analysis-report-btn"
          onClick={onOpenAnalytics}
          className="flex flex-col items-center gap-1 px-3 py-1 rounded-lg text-[11px] font-medium text-teal-400"
        >
          <BarChart3 className="w-5 h-5" />
          <span>Insights</span>
        </button>

        {isSuperAdmin && (
          <button
            id="mobile-nav-admin-btn"
            onClick={() => setActiveTab("admin")}
            className={`flex flex-col items-center gap-1 px-3 py-1 rounded-lg text-[11px] font-medium transition ${
              activeTab === "admin"
                ? "text-emerald-400 font-bold"
                : "text-slate-400"
            }`}
          >
            <Users className="w-5 h-5" />
            <span>Audit &amp; Staff</span>
          </button>
        )}
      </div>
    </div>
  );
};
