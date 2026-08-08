import React from "react";
import { CheckCircle, Clock, Home } from "lucide-react";
import { MedicalButton } from "../../components/ui/medical-button";

interface UploadSuccessProps {
  onNavigateToDashboard: () => void;
}

export function UploadSuccess({ onNavigateToDashboard }: UploadSuccessProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
      <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 max-w-lg w-full">
        <div className="w-20 h-20 bg-green-50 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle className="w-10 h-10 text-[var(--success-color)]" />
        </div>
        
        <h2 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-[var(--primary-color)] to-[var(--success-color)] mb-4">
          ECG Uploaded Successfully
        </h2>
        
        <div className="flex items-start justify-center gap-3 p-4 bg-yellow-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl mb-8">
          <Clock className="w-6 h-6 text-yellow-600 dark:text-yellow-400 flex-shrink-0" />
          <p className="text-yellow-800 dark:text-yellow-400 text-left font-medium">
            Waiting for secure AI analysis and clinical doctor review. You will be able to see the status from your dashboard.
          </p>
        </div>

        <MedicalButton variant="primary" onClick={onNavigateToDashboard} className="w-full">
          <Home className="w-5 h-5 mr-2" />
          Return to Dashboard
        </MedicalButton>
      </div>
    </div>
  );
}
