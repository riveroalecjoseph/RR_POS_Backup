/**
 * Platform and environment detection utilities for RR POS & Inventory.
 */

/**
 * Detects whether the current environment is running on a desktop platform/viewport.
 * Checks for window availability, desktop wrappers (Tauri, Electron),
 * mobile user agent tokens, and screen width.
 */
export const isDesktop = (): boolean => {
  if (typeof window === "undefined") {
    return false;
  }

  // Check for native desktop container environments (Tauri or Electron)
  const win = window as unknown as Record<string, unknown>;
  if (
    "__TAURI__" in win ||
    "__TAURI_INTERNALS__" in win ||
    "electron" in win
  ) {
    return true;
  }

  // Check user agent for mobile device indicators
  const userAgent = navigator.userAgent || "";
  const isMobileDevice =
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      userAgent,
    );

  if (isMobileDevice) {
    return false;
  }

  // Standard responsive desktop viewport threshold
  return window.innerWidth >= 1024;
};
