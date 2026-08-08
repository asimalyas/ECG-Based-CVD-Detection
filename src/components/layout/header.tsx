import React, { useEffect, useState } from "react";
import {
  Menu,
  Bell,
  LogOut,
  User,
  Moon,
  Sun,
  Check,
  X,
  Activity, // added Activity icon
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useTheme } from "../../contexts/ThemeContext";

interface HeaderProps {
  onMenuClick: () => void;
  userName: string;
  userRole: string;
  onLogout: () => void; // called after user confirms logout
}

export function Header({
  onMenuClick,
  userName,
  userRole,
  onLogout,
}: HeaderProps) {
  const { theme, toggleTheme } = useTheme();
  const [isLogoutOpen, setIsLogoutOpen] = useState(false);

  // close modal on Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setIsLogoutOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const handleConfirm = () => {
    setIsLogoutOpen(false);
    // small delay for animation polish
    setTimeout(() => onLogout(), 180);
  };

  return (
    <>
      <header className="fixed top-0 left-0 right-0 h-16 z-50 backdrop-blur-sm bg-white/60 dark:bg-gray-900/70 border-b border-[var(--border-color)] dark:border-gray-800 transition-colors">
        <div className="h-full px-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={onMenuClick}
              aria-label="Open menu"
              className="p-2 rounded-lg transition-all hover:bg-gray-100 dark:hover:bg-gray-700 hover:scale-105 active:scale-95"
            >
              <Menu className="w-6 h-6 text-[var(--text-color)] dark:text-gray-200" />
            </button>

            <motion.div
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.35 }}
              className="flex items-center gap-3"
            >
              {/* Logo: blue rounded box + Activity icon */}
              <motion.div
                whileHover={{ rotate: 20, scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                transition={{ duration: 0.45 }}
                className="w-12 h-12 rounded-xl flex items-center justify-center bg-gradient-to-br from-[#1976D2] to-[#1565C0] shadow-md hover:shadow-lg"
              >
                <Activity className="w-6 h-6 text-white" />
              </motion.div>

              <div className="leading-tight">
                <h1 className="text-sm md:text-base font-semibold text-[var(--text-color)] dark:text-white">
                  CardioDetect AI
                </h1>
                <p className="text-[11px] md:text-xs text-[var(--text-secondary)] dark:text-gray-400">
                  Cardiovascular Disease Detection System
                </p>
              </div>
            </motion.div>
          </div>

          <div className="flex items-center gap-3">
            {/* Theme toggle */}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg transition-all hover:bg-gray-200 dark:hover:bg-gray-700 hover:scale-105 active:scale-95"
              title={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
              aria-label="Toggle theme"
            >
              {theme === "light" ? (
                <Moon className="w-5 h-5 text-[var(--text-color)]" />
              ) : (
                <Sun className="w-5 h-5 text-yellow-400" />
              )}
            </button>

            <div className="h-8 w-px bg-[var(--border-color)] dark:bg-gray-700 mx-2"></div>

            <div className="flex items-center gap-3">
              <div className="text-right hidden md:block">
                <p className="text-sm font-medium text-[var(--text-color)] dark:text-white">
                  {userName}
                </p>
                <p className="text-xs text-[var(--text-secondary)] dark:text-gray-400">
                  {userRole}
                </p>
              </div>

              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-white/10 to-transparent border border-white/10 dark:border-gray-800 flex items-center justify-center shadow-sm transition-all hover:shadow-md hover:scale-[1.03] active:scale-95">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[var(--primary-color)] to-indigo-500 flex items-center justify-center text-white font-semibold">
                  {userName?.charAt(0) || "U"}
                </div>
              </div>

              {/* Logout */}
              <button
                onClick={() => setIsLogoutOpen(true)}
                className="p-2 rounded-lg transition-all hover:bg-[var(--error-color)]/20 dark:hover:bg-red-500/20 hover:scale-105 active:scale-95 group"
                title="Logout"
                aria-haspopup="dialog"
                aria-expanded={isLogoutOpen}
              >
                <LogOut className="w-5 h-5 text-[var(--text-secondary)] dark:text-gray-400 group-hover:text-[var(--error-color)]" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Logout confirmation modal */}
      <AnimatePresence>
        {isLogoutOpen && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
              onClick={() => setIsLogoutOpen(false)}
            />

            <motion.div
              initial={{ y: 12, opacity: 0, scale: 0.98 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: 12, opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.18 }}
              role="dialog"
              aria-modal="true"
              aria-labelledby="logout-title"
              className="relative w-full max-w-sm mx-4 bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-[var(--border-color)] dark:border-gray-800 p-5"
            >
              <div className="flex items-start gap-3">
                <div className="flex-none w-12 h-12 rounded-lg bg-[var(--error-color)]/10 flex items-center justify-center">
                  <X className="w-5 h-5 text-[var(--error-color)]" />
                </div>

                <div className="flex-1">
                  <h3
                    id="logout-title"
                    className="text-sm font-semibold text-[var(--text-color)] dark:text-white"
                  >
                    Are you sure you want to sign out?
                  </h3>
                  <p className="mt-1 text-xs text-[var(--text-secondary)] dark:text-gray-400">
                    You will be logged out of this session. Make
                    sure you have saved any unsaved changes.
                  </p>
                </div>
              </div>

              <div className="mt-4 flex items-center justify-end gap-3">
                <button
                  onClick={() => setIsLogoutOpen(false)}
                  className="px-3 py-2 rounded-lg bg-transparent border border-[var(--border-color)] dark:border-gray-700 text-sm text-[var(--text-color)] dark:text-white transition-all hover:bg-gray-100 dark:hover:bg-gray-800 hover:shadow hover:scale-[1.03] active:scale-95"
                >
                  Cancel
                </button>

                <button
                  onClick={handleConfirm}
                  className="px-4 py-2 rounded-lg bg-[var(--error-color)] text-white text-sm shadow transition-all hover:brightness-110 hover:shadow-lg hover:scale-[1.03] active:scale-95 flex items-center gap-2"
                >
                  <Check className="w-4 h-4" />
                  Sign out
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

export default Header;