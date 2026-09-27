import React, { useState, useMemo, useEffect, useRef } from "react";
import { useApp } from "../../context/AppContext";
import {
  X,
  Tags,
  Plus,
  Pencil,
  Trash2,
  Check,
  AlertCircle,
  CheckCircle2,
  AlertTriangle,
  Palette,
} from "lucide-react";

interface CategoryManagementModalProps {
  onClose: () => void;
}

export const EXPANDED_PALETTE = [
  { name: "Emerald", value: "#10b981" },
  { name: "Teal", value: "#14b8a6" },
  { name: "Cyan", value: "#06b6d4" },
  { name: "Sky", value: "#0ea5e9" },
  { name: "Blue", value: "#3b82f6" },
  { name: "Indigo", value: "#6366f1" },
  { name: "Violet", value: "#8b5cf6" },
  { name: "Purple", value: "#a855f7" },
  { name: "Fuchsia", value: "#d946ef" },
  { name: "Pink", value: "#ec4899" },
  { name: "Rose", value: "#f43f5e" },
  { name: "Red", value: "#ef4444" },
  { name: "Orange", value: "#f97316" },
  { name: "Amber", value: "#f59e0b" },
  { name: "Yellow", value: "#eab308" },
  { name: "Lime", value: "#84cc16" },
];

