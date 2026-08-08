import React, { useState } from "react";
import { Header } from "./header";
import { Sidebar, UserRole } from "./sidebar";

interface MainLayoutProps {
  children: React.ReactNode;
  currentPage: string;
  onNavigate: (page: string) => void;
  userName: string;
  userRole: UserRole;
  onLogout: () => void;
}

export function MainLayout({
  children,
  currentPage,
  onNavigate,
  userName,
  userRole,
  onLogout,
}: MainLayoutProps) {
  const [isSidebarCollapsed, setIsSidebarCollapsed] =
    useState(false);

  const toggleSidebar = () => {
    setIsSidebarCollapsed(!isSidebarCollapsed);
  };

  return (
    <div className="min-h-screen bg-[var(--bg-light)] dark:bg-gray-900">
      <Header
        onMenuClick={toggleSidebar}
        userName={userName}
        userRole={userRole}
        onLogout={onLogout}
      />

      <Sidebar
        isCollapsed={isSidebarCollapsed}
        currentPage={currentPage}
        onNavigate={onNavigate}
        userRole={userRole}
      />

      <main
        className={`
          pt-16 min-h-screen
          transition-all duration-300
          ${isSidebarCollapsed ? "ml-16" : "ml-64"}
        `}
      >
        <div className="p-6">{children}</div>
      </main>
    </div>
  );
}