import { UserProfile, Branch } from "../../types";

export const CACHED_USER_KEY = "rr_pos_cached_user";
export const CACHED_BRANCH_KEY = "rr_pos_cached_current_branch";
export const CACHED_BRANCHES_KEY = "rr_pos_cached_branches";
export const CACHED_TAB_KEY = "rr_pos_active_tab";

export function getCachedUserProfile(): UserProfile | null {
  try {
    const raw = localStorage.getItem(CACHED_USER_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (
      parsed &&
      typeof parsed === "object" &&
      parsed.id &&
      parsed.email &&
      parsed.role
    ) {
      return parsed as UserProfile;
    }
  } catch {
    // Ignore storage parse or access errors
  }
  return null;
}

export function setCachedUserProfile(profile: UserProfile | null): void {
  try {
    if (profile) {
      localStorage.setItem(CACHED_USER_KEY, JSON.stringify(profile));
    } else {
      localStorage.removeItem(CACHED_USER_KEY);
    }
  } catch {}
}

export function clearCachedUserProfile(): void {
  try {
    localStorage.removeItem(CACHED_USER_KEY);
  } catch {}
}

export function getCachedCurrentBranch(): Branch | null {
  try {
    const raw = localStorage.getItem(CACHED_BRANCH_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object" && parsed.id && parsed.name) {
      return parsed as Branch;
    }
  } catch {}
  return null;
}

export function setCachedCurrentBranch(branch: Branch | null): void {
  try {
    if (branch) {
      localStorage.setItem(CACHED_BRANCH_KEY, JSON.stringify(branch));
    } else {
      localStorage.removeItem(CACHED_BRANCH_KEY);
    }
  } catch {}
}

export function getCachedBranches(): Branch[] {
  try {
    const raw = localStorage.getItem(CACHED_BRANCHES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed as Branch[];
    }
  } catch {}
  return [];
}

export function setCachedBranches(branches: Branch[]): void {
  try {
    localStorage.setItem(CACHED_BRANCHES_KEY, JSON.stringify(branches));
  } catch {}
}

export function hasPotentialSupabaseSession(): boolean {
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (
        key &&
        (key.startsWith("sb-") || key.includes("supabase")) &&
        key.endsWith("-auth-token")
      ) {
        const val = localStorage.getItem(key);
        if (val && val !== "{}" && val.includes("access_token")) {
          return true;
        }
      }
    }
  } catch {}
  return false;
}
