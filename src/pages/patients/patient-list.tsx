import React, { useState, useEffect } from "react";
import { MedicalTable } from "../../components/ui/medical-table";
import { MedicalButton } from "../../components/ui/medical-button";
import { StatusBadge } from "../../components/ui/medical-badge";
import { ConfirmModal } from "../../components/ui/medical-modal";
import { useToast } from "../../components/ui/medical-toast";
import { Eye } from "lucide-react";
import { userApi } from "../../lib/api";

// ------------------------------------------------------
// TYPES
// ------------------------------------------------------

interface Patient {
  id: string;
  name: string;
  email: string;
  phone: string;
  age?: number;
  status: "active" | "inactive";
  assignedDoctor?: string;
  lastVisit?: string;
  reportCount?: number;
}

interface PatientListPageProps {
  onNavigateToAdd: () => void;
  onNavigateToProfile: (patientId: string) => void;
  onNavigateToEdit: (patientId: string) => void;
}

// ------------------------------------------------------
// MAIN COMPONENT
// ------------------------------------------------------

export function PatientListPage({
  onNavigateToAdd,
  onNavigateToProfile,
  onNavigateToEdit,
}: PatientListPageProps) {
  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean;
    patientId: string | null;
    patientName: string;
  }>({
    isOpen: false,
    patientId: null,
    patientName: "",
  });

  const { showToast } = useToast();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);

  // ------------------------------------------------------
  // FETCH PATIENTS
  // ------------------------------------------------------

  useEffect(() => {
    const fetchPatients = async () => {
      try {
        const accessToken =
          localStorage.getItem("access_token");
        if (!accessToken) {
          showToast("error", "Please sign in to view patients");
          setLoading(false);
          return;
        }

        const data = await userApi.getPatients();

        const formatted: Patient[] = data.patients.map(
          (p: any) => ({
            ...p,
            status:
              p.status === "approved" ? "active" : "inactive",
          }),
        );

        setPatients(formatted);
      } catch (error) {
        console.error("Error fetching patients:", error);
        showToast("error", "Failed to load patients");
      } finally {
        setLoading(false);
      }
    };

    fetchPatients();
  }, [showToast]);

  // ------------------------------------------------------
  // DELETE HANDLING
  // ------------------------------------------------------

  const handleDelete = (id: string, name: string) => {
    setDeleteModal({
      isOpen: true,
      patientId: id,
      patientName: name,
    });
  };

  const confirmDelete = () => {
    showToast(
      "success",
      `Patient ${deleteModal.patientName} has been removed`,
    );
    setDeleteModal({
      isOpen: false,
      patientId: null,
      patientName: "",
    });
  };

  // ------------------------------------------------------
  // TABLE COLUMNS  (ONLY 4 as you requested)
  // ------------------------------------------------------

  const columns = [
    {
      key: "id",
      header: "Patient ID",
      sortable: true,
    },
    {
      key: "name",
      header: "Name",
      sortable: true,
      render: (row: Patient) => (
        <div>
          <p className="font-medium">{row.name}</p>
          <p className="text-xs text-[var(--text-secondary)]">
            {row.age ? `${row.age} years old` : ""}
          </p>
        </div>
      ),
    },
    {
      key: "email",
      header: "Email",
      render: (row: Patient) => (
        <div>
          <p className="text-sm">{row.email}</p>
        </div>
      ),
    },
    {
      key: "phone",
      header: "Contact",
      render: (row: Patient) => (
        <div>
          <p className="text-sm">{row.phone}</p>
        </div>
      ),
    },
    {
      key: "actions",
      header: "Visit Profile",
      render: (row: Patient) => (
        <button
          onClick={() => onNavigateToProfile(row.id)}
          className="
  flex items-center gap-2 px-3 py-2 rounded-lg
  bg-[rgba(59,130,246,0.12)]            /* soft blue */
  text-[var(--primary-color)] 
  hover:bg-[rgba(59,130,246,0.20)]       /* stronger on hover */
  hover:scale-[1.03]
  transition-all duration-200
  border border-[rgba(59,130,246,0.25)]
  shadow-sm hover:shadow-md
  dark:bg-[rgba(59,130,246,0.15)]        /* dark mode friendly */
  dark:hover:bg-[rgba(59,130,246,0.25)]
  dark:border-[rgba(59,130,246,0.35)]
"
        >
          <Eye className="w-4 h-4" />
          <span className="text-sm font-medium">
            Visit Profile
          </span>
        </button>
      ),
    },
  ];

  // ------------------------------------------------------

  return (
    <div className="space-y-6">
      {/* -------------------------------------------- */}
      {/* ATTRACTIVE PAGE HEADER */}
      {/* -------------------------------------------- */}
      <div
        className="
    flex items-center justify-between 
    animate-fadeIn
  "
      >
        <div>
          <h1
            className="
        text-4xl font-extrabold tracking-wide
        text-black dark:text-white       /* <-- Perfect for both themes */
        animate-slideDown
      "
          >
            Patient Management
          </h1>

          <div
            className="
        h-[4px] w-28 
        bg-gradient-to-r from-[var(--primary-color)] to-[var(--primary-light)]
        rounded-full mt-3
        animate-expand
        opacity-90
        dark:opacity-70
      "
          />

          <p
            className="
        text-[var(--text-secondary)] 
        mt-4 text-base 
        animate-fadeInSlow
      "
          >
            Manage and view patient records
          </p>
        </div>
      </div>

      {/* -------------------------------------------- */}
      {/* PATIENT TABLE */}
      {/* -------------------------------------------- */}
      <div
        className="bg-[var(--bg-card)] rounded-xl 
        border border-[var(--border-color)]
        shadow-sm hover:shadow-md transition-all
        p-6 animate-slideUp"
      >
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--primary-color)]"></div>
            <p className="mt-4 text-[var(--text-secondary)]">
              Loading patients...
            </p>
          </div>
        ) : (
          <MedicalTable
            columns={columns}
            data={patients}
            searchable
            searchPlaceholder="Search by name, email, or ID..."
            onRowClick={(row: Patient) =>
              onNavigateToProfile(row.id)
            }
          />
        )}
      </div>

      {/* DELETE MODAL */}
      <ConfirmModal
        isOpen={deleteModal.isOpen}
        onClose={() =>
          setDeleteModal({
            isOpen: false,
            patientId: null,
            patientName: "",
          })
        }
        onConfirm={confirmDelete}
        title="Delete Patient"
        message={`Are you sure you want to delete ${deleteModal.patientName}? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
      />
    </div>
  );
}