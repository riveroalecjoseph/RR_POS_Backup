import { describe, it, expect, beforeEach } from "vitest";
import {
  getPracticeBranchIds,
  setPracticeBranchIds,
  isBranchInPracticeMode,
  toggleBranchInPracticeList,
} from "./practiceMode";

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
};

(globalThis as any).localStorage = mockLocalStorage;

describe("Branch-Specific Practice Mode Controller", () => {
  beforeEach(() => {
    mockLocalStorage.clear();
  });

  it("should return an empty array by default when no branches are in practice mode", () => {
    expect(getPracticeBranchIds()).toEqual([]);
  });

  it("should persist and retrieve practice branch IDs", () => {
    const branchIds = ["branch-north", "branch-south"];
    setPracticeBranchIds(branchIds);
    expect(getPracticeBranchIds()).toEqual(branchIds);
  });

  it("should accurately determine if a branch is in practice mode", () => {
    const list = ["branch-01", "branch-02"];
    expect(isBranchInPracticeMode("branch-01", list)).toBe(true);
    expect(isBranchInPracticeMode("branch-03", list)).toBe(false);
    expect(isBranchInPracticeMode(null, list)).toBe(false);
    expect(isBranchInPracticeMode(undefined, list)).toBe(false);
  });

  it("should toggle branch in and out of practice list", () => {
    let list: string[] = [];
    list = toggleBranchInPracticeList("branch-abc", list);
    expect(list).toEqual(["branch-abc"]);

    list = toggleBranchInPracticeList("branch-def", list);
    expect(list).toEqual(["branch-abc", "branch-def"]);

    // Toggling existing branch removes it
    list = toggleBranchInPracticeList("branch-abc", list);
    expect(list).toEqual(["branch-def"]);
  });
});
