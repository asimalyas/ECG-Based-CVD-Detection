import React, { useState, useEffect } from "react";
import { ToastProvider } from "./components/ui/medical-toast";
import { ThemeProvider } from "./contexts/ThemeContext";
import { MainLayout } from "./components/layout/main-layout";
import { UserRole } from "./components/layout/sidebar";

import { LoginPage } from "./pages/auth/login";
import { SignupPage } from "./pages/auth/signup";
import { ForgotPasswordPage } from "./pages/auth/forgot-password";
import { ResetPasswordPage } from "./pages/auth/reset-password";

import { DoctorDashboard } from "./pages/doctor/dashboard";
import { ReportReviewPage } from "./pages/doctor/report-review";
import { DoctorReports } from "./pages/doctor/doctor-reports";

import { TechnicianDashboard } from "./pages/technician/dashboard";
import { ECGUploadWizard } from "./pages/upload/ecg-upload-wizard";
import { UploadSuccess } from "./pages/upload/upload-success";

import { PatientDashboard } from "./pages/patient/dashboard";
import { PatientReportView } from "./pages/patient/patient-report-view";
import { PatientReports } from "./pages/patient/patient-reports";

import { AdminDashboard } from "./pages/admin/dashboard";
import { UserManagementPage } from "./pages/admin/user-management";
import { AuditLogsPage } from "./pages/admin/audit-logs";
import { PendingRequestsPage } from "./pages/admin/pending-requests";

import { AddPatientPage } from "./pages/patients/add-patient";
import { PatientListPage } from "./pages/patients/patient-list";
import { PatientProfilePage } from "./pages/patients/patient-profile";

import { ECGAnalysisPage } from "./pages/analysis/ecg-analysis";
import { SettingsPage } from "./pages/settings/settings";

import { authApi } from "./lib/api";

// FIXED: Correct Landing Page import
import { LandingPage } from "./pages/LandingPage";

type Page =
  | "landing"
  | "login"
  | "signup"
  | "forgot-password"
  | "reset-password"
  | "dashboard"
  | "patients"
  | "add-patient"
  | "patient-profile"
  | "upload"
  | "upload-success"
  | "analysis"
  | "patient-report-view"
  | "reports"
  | "report-review"
  | "users"
  | "audit"
  | "settings"
  | "my-reports"
  | "pending-requests";

interface User {
  id: string;
  email: string;
  role: UserRole;
  name: string;
  phone?: string;
  organization?: string;
}

