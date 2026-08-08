import React, { useState, useEffect } from "react";
import { MedicalButton } from "../../components/ui/medical-button";
import { useToast } from "../../components/ui/medical-toast";
import {
  Upload,
  FileCheck,
  Clock,
  CheckCircle,
  Activity,
  TrendingUp,
  User,
  Stethoscope,
  Calendar,
  ChevronRight,
  BarChart3,
  Zap,
} from "lucide-react";
import { motion } from "motion/react";
import { ecgApi, statsApi } from "../../lib/api";

interface TechnicianDashboardProps {
  onNavigateToUpload: () => void;
  onNavigateToAnalysis: (id: string) => void;
}

export function TechnicianDashboard({
  onNavigateToUpload,
  onNavigateToAnalysis,
}: TechnicianDashboardProps) {
  const [stats, setStats] = useState({
    totalUploads: 0,
  });
  const [ecgRecords, setEcgRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { showToast } = useToast();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [statsResponse, recordsResponse] =
        await Promise.all([
          statsApi.getStats(),
          ecgApi.getRecords(),
        ]);

      setStats(statsResponse.stats);
      setEcgRecords(recordsResponse.records || []);
    } catch (error: any) {
      console.error("Error fetching dashboard data:", error);
      showToast("error", "Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  };

  const totalUploads = stats.totalUploads || 0;
  const pendingRecords = ecgRecords.filter(
    (r) => r.status === "pending",
  );
  const reviewedRecords = ecgRecords.filter(
    (r) => r.status === "reviewed",
  );
  const recentRecords = ecgRecords.slice(0, 8);

  const DataStrip = ({
    icon: Icon,
    label,
    value,
    color,
    delay = 0,
  }: {
    icon: any;
    label: string;
    value: number | string;
    color: string;
    delay?: number;
  }) => (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.5, delay }}
      whileHover={{ x: 4 }}
      className="group flex items-center gap-4 p-5 rounded-2xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 transition-all hover:shadow-lg cursor-pointer"
    >
      <div
        className="w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0 transition-transform group-hover:scale-110"
        style={{ backgroundColor: `${color}20` }}
      >
        <Icon className="w-7 h-7" style={{ color }} />
      </div>
      <div className="flex-1">
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">
          {label}
        </p>
        <p className="text-3xl font-bold text-gray-900 dark:text-white">
          {value}
        </p>
      </div>
      <ChevronRight className="w-5 h-5 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
    </motion.div>
  );

  const UploadCard = ({
    record,
    index,
  }: {
    record: any;
    index: number;
  }) => {
    const isPending = record.status === "pending";
    const isReviewed = record.status === "reviewed";

    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: index * 0.03 }}
        className="group relative flex items-center gap-4 p-4 rounded-xl bg-gray-50 dark:bg-gray-900/50 hover:bg-white dark:hover:bg-gray-800 border border-transparent hover:border-gray-300 dark:hover:border-gray-600 transition-all"
      >
        <div
          className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
            isPending
              ? "bg-orange-100 dark:bg-orange-900/30"
              : "bg-green-100 dark:bg-green-900/30"
          }`}
        >
          {isPending ? (
            <Clock className="w-5 h-5 text-orange-600 dark:text-orange-400" />
          ) : (
            <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <User className="w-3.5 h-3.5 text-gray-400" />
            <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
              {record.patient_name || "Unknown Patient"}
            </p>
          </div>
          <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
            <span className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              {new Date(record.created_at).toLocaleDateString()}
            </span>
            {record.assigned_doctor_name && (
              <span className="flex items-center gap-1">
                <Stethoscope className="w-3 h-3" />
                {record.assigned_doctor_name}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isPending && (
            <span className="px-2 py-1 bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 text-xs font-medium rounded-md">
              Pending
            </span>
          )}
          {isReviewed && (
            <span className="px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs font-medium rounded-md">
              Reviewed
            </span>
          )}
        </div>
      </motion.div>
    );
  };

  const ProgressBar = ({
    label,
    value,
    max,
    color,
    delay = 0,
  }: {
    label: string;
    value: number;
    max: number;
    color: string;
    delay?: number;
  }) => {
    const percentage = max > 0 ? (value / max) * 100 : 0;

    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay }}
        className="space-y-2"
      >
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600 dark:text-gray-400">
            {label}
          </span>
          <span className="font-semibold text-gray-900 dark:text-white">
            {value} / {max}
          </span>
        </div>
        <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${percentage}%` }}
            transition={{
              duration: 1,
              delay: delay + 0.2,
              ease: "easeOut",
            }}
            className="h-full rounded-full"
            style={{ backgroundColor: color }}
          />
        </div>
      </motion.div>
    );
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-64" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-32 bg-gray-200 dark:bg-gray-700 rounded-2xl"
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="flex items-center justify-between"
      >
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-teal-500 to-teal-600 flex items-center justify-center">
            <Upload className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-gray-900 dark:text-white">
              Technician Dashboard
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              ECG Upload & Workflow Management
            </p>
          </div>
        </div>
        <MedicalButton
          variant="primary"
          onClick={onNavigateToUpload}
          className="flex items-center gap-2"
        >
          <Upload className="w-4 h-4" />
          Upload ECG
        </MedicalButton>
      </motion.div>

      {/* Data Strips */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <DataStrip
          icon={Upload}
          label="Total Uploads"
          value={totalUploads}
          color="#1976D2"
          delay={0}
        />
        <DataStrip
          icon={Clock}
          label="Pending Reviews"
          value={pendingRecords.length}
          color="#F57C00"
          delay={0.1}
        />
        <DataStrip
          icon={CheckCircle}
          label="Completed"
          value={reviewedRecords.length}
          color="#388E3C"
          delay={0.2}
        />
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Uploads */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm"
        >
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-gray-900 dark:text-white">
                Recent Uploads
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Track status of your uploaded ECG records
              </p>
            </div>
            {pendingRecords.length > 0 && (
              <div className="px-4 py-2 bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 rounded-full text-sm font-medium">
                {pendingRecords.length} Pending
              </div>
            )}
          </div>

          <div className="space-y-2 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
            {recentRecords.length > 0 ? (
              recentRecords.map((record, index) => (
                <UploadCard
                  key={record.id}
                  record={record}
                  index={index}
                />
              ))
            ) : (
              <div className="text-center py-16">
                <Upload className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                <p className="text-gray-500 dark:text-gray-400 font-medium">
                  No uploads yet
                </p>
                <p className="text-sm text-gray-400 dark:text-gray-500 mt-2 mb-4">
                  Start by uploading your first ECG record
                </p>
                <MedicalButton
                  variant="primary"
                  onClick={onNavigateToUpload}
                >
                  Upload ECG
                </MedicalButton>
              </div>
            )}
          </div>
        </motion.div>

        {/* Analytics & Quick Actions */}
        <div className="space-y-6">
          {/* Progress Overview */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm"
          >
            <h3 className="text-gray-900 dark:text-white mb-6 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-teal-500" />
              Workflow Progress
            </h3>
            <div className="space-y-5">
              <ProgressBar
                label="Reviewed"
                value={reviewedRecords.length}
                max={totalUploads}
                color="#388E3C"
                delay={0.5}
              />
              <ProgressBar
                label="Pending"
                value={pendingRecords.length}
                max={totalUploads}
                color="#F57C00"
                delay={0.6}
              />
              <ProgressBar
                label="Total Processed"
                value={totalUploads}
                max={totalUploads}
                color="#1976D2"
                delay={0.7}
              />
            </div>
          </motion.div>

          {/* Quick Actions */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.5 }}
            className="bg-gradient-to-br from-teal-500 to-teal-600 dark:from-teal-600 dark:to-teal-700 rounded-2xl p-6 shadow-lg text-white"
          >
            <h3 className="mb-4 flex items-center gap-2">
              <Zap className="w-5 h-5" />
              Quick Actions
            </h3>
            <div className="space-y-3">
              <button
                onClick={onNavigateToUpload}
                className="w-full bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-xl p-4 flex items-center gap-3 transition-all hover:translate-x-1"
              >
                <Upload className="w-5 h-5" />
                <span className="font-medium">
                  Upload New ECG
                </span>
              </button>
              <button className="w-full bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-xl p-4 flex items-center gap-3 transition-all hover:translate-x-1">
                <Activity className="w-5 h-5" />
                <span className="font-medium">
                  View All Records
                </span>
              </button>
              <button className="w-full bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-xl p-4 flex items-center gap-3 transition-all hover:translate-x-1">
                <FileCheck className="w-5 h-5" />
                <span className="font-medium">
                  Pending Reviews
                </span>
              </button>
            </div>
          </motion.div>

          {/* Today's Summary */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.6 }}
            className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm"
          >
            <h3 className="text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-blue-500" />
              Today's Activity
            </h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  Uploads
                </span>
                <span className="text-lg font-bold text-gray-900 dark:text-white">
                  {totalUploads}
                </span>
              </div>
              <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  Pending
                </span>
                <span className="text-lg font-bold text-orange-600 dark:text-orange-400">
                  {pendingRecords.length}
                </span>
              </div>
              <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  Completed
                </span>
                <span className="text-lg font-bold text-green-600 dark:text-green-400">
                  {reviewedRecords.length}
                </span>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Custom Scrollbar */}
      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #cbd5e0;
          border-radius: 3px;
        }
        .dark .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #4a5568;
        }
      `}</style>
    </div>
  );
}