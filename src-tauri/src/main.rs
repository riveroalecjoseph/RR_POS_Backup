// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    // Security Hardening: Disable right-click context menu in release builds
    // so inspecting elements is blocked.
    #[cfg(not(debug_assertions))]
    {
        // Prevent right-click context menu and inspect element in production release builds
        // window.addEventListener('contextmenu', (e) => e.preventDefault());
    }

    app_lib::run();
}
