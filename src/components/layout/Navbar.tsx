import React, { useState } from "react";
import { useApp } from "../../context/AppContext";
import { AppTab } from "../../types";
import { AddBranchModal } from "../../features/branches/AddBranchModal";
import {
  Store,
  Boxes,
  ArrowLeftRight,
  Users,
  ShieldCheck,
  LogOut,
  Building2,
  Plus,
  KeyRound,
  Wifi,
  WifiOff,
  RefreshCw,
} from "lucide-react";

interface NavbarProps {
  activeTab: AppTab;
  setActiveTab: (tab: AppTab) => void;
  onOpenSetPassword?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  onOpenSetPassword,
}) => {
  const {
    currentUser,
    branches,
    currentBranch,
    setCurrentBranch,
    pendingReceiptsCount,
    logout,
    isOnline,
    pendingSyncCount,
    isSyncing,
    triggerSync,
  } = useApp();

  const [isAddBranchOpen, setIsAddBranchOpen] = useState<boolean>(false);

  const isSuperAdmin = currentUser?.role === "super_admin";
  const isBranchManager =
    currentUser?.role === "branch_manager" ||
    currentUser?.role === "inventory_manager";
  const isCashier = currentUser?.role === "cashier";

  // Initials for avatar
  const initials = currentUser?.fullName
    ? currentUser.fullName
        .split(" ")
        .map((n) => n[0])
        .slice(0, 2)
        .join("")
        .toUpperCase()
    : "U";

  return (
    <>
      <header className="bg-slate-900/95 backdrop-blur border-b border-slate-800 sticky top-0 z-40 w-full shrink-0">
        <div className="w-full max-w-[1560px] mx-auto px-3 sm:px-6">
          <div className="flex items-center justify-between gap-2 sm:gap-4 h-15 sm:h-16 overflow-x-auto scrollbar-thin scrollbar-thumb-slate-800 scrollbar-track-transparent py-1">
            {/* Left: Brand Logo & Title */}
            <div className="flex items-center gap-2.5 shrink-0">
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center shadow-md shadow-emerald-950/40 shrink-0">
                <Store className="w-5 h-5 text-white" />
              </div>
              <div className="shrink-0 flex flex-col justify-center">
                <div className="flex items-center gap-2">
                  <span className="font-extrabold text-sm sm:text-base tracking-tight text-white whitespace-nowrap">
                    RR Multi-Branch
                  </span>
                  <span className="hidden 2xl:inline-block px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-400 rounded-md border border-emerald-500/30 whitespace-nowrap">
                    Workstation
                  </span>
                </div>
                <p className="hidden 2xl:block text-[10px] text-slate-400 whitespace-nowrap">
                  Hybrid Offline-First POS
                </p>
              </div>
            </div>

            {/* Center: Module Navigation Tabs */}
            <nav className="hidden md:flex items-center gap-1 bg-slate-950/80 p-1 rounded-xl border border-slate-800 shrink-0">
              {/* 1. POS View (Cashier, Branch Manager, Super Admin) */}
              {(isCashier || isBranchManager || isSuperAdmin) && (
                <button
                  id="nav-pos-btn"
                  type="button"
                  onClick={() => setActiveTab("pos")}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
                    activeTab === "pos"
                      ? "bg-emerald-600 text-white shadow-sm"
                      : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
                  }`}
                >
                  <Store className="w-4 h-4 shrink-0" />
                  <span>POS</span>
                </button>
              )}

              {/* 2. Branch Inventory View (Branch Manager, Super Admin) */}
              {(isBranchManager || isSuperAdmin) && (
                <button
                  id="nav-inventory-btn"
                  type="button"
                  onClick={() => setActiveTab("inventory")}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
                    activeTab === "inventory"
                      ? "bg-emerald-600 text-white shadow-sm"
                      : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
                  }`}
                >
                  <Boxes className="w-4 h-4 shrink-0" />
                  <span>Inventory</span>
                </button>
              )}

              {/* 3. Transfers View (Branch Manager, Super Admin) */}
              {(isBranchManager || isSuperAdmin) && (
                <button
                  id="nav-transfers-btn"
                  type="button"
                  onClick={() => setActiveTab("transfers")}
                  className={`relative flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
                    activeTab === "transfers"
                      ? "bg-emerald-600 text-white shadow-sm"
                      : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
                  }`}
                >
                  <ArrowLeftRight className="w-4 h-4 shrink-0" />
                  <span>Transfers</span>
                  {pendingReceiptsCount > 0 && (
                    <span className="flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-bold text-white bg-amber-500 rounded-full animate-pulse">
                      {pendingReceiptsCount}
                    </span>
                  )}
                </button>
              )}

              {/* 4. Staff Management View (Super Admin strictly) */}
              {isSuperAdmin && (
                <button
                  id="nav-staff-btn"
                  type="button"
                  onClick={() => setActiveTab("staff")}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
                    activeTab === "staff"
                      ? "bg-emerald-600 text-white shadow-sm"
                      : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
                  }`}
                >
                  <Users className="w-4 h-4 shrink-0" />
                  <span>Staff</span>
                </button>
              )}

              {/* 5. Owner Audit Center View (Super Admin strictly) */}
              {isSuperAdmin && (
                <button
                  id="nav-audit-btn"
                  type="button"
                  onClick={() => setActiveTab("audit")}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
                    activeTab === "audit"
                      ? "bg-emerald-600 text-white shadow-sm"
                      : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
                  }`}
                >
                  <ShieldCheck className="w-4 h-4 shrink-0" />
                  <span>Audit Center</span>
                </button>
              )}
            </nav>

            {/* Right: Branch Switcher, Network Status, Profile & Sign Out */}
            <div className="flex items-center gap-2 shrink-0 ml-auto flex-nowrap">
              {/* Network / Sync Status Indicator */}
              <div
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold border ${
                  !isOnline
                    ? "bg-amber-500/15 border-amber-500/40 text-amber-300"
                    : pendingSyncCount > 0
                      ? "bg-blue-500/15 border-blue-500/40 text-blue-300"
                      : "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                }`}
                title={
                  !isOnline
                    ? "Offline mode: Sales cached in local IndexedDB queue"
                    : pendingSyncCount > 0
                      ? `${pendingSyncCount} sales queued for cloud sync`
                      : "Online & Synced with Supabase"
                }
              >
                {!isOnline ? (
                  <WifiOff className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                ) : (
                  <Wifi className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                )}
                <span className="hidden xl:inline text-[11px]">
                  {!isOnline ? "Offline" : pendingSyncCount > 0 ? "Queued" : "Online"}
                </span>

                {pendingSyncCount > 0 && (
                  <button
                    type="button"
                    onClick={() => triggerSync()}
                    disabled={isSyncing || !isOnline}
                    className="flex items-center gap-1 ml-1 px-1.5 py-0.5 rounded bg-amber-500 text-slate-950 font-bold text-[10px] cursor-pointer"
                  >
                    <RefreshCw className={`w-2.5 h-2.5 ${isSyncing ? "animate-spin" : ""}`} />
                    <span>{pendingSyncCount}</span>
                  </button>
                )}
              </div>

              {/* Branch Selector & Add Branch Button */}
              <div className="flex items-center gap-1 bg-slate-800/80 border border-slate-700/80 p-1 rounded-xl text-xs shrink-0 max-w-[150px] sm:max-w-[200px] xl:max-w-[240px]">
                <Building2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 ml-1.5" />
                {isSuperAdmin ? (
                  <>
                    <select
                      id="branch-select"
                      value={currentBranch?.id || ""}
                      onChange={(e) => {
                        const selected = branches.find((b) => b.id === e.target.value);
                        if (selected) setCurrentBranch(selected);
                      }}
                      className="bg-transparent text-slate-200 font-medium focus:outline-none cursor-pointer pr-1 text-xs truncate w-full"
                    >
                      {branches.map((b) => (
                        <option key={b.id} value={b.id} className="bg-slate-900 text-slate-100">
                          {b.name}
                        </option>
                      ))}
                    </select>

                    <button
                      type="button"
                      onClick={() => setIsAddBranchOpen(true)}
                      className="p-1 hover:bg-slate-700 rounded-lg text-emerald-400 hover:text-emerald-300 transition cursor-pointer shrink-0"
                      title="+ Add New Branch (Super Admin)"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </>
                ) : (
                  <span className="text-slate-200 font-medium truncate px-1.5">
                    {currentBranch?.name || "Assigned Branch"}
                  </span>
                )}
              </div>

              {/* User Profile Badge */}
              {currentUser && (
                <div
                  id="authenticated-user-badge"
                  className="flex items-center gap-1.5 sm:gap-2 bg-slate-950 border border-slate-800 px-2 sm:px-2.5 py-1.5 rounded-xl shadow-inner select-none shrink-0"
                  title={`Logged in as ${currentUser.fullName} (${currentUser.email})`}
                >
                  <div className="w-5 h-5 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 text-white text-[10px] font-bold flex items-center justify-center shrink-0">
                    {initials}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="hidden xl:inline-block font-semibold text-slate-200 text-xs truncate max-w-[95px] xl:max-w-[120px]">
                      {currentUser.fullName}
                    </span>
                    <span
                      className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider shrink-0 ${
                        currentUser.role === "super_admin"
                          ? "bg-purple-500/15 text-purple-300 border border-purple-500/30"
                          : currentUser.role === "branch_manager" ||
                              currentUser.role === "inventory_manager"
                            ? "bg-teal-500/15 text-teal-300 border border-teal-500/30"
                            : "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30"
                      }`}
                    >
                      <ShieldCheck className="w-3 h-3 text-current shrink-0" />
                      {currentUser.role === "super_admin"
                        ? "Admin"
                        : currentUser.role === "branch_manager"
                          ? "Branch Mgr"
                          : currentUser.role === "inventory_manager"
                            ? "Inv Mgr"
                            : "Cashier"}
                    </span>
                  </div>

                  {onOpenSetPassword && (
                    <button
                      type="button"
                      onClick={onOpenSetPassword}
                      title="Set or Change Account Password (🔑)"
                      className="p-1 text-slate-400 hover:text-emerald-400 hover:bg-slate-800/80 rounded-lg transition cursor-pointer shrink-0 ml-0.5"
                    >
                      <KeyRound className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              )}

              {/* Sign Out Button */}
              {currentUser && (
                <button
                  id="signout-btn"
                  type="button"
                  onClick={logout}
                  className="p-2 rounded-xl text-slate-400 hover:text-red-400 hover:bg-slate-800/80 transition cursor-pointer shrink-0"
                  title="Sign Out"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Add Branch Modal */}
      {isAddBranchOpen && (
        <AddBranchModal
          isOpen={isAddBranchOpen}
          onClose={() => setIsAddBranchOpen(false)}
        />
      )}
    </>
  );
};
