// pages/audit_logs.tsx
import React, { useEffect, useMemo, useState } from "react";
import { MedicalTable } from "../../components/ui/medical-table";
import { MedicalCard } from "../../components/ui/medical-card";
import { MedicalBadge } from "../../components/ui/medical-badge";
import { MedicalButton } from "../../components/ui/medical-button";
import { Activity } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { auditApi } from "../../lib/api";
import { useToast } from "../../components/ui/medical-toast";

/**
 * AuditLogsPage — simplified for your environment
 * - Calls auditApi.getLogs() with no arguments (matches AdminDashboard usage)
 * - No filters UI (removed)
 * - Date and Time columns instead of single timestamp column
 * - Performed By column shows actor (best-effort fields)
 * - Removed IP column
 * - Status simplified to "Successfully performed" or "Rejected"
 * - No search/CSV/export
 */

type StatusVariant = "success" | "error" | "warning" | "info";

type AuditLog = {
  id: string;
  timestamp: string;
  // possible actor fields (the backend may populate some of these)
  user?: string | null;
  userName?: string | null;
  userId?: string | null;
  admin_name?: string | null;
  doctor_name?: string | null;
  technician_name?: string | null;
  performed_by?: string | null;
  created_by?: string | null;
  userRole?: string | null;
  role?: string | null;
  action: string;
  resource?: string;
  details?: any; // Changed from string to any
  status?: string | StatusVariant;
  [k: string]: any;
};

// Helper function to format details for display
const formatDetails = (details: any): string => {
  if (!details) return "-";
  if (typeof details === "string") return details;

  // If it's an object, format it nicely
  if (typeof details === "object") {
    // Common patterns for different activities
    if (details.email) {
      return `${details.email} (${details.role || "user"})`;
    }
    if (details.approved_user_email) {
      return `Approved ${details.approved_user_name} (${details.approved_user_role})`;
    }
    if (details.rejected_user_email) {
      return `Rejected ${details.rejected_user_name} (${details.rejected_user_role})`;
    }
    // Fallback: stringify the object nicely
    try {
      return JSON.stringify(details, null, 2);
    } catch {
      return String(details);
    }
  }

  return String(details);
};

