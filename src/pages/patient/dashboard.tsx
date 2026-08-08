import React, { useState, useEffect } from "react";
import { useToast } from "../../components/ui/medical-toast";
import { ECGReportMenu } from "../../components/ecg-report-menu";
import {
  FileText,
  Heart,
  Calendar,
  AlertCircle,
  CheckCircle,
  Clock,
  Activity,
  Eye,
  Sparkles,
} from "lucide-react";
import { motion } from "motion/react";
import { ecgApi, statsApi } from "../../lib/api";

interface PatientDashboardProps {
  onViewReport: (reportId: string) => void;
}

export function PatientDashboard({
  onViewReport,
}: PatientDashboardProps) {
  const [stats, setStats] = useState({
    totalEcgs: 0,
    pendingReviews: 0,
    reviewedEcgs: 0,
    abnormalResults: 0,
  });
  const [ecgRecords, setEcgRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { showToast } = useToast();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async (showInitialLoading = true) => {
    if (showInitialLoading) setLoading(true);
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
      if (showInitialLoading) setLoading(false);
    }
  };

  const handleReportDeleted = async (recordId: string) => {
    setEcgRecords((prev) => prev.filter((record) => record.id !== recordId));
    await fetchData(false);
  };

  const totalEcgs = stats.totalEcgs || 0;
  const pendingReviews = stats.pendingReviews || 0;
  const reviewedEcgs = stats.reviewedEcgs || 0;
  const abnormalResults = stats.abnormalResults || 0;

  const pendingRecords = ecgRecords.filter(
    (r) => r.status === "pending",
  );
  const recentRecords = ecgRecords.slice(0, 6);

  const FloatingCard = ({
    icon: Icon,
    label,
    value,
    color,
    bgGradient,
    delay = 0,
  }: {
    icon: any;
    label: string;
    value: number;
    color: string;
    bgGradient: string;
    delay?: number;
  }) => (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.5, delay }}
      whileHover={{ y: -8, scale: 1.02 }}
      className={`relative overflow-hidden rounded-3xl p-6 ${bgGradient} text-white shadow-lg hover:shadow-2xl transition-all`}
    >
      <div className="relative z-10">
        <div className="flex items-center justify-between mb-4">
          <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
            <Icon className="w-7 h-7" />
          </div>
        </div>
        <p className="text-white/80 text-sm mb-1">{label}</p>
        <motion.h3
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: delay + 0.2 }}
          className="text-4xl font-bold"
        >
          {value}
        </motion.h3>
      </div>
      <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16" />
      <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full -ml-12 -mb-12" />
    </motion.div>
  );

  const ReportCard = ({
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
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4, delay: index * 0.05 }}
        onClick={() => onViewReport(record.id)}
        className="group relative overflow-hidden rounded-2xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600 p-5 cursor-pointer transition-all hover:shadow-xl"
        style={{ paddingRight: "4rem" }}
      >
        <div className="flex items-start gap-4">
          <div
            className={`w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0 transition-transform group-hover:scale-110 ${
              isPending
                ? "bg-gradient-to-br from-orange-400 to-orange-500"
                : isAbnormal
                  ? "bg-gradient-to-br from-red-400 to-red-500"
                  : "bg-gradient-to-br from-green-400 to-green-500"
            }`}
          >
            {isPending ? (
              <Clock className="w-7 h-7 text-white" />
            ) : isAbnormal ? (
              <AlertCircle className="w-7 h-7 text-white" />
            ) : (
              <CheckCircle className="w-7 h-7 text-white" />
            )}
          </div>

          <div className="flex-1 min-w-0 pr-2">
            <div className="flex items-center gap-2 mb-2">
              <h4 className="font-semibold text-gray-900 dark:text-white">
                ECG Report
              </h4>
              {isPending && (
                <span className="px-2.5 py-0.5 bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 text-xs font-medium rounded-full">
                  Under Review
                </span>
              )}
              {isAbnormal && !isPending && (
                <span className="px-2.5 py-0.5 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 text-xs font-medium rounded-full">
                  Requires Attention
                </span>
              )}
            </div>

            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                <Calendar className="w-4 h-4" />
                <span>
                  {new Date(
                    record.created_at,
                  ).toLocaleDateString()}
                </span>
              </div>

              {record.reviewed_by && (
                <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                  <CheckCircle className="w-4 h-4" />
                  <span>
                    Reviewed by Dr.{" "}
                    {record.reviewer_name || "Unknown"}
                  </span>
                </div>
              )}

              {record.prediction && (
                <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                  <Heart className="w-4 h-4" />
                  <span className="capitalize">
                    ML Prediction: {record.prediction}
                  </span>
                </div>
              )}
            </div>
          </div>

          <div className="absolute top-4 right-4 z-10 flex items-center gap-2">
            <Eye className="w-5 h-5 text-gray-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 opacity-0 group-hover:opacity-100 transition-all" />
            <ECGReportMenu
              record={record}
              onDeleted={handleReportDeleted}
            />
          </div>
        </div>
      </motion.div>
    );
  };

  const HealthTimeline = () => (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.5, delay: 0.5 }}
      className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm"
    >
      <h3 className="text-gray-900 dark:text-white mb-6 flex items-center gap-2">
        <Activity className="w-5 h-5 text-blue-500" />
        Health Timeline
      </h3>

      <div className="space-y-4">
        {recentRecords.slice(0, 4).map((record, index) => {
          const isPending = record.status === "pending";
          const isAbnormal = record.prediction === "abnormal";

          return (
            <motion.div
              key={record.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{
                duration: 0.3,
                delay: 0.6 + index * 0.05,
              }}
              className="flex items-start gap-3"
            >
              <div className="relative">
                <div
                  className={`w-3 h-3 rounded-full ${
                    isPending
                      ? "bg-orange-500"
                      : isAbnormal
                        ? "bg-red-500"
                        : "bg-green-500"
                  } ring-4 ring-white dark:ring-gray-800`}
                />
                {index <
                  recentRecords.slice(0, 4).length - 1 && (
                  <div className="absolute top-3 left-1.5 w-0.5 h-full bg-gray-200 dark:bg-gray-700" />
                )}
              </div>

              <div className="flex-1 pb-4">
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  ECG {isPending ? "Uploaded" : "Reviewed"}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {new Date(
                    record.created_at,
                  ).toLocaleDateString()}{" "}
                  at{" "}
                  {new Date(
                    record.created_at,
                  ).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
                {!isPending && record.prediction && (
                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                    Result:{" "}
                    <span className="capitalize font-medium">
                      {record.prediction}
                    </span>
                  </p>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-64" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-40 bg-gray-200 dark:bg-gray-700 rounded-3xl"
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
        className="flex items-center gap-3"
      >
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-pink-500 to-red-500 flex items-center justify-center">
          <Heart className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-gray-900 dark:text-white">
            My Health Dashboard
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Track your heart health journey
          </p>
        </div>
      </motion.div>

      {/* Floating Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <FloatingCard
          icon={FileText}
          label="Total Reports"
          value={totalEcgs}
          color="#1976D2"
          bgGradient="bg-gradient-to-br from-blue-500 to-blue-600"
          delay={0}
        />
        <FloatingCard
          icon={Clock}
          label="Under Review"
          value={pendingReviews}
          color="#F57C00"
          bgGradient="bg-gradient-to-br from-orange-500 to-orange-600"
          delay={0.1}
        />
        <FloatingCard
          icon={CheckCircle}
          label="Completed"
          value={reviewedEcgs}
          color="#388E3C"
          bgGradient="bg-gradient-to-br from-green-500 to-green-600"
          delay={0.2}
        />
      </div>

      {/* Alert Banner - Only if abnormal results exist */}
      {abnormalResults > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="bg-gradient-to-r from-red-50 to-orange-50 dark:from-red-900/20 dark:to-orange-900/20 border-l-4 border-red-500 rounded-xl p-5"
        >
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-lg bg-red-500 flex items-center justify-center flex-shrink-0">
              <AlertCircle className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1">
              <h4 className="font-semibold text-gray-900 dark:text-white mb-1">
                Attention Required
              </h4>
              <p className="text-sm text-gray-700 dark:text-gray-300">
                You have {abnormalResults} report
                {abnormalResults !== 1 ? "s" : ""} flagged as
                abnormal. Please consult with your healthcare
                provider for further evaluation.
              </p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Reports - Takes 2 columns */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm"
        >
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-gray-900 dark:text-white">
                My ECG Reports
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                View and track all your cardiac health reports
              </p>
            </div>
            {pendingRecords.length > 0 && (
              <div className="px-4 py-2 bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 rounded-full text-sm font-medium">
                {pendingRecords.length} Pending
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 gap-4 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
            {recentRecords.length > 0 ? (
              recentRecords.map((record, index) => (
                <ReportCard
                  key={record.id}
                  record={record}
                  index={index}
                />
              ))
            ) : (
              <div className="text-center py-16">
                <FileText className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                <p className="text-gray-500 dark:text-gray-400 font-medium">
                  No ECG reports yet
                </p>
                <p className="text-sm text-gray-400 dark:text-gray-500 mt-2">
                  Your uploaded ECG reports will appear here
                </p>
              </div>
            )}
          </div>
        </motion.div>

        {/* Sidebar - Timeline & Stats */}
        <div className="space-y-6">
          <HealthTimeline />

          {/* Health Summary */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.6 }}
            className="bg-gradient-to-br from-purple-500 to-purple-600 dark:from-purple-600 dark:to-purple-700 rounded-2xl p-6 shadow-lg text-white"
          >
            <h3 className="mb-4 flex items-center gap-2">
              <Sparkles className="w-5 h-5" />
              Health Insights
            </h3>
            <div className="space-y-3">
              <div className="p-3 bg-white/20 backdrop-blur-sm rounded-lg">
                <p className="text-sm text-white/80 mb-1">
                  Total Assessments
                </p>
                <p className="text-2xl font-bold">
                  {totalEcgs}
                </p>
              </div>
              <div className="p-3 bg-white/20 backdrop-blur-sm rounded-lg">
                <p className="text-sm text-white/80 mb-1">
                  Success Rate
                </p>
                <p className="text-2xl font-bold">
                  {totalEcgs > 0
                    ? Math.round(
                        ((totalEcgs - abnormalResults) /
                          totalEcgs) *
                          100,
                      )
                    : 0}
                  %
                </p>
              </div>
              <div className="p-3 bg-white/20 backdrop-blur-sm rounded-lg">
                <p className="text-sm text-white/80 mb-1">
                  Latest Check
                </p>
                <p className="text-sm font-medium">
                  {recentRecords.length > 0
                    ? new Date(
                        recentRecords[0].created_at,
                      ).toLocaleDateString()
                    : "No data"}
                </p>
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
