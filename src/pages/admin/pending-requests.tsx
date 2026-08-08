import React, { useState, useEffect } from "react";
import { MedicalTable } from "../../components/ui/medical-table";
import { MedicalButton } from "../../components/ui/medical-button";
import { MedicalBadge } from "../../components/ui/medical-badge";
import { useToast } from "../../components/ui/medical-toast";
import {
  Check,
  X,
  UserCheck,
  Clock,
  AlertCircle,
  Stethoscope,
  Microscope,
  User,
} from "lucide-react";
import { userApi } from "../../lib/api";

/**
 * PendingRequestsPage
 * - Removed Back button
 * - Refresh button adjusted for dark & light modes
 * - Removed Patient Requests stat card
 * - Logic remains unchanged
 */

interface PendingRequestsPageProps {
  onNavigateBack?: () => void;
}

export function PendingRequestsPage({
  onNavigateBack,
}: PendingRequestsPageProps) {
  const [pendingUsers, setPendingUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<
    string | null
  >(null);
  const { showToast } = useToast();

  useEffect(() => {
    fetchPendingUsers();
  }, []);

  const fetchPendingUsers = async () => {
    setLoading(true);
    try {
      console.log('[PendingRequests] Fetching pending users...');
      const response = await userApi.getPendingUsers();
      console.log('[PendingRequests] Response:', response);
      console.log('[PendingRequests] Pending users count:', response.users?.length || 0);
      setPendingUsers(response.users || []);
    } catch (error: any) {
      console.error("[PendingRequests] Error fetching pending users:", error);
      showToast("error", "Failed to load pending requests");
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (userId: string) => {
    setActionLoading(userId);
    try {
      await userApi.approveUser(userId);
      showToast("success", "User approved successfully");
      fetchPendingUsers(); // Refresh list
    } catch (error: any) {
      console.error("Error approving user:", error);
      showToast(
        "error",
        error.message || "Failed to approve user",
      );
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (userId: string) => {
    setActionLoading(userId);
    try {
      await userApi.rejectUser(userId);
      showToast("info", "User request rejected");
      fetchPendingUsers(); // Refresh list
    } catch (error: any) {
      console.error("Error rejecting user:", error);
      showToast(
        "error",
        error.message || "Failed to reject user",
      );
    } finally {
      setActionLoading(null);
    }
  };

  const columns = [
    {
      key: "name",
      header: "Name",
      sortable: true,
      render: (row: any) => (
        <div className="flex items-center gap-3 min-w-0">
          <div
            className="flex-none w-11 h-11 rounded-lg flex items-center justify-center text-white text-sm font-semibold"
            style={{
              background:
                "linear-gradient(135deg,#06b6d4 0%,#6366f1 100%)",
              boxShadow: "0 8px 24px rgba(15,23,42,0.06)",
            }}
          >
            {row.name
              .split(" ")
              .map((s: string) => s.charAt(0))
              .slice(0, 2)
              .join("")
              .toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-[var(--text-color)] dark:text-white truncate">
              {row.name}
            </p>
            <p className="text-xs text-[var(--text-secondary)] dark:text-gray-400 truncate">
              {row.email}
            </p>
          </div>
        </div>
      ),
    },
    {
      key: "role",
      header: "Requested Role",
      sortable: true,
      render: (row: any) => {
        const RoleIcon =
          row.role === "doctor"
            ? Stethoscope
            : row.role === "technician"
              ? Microscope
              : User;
        const iconColor =
          row.role === "doctor"
            ? "text-blue-600"
            : row.role === "technician"
              ? "text-purple-600"
              : "text-gray-600";

        return (
          <div className="flex items-center gap-3">
            <div
              className={`w-9 h-9 rounded-lg flex items-center justify-center bg-white/60 dark:bg-white/5 border border-gray-100 dark:border-gray-700`}
              aria-hidden
            >
              <RoleIcon className={`w-4 h-4 ${iconColor}`} />
            </div>
            <div>
              <MedicalBadge
                variant={
                  row.role === "doctor"
                    ? "primary"
                    : row.role === "technician"
                      ? "info"
                      : "success"
                }
              >
                {row.role
                  ? row.role.charAt(0).toUpperCase() +
                    row.role.slice(1)
                  : "N/A"}
              </MedicalBadge>
              {row.organization && (
                <p className="text-xs text-[var(--text-secondary)] dark:text-gray-400 mt-1 truncate">
                  {row.organization}
                </p>
              )}
            </div>
          </div>
        );
      },
    },
    {
      key: "phone",
      header: "Phone",
      render: (row: any) => (
        <div className="text-sm text-[var(--text-color)] dark:text-white">
          {row.phone || "N/A"}
        </div>
      ),
    },
    {
      key: "created_at",
      header: "Request Date",
      sortable: true,
      render: (row: any) => (
        <div className="text-sm text-[var(--text-color)] dark:text-white">
          {row.created_at
            ? new Date(row.created_at).toLocaleString()
            : "—"}
        </div>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      render: (row: any) => (
        <div className="flex gap-2">
          <MedicalButton
            variant="success"
            size="sm"
            onClick={() => handleApprove(row.id)}
            loading={actionLoading === row.id}
            disabled={!!actionLoading}
            className="flex items-center gap-2"
          >
            <Check className="w-4 h-4" />
            Approve
          </MedicalButton>
          <MedicalButton
            variant="danger"
            size="sm"
            onClick={() => handleReject(row.id)}
            loading={actionLoading === row.id}
            disabled={!!actionLoading}
            className="flex items-center gap-2"
          >
            <X className="w-4 h-4" />
            Reject
          </MedicalButton>
        </div>
      ),
    },
  ];

  const doctorCount = pendingUsers.filter(
    (u) => u.role === "doctor",
  ).length;
  const techCount = pendingUsers.filter(
    (u) => u.role === "technician",
  ).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center bg-gradient-to-br from-indigo-600 to-cyan-500 shadow-lg">
            <UserCheck className="w-7 h-7 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-[var(--text-color)] dark:text-white">
              Pending User Requests
            </h1>
            <p className="text-sm text-[var(--text-secondary)] dark:text-gray-400 mt-1">
              Review and approve or reject new user
              registrations
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Refresh button — explicit dark/light friendly styles */}
          <MedicalButton
            variant="secondary"
            className={`
              !bg-[var(--bg-light)] !text-[var(--text-color)]
              dark:!bg-gray-800 dark:!text-white
              hover:!bg-gray-100 dark:hover:!bg-gray-700
              border border-[var(--border-color)] dark:border-gray-700
              transition-all px-4
            `}
            onClick={() => {
              fetchPendingUsers();
              showToast("info", "Refreshed");
            }}
          >
            Refresh
          </MedicalButton>
        </div>
      </div>

      {/* Stats Overview (Doctor & Technician only) */}
      {!loading && pendingUsers.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 rounded-2xl bg-gradient-to-br from-blue-50 to-blue-100 dark:from-indigo-900/20 dark:to-indigo-900/10 border border-blue-200 dark:border-indigo-800 shadow-sm">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg flex items-center justify-center bg-blue-600 shadow-md">
                <Stethoscope className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-2xl font-bold text-blue-900 dark:text-white">
                  {doctorCount}
                </p>
                <p className="text-sm text-blue-700 dark:text-gray-300">
                  Doctor Requests
                </p>
              </div>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-900/10 border border-purple-200 dark:border-purple-800 shadow-sm">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg flex items-center justify-center bg-purple-600 shadow-md">
                <Microscope className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-2xl font-bold text-purple-900 dark:text-white">
                  {techCount}
                </p>
                <p className="text-sm text-purple-700 dark:text-gray-300">
                  Technician Requests
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Loading / Empty / Table */}
      {loading ? (
        <div className="rounded-2xl bg-white dark:bg-gray-800 border border-[var(--border-color)] p-12 text-center shadow-sm">
          <div className="inline-block h-10 w-10 animate-spin rounded-full border-4 border-solid border-[var(--primary-color)] border-r-transparent"></div>
          <p className="text-[var(--text-secondary)] mt-4 dark:text-gray-300">
            Loading pending requests...
          </p>
        </div>
      ) : pendingUsers.length === 0 ? (
        <div className="rounded-2xl bg-white dark:bg-gray-800 border border-[var(--border-color)] p-12 text-center shadow-sm">
          <UserCheck className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h3 className="mb-2 text-[var(--text-color)] dark:text-white">
            No Pending Requests
          </h3>
          <p className="text-[var(--text-secondary)] dark:text-gray-300">
            All user registration requests have been processed.
          </p>
        </div>
      ) : (
        <div className="rounded-2xl bg-white dark:bg-gray-800 border border-[var(--border-color)] p-6 shadow-sm">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-orange-100 dark:bg-orange-900/20">
              <Clock className="w-5 h-5 text-[var(--warning-color)]" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-[var(--text-color)] dark:text-white">
                {pendingUsers.length} Pending Request
                {pendingUsers.length !== 1 ? "s" : ""}
              </h2>
              <p className="text-sm text-[var(--text-secondary)] dark:text-gray-400">
                Review and approve or reject below
              </p>
            </div>
          </div>

          <MedicalTable
            columns={columns}
            data={pendingUsers}
            searchable
            searchPlaceholder="Search by name, email, or organization..."
            rowClassName="hover:bg-gray-50 dark:hover:bg-gray-900/50 transition-colors"
            tableWrapperClassName="rounded-lg overflow-hidden"
          />
        </div>
      )}

      {/* Guidance box */}
      <div className="rounded-2xl p-5 bg-blue-50 dark:bg-indigo-900/10 border border-blue-200 dark:border-indigo-800">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-300 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="text-sm mb-2 text-blue-900 dark:text-white">
              Approval Guidelines
            </h3>
            <ul className="text-sm text-blue-800 dark:text-gray-300 space-y-1">
              <li>
                • Verify that the user's credentials match their
                stated role
              </li>
              <li>
                • Check organization details for healthcare
                professionals
              </li>
              <li>
                • Doctors and Technicians require admin approval
                before accessing the system
              </li>
              <li>
                • Once approved, users will be able to log in
                immediately
              </li>
              <li>
                • Rejected users will not be able to access the
                system
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

export default PendingRequestsPage;