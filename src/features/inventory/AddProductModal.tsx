import React, { useState, useEffect } from "react";
import { useApp } from "../../context/AppContext";
import { X, PlusCircle, AlertCircle, CheckCircle2, Barcode } from "lucide-react";
import { CategoryManagementModal } from "./CategoryManagementModal";

interface AddProductModalProps {
  onClose: () => void;
}

export const AddProductModal: React.FC<AddProductModalProps> = ({
  onClose,
}) => {
  const { categories, addProduct, currentBranch } = useApp();

  const [sku, setSku] = useState<string>("");
  const [barcode, setBarcode] = useState<string>("");
  const [name, setName] = useState<string>("");
  const [categoryId, setCategoryId] = useState<string>(categories[0]?.id || "");
  const [sellingPrice, setSellingPrice] = useState<number>(120);
  const [costPrice, setCostPrice] = useState<number>(80);
  const [initialStock, setInitialStock] = useState<number>(30);
  const [lowStockThreshold, setLowStockThreshold] = useState<number>(10);

  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (categories.length > 0 && !categories.some((c) => c.id === categoryId)) {
      setCategoryId(categories[0].id);
    }
  }, [categories, categoryId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!sku.trim() || !name.trim()) {
      setErrorMessage("SKU Code and Product Name are required.");
      return;
    }
    if (sellingPrice < 0) {
      setErrorMessage("Selling price cannot be negative.");
      return;
    }
    if (costPrice < 0) {
      setErrorMessage("Cost price cannot be negative.");
      return;
    }
    if (initialStock < 0) {
      setErrorMessage("Initial stock quantity cannot be negative.");
      return;
    }

    setIsSubmitting(true);
    const result = await addProduct({
      sku: sku.trim(),
      barcode: barcode.trim() || undefined,
      name: name.trim(),
      categoryId,
      price: sellingPrice,
      costPrice: costPrice,
      initialStock,
      lowStockThreshold,
    });
    setIsSubmitting(false);

    if (result.success) {
      onClose();
    } else {
      setErrorMessage(result.error || "Failed to add product.");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 backdrop-blur-md p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700/80 rounded-3xl max-w-lg w-full p-6 shadow-2xl relative text-slate-100 my-8">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-5 right-5 text-slate-400 hover:text-white p-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-800 transition cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-1">
          <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
            <PlusCircle className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
              Add New Catalog Product
            </h2>
            <p className="text-xs text-slate-400">
              Configure master product details and branch initial inventory
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 mt-5">
          {/* Row 1: Product Name */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Product Name *
            </label>
            <input
              type="text"
              id="product-name-input"
              required
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Organic Jasmine Green Tea"
              className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl text-xs sm:text-sm text-slate-100 font-semibold focus:outline-none transition"
            />
          </div>

          {/* Row 2: Category */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold text-slate-300">
                Category *
              </label>
              <button
                type="button"
                onClick={() => setIsCategoryModalOpen(true)}
                className="text-[11px] font-semibold text-emerald-400 hover:text-emerald-300 hover:underline cursor-pointer"
                title="Add, edit, or delete categories"
              >
                + Manage Categories
              </button>
            </div>
            <select
              id="product-category-select"
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl text-xs sm:text-sm text-slate-100 focus:outline-none transition cursor-pointer"
            >
              {categories.map((c) => (
                <option key={c.id} value={c.id} className="bg-slate-900">
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Row 3: SKU & Barcode */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                SKU Code *
              </label>
              <input
                type="text"
                id="product-sku-input"
                required
                value={sku}
                onChange={(e) => setSku(e.target.value)}
                placeholder="e.g. TEA-001"
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl text-xs sm:text-sm text-slate-100 font-mono focus:outline-none transition"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1">
                <Barcode className="w-3.5 h-3.5 text-slate-400" />
                <span>Barcode (Optional)</span>
              </label>
              <input
                type="text"
                id="product-barcode-input"
                value={barcode}
                onChange={(e) => setBarcode(e.target.value)}
                placeholder="e.g. 890123456789"
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl text-xs sm:text-sm text-slate-100 font-mono focus:outline-none transition"
              />
            </div>
          </div>

          {/* Row 4: Selling Price & Cost Price */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Selling Price (₱) *
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-emerald-400 font-bold text-sm select-none">
                  ₱
                </span>
                <input
                  type="number"
                  id="product-price-input"
                  step="any"
                  min="0"
                  required
                  value={sellingPrice}
                  onChange={(e) =>
                    setSellingPrice(parseFloat(e.target.value) || 0)
                  }
                  className="w-full pl-8 pr-3.5 py-2.5 bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl text-xs sm:text-sm text-emerald-400 font-bold focus:outline-none transition"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Cost Price (₱)
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm select-none">
                  ₱
                </span>
                <input
                  type="number"
                  id="product-cost-input"
                  step="any"
                  min="0"
                  value={costPrice}
                  onChange={(e) =>
                    setCostPrice(parseFloat(e.target.value) || 0)
                  }
                  className="w-full pl-8 pr-3.5 py-2.5 bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl text-xs sm:text-sm text-slate-200 font-semibold focus:outline-none transition"
                />
              </div>
            </div>
          </div>

          {/* Row 5: Initial Stock Quantity & Reorder Point */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-slate-300">
                  Initial Stock
                </label>
                <span className="text-[10px] text-emerald-400 font-semibold truncate max-w-[120px]">
                  {currentBranch?.name || "Current Branch"}
                </span>
              </div>
              <input
                type="number"
                id="product-initial-stock-input"
                min="0"
                value={initialStock}
                onChange={(e) => setInitialStock(parseInt(e.target.value) || 0)}
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl text-xs sm:text-sm text-slate-100 font-bold focus:outline-none transition"
              />
              <p className="text-[10px] text-slate-500 mt-1">
                Other branches will initialize at 0 stock for inter-branch transfers.
              </p>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Reorder Point Alert
              </label>
              <input
                type="number"
                id="product-threshold-input"
                min="1"
                value={lowStockThreshold}
                onChange={(e) =>
                  setLowStockThreshold(parseInt(e.target.value) || 0)
                }
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl text-xs sm:text-sm text-slate-100 font-bold focus:outline-none transition"
              />
              <p className="text-[10px] text-slate-500 mt-1">
                Threshold that triggers low-stock warnings on terminal.
              </p>
            </div>
          </div>

          {errorMessage && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          <div className="flex gap-3 pt-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              id="submit-create-product-btn"
              disabled={isSubmitting}
              className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg shadow-emerald-950/40 flex items-center justify-center gap-1.5 transition active:scale-95 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{isSubmitting ? "Adding..." : "Add to Catalog"}</span>
            </button>
          </div>
        </form>
      </div>

      {isCategoryModalOpen && (
        <CategoryManagementModal onClose={() => setIsCategoryModalOpen(false)} />
      )}
    </div>
  );
};
