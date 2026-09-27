import React, { useState, useEffect, useMemo } from "react";
import { useApp } from "../../context/AppContext";
import { UserRole } from "../../types";
import { supabase, isLiveSupabaseConfigured } from "../../lib/supabase";
import {
  Users,
  UserPlus,
  CheckCircle2,
  AlertCircle,
  X,
  Search,
  Edit,
  Power,
  RotateCw,
  Lock,
} from "lucide-react";

interface StaffUser {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  branchId: string | null;
  branchName: string;
  status: "active" | "inactive";
  createdAt: string;
}

export const StaffScreen: React.FC = () => {
  const { currentUser, branches, logAuditEvent } = useApp();

  const [staffList, setStaffList] = useState<StaffUser[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [branchFilter, setBranchFilter] = useState<string>("all");

  // Add Staff Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [addFullName, setAddFullName] = useState<string>("");
  const [addEmail, setAddEmail] = useState<string>("");
  const [addPassword, setAddPassword] = useState<string>("");
  const [addRole, setAddRole] = useState<UserRole>("cashier");
  const [addBranchId, setAddBranchId] = useState<string>(branches[0]?.id || "");
  const [isSubmittingAdd, setIsSubmittingAdd] = useState<boolean>(false);
  const [addError, setAddError] = useState<string | null>(null);

  // Edit Staff Branch / Role Modal State
  const [editingStaff, setEditingStaff] = useState<StaffUser | null>(null);
  const [editRole, setEditRole] = useState<UserRole>("cashier");
  const [editBranchId, setEditBranchId] = useState<string>("");
  const [editIsActive, setEditIsActive] = useState<boolean>(true);
  const [isUpdatingStaff, setIsUpdatingStaff] = useState<boolean>(false);

  // Notification Banner
  const [notification, setNotification] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  // Fetch staff users from Supabase profiles
  const loadStaff = async () => {
    setIsLoading(true);
    try {
      if (isLiveSupabaseConfigured) {
        const { data, error } = await supabase
          .from("profiles")
          .select("*")
          .order("created_at", { ascending: false });

        if (error) {
          console.warn("Could not query profiles from Supabase:", error);
        } else if (data) {
          const mapped: StaffUser[] = data.map((p: any) => {
            const assignedBranch = branches.find((b) => b.id === p.branch_id);
            return {
              id: p.id,
              email: p.email,
              fullName: p.full_name || p.email.split("@")[0] || "Staff",
              role: (p.role as UserRole) || "cashier",
              branchId: p.branch_id || null,
              branchName:
                p.role === "super_admin"
                  ? "Global Network Access"
                  : assignedBranch?.name || "Unassigned",
              status: p.is_active === false ? "inactive" : "active",
              createdAt: p.created_at || new Date().toISOString(),
            };
          });

          // Deduplicate
          const unique = mapped.reduce<StaffUser[]>((acc, curr) => {
            if (!acc.some((s) => s.id === curr.id || s.email.toLowerCase() === curr.email.toLowerCase())) {
              acc.push(curr);
            }
            return acc;
          }, []);

          setStaffList(unique);
        }
      }
    } catch (err: any) {
      console.error("Error loading staff roster:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadStaff();
  }, [branches]);

  // Handle Add Staff via direct supabase.auth.signUp()
  const handleAddStaffSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddError(null);

    const trimmedEmail = addEmail.trim().toLowerCase();
    const trimmedName = addFullName.trim();

    if (!trimmedEmail || !trimmedName) {
      setAddError("Full name and email are required.");
      return;
    }

    if (!addPassword || addPassword.length < 6) {
      setAddError("Password must be at least 6 characters.");
      return;
    }

    if (staffList.some((s) => s.email.toLowerCase() === trimmedEmail)) {
      setAddError(`User with email "${trimmedEmail}" already exists.`);
      return;
    }

    setIsSubmittingAdd(true);
    try {
      if (!isLiveSupabaseConfigured) {
        throw new Error("Supabase is not configured. Live staff provisioning requires cloud connectivity.");
      }

      // 1. Direct registration via supabase.auth.signUp()
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: trimmedEmail,
        password: addPassword,
        options: {
          data: {
            full_name: trimmedName,
            role: addRole,
            branch_id: addRole === "super_admin" ? null : addBranchId,
          },
        },
      });

      if (signUpError) {
        if (signUpError.message?.toLowerCase().includes("already registered")) {
          throw new Error(`Email "${trimmedEmail}" is already registered in the system.`);
        }
        throw new Error(signUpError.message || "Failed to register staff account.");
      }

      if (!signUpData.user?.id) {
        throw new Error("Failed to provision user ID from auth service.");
      }

      const newUserId = signUpData.user.id;
      const targetBranchId = addRole === "super_admin" ? null : addBranchId;
      const targetBranch = branches.find((b) => b.id === targetBranchId);

      // 2. Upsert profile record in public.profiles (and public.user_profiles)
      const { error: profileError } = await supabase.from("profiles").upsert({
        id: newUserId,
        email: trimmedEmail,
        full_name: trimmedName,
        role: addRole,
        branch_id: targetBranchId,
        is_active: true,
        must_change_password: true,
      });

      if (profileError) {
        console.warn("Could not upsert profile directly:", profileError);
      }

      // 3. Log audit entry
      await logAuditEvent({
        userId: currentUser?.id || "admin",
        userName: currentUser?.fullName || "Super Admin",
        userRole: currentUser?.role || "super_admin",
        userEmail: currentUser?.email,
        branchId: targetBranchId || "",
        branchName: targetBranch?.name || "Global",
        actionType: "STAFF_INVITED",
        actionTitle: `Staff Member Created: ${trimmedName}`,
        description: `Directly registered staff member ${trimmedName} (${trimmedEmail}) as ${addRole.replace("_", " ")} assigned to ${targetBranch?.name || "Global"}.`,
      });

      const newMember: StaffUser = {
        id: newUserId,
        email: trimmedEmail,
        fullName: trimmedName,
        role: addRole,
        branchId: targetBranchId,
        branchName: addRole === "super_admin" ? "Global Network Access" : targetBranch?.name || "Unassigned",
        status: "active",
        createdAt: new Date().toISOString(),
      };

      setStaffList((prev) => [newMember, ...prev]);
      setNotification({
        type: "success",
        message: `Successfully provisioned ${trimmedName} (${trimmedEmail}) as ${addRole.replace("_", " ")}.`,
      });

      // Reset form & close
      setAddFullName("");
      setAddEmail("");
      setAddPassword("");
      setIsAddModalOpen(false);
    } catch (err: any) {
      setAddError(err.message || "An unexpected error occurred while adding staff.");
    } finally {
      setIsSubmittingAdd(false);
    }
  };

  // Open Edit Modal
  const handleOpenEdit = (staff: StaffUser) => {
    setEditingStaff(staff);
    setEditRole(staff.role);
    setEditBranchId(staff.branchId || branches[0]?.id || "");
    setEditIsActive(staff.status === "active");
  };

  // Save Edit (Branch, Role, Active Status)
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStaff) return;

    setIsUpdatingStaff(true);
    try {
      const isRootAdmin = editingStaff.email.toLowerCase() === "riveroalecjoseph@gmail.com";
      const targetRole: UserRole = isRootAdmin ? "super_admin" : editRole;
      const targetBranchId = targetRole === "super_admin" ? null : editBranchId;
      const targetBranch = branches.find((b) => b.id === targetBranchId);

      if (isLiveSupabaseConfigured) {
        const { error } = await supabase
          .from("profiles")
          .update({
            role: targetRole,
            branch_id: targetBranchId,
            is_active: editIsActive,
          })
          .eq("id", editingStaff.id);

        if (error) throw new Error(error.message);
      }

      await logAuditEvent({
        userId: currentUser?.id || "admin",
        userName: currentUser?.fullName || "Super Admin",
        userRole: currentUser?.role || "super_admin",
        userEmail: currentUser?.email,
        branchId: targetBranchId || "",
        branchName: targetRole === "super_admin" ? "Global Network Access" : targetBranch?.name || "Global",
        actionType: "STAFF_ROLE_UPDATED",
        actionTitle: "Staff Role / Branch Updated",
        description: `Updated permissions for ${editingStaff.fullName} to ${targetRole.replace("_", " ")}, branch: ${targetBranch?.name || "Global"}, status: ${editIsActive ? "active" : "inactive"}.`,
      });

      setStaffList((prev) =>
        prev.map((s) =>
          s.id === editingStaff.id
            ? {
                ...s,
                role: targetRole,
                branchId: targetBranchId,
                branchName: targetRole === "super_admin" ? "Global Network Access" : targetBranch?.name || "Unassigned",
                status: editIsActive ? "active" : "inactive",
              }
            : s,
        ),
      );

      setNotification({
        type: "success",
        message: `Successfully updated permissions and branch for ${editingStaff.fullName}.`,
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

  // Toggle quick active / deactivate
  const handleToggleActive = async (staff: StaffUser) => {
    if (staff.email.toLowerCase() === "riveroalecjoseph@gmail.com") {
      setNotification({
        type: "error",
        message: "The root Super Admin account cannot be deactivated.",
      });
      return;
    }

    const nextStatus = staff.status === "active" ? "inactive" : "active";
    const nextIsActive = nextStatus === "active";

    try {
      if (isLiveSupabaseConfigured) {
        await supabase
          .from("profiles")
          .update({ is_active: nextIsActive })
          .eq("id", staff.id);
      }

      setStaffList((prev) =>
        prev.map((s) => (s.id === staff.id ? { ...s, status: nextStatus } : s)),
      );

      setNotification({
        type: "success",
        message: `Staff member ${staff.fullName} marked as ${nextStatus}.`,
      });
    } catch (err: any) {
      setNotification({
        type: "error",
        message: err.message || "Failed to update staff status.",
      });
    }
  };

  // Filtered List
  const filteredStaff = useMemo(() => {
    return staffList.filter((s) => {
      if (roleFilter !== "all" && s.role !== roleFilter) return false;
      if (branchFilter !== "all" && s.branchId !== branchFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = s.fullName.toLowerCase().includes(q);
        const matchesEmail = s.email.toLowerCase().includes(q);
        const matchesBranch = s.branchName.toLowerCase().includes(q);
        if (!matchesName && !matchesEmail && !matchesBranch) return false;
      }
      return true;
    });
  }, [staffList, roleFilter, branchFilter, searchQuery]);

  return (
    <div className="w-full max-w-[1560px] mx-auto px-3 sm:px-6 py-4 sm:py-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <Users className="w-6 h-6 text-emerald-400" />
            <span>Staff Management &amp; Provisioning</span>
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Direct in-app team registration, branch assignment, and role permissions. Strictly accessible to <strong className="text-slate-200">Super Admins</strong>.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={loadStaff}
            disabled={isLoading}
            className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition cursor-pointer"
            title="Refresh Staff Roster"
          >
            <RotateCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
          </button>
          <button
            id="staff-add-btn"
            type="button"
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-950/40 transition active:scale-95 cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            <span>+ Add Staff Member</span>
          </button>
        </div>
      </div>

      {/* Notification Banner */}
      {notification && (
        <div
          className={`flex items-center justify-between p-3.5 mb-5 rounded-2xl border text-xs ${
            notification.type === "success"
              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
              : "bg-red-500/10 border-red-500/30 text-red-300"
          }`}
        >
          <div className="flex items-center gap-2">
            {notification.type === "success" ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            )}
            <span>{notification.message}</span>
          </div>
          <button
            onClick={() => setNotification(null)}
            className="text-slate-400 hover:text-white p-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Filters Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
        <div className="flex flex-wrap items-center gap-2">
          {/* Role Filter */}
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-300 font-medium focus:outline-none focus:border-emerald-500 cursor-pointer"
          >
            <option value="all">All Roles</option>
            <option value="cashier">Cashiers</option>
            <option value="branch_manager">Branch Managers</option>
            <option value="super_admin">Super Admins</option>
          </select>

          {/* Branch Filter */}
          <select
            value={branchFilter}
            onChange={(e) => setBranchFilter(e.target.value)}
            className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-300 font-medium focus:outline-none focus:border-emerald-500 cursor-pointer"
          >
            <option value="all">All Branches</option>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search name, email, branch..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
          />
        </div>
      </div>

      {/* Staff Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Registered Staff Roster ({filteredStaff.length})
          </span>
          <span className="text-xs text-slate-500">
            Role &amp; Branch Permissions
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/60 text-slate-400 font-semibold uppercase text-[10px] tracking-wider">
                <th className="py-3 px-4">Full Name</th>
                <th className="py-3 px-4">Email / Login</th>
                <th className="py-3 px-4">Role</th>
                <th className="py-3 px-4">Assigned Branch</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-200">
              {filteredStaff.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-slate-500">
                    No staff members match the current filter criteria.
                  </td>
                </tr>
              ) : (
                filteredStaff.map((staff) => {
                  const isRootAdmin = staff.email.toLowerCase() === "riveroalecjoseph@gmail.com";
                  return (
                    <tr key={staff.id} className="hover:bg-slate-800/40 transition">
                      <td className="py-3 px-4 font-semibold text-white whitespace-nowrap">
                        {staff.fullName}
                      </td>
                      <td className="py-3 px-4 text-slate-400 font-mono text-[11px] whitespace-nowrap">
                        {staff.email}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                            staff.role === "super_admin"
                              ? "bg-purple-500/15 text-purple-300 border border-purple-500/30"
                              : staff.role === "branch_manager"
                                ? "bg-teal-500/15 text-teal-300 border border-teal-500/30"
                                : "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30"
                          }`}
                        >
                          {staff.role === "super_admin"
                            ? "Super Admin"
                            : staff.role === "branch_manager"
                              ? "Branch Manager"
                              : "Cashier"}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-300 whitespace-nowrap">
                        {staff.branchName}
                      </td>
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            staff.status === "active"
                              ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                              : "bg-slate-800 text-slate-500 border border-slate-700"
                          }`}
                        >
                          {staff.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(staff)}
                            className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition cursor-pointer text-[11px] font-semibold flex items-center gap-1"
                            title="Change Branch / Role"
                          >
                            <Edit className="w-3 h-3 text-emerald-400" />
                            <span>Edit</span>
                          </button>

                          {!isRootAdmin && (
                            <button
                              type="button"
                              onClick={() => handleToggleActive(staff)}
                              className={`p-1.5 rounded-lg border transition cursor-pointer ${
                                staff.status === "active"
                                  ? "bg-red-500/10 hover:bg-red-500/20 text-red-400 border-red-500/30"
                                  : "bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                              }`}
                              title={staff.status === "active" ? "Deactivate User" : "Activate User"}
                            >
                              <Power className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Staff Member Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full p-6 shadow-2xl relative text-slate-100">
            <button
              onClick={() => setIsAddModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg bg-slate-800"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2 text-emerald-400 mb-1">
              <UserPlus className="w-6 h-6" />
              <h2 className="text-lg font-bold">Add Staff Member</h2>
            </div>
            <p className="text-xs text-slate-400 mb-5">
              Directly provisions a cashier or branch manager account with login credentials and assigned store.
            </p>

            {addError && (
              <div className="flex items-center gap-2 p-3 mb-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{addError}</span>
              </div>
            )}

            <form onSubmit={handleAddStaffSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Full Name <span className="text-emerald-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={addFullName}
                  onChange={(e) => setAddFullName(e.target.value)}
                  placeholder="e.g. Maria Santos"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Login Email / Username <span className="text-emerald-400">*</span>
                </label>
                <input
                  type="email"
                  required
                  value={addEmail}
                  onChange={(e) => setAddEmail(e.target.value)}
                  placeholder="e.g. maria@rr-pos.com"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Initial Password <span className="text-emerald-400">* (min 6 chars)</span>
                </label>
                <div className="relative">
                  <Lock className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={addPassword}
                    onChange={(e) => setAddPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Assigned Operational Role <span className="text-emerald-400">*</span>
                </label>
                <select
                  value={addRole}
                  onChange={(e) => setAddRole(e.target.value as UserRole)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                >
                  <option value="cashier">Cashier (POS Checkout only)</option>
                  <option value="branch_manager">Branch Manager (POS, Inventory &amp; Transfers)</option>
                </select>
              </div>

              {addRole !== "super_admin" && (
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Assigned Branch <span className="text-emerald-400">*</span>
                  </label>
                  <select
                    value={addBranchId}
                    onChange={(e) => setAddBranchId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                  >
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name} ({b.code})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingAdd}
                  className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg shadow-emerald-950/40 flex items-center justify-center gap-1.5 transition active:scale-95 cursor-pointer disabled:opacity-50"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>{isSubmittingAdd ? "Provisioning..." : "Create Staff Account"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Staff Role & Branch Modal */}
      {editingStaff && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full p-6 shadow-2xl relative text-slate-100">
            <button
              onClick={() => setEditingStaff(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg bg-slate-800"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2 text-emerald-400 mb-1">
              <Edit className="w-6 h-6" />
              <h2 className="text-lg font-bold">Edit Staff Permissions</h2>
            </div>
            <p className="text-xs text-slate-400 mb-5">
              Update role, branch assignment, or active status for <strong className="text-white">{editingStaff.fullName}</strong> ({editingStaff.email}).
            </p>

            <form onSubmit={handleSaveEdit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Operational Role
                </label>
                <select
                  value={editRole}
                  onChange={(e) => setEditRole(e.target.value as UserRole)}
                  disabled={editingStaff.email.toLowerCase() === "riveroalecjoseph@gmail.com"}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 disabled:opacity-50"
                >
                  <option value="cashier">Cashier</option>
                  <option value="branch_manager">Branch Manager</option>
                  <option value="super_admin">Super Admin / Owner</option>
                </select>
              </div>

              {editRole !== "super_admin" && (
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Assigned Branch
                  </label>
                  <select
                    value={editBranchId}
                    onChange={(e) => setEditBranchId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                  >
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name} ({b.code})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="edit-is-active-toggle"
                  checked={editIsActive}
                  onChange={(e) => setEditIsActive(e.target.checked)}
                  disabled={editingStaff.email.toLowerCase() === "riveroalecjoseph@gmail.com"}
                  className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-slate-700 bg-slate-950 cursor-pointer"
                />
                <label htmlFor="edit-is-active-toggle" className="text-xs text-slate-300 font-semibold cursor-pointer">
                  Account is Active (Uncheck to prevent login)
                </label>
              </div>

              <div className="flex gap-3 pt-2">
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
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{isUpdatingStaff ? "Saving Changes..." : "Save Changes"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
