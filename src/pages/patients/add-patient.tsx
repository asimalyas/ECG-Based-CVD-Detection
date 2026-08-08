import React, { useState } from "react";
import {
  MedicalInput,
  MedicalSelect,
} from "../../components/ui/medical-input";
import { MedicalButton } from "../../components/ui/medical-button";
import { MedicalCard } from "../../components/ui/medical-card";
import { useToast } from "../../components/ui/medical-toast";
import { UserPlus, ArrowLeft } from "lucide-react";

interface AddPatientPageProps {
  onNavigateBack: () => void;
  onSubmit: (data: any) => void;
}

export function AddPatientPage({
  onNavigateBack,
  onSubmit,
}: AddPatientPageProps) {
  const [formData, setFormData] = useState({
    name: "",
    gender: "",
    dateOfBirth: "",
    email: "",
    phone: "",
    address: "",
    emergencyContact: "",
    emergencyPhone: "",
    assignedDoctor: "",
    medicalHistory: "",
  });

  const [errors, setErrors] = useState<Record<string, string>>(
    {},
  );
  const [loading, setLoading] = useState(false);
  const { showToast } = useToast();

  const genderOptions = [
    { value: "", label: "Select Gender" },
    { value: "male", label: "Male" },
    { value: "female", label: "Female" },
    { value: "other", label: "Other" },
  ];

  const doctorOptions = [
    { value: "", label: "Select Doctor" },
    {
      value: "dr-smith",
      label: "Dr. Sarah Smith - Cardiologist",
    },
    {
      value: "dr-johnson",
      label: "Dr. Michael Johnson - Cardiologist",
    },
    {
      value: "dr-williams",
      label: "Dr. Emily Williams - Cardiac Specialist",
    },
  ];

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name) newErrors.name = "Name is required";
    if (!formData.gender)
      newErrors.gender = "Gender is required";
    if (!formData.dateOfBirth)
      newErrors.dateOfBirth = "Date of birth is required";

    if (!formData.email) {
      newErrors.email = "Email is required";
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = "Please enter a valid email";
    }

    if (!formData.phone)
      newErrors.phone = "Phone number is required";
    if (!formData.assignedDoctor)
      newErrors.assignedDoctor = "Please assign a doctor";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) {
      return;
    }

    setLoading(true);

    setTimeout(() => {
      setLoading(false);
      showToast("success", "Patient added successfully!");
      onSubmit(formData);
    }, 1500);
  };

  const updateField = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }));
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button
          onClick={onNavigateBack}
          className="p-2 rounded-lg hover:bg-[var(--bg-light)] transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1>Add New Patient</h1>
          <p className="text-[var(--text-secondary)] mt-1">
            Enter patient information below
          </p>
        </div>
      </div>

      <MedicalCard>
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div>
            <h3 className="mb-4">Personal Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <MedicalInput
                label="Full Name"
                placeholder="John Doe"
                value={formData.name}
                onChange={(e) =>
                  updateField("name", e.target.value)
                }
                error={errors.name}
                required
              />

              <MedicalSelect
                label="Gender"
                options={genderOptions}
                value={formData.gender}
                onChange={(e) =>
                  updateField("gender", e.target.value)
                }
                error={errors.gender}
                required
              />

              <MedicalInput
                type="date"
                label="Date of Birth"
                value={formData.dateOfBirth}
                onChange={(e) =>
                  updateField("dateOfBirth", e.target.value)
                }
                error={errors.dateOfBirth}
                required
              />

              <MedicalSelect
                label="Assigned Doctor"
                options={doctorOptions}
                value={formData.assignedDoctor}
                onChange={(e) =>
                  updateField("assignedDoctor", e.target.value)
                }
                error={errors.assignedDoctor}
                required
              />
            </div>
          </div>

          <div>
            <h3 className="mb-4">Contact Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <MedicalInput
                type="email"
                label="Email Address"
                placeholder="patient@example.com"
                value={formData.email}
                onChange={(e) =>
                  updateField("email", e.target.value)
                }
                error={errors.email}
                required
              />

              <MedicalInput
                type="tel"
                label="Phone Number"
                placeholder="+1 (555) 123-4567"
                value={formData.phone}
                onChange={(e) =>
                  updateField("phone", e.target.value)
                }
                error={errors.phone}
                required
              />

              <div className="md:col-span-2">
                <MedicalInput
                  label="Address"
                  placeholder="123 Main St, City, State, ZIP"
                  value={formData.address}
                  onChange={(e) =>
                    updateField("address", e.target.value)
                  }
                />
              </div>
            </div>
          </div>

          <div>
            <h3 className="mb-4">Emergency Contact</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <MedicalInput
                label="Emergency Contact Name"
                placeholder="Jane Doe"
                value={formData.emergencyContact}
                onChange={(e) =>
                  updateField(
                    "emergencyContact",
                    e.target.value,
                  )
                }
              />

              <MedicalInput
                type="tel"
                label="Emergency Contact Phone"
                placeholder="+1 (555) 987-6543"
                value={formData.emergencyPhone}
                onChange={(e) =>
                  updateField("emergencyPhone", e.target.value)
                }
              />
            </div>
          </div>

          <div>
            <h3 className="mb-4">Additional Information</h3>
            <MedicalInput
              label="Medical History"
              placeholder="Previous conditions, allergies, medications, etc."
              value={formData.medicalHistory}
              onChange={(e) =>
                updateField("medicalHistory", e.target.value)
              }
              helperText="Optional: Relevant medical history or notes"
            />
          </div>

          <div className="flex gap-3 pt-4 border-t border-[var(--border-color)]">
            <MedicalButton
              type="button"
              variant="secondary"
              onClick={onNavigateBack}
            >
              Cancel
            </MedicalButton>
            <MedicalButton
              type="submit"
              variant="primary"
              loading={loading}
            >
              <UserPlus className="w-4 h-4" />
              Add Patient
            </MedicalButton>
          </div>
        </form>
      </MedicalCard>
    </div>
  );
}