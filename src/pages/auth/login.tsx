import React, { useState } from "react";
import { MedicalInput } from "../../components/ui/medical-input";
import { MedicalButton } from "../../components/ui/medical-button";
import { useToast } from "../../components/ui/medical-toast";
import { Activity, ArrowLeft } from "lucide-react";
import { authApi } from "../../lib/api";

interface LoginPageProps {
  onLogin: (email: string, password: string) => void;
  onNavigateToSignup: () => void;
  onNavigateToForgotPassword: () => void;
  onNavigateToLanding?: () => void;
}

export function LoginPage({
  onLogin,
  onNavigateToSignup,
  onNavigateToForgotPassword,
  onNavigateToLanding,
}: LoginPageProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<{
    email?: string;
    password?: string;
  }>({});
  const [loading, setLoading] = useState(false);
  const { showToast } = useToast();

  const validate = () => {
    const newErrors: { email?: string; password?: string } = {};

    if (!email) {
      newErrors.email = "Email is required";
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = "Please enter a valid email";
    }

    if (!password) {
      newErrors.password = "Password is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) return;

    setLoading(true);
    try {
      const response = await authApi.login(email, password);

      if (response.user) {
        showToast(
          "success",
          `Welcome back, ${response.user.name}!`,
        );
        onLogin(email, password);
      }
    } catch (error: any) {
      console.error("Login error:", error);
      const errorMessage =
        error.message || "Invalid email or password";

      if (errorMessage.includes("awaiting admin approval")) {
        showToast(
          "warning",
          "Your account is awaiting admin approval. Please contact an administrator.",
        );
      } else if (errorMessage.includes("rejected")) {
        showToast(
          "error",
          "Your account has been rejected. Please contact an administrator.",
        );
      } else {
        showToast("error", errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="
        min-h-screen flex items-center justify-center p-6 relative overflow-hidden
        bg-gradient-to-br from-[#E3F2FD] via-[#BBDEFB] to-[#90CAF9]
        dark:from-[#071029] dark:via-[#071829] dark:to-[#041021]
      "
    >
      {/* Back to Landing Button */}
      {onNavigateToLanding && (
        <button
          onClick={onNavigateToLanding}
          className="
            absolute top-6 left-6 z-10 flex items-center gap-2
            text-gray-700 hover:text-gray-900 dark:text-gray-200 dark:hover:text-white
            transition-colors
          "
        >
          <ArrowLeft className="w-5 h-5" />
          <span className="hidden sm:inline">Back to Home</span>
        </button>
      )}

      <div className="w-full max-w-md relative z-20">
        <div
          className="
            rounded-3xl shadow-2xl p-8 backdrop-blur-sm border
            bg-white/95 border-gray-200
            dark:bg-gray-900/80 dark:border-gray-800
            transition-colors
          "
        >
          <div className="text-center mb-6">
            <div
              className="
                inline-flex items-center justify-center w-16 h-16
                rounded-2xl mb-4 shadow
                bg-gradient-to-br from-[#1976D2] to-[#1565C0]
                dark:from-[#0ea5e9] dark:to-[#6366f1]
              "
            >
              <Activity className="w-8 h-8 text-white" />
            </div>

            <h1 className="text-gray-900 text-2xl font-semibold mb-1 dark:text-white">
              Welcome Back
            </h1>
            <p className="text-gray-600 text-sm dark:text-gray-300">
              Sign in to CardioDetect AI
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <MedicalInput
              type="email"
              label="Email Address"
              placeholder="doctor@cardiodetect.ai"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              error={errors.email}
              required
            />

            <MedicalInput
              type="password"
              label="Password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              error={errors.password}
              required
            />

            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer text-sm">
                <input
                  type="checkbox"
                  className="w-4 h-4 accent-[#1976D2] rounded
                    dark:accent-[#60a5fa]"
                />
                <span className="text-gray-700 dark:text-gray-200">
                  Remember me
                </span>
              </label>

              <button
                type="button"
                onClick={onNavigateToForgotPassword}
                className="text-sm text-[#1976D2] hover:underline dark:text-[#93c5fd]"
              >
                Forgot Password?
              </button>
            </div>

            <MedicalButton
              type="submit"
              variant="primary"
              className="w-full"
              loading={loading}
            >
              Sign In
            </MedicalButton>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600 dark:text-gray-300">
              New patient?{" "}
              <button
                onClick={onNavigateToSignup}
                className="text-[#1976D2] hover:underline dark:text-[#93c5fd]"
              >
                Create an account
              </button>
            </p>
          </div>

          <div className="mt-8 pt-6 border-t border-gray-100 dark:border-gray-800">
            <p className="text-xs text-center text-gray-500 dark:text-gray-400">
              For healthcare professionals: Contact your
              administrator for account access
            </p>
          </div>
        </div>

        <p className="text-center text-gray-700 text-sm mt-6 z-20 dark:text-gray-300">
          © 2025 CardioDetect AI. All rights reserved.
        </p>
      </div>
    </div>
  );
}

export default LoginPage;