export default function App() {
  const [currentPage, setCurrentPage] =
    useState<Page>("landing");
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedReportId, setSelectedReportId] = useState<
    string | null
  >(null);
  const [selectedPatientId, setSelectedPatientId] = useState<
    string | null
  >(null);

  useEffect(() => {
    const checkSession = async () => {
      try {
        // Initialize storage bucket
        const { initializeStorage } = await import('./lib/supabase-client');
        initializeStorage().catch(err => console.warn('Storage init warning:', err));
        
        const token = localStorage.getItem("access_token");
        if (token) {
          const response = await authApi.getCurrentUser();
          if (response.user) {
            setUser(response.user);
            setCurrentPage("dashboard");
          }
        }
      } catch (error) {
        localStorage.removeItem("access_token");
      } finally {
        setLoading(false);
      }
    };
    checkSession();
  }, []);

  const handleLogin = async (
    email: string,
    password: string,
  ) => {
    try {
      const response = await authApi.login(email, password);
      if (response.user) {
        setUser(response.user);
        setCurrentPage("dashboard");
      }
    } catch (error) {
      console.error("Login failed:", error);
    }
  };

  const handleSignup = (data: any) => {
    if (data.role === "patient" && data.email) {
      authApi
        .getCurrentUser()
        .then((response) => {
          if (response.user) {
            setUser(response.user);
            setCurrentPage("dashboard");
          }
        })
        .catch((error) =>
          console.error("Failed after signup:", error),
        );
    }
  };

  const handleLogout = () => {
    authApi.logout();
    setUser(null);
    setCurrentPage("landing"); // Go back to landing
  };

  const navigate = (page: Page, data?: any) => {
    if (data?.reportId) setSelectedReportId(data.reportId);
    if (data?.patientId) setSelectedPatientId(data.patientId);
    setCurrentPage(page);
  };

  const renderAuthPages = () => {
    switch (currentPage) {
      case "login":
        return (
          <LoginPage
            onLogin={handleLogin}
            onNavigateToSignup={() => setCurrentPage("signup")}
            onNavigateToForgotPassword={() =>
              setCurrentPage("forgot-password")
            }
            onNavigateToLanding={() =>
              setCurrentPage("landing")
            }
          />
        );

      case "signup":
        return (
          <SignupPage
            onSignup={handleSignup}
            onNavigateToLogin={() => setCurrentPage("login")}
            onNavigateToLanding={() =>
              setCurrentPage("landing")
            }
          />
        );

      case "forgot-password":
        return (
          <ForgotPasswordPage
            onNavigateToLogin={() => setCurrentPage("login")}
          />
        );

      case "reset-password":
        return (
          <ResetPasswordPage
            onNavigateToLogin={() => setCurrentPage("login")}
          />
        );

      default:
        return null;
    }
  };

  const renderDashboardContent = () => {
    if (!user) return null;

    switch (currentPage) {
      case "dashboard":
        if (user.role === "doctor")
          return (
            <DoctorDashboard
              onNavigateToReport={(id) =>
                navigate("report-review", { reportId: id })
              }
              onDiagnose={(id) =>
                navigate("analysis", { reportId: id })
              }
            />
          );
        if (user.role === "technician")
          return (
            <TechnicianDashboard
              onNavigateToUpload={() => navigate("upload")}
              onNavigateToAnalysis={(id) =>
                navigate("analysis", { reportId: id })
              }
            />
          );
        if (user.role === "patient")
          return (
            <PatientDashboard
              onViewReport={(id) =>
                navigate("patient-report-view", { reportId: id })
              }
            />
          );
        if (user.role === "admin")
          return (
            <AdminDashboard
              onNavigateToUsers={() => navigate("users")}
              onNavigateToAudit={() => navigate("audit")}
            />
          );
        break;

      case "pending-requests":
        return (
          <PendingRequestsPage
            onNavigateBack={() => navigate("dashboard")}
          />
        );

      case "patients":
        return (
          <PatientListPage
            onNavigateToAdd={() => navigate("add-patient")}
            onNavigateToProfile={(id) =>
              navigate("patient-profile", { patientId: id })
            }
            onNavigateToEdit={(id) =>
              navigate("add-patient", { patientId: id })
            }
          />
        );

      case "add-patient":
        return (
          <AddPatientPage
            onNavigateBack={() => navigate("patients")}
            onSubmit={() => navigate("patients")}
          />
        );

      case "patient-profile":
        return (
          selectedPatientId && (
            <PatientProfilePage
              patientId={selectedPatientId}
              onNavigateBack={() => navigate("patients")}
              onNavigateToReport={(id) =>
                navigate("analysis", { reportId: id })
              }
            />
          )
        );

      case "upload":
        return (
          <ECGUploadWizard
            onComplete={(data) => {
              if (data.action === 'analyze') {
                 navigate("analysis", { reportId: data.recordId });
              } else {
                 navigate("upload-success");
              }
            }}
            onCancel={() => navigate("dashboard")}
            userRole={user.role}
          />
        );

      case "upload-success":
        return <UploadSuccess onNavigateToDashboard={() => navigate("dashboard")} />;

      case "analysis":
        if (!user) return null;
        return selectedReportId && (
          <ECGAnalysisPage
            recordId={selectedReportId}
            userRole={user.role}
            onNavigateToDashboard={() => navigate("dashboard")}
            onAnalysisComplete={() => {
              if (user.role === 'doctor') {
                navigate("report-review", { reportId: selectedReportId });
              } else if (user.role === 'patient') {
                navigate("dashboard");
              } else {
                navigate("dashboard");
              }
            }}
          />
        );

      case "patient-report-view":
        return selectedReportId && <PatientReportView recordId={selectedReportId} onNavigateToDashboard={() => navigate("dashboard")} />;

      case "reports":
        if (user.role === "doctor") {
          return (
            <DoctorReports 
              onNavigateToReport={(id) => navigate("report-review", { reportId: id })} 
              onDiagnose={(id) => navigate("analysis", { reportId: id })} 
            />
          );
        }
        if (user.role === "patient") {
          return (
            <PatientReports 
              onViewReport={(id) => navigate("patient-report-view", { reportId: id })} 
            />
          );
        }
        return <div className="p-12 text-center text-[var(--danger-color)] font-bold text-xl">Access Denied</div>;

      case "report-review":
        if (user.role !== "doctor") return <div className="p-12 text-center text-[var(--danger-color)] font-bold text-xl">Access Denied: Doctors Only</div>;
        return selectedReportId && <ReportReviewPage recordId={selectedReportId} onNavigateToDashboard={() => navigate("dashboard")} />;

      case "users":
        return (
          <UserManagementPage
            onNavigateBack={() => navigate("dashboard")}
          />
        );

      case "audit":
        return <AuditLogsPage />;

      case "settings":
        return (
          <SettingsPage
            currentUser={user}
            onUpdateUser={(d) => setUser({ ...user, ...d })}
          />
        );

      default:
        return <div>Page Not Found</div>;
    }
  };

  if (loading)
    return (
      <ThemeProvider>
        <ToastProvider>
          <div className="min-h-screen flex items-center justify-center bg-white dark:bg-gray-900">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#1976D2] mx-auto mb-4"></div>
              <p className="text-gray-600 dark:text-gray-400">
                Loading...
              </p>
            </div>
          </div>
        </ToastProvider>
      </ThemeProvider>
    );

  // 🔥 FIXED: Landing Page should show first when no user is logged in
  if (!user && currentPage === "landing") {
    return (
      <ThemeProvider>
        <ToastProvider>
          <LandingPage
            onNavigateToSignIn={() => {
              console.log("Navigate to Login");
              setCurrentPage("login");
            }}
          />
        </ToastProvider>
      </ThemeProvider>
    );
  }

  if (!user) {
    return (
      <ThemeProvider>
        <ToastProvider>{renderAuthPages()}</ToastProvider>
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider>
      <ToastProvider>
        <MainLayout
          currentPage={currentPage}
          onNavigate={(page) => navigate(page as Page)}
          userName={user.name}
          userRole={user.role}
          onLogout={handleLogout}
        >
          {renderDashboardContent()}
        </MainLayout>
      </ToastProvider>
    </ThemeProvider>
  );
}