export const CategoryManagementModal: React.FC<CategoryManagementModalProps> = ({
  onClose,
}) => {
  const {
    categories,
    products,
    addCategory,
    updateCategory,
    deleteCategory,
  } = useApp();

  // Map of used colors to category name (for collision detection)
  const usedColorMap = useMemo(() => {
    const map: Record<string, string> = {};
    for (const c of categories) {
      if (c.color) {
        map[c.color.toLowerCase()] = c.name;
      }
    }
    return map;
  }, [categories]);

  // Find next unused color from palette to avoid repetitions
  const getNextAvailableColor = (excludeCatId?: string) => {
    const used = new Set(
      categories
        .filter((c) => c.id !== excludeCatId && c.color)
        .map((c) => c.color!.toLowerCase())
    );
    const available = EXPANDED_PALETTE.find(
      (p) => !used.has(p.value.toLowerCase())
    );
    if (available) return available.value;
    // Generate unique random color if all 16 are used
    return `#${Math.floor(Math.random() * 16777215)
      .toString(16)
      .padStart(6, "0")}`;
  };

  // Create new category state
  const [newCatName, setNewCatName] = useState<string>("");
  const [newCatSlug, setNewCatSlug] = useState<string>("");
  const [newCatDisplayOrder, setNewCatDisplayOrder] = useState<number>(categories.length + 1);
  const [newCatColor, setNewCatColor] = useState<string>(() =>
    getNextAvailableColor()
  );

  // Edit existing category state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState<string>("");
  const [editSlug, setEditSlug] = useState<string>("");
  const [editDisplayOrder, setEditDisplayOrder] = useState<number>(1);
  const [editColor, setEditColor] = useState<string>(EXPANDED_PALETTE[0].value);

  // Quick color edit popover state
  const [quickColorCatId, setQuickColorCatId] = useState<string | null>(null);

  // Delete / Reassign flow state
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [reassignTargetId, setReassignTargetId] = useState<string>("");

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Hidden native color picker input ref for custom selection
  const newColorPickerRef = useRef<HTMLInputElement>(null);
  const editColorPickerRef = useRef<HTMLInputElement>(null);

  // Count products by category
  const productCounts = useMemo(() => {
    const map: Record<string, number> = {};
    for (const p of products) {
      map[p.categoryId] = (map[p.categoryId] || 0) + 1;
    }
    return map;
  }, [products]);

  // Update default new color when categories change
  useEffect(() => {
    setNewCatColor(getNextAvailableColor());
  }, [categories]);

  // Handle Add Category
  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!newCatName.trim()) {
      setErrorMessage("Please enter a category name.");
      return;
    }

    setIsSubmitting(true);
    const result = await addCategory(
      newCatName.trim(),
      newCatColor,
      newCatSlug.trim() || undefined,
      newCatDisplayOrder,
    );
    setIsSubmitting(false);

    if (result.success) {
      setNewCatName("");
      setNewCatSlug("");
      setNewCatDisplayOrder(categories.length + 2);
      setNewCatColor(getNextAvailableColor());
      setSuccessMessage(`Category "${result.category?.name}" added successfully.`);
      setTimeout(() => setSuccessMessage(null), 2500);
    } else {
      setErrorMessage(result.error || "Failed to add category.");
    }
  };

  // Start Editing Full Row
  const startEditing = (catId: string, currentName: string, currentColor?: string, currentSlug?: string, currentOrder?: number) => {
    setEditingId(catId);
    setEditName(currentName);
    setEditSlug(currentSlug || "");
    setEditDisplayOrder(currentOrder ?? 0);
    setEditColor(currentColor || EXPANDED_PALETTE[0].value);
    setQuickColorCatId(null);
    setDeletingId(null);
    setErrorMessage(null);
  };

  // Save Edit
  const handleSaveEdit = async (catId: string) => {
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!editName.trim()) {
      setErrorMessage("Category name cannot be empty.");
      return;
    }

    setIsSubmitting(true);
    const result = await updateCategory(
      catId,
      editName.trim(),
      editColor,
      editSlug.trim() || undefined,
      editDisplayOrder,
    );
    setIsSubmitting(false);

    if (result.success) {
      setEditingId(null);
      setSuccessMessage(`Category updated to "${editName.trim()}".`);
      setTimeout(() => setSuccessMessage(null), 2500);
    } else {
      setErrorMessage(result.error || "Failed to update category.");
    }
  };

  // Quick Change Color directly
  const handleQuickColorChange = async (catId: string, catName: string, newColor: string) => {
    setIsSubmitting(true);
    const result = await updateCategory(catId, catName, newColor);
    setIsSubmitting(false);
    if (result.success) {
      setQuickColorCatId(null);
      setSuccessMessage(`Color updated for "${catName}".`);
      setTimeout(() => setSuccessMessage(null), 2000);
    } else {
      setErrorMessage(result.error || "Failed to change color.");
    }
  };

  // Start Delete Flow
  const startDelete = (catId: string) => {
    const remaining = categories.filter((c) => c.id !== catId);
    setDeletingId(catId);
    setEditingId(null);
    setQuickColorCatId(null);
    setErrorMessage(null);
    if (remaining.length > 0) {
      setReassignTargetId(remaining[0].id);
    }
  };

  // Confirm Delete
  const handleConfirmDelete = async (catId: string) => {
    setErrorMessage(null);
    setSuccessMessage(null);

    const count = productCounts[catId] || 0;
    if (count > 0 && !reassignTargetId) {
      setErrorMessage("Please select a category to reassign existing products to.");
      return;
    }

    setIsSubmitting(true);
    const result = await deleteCategory(catId, count > 0 ? reassignTargetId : undefined);
    setIsSubmitting(false);

    if (result.success) {
      setDeletingId(null);
      setSuccessMessage("Category removed successfully.");
      setTimeout(() => setSuccessMessage(null), 2500);
    } else {
      setErrorMessage(result.error || "Failed to delete category.");
    }
  };

  // Check if a color is duplicate for new category
  const newColorDuplicateName = usedColorMap[newCatColor.toLowerCase()];

  // Check if a color is duplicate for category being edited
  const editColorDuplicateName =
    usedColorMap[editColor.toLowerCase()] &&
    categories.find((c) => c.id === editingId)?.name !== usedColorMap[editColor.toLowerCase()]
      ? usedColorMap[editColor.toLowerCase()]
      : undefined;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/45 backdrop-blur-md p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700/80 rounded-3xl max-w-xl w-full p-6 shadow-2xl relative text-slate-100 animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-slate-400 hover:text-white p-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-800 transition cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3 mb-1">
          <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
            <Tags className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
              Manage Categories
            </h2>
            <p className="text-xs text-slate-400">
              Customize categories, assign unique badge colors, or remove unused ones
            </p>
          </div>
        </div>

        {/* Notification alerts */}
        {errorMessage && (
          <div className="flex items-center gap-2 p-3 mt-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}
        {successMessage && (
          <div className="flex items-center gap-2 p-3 mt-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Create Category Section */}
        <form onSubmit={handleAddCategory} className="mt-4 pb-4 border-b border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <label className="block text-xs font-semibold text-slate-300">
              Add New Category
            </label>
            {newColorDuplicateName && (
              <span className="text-[10px] text-amber-400 font-medium flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" />
                Color already used by &quot;{newColorDuplicateName}&quot;
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
            <div className="sm:col-span-5">
              <label className="block text-[11px] font-semibold text-slate-400 mb-1">Name *</label>
              <input
                type="text"
                id="new-category-input"
                value={newCatName}
                onChange={(e) => {
                  setNewCatName(e.target.value);
                  setNewCatSlug(e.target.value.toLowerCase().trim().replace(/[^a-z0-9_-]+/g, "-"));
                }}
                placeholder="e.g. Specialty Coffee"
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl text-xs text-slate-100 focus:outline-none transition"
              />
            </div>
            <div className="sm:col-span-4">
              <label className="block text-[11px] font-semibold text-slate-400 mb-1">Slug *</label>
              <input
                type="text"
                id="new-category-slug-input"
                value={newCatSlug}
                onChange={(e) => setNewCatSlug(e.target.value)}
                placeholder="specialty-coffee"
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl text-xs text-slate-100 font-mono focus:outline-none transition"
              />
            </div>
            <div className="sm:col-span-3 flex items-end gap-1.5">
              <div className="flex-1">
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">Order</label>
                <input
                  type="number"
                  min="0"
                  id="new-category-order-input"
                  value={newCatDisplayOrder}
                  onChange={(e) => setNewCatDisplayOrder(parseInt(e.target.value) || 0)}
                  className="w-full px-2 py-2 bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl text-xs text-slate-100 font-bold focus:outline-none transition text-center"
                />
              </div>
              <button
                type="submit"
                id="submit-add-category-btn"
                disabled={isSubmitting || !newCatName.trim()}
                className="px-3.5 py-2 h-[34px] rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md flex items-center justify-center gap-1 transition active:scale-95 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add</span>
              </button>
            </div>
          </div>

          {/* Palette Swatches & Custom Color Picker */}
          <div className="flex flex-wrap items-center gap-1.5 p-2 bg-slate-950/80 rounded-xl border border-slate-800">
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mr-1 shrink-0">
              Color:
            </span>
            {EXPANDED_PALETTE.map((c) => {
              const isUsed = Boolean(usedColorMap[c.value.toLowerCase()]);
              const isSelected = newCatColor.toLowerCase() === c.value.toLowerCase();
              return (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => setNewCatColor(c.value)}
                  style={{ backgroundColor: c.value }}
                  className={`relative w-5 h-5 rounded-full transition cursor-pointer ${
                    isSelected
                      ? "ring-2 ring-white ring-offset-2 ring-offset-slate-950 scale-110 shadow-lg"
                      : "opacity-80 hover:opacity-100 hover:scale-105"
                  }`}
                  title={`${c.name}${
                    isUsed ? ` (in use by ${usedColorMap[c.value.toLowerCase()]})` : " (available)"
                  }`}
                >
                  {isUsed && !isSelected && (
                    <span className="absolute inset-0 m-auto w-1 h-1 rounded-full bg-black/60 pointer-events-none" />
                  )}
                </button>
              );
            })}

            {/* Custom Color Input / Eyedropper button */}
            <div className="relative flex items-center ml-1">
              <button
                type="button"
                onClick={() => newColorPickerRef.current?.click()}
                className="flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-900 hover:bg-slate-850 border border-slate-700 hover:border-emerald-400 text-slate-300 text-[11px] transition cursor-pointer"
                title="Choose custom color from color wheel"
              >
                <Palette className="w-3.5 h-3.5 text-emerald-400" />
                <span className="hidden sm:inline">Custom</span>
              </button>
              <input
                ref={newColorPickerRef}
                type="color"
                value={newCatColor}
                onChange={(e) => setNewCatColor(e.target.value)}
                className="sr-only"
              />
            </div>

            {/* Current Color Preview Swatch */}
            <div className="ml-auto flex items-center gap-1.5 pl-2 border-l border-slate-800 text-[10px] font-mono text-slate-400">
              <span
                className="w-3 h-3 rounded-full border border-white/20 shadow-sm"
                style={{ backgroundColor: newCatColor }}
              />
              <span>{newCatColor.toUpperCase()}</span>
            </div>
          </div>
        </form>

        {/* Categories List */}
        <div className="flex-1 overflow-y-auto mt-4 pr-1 space-y-2.5">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 px-1">
            Current Categories ({categories.length})
          </div>

          {categories.map((cat) => {
            const count = productCounts[cat.id] || 0;
            const isEditing = editingId === cat.id;
            const isDeleting = deletingId === cat.id;
            const isQuickColor = quickColorCatId === cat.id;

            return (
              <div
                key={cat.id}
                className="p-3 bg-slate-950/70 border border-slate-800 rounded-2xl flex flex-col gap-2 transition hover:border-slate-700"
              >
                {/* Normal Row Display */}
                {!isEditing && !isDeleting && (
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      {/* Clickable color dot to quick change color */}
                      <button
                        type="button"
                        onClick={() =>
                          setQuickColorCatId(isQuickColor ? null : cat.id)
                        }
                        className="relative group p-0.5 rounded-full hover:ring-2 hover:ring-emerald-400/60 transition cursor-pointer shrink-0"
                        title="Click to change color"
                      >
                        <span
                          className="w-3.5 h-3.5 rounded-full block shadow-sm"
                          style={{ backgroundColor: cat.color || "#10b981" }}
                        />
                      </button>
                      <span className="font-semibold text-xs sm:text-sm text-slate-100 truncate">
                        {cat.name}
                      </span>
                      <span className="text-[10px] font-medium text-slate-400 bg-slate-800/80 px-2 py-0.5 rounded-full shrink-0">
                        {count} product{count === 1 ? "" : "s"}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => startEditing(cat.id, cat.name, cat.color, cat.slug, cat.displayOrder ?? cat.display_order)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-400 hover:bg-slate-800/80 transition cursor-pointer"
                        title="Edit category name and color"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => startDelete(cat.id)}
                        disabled={categories.length <= 1}
                        className={`p-1.5 rounded-lg transition cursor-pointer ${
                          categories.length <= 1
                            ? "text-slate-600 cursor-not-allowed"
                            : "text-slate-400 hover:text-red-400 hover:bg-slate-800/80"
                        }`}
                        title={
                          categories.length <= 1
                            ? "Cannot delete the only remaining category"
                            : "Delete category"
                        }
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                )}

                {/* Quick Color Picker Tray (Toggled by clicking the color dot) */}
                {isQuickColor && !isEditing && !isDeleting && (
                  <div className="pt-2 border-t border-slate-850 flex flex-col gap-2 animate-in fade-in duration-150">
                    <div className="flex items-center justify-between text-[11px] text-slate-300">
                      <span>Choose unique color for &quot;{cat.name}&quot;:</span>
                      <button
                        type="button"
                        onClick={() => setQuickColorCatId(null)}
                        className="text-slate-400 hover:text-slate-200"
                      >
                        Close
                      </button>
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5 p-2 bg-slate-900 rounded-xl border border-slate-800">
                      {EXPANDED_PALETTE.map((c) => {
                        const isUsedByOther =
                          usedColorMap[c.value.toLowerCase()] &&
                          usedColorMap[c.value.toLowerCase()] !== cat.name;
                        const isCurrent =
                          (cat.color || "").toLowerCase() === c.value.toLowerCase();
                        return (
                          <button
                            key={c.value}
                            type="button"
                            onClick={() =>
                              handleQuickColorChange(cat.id, cat.name, c.value)
                            }
                            style={{ backgroundColor: c.value }}
                            className={`relative w-5 h-5 rounded-full transition cursor-pointer ${
                              isCurrent
                                ? "ring-2 ring-white ring-offset-2 ring-offset-slate-900 scale-110 shadow-lg"
                                : "opacity-80 hover:opacity-100 hover:scale-105"
                            }`}
                            title={`${c.name}${
                              isUsedByOther
                                ? ` (in use by ${usedColorMap[c.value.toLowerCase()]})`
                                : " (available)"
                            }`}
                          >
                            {isUsedByOther && !isCurrent && (
                              <span className="absolute inset-0 m-auto w-1 h-1 rounded-full bg-black/60 pointer-events-none" />
                            )}
                          </button>
                        );
                      })}
                      {/* Custom color input */}
                      <label
                        className="flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-850 border border-slate-700 hover:border-emerald-400 text-slate-300 text-[10px] transition cursor-pointer"
                        title="Pick custom color"
                      >
                        <Palette className="w-3 h-3 text-emerald-400" />
                        <span>Custom</span>
                        <input
                          type="color"
                          value={cat.color || "#10b981"}
                          onChange={(e) =>
                            handleQuickColorChange(cat.id, cat.name, e.target.value)
                          }
                          className="sr-only"
                        />
                      </label>
                    </div>
                  </div>
                )}

                {/* Inline Editing Mode */}
                {isEditing && (
                  <div className="flex flex-col gap-2.5 pt-1">
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="flex-1 px-3 py-1.5 bg-slate-900 border border-emerald-500/60 rounded-xl text-xs sm:text-sm text-slate-100 focus:outline-none"
                        autoFocus
                      />
                      <button
                        type="button"
                        onClick={() => handleSaveEdit(cat.id)}
                        disabled={isSubmitting || !editName.trim()}
                        className="p-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white transition cursor-pointer disabled:opacity-50"
                        title="Save Changes"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingId(null)}
                        className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition cursor-pointer"
                        title="Cancel"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Color palette for editing */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-[10px]">
                        <span className="text-slate-400 font-semibold uppercase tracking-wider">
                          Badge Color:
                        </span>
                        {editColorDuplicateName && (
                          <span className="text-amber-400 font-medium">
                            Note: Used by &quot;{editColorDuplicateName}&quot;
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-1.5 p-2 bg-slate-900 rounded-xl border border-slate-800">
                        {EXPANDED_PALETTE.map((c) => {
                          const isUsedByOther =
                            usedColorMap[c.value.toLowerCase()] &&
                            usedColorMap[c.value.toLowerCase()] !== cat.name;
                          const isSelected =
                            editColor.toLowerCase() === c.value.toLowerCase();
                          return (
                            <button
                              key={c.value}
                              type="button"
                              onClick={() => setEditColor(c.value)}
                              style={{ backgroundColor: c.value }}
                              className={`relative w-4 h-4 rounded-full transition cursor-pointer ${
                                isSelected
                                  ? "ring-2 ring-white ring-offset-2 ring-offset-slate-950 scale-110 shadow-md"
                                  : "opacity-70 hover:opacity-100"
                              }`}
                              title={`${c.name}${
                                isUsedByOther
                                  ? ` (in use by ${usedColorMap[c.value.toLowerCase()]})`
                                  : " (available)"
                              }`}
                            >
                              {isUsedByOther && !isSelected && (
                                <span className="absolute inset-0 m-auto w-1 h-1 rounded-full bg-black/60 pointer-events-none" />
                              )}
                            </button>
                          );
                        })}

                        {/* Custom Color Input for Edit */}
                        <div className="relative flex items-center ml-1">
                          <button
                            type="button"
                            onClick={() => editColorPickerRef.current?.click()}
                            className="flex items-center gap-1 px-1.5 py-0.5 rounded-lg bg-slate-850 hover:bg-slate-800 border border-slate-700 text-slate-300 text-[10px] transition cursor-pointer"
                            title="Pick custom color"
                          >
                            <Palette className="w-3 h-3 text-emerald-400" />
                            <span>Custom</span>
                          </button>
                          <input
                            ref={editColorPickerRef}
                            type="color"
                            value={editColor}
                            onChange={(e) => setEditColor(e.target.value)}
                            className="sr-only"
                          />
                        </div>

                        {/* Hex Preview */}
                        <div className="ml-auto flex items-center gap-1 pl-2 border-l border-slate-800 text-[10px] font-mono text-slate-400">
                          <span
                            className="w-2.5 h-2.5 rounded-full"
                            style={{ backgroundColor: editColor }}
                          />
                          <span>{editColor.toUpperCase()}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Delete & Reassign Warning Mode */}
                {isDeleting && (
                  <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl flex flex-col gap-2.5 text-xs text-slate-200">
                    <div className="flex items-start gap-2 text-red-400">
                      <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <span className="font-bold">Delete &quot;{cat.name}&quot;?</span>
                        {count > 0 ? (
                          <p className="text-[11px] text-slate-300 mt-1">
                            This category contains{" "}
                            <strong className="text-amber-400">
                              {count} product{count === 1 ? "" : "s"}
                            </strong>
                            . Choose a category to reassign them to:
                          </p>
                        ) : (
                          <p className="text-[11px] text-slate-300 mt-1">
                            No products are currently in this category. It is safe to delete.
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Reassignment Dropdown if count > 0 */}
                    {count > 0 && (
                      <div>
                        <select
                          value={reassignTargetId}
                          onChange={(e) => setReassignTargetId(e.target.value)}
                          className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-red-400"
                        >
                          {categories
                            .filter((c) => c.id !== cat.id)
                            .map((c) => (
                              <option key={c.id} value={c.id} className="bg-slate-900">
                                Move to: {c.name} ({productCounts[c.id] || 0} existing)
                              </option>
                            ))}
                        </select>
                      </div>
                    )}

                    <div className="flex items-center justify-end gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => setDeletingId(null)}
                        className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs transition cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={() => handleConfirmDelete(cat.id)}
                        disabled={isSubmitting}
                        className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white font-bold text-xs shadow-md transition cursor-pointer disabled:opacity-50 flex items-center gap-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>{count > 0 ? "Reassign & Delete" : "Delete Category"}</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Modal Footer */}
        <div className="pt-4 border-t border-slate-800 mt-4 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
