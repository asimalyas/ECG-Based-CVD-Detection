import React, { useState, useEffect } from "react";
import { MedicalButton } from "../../components/ui/medical-button";
import { MedicalCard } from "../../components/ui/medical-card";
import { MedicalSelect } from "../../components/ui/medical-input";
import { SearchableSelect } from "../../components/ui/searchable-select";
import {
  FileUpload,
  ProgressBar,
} from "../../components/ui/file-upload";
import { useToast } from "../../components/ui/medical-toast";
import {
  ArrowLeft,
  Check,
  Upload,
  AlertCircle,
} from "lucide-react";
import { ecgApi, userApi } from "../../lib/api";

interface ECGUploadWizardProps {
  onComplete: (data: any) => void;
  onCancel: () => void;
  userRole?: string;
}

type Step = 1 | 2 | 3;

export function ECGUploadWizard({
  onComplete,
  onCancel,
  userRole,
}: ECGUploadWizardProps) {
  const [currentStep, setCurrentStep] = useState<Step>(1);
  const [formData, setFormData] = useState({
    patientId: "",
    patientName: "",
    doctorId: "",
    doctorName: "",
    ecgFile: null as File | null,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  
  // Validation States
  const [isValidating, setIsValidating] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [validationSuccess, setValidationSuccess] = useState<string | null>(null);
  const [patients, setPatients] = useState<
    Array<{ id: string; name: string; email: string }>
  >([]);
  const [doctors, setDoctors] = useState<
    Array<{ id: string; name: string; email: string }>
  >([]);
  const [loadingPatients, setLoadingPatients] = useState(false);
  const [loadingDoctors, setLoadingDoctors] = useState(false);
  const { showToast } = useToast();

  // Fetch patients and doctors list for technicians
  useEffect(() => {
    if (userRole === "technician") {
      fetchPatients();
      fetchDoctors();
    } else if (userRole === "patient") {
      // Patients also need to select a doctor
      fetchDoctors();
    }
  }, [userRole]);

  const fetchPatients = async () => {
    setLoadingPatients(true);
    try {
      // Backend ensures only approved patients with role 'patient' are returned
      const response = await userApi.getPatients();
      setPatients(response.patients || []);
    } catch (error) {
      console.error("Error fetching patients:", error);
      showToast("error", "Failed to load patients list");
    } finally {
      setLoadingPatients(false);
    }
  };

  const fetchDoctors = async () => {
    setLoadingDoctors(true);
    try {
      console.log("Starting to fetch doctors...");
      // Backend ensures only approved doctors with role 'doctor' are returned
      // Technicians cannot select other technicians or themselves
      const response = await userApi.getDoctors();
      console.log("Doctors API response:", response);

      const doctorsList = response.doctors || [];
      console.log(
        `Received ${doctorsList.length} doctors:`,
        doctorsList,
      );

      setDoctors(doctorsList);

      // Show feedback if no doctors available
      if (doctorsList.length === 0) {
        console.warn("No approved doctors available");
        showToast(
          "warning",
          "No approved doctors available. Please contact an administrator.",
        );
      } else {
        console.log(
          `Successfully loaded ${doctorsList.length} doctors`,
        );
      }
    } catch (error: any) {
      console.error("Error fetching doctors:", error);
      console.error("Error details:", {
        message: error.message,
        stack: error.stack,
      });
      showToast(
        "error",
        `Failed to load doctors list: ${error.message}`,
      );
      setDoctors([]); // Ensure empty array on error
    } finally {
      setLoadingDoctors(false);
    }
  };

  const patientOptions = [
    {
      value: "",
      label: loadingPatients
        ? "Loading patients..."
        : "Select Patient",
    },
    ...patients.map((patient) => ({
      value: patient.id,
      label: patient.name,
      subtitle: patient.email,
    })),
  ];

  const doctorOptions = [
    {
      value: "",
      label: loadingDoctors
        ? "Loading doctors..."
        : "Select Doctor",
    },
    ...doctors.map((doctor) => ({
      value: doctor.id,
      label: doctor.name,
      subtitle: doctor.email,
    })),
  ];

  const steps = [
    { number: 1, title: "Patient & Doctor" },
    { number: 2, title: "Upload ECG" },
    { number: 3, title: "Review & Submit" },
  ];

  const validateStep = (step: Step): boolean => {
    const newErrors: Record<string, string> = {};

    if (step === 1) {
      if (userRole === "technician") {
        if (!formData.patientId) {
          newErrors.patientId = "Please select a patient";
        }
        if (!formData.doctorId) {
          newErrors.doctorId = "Please select a doctor";
        }
      } else if (userRole === "patient") {
        if (!formData.doctorId) {
          newErrors.doctorId = "Please select a doctor";
        }
      }
    } else if (step === 2) {
      if (!formData.ecgFile) {
        newErrors.ecgFile = "Please upload an ECG image";
      }
      if (formData.ecgFile) {
        const fileType = formData.ecgFile.type;
        if (!fileType.startsWith("image/png") && !fileType.startsWith("image/jpeg")) {
          newErrors.ecgFile = "Only PNG, JPG, and JPEG images are allowed";
        }
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = async () => {
    if (validateStep(currentStep)) {
      if (currentStep === 2 && formData.ecgFile) {
        setIsValidating(true);
        setValidationError(null);
        setValidationSuccess(null);
        
        try {
          const form = new FormData();
          form.append('file', formData.ecgFile);
          
          const endpoint = "http://127.0.0.1:8000/validate-ecg";
          console.log(`[DEBUG] Calling Validation API at: ${endpoint}`);
          
          const res = await fetch(endpoint, {
            method: "POST",
            body: form
          });
          
          const data = await res.json();
          console.log("[DEBUG] Validation API Response:", data);
          
          if (!data.is_ecg) {
            setValidationError(data.message || "This is not a valid ECG image. Please upload a correct ECG.");
            setIsValidating(false);
            return;
          } else {
            setValidationSuccess("Valid ECG detected. Proceeding...");
            setTimeout(() => {
              setIsValidating(false);
              setValidationSuccess(null);
              setCurrentStep((prev) => Math.min(prev + 1, 3) as Step);
            }, 1000);
            return;
          }
        } catch (e) {
          setValidationError("Validation failed to connect to server.");
          setIsValidating(false);
          return;
        }
      }
      
      setCurrentStep((prev) => Math.min(prev + 1, 3) as Step);
    }
  };

  const handleBack = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 1) as Step);
  };

  const handleSubmit = async () => {
    setUploading(true);
    setUploadProgress(0);

    try {
      if (!formData.ecgFile) {
        throw new Error("No file selected");
      }

      // Simulate progress
      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 200);

      // Convert file to base64
      const fileData = await new Promise<string>(
        (resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => {
            const base64 = reader.result as string;
            const base64Data = base64.split(",")[1];
            resolve(base64Data);
          };
          reader.onerror = reject;
          reader.readAsDataURL(formData.ecgFile!);
        },
      );

      // Upload to backend
      const response = await ecgApi.uploadECG({
        fileName: formData.ecgFile.name,
        fileData,
        patientId:
          userRole === "technician"
            ? formData.patientId
            : undefined,
        doctorId: formData.doctorId, // Both technicians and patients can assign doctors
        fileType: formData.ecgFile.type,
      });

      clearInterval(progressInterval);
      setUploadProgress(100);

      showToast(
        "success",
        "ECG uploaded successfully and sent to assigned doctor!",
      );

      // Wait a bit to show 100% progress
      setTimeout(() => {
        if (userRole === "patient") {
           onComplete({ recordId: response.record.id, action: 'analyze' });
        } else {
           onComplete({ recordId: response.record.id, action: 'success' });
        }
      }, 500);
    } catch (error: any) {
      console.error("Upload error:", error);
      showToast(
        "error",
        error.message ||
          "Failed to upload ECG. Please try again.",
      );
    } finally {
      setUploading(false);
    }
  };

  const updateField = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }));
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        // For technicians - patient and doctor selection
        if (userRole === "technician") {
          return (
            <div className="space-y-6">
              <div>
                <h3>Select Patient and Doctor</h3>
                <p className="text-[var(--text-secondary)] mt-2">
                  Choose the patient for this ECG upload and
                  assign a doctor for review
                </p>
              </div>

              <SearchableSelect
                label="Patient"
                options={patientOptions}
                value={formData.patientId}
                onChange={(value) => {
                  updateField("patientId", value);
                  const selectedOption = patientOptions.find(
                    (opt) => opt.value === value,
                  );
                  if (selectedOption) {
                    updateField(
                      "patientName",
                      selectedOption.label,
                    );
                  }
                }}
                error={errors.patientId}
                required
              />

              <SearchableSelect
                label="Assigned Doctor"
                options={doctorOptions}
                value={formData.doctorId}
                onChange={(value) => {
                  updateField("doctorId", value);
                  const selectedOption = doctorOptions.find(
                    (opt) => opt.value === value,
                  );
                  if (selectedOption) {
                    updateField(
                      "doctorName",
                      selectedOption.label,
                    );
                  }
                }}
                error={errors.doctorId}
                required
                disabled={loadingDoctors}
                helperText={
                  loadingDoctors
                    ? "Loading available doctors..."
                    : doctors.length === 0
                      ? "No approved doctors available"
                      : `${doctors.length} doctor(s) available`
                }
              />

              <div className="p-4 bg-[var(--bg-light)] border border-[var(--border-color)] rounded-lg">
                <p className="text-sm text-[var(--text-secondary)]">
                  <strong>Note:</strong> The assigned doctor
                  will receive this ECG for review and
                  diagnosis.
                  {patients.length === 0 &&
                    " If the patient list is empty, ask an administrator to add patients."}
                  {doctors.length === 0 &&
                    " If the doctor list is empty, ask an administrator to approve doctor accounts."}
                </p>
              </div>
            </div>
          );
        } else if (userRole === "patient") {
          return (
            <div className="space-y-6">
              <div>
                <h3>Select Doctor</h3>
                <p className="text-[var(--text-secondary)] mt-2">
                  Choose a doctor who will review your ECG
                </p>
              </div>

              <SearchableSelect
                label="Assigned Doctor"
                options={doctorOptions}
                value={formData.doctorId}
                onChange={(value) => {
                  updateField("doctorId", value);
                  const selectedOption = doctorOptions.find(
                    (opt) => opt.value === value,
                  );
                  if (selectedOption) {
                    updateField(
                      "doctorName",
                      selectedOption.label,
                    );
                  }
                }}
                error={errors.doctorId}
                required
                disabled={loadingDoctors}
                helperText={
                  loadingDoctors
                    ? "Loading available doctors..."
                    : doctors.length === 0
                      ? "No approved doctors available"
                      : `${doctors.length} doctor(s) available`
                }
              />

              <div className="p-4 bg-[var(--bg-light)] border border-[var(--border-color)] rounded-lg">
                <p className="text-sm text-[var(--text-secondary)]">
                  <strong>Note:</strong> The selected doctor
                  will receive your ECG for review and
                  diagnosis.
                  {doctors.length === 0 &&
                    " If the doctor list is empty, ask an administrator to approve doctor accounts."}
                </p>
              </div>
            </div>
          );
        } else {
          // For other roles, skip this step
          setCurrentStep(2);
          return null;
        }

      case 2:
        return (
          <div className="space-y-6">
            <div>
              <h3>Upload ECG Image</h3>
              <p className="text-[var(--text-secondary)] mt-2">
                Upload the ECG image in PNG or JPG format
              </p>
            </div>

            <FileUpload
              onFileSelect={(file) => {
                updateField("ecgFile", file);
                setValidationError(null);
                setValidationSuccess(null);
              }}
              onFileRemove={() => {
                updateField("ecgFile", null);
                setValidationError(null);
                setValidationSuccess(null);
              }}
              currentFile={formData.ecgFile}
              error={errors.ecgFile}
              label="ECG Image File"
              accept=".png,.jpg,.jpeg"
              helperText="Accepted formats: PNG, JPG, JPEG (Max 10MB)"
              showPreview={true}
            />

            {isValidating && (
               <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-[var(--info-color)] rounded-lg flex items-center gap-3">
                 <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                 <p className="text-blue-700 dark:text-blue-400 font-medium">Validating ECG Image Structure...</p>
               </div>
            )}

            {validationError && (
               <div className="p-4 bg-red-50 dark:bg-red-900/30 border border-[var(--error-color)] rounded-lg flex flex-col gap-3">
                 <div className="flex items-center gap-2 text-red-700 dark:text-red-400">
                    <AlertCircle className="w-5 h-5 flex-shrink-0" />
                    <p className="font-semibold">{validationError}</p>
                 </div>
                 <div className="flex gap-3 mt-1">
                    <MedicalButton variant="outline" onClick={() => {
                      updateField("ecgFile", null);
                      setValidationError(null);
                    }} className="text-red-600 dark:text-red-300 border-red-200 dark:border-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 py-1.5 px-3 h-auto text-sm">
                      Remove Image
                    </MedicalButton>
                 </div>
               </div>
            )}

            {validationSuccess && (
               <div className="p-4 bg-green-50 dark:bg-green-900/30 border border-[var(--success-color)] rounded-lg flex items-center gap-2">
                 <Check className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0" />
                 <p className="text-green-700 dark:text-green-400 font-medium">{validationSuccess}</p>
               </div>
            )}

            {!validationError && !isValidating && (
              <div className="p-4 bg-[var(--info-color)] bg-opacity-10 rounded-lg border border-[var(--info-color)]">
                <p className="text-sm text-[var(--text-color)]">
                  <strong>Tip:</strong> Ensure the ECG image is
                  clear and properly oriented for accurate
                  analysis. The assigned doctor will review the
                  image and provide a diagnosis.
                </p>
              </div>
            )}
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <div>
              <h3>Review & Submit</h3>
              <p className="text-[var(--text-secondary)] mt-2">
                Please review all information before submitting
              </p>
            </div>

            <div className="space-y-4">
              {userRole === "technician" && (
                <>
                  <div className="p-4 bg-[var(--bg-light)] border border-[var(--border-color)] rounded-lg">
                    <h4 className="mb-3">
                      Patient Information
                    </h4>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <span className="text-[var(--text-secondary)]">
                        Patient:
                      </span>
                      <span>
                        {formData.patientName || "Not selected"}
                      </span>
                    </div>
                  </div>

                  <div className="p-4 bg-[var(--bg-light)] border border-[var(--border-color)] rounded-lg">
                    <h4 className="mb-3">Assigned Doctor</h4>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <span className="text-[var(--text-secondary)]">
                        Doctor:
                      </span>
                      <span>
                        {formData.doctorName || "Not assigned"}
                      </span>
                    </div>
                  </div>
                </>
              )}

              <div className="p-4 bg-[var(--bg-light)] border border-[var(--border-color)] rounded-lg">
                <h4 className="mb-3">File Information</h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <span className="text-[var(--text-secondary)]">
                    File Name:
                  </span>
                  <span className="truncate">
                    {formData.ecgFile?.name || "N/A"}
                  </span>
                  <span className="text-[var(--text-secondary)]">
                    File Size:
                  </span>
                  <span>
                    {formData.ecgFile
                      ? `${(formData.ecgFile.size / 1024 / 1024).toFixed(2)} MB`
                      : "N/A"}
                  </span>
                  <span className="text-[var(--text-secondary)]">
                    File Type:
                  </span>
                  <span className="uppercase">
                    {formData.ecgFile
                      ? formData.ecgFile.type.split("/")[1]
                      : "N/A"}
                  </span>
                </div>
              </div>
            </div>

            {uploading && (
              <div className="mt-6">
                <ProgressBar
                  progress={uploadProgress}
                  label="Uploading and processing..."
                />
              </div>
            )}

            {!uploading && (
              <div className="p-4 bg-green-50 dark:bg-green-900/30 border border-[var(--success-color)] rounded-lg flex items-start gap-3">
                <Check className="w-5 h-5 text-[var(--success-color)] flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm text-green-800 dark:text-green-400">
                    Ready to submit! The ECG will be sent to the
                    assigned doctor for review and diagnosis.
                  </p>
                </div>
              </div>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  // Auto-skip step 1 for patients
  useEffect(() => {
    if (userRole !== "technician" && currentStep === 1) {
      setCurrentStep(2);
    }
  }, [userRole, currentStep]);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button
          onClick={onCancel}
          className="p-2 rounded-lg hover:bg-[var(--bg-light)] transition-colors"
          disabled={uploading}
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1>Upload ECG</h1>
          <p className="text-[var(--text-secondary)] mt-1">
            {userRole === "technician"
              ? `Step ${currentStep} of 3: ${steps[currentStep - 1].title}`
              : `Step ${currentStep - 1} of 2: ${steps[currentStep - 1].title}`}
          </p>
        </div>
      </div>

      {/* Step Indicator */}
      <div className="flex items-center justify-between mb-8">
        {steps.map((step, index) => {
          // Hide first step for patients
          if (userRole !== "technician" && step.number === 1) {
            return null;
          }

          return (
            <div
              key={step.number}
              className="flex items-center flex-1"
            >
              <div className="flex flex-col items-center">
                <div
                  className={`
                  w-10 h-10 rounded-full flex items-center justify-center transition-colors
                  ${
                    currentStep >= step.number
                      ? "bg-[var(--primary-color)] text-white"
                      : "bg-[var(--bg-gray)] text-[var(--text-secondary)]"
                  }
                `}
                >
                  {currentStep > step.number ? (
                    <Check className="w-5 h-5" />
                  ) : (
                    <span>
                      {userRole === "technician"
                        ? step.number
                        : step.number - 1}
                    </span>
                  )}
                </div>
                <span className="text-sm mt-2 text-[var(--text-secondary)] hidden md:block">
                  {step.title}
                </span>
              </div>
              {index < steps.length - 1 &&
                (userRole === "technician" ||
                  step.number > 1) && (
                  <div
                    className={`
                  flex-1 h-1 mx-2 transition-colors
                  ${
                    currentStep > step.number
                      ? "bg-[var(--primary-color)]"
                      : "bg-[var(--bg-gray)]"
                  }
                `}
                  />
                )}
            </div>
          );
        })}
      </div>

      <MedicalCard>
        <div className="p-8">{renderStepContent()}</div>
      </MedicalCard>

      <div className="flex justify-between">
        <MedicalButton
          variant="secondary"
          onClick={
            currentStep === (userRole === "technician" ? 1 : 2)
              ? onCancel
              : handleBack
          }
          disabled={uploading || isValidating}
        >
          <ArrowLeft className="w-4 h-4" />
          {currentStep === (userRole === "technician" ? 1 : 2)
            ? "Cancel"
            : "Back"}
        </MedicalButton>

        {currentStep < 3 ? (
          <MedicalButton 
            variant="primary" 
            onClick={handleNext}
            disabled={isValidating || !!validationError}
            loading={isValidating}
          >
            Next
          </MedicalButton>
        ) : (
          <MedicalButton
            variant="success"
            onClick={handleSubmit}
            loading={uploading}
          >
            <Upload className="w-4 h-4" />
            Submit for Review
          </MedicalButton>
        )}
      </div>
    </div>
  );
}
