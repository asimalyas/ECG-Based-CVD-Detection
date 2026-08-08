import React, { useState } from "react";
import { MedicalInput } from "../../components/ui/medical-input";
import { MedicalButton } from "../../components/ui/medical-button";
import { useToast } from "../../components/ui/medical-toast";
import { Activity, ArrowLeft, Mail } from "lucide-react";

interface ForgotPasswordPageProps {
  onNavigateToLogin: () => void;
}

export function ForgotPasswordPage({
  onNavigateToLogin,
}: ForgotPasswordPageProps) {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const { showToast } = useToast();

  const validate = () => {
    if (!email) {
      setError("Email is required");
      return false;
    }
    if (!/\S+@\S+\.\S+/.test(email)) {
      setError("Please enter a valid email");
      return false;
    }
    setError("");
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) {
      return;
    }

    setLoading(true);

    setTimeout(() => {
      setLoading(false);
      setEmailSent(true);
      showToast(
        "success",
        "If this email is registered, a password reset link has been sent.",
      );
    }, 1500);
  };

  if (emailSent) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[var(--primary-color)] to-[var(--primary-dark)] flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-2xl shadow-2xl p-8">
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-[var(--success-color)] rounded-full mb-4">
                <Mail className="w-8 h-8 text-white" />
              </div>
              <h1 className="text-[var(--text-color)] mb-2">
                Check Your Email
              </h1>
              <p className="text-[var(--text-secondary)]">
                If an account exists for{" "}
                <strong>{email}</strong>, you will receive a
                password reset link shortly.
              </p>
            </div>

            <div className="space-y-4">
              <div className="p-4 bg-[var(--bg-light)] rounded-lg">
                <p className="text-sm text-[var(--text-secondary)]">
                  <strong>Didn't receive the email?</strong>
                  <br />
                  Check your spam folder or wait a few minutes
                  before requesting another reset link.
                </p>
              </div>

              <MedicalButton
                variant="primary"
                className="w-full"
                onClick={onNavigateToLogin}
              >
                Return to Login
              </MedicalButton>
            </div>
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
              Forgot Password?
            </h1>
            <p className="text-[var(--text-secondary)]">
              Enter your email address and we'll send you a link
              to reset your password.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <MedicalInput
              type="email"
              label="Email Address"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setError("");
              }}
              error={error}
              required
            />

            <MedicalButton
              type="submit"
              variant="primary"
              className="w-full"
              loading={loading}
            >
              Send Reset Link
            </MedicalButton>

            <button
              type="button"
              onClick={onNavigateToLogin}
              className="w-full flex items-center justify-center gap-2 text-[var(--primary-color)] hover:underline"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Login
            </button>
          </form>
        </div>

        <p className="text-center text-white text-sm mt-6">
          © 2025 CardioDetect AI. All rights reserved.
        </p>
      </div>
    </div>
  );
}