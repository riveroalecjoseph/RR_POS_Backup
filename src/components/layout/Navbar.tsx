import React from "react";
import { useApp } from "../../context/AppContext";
import {
  Store,
  ArrowLeftRight,
  Users,
  BarChart3,
  LogOut,
  Building2,
  ShieldCheck,
  KeyRound,
} from "lucide-react";

interface NavbarProps {
  activeTab: "pos" | "inventory" | "admin";
  setActiveTab: (tab: "pos" | "inventory" | "admin") => void;
  onOpenAnalytics: () => void;
  onOpenSetPassword?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  onOpenAnalytics,
  onOpenSetPassword,
}) => {
  const {
    currentUser,
    branches,
    currentBranch,
    setCurrentBranch,
    pendingReceiptsCount,
    logout,
    isPracticeMode,
    togglePracticeMode,
  } = useApp();

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
                  POS &amp; Inventory
                </span>
              </div>
              <p className="hidden 2xl:block text-[10px] text-slate-400 whitespace-nowrap">
                PWA Offline-First System
              </p>
            </div>
          </div>

          {/* Center: Module Navigation Tabs for Desktop */}
          <nav className="hidden md:flex items-center gap-1 bg-slate-950/80 p-1 rounded-xl border border-slate-800 shrink-0">
            {/* POS tab accessible to Cashier, Branch Manager, and Super Admin */}
            {(isCashier || isBranchManager || isSuperAdmin) && (
              <button
                id="nav-pos-btn"
                type="button"
                onClick={() => setActiveTab("pos")}
                className={`flex items-center gap-1.5 px-2.5 xl:px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
                  activeTab === "pos"
                    ? "bg-emerald-600 text-white shadow-sm"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
                }`}
              >
                <Store className="w-4 h-4 shrink-0" />
                <span className="hidden xl:inline">Point of Sale</span>
                <span className="xl:hidden">POS</span>
              </button>
            )}

            {/* Branch Manager & Super Admin can access Inventory & Transfers */}
            {(isBranchManager || isSuperAdmin) && (
              <button
                id="nav-inventory-btn"
                type="button"
                onClick={() => setActiveTab("inventory")}
                className={`relative flex items-center gap-1.5 px-2.5 xl:px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
                  activeTab === "inventory"
                    ? "bg-emerald-600 text-white shadow-sm"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
                }`}
              >
                <ArrowLeftRight className="w-4 h-4 shrink-0" />
                <span className="hidden xl:inline">Inventory &amp; Transfers</span>
                <span className="xl:hidden">Inventory</span>
                {pendingReceiptsCount > 0 && (
                  <span className="flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-bold text-white bg-amber-500 rounded-full animate-pulse">
                    {pendingReceiptsCount}
                  </span>
                )}
              </button>
            )}

            {/* Super Admin ONLY can access Admin Staff Management & Owner Audit Center */}
            {isSuperAdmin && (
              <button
                id="nav-admin-btn"
                type="button"
                onClick={() => setActiveTab("admin")}
                className={`flex items-center gap-1.5 px-2.5 xl:px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
                  activeTab === "admin"
                    ? "bg-emerald-600 text-white shadow-sm"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
                }`}
              >
                <Users className="w-4 h-4 shrink-0" />
                <span className="hidden xl:inline">Audit &amp; Staff</span>
                <span className="xl:hidden">Staff</span>
              </button>
            )}
          </nav>

          {/* Right: Actions, Branch Switcher & Profile */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 ml-auto flex-nowrap">
            {/* Practice Mode Sandbox Toggle (Super Admin Only) */}
            {isSuperAdmin && (
              <button
                id="navbar-practice-mode-btn"
                type="button"
                onClick={togglePracticeMode}
                title={
                  isPracticeMode
                    ? `${currentBranch?.name || "Current Store"} is in Practice Sandbox. Click to switch to Live Production.`
                    : `${currentBranch?.name || "Current Store"} is in Live Production. Click to enable Practice Sandbox for this store.`
                }
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer select-none shrink-0 ${
                  isPracticeMode
                    ? "bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm shadow-amber-950/40 animate-pulse"
                    : "bg-slate-800/90 hover:bg-slate-800 text-slate-300 border border-slate-700/80"
                }`}
              >
                <span
                  className={`w-2 h-2 rounded-full ${
                    isPracticeMode ? "bg-amber-400" : "bg-slate-500"
                  }`}
                />
                <span className="whitespace-nowrap">
                  {isPracticeMode ? "Sandbox" : "Practice"}
                </span>
              </button>
            )}

            {/* Smart Insights Button */}
            <button
              id="analysis-report-btn"
              type="button"
              onClick={onOpenAnalytics}
              title="Smart Analytics & AI Inventory Forecasting"
              className="flex items-center gap-1.5 px-2 xl:px-3 py-1.5 rounded-xl text-xs font-semibold bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-400 hover:to-emerald-500 text-white shadow-md shadow-emerald-950/40 transition active:scale-95 cursor-pointer shrink-0 whitespace-nowrap"
            >
              <BarChart3 className="w-4 h-4 shrink-0" />
              <span className="hidden xl:inline">Insights</span>
            </button>

            {/* Branch Selector */}
            <div className="flex items-center gap-1.5 bg-slate-800/80 border border-slate-700/80 px-2 sm:px-2.5 py-1.5 rounded-xl text-xs shrink-0 max-w-[115px] sm:max-w-[150px] xl:max-w-[200px]">
              <Building2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              {isSuperAdmin ? (
                <select
                  id="branch-select"
                  value={currentBranch?.id || ""}
                  onChange={(e) => {
                    const selected = branches.find(
                      (b) => b.id === e.target.value,
                    );
                    if (selected) setCurrentBranch(selected);
                  }}
                  className="bg-transparent text-slate-200 font-medium focus:outline-none cursor-pointer pr-1 text-xs truncate w-full"
                >
                  {branches.map((b) => (
                    <option
                      key={b.id}
                      value={b.id}
                      className="bg-slate-900 text-slate-100"
                    >
                      {b.name}
                    </option>
                  ))}
                </select>
              ) : (
                <span className="text-slate-200 font-medium truncate">
                  {currentBranch?.name || "Branch"}
                </span>
              )}
            </div>

            {/* User Profile Badge with Direct Set Password Key (🔑) */}
            {currentUser && (
              <div
                id="authenticated-user-badge"
                className="flex items-center gap-1.5 sm:gap-2 bg-slate-950 border border-slate-800 px-2 sm:px-2.5 py-1.5 rounded-xl shadow-inner select-none shrink-0"
                title={`Logged in as ${currentUser.fullName} (${currentUser.email})`}
              >
                {/* User avatar circle */}
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

                {/* Direct Set/Change Password Key Button */}
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
  );
};
