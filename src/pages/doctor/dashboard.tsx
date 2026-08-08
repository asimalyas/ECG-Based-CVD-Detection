import React, { useState, useEffect } from "react";
import { MedicalButton } from "../../components/ui/medical-button";
import { useToast } from "../../components/ui/medical-toast";
import {
  FileText,
  CheckCircle,
  Clock,
  TrendingUp,
  Eye,
  AlertCircle,
  Heart,
  Activity,
  Users,
  Calendar,
  ChevronRight,
  Stethoscope,
} from "lucide-react";
import { motion } from "motion/react";
import { ecgApi, statsApi } from "../../lib/api";

interface DoctorDashboardProps {
  onNavigateToReport: (reportId: string) => void;
  onDiagnose: (reportId: string) => void;
}

export function DoctorDashboard({
  onNavigateToReport,
  onDiagnose,
}: DoctorDashboardProps) {
  const [stats, setStats] = useState({
    totalEcgs: 0,
    pendingReviews: 0,
    reviewedEcgs: 0,
    abnormalCases: 0,
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

  const totalEcgs = stats.totalEcgs || 0;
  const pendingReviews = stats.pendingReviews || 0;
  const reviewedEcgs = stats.reviewedEcgs || 0;
  const abnormalCases = stats.abnormalCases || 0;

  const pendingRecords = ecgRecords.filter(
    (r) => r.status === "pending",
  );
  const recentRecords = ecgRecords.slice(0, 5);

  const AnimatedMetric = ({
    label,
    value,
    icon: Icon,
    gradient,
    delay = 0,
  }: {
    label: string;
    value: number;
    icon: any;
    gradient: string;
    delay?: number;
  }) => (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5, delay }}
      className="group relative overflow-hidden rounded-2xl p-6 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:shadow-xl transition-all"
    >
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
            {label}
          </p>
          <motion.h3
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: delay + 0.2 }}
            className="text-4xl font-bold text-gray-900 dark:text-white"
          >
            {value}
          </motion.h3>
        </div>
        <div
          className={`w-16 h-16 rounded-2xl flex items-center justify-center ${gradient} transition-transform group-hover:scale-110 group-hover:rotate-6`}
        >
          <Icon className="w-8 h-8 text-white" />
        </div>
      </div>
      <div
        className={`absolute bottom-0 left-0 right-0 h-1 ${gradient}`}
      />
    </motion.div>
  );

  const ECGRecordCard = ({
    record,
    index,
  }: {
    record: any;
    index: number;
  }) => {
    const isPending = record.status === "pending";
    const isAbnormal = record.prediction === "abnormal";

    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: index * 0.05 }}
        onClick={() => onNavigateToReport(record.id)}
        className="group relative flex items-center gap-4 p-4 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600 hover:shadow-lg transition-all cursor-pointer"
      >
        <div
          className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${
            isPending
              ? "bg-orange-100 dark:bg-orange-900/30"
              : isAbnormal
                ? "bg-red-100 dark:bg-red-900/30"
                : "bg-green-100 dark:bg-green-900/30"
          }`}
        >
          {isPending ? (
            <Clock className="w-6 h-6 text-orange-600 dark:text-orange-400" />
          ) : isAbnormal ? (
            <AlertCircle className="w-6 h-6 text-red-600 dark:text-red-400" />
          ) : (
            <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400" />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <p className="font-semibold text-gray-900 dark:text-white">
              {record.patient_name || "Unknown Patient"}
            </p>
            {isPending && (
              <span className="px-2 py-0.5 bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 text-xs font-medium rounded-full">
                Needs Review
              </span>
            )}
          </div>
          <div className="flex items-center gap-3 text-sm text-gray-500 dark:text-gray-400">
            <span className="flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" />
              {new Date(record.created_at).toLocaleDateString()}
            </span>
            {record.prediction && (
              <span className="flex items-center gap-1">
                <Heart className="w-3.5 h-3.5" />
                {record.prediction}{" "}
                {record.confidence && `(${record.confidence}%)`}
              </span>
            )}
          </div>
        </div>

        {isPending ? (
          <MedicalButton
             variant="primary"
             className="px-4 py-1 text-sm h-8 shrink-0 relative z-10"
             onClick={(e) => {
               e.stopPropagation();
               onDiagnose(record.id);
             }}
          >
             Diagnose
          </MedicalButton>
        ) : (
          <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 group-hover:translate-x-1 transition-all" />
        )}
      </motion.div>
    );
  };

  const ProgressRing = ({
    percentage,
    label,
    color,
    delay = 0,
  }: {
    percentage: number;
    label: string;
    color: string;
    delay?: number;
  }) => {
    const radius = 70;
    const circumference = 2 * Math.PI * radius;
    const offset =
      circumference - (percentage / 100) * circumference;

    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6, delay }}
        className="flex flex-col items-center"
      >
        <div className="relative w-44 h-44">
          <svg className="transform -rotate-90 w-44 h-44">
            <circle
              cx="88"
              cy="88"
              r={radius}
              stroke="currentColor"
              strokeWidth="12"
              fill="none"
              className="text-gray-200 dark:text-gray-700"
            />
            <motion.circle
              cx="88"
              cy="88"
              r={radius}
              stroke={color}
              strokeWidth="12"
              fill="none"
              strokeDasharray={circumference}
              initial={{ strokeDashoffset: circumference }}
              animate={{ strokeDashoffset: offset }}
              transition={{
                duration: 1.5,
                delay: delay + 0.3,
                ease: "easeOut",
              }}
              strokeLinecap="round"
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center flex-col">
            <motion.span
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, delay: delay + 0.5 }}
              className="text-4xl font-bold text-gray-900 dark:text-white"
            >
              {percentage.toFixed(0)}%
            </motion.span>
          </div>
        </div>
        <p className="mt-4 text-sm font-medium text-gray-600 dark:text-gray-400">
          {label}
        </p>
      </motion.div>
    );
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-64" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="h-32 bg-gray-200 dark:bg-gray-700 rounded-2xl"
            />
          ))}
        </div>
      </div>
    );
  }

  const reviewProgress =
    totalEcgs > 0 ? (reviewedEcgs / totalEcgs) * 100 : 0;
  const abnormalRate =
    totalEcgs > 0 ? (abnormalCases / totalEcgs) * 100 : 0;

  return (
    <div className="space-y-8 pb-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="flex items-center gap-3"
      >
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
          <Stethoscope className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-gray-900 dark:text-white">
            Doctor Dashboard
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            ECG Review & Patient Care
          </p>
        </div>
      </motion.div>

      {/* Animated Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <AnimatedMetric
          label="Pending Reviews"
          value={pendingReviews}
          icon={Clock}
          gradient="bg-gradient-to-br from-orange-500 to-orange-600"
          delay={0}
        />
        <AnimatedMetric
          label="Reviewed ECGs"
          value={reviewedEcgs}
          icon={CheckCircle}
          gradient="bg-gradient-to-br from-green-500 to-green-600"
          delay={0.1}
        />
        <AnimatedMetric
          label="Total Cases"
          value={totalEcgs}
          icon={FileText}
          gradient="bg-gradient-to-br from-blue-500 to-blue-600"
          delay={0.2}
        />
        <AnimatedMetric
          label="Abnormal Cases"
          value={abnormalCases}
          icon={AlertCircle}
          gradient="bg-gradient-to-br from-red-500 to-red-600"
          delay={0.3}
        />
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Pending Reviews - Takes 2 columns */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm"
        >
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-gray-900 dark:text-white">
                Pending ECG Reviews
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                {pendingRecords.length} ECG
                {pendingRecords.length !== 1 ? "s" : ""}{" "}
                awaiting your review
              </p>
            </div>
            {pendingRecords.length > 0 && (
              <div className="px-4 py-2 bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 rounded-full font-medium">
                {pendingRecords.length} Pending
              </div>
            )}
          </div>

          <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
            {recentRecords.length > 0 ? (
              recentRecords.map((record, index) => (
                <ECGRecordCard
                  key={record.id}
                  record={record}
                  index={index}
                />
              ))
            ) : (
              <div className="text-center py-16">
                <Activity className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                <p className="text-gray-500 dark:text-gray-400 font-medium">
                  No ECG records found
                </p>
                <p className="text-sm text-gray-400 dark:text-gray-500 mt-2">
                  ECG records assigned to you will appear here
                </p>
              </div>
            )}
          </div>
        </motion.div>

        {/* Analytics & Stats */}
        <div className="space-y-6">
          {/* Progress Rings */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.5 }}
            className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm"
          >
            <h3 className="text-gray-900 dark:text-white mb-6">
              Review Progress
            </h3>
            <div className="flex flex-col items-center space-y-6">
              <ProgressRing
                percentage={reviewProgress}
                label="Completion Rate"
                color="#388E3C"
                delay={0.6}
              />
            </div>
          </motion.div>

          {/* Abnormal Rate */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.6 }}
            className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm"
          >
            <h3 className="text-gray-900 dark:text-white mb-6">
              Abnormal Detection
            </h3>
            <div className="flex flex-col items-center">
              <ProgressRing
                percentage={abnormalRate}
                label="Abnormality Rate"
                color="#D32F2F"
                delay={0.7}
              />
            </div>
          </motion.div>

          {/* Quick Stats */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.7 }}
            className="bg-gradient-to-br from-blue-500 to-blue-600 dark:from-blue-600 dark:to-blue-700 rounded-2xl p-6 shadow-lg text-white"
          >
            <h3 className="mb-4 flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Today's Summary
            </h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-white/20 backdrop-blur-sm rounded-lg">
                <span className="text-sm">Cases Reviewed</span>
                <span className="text-lg font-bold">
                  {reviewedEcgs}
                </span>
              </div>
              <div className="flex items-center justify-between p-3 bg-white/20 backdrop-blur-sm rounded-lg">
                <span className="text-sm">Pending</span>
                <span className="text-lg font-bold">
                  {pendingReviews}
                </span>
              </div>
              <div className="flex items-center justify-between p-3 bg-white/20 backdrop-blur-sm rounded-lg">
                <span className="text-sm">Abnormal Found</span>
                <span className="text-lg font-bold">
                  {abnormalCases}
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