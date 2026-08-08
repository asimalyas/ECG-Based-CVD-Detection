import React from "react";
import {
  MedicalCard,
  StatCard,
} from "../../components/ui/medical-card";
import { MedicalTable } from "../../components/ui/medical-table";
import { StatusBadge } from "../../components/ui/medical-badge";
import {
  ArrowLeft,
  User,
  Phone,
  MapPin,
  FileText,
  Download,
  Eye,
} from "lucide-react";

interface PatientProfilePageProps {
  patientId: string;
  onNavigateBack: () => void;
  onNavigateToReport: (reportId: string) => void;
}

export function PatientProfilePage({
  patientId,
  onNavigateBack,
  onNavigateToReport,
}: PatientProfilePageProps) {
  const patient = {
    id: patientId,
    name: "Ayesha Khan",
    gender: "Female",
    age: 62,
    dateOfBirth: "1963-03-15",
    email: "ayesha.khan@example.pk",
    phone: "+92 300 1234567",
    address: "Gulberg, Lahore",
    assignedDoctor: "Dr. Imran Ali",
    status: "active" as const,
    registrationDate: "2023-01-15",
  };

  const stats = [
    {
      title: "Total Reports",
      value: "8",
      icon: FileText,
      variant: "primary" as const,
    },
    {
      title: "Status",
      value: "Active",
      icon: User,
      variant: "success" as const,
    },
  ];

  const reports = [
    {
      id: "ECG-PK-001",
      date: "2025-11-27",
      conditionRaw: "Normal ",
      confidence: 98,
      status: "approved" as const,
    },
    {
      id: "ECG-PK-015",
      date: "2025-10-15",
      conditionRaw: "Normal ",
      confidence: 96,
      status: "approved" as const,
    },
    {
      id: "ECG-PK-022",
      date: "2025-09-10",
      conditionRaw: "Abnormal",
      confidence: 85,
      status: "approved" as const,
    },
  ];

  const simpleCondition = (raw: string) =>
    raw.toLowerCase().includes("normal")
      ? "Normal"
      : "Abnormal";

  const conditionBadge = (cond: "Normal" | "Abnormal") =>
    cond === "Normal" ? (
      <span
        role="status"
        aria-label="Normal condition"
        className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100"
      >
        Normal
      </span>
    ) : (
      <span
        role="status"
        aria-label="Abnormal condition"
        className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-800 dark:bg-red-800 dark:text-red-100"
      >
        Abnormal
      </span>
    );

  const columns = [
    { key: "id", header: "Report ID", sortable: true },
    { key: "date", header: "Date", sortable: true },
    {
      key: "condition",
      header: "Condition",
      render: (row: any) => {
        const s = simpleCondition(row.conditionRaw);
        return (
          <div className="flex flex-col">
            {conditionBadge(s as any)}
            <p className="text-xs text-[var(--text-secondary)] mt-1">
              AI Confidence: <strong>{row.confidence}%</strong>
            </p>
          </div>
        );
      },
    },
    {
      key: "status",
      header: "Status",
      render: (row: any) => <StatusBadge status={row.status} />,
    },
    {
      key: "actions",
      header: "Actions",
      render: (row: any) => (
        <button
          onClick={() => onNavigateToReport(row.id)}
          aria-label={`View report ${row.id}`}
          className="flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium
                     bg-[rgba(59,130,246,0.12)] text-[var(--primary-color)]
                     hover:bg-[rgba(59,130,246,0.18)]
                     transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--focus-ring)]"
        >
          <Eye className="w-4 h-4" />
          View
        </button>
      ),
    },
  ];

  return (
    <div className="space-y-6 p-4 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={onNavigateBack}
          aria-label="Go back"
          className="p-2 rounded-md hover:bg-[var(--hover-surface)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--focus-ring)]"
        >
          <ArrowLeft className="w-5 h-5 text-[var(--text-primary)]" />
        </button>

        <div>
          <h1 className="text-3xl font-semibold text-[var(--text-primary)]">
            Patient Profile
          </h1>
          <p className="text-sm text-[var(--text-secondary)]">
            {patient.id}
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {stats.map((stat, idx) => (
          <div key={idx} className="rounded-lg">
            <StatCard {...stat} />
          </div>
        ))}
      </div>

      {/* Profile + Reports */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Summary Card */}
        <div className="lg:col-span-1">
          {/* Use a stronger, opaque card background for dark mode so content doesn't wash out */}
          <MedicalCard>
            <div
              className="p-5 space-y-4 rounded-lg
                         bg-white text-slate-800 dark:bg-slate-800 dark:text-slate-100
                         shadow-sm dark:shadow-lg ring-1 ring-slate-100/60 dark:ring-slate-900/40"
              role="region"
              aria-labelledby="patient-summary-heading"
            >
              <div className="text-center">
                <div
                  className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-3
                             bg-gradient-to-tr from-[var(--primary-color)]/10 to-transparent dark:from-[var(--primary-color-dark)]/15
                             ring-1 ring-[color:var(--avatar-ring)]"
                  aria-hidden="true"
                >
                  <span className="text-2xl font-semibold text-[var(--primary-color)] dark:text-[var(--primary-color-dark)]">
                    {patient.name
                      .split(" ")
                      .map((n) => n[0])
                      .join("")}
                  </span>
                </div>

                <h2
                  id="patient-summary-heading"
                  className="text-lg font-semibold"
                >
                  {patient.name}
                </h2>
                <p className="text-sm text-[var(--text-secondary)]">
                  {patient.age} years • {patient.gender}
                </p>

                <div className="mt-3">
                  <StatusBadge status={patient.status} />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-200/60 dark:border-slate-700/60 space-y-3">
                <div className="flex items-start gap-3">
                  <Phone className="w-4 h-4 mt-1 text-[var(--text-secondary)]" />
                  <div>
                    <p className="text-xs text-[var(--text-secondary)]">
                      Phone
                    </p>
                    <p className="text-sm">{patient.phone}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <MapPin className="w-4 h-4 mt-1 text-[var(--text-secondary)]" />
                  <div>
                    <p className="text-xs text-[var(--text-secondary)]">
                      Address
                    </p>
                    <p className="text-sm">{patient.address}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <User className="w-4 h-4 mt-1 text-[var(--text-secondary)]" />
                  <div>
                    <p className="text-xs text-[var(--text-secondary)]">
                      Assigned Doctor
                    </p>
                    <p className="text-sm">
                      {patient.assignedDoctor}
                    </p>
                  </div>
                </div>
              </div>

              <div className="pt-4 flex gap-2 items-center justify-between">
                <div className="text-xs text-[var(--text-secondary)]">
                  <div>Registered</div>
                  <div className="font-medium">
                    {new Date(
                      patient.registrationDate,
                    ).toLocaleDateString()}
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md text-sm bg-[var(--bg-cta)] hover:brightness-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--focus-ring)]"
                    aria-label="Download summary"
                  >
                    <Download className="w-4 h-4" />
                    Export
                  </button>

                  <button
                    className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md text-sm border border-slate-200/40 dark:border-slate-700/40 hover:bg-slate-50/40 dark:hover:bg-slate-700/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--focus-ring)]"
                    aria-label="Open details"
                  >
                    <Eye className="w-4 h-4" />
                    Details
                  </button>
                </div>
              </div>
            </div>
          </MedicalCard>
        </div>

        {/* Reports */}
        <div className="lg:col-span-2">
          <MedicalCard>
            <div className="p-6">
              <div className="flex items-start justify-between mb-4 gap-4">
                <h2 className="text-lg font-semibold text-[var(--text-primary)]">
                  Report History
                </h2>
                <div className="text-sm text-[var(--text-secondary)]">
                  Showing recent reports
                </div>
              </div>

              <div className="overflow-x-auto">
                {/* MedicalTable should inherit colors — this wrapper gives consistent table chrome */}
                <div className="rounded-md overflow-hidden border border-slate-200/60 dark:border-slate-700/60">
                  <MedicalTable
                    columns={columns}
                    data={reports}
                    searchable={false}
                  />
                </div>
              </div>
            </div>
          </MedicalCard>
        </div>
      </div>
    </div>
  );
}