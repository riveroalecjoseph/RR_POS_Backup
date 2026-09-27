import React, { useState } from "react";
import { useApp } from "../../context/AppContext";
import { X, Send, Plus, Trash2, AlertCircle } from "lucide-react";

interface TransferDispatchModalProps {
  onClose: () => void;
}

interface DraftItem {
  productId: string;
  quantity: number;
}

export const TransferDispatchModal: React.FC<TransferDispatchModalProps> = ({
  onClose,
}) => {
  const {
    branches,
    currentBranch,
    products,
    branchStock,
    dispatchTransfer,
    isPracticeMode,
    isBranchInPracticeMode,
  } = useApp();

  // Other branches excluding current branch
  const availableTargetBranches = branches.filter(
    (b) => b.id !== currentBranch?.id,
  );

  // Prefer a target branch matching current branch's mode if possible
  const defaultTarget =
    availableTargetBranches.find(
      (b) =>
        (isBranchInPracticeMode(b.id) || Boolean(b.isPracticeMode)) ===
        isPracticeMode,
    ) || availableTargetBranches[0];

  const [targetBranchId, setTargetBranchId] = useState<string>(
    defaultTarget?.id || "",
  );
  const [items, setItems] = useState<DraftItem[]>([
    { productId: products[0]?.id || "", quantity: 5 },
  ]);
  const [notes, setNotes] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const selectedTargetBranch = branches.find((b) => b.id === targetBranchId);
  const targetIsPractice = selectedTargetBranch
    ? isBranchInPracticeMode(selectedTargetBranch.id) ||
      Boolean(selectedTargetBranch.isPracticeMode)
    : false;
  const isModeMismatched = isPracticeMode !== targetIsPractice;

  const handleAddItem = () => {
    // Pick the first product not already in the list
    const remainingProd = products.find(
      (p) => !items.some((it) => it.productId === p.id),
    );
    if (remainingProd) {
      setItems((prev) => [
        ...prev,
        { productId: remainingProd.id, quantity: 5 },
      ]);
    }
  };

  const handleRemoveItem = (index: number) => {
    setItems((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleUpdateItem = (
    index: number,
    field: keyof DraftItem,
    val: string | number,
  ) => {
    setItems((prev) =>
      prev.map((item, idx) => {
        if (idx === index) {
          return { ...item, [field]: val };
        }
        return item;
      }),
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!targetBranchId) {
      setErrorMessage("Please select a destination target branch.");
      return;
    }

    if (items.length === 0) {
      setErrorMessage("Please add at least one item to transfer.");
      return;
    }

    // Check availability
    for (const it of items) {
      const available =
        branchStock.find((s) => s.productId === it.productId)?.quantity ?? 0;
      if (it.quantity <= 0) {
        setErrorMessage("Item quantities must be greater than zero.");
        return;
      }
      if (it.quantity > available) {
        const prod = products.find((p) => p.id === it.productId);
        setErrorMessage(
          `Insufficient stock for "${prod?.name}". Requested: ${it.quantity}, Available: ${available}.`,
        );
        return;
      }
    }

    setIsSubmitting(true);
    const result = await dispatchTransfer(targetBranchId, items, notes);
    setIsSubmitting(false);

    if (result.success) {
      onClose();
    } else {
      setErrorMessage(result.error || "Failed to dispatch transfer.");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-lg w-full p-6 shadow-2xl relative text-slate-100">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg bg-slate-800"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2.5 text-emerald-400">
            <Send className="w-5 h-5" />
            <h2 className="text-lg font-bold">
              {isPracticeMode ? "Dispatch Sandbox Transfer" : "Dispatch Inter-Branch Transfer"}
            </h2>
          </div>
          {isPracticeMode ? (
            <span className="text-[11px] font-bold uppercase tracking-wider text-purple-400 bg-purple-500/15 px-2.5 py-1 rounded-full border border-purple-500/30">
              🧪 Practice Sandbox
            </span>
          ) : (
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400 bg-emerald-500/15 px-2.5 py-1 rounded-full border border-emerald-500/30">
              🟢 Live Production
            </span>
          )}
        </div>
        <p className="text-xs text-slate-400 mb-4">
          Step 1: Stock is immediately deducted from{" "}
          <span className="font-semibold text-slate-200">
            {currentBranch?.name}
          </span>{" "}
          {isPracticeMode ? "(Sandbox Stock)" : "(Live Stock)"} and placed in{" "}
          <span className="font-mono text-emerald-400">IN_TRANSIT</span> status.
        </p>

        {isModeMismatched && (
          <div className="mb-4 p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl flex items-start gap-2.5 text-xs text-amber-300">
            <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold">Guardrail Boundary Enforced:</span>{" "}
              You cannot transfer stock between a{" "}
              <span className="font-semibold underline">
                {isPracticeMode ? "Practice Sandbox" : "Live Production"}
              </span>{" "}
              branch and a{" "}
              <span className="font-semibold underline">
                {targetIsPractice ? "Practice Sandbox" : "Live Production"}
              </span>{" "}
              branch. Both branches must operate in the same mode.
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Destination Branch */}
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1.5">
              Target Receiving Branch
            </label>
            <select
              id="target-branch-select"
              value={targetBranchId}
              onChange={(e) => setTargetBranchId(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-slate-100 text-xs sm:text-sm font-medium focus:outline-none focus:border-emerald-500"
            >
              {availableTargetBranches.map((b) => {
                const bIsPractice = isBranchInPracticeMode(b.id) || Boolean(b.isPracticeMode);
                return (
                  <option key={b.id} value={b.id} className="bg-slate-900">
                    {b.name} ({b.code}) — {bIsPractice ? "🧪 Practice Sandbox" : "🟢 Live Store"}
                  </option>
                );
              })}
            </select>
          </div>

          {/* Transfer Items List */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-slate-400">
                Transfer Items &amp; Quantities
              </label>
              <button
                type="button"
                id="add-transfer-item-btn"
                onClick={handleAddItem}
                className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Item</span>
              </button>
            </div>

            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
              {items.map((item, idx) => {
                const stock =
                  branchStock.find((s) => s.productId === item.productId)
                    ?.quantity ?? 0;
                return (
                  <div
                    key={idx}
                    className="flex items-center gap-2 p-2.5 bg-slate-950/60 border border-slate-800 rounded-xl"
                  >
                    <select
                      id={`transfer-product-select-${idx}`}
                      value={item.productId}
                      onChange={(e) =>
                        handleUpdateItem(idx, "productId", e.target.value)
                      }
                      className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
                    >
                      {products.map((p) => {
                        const available =
                          branchStock.find((s) => s.productId === p.id)
                            ?.quantity ?? 0;
                        return (
                          <option
                            key={p.id}
                            value={p.id}
                            className="bg-slate-900"
                          >
                            {p.name} ({available} avail)
                          </option>
                        );
                      })}
                    </select>

                    <div className="w-20">
                      <input
                        type="number"
                        id={`transfer-item-qty-${idx}`}
                        min="1"
                        max={stock}
                        value={item.quantity}
                        onChange={(e) =>
                          handleUpdateItem(
                            idx,
                            "quantity",
                            parseInt(e.target.value) || 0,
                          )
                        }
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1.5 text-xs font-bold text-center text-slate-100 focus:outline-none focus:border-emerald-500"
                      />
                    </div>

                    {items.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(idx)}
                        className="p-1 text-slate-500 hover:text-red-400 transition"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Shipment Notes */}
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1.5">
              Shipment Notes / Manifest (Optional)
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Courier: Lalamove / Driver Juan, sealed in crate #3"
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-slate-100 text-xs focus:outline-none focus:border-emerald-500"
            />
          </div>

          {errorMessage && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

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
              disabled={isSubmitting || isModeMismatched}
              className={`flex-1 py-2.5 rounded-xl text-white text-xs font-bold shadow-lg flex items-center justify-center gap-1.5 transition active:scale-95 ${
                isModeMismatched
                  ? "bg-slate-700 text-slate-400 cursor-not-allowed"
                  : "bg-emerald-600 hover:bg-emerald-500 shadow-emerald-950/40 cursor-pointer"
              }`}
            >
              <Send className="w-4 h-4" />
              <span>
                {isSubmitting
                  ? "Dispatching..."
                  : isModeMismatched
                    ? "Mode Mismatch (Blocked)"
                    : "Dispatch Shipment"}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
