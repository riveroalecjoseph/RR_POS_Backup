import React, { useState } from "react";
import { AppProvider, useApp } from "./context/AppContext";
import { SyncStatusBanner } from "./components/common/SyncStatusBanner";
import { PracticeModeBanner } from "./components/common/PracticeModeBanner";
import { SetPasswordModal } from "./components/common/SetPasswordModal";
import { AppLoadingScreen } from "./components/common/AppLoadingScreen";
import { Navbar } from "./components/layout/Navbar";
import { BottomNav } from "./components/layout/BottomNav";
import { POSScreen } from "./features/pos/POSScreen";
import { InventoryScreen } from "./features/inventory/InventoryScreen";
import { AdminScreen } from "./features/admin/AdminScreen";
import { AnalyticsModal } from "./features/analytics/AnalyticsModal";
import { LoginPage } from "./features/auth/LoginPage";

const AppContent: React.FC = () => {
  const {
    currentUser,
    isAuthenticated,
    isAuthLoading,
    activeTab,
    setActiveTab,
    isRecoveryMode,
  } = useApp();
  const [isAnalyticsOpen, setIsAnalyticsOpen] = useState<boolean>(false);
  const [isSetPasswordOpen, setIsSetPasswordOpen] = useState<boolean>(false);

  // If still checking authentication / restoring session, show sleek branded loading screen (never flash login)
  if (isAuthLoading && !currentUser && !isRecoveryMode) {
    return <AppLoadingScreen />;
  }

  // If not authenticated OR in password recovery / invite setup flow, route strictly to Login / Recovery screen
  if (!isAuthenticated || !currentUser || isRecoveryMode) {
    return <LoginPage />;
  }

  // Enforce role-based access control (RBAC)
  const isSuperAdmin = currentUser.role === "super_admin";
  const isBranchManager =
    currentUser.role === "branch_manager" ||
    currentUser.role === "inventory_manager";
  const isCashier = currentUser.role === "cashier";

  // Ensure active tab matches role permissions:
  // - Cashier: Strictly restricted to Point of Sale ("pos")
  // - Branch Manager: POS Screen ("pos") and Branch Inventory & Transfers ("inventory")
  // - Super Admin: Full system access across all tabs ("pos", "inventory", "admin")
  const effectiveTab = (() => {
    if (isCashier) {
      return "pos";
    }
    if (isBranchManager) {
      if (activeTab === "admin") {
        return "pos";
      }
      return activeTab;
    }
    if (isSuperAdmin) {
      return activeTab;
    }
    return "pos";
  })();

  return (
    <div className="h-screen min-h-screen bg-slate-950 text-slate-100 flex flex-col w-full overflow-hidden">
      {/* Persistent Practice / Training Mode Sandbox Banner */}
      <PracticeModeBanner />

      {/* Offline/Online & Sync Queue Banner */}
      <SyncStatusBanner />

      {/* Main Sticky Navbar (Full Viewport Width) */}
      <Navbar
        activeTab={effectiveTab}
        setActiveTab={setActiveTab}
        onOpenAnalytics={() => setIsAnalyticsOpen(true)}
        onOpenSetPassword={() => setIsSetPasswordOpen(true)}
      />

      {/* Main Screen Views (Fills entire available height and width) */}
      <main
        className={`flex-1 w-full flex flex-col min-h-0 pb-16 md:pb-0 ${effectiveTab === "pos" ? "overflow-hidden" : "overflow-y-auto"
          }`}
      >
        {effectiveTab === "pos" && <POSScreen />}
        {effectiveTab === "inventory" && <InventoryScreen />}
        {effectiveTab === "admin" && <AdminScreen />}
      </main>

      {/* Mobile Bottom Navigation */}
      <BottomNav
        activeTab={effectiveTab}
        setActiveTab={setActiveTab}
        onOpenAnalytics={() => setIsAnalyticsOpen(true)}
      />

      {/* Analysis Report & Smart Insights Modal */}
      {isAnalyticsOpen && (
        <AnalyticsModal onClose={() => setIsAnalyticsOpen(false)} />
      )}

      {/* Set / Change Password Modal (For voluntary in-app password updates via navbar Key icon) */}
      <SetPasswordModal
        isOpen={isSetPasswordOpen}
        onClose={() => setIsSetPasswordOpen(false)}
      />
    </div>
  );
};

export function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}

export default App;
