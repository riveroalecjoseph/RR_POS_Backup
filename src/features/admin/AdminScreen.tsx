import React, { useState, useMemo, useEffect } from "react";
import { useApp } from "../../context/AppContext";
import { UserRole, Branch, TransferRecord, TransferItemRecord, StockMovement, Transaction } from "../../types";
import { supabase, isLiveSupabaseConfigured } from "../../lib/supabase";
import {
  Users,
  UserPlus,
  Mail,
  Building2,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  X,
  Search,
  Filter,
  History,
  LogIn,
  LogOut,
  Receipt,
  Sliders,
  Send,
  PackageCheck,
  KeyRound,
  PlusCircle,
  Tag,
  RotateCw,
  Activity,
  Layers,
  Edit,
  ShoppingBag,
  Trash2,
  MapPin,
  Phone,
  FlaskConical,
  Loader2,
  Copy,
  Check,
  DollarSign,
  TrendingUp,
} from "lucide-react";

interface StaffUser {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  branchName: string;
  status: "active" | "invited";
  createdAt: string;
}

export const AdminScreen: React.FC = () => {
  const {
    branches,
    currentUser,
    auditLogs,
    logAuditEvent,
    refreshData,
    practiceBranchIds,
    isBranchInPracticeMode,
    toggleBranchPracticeMode,
    purgePracticeData,
    createBranch,
    updateBranch,
    deleteBranch,
    transfers,
    stockMovements,
    transactions,
  } = useApp();
  const [adminTab, setAdminTab] = useState<
    "audit" | "discrepancies" | "ledger" | "sales" | "staff" | "branches"
  >("audit");

  // Filters for Discrepancy Notes
  const [discrepancySearch, setDiscrepancySearch] = useState<string>("");
  const [discrepancyBranchFilter, setDiscrepancyBranchFilter] = useState<string>("all");

  // Filters for Stock Movement Ledger
  const [ledgerBranchFilter, setLedgerBranchFilter] = useState<string>("all");
  const [ledgerTypeFilter, setLedgerTypeFilter] = useState<string>("all");
  const [ledgerSearch, setLedgerSearch] = useState<string>("");

  // Filters for Sales History
  const [salesBranchFilter, setSalesBranchFilter] = useState<string>("all");
  const [salesPaymentFilter, setSalesPaymentFilter] = useState<string>("all");
  const [salesSearch, setSalesSearch] = useState<string>("");

  // Filters for Audit Trail
  const [selectedBranchFilter, setSelectedBranchFilter] = useState<string>("all");
  const [selectedUserFilter, setSelectedUserFilter] = useState<string>("all");
  const [selectedActionFilter, setSelectedActionFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  // Staff management state
  const [isInviteModalOpen, setIsInviteModalOpen] = useState<boolean>(false);
  const [inviteEmail, setInviteEmail] = useState<string>("");
  const [inviteFullName, setInviteFullName] = useState<string>("");
  const [inviteRole, setInviteRole] = useState<UserRole>("cashier");
  const [inviteBranchId, setInviteBranchId] = useState<string>(
    branches[0]?.id || "",
  );
  const [isSending, setIsSending] = useState<boolean>(false);
  const [notification, setNotification] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const [generatedLinkModal, setGeneratedLinkModal] = useState<{
    email: string;
    link: string;
  } | null>(null);
  const [isCopiedLink, setIsCopiedLink] = useState<boolean>(false);

  // Resend API direct configuration state
  const [resendApiKey, setResendApiKey] = useState<string>(() => {
    return (
      import.meta.env.VITE_RESEND_API_KEY ||
      localStorage.getItem("poinvts_resend_api_key") ||
      ""
    );
  });
  const [resendFromEmail, setResendFromEmail] = useState<string>(() => {
    return (
      import.meta.env.VITE_RESEND_FROM_EMAIL ||
      localStorage.getItem("poinvts_resend_from_email") ||
      "POINVTS Workstation <onboarding@resend.dev>"
    );
  });
  const [showResendSettings, setShowResendSettings] = useState<boolean>(false);

  const [editingStaff, setEditingStaff] = useState<StaffUser | null>(null);
  const [editingStaffRole, setEditingStaffRole] = useState<UserRole>("cashier");
  const [editingStaffBranchId, setEditingStaffBranchId] = useState<string>("");
  const [editingStaffIsActive, setEditingStaffIsActive] = useState<boolean>(true);
  const [isUpdatingStaff, setIsUpdatingStaff] = useState<boolean>(false);

  // Staff deletion state
  const [deletingStaff, setDeletingStaff] = useState<StaffUser | null>(null);
  const [isDeletingStaff, setIsDeletingStaff] = useState<boolean>(false);

  // Branch CRUD modals and state
  const [isCreateBranchModalOpen, setIsCreateBranchModalOpen] = useState<boolean>(false);
  const [branchName, setBranchName] = useState<string>("");
  const [branchCode, setBranchCode] = useState<string>("");
  const [branchAddress, setBranchAddress] = useState<string>("");
  const [branchContact, setBranchContact] = useState<string>("");
  const [isCreatingBranch, setIsCreatingBranch] = useState<boolean>(false);
  const [createIsPracticeMode, setCreateIsPracticeMode] = useState<boolean>(false);

  const [editingBranch, setEditingBranch] = useState<Branch | null>(null);
  const [editName, setEditName] = useState<string>("");
  const [editCode, setEditCode] = useState<string>("");
  const [editAddress, setEditAddress] = useState<string>("");
  const [editContact, setEditContact] = useState<string>("");
  const [editIsActive, setEditIsActive] = useState<boolean>(true);
  const [editIsPracticeMode, setEditIsPracticeMode] = useState<boolean>(false);
  const [isUpdatingBranch, setIsUpdatingBranch] = useState<boolean>(false);

  const [deletingBranch, setDeletingBranch] = useState<Branch | null>(null);
  const [isDeletingBranch, setIsDeletingBranch] = useState<boolean>(false);

  const [isPracticeManagerModalOpen, setIsPracticeManagerModalOpen] = useState<boolean>(false);

  // Inline Quick Add Branch in Invite Modal
  const [isInlineAddBranchOpen, setIsInlineAddBranchOpen] = useState<boolean>(false);
  const [inlineBranchName, setInlineBranchName] = useState<string>("");
  const [inlineBranchCode, setInlineBranchCode] = useState<string>("");
  const [inlineBranchAddress, setInlineBranchAddress] = useState<string>("");
  const [inlineBranchContact, setInlineBranchContact] = useState<string>("");
  const [isCreatingInlineBranch, setIsCreatingInlineBranch] = useState<boolean>(false);

  // Staff roster initialized strictly from dynamic data (no mock user fallbacks)
  const [staffList, setStaffList] = useState<StaffUser[]>([]);

  // Load real profiles from Supabase if configured
  useEffect(() => {
    async function loadProfiles() {
      if (!isLiveSupabaseConfigured) return;
      try {
        const { data, error } = await supabase.from("profiles").select("*");
        if (!error && data) {
          const mapped: StaffUser[] = data.map((p) => {
            const b = branches.find((br) => br.id === p.branch_id);
            const isAlec = p.email?.toLowerCase().trim() === "riveroalecjoseph@gmail.com";
            return {
              id: p.id,
              email: p.email,
              fullName: isAlec ? "Alec Joseph Rivero" : p.full_name || p.email.split("@")[0],
              role: isAlec ? "super_admin" : (p.role as UserRole) || "cashier",
              branchName:
                p.role === "super_admin" || isAlec
                  ? "Global Network Access"
                  : b?.name || "Assigned Branch",
              status: "active",
              createdAt: p.created_at || new Date().toISOString(),
            };
          });

          // Strictly deduplicate staff entries by normalized email & id
          const deduplicated = mapped.reduce<StaffUser[]>((acc, current) => {
            const normEmail = current.email.toLowerCase().trim();
            if (!acc.some((s) => s.email.toLowerCase().trim() === normEmail || s.id === current.id)) {
              acc.push(current);
            }
            return acc;
          }, []);

          setStaffList(deduplicated);
        }
      } catch (err) {
        if (!import.meta.env.PROD) {
          console.warn("Could not query profiles from Supabase:", err);
        }
      }
    }

    loadProfiles();
  }, [branches]);

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    await refreshData();
    setTimeout(() => setIsRefreshing(false), 400);
  };

  // Distinct users who have logged activity or belong to staff (deduplicated by name and email)
  const availableUsers = useMemo(() => {
    const seen = new Map<string, { id: string; name: string }>();

    staffList.forEach((s) => {
      const key = (s.fullName || s.email).toLowerCase().trim();
      if (!seen.has(key)) {
        seen.set(key, { id: s.id, name: s.fullName });
      }
    });

    auditLogs.forEach((l) => {
      const key = (l.userName || l.userEmail || l.userId).toLowerCase().trim();
      if (!seen.has(key)) {
        seen.set(key, { id: l.userId, name: l.userName });
      }
    });

    return Array.from(seen.values());
  }, [staffList, auditLogs]);

  // Branch CRUD Handlers
  const handleCreateBranch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!branchName.trim() || !branchCode.trim()) {
      setNotification({ type: "error", message: "Branch name and code are required." });
      return;
    }

    setIsCreatingBranch(true);
    const result = await createBranch({
      name: branchName.trim(),
      code: branchCode.trim(),
      address: branchAddress.trim() || undefined,
      contactNumber: branchContact.trim() || undefined,
    });
    setIsCreatingBranch(false);

    if (result.success && result.branch) {
      if (createIsPracticeMode) {
        await toggleBranchPracticeMode(result.branch.id);
      }
      setNotification({
        type: "success",
        message: result.isLocalOnly
          ? `Branch "${branchName.trim()}" created locally! Note: Database table permissions must be granted in Supabase to sync to cloud.`
          : `Branch "${branchName.trim()}" (${branchCode.trim().toUpperCase()}) created successfully!`,
      });
      setBranchName("");
      setBranchCode("");
      setBranchAddress("");
      setBranchContact("");
      setCreateIsPracticeMode(false);
      setIsCreateBranchModalOpen(false);
    } else {
      setNotification({
        type: "error",
        message: result.error || "Failed to create branch.",
      });
    }
  };

  const handleUpdateBranch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBranch) return;
    if (!editName.trim() || !editCode.trim()) {
      setNotification({ type: "error", message: "Branch name and code are required." });
      return;
    }

    setIsUpdatingBranch(true);
    const result = await updateBranch(editingBranch.id, {
      name: editName.trim(),
      code: editCode.trim(),
      address: editAddress.trim() || undefined,
      contactNumber: editContact.trim() || undefined,
      isActive: editIsActive,
      isPracticeMode: editIsPracticeMode,
    });
    setIsUpdatingBranch(false);

    if (result.success) {
      setNotification({
        type: "success",
        message: `Branch "${editName.trim()}" updated successfully!`,
      });
      setEditingBranch(null);
    } else {
      setNotification({
        type: "error",
        message: result.error || "Failed to update branch.",
      });
    }
  };

  const handleDeleteBranch = async () => {
    if (!deletingBranch) return;
    setIsDeletingBranch(true);
    const result = await deleteBranch(deletingBranch.id);
    setIsDeletingBranch(false);

    if (result.success) {
      setNotification({
        type: "success",
        message: `Branch "${deletingBranch.name}" was safely deleted.`,
      });
      setDeletingBranch(null);
    } else {
      setNotification({
        type: "error",
        message: result.error || "Failed to delete branch.",
      });
      setDeletingBranch(null);
    }
  };

  const handleCreateInlineBranch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inlineBranchName.trim() || !inlineBranchCode.trim()) {
      alert("Branch name and code are required.");
      return;
    }

    setIsCreatingInlineBranch(true);
    const result = await createBranch({
      name: inlineBranchName.trim(),
      code: inlineBranchCode.trim(),
      address: inlineBranchAddress.trim() || undefined,
      contactNumber: inlineBranchContact.trim() || undefined,
    });
    setIsCreatingInlineBranch(false);

    if (result.success && result.branch) {
      setInviteBranchId(result.branch.id);
      setIsInlineAddBranchOpen(false);
      setInlineBranchName("");
      setInlineBranchCode("");
      setInlineBranchAddress("");
      setInlineBranchContact("");
    } else {
      alert(result.error || "Failed to create branch.");
    }
  };

  // Filtered Audit Logs computation
  const filteredAuditLogs = useMemo(() => {
    return auditLogs.filter((entry) => {
      // Branch filter
      if (
        selectedBranchFilter !== "all" &&
        entry.branchId !== selectedBranchFilter
      ) {
        return false;
      }

      // User filter
      if (selectedUserFilter !== "all") {
        const selectedUser = availableUsers.find((u) => u.id === selectedUserFilter);
        const matchesId = entry.userId === selectedUserFilter;
        const matchesName =
          selectedUser &&
          entry.userName.toLowerCase().trim() === selectedUser.name.toLowerCase().trim();
        if (!matchesId && !matchesName) {
          return false;
        }
      }

      // Action category filter
      if (selectedActionFilter !== "all") {
        if (
          selectedActionFilter === "auth" &&
          !entry.actionType.startsWith("AUTH_")
        ) {
          return false;
        }
        if (
          selectedActionFilter === "sales" &&
          entry.actionType !== "POS_SALE"
        ) {
          return false;
        }
        if (
          selectedActionFilter === "inventory" &&
          !entry.actionType.startsWith("INVENTORY_")
        ) {
          return false;
        }
        if (
          selectedActionFilter === "transfers" &&
          !entry.actionType.startsWith("TRANSFER_")
        ) {
          return false;
        }
      }

      // Keyword search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesDesc = entry.description.toLowerCase().includes(q);
        const matchesTitle = entry.actionTitle.toLowerCase().includes(q);
        const matchesUser = entry.userName.toLowerCase().includes(q);
        const matchesEmail = entry.userEmail?.toLowerCase().includes(q);
        const matchesBranch = entry.branchName.toLowerCase().includes(q);
        const matchesMeta = entry.metadata
          ? JSON.stringify(entry.metadata).toLowerCase().includes(q)
          : false;

        if (
          !matchesDesc &&
          !matchesTitle &&
          !matchesUser &&
          !matchesEmail &&
          !matchesBranch &&
          !matchesMeta
        ) {
          return false;
        }
      }

      return true;
    });
  }, [
    auditLogs,
    selectedBranchFilter,
    selectedUserFilter,
    selectedActionFilter,
    searchQuery,
  ]);

  // Statistics summaries
  const authEventsCount = useMemo(
    () => auditLogs.filter((l) => l.actionType.startsWith("AUTH_")).length,
    [auditLogs],
  );
  const salesEventsCount = useMemo(
    () => auditLogs.filter((l) => l.actionType === "POS_SALE").length,
    [auditLogs],
  );
  const inventoryEventsCount = useMemo(
    () =>
      auditLogs.filter(
        (l) =>
          l.actionType.startsWith("INVENTORY_") ||
          l.actionType.startsWith("TRANSFER_"),
      ).length,
    [auditLogs],
  );

  const getActionBadge = (actionType: string) => {
    switch (actionType) {
      case "AUTH_LOGIN":
        return {
          label: "Login",
          icon: <LogIn className="w-3.5 h-3.5 text-emerald-400" />,
          color: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
        };
      case "AUTH_LOGOUT":
        return {
          label: "Logout",
          icon: <LogOut className="w-3.5 h-3.5 text-slate-400" />,
          color: "bg-slate-800 text-slate-300 border-slate-700",
        };
      case "AUTH_PASSWORD_CHANGE":
        return {
          label: "Password",
          icon: <KeyRound className="w-3.5 h-3.5 text-purple-400" />,
          color: "bg-purple-500/10 text-purple-400 border-purple-500/20",
        };
      case "POS_SALE":
        return {
          label: "POS Sale",
          icon: <Receipt className="w-3.5 h-3.5 text-amber-400" />,
          color: "bg-amber-500/10 text-amber-400 border-amber-500/20",
        };
      case "INVENTORY_ADJUSTMENT":
        return {
          label: "Stock Adj",
          icon: <Sliders className="w-3.5 h-3.5 text-blue-400" />,
          color: "bg-blue-500/10 text-blue-400 border-blue-500/20",
        };
      case "INVENTORY_PRODUCT_CREATED":
        return {
          label: "New Product",
          icon: <PlusCircle className="w-3.5 h-3.5 text-teal-400" />,
          color: "bg-teal-500/10 text-teal-400 border-teal-500/20",
        };
      case "INVENTORY_PRODUCT_UPDATED":
        return {
          label: "Product Edit",
          icon: <Edit className="w-3.5 h-3.5 text-cyan-400" />,
          color: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20",
        };
      case "INVENTORY_CATEGORY_CREATED":
        return {
          label: "Category",
          icon: <Tag className="w-3.5 h-3.5 text-indigo-400" />,
          color: "bg-indigo-500/10 text-indigo-400 border-indigo-500/20",
        };
      case "TRANSFER_DISPATCHED":
        return {
          label: "Transfer Out",
          icon: <Send className="w-3.5 h-3.5 text-orange-400" />,
          color: "bg-orange-500/10 text-orange-400 border-orange-500/20",
        };
      case "TRANSFER_RECEIVED":
        return {
          label: "Transfer In",
          icon: <PackageCheck className="w-3.5 h-3.5 text-emerald-400" />,
          color: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
        };
      case "BRANCH_SWITCH":
        return {
          label: "Branch View",
          icon: <Building2 className="w-3.5 h-3.5 text-sky-400" />,
          color: "bg-sky-500/10 text-sky-400 border-sky-500/20",
        };
      default:
        return {
          label: "System Event",
          icon: <Activity className="w-3.5 h-3.5 text-slate-400" />,
          color: "bg-slate-800 text-slate-400 border-slate-700",
        };
    }
  };

  const handleSendInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setNotification(null);

    if (!inviteEmail || !inviteFullName) {
      setNotification({
        type: "error",
        message: "Email and full name are required.",
      });
      return;
    }

    setIsSending(true);

    try {
      let data: any = null;
      let invokeError: any = null;

      if (isLiveSupabaseConfigured) {
        const res = await supabase.functions.invoke("invite-user", {
          body: {
            email: inviteEmail,
            full_name: inviteFullName,
            role: inviteRole,
            branch_id: inviteBranchId,
          },
        });
        data = res.data;
        invokeError = res.error;
      } else {
        // Fallback simulation in local/offline environment
        data = {
          success: true,
          message: `[DEVELOPMENT MODE] Invitation processed for ${inviteEmail}.`,
          action_link: `${window.location.origin}/reset-password`,
          user: {
            id: "user-" + Date.now(),
            email: inviteEmail,
          },
        };
      }

      if (invokeError || (data && (!data.success || data.error))) {
        let errorMsg = data?.error;
        if (!errorMsg && invokeError) {
          try {
            const errJson = await invokeError.context?.json?.();
            errorMsg = errJson?.error || invokeError.message;
          } catch {
            errorMsg = invokeError.message;
          }
        }
        setNotification({
          type: "error",
          message: errorMsg || "Failed to process invitation.",
        });
        return;
      }

      const selectedBranch = branches.find((b) => b.id === inviteBranchId);
      const newStaff: StaffUser = {
        id: data.user?.id || "usr-" + Date.now(),
        email: inviteEmail,
        fullName: inviteFullName,
        role: inviteRole,
        branchName:
          inviteRole === "super_admin"
            ? "Global Access"
            : selectedBranch?.name || "Assigned Branch",
        status: "invited",
        createdAt: new Date().toISOString(),
      };

      setStaffList((prev) => {
        const norm = inviteEmail.toLowerCase().trim();
        const filtered = prev.filter((s) => s.email.toLowerCase().trim() !== norm);
        return [newStaff, ...filtered];
      });

      // Attempt direct Resend API dispatch if key is present
      let directResendResult: { success: boolean; error?: string } | null = null;
      if (resendApiKey) {
        try {
          const resendRes = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${resendApiKey}`,
            },
            body: JSON.stringify({
              from: resendFromEmail || "POINVTS Workstation <onboarding@resend.dev>",
              to: [inviteEmail.toLowerCase().trim()],
              subject: "Invitation to Join POINVTS Workstation System",
              html: `
                <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px; background: #0f172a; color: #f8fafc; border-radius: 16px;">
                  <h2 style="color: #10b981; margin-top: 0;">Welcome to POINVTS System</h2>
                  <p>Hello <strong>${inviteFullName}</strong>,</p>
                  <p>You have been invited to join the workstation system with the access role: <strong style="color: #34d399;">${inviteRole}</strong>.</p>
                  <p>Please click the button below to set your secure account password and access the workstation:</p>
                  <div style="margin: 28px 0; text-align: center;">
                    <a href="${data.action_link || `${window.location.origin}/reset-password`}" style="background-color: #059669; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 10px; font-weight: bold; font-size: 14px; display: inline-block;">Set Account Password</a>
                  </div>
                </div>
              `,
            }),
          });
          const resendData = await resendRes.json();
          if (resendRes.ok) {
            directResendResult = { success: true };
          } else {
            directResendResult = {
              success: false,
              error: resendData.message || resendData.name || `HTTP ${resendRes.status}`,
            };
          }
        } catch (rErr: any) {
          directResendResult = {
            success: false,
            error: rErr.message || "Network error reaching Resend API",
          };
        }
      }

      if (directResendResult && !directResendResult.success) {
        setNotification({
          type: "error",
          message: `Resend Email Delivery Notice: ${directResendResult.error}`,
        });
      } else {
        setNotification({
          type: "success",
          message: data.message || `Invitation successfully processed for ${inviteEmail}.`,
        });
      }

      setGeneratedLinkModal({
        email: inviteEmail,
        link: data.action_link || `${window.location.origin}/reset-password`,
      });

      setIsInviteModalOpen(false);
      setInviteEmail("");
      setInviteFullName("");
    } catch (err: any) {
      if (isLiveSupabaseConfigured) {
        try {
          const { error: resetErr } = await supabase.auth.resetPasswordForEmail(
            inviteEmail.toLowerCase().trim(),
            {
              redirectTo: `${window.location.origin}/reset-password`,
            }
          );
          if (resetErr) {
            setNotification({
              type: "error",
              message: `Supabase Auth error: ${resetErr.message}`,
            });
          } else {
            setNotification({
              type: "success",
              message: `Direct password setup email request dispatched via Supabase Auth to ${inviteEmail}.`,
            });
            setGeneratedLinkModal({
              email: inviteEmail,
              link: `${window.location.origin}/reset-password`,
            });
            setIsInviteModalOpen(false);
            setInviteEmail("");
            setInviteFullName("");
          }
        } catch (sErr: any) {
          setNotification({
            type: "error",
            message: `Failed to trigger invitation: ${sErr.message || "Unknown error"}`,
          });
        }
      } else {
        setNotification({
          type: "success",
          message: `[OFFLINE DEMO] Invitation queued for ${inviteEmail}. User will be granted role "${inviteRole}" via app_metadata upon password setup.`,
        });
        setIsInviteModalOpen(false);
        setInviteEmail("");
        setInviteFullName("");
      }
    } finally {
      setIsSending(false);
    }
  };

  const handleOpenEditStaff = (staff: StaffUser) => {
    setEditingStaff(staff);
    setEditingStaffRole(staff.role);
    const matchedBranch = branches.find((b) => b.name === staff.branchName);
    setEditingStaffBranchId(matchedBranch?.id || branches[0]?.id || "");
    setEditingStaffIsActive(staff.status === "active");
  };

  const handleDeleteStaff = async () => {
    if (!deletingStaff) return;

    if (deletingStaff.email.toLowerCase().trim() === "riveroalecjoseph@gmail.com") {
      setNotification({
        type: "error",
        message: "The primary Super Admin account cannot be deleted.",
      });
      setDeletingStaff(null);
      return;
    }

    if (currentUser?.email?.toLowerCase().trim() === deletingStaff.email.toLowerCase().trim()) {
      setNotification({
        type: "error",
        message: "You cannot delete your own active account.",
      });
      setDeletingStaff(null);
      return;
    }

    setIsDeletingStaff(true);

    try {
      if (isLiveSupabaseConfigured) {
        if (!deletingStaff.id.startsWith("usr-") && !deletingStaff.id.startsWith("user-")) {
          await supabase.from("profiles").delete().eq("id", deletingStaff.id);
        } else {
          await supabase.from("profiles").delete().eq("email", deletingStaff.email.toLowerCase().trim());
        }

        const { data: delData, error: delErr } = await supabase.functions.invoke("delete-user", {
          body: {
            user_id: deletingStaff.id,
            email: deletingStaff.email,
          },
        });

        if (delErr || (delData && !delData.success && delData.error)) {
          let errorMsg = delData?.error;
          if (!errorMsg && delErr) {
            try {
              const errJson = await delErr.context?.json?.();
              errorMsg = errJson?.error || delErr.message;
            } catch {
              errorMsg = delErr.message;
            }
          }
          if (errorMsg) {
            console.warn("Delete user edge function notice:", errorMsg);
          }
        }
      }

      setStaffList((prev) =>
        prev.filter(
          (s) =>
            s.id !== deletingStaff.id &&
            s.email.toLowerCase().trim() !== deletingStaff.email.toLowerCase().trim()
        )
      );

      setNotification({
        type: "success",
        message: `Staff user "${deletingStaff.fullName}" (${deletingStaff.email}) was removed from the system.`,
      });
    } catch {
      setStaffList((prev) =>
        prev.filter(
          (s) =>
            s.id !== deletingStaff.id &&
            s.email.toLowerCase().trim() !== deletingStaff.email.toLowerCase().trim()
        )
      );
      setNotification({
        type: "success",
        message: `Staff user "${deletingStaff.fullName}" was removed.`,
      });
    } finally {
      setIsDeletingStaff(false);
      setDeletingStaff(null);
    }
  };

  const handleSaveEditStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStaff) return;

    setIsUpdatingStaff(true);
    try {
      const selectedBranch = branches.find((b) => b.id === editingStaffBranchId);
      const isAlec = editingStaff.email.toLowerCase().trim() === "riveroalecjoseph@gmail.com";
      const targetRole: UserRole = isAlec ? "super_admin" : editingStaffRole;
      const targetBranchId = targetRole === "super_admin" ? null : editingStaffBranchId;

      if (isLiveSupabaseConfigured) {
        const { error } = await supabase
          .from("profiles")
          .update({
            role: targetRole,
            branch_id: targetBranchId,
            is_active: editingStaffIsActive,
          })
          .eq("id", editingStaff.id);

        if (error) {
          throw new Error(error.message);
        }
      }

      await logAuditEvent({
        userId: currentUser?.id || "admin",
        userName: currentUser?.fullName || "Super Admin",
        userRole: currentUser?.role || "super_admin",
        userEmail: currentUser?.email,
        branchId: targetBranchId || "",
        branchName: targetRole === "super_admin" ? "Global Network Access" : selectedBranch?.name || "Global",
        actionType: "STAFF_ROLE_UPDATED",
        actionTitle: "Staff Permissions Updated",
        description: `${currentUser?.fullName || "Super Admin"} updated permissions for ${editingStaff.fullName} (${editingStaff.email}) to role "${targetRole.replace("_", " ")}".`,
      });

      setStaffList((prev) =>
        prev.map((s) =>
          s.id === editingStaff.id
            ? {
                ...s,
                role: targetRole,
                branchName:
                  targetRole === "super_admin"
                    ? "Global Network Access"
                    : selectedBranch?.name || "Assigned Branch",
                status: editingStaffIsActive ? "active" : "invited",
              }
            : s,
        ),
      );

      setNotification({
        type: "success",
        message: `Successfully updated permissions for ${editingStaff.fullName} to ${targetRole.replace("_", " ")}.`,
      });
      setEditingStaff(null);
    } catch (err: any) {
      setNotification({
        type: "error",
        message: err.message || "Failed to update staff permissions.",
      });
    } finally {
      setIsUpdatingStaff(false);
    }
  };

  // Discrepancy transfers (transfers with discrepancy notes or mismatch in sent vs received)
  const transfersWithDiscrepancies = useMemo(() => {
    return (transfers || []).filter((t: TransferRecord) => {
      const hasDiscrepancyNotes = Boolean(t.discrepancyNotes && t.discrepancyNotes.trim().length > 0);
      const hasItemDiscrepancy = t.items?.some(
        (item: TransferItemRecord) =>
          item.quantityReceived !== undefined &&
          item.quantityReceived !== null &&
          item.quantityReceived !== item.quantitySent
      );
      return hasDiscrepancyNotes || hasItemDiscrepancy;
    });
  }, [transfers]);

  // Filtered discrepancy transfers
  const filteredDiscrepancyTransfers = useMemo(() => {
    return transfersWithDiscrepancies.filter((t: TransferRecord) => {
      if (discrepancyBranchFilter !== "all") {
        if (t.sourceBranchId !== discrepancyBranchFilter && t.targetBranchId !== discrepancyBranchFilter) {
          return false;
        }
      }
      if (discrepancySearch.trim()) {
        const q = discrepancySearch.toLowerCase();
        const matchesNum = t.transferNumber?.toLowerCase().includes(q);
        const matchesNotes = t.discrepancyNotes?.toLowerCase().includes(q) || t.notes?.toLowerCase().includes(q);
        const matchesBranch = (t.sourceBranchName || "").toLowerCase().includes(q) || (t.targetBranchName || "").toLowerCase().includes(q);
        const matchesItem = t.items?.some((i: TransferItemRecord) => (i.productName || "").toLowerCase().includes(q) || (i.sku || "").toLowerCase().includes(q));
        if (!matchesNum && !matchesNotes && !matchesBranch && !matchesItem) {
          return false;
        }
      }
      return true;
    });
  }, [transfersWithDiscrepancies, discrepancyBranchFilter, discrepancySearch]);

  // Filtered stock movements
  const filteredStockMovements = useMemo(() => {
    return (stockMovements || []).filter((mov: StockMovement) => {
      if (ledgerBranchFilter !== "all" && mov.branchId !== ledgerBranchFilter) {
        return false;
      }
      const mType = mov.movementType || mov.type;
      if (ledgerTypeFilter !== "all" && mType !== ledgerTypeFilter) {
        return false;
      }
      if (ledgerSearch.trim()) {
        const q = ledgerSearch.toLowerCase();
        const matchesProduct = (mov.productName || "").toLowerCase().includes(q) || mov.productId?.toLowerCase().includes(q);
        const matchesBranch = (mov.branchName || "").toLowerCase().includes(q);
        const matchesNotes = (mov.notes || "").toLowerCase().includes(q);
        const matchesUser = (mov.createdByName || mov.createdBy || "").toLowerCase().includes(q);
        if (!matchesProduct && !matchesBranch && !matchesNotes && !matchesUser) {
          return false;
        }
      }
      return true;
    });
  }, [stockMovements, ledgerBranchFilter, ledgerTypeFilter, ledgerSearch]);

  // Filtered sales transactions
  const filteredSalesTransactions = useMemo(() => {
    return (transactions || []).filter((tx: Transaction) => {
      if (salesBranchFilter !== "all" && tx.branchId !== salesBranchFilter) {
        return false;
      }
      if (salesPaymentFilter !== "all" && tx.paymentMethod !== salesPaymentFilter) {
        return false;
      }
      if (salesSearch.trim()) {
        const q = salesSearch.toLowerCase();
        const matchesNum = tx.transactionNumber?.toLowerCase().includes(q);
        const matchesCashier = (tx.cashierName || tx.cashierId || "").toLowerCase().includes(q);
        const matchesItems = tx.items?.some((item) => (item.productName || "").toLowerCase().includes(q));
        if (!matchesNum && !matchesCashier && !matchesItems) {
          return false;
        }
      }
      return true;
    });
  }, [transactions, salesBranchFilter, salesPaymentFilter, salesSearch]);

  return (
    <div className="w-full max-w-[1560px] mx-auto px-3 sm:px-6 py-4 sm:py-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-emerald-400" />
            <span>Owner &amp; Super Admin Audit Center</span>
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Enterprise discrepancy notes, immutable stock ledger, sales verification &amp; multi-branch controls
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {currentUser?.role === "super_admin" && (
            <button
              id="admin-practice-mode-btn"
              type="button"
              onClick={() => setIsPracticeManagerModalOpen(true)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                practiceBranchIds.length > 0
                  ? "bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm shadow-amber-950/40"
                  : "bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700"
              }`}
              title="Configure Store Practice Sandboxes"
            >
              <FlaskConical className="w-3.5 h-3.5 text-amber-400" />
              <span
                className={`w-2 h-2 rounded-full ${
                  practiceBranchIds.length > 0
                    ? "bg-amber-400 animate-pulse"
                    : "bg-slate-500"
                }`}
              />
              <span>
                {practiceBranchIds.length > 0
                  ? `Practice Stores (${practiceBranchIds.length})`
                  : "Practice Sandboxes: None"}
              </span>
            </button>
          )}

          {adminTab === "audit" && (
            <button
              onClick={handleManualRefresh}
              disabled={isRefreshing}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition"
              title="Refresh Audit Logs"
            >
              <RotateCw
                className={`w-3.5 h-3.5 text-emerald-400 ${
                  isRefreshing ? "animate-spin" : ""
                }`}
              />
              <span>Refresh Log</span>
            </button>
          )}

          {adminTab === "staff" && (
            <button
              onClick={() => {
                setNotification(null);
                setIsInviteModalOpen(true);
              }}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-950/40 transition active:scale-95 cursor-pointer"
            >
              <UserPlus className="w-4 h-4" />
              <span>Invite Staff Member</span>
            </button>
          )}

          {adminTab === "branches" && (
            <button
              onClick={() => {
                setNotification(null);
                setIsCreateBranchModalOpen(true);
              }}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-950/40 transition active:scale-95 cursor-pointer"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Create Branch</span>
            </button>
          )}
        </div>
      </div>

      {notification && (
        <div
          className={`p-4 rounded-2xl mb-6 flex items-start gap-3 text-xs border ${
            notification.type === "success"
              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
              : "bg-red-500/10 border-red-500/30 text-red-400"
          }`}
        >
          {notification.type === "success" ? (
            <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-400 mt-0.5" />
          ) : (
            <AlertCircle className="w-5 h-5 shrink-0 text-red-400 mt-0.5" />
          )}
          <div className="leading-relaxed">{notification.message}</div>
        </div>
      )}

      {/* Primary Sub-Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-3 mb-6 overflow-x-auto scrollbar-none">
        <button
          id="tab-branch-audit"
          onClick={() => setAdminTab("audit")}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition whitespace-nowrap cursor-pointer ${
            adminTab === "audit"
              ? "bg-emerald-600/20 text-emerald-400 border border-emerald-500/40"
              : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
          }`}
        >
          <History className="w-4 h-4" />
          <span>Activity Stream ({auditLogs.length})</span>
        </button>

        <button
          id="tab-discrepancy-notes"
          onClick={() => setAdminTab("discrepancies")}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition whitespace-nowrap cursor-pointer ${
            adminTab === "discrepancies"
              ? "bg-emerald-600/20 text-emerald-400 border border-emerald-500/40"
              : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
          }`}
        >
          <AlertCircle className="w-4 h-4 text-amber-400" />
          <span>Discrepancy Notes ({transfersWithDiscrepancies.length})</span>
        </button>

        <button
          id="tab-stock-ledger"
          onClick={() => setAdminTab("ledger")}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition whitespace-nowrap cursor-pointer ${
            adminTab === "ledger"
              ? "bg-emerald-600/20 text-emerald-400 border border-emerald-500/40"
              : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
          }`}
        >
          <Sliders className="w-4 h-4 text-teal-400" />
          <span>Stock Movement Ledger ({stockMovements.length})</span>
        </button>

        <button
          id="tab-sales-history"
          onClick={() => setAdminTab("sales")}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition whitespace-nowrap cursor-pointer ${
            adminTab === "sales"
              ? "bg-emerald-600/20 text-emerald-400 border border-emerald-500/40"
              : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
          }`}
        >
          <Receipt className="w-4 h-4 text-emerald-400" />
          <span>Sales History ({transactions.length})</span>
        </button>

        <button
          id="tab-staff-rbac"
          onClick={() => setAdminTab("staff")}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition whitespace-nowrap cursor-pointer ${
            adminTab === "staff"
              ? "bg-emerald-600/20 text-emerald-400 border border-emerald-500/40"
              : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Staff &amp; RBAC ({staffList.length})</span>
        </button>

        <button
          id="tab-branch-mgmt"
          onClick={() => setAdminTab("branches")}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition whitespace-nowrap cursor-pointer ${
            adminTab === "branches"
              ? "bg-emerald-600/20 text-emerald-400 border border-emerald-500/40"
              : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>Branches &amp; Locations ({branches.length})</span>
        </button>
      </div>

      {/* TAB 1: Branch & User Activity Audit Log */}
      {adminTab === "audit" && (
        <div className="space-y-6">
          {/* Key Metrics Dashboard */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl shadow-lg">
              <div className="flex items-center justify-between text-slate-400 mb-2">
                <span className="text-xs font-medium">Total Events</span>
                <Activity className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="text-2xl font-black text-slate-100">
                {auditLogs.length}
              </div>
              <div className="text-[11px] text-slate-500 mt-1">
                Persistent audit trail
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl shadow-lg">
              <div className="flex items-center justify-between text-slate-400 mb-2">
                <span className="text-xs font-medium">Auth Sessions</span>
                <ShieldCheck className="w-4 h-4 text-purple-400" />
              </div>
              <div className="text-2xl font-black text-slate-100">
                {authEventsCount}
              </div>
              <div className="text-[11px] text-purple-400/80 mt-1">
                Sign-ins &amp; sign-outs
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl shadow-lg">
              <div className="flex items-center justify-between text-slate-400 mb-2">
                <span className="text-xs font-medium">POS Transactions</span>
                <Receipt className="w-4 h-4 text-amber-400" />
              </div>
              <div className="text-2xl font-black text-slate-100">
                {salesEventsCount}
              </div>
              <div className="text-[11px] text-amber-400/80 mt-1">
                Checkout operations
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl shadow-lg">
              <div className="flex items-center justify-between text-slate-400 mb-2">
                <span className="text-xs font-medium">Inventory &amp; Transfers</span>
                <Layers className="w-4 h-4 text-teal-400" />
              </div>
              <div className="text-2xl font-black text-slate-100">
                {inventoryEventsCount}
              </div>
              <div className="text-[11px] text-teal-400/80 mt-1">
                Adjustments &amp; dispatches
              </div>
            </div>
          </div>

          {/* Audit Filters Bar */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {/* Search Box */}
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search user, action, order #, branch..."
                  className="w-full pl-10 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* Branch Filter Dropdown */}
              <div className="relative flex items-center bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5">
                <Building2 className="w-4 h-4 text-emerald-400 mr-2 shrink-0" />
                <span className="text-xs text-slate-400 mr-2 shrink-0">
                  Branch:
                </span>
                <select
                  value={selectedBranchFilter}
                  onChange={(e) => setSelectedBranchFilter(e.target.value)}
                  className="w-full bg-transparent text-xs text-slate-200 font-medium focus:outline-none cursor-pointer truncate"
                >
                  <option value="all" className="bg-slate-900">
                    All Branches (Global Network)
                  </option>
                  {branches.map((b) => (
                    <option key={b.id} value={b.id} className="bg-slate-900">
                      {b.name} ({b.code})
                    </option>
                  ))}
                </select>
              </div>

              {/* Staff / User Filter Dropdown */}
              <div className="relative flex items-center bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5">
                <Users className="w-4 h-4 text-teal-400 mr-2 shrink-0" />
                <span className="text-xs text-slate-400 mr-2 shrink-0">
                  Staff:
                </span>
                <select
                  value={selectedUserFilter}
                  onChange={(e) => setSelectedUserFilter(e.target.value)}
                  className="w-full bg-transparent text-xs text-slate-200 font-medium focus:outline-none cursor-pointer truncate"
                >
                  <option value="all" className="bg-slate-900">
                    All Staff &amp; Cashiers
                  </option>
                  {availableUsers.map((u) => (
                    <option key={u.id} value={u.id} className="bg-slate-900">
                      {u.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Event Category Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none border-t border-slate-800/80 pt-3">
              <span className="text-[11px] font-semibold text-slate-400 flex items-center gap-1 mr-1 shrink-0">
                <Filter className="w-3.5 h-3.5 text-slate-500" />
                <span>Event Type:</span>
              </span>
              <button
                type="button"
                onClick={() => setSelectedActionFilter("all")}
                className={`px-3 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition ${
                  selectedActionFilter === "all"
                    ? "bg-emerald-600 text-white shadow-sm"
                    : "bg-slate-800/80 hover:bg-slate-800 text-slate-300 border border-slate-700/60"
                }`}
              >
                All Events ({auditLogs.length})
              </button>
              <button
                type="button"
                onClick={() => setSelectedActionFilter("auth")}
                className={`px-3 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition ${
                  selectedActionFilter === "auth"
                    ? "bg-purple-600 text-white shadow-sm"
                    : "bg-slate-800/80 hover:bg-slate-800 text-slate-300 border border-slate-700/60"
                }`}
              >
                Logins &amp; Sessions ({authEventsCount})
              </button>
              <button
                type="button"
                onClick={() => setSelectedActionFilter("sales")}
                className={`px-3 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition ${
                  selectedActionFilter === "sales"
                    ? "bg-amber-600 text-white shadow-sm"
                    : "bg-slate-800/80 hover:bg-slate-800 text-slate-300 border border-slate-700/60"
                }`}
              >
                POS Sales ({salesEventsCount})
              </button>
              <button
                type="button"
                onClick={() => setSelectedActionFilter("inventory")}
                className={`px-3 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition ${
                  selectedActionFilter === "inventory"
                    ? "bg-teal-600 text-white shadow-sm"
                    : "bg-slate-800/80 hover:bg-slate-800 text-slate-300 border border-slate-700/60"
                }`}
              >
                Stock Adjustments
              </button>
              <button
                type="button"
                onClick={() => setSelectedActionFilter("transfers")}
                className={`px-3 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition ${
                  selectedActionFilter === "transfers"
                    ? "bg-orange-600 text-white shadow-sm"
                    : "bg-slate-800/80 hover:bg-slate-800 text-slate-300 border border-slate-700/60"
                }`}
              >
                Transfers
              </button>
            </div>
          </div>

          {/* Audit Entries List */}
          {filteredAuditLogs.length === 0 ? (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-10 text-center text-slate-400">
              <History className="w-10 h-10 mx-auto mb-2 text-slate-600" />
              <p className="text-base font-semibold text-slate-300">
                No audit events matched your filter criteria
              </p>
              <p className="text-xs text-slate-500 mt-1">
                Try resetting search parameters or selecting all branches.
              </p>
              <button
                type="button"
                onClick={() => {
                  setSelectedBranchFilter("all");
                  setSelectedUserFilter("all");
                  setSelectedActionFilter("all");
                  setSearchQuery("");
                }}
                className="mt-4 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold transition"
              >
                Reset All Filters
              </button>
            </div>
          ) : (
            <>
              {/* Mobile View: Responsive Cards (md:hidden) */}
              <div className="md:hidden space-y-3">
                {filteredAuditLogs.map((entry) => {
                  const badge = getActionBadge(entry.actionType);
                  return (
                    <div
                      key={"m-audit-" + entry.id}
                      className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-lg flex flex-col gap-2.5"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg text-[10px] font-bold uppercase tracking-wider border ${badge.color}`}
                        >
                          {badge.icon}
                          <span>{badge.label}</span>
                        </span>
                        <span className="text-[11px] font-mono text-slate-400">
                          {new Date(entry.timestamp).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>

                      <div>
                        <div className="font-bold text-slate-100 text-sm">
                          {entry.actionTitle}
                        </div>
                        <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                          {entry.description}
                        </p>
                        {entry.actionType === "POS_SALE" && entry.metadata?.itemsSold && (
                          <div className="mt-2 flex items-start gap-1.5 text-[11px] bg-amber-500/10 border border-amber-500/30 px-2.5 py-1.5 rounded-lg text-amber-200 font-medium">
                            <ShoppingBag className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                            <div>
                              <span className="text-amber-400 font-bold uppercase tracking-wider text-[10px] mr-1.5">
                                Items Sold:
                              </span>
                              <span>{entry.metadata.itemsSold}</span>
                            </div>
                          </div>
                        )}
                        {entry.metadata && (
                          <div className="mt-2 flex flex-wrap gap-1">
                            {Object.entries(entry.metadata)
                              .filter(([k]) => k !== "itemsSold")
                              .map(([k, v]) => (
                                <span
                                  key={k}
                                  className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-slate-950/80 text-slate-400 border border-slate-800"
                                >
                                  {k}: {k === "grandTotal" ? `₱${Number(v).toFixed(2)}` : String(v)}
                                </span>
                              ))}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-slate-800/80 text-[11px] text-slate-400">
                        <div className="flex items-center gap-1.5 font-medium text-slate-200">
                          <Users className="w-3.5 h-3.5 text-slate-500" />
                          <span className="truncate max-w-[120px]">
                            {entry.userName}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 text-slate-400">
                          <Building2 className="w-3 h-3 text-slate-500" />
                          <span className="truncate max-w-[120px]">
                            {entry.branchName}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Desktop Table View (hidden md:block) */}
              <div className="hidden md:block bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
                <div className="p-4 border-b border-slate-800 flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Activity Stream ({filteredAuditLogs.length} events)
                  </span>
                  <span className="text-xs text-slate-500">
                    Tamper-evident system activity log
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table
                    id="audit-trail-table"
                    className="w-full text-left text-xs"
                  >
                    <thead className="bg-slate-950/80 border-b border-slate-800 text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
                      <tr>
                        <th className="py-3 px-4">Timestamp</th>
                        <th className="py-3 px-4">Event Category</th>
                        <th className="py-3 px-4">User / Staff</th>
                        <th className="py-3 px-4">Branch Location</th>
                        <th className="py-3 px-4">Activity Description</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {filteredAuditLogs.map((entry) => {
                        const badge = getActionBadge(entry.actionType);
                        return (
                          <tr
                            key={entry.id}
                            className="hover:bg-slate-850/60 transition"
                          >
                            <td className="py-3 px-4 whitespace-nowrap text-slate-400 font-mono text-[11px]">
                              <div>
                                {new Date(entry.timestamp).toLocaleDateString()}
                              </div>
                              <div className="text-slate-500 text-[10px]">
                                {new Date(entry.timestamp).toLocaleTimeString()}
                              </div>
                            </td>

                            <td className="py-3 px-4 whitespace-nowrap">
                              <span
                                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider border ${badge.color}`}
                              >
                                {badge.icon}
                                <span>{badge.label}</span>
                              </span>
                            </td>

                            <td className="py-3 px-4">
                              <div className="font-bold text-slate-100 text-xs">
                                {entry.userName}
                              </div>
                              <div className="text-[10px] text-slate-400">
                                {entry.userEmail || entry.userRole}
                              </div>
                            </td>

                            <td className="py-3 px-4 whitespace-nowrap text-slate-300 font-medium">
                              <div className="flex items-center gap-1.5">
                                <Building2 className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                                <span>{entry.branchName}</span>
                              </div>
                            </td>

                            <td className="py-3 px-4 text-slate-200">
                              <div className="font-semibold text-slate-100">
                                {entry.actionTitle}
                              </div>
                              <div className="text-slate-400 text-[11px] leading-relaxed mt-0.5">
                                {entry.description}
                              </div>
                              {entry.actionType === "POS_SALE" && entry.metadata?.itemsSold && (
                                <div className="mt-1.5 flex items-start gap-1.5 text-[11px] bg-amber-500/10 border border-amber-500/30 px-2.5 py-1.5 rounded-lg text-amber-200 font-medium">
                                  <ShoppingBag className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                                  <div>
                                    <span className="text-amber-400 font-bold uppercase tracking-wider text-[10px] mr-1.5">
                                      Items Sold:
                                    </span>
                                    <span>{entry.metadata.itemsSold}</span>
                                  </div>
                                </div>
                              )}
                              {entry.metadata && (
                                <div className="mt-1.5 flex flex-wrap gap-1">
                                  {Object.entries(entry.metadata)
                                    .filter(([k]) => k !== "itemsSold")
                                    .map(([k, v]) => (
                                      <span
                                        key={k}
                                        className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-slate-950/80 text-slate-400 border border-slate-800"
                                      >
                                        {k}: {k === "grandTotal" ? `₱${Number(v).toFixed(2)}` : String(v)}
                                      </span>
                                    ))}
                                </div>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* TAB: Discrepancy Notes */}
      {adminTab === "discrepancies" && (
        <div className="space-y-6">
          {/* Filters Bar */}
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3 shadow-lg">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={discrepancySearch}
                onChange={(e) => setDiscrepancySearch(e.target.value)}
                placeholder="Search transfer # or discrepancy notes..."
                className="w-full pl-10 pr-3.5 py-2 bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl text-xs text-slate-200 focus:outline-none transition"
              />
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <select
                value={discrepancyBranchFilter}
                onChange={(e) => setDiscrepancyBranchFilter(e.target.value)}
                className="px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none cursor-pointer"
              >
                <option value="all">All Branches</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {filteredDiscrepancyTransfers.length === 0 ? (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-10 text-center flex flex-col items-center">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mb-3">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-white mb-1">
                Zero Discrepancies Recorded
              </h3>
              <p className="text-xs text-slate-400 max-w-md">
                All inter-branch transfers and handshakes are clean. Any discrepancies or notes documented during item receipt will appear here for audit review.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredDiscrepancyTransfers.map((t) => (
                <div
                  key={t.id}
                  className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-3"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
                    <div className="flex items-center gap-2.5">
                      <span className="font-mono text-sm font-bold text-white">
                        {t.transferNumber}
                      </span>
                      <span
                        className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider ${
                          t.status === "RECEIVED"
                            ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30"
                            : t.status === "IN_TRANSIT"
                              ? "bg-amber-500/15 text-amber-300 border border-amber-500/30 animate-pulse"
                              : "bg-slate-800 text-slate-400 border border-slate-700"
                        }`}
                      >
                        {t.status}
                      </span>
                      {t.isPracticeMode && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                          Sandbox
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-slate-400">
                      Dispatched:{" "}
                      <span className="text-slate-200">
                        {new Date(t.dispatchedAt).toLocaleString()}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div className="p-3 bg-slate-950/70 rounded-xl border border-slate-850">
                      <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                        Source Branch (Dispatch)
                      </span>
                      <span className="font-bold text-slate-100">
                        {t.sourceBranchName || "Origin"}
                      </span>
                      <span className="text-slate-400 block text-[11px] mt-0.5">
                        By {t.dispatchedByName || t.dispatchedBy || "Staff"}
                      </span>
                    </div>
                    <div className="p-3 bg-slate-950/70 rounded-xl border border-slate-850">
                      <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                        Destination Branch (Receive Handshake)
                      </span>
                      <span className="font-bold text-slate-100">
                        {t.targetBranchName || "Destination"}
                      </span>
                      <span className="text-slate-400 block text-[11px] mt-0.5">
                        {t.receivedByName ? `By ${t.receivedByName}` : "Pending receipt"}
                        {t.receivedAt && ` • ${new Date(t.receivedAt).toLocaleString()}`}
                      </span>
                    </div>
                  </div>

                  {/* Discrepancy Notes Highlight */}
                  {t.discrepancyNotes && (
                    <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs">
                      <div className="flex items-center gap-1.5 font-bold mb-1">
                        <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
                        <span>Receiver Handshake Discrepancy Note:</span>
                      </div>
                      <p className="leading-relaxed pl-5 text-[11px]">
                        {t.discrepancyNotes}
                      </p>
                    </div>
                  )}

                  {/* General Notes if any */}
                  {t.notes && (
                    <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 text-xs text-slate-300">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">
                        Dispatch Notes:
                      </span>
                      <p className="text-[11px]">{t.notes}</p>
                    </div>
                  )}

                  {/* Items Sent vs Received Breakdown */}
                  {t.items && t.items.length > 0 && (
                    <div className="border-t border-slate-800 pt-2.5">
                      <span className="text-[10px] font-semibold uppercase text-slate-400 tracking-wider block mb-2">
                        Transferred Items Audit ({t.items.length})
                      </span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                        {t.items.map((item, idx) => {
                          const hasDiff =
                            item.quantityReceived !== undefined &&
                            item.quantityReceived !== null &&
                            item.quantityReceived !== item.quantitySent;
                          return (
                            <div
                              key={idx}
                              className={`p-2.5 rounded-xl text-xs border ${
                                hasDiff
                                  ? "bg-red-500/10 border-red-500/30 text-red-200"
                                  : "bg-slate-950/60 border-slate-800/80 text-slate-300"
                              }`}
                            >
                              <div className="font-semibold truncate">
                                {item.productName || item.productId}
                              </div>
                              <div className="flex items-center justify-between text-[11px] text-slate-400 mt-1">
                                <span>Sent: <strong className="text-white">{item.quantitySent}</strong></span>
                                <span>
                                  Rcvd:{" "}
                                  <strong className={hasDiff ? "text-red-400 font-bold" : "text-emerald-400 font-bold"}>
                                    {item.quantityReceived ?? "Pending"}
                                  </strong>
                                </span>
                              </div>
                              {hasDiff && (
                                <div className="text-[10px] text-red-400 font-bold mt-1">
                                  Variance: {item.quantityReceived! - item.quantitySent} units
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB: Stock Movement Ledger */}
      {adminTab === "ledger" && (
        <div className="space-y-6">
          {/* Filter Bar */}
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex flex-col lg:flex-row items-center justify-between gap-3 shadow-lg">
            <div className="relative w-full lg:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={ledgerSearch}
                onChange={(e) => setLedgerSearch(e.target.value)}
                placeholder="Search product, notes, ref ID..."
                className="w-full pl-10 pr-3.5 py-2 bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl text-xs text-slate-200 focus:outline-none transition"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
              <select
                value={ledgerBranchFilter}
                onChange={(e) => setLedgerBranchFilter(e.target.value)}
                className="px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none cursor-pointer"
              >
                <option value="all">All Branches</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>

              <select
                value={ledgerTypeFilter}
                onChange={(e) => setLedgerTypeFilter(e.target.value)}
                className="px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none cursor-pointer"
              >
                <option value="all">All Movement Types</option>
                <option value="INITIAL_STOCK">Initial Catalog Stock</option>
                <option value="Restock">Restock</option>
                <option value="Sale">Sale Deduction</option>
                <option value="Waste/Spoilage">Waste / Spoilage</option>
                <option value="Inter-Branch Transfer">Inter-Branch Transfer</option>
                <option value="TRANSFER_IN">Transfer Received</option>
                <option value="TRANSFER_OUT">Transfer Dispatched</option>
                <option value="Gift/Promo">Gift / Promo</option>
              </select>
            </div>
          </div>

          {/* Ledger Table */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Immutable Stock Movement Ledger ({filteredStockMovements.length})
              </span>
              <span className="text-xs text-slate-500">
                Audited &amp; Sequenced Movements
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-950/60 text-slate-400 font-semibold uppercase text-[10px] tracking-wider">
                    <th className="py-3 px-4">Timestamp</th>
                    <th className="py-3 px-4">Branch</th>
                    <th className="py-3 px-4">Product</th>
                    <th className="py-3 px-4">Movement Type</th>
                    <th className="py-3 px-4 text-right">Delta</th>
                    <th className="py-3 px-4 text-right">Balance After</th>
                    <th className="py-3 px-4">Recorded By</th>
                    <th className="py-3 px-4">Notes &amp; Reference</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-200">
                  {filteredStockMovements.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-10 text-center text-slate-500">
                        No stock movement records match the current filters.
                      </td>
                    </tr>
                  ) : (
                    filteredStockMovements.map((mov) => {
                      const mType = mov.movementType || mov.type || "Restock";
                      const isPositive = mov.quantityDelta > 0;
                      return (
                        <tr key={mov.id} className="hover:bg-slate-800/40 transition">
                          <td className="py-3 px-4 whitespace-nowrap text-slate-400 font-mono text-[11px]">
                            {new Date(mov.createdAt).toLocaleString()}
                          </td>
                          <td className="py-3 px-4 font-semibold text-slate-100 whitespace-nowrap">
                            {mov.branchName || mov.branchId}
                          </td>
                          <td className="py-3 px-4 whitespace-nowrap font-medium text-slate-100">
                            {mov.productName || mov.productId}
                          </td>
                          <td className="py-3 px-4 whitespace-nowrap">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                mType === "INITIAL_STOCK"
                                  ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                                  : mType === "Sale"
                                    ? "bg-sky-500/15 text-sky-400 border border-sky-500/30"
                                    : mType === "Waste/Spoilage"
                                      ? "bg-red-500/15 text-red-400 border border-red-500/30"
                                      : mType === "Restock" || mType === "TRANSFER_IN"
                                        ? "bg-teal-500/15 text-teal-400 border border-teal-500/30"
                                        : "bg-amber-500/15 text-amber-400 border border-amber-500/30"
                              }`}
                            >
                              {mType}
                            </span>
                          </td>
                          <td
                            className={`py-3 px-4 text-right font-bold whitespace-nowrap ${
                              isPositive ? "text-emerald-400" : "text-rose-400"
                            }`}
                          >
                            {isPositive ? `+${mov.quantityDelta}` : mov.quantityDelta}
                          </td>
                          <td className="py-3 px-4 text-right font-mono font-bold text-slate-100 whitespace-nowrap">
                            {mov.balanceAfter}
                          </td>
                          <td className="py-3 px-4 text-slate-400 whitespace-nowrap">
                            {mov.createdByName || mov.createdBy || "System"}
                          </td>
                          <td className="py-3 px-4 text-slate-400 max-w-xs truncate text-[11px]">
                            {mov.notes || mov.referenceId || "—"}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB: Sales History */}
      {adminTab === "sales" && (
        <div className="space-y-6">
          {/* Key Metrics */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl shadow-lg">
              <div className="flex items-center justify-between text-slate-400 mb-2">
                <span className="text-xs font-medium">Total Sales Revenue</span>
                <DollarSign className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="text-2xl font-black text-emerald-400">
                ₱{transactions.reduce((sum, tx) => sum + (tx.grandTotal || 0), 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl shadow-lg">
              <div className="flex items-center justify-between text-slate-400 mb-2">
                <span className="text-xs font-medium">Completed Orders</span>
                <Receipt className="w-4 h-4 text-teal-400" />
              </div>
              <div className="text-2xl font-black text-slate-100">
                {transactions.length}
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl shadow-lg">
              <div className="flex items-center justify-between text-slate-400 mb-2">
                <span className="text-xs font-medium">Avg Order Value</span>
                <TrendingUp className="w-4 h-4 text-sky-400" />
              </div>
              <div className="text-2xl font-black text-slate-100">
                ₱{transactions.length > 0
                  ? (transactions.reduce((sum, tx) => sum + (tx.grandTotal || 0), 0) / transactions.length).toFixed(2)
                  : "0.00"}
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl shadow-lg">
              <div className="flex items-center justify-between text-slate-400 mb-2">
                <span className="text-xs font-medium">Offline Synced</span>
                <CheckCircle2 className="w-4 h-4 text-purple-400" />
              </div>
              <div className="text-2xl font-black text-slate-100">
                {transactions.filter((tx) => tx.status === "offline_synced" || tx.isOffline).length}
              </div>
            </div>
          </div>

          {/* Filters Bar */}
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3 shadow-lg">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={salesSearch}
                onChange={(e) => setSalesSearch(e.target.value)}
                placeholder="Search transaction # or cashier..."
                className="w-full pl-10 pr-3.5 py-2 bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl text-xs text-slate-200 focus:outline-none transition"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <select
                value={salesBranchFilter}
                onChange={(e) => setSalesBranchFilter(e.target.value)}
                className="px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none cursor-pointer"
              >
                <option value="all">All Branches</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>

              <select
                value={salesPaymentFilter}
                onChange={(e) => setSalesPaymentFilter(e.target.value)}
                className="px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none cursor-pointer"
              >
                <option value="all">All Payment Methods</option>
                <option value="cash">Cash Tender</option>
                <option value="card">Credit / Debit Card</option>
                <option value="e_wallet">E-Wallet</option>
              </select>
            </div>
          </div>

          {/* Transactions Table */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Sales Ledger ({filteredSalesTransactions.length})
              </span>
              <span className="text-xs text-slate-500">
                POS Transactions &amp; Receipts
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-950/60 text-slate-400 font-semibold uppercase text-[10px] tracking-wider">
                    <th className="py-3 px-4">Receipt #</th>
                    <th className="py-3 px-4">Timestamp</th>
                    <th className="py-3 px-4">Branch</th>
                    <th className="py-3 px-4">Cashier</th>
                    <th className="py-3 px-4">Payment</th>
                    <th className="py-3 px-4">Items</th>
                    <th className="py-3 px-4 text-right">Tendered</th>
                    <th className="py-3 px-4 text-right">Grand Total</th>
                    <th className="py-3 px-4 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-200">
                  {filteredSalesTransactions.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-10 text-center text-slate-500">
                        No transactions recorded matching the current criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredSalesTransactions.map((tx) => (
                      <tr key={tx.id} className="hover:bg-slate-800/40 transition">
                        <td className="py-3 px-4 font-mono font-bold text-white whitespace-nowrap">
                          {tx.transactionNumber}
                        </td>
                        <td className="py-3 px-4 text-slate-400 font-mono text-[11px] whitespace-nowrap">
                          {new Date(tx.createdAt).toLocaleString()}
                        </td>
                        <td className="py-3 px-4 font-semibold text-slate-100 whitespace-nowrap">
                          {branches.find((b) => b.id === tx.branchId)?.name || tx.branchId}
                        </td>
                        <td className="py-3 px-4 text-slate-300 whitespace-nowrap">
                          {tx.cashierName || tx.cashierId || "Cashier"}
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                              tx.paymentMethod === "cash"
                                ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                                : tx.paymentMethod === "card"
                                  ? "bg-sky-500/15 text-sky-400 border border-sky-500/30"
                                  : "bg-purple-500/15 text-purple-400 border border-purple-500/30"
                            }`}
                          >
                            {tx.paymentMethod}
                          </span>
                        </td>
                        <td className="py-3 px-4 max-w-xs truncate text-[11px] text-slate-300">
                          {tx.items && tx.items.length > 0
                            ? tx.items.map((i) => `${i.quantity}x ${i.productName}`).join(", ")
                            : "—"}
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-slate-400 whitespace-nowrap">
                          ₱{tx.amountTendered?.toFixed(2) || "0.00"}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-emerald-400 whitespace-nowrap">
                          ₱{tx.grandTotal.toFixed(2)}
                        </td>
                        <td className="py-3 px-4 text-center whitespace-nowrap">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                              tx.status === "completed"
                                ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                                : tx.status === "offline_synced"
                                  ? "bg-purple-500/15 text-purple-400 border border-purple-500/30"
                                  : "bg-red-500/15 text-red-400 border border-red-500/30"
                            }`}
                          >
                            {tx.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: Staff Roster & RBAC Control */}
      {adminTab === "staff" && (
        <div className="space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Active Staff &amp; Pending Invitations ({staffList.length})
              </span>
              <span className="text-xs text-slate-500">
                Enforced by PostgreSQL Row Level Security
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950/80 border-b border-slate-800 text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="py-3 px-4">Staff Member</th>
                    <th className="py-3 px-4">Assigned Role</th>
                    <th className="py-3 px-4">Branch Assignment</th>
                    <th className="py-3 px-4">Account Status</th>
                    <th className="py-3 px-4">Created / Invited</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {staffList.map((member) => (
                    <tr
                      key={member.id}
                      className="hover:bg-slate-850/60 transition"
                    >
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-100 text-sm">
                          {member.fullName}
                        </div>
                        <div className="flex items-center gap-1 text-[11px] text-slate-400">
                          <Mail className="w-3 h-3 text-slate-500" />
                          <span>{member.email}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider ${
                            member.role === "super_admin"
                              ? "bg-purple-500/10 text-purple-400 border border-purple-500/20"
                              : member.role === "branch_manager" ||
                                  member.role === "inventory_manager"
                                ? "bg-teal-500/10 text-teal-400 border border-teal-500/20"
                                : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                          }`}
                        >
                          {member.role === "branch_manager"
                            ? "Branch Manager"
                            : member.role.replace("_", " ")}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-300 font-medium">
                        <div className="flex items-center gap-1.5">
                          <Building2 className="w-3.5 h-3.5 text-slate-500" />
                          <span>{member.branchName}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        {member.status === "active" ? (
                          <span className="flex items-center gap-1 text-emerald-400 text-[11px] font-semibold">
                            <CheckCircle2 className="w-3 h-3" /> Active
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-amber-400 text-[11px] font-semibold">
                            <ShieldCheck className="w-3 h-3" /> Invite Sent
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-slate-400">
                        {new Date(member.createdAt).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => handleOpenEditStaff(member)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition cursor-pointer text-[11px] font-semibold border border-slate-700/80"
                            title="Change Role or Branch"
                          >
                            <Edit className="w-3.5 h-3.5" />
                            <span>Edit Role</span>
                          </button>

                          {member.email.toLowerCase().trim() !== "riveroalecjoseph@gmail.com" &&
                            member.email.toLowerCase().trim() !== currentUser?.email?.toLowerCase().trim() && (
                              <button
                                type="button"
                                onClick={() => setDeletingStaff(member)}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 transition cursor-pointer text-[11px] font-semibold"
                                title="Delete staff user profile and revoke invitation"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                <span>Delete</span>
                              </button>
                            )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: Dynamic Branch & Location Management */}
      {adminTab === "branches" && (
        <div className="space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
            <div className="p-4 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Registered Branches &amp; Physical Locations ({branches.length})
                </span>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Real-time branch inventory nodes. Branches with active stock or transaction history are protected from accidental deletion.
                </p>
              </div>
              <button
                onClick={() => {
                  setNotification(null);
                  setIsCreateBranchModalOpen(true);
                }}
                className="flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-950/40 transition active:scale-95 cursor-pointer"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Add New Branch</span>
              </button>
            </div>

            {branches.length === 0 ? (
              <div className="p-10 text-center text-slate-400 space-y-3">
                <Building2 className="w-12 h-12 text-slate-600 mx-auto" />
                <p className="text-sm font-semibold text-slate-300">No branches currently registered.</p>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  Register a physical store branch to enable multi-branch POS checkout, transfers, and inventory tracking.
                </p>
                <button
                  onClick={() => setIsCreateBranchModalOpen(true)}
                  className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold shadow hover:bg-emerald-500 transition cursor-pointer"
                >
                  Create First Branch
                </button>
              </div>
            ) : (
              <div>
                {/* Per-Store Sandbox Banner */}
                <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 shrink-0">
                      <FlaskConical className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-xs sm:text-sm font-bold text-slate-100 flex items-center gap-2">
                        <span>Store-by-Store Practice Sandboxes</span>
                        {practiceBranchIds.length > 0 ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                            {practiceBranchIds.length} Sandbox Active
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                            All Stores Live
                          </span>
                        )}
                      </h3>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Toggle which stores run in Practice Sandbox. Sandbox stores simulate sales locally without touching real Supabase records.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsPracticeManagerModalOpen(true)}
                    className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 transition cursor-pointer self-start sm:self-auto shrink-0 flex items-center gap-1.5"
                  >
                    <Sliders className="w-3.5 h-3.5" />
                    <span>Manage Sandbox Stores</span>
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-950/80 border-b border-slate-800 text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
                      <tr>
                        <th className="py-3 px-4">Branch Name</th>
                        <th className="py-3 px-4">Identifier Code</th>
                        <th className="py-3 px-4">Address / Location</th>
                        <th className="py-3 px-4">Contact Details</th>
                        <th className="py-3 px-4">Operational Status</th>
                        <th className="py-3 px-4">Practice Sandbox</th>
                        <th className="py-3 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {branches.map((b) => (
                        <tr key={b.id} className="hover:bg-slate-850/60 transition">
                          <td className="py-3 px-4">
                            <div className="font-bold text-slate-100 text-sm flex items-center gap-2">
                              <Building2 className="w-4 h-4 text-emerald-400 shrink-0" />
                              <span>{b.name}</span>
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <span className="px-2 py-0.5 rounded font-mono text-[11px] font-bold bg-slate-800 text-emerald-300 border border-slate-700">
                              {b.code}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-slate-300">
                            <div className="flex items-center gap-1.5 text-xs text-slate-400">
                              <MapPin className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                              <span>{b.address || "No address specified"}</span>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-slate-400">
                            <div className="flex items-center gap-1.5 text-xs">
                              <Phone className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                              <span>{b.contactNumber || "N/A"}</span>
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            {b.isActive ? (
                              <span className="inline-flex items-center gap-1 text-emerald-400 text-[11px] font-semibold">
                                <CheckCircle2 className="w-3 h-3" /> Active
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-slate-500 text-[11px] font-semibold">
                                Archived / Inactive
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4">
                            <button
                              type="button"
                              onClick={async () => {
                                const wasInPractice = isBranchInPracticeMode(b.id);
                                await toggleBranchPracticeMode(b.id);
                                setNotification({
                                  type: "success",
                                  message: wasInPractice
                                    ? `Switched "${b.name}" to Live Production. Sandbox test records purged.`
                                    : `Enabled Practice Sandbox for "${b.name}". Real inventory is protected.`,
                                });
                              }}
                              className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer border select-none ${
                                isBranchInPracticeMode(b.id)
                                  ? "bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border-amber-500/40 shadow-sm shadow-amber-950/30"
                                  : "bg-slate-900/80 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border-slate-700/60"
                              }`}
                              title={
                                isBranchInPracticeMode(b.id)
                                  ? "Practice Sandbox Active: Click to switch store to Live Production"
                                  : "Live Production Active: Click to enable Practice Sandbox for this store"
                              }
                            >
                              <span
                                className={`w-2 h-2 rounded-full ${
                                  isBranchInPracticeMode(b.id)
                                    ? "bg-amber-400 animate-pulse"
                                    : "bg-slate-500"
                                }`}
                              />
                              <span>{isBranchInPracticeMode(b.id) ? "Sandbox ON" : "Live Store"}</span>
                            </button>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => {
                                  setEditingBranch(b);
                                  setEditName(b.name);
                                  setEditCode(b.code);
                                  setEditAddress(b.address || "");
                                  setEditContact(b.contactNumber || "");
                                  setEditIsActive(b.isActive);
                                  setEditIsPracticeMode(isBranchInPracticeMode(b.id));
                                }}
                                className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition cursor-pointer"
                                title="Edit Branch"
                              >
                                <Edit className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => setDeletingBranch(b)}
                                className="p-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 transition cursor-pointer"
                                title="Safely Delete Empty Branch"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Create Branch Modal */}
      {isCreateBranchModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full p-6 shadow-2xl relative text-slate-100">
            <button
              onClick={() => setIsCreateBranchModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg bg-slate-800"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2.5 text-emerald-400 mb-1">
              <Building2 className="w-5 h-5" />
              <h2 className="text-lg font-bold">Create New Branch</h2>
            </div>
            <p className="text-xs text-slate-400 mb-5">
              Add a new physical location for inventory dispatch and POS operations.
            </p>

            <form onSubmit={handleCreateBranch} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                  Branch Name *
                </label>
                <input
                  type="text"
                  required
                  value={branchName}
                  onChange={(e) => setBranchName(e.target.value)}
                  placeholder="e.g. Uptown Flagship"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-slate-100 text-xs sm:text-sm focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                  Branch Code / Identifier *
                </label>
                <input
                  type="text"
                  required
                  value={branchCode}
                  onChange={(e) => setBranchCode(e.target.value.toUpperCase())}
                  placeholder="e.g. UPTN-01"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-slate-100 text-xs sm:text-sm focus:outline-none focus:border-emerald-500 font-mono uppercase"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                  Address / Physical Location
                </label>
                <input
                  type="text"
                  value={branchAddress}
                  onChange={(e) => setBranchAddress(e.target.value)}
                  placeholder="e.g. Level 2, Commercial Center"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-slate-100 text-xs sm:text-sm focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                  Contact Information / Phone
                </label>
                <input
                  type="text"
                  value={branchContact}
                  onChange={(e) => setBranchContact(e.target.value)}
                  placeholder="e.g. +63 917 123 4567"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-slate-100 text-xs sm:text-sm focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex items-start gap-2.5 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
                <input
                  type="checkbox"
                  id="create-branch-practice-toggle"
                  checked={createIsPracticeMode}
                  onChange={(e) => setCreateIsPracticeMode(e.target.checked)}
                  className="w-4 h-4 rounded text-amber-500 focus:ring-amber-400 bg-slate-950 border-slate-700 cursor-pointer mt-0.5"
                />
                <div>
                  <label htmlFor="create-branch-practice-toggle" className="text-xs text-amber-200 font-bold cursor-pointer">
                    Start in Practice Sandbox Mode
                  </label>
                  <p className="text-[11px] text-amber-400/80 leading-normal mt-0.5">
                    Isolate transactions and sales for this store in a safe local training environment without touching live database records.
                  </p>
                </div>
              </div>

              <div className="flex gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setIsCreateBranchModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreatingBranch}
                  className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg shadow-emerald-950/40 flex items-center justify-center gap-1.5 transition active:scale-95 cursor-pointer disabled:opacity-50"
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>{isCreatingBranch ? "Creating..." : "Save Branch"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Branch Modal */}
      {editingBranch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full p-6 shadow-2xl relative text-slate-100">
            <button
              onClick={() => setEditingBranch(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg bg-slate-800"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2.5 text-emerald-400 mb-1">
              <Edit className="w-5 h-5" />
              <h2 className="text-lg font-bold">Edit Branch Details</h2>
            </div>
            <p className="text-xs text-slate-400 mb-5">
              Update information for "{editingBranch.name}".
            </p>

            <form onSubmit={handleUpdateBranch} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                  Branch Name *
                </label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-slate-100 text-xs sm:text-sm focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                  Branch Code / Identifier *
                </label>
                <input
                  type="text"
                  required
                  value={editCode}
                  onChange={(e) => setEditCode(e.target.value.toUpperCase())}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-slate-100 text-xs sm:text-sm focus:outline-none focus:border-emerald-500 font-mono uppercase"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                  Address / Physical Location
                </label>
                <input
                  type="text"
                  value={editAddress}
                  onChange={(e) => setEditAddress(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-slate-100 text-xs sm:text-sm focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                  Contact Information / Phone
                </label>
                <input
                  type="text"
                  value={editContact}
                  onChange={(e) => setEditContact(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-slate-100 text-xs sm:text-sm focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="branch-active-toggle"
                  checked={editIsActive}
                  onChange={(e) => setEditIsActive(e.target.checked)}
                  className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 bg-slate-950 border-slate-700 cursor-pointer"
                />
                <label htmlFor="branch-active-toggle" className="text-xs text-slate-300 font-semibold cursor-pointer">
                  Branch is Active (Available for POS &amp; Transfers)
                </label>
              </div>

              <div className="flex items-start gap-2.5 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
                <input
                  type="checkbox"
                  id="edit-branch-practice-toggle"
                  checked={editIsPracticeMode}
                  onChange={(e) => setEditIsPracticeMode(e.target.checked)}
                  className="w-4 h-4 rounded text-amber-500 focus:ring-amber-400 bg-slate-950 border-slate-700 cursor-pointer mt-0.5"
                />
                <div>
                  <label htmlFor="edit-branch-practice-toggle" className="text-xs text-amber-200 font-bold cursor-pointer">
                    Enable Practice Sandbox Mode for this Store
                  </label>
                  <p className="text-[11px] text-amber-400/80 leading-normal mt-0.5">
                    Transactions and inventory deductions will be simulated locally on this device without mutating official Supabase cloud tables.
                  </p>
                </div>
              </div>

              <div className="flex gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setEditingBranch(null)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUpdatingBranch}
                  className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg shadow-emerald-950/40 flex items-center justify-center gap-1.5 transition active:scale-95 cursor-pointer disabled:opacity-50"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{isUpdatingBranch ? "Saving..." : "Update Branch"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Store Practice Sandbox Manager Modal */}
      {isPracticeManagerModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto animate-in fade-in duration-150">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-lg w-full p-6 shadow-2xl relative text-slate-100">
            <button
              onClick={() => setIsPracticeManagerModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2.5 text-amber-400 mb-1">
              <FlaskConical className="w-5 h-5" />
              <h2 className="text-lg font-bold">Store Practice Sandbox Manager</h2>
            </div>
            <p className="text-xs text-slate-400 mb-4 leading-relaxed">
              Select which stores operate in isolated Practice Sandbox mode. Practice stores allow staff to train and process practice checkouts without recording live revenue or depleting real inventory.
            </p>

            <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
              {branches.length === 0 ? (
                <div className="text-center py-6 text-xs text-slate-500">
                  No stores found.
                </div>
              ) : (
                branches.map((b) => {
                  const inPractice = isBranchInPracticeMode(b.id);
                  return (
                    <div
                      key={b.id}
                      className={`flex items-center justify-between p-3.5 rounded-xl border transition ${
                        inPractice
                          ? "bg-amber-500/10 border-amber-500/30 shadow-sm shadow-amber-950/20"
                          : "bg-slate-950/60 border-slate-800"
                      }`}
                    >
                      <div className="mr-3">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Building2 className={`w-4 h-4 ${inPractice ? "text-amber-400" : "text-slate-400"}`} />
                          <span className="text-xs sm:text-sm font-bold text-slate-100">{b.name}</span>
                          <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                            {b.code}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-400 mt-1">
                          {inPractice ? (
                            <span className="text-amber-300 font-semibold flex items-center gap-1.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                              Sandbox Mode: Local test checkouts only (Safe)
                            </span>
                          ) : (
                            <span className="text-emerald-400 font-medium flex items-center gap-1.5">
                              <CheckCircle2 className="w-3 h-3" />
                              Live Production: Writes to official cloud ledger
                            </span>
                          )}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={async () => {
                          await toggleBranchPracticeMode(b.id);
                          setNotification({
                            type: "success",
                            message: inPractice
                              ? `Switched "${b.name}" to Live Production. Sandbox data purged.`
                              : `Enabled Practice Sandbox for "${b.name}". Real inventory is protected.`,
                          });
                        }}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer shrink-0 border select-none ${
                          inPractice
                            ? "bg-amber-500 text-slate-950 hover:bg-amber-400 border-amber-400 shadow-md shadow-amber-950/40"
                            : "bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700"
                        }`}
                      >
                        {inPractice ? "Sandbox ON" : "Turn ON"}
                      </button>
                    </div>
                  );
                })
              )}
            </div>

            <div className="mt-5 pt-3 border-t border-slate-800 flex justify-between items-center text-xs text-slate-400 gap-2 flex-wrap">
              <span>{practiceBranchIds.length} store(s) currently in sandbox mode</span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={async () => {
                    if (
                      confirm(
                        "Are you sure you want to purge all sandbox practice transfers, stock deductions, and test data across all branches? Authentic live data will be fully restored.",
                      )
                    ) {
                      const res = await purgePracticeData();
                      if (res.success) {
                        setNotification({
                          type: "success",
                          message:
                            "Successfully purged all sandbox transfers and practice inventory records.",
                        });
                      } else {
                        setNotification({
                          type: "error",
                          message: res.error || "Failed to purge sandbox data.",
                        });
                      }
                    }
                  }}
                  className="px-3 py-2 rounded-xl bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/30 text-xs font-bold transition cursor-pointer"
                >
                  Purge All Sandbox Data
                </button>
                <button
                  type="button"
                  onClick={() => setIsPracticeManagerModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete / Archive Branch Confirmation Modal */}
      {deletingBranch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-red-500/40 rounded-2xl max-w-md w-full p-6 shadow-2xl relative text-slate-100 animate-in fade-in zoom-in-95 duration-150">
            <button
              onClick={() => setDeletingBranch(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg bg-slate-800"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2.5 text-red-400 mb-2">
              <AlertCircle className="w-6 h-6" />
              <h2 className="text-lg font-bold">Safely Delete Branch?</h2>
            </div>

            <p className="text-xs text-slate-300 mb-3 leading-relaxed">
              You are about to delete <strong className="text-white">"{deletingBranch.name}" ({deletingBranch.code})</strong>.
            </p>

            <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 text-xs text-slate-400 space-y-1.5 mb-5">
              <div className="font-semibold text-slate-200">Integrity Safeguard Check:</div>
              <p>• Branches with <span className="text-amber-400">active stock (&gt;0)</span> cannot be deleted.</p>
              <p>• Branches with <span className="text-amber-400">historical transactions</span> cannot be deleted.</p>
              <p>• If deletion is blocked, you can edit the branch and mark it <span className="text-slate-300">Archived/Inactive</span> instead.</p>
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setDeletingBranch(null)}
                className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeletingBranch}
                onClick={handleDeleteBranch}
                className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold shadow-lg shadow-red-950/40 flex items-center justify-center gap-1.5 transition active:scale-95 cursor-pointer disabled:opacity-50"
              >
                <Trash2 className="w-4 h-4" />
                <span>{isDeletingBranch ? "Checking & Deleting..." : "Confirm Deletion"}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Invite Modal */}
      {isInviteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full p-6 shadow-2xl relative text-slate-100">
            <button
              onClick={() => setIsInviteModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg bg-slate-800"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2.5 text-emerald-400 mb-1">
              <UserPlus className="w-5 h-5" />
              <h2 className="text-lg font-bold">Invite New Staff Member</h2>
            </div>
            <p className="text-xs text-slate-400 mb-5">
              An automated email link will be dispatched via Supabase Auth
              Admin, allowing the staff member to set their password.
            </p>

            <form onSubmit={handleSendInvite} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  value={inviteFullName}
                  onChange={(e) => setInviteFullName(e.target.value)}
                  placeholder="e.g. Staff Full Name"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-slate-100 text-xs sm:text-sm focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                  Staff Email Address
                </label>
                <input
                  type="email"
                  required
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="e.g. staff@rr-pos.com"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-slate-100 text-xs sm:text-sm focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                  Assigned RBAC Role
                </label>
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value as UserRole)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-slate-100 text-xs sm:text-sm focus:outline-none focus:border-emerald-500"
                >
                  <option value="cashier" className="bg-slate-900">
                    Cashier (POS interface only, catalog, cart, receipts, offline queue)
                  </option>
                  <option value="branch_manager" className="bg-slate-900">
                    Branch Manager (POS Screen, Branch Inventory, Categories, Adjustments, Transfers)
                  </option>
                  <option value="super_admin" className="bg-slate-900">
                    Super Admin / Owner (Global cross-branch access, Owner Audit Center, Staff &amp; Branches)
                  </option>
                </select>
              </div>

              {inviteRole !== "super_admin" && (
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-semibold text-slate-400">
                      Assigned Branch
                    </label>
                    <button
                      type="button"
                      onClick={() => setIsInlineAddBranchOpen((prev) => !prev)}
                      className="text-xs text-emerald-400 hover:text-emerald-300 font-semibold flex items-center gap-1 cursor-pointer"
                    >
                      <PlusCircle className="w-3.5 h-3.5" />
                      <span>{isInlineAddBranchOpen ? "Select Existing Branch" : "+ Add Branch"}</span>
                    </button>
                  </div>

                  {isInlineAddBranchOpen ? (
                    <div className="p-3 mb-2 rounded-xl bg-slate-950 border border-emerald-500/40 space-y-2.5 animate-in fade-in duration-150">
                      <div className="text-[11px] font-bold text-emerald-400 flex items-center gap-1">
                        <Building2 className="w-3.5 h-3.5" />
                        <span>Quick Add Branch (Onboarding)</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          type="text"
                          placeholder="Branch Name *"
                          value={inlineBranchName}
                          onChange={(e) => setInlineBranchName(e.target.value)}
                          className="bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                        />
                        <input
                          type="text"
                          placeholder="Code (e.g. DWTN) *"
                          value={inlineBranchCode}
                          onChange={(e) => setInlineBranchCode(e.target.value.toUpperCase())}
                          className="bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500 font-mono uppercase"
                        />
                      </div>
                      <input
                        type="text"
                        placeholder="Address / Location (optional)"
                        value={inlineBranchAddress}
                        onChange={(e) => setInlineBranchAddress(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                      />
                      <div className="flex justify-end gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => setIsInlineAddBranchOpen(false)}
                          className="px-2.5 py-1 rounded-lg bg-slate-800 text-slate-300 text-[11px] font-medium hover:bg-slate-700 cursor-pointer"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          disabled={isCreatingInlineBranch}
                          onClick={handleCreateInlineBranch}
                          className="px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold shadow disabled:opacity-50 cursor-pointer"
                        >
                          {isCreatingInlineBranch ? "Saving..." : "Save & Assign"}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <select
                      value={inviteBranchId}
                      onChange={(e) => setInviteBranchId(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-slate-100 text-xs sm:text-sm focus:outline-none focus:border-emerald-500 cursor-pointer"
                    >
                      {branches.length === 0 ? (
                        <option value="" disabled className="bg-slate-900">
                          No branches available. Click + Add Branch above.
                        </option>
                      ) : (
                        branches.map((b) => (
                          <option key={b.id} value={b.id} className="bg-slate-900">
                            {b.name} ({b.code})
                          </option>
                        ))
                      )}
                    </select>
                  )}
                </div>
              )}

              {/* Direct Resend API Key & Sender Settings */}
              <div className="pt-1">
                <button
                  type="button"
                  onClick={() => setShowResendSettings((prev) => !prev)}
                  className="text-[11px] text-slate-400 hover:text-emerald-400 font-semibold flex items-center gap-1.5 cursor-pointer"
                >
                  <Sliders className="w-3.5 h-3.5 text-emerald-400" />
                  <span>{showResendSettings ? "Hide Direct Email Settings" : "⚙️ Direct Resend API Settings (Optional)"}</span>
                </button>

                {showResendSettings && (
                  <div className="mt-2 p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-2.5 text-xs animate-in fade-in duration-150">
                    <div className="text-[11px] font-bold text-emerald-400 flex items-center gap-1">
                      <Mail className="w-3.5 h-3.5" />
                      <span>Direct Resend API Dispatch Config</span>
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold text-slate-400 mb-1">
                        Resend API Key (re_...)
                      </label>
                      <input
                        type="password"
                        placeholder="e.g. re_123456789..."
                        value={resendApiKey}
                        onChange={(e) => {
                          setResendApiKey(e.target.value);
                          localStorage.setItem("poinvts_resend_api_key", e.target.value);
                        }}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 font-mono focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold text-slate-400 mb-1">
                        Sender From Address
                      </label>
                      <input
                        type="text"
                        placeholder="POINVTS Workstation <onboarding@resend.dev>"
                        value={resendFromEmail}
                        onChange={(e) => {
                          setResendFromEmail(e.target.value);
                          localStorage.setItem("poinvts_resend_from_email", e.target.value);
                        }}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                    <p className="text-[10px] text-slate-500 leading-normal">
                      Note: If using default <code>onboarding@resend.dev</code>, Resend only permits sending test emails to your registered owner email address. To send to any recipient, verify your domain at resend.com.
                    </p>
                  </div>
                )}
              </div>

              <div className="flex gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setIsInviteModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSending}
                  className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg shadow-emerald-950/40 flex items-center justify-center gap-1.5 transition active:scale-95 cursor-pointer disabled:opacity-50"
                >
                  <Mail className="w-4 h-4" />
                  <span>
                    {isSending ? "Sending Link..." : "Send Invite Link"}
                  </span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Generated Link Modal for Super Admin Direct Share */}
      {generatedLinkModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-emerald-500/50 rounded-2xl max-w-lg w-full p-6 shadow-2xl relative text-slate-100 animate-in zoom-in-95 duration-150">
            <button
              onClick={() => setGeneratedLinkModal(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg bg-slate-800"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2.5 text-emerald-400 mb-2">
              <CheckCircle2 className="w-6 h-6" />
              <h2 className="text-lg font-bold">User Account Provisioned</h2>
            </div>
            <p className="text-xs text-slate-300 mb-4 leading-relaxed">
              Staff user <strong className="text-white">{generatedLinkModal.email}</strong> has been configured in Supabase Auth.
            </p>

            <div className="bg-slate-950 border border-slate-800 rounded-xl p-3.5 mb-4 space-y-3">
              <div className="flex items-center justify-between text-[11px] font-semibold text-slate-400">
                <span>Direct Password Setup Link</span>
                <span className="text-emerald-400 font-mono text-[10px]">Active</span>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={generatedLinkModal.link}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-300 font-mono focus:outline-none select-all"
                />
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(generatedLinkModal.link);
                    setIsCopiedLink(true);
                    setTimeout(() => setIsCopiedLink(false), 2500);
                  }}
                  className="px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 shrink-0 transition cursor-pointer"
                >
                  {isCopiedLink ? (
                    <>
                      <Check className="w-4 h-4" />
                      <span>Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      <span>Copy Link</span>
                    </>
                  )}
                </button>
              </div>

              {/* Direct Personal Email Dispatch Options */}
              <div className="pt-2 border-t border-slate-900 flex flex-wrap items-center gap-2">
                <a
                  href={`https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(
                    generatedLinkModal.email,
                  )}&su=${encodeURIComponent(
                    "Invitation to Join POINVTS Workstation System",
                  )}&body=${encodeURIComponent(
                    `Hello,\n\nYou have been invited to join the POINVTS Workstation System as a staff member.\n\nPlease click the link below to configure your password and access your account:\n\n${generatedLinkModal.link}\n\nThank you!`,
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-600/20 hover:bg-red-600/30 text-red-300 border border-red-500/40 text-xs font-semibold transition cursor-pointer"
                >
                  <Mail className="w-3.5 h-3.5" />
                  <span>Compose in Gmail Web</span>
                </a>

                <a
                  href={`mailto:${encodeURIComponent(
                    generatedLinkModal.email,
                  )}?subject=${encodeURIComponent(
                    "Invitation to Join POINVTS Workstation System",
                  )}&body=${encodeURIComponent(
                    `Hello,\n\nYou have been invited to join the POINVTS Workstation System as a staff member.\n\nPlease click the link below to configure your password and access your account:\n\n${generatedLinkModal.link}\n\nThank you!`,
                  )}`}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold transition cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Open Mail App</span>
                </a>
              </div>
            </div>

            <p className="text-[11px] text-slate-400 leading-relaxed mb-4">
              💡 <strong>Instant Emailing:</strong> Click <strong>Compose in Gmail Web</strong> or <strong>Open Mail App</strong> above to send the invite directly from your personal email address with the recipient and link pre-filled!
            </p>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setGeneratedLinkModal(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Staff Role & Permissions Modal */}
      {editingStaff && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full p-6 shadow-2xl relative text-slate-100">
            <button
              type="button"
              onClick={() => setEditingStaff(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg bg-slate-800"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2.5 text-emerald-400 mb-1">
              <ShieldCheck className="w-5 h-5" />
              <h2 className="text-lg font-bold">Edit Staff Permissions</h2>
            </div>
            <p className="text-xs text-slate-400 mb-5">
              Update operational role and branch access for <span className="text-white font-semibold">{editingStaff.fullName}</span> ({editingStaff.email}).
            </p>

            <form onSubmit={handleSaveEditStaff} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                  Assigned RBAC Role
                </label>
                <select
                  value={editingStaffRole}
                  onChange={(e) => setEditingStaffRole(e.target.value as UserRole)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-slate-100 text-xs sm:text-sm focus:outline-none focus:border-emerald-500"
                >
                  <option value="cashier" className="bg-slate-900">
                    Cashier (POS interface only, restricted from inventory &amp; admin)
                  </option>
                  <option value="branch_manager" className="bg-slate-900">
                    Branch Manager (POS Screen, Branch Inventory, Categories, Adjustments, Transfers)
                  </option>
                  <option value="super_admin" className="bg-slate-900">
                    Super Admin / Owner (Full global access, cross-branch, staff management)
                  </option>
                </select>
              </div>

              {editingStaffRole !== "super_admin" && (
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                    Assigned Branch
                  </label>
                  <select
                    value={editingStaffBranchId}
                    onChange={(e) => setEditingStaffBranchId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-slate-100 text-xs sm:text-sm focus:outline-none focus:border-emerald-500"
                  >
                    {branches.map((b) => (
                      <option key={b.id} value={b.id} className="bg-slate-900">
                        {b.name} ({b.code})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {editingStaffRole === "super_admin" && (
                <div className="p-3 rounded-xl bg-purple-500/10 border border-purple-500/20 text-xs text-purple-300">
                  <div className="font-semibold flex items-center gap-1.5 mb-1">
                    <ShieldCheck className="w-4 h-4 text-purple-400" />
                    <span>Global Administrative Access</span>
                  </div>
                  <p className="text-[11px] text-purple-400/80 leading-normal">
                    Super Admins / Owners are not restricted to any single branch. They have full access to switch between all branches, manage staff, toggle sandboxes, and view consolidated reports.
                  </p>
                </div>
              )}

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="edit-staff-active-toggle"
                  checked={editingStaffIsActive}
                  onChange={(e) => setEditingStaffIsActive(e.target.checked)}
                  className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 bg-slate-950 border-slate-700 cursor-pointer"
                />
                <label htmlFor="edit-staff-active-toggle" className="text-xs text-slate-300 font-semibold cursor-pointer">
                  Active Account Status
                </label>
              </div>

              <div className="flex gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setEditingStaff(null)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUpdatingStaff}
                  className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg shadow-emerald-950/40 flex items-center justify-center gap-1.5 transition active:scale-95 cursor-pointer disabled:opacity-50"
                >
                  {isUpdatingStaff ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <span>Save Permissions</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Staff Confirmation Modal */}
      {deletingStaff && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-rose-500/40 rounded-2xl max-w-md w-full p-6 shadow-2xl relative text-slate-100 animate-in zoom-in-95 duration-150">
            <button
              type="button"
              onClick={() => setDeletingStaff(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg bg-slate-800"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2.5 text-rose-400 mb-2">
              <Trash2 className="w-6 h-6" />
              <h2 className="text-lg font-bold">Delete Staff Member</h2>
            </div>

            <p className="text-xs text-slate-300 mb-4 leading-relaxed">
              Are you sure you want to delete <strong className="text-white">{deletingStaff.fullName}</strong> (<span className="text-slate-400">{deletingStaff.email}</span>)?
            </p>

            <div className="bg-rose-950/40 border border-rose-800/60 rounded-xl p-3 mb-5 text-[11px] text-rose-300 leading-relaxed">
              ⚠️ <strong>Warning:</strong> This will revoke access, delete their staff profile, and cancel any pending invitation or active session.
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setDeletingStaff(null)}
                className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeletingStaff}
                onClick={handleDeleteStaff}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-lg shadow-rose-950/40 flex items-center justify-center gap-1.5 transition active:scale-95 cursor-pointer disabled:opacity-50"
              >
                {isDeletingStaff ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    <span>Delete User</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
