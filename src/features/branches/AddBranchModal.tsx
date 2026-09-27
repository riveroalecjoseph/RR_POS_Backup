import React, { useState } from "react";
import { useApp } from "../../context/AppContext";
import { Building2, X, PlusCircle, AlertCircle, CheckCircle2 } from "lucide-react";

interface AddBranchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AddBranchModal: React.FC<AddBranchModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { createBranch, branches, setCurrentBranch } = useApp();

  const [name, setName] = useState<string>("");
  const [code, setCode] = useState<string>("");
  const [address, setAddress] = useState<string>("");
  const [phone, setPhone] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    const trimmedName = name.trim();
    const trimmedCode = code.trim().toUpperCase();

    if (!trimmedName || !trimmedCode) {
      setErrorMessage("Branch name and branch code are required.");
      return;
    }

    if (branches.some((b) => b.code.toUpperCase() === trimmedCode)) {
      setErrorMessage(`Branch code "${trimmedCode}" is already in use.`);
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await createBranch({
        name: trimmedName,
        code: trimmedCode,
        address: address.trim() || undefined,
        contactNumber: phone.trim() || undefined,
      });

      if (result.success && result.branch) {
        setSuccessMessage(`Branch "${result.branch.name}" successfully created and primed for stock transfers!`);
        setCurrentBranch(result.branch);
        setTimeout(() => {
          onClose();
        }, 1200);
      } else {
        setErrorMessage(result.error || "Failed to create branch.");
      }
    } catch (err: any) {
      setErrorMessage(err.message || "An unexpected error occurred.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full p-6 shadow-2xl relative text-slate-100">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg bg-slate-800 transition cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2.5 text-emerald-400 mb-1">
          <Building2 className="w-6 h-6" />
          <h2 className="text-lg font-bold">Add New Branch</h2>
        </div>
        <p className="text-xs text-slate-400 mb-5">
          Provision a physical or virtual retail location. All catalog items will automatically receive initial zero-stock records for instant transfer recognition.
        </p>

        {errorMessage && (
          <div className="flex items-center gap-2 p-3 mb-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {successMessage && (
          <div className="flex items-center gap-2 p-3 mb-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Branch Name <span className="text-emerald-400">*</span>
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Downtown Mall Flagship"
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Branch Code / Prefix <span className="text-emerald-400">*</span>
            </label>
            <input
              type="text"
              required
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="e.g. DT-01"
              maxLength={10}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs font-mono font-bold text-emerald-400 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
            />
            <p className="text-[10px] text-slate-500 mt-1">
              Used for transaction receipts and transfer order sequencing.
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Physical Address
            </label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="e.g. Level 2, Grand Galleria, Commercial District"
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Contact Phone
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="e.g. +63 917 123 4567"
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg shadow-emerald-950/40 flex items-center justify-center gap-1.5 transition active:scale-95 cursor-pointer disabled:opacity-50"
            >
              <PlusCircle className="w-4 h-4" />
              <span>{isSubmitting ? "Creating Branch..." : "Create Branch"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
