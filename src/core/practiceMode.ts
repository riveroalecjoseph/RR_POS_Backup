/**
 * Practice / Sandbox Mode Controller
 *
 * Allows Super Admins to configure isolated practice sandboxes per store/branch.
 * When a branch is in Practice Mode, sales, POS checkouts, and stock deductions
 * for that branch are performed exclusively on the local IndexedDB sandbox mirror
 * without committing mutations to live Supabase production tables.
 */

export const PRACTICE_BRANCHES_STORAGE_KEY = "rr_pos_practice_mode_branches";
const LEGACY_STORAGE_KEY = "rr_pos_practice_mode_active";

/**
 * Retrieve the list of branch IDs currently configured for Practice Sandbox mode.
 */
export function getPracticeBranchIds(): string[] {
  try {
    const raw = localStorage.getItem(PRACTICE_BRANCHES_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed.filter((id) => typeof id === "string" && id.trim().length > 0);
      }
    }
  } catch {
    // LocalStorage parse error or restricted access
  }
  return [];
}

/**
 * Save the list of branch IDs configured for Practice Sandbox mode.
 */
export function setPracticeBranchIds(branchIds: string[]): void {
  try {
    const cleanList = Array.from(new Set(branchIds.filter(Boolean)));
    localStorage.setItem(PRACTICE_BRANCHES_STORAGE_KEY, JSON.stringify(cleanList));
  } catch {
    // Storage access blocked or unavailable
  }
}

/**
 * Check whether a specific branch is in Practice Mode.
 */
export function isBranchInPracticeMode(
  branchId: string | null | undefined,
  practiceBranchIds: string[],
): boolean {
  if (!branchId) return false;
  return practiceBranchIds.includes(branchId);
}

/**
 * Toggle a branch ID into or out of the practice branch list.
 */
export function toggleBranchInPracticeList(
  branchId: string,
  currentList: string[],
): string[] {
  if (!branchId) return currentList;
  if (currentList.includes(branchId)) {
    return currentList.filter((id) => id !== branchId);
  }
  return [...currentList, branchId];
}

/**
 * Backward-compatibility: Check if any practice mode setting exists.
 */
export function getPracticeModeSetting(): boolean {
  try {
    const ids = getPracticeBranchIds();
    if (ids.length > 0) return true;
    return localStorage.getItem(LEGACY_STORAGE_KEY) === "true";
  } catch {
    return false;
  }
}

/**
 * Backward-compatibility: Clear legacy key when set to false.
 */
export function setPracticeModeSetting(enabled: boolean): void {
  try {
    if (!enabled) {
      localStorage.removeItem(LEGACY_STORAGE_KEY);
    }
  } catch {
    // Storage access blocked
  }
}
