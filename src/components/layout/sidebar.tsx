import React from "react";
import {
  LayoutDashboard,
  Users,
  FileText,
  Upload,
  Settings,
  UserCog,
  Activity,
  FolderOpen,
  ClipboardList,
  LucideIcon,
  UserCheck,
} from "lucide-react";

export type UserRole =
  | "doctor"
  | "technician"
  | "patient"
  | "admin";

interface NavItem {
  id: string;
  label: string;
  icon: LucideIcon;
  roles: UserRole[];
  badge?: number;
}

const navigationItems: NavItem[] = [
  {
    id: "dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
    roles: ["doctor", "technician", "patient", "admin"],
  },
  {
    id: "pending-requests",
    label: "Pending Requests",
    icon: UserCheck,
    roles: ["admin"],
  },
  {
    id: "patients",
    label: "Patients",
    icon: Users,
    roles: ["doctor", "technician"],
  },
  {
    id: "upload",
    label: "Upload ECG",
    icon: Upload,
    roles: ["patient", "technician"],
  },
  {
    id: "reports",
    label: "Reports",
    icon: FileText,
    roles: ["doctor", "patient"],
  },

  {
    id: "users",
    label: "Manage Users",
    icon: UserCog,
    roles: ["admin"],
  },
  {
    id: "audit",
    label: "Audit Logs",
    icon: ClipboardList,
    roles: ["admin"],
  },
  {
    id: "settings",
    label: "Settings",
    icon: Settings,
    roles: ["doctor", "technician", "patient", "admin"],
  },
];

interface SidebarProps {
  isCollapsed: boolean;
  currentPage: string;
  onNavigate: (page: string) => void;
  userRole: UserRole;
}

export function Sidebar({
  isCollapsed,
  currentPage,
  onNavigate,
  userRole,
}: SidebarProps) {
  const filteredItems = navigationItems.filter((item) =>
    item.roles.includes(userRole),
  );

  return (
    <aside
      className={`
        fixed left-0 top-16 bottom-0
        bg-white dark:bg-gray-800 border-r border-[var(--border-color)] dark:border-gray-700
        transition-all duration-300 ease-in-out
        ${isCollapsed ? "w-16" : "w-64"}
        z-30
      `}
    >
      <nav className="p-2 space-y-1">
        {filteredItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentPage === item.id;

          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`
                w-full flex items-center gap-3 px-3 py-3 rounded-lg
                transition-all duration-200
                ${
                  isActive
                    ? "bg-[var(--primary-color)] text-white"
                    : "text-[var(--text-color)] dark:text-gray-200 hover:bg-[var(--bg-light)] dark:hover:bg-gray-700"
                }
                ${isCollapsed ? "justify-center" : ""}
              `}
              title={isCollapsed ? item.label : undefined}
            >
              <Icon className="w-5 h-5 flex-shrink-0" />
              {!isCollapsed && (
                <>
                  <span className="flex-1 text-left">
                    {item.label}
                  </span>
                  {item.badge !== undefined &&
                    item.badge > 0 && (
                      <span
                        className={`
                      px-2 py-0.5 rounded-full text-xs
                      ${
                        isActive
                          ? "bg-white text-[var(--primary-color)]"
                          : "bg-[var(--error-color)] text-white"
                      }
                    `}
                      >
                        {item.badge}
                      </span>
                    )}
                </>
              )}
            </button>
          );
        })}
      </nav>

      {!isCollapsed && (
        <div className="absolute bottom-4 left-4 right-4 p-4 bg-[var(--bg-light)] dark:bg-gray-700 rounded-lg">
          <p className="text-xs text-[var(--text-secondary)] dark:text-gray-400 mb-1">
            System Status
          </p>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-[var(--success-color)] rounded-full animate-pulse"></div>
            <span className="text-sm text-[var(--text-color)] dark:text-gray-200">
              All Systems Operational
            </span>
          </div>
        </div>
      )}
    </aside>
  );
}