import React, { useEffect, useMemo, useState } from "react";
import { MedicalTable } from "../../components/ui/medical-table";
import { MedicalButton } from "../../components/ui/medical-button";
import { StatusBadge } from "../../components/ui/medical-badge";
import { useToast } from "../../components/ui/medical-toast";
import { UserPlus } from "lucide-react";
import { userApi } from "../../lib/api";

interface UserManagementPageProps {
  onNavigateBack?: () => void;
}

type UserStatus = "pending" | "approved" | "rejected" | "active" | "inactive";

interface UserTableRow {
  id: string;
  shortId: string;
  name: string;
  email: string;
  role: string;
  roleLabel: string;
  organization: string;
  phone: string;
  status: UserStatus;
  created_at: string;
  updated_at: string;
  createdDisplay: string;
  sortTime: number;
}

const seededDemoUserIds = new Set(["mock_doc", "mock_tech", "mock_pat"]);

const titleCase = (value: any) => {
  const normalized = String(value || "").trim().toLowerCase();
  if (!normalized) return "N/A";
  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
};

const formatDateTime = (value: any) => {
  if (!value) return "N/A";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "N/A";
  return date.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const getShortUserId = (value: any) => {
  const id = String(value || "").replace(/^user:/, "").trim();
  if (!id) return "N/A";
  if (id.length <= 12) return id;
  return `USR-${id.replace(/[^a-zA-Z0-9]/g, "").slice(-8).toUpperCase()}`;
};

const normalizeStatus = (value: any): UserStatus => {
  const status = String(value || "").toLowerCase();
  if (
    status === "pending" ||
    status === "approved" ||
    status === "rejected" ||
    status === "active" ||
    status === "inactive"
  ) {
    return status;
  }
  return "pending";
};

const isSeededDemoUser = (profile: any) => {
  const id = String(profile?.id || "").trim();
  return seededDemoUserIds.has(id) || id.startsWith("mock_");
};

const getInitials = (name: string) => {
  const initials = name
    .split(" ")
    .map((part) => part.charAt(0))
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return initials || "U";
};

const normalizeUserRow = (profile: any): UserTableRow => {
  const id = String(profile?.id || "");
  const email = String(profile?.email || "N/A");
  const name =
    String(profile?.name || "").trim() ||
    (email !== "N/A" ? email.split("@")[0] : "Unknown User");
  const role = String(profile?.role || "").toLowerCase();
  const createdAt = profile?.created_at || profile?.createdAt || "";
  const updatedAt = profile?.updated_at || profile?.updatedAt || "";
  const sortTime = Date.parse(createdAt || updatedAt || "") || 0;

  return {
    id,
    shortId: getShortUserId(id),
    name,
    email,
    role,
    roleLabel: titleCase(role),
    organization: String(profile?.organization || ""),
    phone: String(profile?.phone || ""),
    status: normalizeStatus(profile?.status),
    created_at: createdAt || updatedAt || "",
    updated_at: updatedAt,
    createdDisplay: formatDateTime(createdAt || updatedAt),
    sortTime,
  };
};

export function UserManagementPage({
  onNavigateBack,
}: UserManagementPageProps) {
  const [users, setUsers] = useState<UserTableRow[]>([]);
  const [loading, setLoading] = useState(true);
  const { showToast } = useToast();

  const fetchUsers = async (showRefreshToast = false) => {
    setLoading(true);
    try {
      const response = await userApi.getAllUsers();
      const realUsers = (response.users || [])
        .filter((profile: any) => !isSeededDemoUser(profile))
        .map(normalizeUserRow)
        .sort((a: UserTableRow, b: UserTableRow) => b.sortTime - a.sortTime);

      setUsers(realUsers);
      if (showRefreshToast) {
        showToast("success", "Users refreshed");
      }
    } catch (error: any) {
      console.error("Error loading users:", error);
      showToast("error", error.message || "Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchUsers();
  }, []);

  const columns = useMemo(
    () => [
      {
        key: "id",
        header: "User ID",
        sortable: true,
        render: (row: UserTableRow) => (
          <div
            title={row.id}
            className="text-sm text-[var(--text-color)] dark:text-white font-medium"
          >
            {row.shortId}
          </div>
        ),
      },
      {
        key: "name",
        header: "Name",
        sortable: true,
        render: (row: UserTableRow) => (
          <div className="flex items-center gap-3 min-w-0">
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold text-white"
              style={{
                background:
                  "linear-gradient(135deg,#06b6d4 0%,#6366f1 100%)",
                boxShadow: "0 8px 20px rgba(10,11,13,0.06)",
              }}
            >
              {getInitials(row.name)}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium text-[var(--text-color)] dark:text-white truncate">
                  {row.name}
                </p>
                <span className="text-xs text-[var(--text-secondary)] dark:text-gray-400">
                  {row.roleLabel}
                </span>
              </div>
              <p className="text-xs text-[var(--text-secondary)] dark:text-gray-400 truncate">
                {row.email}
              </p>
            </div>
          </div>
        ),
      },
      {
        key: "roleLabel",
        header: "Role",
        sortable: true,
        render: (row: UserTableRow) => (
          <div>
            <p className="text-sm text-[var(--text-color)] dark:text-white">
              {row.roleLabel}
            </p>
            {row.organization && (
              <p className="text-xs text-[var(--text-secondary)] dark:text-gray-400">
                {row.organization}
              </p>
            )}
            {row.phone && (
              <p className="text-xs text-[var(--text-secondary)] dark:text-gray-400">
                {row.phone}
              </p>
            )}
          </div>
        ),
      },
      {
        key: "created_at",
        header: "Created",
        sortable: true,
        render: (row: UserTableRow) => (
          <span className="text-sm text-[var(--text-color)] dark:text-white">
            {row.createdDisplay}
          </span>
        ),
      },
      {
        key: "status",
        header: "Status",
        sortable: true,
        render: (row: UserTableRow) => <StatusBadge status={row.status} />,
      },
    ],
    [],
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <div className="relative inline-flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-gradient-to-br from-indigo-500 to-cyan-500 shadow-lg">
              <UserPlus className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-[var(--text-color)] dark:text-white">
                User Management
              </h1>
              <p className="text-sm text-[var(--text-secondary)] dark:text-gray-400 mt-1">
                Manage system users, roles and access
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <MedicalButton
            variant="secondary"
            loading={loading}
            className="
              !bg-[var(--bg-light)]
              !text-[var(--text-color)]
              dark:!bg-gray-800
              dark:!text-white
              hover:!bg-gray-100
              dark:hover:!bg-gray-700
              transition-all
            "
            onClick={() => void fetchUsers(true)}
          >
            Refresh
          </MedicalButton>

          <span title="Real user creation is not connected yet">
            <MedicalButton variant="primary" disabled>
              <UserPlus className="w-4 h-4 mr-2" />
              Create New User
            </MedicalButton>
          </span>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-md border border-gray-200 dark:border-gray-700 p-4">
        <MedicalTable
          columns={columns}
          data={users}
          searchable
          searchPlaceholder="Search by name, email, or role..."
          emptyMessage={loading ? "Loading users..." : "No real users found"}
        />
      </div>
    </div>
  );
}

export default UserManagementPage;
