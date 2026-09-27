import React from "react";
import { useApp } from "../../context/AppContext";
import { AppTab } from "../../types";
import { Store, Boxes, ArrowLeftRight, Users, ShieldCheck } from "lucide-react";

interface BottomNavProps {
  activeTab: AppTab;
  setActiveTab: (tab: AppTab) => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  activeTab,
  setActiveTab,
}) => {
  const { currentUser, pendingReceiptsCount } = useApp();
  const isSuperAdmin = currentUser?.role === "super_admin";
  const isBranchManager =
    currentUser?.role === "branch_manager" ||
    currentUser?.role === "inventory_manager";
  const isCashier = currentUser?.role === "cashier";

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-slate-900/95 backdrop-blur border-t border-slate-800 px-2 pt-2 pb-safe">
      <div className="flex items-center justify-around">
        {/* POS */}
        {(isCashier || isBranchManager || isSuperAdmin) && (
          <button
            id="mobile-nav-pos-btn"
            onClick={() => setActiveTab("pos")}
            className={`flex flex-col items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-medium transition cursor-pointer ${
              activeTab === "pos"
                ? "text-emerald-400 font-bold"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Store className="w-4 h-4" />
            <span>POS</span>
          </button>
        )}

        {/* Branch Inventory */}
        {(isBranchManager || isSuperAdmin) && (
          <button
            id="mobile-nav-inventory-btn"
            onClick={() => setActiveTab("inventory")}
            className={`flex flex-col items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-medium transition cursor-pointer ${
              activeTab === "inventory"
                ? "text-emerald-400 font-bold"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Boxes className="w-4 h-4" />
            <span>Inventory</span>
          </button>
        )}

        {/* Transfers */}
        {(isBranchManager || isSuperAdmin) && (
          <button
            id="mobile-nav-transfers-btn"
            onClick={() => setActiveTab("transfers")}
            className={`relative flex flex-col items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-medium transition cursor-pointer ${
              activeTab === "transfers"
                ? "text-emerald-400 font-bold"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <div className="relative">
              <ArrowLeftRight className="w-4 h-4" />
              {pendingReceiptsCount > 0 && (
                <span className="absolute -top-1 -right-2 flex items-center justify-center w-3.5 h-3.5 text-[8px] font-bold text-white bg-amber-500 rounded-full animate-pulse">
                  {pendingReceiptsCount}
                </span>
              )}
            </div>
            <span>Transfers</span>
          </button>
        )}

        {/* Staff Management (Super Admin strictly) */}
        {isSuperAdmin && (
          <button
            id="mobile-nav-staff-btn"
            onClick={() => setActiveTab("staff")}
            className={`flex flex-col items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-medium transition cursor-pointer ${
              activeTab === "staff"
                ? "text-emerald-400 font-bold"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Staff</span>
          </button>
        )}

        {/* Owner Audit Center (Super Admin strictly) */}
        {isSuperAdmin && (
          <button
            id="mobile-nav-audit-btn"
            onClick={() => setActiveTab("audit")}
            className={`flex flex-col items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-medium transition cursor-pointer ${
              activeTab === "audit"
                ? "text-emerald-400 font-bold"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Audit</span>
          </button>
        )}
      </div>
    </div>
  );
};
