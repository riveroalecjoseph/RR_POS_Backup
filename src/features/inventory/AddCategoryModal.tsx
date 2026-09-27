import React, { useState, useEffect } from "react";
import { useApp } from "../../context/AppContext";
import {
  X,
  Tags,
  CheckCircle2,
  AlertCircle,
  Palette,
  Sparkles,
  ArrowUpDown,
} from "lucide-react";
import { EXPANDED_PALETTE } from "./CategoryManagementModal";

interface AddCategoryModalProps {
  onClose: () => void;
}

export const AddCategoryModal: React.FC<AddCategoryModalProps> = ({ onClose }) => {
  const { categories, addCategory } = useApp();

  const [name, setName] = useState<string>("");
  const [slug, setSlug] = useState<string>("");
  const [isSlugManuallyEdited, setIsSlugManuallyEdited] = useState<boolean>(false);
  const [displayOrder, setDisplayOrder] = useState<number>(categories.length + 1);
  const [color, setColor] = useState<string>(() => {
    const used = new Set(categories.map((c) => c.color?.toLowerCase()));
    const available = EXPANDED_PALETTE.find((p) => !used.has(p.value.toLowerCase()));
    return available ? available.value : "#10b981";
  });

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Auto-generate slug when name changes, unless user manually edited slug
  useEffect(() => {
    if (!isSlugManuallyEdited) {
      const generated = name
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9_-]+/g, "-")
        .replace(/^-+|-+$/g, "");
      setSlug(generated);
    }
  }, [name, isSlugManuallyEdited]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const cleanName = name.trim();
    if (!cleanName) {
      setErrorMessage("Category name is required.");
      return;
    }

    const cleanSlug = slug.trim()
      ? slug.trim().toLowerCase().replace(/[^a-z0-9_-]+/g, "-")
      : cleanName.toLowerCase().replace(/[^a-z0-9_-]+/g, "-");

    if (!cleanSlug) {
      setErrorMessage("A valid category slug identifier is required.");
      return;
    }

    setIsSubmitting(true);
    const result = await addCategory(cleanName, color, cleanSlug, displayOrder);
    setIsSubmitting(false);

    if (result.success) {
      onClose();
    } else {
      setErrorMessage(result.error || "Failed to create category.");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-md p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700/80 rounded-3xl max-w-md w-full p-6 shadow-2xl relative text-slate-100 animate-in fade-in zoom-in-95 duration-150">
        <button
          onClick={onClose}
          type="button"
          className="absolute top-5 right-5 text-slate-400 hover:text-white p-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-800 transition cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-1">
          <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
            <Tags className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
              Add New Category
            </h2>
            <p className="text-xs text-slate-400">
              Configure name, slug, badge color, and display sequence
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 mt-5">
          {/* Category Name */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Category Name *
            </label>
            <input
              type="text"
              id="category-name-input"
              required
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Specialty Beverages, Fresh Pastries"
              className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl text-xs sm:text-sm text-slate-100 font-medium focus:outline-none transition"
            />
          </div>

          {/* Slug Identifier */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold text-slate-300">
                Category Slug *
              </label>
              <button
                type="button"
                onClick={() => {
                  setIsSlugManuallyEdited(false);
                  setSlug(
                    name
                      .toLowerCase()
                      .trim()
                      .replace(/[^a-z0-9_-]+/g, "-")
                      .replace(/^-+|-+$/g, ""),
                  );
                }}
                className="text-[11px] font-semibold text-emerald-400 hover:text-emerald-300 transition cursor-pointer flex items-center gap-1"
                title="Regenerate slug from category name"
              >
                <Sparkles className="w-3 h-3" />
                <span>Auto-generate</span>
              </button>
            </div>
            <input
              type="text"
              id="category-slug-input"
              required
              value={slug}
              onChange={(e) => {
                setIsSlugManuallyEdited(true);
                setSlug(e.target.value);
              }}
              placeholder="specialty-beverages"
              className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl text-xs sm:text-sm text-slate-100 font-mono focus:outline-none transition"
            />
            <p className="text-[10px] text-slate-500 mt-1">
              URL-friendly unique handle used for routing and fast catalog indexing.
            </p>
          </div>

          {/* Display Order Sequence */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
              <ArrowUpDown className="w-3.5 h-3.5 text-emerald-400" />
              <span>Display Order Sequence *</span>
            </label>
            <input
              type="number"
              id="category-display-order-input"
              required
              min="0"
              step="1"
              value={displayOrder}
              onChange={(e) => setDisplayOrder(parseInt(e.target.value) || 0)}
              className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl text-xs sm:text-sm text-slate-100 font-bold focus:outline-none transition"
            />
            <p className="text-[10px] text-slate-500 mt-1">
              Determines category order in the POS menu bar and inventory tabs (lower numbers appear first).
            </p>
          </div>

          {/* Badge Color Swatch */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
              <Palette className="w-3.5 h-3.5 text-emerald-400" />
              <span>Category Badge Color</span>
            </label>
            <div className="flex flex-wrap items-center gap-1.5 p-2 bg-slate-950/80 rounded-xl border border-slate-800">
              {EXPANDED_PALETTE.map((p) => {
                const isSelected = color.toLowerCase() === p.value.toLowerCase();
                return (
                  <button
                    key={p.value}
                    type="button"
                    onClick={() => setColor(p.value)}
                    style={{ backgroundColor: p.value }}
                    className={`w-5 h-5 rounded-full transition cursor-pointer ${
                      isSelected
                        ? "ring-2 ring-white ring-offset-2 ring-offset-slate-950 scale-110 shadow-lg"
                        : "opacity-80 hover:opacity-100 hover:scale-105"
                    }`}
                    title={p.name}
                  />
                );
              })}
              <div className="ml-auto flex items-center gap-1.5 pl-2 border-l border-slate-800 text-[10px] font-mono text-slate-400">
                <span
                  className="w-3 h-3 rounded-full border border-white/20 shadow-sm"
                  style={{ backgroundColor: color }}
                />
                <span>{color.toUpperCase()}</span>
              </div>
            </div>
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
              id="submit-create-category-btn"
              disabled={isSubmitting}
              className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg shadow-emerald-950/40 flex items-center justify-center gap-1.5 transition active:scale-95 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{isSubmitting ? "Creating..." : "Save Category"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
