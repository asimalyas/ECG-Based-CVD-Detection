import React, { useState, useEffect, useRef } from "react";
import {
  MedicalInput,
  MedicalSelect,
} from "../../components/ui/medical-input";
import { MedicalButton } from "../../components/ui/medical-button";
import { useToast } from "../../components/ui/medical-toast";
import {
  Activity,
  Eye,
  EyeOff,
  ArrowLeft,
  AlertTriangle,
} from "lucide-react";
import { authApi } from "../../lib/api";

interface SignupPageProps {
  onSignup: (data: any) => void;
  onNavigateToLogin: () => void;
  onNavigateToLanding?: () => void;
}

export function SignupPage({
  onSignup,
  onNavigateToLogin,
  onNavigateToLanding,
}: SignupPageProps) {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    role: "patient" as
      | "patient"
      | "doctor"
      | "technician"
      | "admin",
    phone: "",
    organization: "",
  });

  const [errors, setErrors] = useState<Record<string, string>>(
    {},
  );
  const [touched, setTouched] = useState<
    Record<string, boolean>
  >({});
  const [successFields, setSuccessFields] = useState<
    Record<string, boolean>
  >({});
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] =
    useState(false);
  const [adminExists, setAdminExists] = useState(false);
  const [checkingAdmin, setCheckingAdmin] = useState(true);
  const [adminMessage, setAdminMessage] = useState("");
  const [formErrorSummary, setFormErrorSummary] = useState("");
  const { showToast } = useToast();
  const firstErrorRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const checkAdmin = async () => {
      try {
        const response = await authApi.checkAdminExists();
        const exists = response.exists || false;
        setAdminExists(exists);

        if (exists) {
          setAdminMessage(
            "Admin already exists — request an admin invite if needed.",
          );
        }
      } catch (error) {
        console.error("Error checking admin:", error);
      } finally {
        setCheckingAdmin(false);
      }
    };
    checkAdmin();
  }, []);

  // VALIDATION — unchanged
  const validateName = (name: string): string => {
    if (!name || name.trim().length < 3) {
      return "Please enter your full name (letters & spaces, min 3 chars).";
    }
    if (!/^[a-zA-Z\s]+$/.test(name)) {
      return "Please enter your full name (letters & spaces, min 3 chars).";
    }
    return "";
  };

  const validateEmail = (email: string): string => {
    if (!email) {
      return "Please enter a valid .com email address.";
    }

    const normalized = email.trim().toLowerCase();
    const emailRegex =
      /^(?!.*\.\.)([A-Za-z][A-Za-z0-9._%+-]{0,62}[A-Za-z0-9])@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)*\.com$/i;

    if (!emailRegex.test(normalized)) {
      return "Enter a valid .com email. It must start and end with a letter/number.";
    }

    return "";
  };

  const validateRole = (role: string): string =>
    !role ? "Please select a role." : "";

  const validatePhone = (phone: string): string => {
    if (!phone)
      return "Enter phone Pakistani E.164 format: +92XXXXXXXXXX";
    const e164Regex = /^\+[1-9]\d{1,14}$/;
    if (!e164Regex.test(phone.replace(/[\s()-]/g, "")))
      return "Enter Pakistani E.164 format: +92XXXXXXXXXX";
    return "";
  };

  const validatePassword = (password: string): string => {
    if (!password || password.length < 8)
      return "Password must be 8+ chars with uppercase, lowercase, number & special char.";
    if (!/[A-Z]/.test(password))
      return "Password must include uppercase.";
    if (!/[a-z]/.test(password))
      return "Password must include lowercase.";
    if (!/\d/.test(password))
      return "Password must include number.";
    if (!/[^a-zA-Z0-9]/.test(password))
      return "Password must include special character.";
    return "";
  };

  const validateConfirmPassword = (
    confirmPassword: string,
    password: string,
  ): string => {
    if (!confirmPassword) return "Passwords do not match.";
    if (confirmPassword !== password)
      return "Passwords do not match.";
    return "";
  };

  const validateOrganization = (
    organization: string,
  ): string => {
    if (organization && organization.trim().length < 3)
      return "Organization name must be 3+ characters.";
    return "";
  };

  const validateField = (
    field: string,
    value: string,
  ): string => {
    switch (field) {
      case "name":
        return validateName(value);
      case "email":
        return validateEmail(value);
      case "role":
        return validateRole(value);
      case "phone":
        return validatePhone(value);
      case "password":
        return validatePassword(value);
      case "confirmPassword":
        return validateConfirmPassword(
          value,
          formData.password,
        );
      case "organization":
        return validateOrganization(value);
      default:
        return "";
    }
  };

  const handleBlur = (field: string) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    const error = validateField(
      field,
      formData[field as keyof typeof formData] as string,
    );

    if (error) {
      setErrors((prev) => ({ ...prev, [field]: error }));
      setSuccessFields((prev) => ({ ...prev, [field]: false }));
    } else {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });

      if (formData[field as keyof typeof formData]) {
        setSuccessFields((prev) => ({
          ...prev,
          [field]: true,
        }));
      }
    }
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};

    const fields = [
      "name",
      "email",
      "role",
      "phone",
      "password",
      "confirmPassword",
      "organization",
    ];

    fields.forEach((field) => {
      const error = validateField(
        field,
        formData[field as keyof typeof formData] as string,
      );
      if (error) newErrors[field] = error;
    });

    setErrors(newErrors);

    const errorCount = Object.keys(newErrors).length;
    if (errorCount > 0) {
      setFormErrorSummary(
        `${errorCount} error${errorCount > 1 ? "s" : ""} found — fix the highlighted fields.`,
      );
    } else {
      setFormErrorSummary("");
    }

    return errorCount === 0;
  };

  const handleSubmit = async (e?: React.FormEvent | any) => {
    if (e?.preventDefault) e.preventDefault();

    setTouched({
      name: true,
      email: true,
      role: true,
      phone: true,
      password: true,
      confirmPassword: true,
      organization: true,
    });

    if (!validate()) {
      setTimeout(() => {
        const firstError = document.querySelector(
          '[aria-invalid="true"]',
        ) as HTMLInputElement;
        firstError?.focus();
      }, 120);
      return;
    }

    if (formData.role === "admin" && adminExists) {
      showToast(
        "error",
        "Admin already exists. Please choose another role.",
      );
      return;
    }

    setLoading(true);
    try {
      const response = await authApi.signup({
        email: formData.email.toLowerCase(),
        password: formData.password,
        name: formData.name,
        role: formData.role,
        phone: formData.phone.replace(/[\s()-]/g, ""),
        organization: formData.organization,
      });

      if (response.status === "pending") {
        showToast(
          "info",
          "Your account is pending admin approval.",
        );
        setTimeout(() => onNavigateToLogin(), 1500);
      } else {
        showToast("success", "Account created successfully!");
        if (formData.role === "patient") {
          onSignup({
            email: formData.email,
            role: formData.role,
            name: formData.name,
          });
        } else {
          onNavigateToLogin();
        }
      }
    } catch (error: any) {
      showToast("error", error.message || "Signup failed.");
    } finally {
      setLoading(false);
    }
  };

  const updateField = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));

    if (touched[field] && errors[field]) {
      const newError = validateField(field, value);
      if (!newError) {
        setErrors((prev) => {
          const newErrors = { ...prev };
          delete newErrors[field];
          return newErrors;
        });

        if (value)
          setSuccessFields((prev) => ({
            ...prev,
            [field]: true,
          }));
      } else {
        setSuccessFields((prev) => ({
          ...prev,
          [field]: false,
        }));
      }
    }
  };

  const getPasswordStrength = () => {
    const { password } = formData;
    if (!password)
      return {
        strength: 0,
        label: "",
        color: "",
        textColor: "",
      };

    let strength = 0;
    if (password.length >= 8) strength++;
    if (password.length >= 12) strength++;
    if (/[a-z]/.test(password) && /[A-Z]/.test(password))
      strength++;
    if (/\d/.test(password)) strength++;
    if (/[^a-zA-Z0-9]/.test(password)) strength++;

    if (strength <= 2)
      return {
        strength: 25,
        label: "Weak",
        color: "bg-red-500",
        textColor: "text-red-600",
      };
    if (strength === 3)
      return {
        strength: 50,
        label: "Fair",
        color: "bg-yellow-400",
        textColor: "text-yellow-600",
      };
    if (strength === 4)
      return {
        strength: 75,
        label: "Good",
        color: "bg-blue-500",
        textColor: "text-blue-600",
      };
    return {
      strength: 100,
      label: "Strong",
      color: "bg-green-500",
      textColor: "text-green-600",
    };
  };

  const passwordStrength = getPasswordStrength();

  return (
    <div
      className="
        h-screen w-full flex items-center justify-center p-4 relative overflow-hidden
        dark:bg-gradient-to-br dark:from-gray-900 dark:via-gray-800 dark:to-gray-900
      "
      style={{
        background:
          "linear-gradient(135deg, #E3F2FD 0%, #BBDEFB 50%, #90CAF9 100%)",
      }}
    >
      {onNavigateToLanding && (
        <button
          onClick={onNavigateToLanding}
          className="absolute top-4 left-4 z-40 text-gray-700 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
      )}

      <div
        className="relative z-30 w-full max-w-2xl mx-auto"
        style={{
          height: "calc(100vh - 32px)",
          minHeight: "520px",
          maxHeight: "calc(100vh - 32px)",
        }}
      >
        <div
          className="
            h-full bg-white/95 dark:bg-gray-800/95 
            rounded-2xl border border-gray-200 dark:border-gray-700 
            shadow-2xl flex flex-col overflow-hidden transition-colors
          "
        >
          <div className="flex items-center gap-3 px-5 py-3 border-b border-gray-100 dark:border-gray-700">
            <div className="inline-flex items-center justify-center w-12 h-12 bg-gradient-to-br from-[#1976D2] to-[#1565C0] rounded-lg shadow">
              <Activity className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-gray-900 dark:text-white">
                Create Account
              </h2>
              <p className="text-xs text-gray-600 dark:text-gray-400">
                Register for CardioDetect AI
              </p>
            </div>
          </div>

          <div
            className="flex-1 px-4 py-3 overflow-auto dark:text-gray-200"
            style={{ minHeight: 0 }}
          >
            <form
              onSubmit={handleSubmit}
              className="h-full grid grid-rows-[auto_1fr_auto]"
            >
              <div
                aria-live="polite"
                aria-atomic="true"
                className="sr-only"
              >
                {adminMessage}
                {formErrorSummary}
              </div>

              {formErrorSummary && (
                <div
                  className="
                    mb-3 p-3 flex items-start gap-2
                    rounded-lg border
                    bg-red-50 border-red-200
                    dark:bg-red-900/40 dark:border-red-700
                  "
                >
                  <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-300" />
                  <p className="text-sm text-red-800 dark:text-red-200">
                    {formErrorSummary}
                  </p>
                </div>
              )}

              {adminExists && adminMessage && (
                <div
                  className="
                    mb-3 p-2 text-xs rounded-lg border
                    bg-blue-50 border-blue-200 text-blue-800
                    dark:bg-blue-900/20 dark:border-blue-700 dark:text-blue-300
                  "
                >
                  ℹ️ {adminMessage}
                </div>
              )}

              {/* FORM GRID — untouched, only dark mode styling added */}
              <div className="overflow-hidden">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {/* NAME */}
                  <MedicalInput
                    type="text"
                    label="Full Name"
                    placeholder="john doe"
                    value={formData.name}
                    onChange={(e) =>
                      updateField("name", e.target.value)
                    }
                    error={errors.name}
                    success={successFields.name && !errors.name}
                    className="text-sm py-2 dark:text-white dark:bg-gray-900 dark:border-gray-700 dark:placeholder-gray-400"
                    required
                    onBlur={() => handleBlur("name")}
                  />

                  {/* EMAIL */}
                  <MedicalInput
                    type="email"
                    label="Email"
                    placeholder="user@example.com"
                    value={formData.email}
                    onChange={(e) =>
                      updateField(
                        "email",
                        e.target.value.toLowerCase(),
                      )
                    }
                    error={errors.email}
                    success={
                      successFields.email && !errors.email
                    }
                    helperText="Email will be auto-lowercased on submit"
                    className="text-sm py-2 dark:text-white dark:bg-gray-900 dark:border-gray-700 dark:placeholder-gray-400"
                    required
                    onBlur={() => handleBlur("email")}
                  />

                  {/* ROLE */}
                  <MedicalSelect
                    label="Role"
                    value={formData.role}
                    onChange={(e) =>
                      updateField("role", e.target.value)
                    }
                    error={errors.role}
                    success={successFields.role && !errors.role}
                    required
                    options={[
                      { value: "patient", label: "Patient" },
                      { value: "doctor", label: "Doctor" },
                      {
                        value: "technician",
                        label: "Technician",
                      },
                      ...(!adminExists
                        ? [{ value: "admin", label: "Admin" }]
                        : []),
                    ]}
                    className="text-sm py-2 dark:bg-gray-900 dark:text-white dark:border-gray-700"
                    onBlur={() => handleBlur("role")}
                  />

                  {/* PHONE */}
                  <MedicalInput
                    type="tel"
                    label="Contact"
                    placeholder="+92XXXXXXXXXX"
                    value={formData.phone}
                    onChange={(e) =>
                      updateField("phone", e.target.value)
                    }
                    error={errors.phone}
                    success={
                      successFields.phone && !errors.phone
                    }
                    helperText="Use Pakistani E.164 format: +92 followed by 10 digits"
                    className="text-sm py-2 dark:text-white dark:bg-gray-900 dark:border-gray-700 dark:placeholder-gray-400"
                    required
                    onBlur={() => handleBlur("phone")}
                  />

                  {/* PASSWORD */}
                  <div className="relative">
                    <MedicalInput
                      type={showPassword ? "text" : "password"}
                      label="Password"
                      placeholder="Create a strong password"
                      value={formData.password}
                      onChange={(e) =>
                        updateField("password", e.target.value)
                      }
                      error={errors.password}
                      success={
                        successFields.password &&
                        !errors.password
                      }
                      helperText="8+ chars including uppercase, lowercase, number & special character"
                      className="text-sm py-2 pr-10 dark:text-white dark:bg-gray-900 dark:border-gray-700 dark:placeholder-gray-400"
                      required
                      onBlur={() => handleBlur("password")}
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setShowPassword(!showPassword)
                      }
                      className="
                        absolute right-2 top-9 
                        text-gray-500 hover:text-gray-700 
                        dark:text-gray-300 dark:hover:text-white
                      "
                    >
                      {showPassword ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>

                    {formData.password && (
                      <div className="mt-2">
                        <div className="flex items-center justify-between mb-1 text-xs">
                          <span className="text-gray-600 dark:text-gray-300">
                            Strength
                          </span>
                          <span
                            className={`font-medium ${passwordStrength.textColor} dark:text-gray-200`}
                          >
                            {passwordStrength.label}
                          </span>
                        </div>
                        <div className="w-full h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                          <div
                            className={`${passwordStrength.color} transition-all duration-300`}
                            style={{
                              width: `${passwordStrength.strength}%`,
                            }}
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* CONFIRM PASSWORD */}
                  <div className="relative">
                    <MedicalInput
                      type={
                        showConfirmPassword
                          ? "text"
                          : "password"
                      }
                      label="Confirm Password"
                      placeholder="Re-enter password"
                      value={formData.confirmPassword}
                      onChange={(e) =>
                        updateField(
                          "confirmPassword",
                          e.target.value,
                        )
                      }
                      error={errors.confirmPassword}
                      success={
                        successFields.confirmPassword &&
                        !errors.confirmPassword
                      }
                      className="text-sm py-2 pr-10 dark:text-white dark:bg-gray-900 dark:border-gray-700 dark:placeholder-gray-400"
                      required
                      onBlur={() =>
                        handleBlur("confirmPassword")
                      }
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setShowConfirmPassword(
                          !showConfirmPassword,
                        )
                      }
                      className="
                        absolute right-2 top-9 
                        text-gray-500 hover:text-gray-700
                        dark:text-gray-300 dark:hover:text-white
                      "
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  </div>

                  {/* ORGANIZATION */}
                  <MedicalInput
                    type="text"
                    label="Organization (optional)"
                    placeholder="Hospital or Clinic"
                    value={formData.organization}
                    onChange={(e) =>
                      updateField(
                        "organization",
                        e.target.value,
                      )
                    }
                    error={errors.organization}
                    success={
                      successFields.organization &&
                      !errors.organization
                    }
                    className="text-sm py-2 dark:text-white dark:bg-gray-900 dark:border-gray-700 dark:placeholder-gray-400"
                    onBlur={() => handleBlur("organization")}
                  />
                </div>
              </div>

              <div />

              <div className="px-4 pb-4 pt-2">
                {adminExists && formData.role === "admin" && (
                  <div
                    className="
                      mb-2 bg-red-50 dark:bg-red-900/40 
                      border border-red-200 dark:border-red-700 
                      rounded-md p-2 text-xs text-red-800 dark:text-red-200
                    "
                  >
                    ⚠️ Admin already exists. Choose another
                    role.
                  </div>
                )}

                <div className="flex flex-col sm:flex-row items-center gap-3">
                  <div className="flex-1 text-xs text-gray-600 dark:text-gray-300">
                    Already have an account?{" "}
                    <button
                      onClick={onNavigateToLogin}
                      className="text-[#1976D2] underline dark:text-blue-400"
                    >
                      Sign in
                    </button>
                  </div>

                  <div className="w-full sm:w-auto">
                    <MedicalButton
                      type="button"
                      variant="primary"
                      onClick={handleSubmit}
                      className="w-full py-2 text-sm"
                      loading={loading}
                    >
                      Create Account
                    </MedicalButton>
                  </div>
                </div>
              </div>
            </form>
          </div>
        </div>

        <p className="text-center text-gray-700 dark:text-gray-400 text-xs mt-3">
          © 2025 CardioDetect AI. All rights reserved.
        </p>
      </div>
    </div>
  );
}