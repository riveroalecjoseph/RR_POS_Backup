import { describe, it, expect, beforeEach } from "vitest";
import {
  getCachedUserProfile,
  setCachedUserProfile,
  clearCachedUserProfile,
  getCachedCurrentBranch,
  setCachedCurrentBranch,
  getCachedBranches,
  setCachedBranches,
  hasPotentialSupabaseSession,
  CACHED_USER_KEY,
} from "./sessionCache";
import { UserProfile, Branch } from "../../types";

const storage: Record<string, string> = {};
const mockLocalStorage = {
  getItem: (key: string) => storage[key] ?? null,
  setItem: (key: string, value: string) => {
    storage[key] = value;
  },
  removeItem: (key: string) => {
    delete storage[key];
  },
  clear: () => {
    for (const key in storage) delete storage[key];
  },
  key: (index: number) => Object.keys(storage)[index] ?? null,
  get length() {
    return Object.keys(storage).length;
  },
};

(globalThis as any).localStorage = mockLocalStorage;

describe("Session Cache and Instant Hydration", () => {
  beforeEach(() => {
    mockLocalStorage.clear();
  });

  it("should return null by default when no user is cached", () => {
    expect(getCachedUserProfile()).toBeNull();
  });

  it("should persist and retrieve user profile synchronously", () => {
    const mockUser: UserProfile = {
      id: "usr-123",
      email: "test@company.com",
      fullName: "Test User",
      role: "cashier",
      branchId: "branch-1",
      branchName: "Main Branch",
    };

    setCachedUserProfile(mockUser);
    expect(getCachedUserProfile()).toEqual(mockUser);
  });

  it("should gracefully handle corrupted user JSON in local storage", () => {
    storage[CACHED_USER_KEY] = "{ corrupted-json ";
    expect(getCachedUserProfile()).toBeNull();
  });

  it("should clear cached user profile on logout", () => {
    const mockUser: UserProfile = {
      id: "usr-123",
      email: "test@company.com",
      fullName: "Test User",
      role: "super_admin",
      branchId: null,
      branchName: "Global",
    };
    setCachedUserProfile(mockUser);
    clearCachedUserProfile();
    expect(getCachedUserProfile()).toBeNull();
  });

  it("should persist and retrieve active branch", () => {
    const branch: Branch = {
      id: "branch-01",
      code: "MNL",
      name: "Manila Flagship",
      isActive: true,
    };
    setCachedCurrentBranch(branch);
    expect(getCachedCurrentBranch()).toEqual(branch);

    setCachedCurrentBranch(null);
    expect(getCachedCurrentBranch()).toBeNull();
  });

  it("should persist and retrieve branch list", () => {
    const branches: Branch[] = [
      { id: "b1", code: "B1", name: "Branch 1", isActive: true },
      { id: "b2", code: "B2", name: "Branch 2", isActive: true },
    ];
    setCachedBranches(branches);
    expect(getCachedBranches()).toEqual(branches);
  });

  it("should detect potential Supabase auth session token in storage", () => {
    expect(hasPotentialSupabaseSession()).toBe(false);

    storage["sb-example-auth-token"] = JSON.stringify({
      access_token: "jwt-token-123",
      user: { id: "u-1" },
    });
    expect(hasPotentialSupabaseSession()).toBe(true);

    storage["sb-example-auth-token"] = "{}";
    expect(hasPotentialSupabaseSession()).toBe(false);
  });
});
