import React, { useState } from "react";
import { useApp } from "../../context/AppContext";
import { MovementType, Product } from "../../types";
import { X, Sliders, AlertCircle, CheckCircle2 } from "lucide-react";

interface StockAdjustmentModalProps {
  onClose: () => void;
  preselectedProduct?: Product;
}

export const StockAdjustmentModal: React.FC<StockAdjustmentModalProps> = ({
  onClose,
  preselectedProduct,
}) => {
  const { products, branchStock, adjustStock, currentBranch } = useApp();
  const [productId, setProductId] = useState<string>(
    preselectedProduct?.id || products[0]?.id || "",
  );
  const [adjustmentType, setAdjustmentType] = useState<MovementType>("Restock");
  const [quantity, setQuantity] = useState<number>(10);
  const [notes, setNotes] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const currentStockItem = branchStock.find((s) => s.productId === productId);
  const currentQuantity = currentStockItem?.quantity ?? 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (quantity <= 0) {
      setErrorMessage("Quantity must be greater than zero.");
      return;
    }

    if (
      (adjustmentType === "Waste/Spoilage" ||
        adjustmentType === "Gift/Promo") &&
      quantity > currentQuantity
    ) {
      setErrorMessage(
        `Cannot deduct ${quantity} units. Only ${currentQuantity} available in current branch.`,
      );
      return;
    }

    setIsSubmitting(true);
    const result = await adjustStock(
      productId,
      adjustmentType,
      quantity,
      notes,
    );
    setIsSubmitting(false);

    if (result.success) {
      onClose();
    } else {
      setErrorMessage(result.error || "Adjustment failed.");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full p-6 shadow-2xl relative text-slate-100">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg bg-slate-800"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2.5 text-emerald-400 mb-1">
          <Sliders className="w-5 h-5" />
          <h2 className="text-lg font-bold">Stock Adjustment</h2>
        </div>
        <p className="text-xs text-slate-400 mb-5">
          Branch:{" "}
          <span className="font-semibold text-slate-200">
            {currentBranch?.name}
          </span>
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Product Picker */}
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1.5">
              Select Product
            </label>
            <select
              value={productId}
              onChange={(e) => setProductId(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-slate-100 text-xs sm:text-sm font-medium focus:outline-none focus:border-emerald-500"
            >
              {products.map((p) => {
                const stock =
                  branchStock.find((s) => s.productId === p.id)?.quantity ?? 0;
                return (
                  <option key={p.id} value={p.id} className="bg-slate-900">
                    {p.name} ({p.sku}) — {stock} in stock
                  </option>
                );
              })}
            </select>
          </div>

          {/* Current Stock Banner */}
          <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3 flex justify-between items-center text-xs">
            <span className="text-slate-400">Current Branch Balance:</span>
            <span className="font-bold text-emerald-400 text-sm">
              {currentQuantity} units
            </span>
          </div>

          {/* Adjustment Reason / Type */}
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1.5">
              Adjustment Type
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(
                ["Restock", "Waste/Spoilage", "Gift/Promo"] as MovementType[]
              ).map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setAdjustmentType(type)}
                  className={`py-2 px-2 text-center text-xs font-semibold rounded-xl border transition ${
                    adjustmentType === type
                      ? type === "Restock"
                        ? "bg-emerald-500/10 border-emerald-500 text-emerald-400"
                        : "bg-amber-500/10 border-amber-500 text-amber-400"
                      : "bg-slate-800/60 border-slate-700 text-slate-300 hover:bg-slate-800"
                  }`}
                >
                  {type === "Restock"
                    ? "+ Restock"
                    : type === "Waste/Spoilage"
                      ? "- Spoilage"
                      : "- Gift/Promo"}
                </button>
              ))}
            </div>
          </div>

          {/* Quantity Input */}
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1.5">
              Quantity to {adjustmentType === "Restock" ? "Add" : "Deduct"}
            </label>
            <input
              type="number"
              min="1"
              value={quantity}
              onChange={(e) => setQuantity(parseInt(e.target.value) || 0)}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-slate-100 text-base font-bold focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* Notes / Reason */}
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1.5">
              Audit Notes / Reference (Optional)
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Supplier PO #4092, batch inspection, expired items"
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
              className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg shadow-emerald-950/40 flex items-center justify-center gap-1.5 transition active:scale-95 cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{isSubmitting ? "Recording..." : "Commit Adjustment"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
