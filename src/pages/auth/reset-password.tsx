import React, { useState } from "react";
import { MedicalInput } from "../../components/ui/medical-input";
import { MedicalButton } from "../../components/ui/medical-button";
import { useToast } from "../../components/ui/medical-toast";
import {
  Activity,
  Eye,
  EyeOff,
  CheckCircle,
} from "lucide-react";

interface ResetPasswordPageProps {
  onNavigateToLogin: () => void;
}

export function ResetPasswordPage({
  onNavigateToLogin,
}: ResetPasswordPageProps) {
  const [formData, setFormData] = useState({
    password: "",
    confirmPassword: "",
  });

  const [errors, setErrors] = useState<Record<string, string>>(
    {},
  );
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] =
    useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);
  const { showToast } = useToast();

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.password) {
      newErrors.password = "Password is required";
    } else if (formData.password.length < 8) {
      newErrors.password =
        "Password must be at least 8 characters";
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword =
        "Please confirm your password";
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match";
    }

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
      setResetSuccess(true);
      showToast(
        "success",
        "Password has been reset successfully!",
      );
    }, 1500);
  };

  const updateField = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }));
    }
  };

  const getPasswordStrength = () => {
    const { password } = formData;
    if (!password) return { strength: 0, label: "", color: "" };

    let strength = 0;
    if (password.length >= 8) strength++;
    if (password.length >= 12) strength++;
    if (/[a-z]/.test(password) && /[A-Z]/.test(password))
      strength++;
    if (/\d/.test(password)) strength++;
    if (/[^a-zA-Z0-9]/.test(password)) strength++;

    if (strength <= 2)
      return {
        strength: 33,
        label: "Weak",
        color: "bg-[var(--error-color)]",
      };
    if (strength <= 3)
      return {
        strength: 66,
        label: "Medium",
        color: "bg-[var(--warning-color)]",
      };
    return {
      strength: 100,
      label: "Strong",
      color: "bg-[var(--success-color)]",
    };
  };

  const passwordStrength = getPasswordStrength();

  if (resetSuccess) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[var(--primary-color)] to-[var(--primary-dark)] flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-2xl shadow-2xl p-8">
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-[var(--success-color)] rounded-full mb-4">
                <CheckCircle className="w-8 h-8 text-white" />
              </div>
              <h1 className="text-[var(--text-color)] mb-2">
                Password Reset Complete
              </h1>
              <p className="text-[var(--text-secondary)]">
                Your password has been successfully reset. You
                can now sign in with your new password.
              </p>
            </div>

            <MedicalButton
              variant="primary"
              className="w-full"
              onClick={onNavigateToLogin}
            >
              Continue to Login
            </MedicalButton>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[var(--primary-color)] to-[var(--primary-dark)] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-[var(--primary-color)] rounded-2xl mb-4">
              <Activity className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-[var(--text-color)] mb-2">
              Reset Password
            </h1>
            <p className="text-[var(--text-secondary)]">
              Enter your new password below
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <div className="relative">
                <MedicalInput
                  type={showPassword ? "text" : "password"}
                  label="New Password"
                  placeholder="Create a strong password"
                  value={formData.password}
                  onChange={(e) =>
                    updateField("password", e.target.value)
                  }
                  error={errors.password}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-9 text-[var(--text-secondary)] hover:text-[var(--text-color)]"
                >
                  {showPassword ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>

              {formData.password && (
                <div className="mt-2">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-[var(--text-secondary)]">
                      Password strength:
                    </span>
                    <span
                      className={`text-xs ${passwordStrength.color.replace("bg-", "text-")}`}
                    >
                      {passwordStrength.label}
                    </span>
                  </div>
                  <div className="w-full h-1 bg-[var(--bg-gray)] rounded-full overflow-hidden">
                    <div
                      className={`h-full ${passwordStrength.color} transition-all duration-300`}
                      style={{
                        width: `${passwordStrength.strength}%`,
                      }}
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="relative">
              <MedicalInput
                type={showConfirmPassword ? "text" : "password"}
                label="Confirm New Password"
                placeholder="Re-enter your password"
                value={formData.confirmPassword}
                onChange={(e) =>
                  updateField("confirmPassword", e.target.value)
                }
                error={errors.confirmPassword}
                required
              />
              <button
                type="button"
                onClick={() =>
                  setShowConfirmPassword(!showConfirmPassword)
                }
                className="absolute right-3 top-9 text-[var(--text-secondary)] hover:text-[var(--text-color)]"
              >
                {showConfirmPassword ? (
                  <EyeOff className="w-5 h-5" />
                ) : (
                  <Eye className="w-5 h-5" />
                )}
              </button>
            </div>

            <div className="p-3 bg-[var(--bg-light)] rounded-lg">
              <p className="text-sm text-[var(--text-secondary)]">
                Password requirements:
              </p>
              <ul className="text-xs text-[var(--text-secondary)] mt-2 space-y-1 list-disc list-inside">
                <li>At least 8 characters long</li>
                <li>Mix of uppercase and lowercase letters</li>
                <li>At least one number</li>
                <li>At least one special character</li>
              </ul>
            </div>

            <MedicalButton
              type="submit"
              variant="primary"
              className="w-full"
              loading={loading}
            >
              Reset Password
            </MedicalButton>
          </form>
        </div>

        <p className="text-center text-white text-sm mt-6">
          © 2025 CardioDetect AI. All rights reserved.
        </p>
      </div>
    </div>
  );
}