export function AuditLogsPage() {
  const { showToast } = useToast();

  // pagination
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);

  // data
  const [allLogs, setAllLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // detail drawer
  const [selectedLog, setSelectedLog] =
    useState<AuditLog | null>(null);

  // fetch all logs (no args) — matches AdminDashboard usage
  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setError(null);

    auditApi
      .getLogs()
      .then((resp: any) => {
        // AdminDashboard uses auditApi.getLogs().catch(() => ({ logs: [] }))
        // Accept both shapes: resp.logs or resp (array)
        const fetched: AuditLog[] = Array.isArray(resp)
          ? resp
          : resp?.logs || [];
        if (!mounted) return;
        setAllLogs(fetched);
      })
      .catch((err: any) => {
        console.error("Failed to load audit logs:", err);
        if (!mounted) return;
        setError("Failed to load logs");
        showToast("error", "Failed to load audit logs");
      })
      .finally(() => {
        if (!mounted) return;
        setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [showToast]);

  // total count
  const total = allLogs.length;

  // client-side pagination slice
  const pagedLogs = useMemo(() => {
    const start = (page - 1) * pageSize;
    return allLogs.slice(start, start + pageSize);
  }, [allLogs, page, pageSize]);

  // helpers
  const normalizeStatus = (raw?: string): StatusVariant => {
    if (!raw) return "info";
    const s = raw.toString().toLowerCase();
    if (
      s.includes("fail") ||
      s.includes("error") ||
      s.includes("rejected")
    )
      return "error";
    if (s.includes("warn")) return "warning";
    if (
      s.includes("success") ||
      s.includes("ok") ||
      s.includes("completed")
    )
      return "success";
    return "info";
  };

  // best-effort actor extraction
  const getActor = (row: AuditLog) => {
    // Priority order: user_name (our standard field) → other fields
    const candidates = [
      row.user_name, // This is what we store in createAuditLog
      row.userName,
      row.user,
      row.admin_name,
      row.doctor_name,
      row.technician_name,
      row.performed_by,
      row.created_by,
      row.user_fullname,
    ];
    const displayName =
      candidates.find((c) => !!c) ??
      (row.user === "System" ? "System" : undefined) ??
      "Unknown";
    const id = row.user_id ?? row.userId ?? "";
    const role = row.userRole ?? row.role ?? "";
    return { displayName, id, role };
  };

  // modern User cell (initials + name + small meta)
  const UserCell = ({ row }: { row: AuditLog }) => {
    const actor = getActor(row);
    const initials = actor.displayName
      .split(" ")
      .map((p) => p.charAt(0))
      .filter(Boolean)
      .slice(0, 2)
      .join("")
      .toUpperCase();

    return (
      <div className="flex items-center gap-3 min-w-0">
        <div
          className="flex-none w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold text-white select-none"
          style={{
            background:
              "linear-gradient(135deg, #6366F1 0%, #4F46E5 100%)",
            boxShadow: "0 8px 20px rgba(15,23,42,0.06)",
          }}
        >
          {initials || "U"}
        </div>

        <div className="min-w-0">
          <p className="text-sm font-medium text-[var(--text-color)] dark:text-white truncate">
            {actor.displayName}
          </p>
          <div className="flex items-center gap-2">
            {actor.role && (
              <span className="text-xs text-[var(--text-secondary)] dark:text-gray-400 truncate">
                {actor.role}
              </span>
            )}
            {actor.id && (
              <span className="text-xs text-[var(--text-secondary)] dark:text-gray-400 truncate">
                {actor.id}
              </span>
            )}
          </div>
        </div>
      </div>
    );
  };

  // columns: Date, Time, Performed By, Action, Resource/Details, Status
  const columns = [
    {
      key: "date",
      header: "Date",
      sortable: true,
      render: (row: AuditLog) => (
        <span className="text-sm text-[var(--text-color)] dark:text-white">
          {row.timestamp
            ? new Date(row.timestamp).toLocaleDateString()
            : "-"}
        </span>
      ),
    },
    {
      key: "time",
      header: "Time",
      sortable: true,
      render: (row: AuditLog) => (
        <span className="text-sm text-[var(--text-color)] dark:text-white">
          {row.timestamp
            ? new Date(row.timestamp).toLocaleTimeString()
            : "-"}
        </span>
      ),
    },
    {
      key: "performed_by",
      header: "Performed By",
      sortable: true,
      render: (row: AuditLog) => <UserCell row={row} />,
    },
    {
      key: "action",
      header: "Action",
      sortable: true,
      render: (row: AuditLog) => (
        <div className="text-sm font-medium text-[var(--text-color)] dark:text-white">
          {row.action?.replace(/_/g, " ") ?? "-"}
        </div>
      ),
    },
    {
      key: "resource",
      header: "Resource / Details",
      render: (row: AuditLog) => (
        <div>
          <p className="text-sm text-[var(--text-color)] dark:text-white">
            {row.resource ?? "-"}
          </p>
          <p className="text-xs text-[var(--text-secondary)] dark:text-gray-400">
            {formatDetails(row.details)}
          </p>
        </div>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (row: AuditLog) => {
        const normalized = normalizeStatus(
          row.status?.toString(),
        );
        const label =
          normalized === "error"
            ? "Rejected"
            : "Successfully performed";
        return (
          <MedicalBadge variant={normalized as StatusVariant}>
            {label}
          </MedicalBadge>
        );
      },
    },
  ];

  // handlers
  const handleRowClick = (row: AuditLog) => setSelectedLog(row);
  const handlePageChange = (newPage: number) =>
    setPage(newPage);
  const handlePageSizeChange = (newSize: number) => {
    setPageSize(newSize);
    setPage(1);
  };

  return (
    <div className="space-y-6">
      <div className="relative mb-6">
        {/* Soft glow background decoration */}
        <div
          className="
    absolute -top-4 -left-4 
    w-24 h-24 
    bg-indigo-500/10 dark:bg-indigo-400/10 
    blur-3xl rounded-full 
    pointer-events-none
  "
        />

        <motion.h1
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="
      text-2xl font-bold tracking-tight 
      text-[var(--text-color)] dark:text-white 
      relative z-10
    "
        >
          Audit Logs
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="
      text-sm mt-1 
      text-[var(--text-secondary)] dark:text-gray-400 
      relative z-10
    "
        >
          System activity and security events
        </motion.p>

        {/* Small underline accent */}
        <div
          className="
    mt-2 w-14 h-1.5 
    rounded-full 
    bg-gradient-to-r from-indigo-500 to-purple-600
    dark:from-indigo-400 dark:to-purple-500
  "
        />
      </div>

      {/* no filters section as requested */}

      <MedicalCard className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            {/* Left Side */}
            <div className="flex items-center gap-3">
              {/* Icon with glow ring */}
              <div
                className="
      w-10 h-10 flex items-center justify-center 
      rounded-xl 
      bg-gradient-to-br from-indigo-500/20 to-purple-600/20 
      backdrop-blur-sm 
      shadow-sm 
      border border-indigo-300/30 dark:border-indigo-500/20
      ring-2 ring-transparent hover:ring-indigo-400/40 
      transition-all duration-300
    "
              >
                <Activity className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              </div>

              {/* Title */}
              <h3
                className="
      text-lg font-semibold 
      text-[var(--text-color)] dark:text-white 
      tracking-wide
    "
              >
                Recent Activity
              </h3>
            </div>

            {/* Right Side Count */}
            <div
              className="
    text-sm font-medium 
    px-3 py-1.5 
    rounded-lg 
    bg-gray-100 dark:bg-gray-800 
    text-[var(--text-color)] dark:text-gray-300 
    border border-gray-200 dark:border-gray-700
    shadow-sm 
  "
            >
              {loading ? "Loading..." : `${total} total`}
            </div>
          </div>

          <div className="overflow-x-auto">
            <MedicalTable
              columns={columns}
              data={pagedLogs}
              // note: removed `loading` prop because your MedicalTable type doesn't accept it
              page={page}
              pageSize={pageSize}
              total={total}
              onRowClick={handleRowClick}
              onPageChange={handlePageChange}
              onPageSizeChange={handlePageSizeChange}
              searchable={false}
              rowClassName="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
            />
          </div>

          {!loading && allLogs.length === 0 && (
            <div className="text-center py-12">
              <Activity className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
              <p className="text-gray-500 dark:text-gray-400">
                No logs available
              </p>
            </div>
          )}
        </div>
      </MedicalCard>

      {/* Full-width Stats Card */}
      <div className="grid grid-cols-1 w-full">
        <MedicalCard
          className="
      p-6 
      bg-white dark:bg-gray-800 
      rounded-2xl 
      shadow-md 
      border border-gray-200 dark:border-gray-700
      hover:shadow-xl hover:-translate-y-1 
      transition-all duration-300
    "
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-[var(--text-secondary)] dark:text-gray-400">
                Total Events
              </p>

              <h3 className="mt-2 text-4xl font-bold text-[var(--text-color)] dark:text-white">
                {total}
              </h3>
            </div>

            {/* Icon Box */}
            <div
              className="
          w-16 h-16 
          rounded-2xl 
          flex items-center justify-center 
          text-white 
          shadow-lg 
          bg-gradient-to-r from-indigo-500 to-purple-600
        "
            >
              <Activity className="w-8 h-8" />
            </div>
          </div>

          {/* Bottom Accent Bar */}
          <div className="mt-4 w-full h-1 rounded-full bg-gradient-to-r from-indigo-500 to-purple-600" />
        </MedicalCard>
      </div>

      {/* Detail drawer/modal */}
      <AnimatePresence>
        {selectedLog && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center">
              <div
                className="absolute inset-0 bg-black/40"
                onClick={() => setSelectedLog(null)}
              />
              <motion.div
                initial={{ y: 40, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 40, opacity: 0 }}
                className="relative w-full max-w-2xl mx-4 bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-[var(--border-color)] dark:border-gray-800 p-6 z-10"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="text-lg font-semibold text-[var(--text-color)] dark:text-white">
                      Log Details
                    </h3>
                    <p className="text-sm text-[var(--text-secondary)] mt-1">
                      ID: {selectedLog.id}
                    </p>
                  </div>
                  <div>
                    <MedicalButton
                      variant="secondary"
                      onClick={() => setSelectedLog(null)}
                    >
                      Close
                    </MedicalButton>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                  <div className="space-y-2">
                    <p className="text-xs text-[var(--text-secondary)]">
                      Date
                    </p>
                    <p className="text-[var(--text-color)] dark:text-white">
                      {new Date(
                        selectedLog.timestamp,
                      ).toLocaleDateString()}
                    </p>

                    <p className="text-xs text-[var(--text-secondary)] mt-2">
                      Time
                    </p>
                    <p className="text-[var(--text-color)] dark:text-white">
                      {new Date(
                        selectedLog.timestamp,
                      ).toLocaleTimeString()}
                    </p>

                    <p className="text-xs text-[var(--text-secondary)] mt-2">
                      User
                    </p>
                    <p className="text-[var(--text-color)] dark:text-white">
                      {getActor(selectedLog).displayName}{" "}
                      {selectedLog.userId && (
                        <span className="text-xs text-[var(--text-secondary)]">
                          ({selectedLog.userId})
                        </span>
                      )}
                    </p>

                    <p className="text-xs text-[var(--text-secondary)] mt-2">
                      Action
                    </p>
                    <p className="text-[var(--text-color)] dark:text-white">
                      {selectedLog.action}
                    </p>

                    <p className="text-xs text-[var(--text-secondary)] mt-2">
                      Resource
                    </p>
                    <p className="text-[var(--text-color)] dark:text-white">
                      {selectedLog.resource ?? "-"}
                    </p>
                  </div>

                  <div className="space-y-2">
                    <p className="text-xs text-[var(--text-secondary)]">
                      Details
                    </p>
                    <p className="break-words text-[var(--text-color)] dark:text-white">
                      {formatDetails(selectedLog.details)}
                    </p>

                    <p className="text-xs text-[var(--text-secondary)] mt-2">
                      Status
                    </p>
                    <MedicalBadge
                      variant={
                        normalizeStatus(
                          selectedLog.status?.toString(),
                        ) as StatusVariant
                      }
                    >
                      {normalizeStatus(
                        selectedLog.status?.toString(),
                      ) === "error"
                        ? "Rejected"
                        : "Successfully performed"}
                    </MedicalBadge>
                  </div>
                </div>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default AuditLogsPage;