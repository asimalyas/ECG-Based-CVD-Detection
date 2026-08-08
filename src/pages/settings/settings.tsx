import React, { useState, useEffect } from "react";

import { useToast } from "../../components/ui/medical-toast";
import { motion } from "framer-motion";
import {
  User,
  Phone,
  Building2,
  Mail,
  Shield,
  Save,
  RotateCcw,
  CheckCircle2
} from "lucide-react";
import { userApi, authApi } from "../../lib/api";

interface SettingsPageProps {
  currentUser?: {
    id: string;
    email: string;
    name: string;
    role: string;
    phone?: string;
    organization?: string;
  };
  onUpdateUser?: (userData: any) => void;
}

export function SettingsPage({
  currentUser,
  onUpdateUser,
}: SettingsPageProps) {
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    organization: "",
    email: "",
  });

  const [loading, setLoading] = useState(false);
  const [fetchingData, setFetchingData] = useState(true);
  const { showToast } = useToast();
  const [initialData, setInitialData] = useState(formData);
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const fetchUserData = async () => {
      try {
        const response = await authApi.getCurrentUser();
        if (!mounted) return;

        const next = {
          name: response?.user?.name || currentUser?.name || "",
          phone: response?.user?.phone || currentUser?.phone || "",
          organization:
            response?.user?.organization || currentUser?.organization || "",
          email: response?.user?.email || currentUser?.email || "",
        };

        setFormData(next);
        setInitialData(next);
      } catch (error) {
        console.error("Error fetching user data:", error);

        if (currentUser && mounted) {
          const next = {
            name: currentUser.name || "",
            phone: currentUser.phone || "",
            organization: currentUser.organization || "",
            email: currentUser.email || "",
          };
          setFormData(next);
          setInitialData(next);
        }
      } finally {
        if (mounted) setFetchingData(false);
      }
    };

    fetchUserData();
    return () => {
      mounted = false;
    };
  }, [currentUser]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      showToast("error", "Please enter your full name.");
      return;
    }

    setLoading(true);

    try {
      const response = await userApi.updateProfile({
        name: formData.name.trim(),
        phone: formData.phone.trim(),
        organization: formData.organization.trim(),
      });

      showToast("success", "Profile updated successfully!");

      if (onUpdateUser && response?.user) {
        onUpdateUser(response.user);
      }

      setInitialData({ ...formData });
      setLastSavedAt(new Date().toISOString());
    } catch (error: any) {
      console.error("Error updating profile:", error);
      showToast(
        "error",
        error?.message || "Failed to update profile.",
      );
    } finally {
      setLoading(false);
    }
  };

  const updateField = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleReset = () => {
    setFormData(initialData);
    showToast("info", "Changes reverted.");
  };

  if (fetchingData) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-8" role="status">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border dark:border-gray-700 p-6 flex flex-col gap-4 animate-pulse">
          <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/4 mb-4"></div>
          <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded w-full"></div>
          <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded w-full"></div>
          <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
        </div>
      </div>
    );
  }

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { duration: 0.5, staggerChildren: 0.1 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, x: -10 },
    visible: { opacity: 1, x: 0 }
  };

  // Safe checks for rendering icons
  const renderInitials = formData.name ? formData.name.substring(0, 2).toUpperCase() : "U";
  const inputClassName =
    "w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/70 text-gray-900 dark:text-white dark:placeholder-gray-400 focus:ring-2 focus:border-transparent outline-none transition-all disabled:opacity-50 disabled:cursor-not-allowed";

  return (
    <motion.div 
      className="max-w-5xl mx-auto px-4 py-8 md:py-12"
      initial="hidden"
      animate="visible"
      variants={containerVariants}
    >
      <motion.div variants={itemVariants} className="mb-8">
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-gray-900 dark:text-white">Profile Settings</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-2 text-lg">
          Manage your personal information, security, and preferences.
        </p>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content Form */}
        <motion.div variants={itemVariants} className="lg:col-span-2 space-y-8">
          
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden transition-colors duration-300">
            {/* Header Area */}
            <div className="p-6 md:p-8 border-b border-gray-100 dark:border-gray-700 flex flex-col md:flex-row items-start md:items-center gap-6">
              <div className="h-20 w-20 md:h-24 md:w-24 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-white text-2xl md:text-3xl font-bold shadow-lg flex-shrink-0 ring-4 ring-white dark:ring-gray-800">
                {renderInitials}
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{formData.name || 'Your Profile'}</h2>
                <p className="text-gray-500 dark:text-gray-400 flex items-center gap-2 mt-1">
                  <Mail className="w-4 h-4" /> {formData.email}
                </p>
              </div>
            </div>

            {/* Form Area */}
            <div className="p-6 md:p-8">
              <form onSubmit={handleSubmit} className="space-y-6">
                
                <div className="space-y-6">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2 mb-4 border-b border-gray-100 dark:border-gray-700 pb-2">
                    <User className="w-5 h-5 text-blue-500" /> Personal Information
                  </h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="col-span-1 md:col-span-2">
                       <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Full Name</label>
                       <input 
                         type="text" 
                         value={formData.name}
                         onChange={(e) => updateField("name", e.target.value)}
                         className={inputClassName}
                         placeholder="John Doe"
                         required
                       />
                    </div>
                  </div>
                </div>

                <div className="space-y-6 pt-4">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2 mb-4 border-b border-gray-100 dark:border-gray-700 pb-2">
                    <Building2 className="w-5 h-5 text-indigo-600 dark:text-indigo-400" /> Professional Details
                  </h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                       <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 flex items-center gap-2"><Phone className="w-3.5 h-3.5"/> Phone Number</label>
                       <input 
                         type="tel" 
                         value={formData.phone}
                         onChange={(e) => updateField("phone", e.target.value)}
                         className={inputClassName}
                         placeholder="+1 (555) 000-0000"
                       />
                    </div>
                    <div>
                       <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 flex items-center gap-2"><Building2 className="w-3.5 h-3.5"/> Organization</label>
                       <input 
                         type="text" 
                         value={formData.organization}
                         onChange={(e) => updateField("organization", e.target.value)}
                         className={inputClassName}
                         placeholder="Hospital / Clinic Name"
                       />
                    </div>
                  </div>
                </div>

                <div className="pt-8 border-t border-gray-100 dark:border-gray-700 flex flex-col sm:flex-row items-center gap-4">
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition-all shadow-md shadow-blue-500/20 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? (
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <Save className="w-5 h-5" />
                    )}
                    Save Changes
                  </button>

                  <button
                    type="button"
                    onClick={handleReset}
                    disabled={loading}
                    className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-gray-700 rounded-xl font-medium transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <RotateCcw className="w-4 h-4" />
                    Discard
                  </button>

                  <div className="sm:ml-auto w-full sm:w-auto text-center sm:text-right mt-2 sm:mt-0 text-sm text-gray-500 dark:text-gray-400">
                    {lastSavedAt ? (
                      <span className="flex items-center justify-center sm:justify-end gap-1 text-green-600 dark:text-green-400">
                        <CheckCircle2 className="w-4 h-4" /> Saved at {new Date(lastSavedAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                      </span>
                    ) : (
                      <span className="opacity-70">Unsaved changes will be lost</span>
                    )}
                  </div>
                </div>
              </form>
            </div>
          </div>
        </motion.div>

        {/* Sidebar Info */}
        <motion.div variants={itemVariants} className="space-y-6">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 transition-colors duration-300">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
              <Shield className="w-5 h-5 text-green-600 dark:text-green-400" /> Account Status
            </h3>
            
            <div className="space-y-5">
              <div className="bg-gray-50 dark:bg-gray-900/70 p-4 rounded-xl border border-gray-100 dark:border-gray-700">
                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">
                  Assigned Role
                </p>
                <p className="capitalize font-bold text-gray-900 dark:text-white text-lg">
                  {currentUser?.role || "Patient"}
                </p>
              </div>

              <div className="bg-gray-50 dark:bg-gray-900/70 p-4 rounded-xl border border-gray-100 dark:border-gray-700">
                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
                  System Status
                </p>
                <div className="flex items-center gap-2">
                  <span className="relative flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-500 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                  </span>
                  <span className="text-green-600 dark:text-green-400 font-medium">
                    Active & Approved
                  </span>
                </div>
              </div>
            </div>
            
            <div className="mt-6 pt-6 border-t border-gray-100 dark:border-gray-700">
              <p className="text-xs text-center text-gray-400 dark:text-gray-500">
                Need help? Contact system administrator for role changes or account issues.
              </p>
            </div>
          </div>
        </motion.div>
        
      </div>
    </motion.div>
  );
}
