import React, { useState, useEffect } from "react";
import { MedicalButton } from "../../components/ui/medical-button";
import { useToast } from "../../components/ui/medical-toast";
import { ECGReportMenu } from "../../components/ecg-report-menu";
import { ecgApi } from "../../lib/api";
import {
  Search,
  Filter,
  Calendar,
  Heart,
  Clock,
  CheckCircle,
  AlertCircle,
  ChevronRight,
  FileText,
  User,
  Activity
} from "lucide-react";
import { motion } from "motion/react";

interface DoctorReportsProps {
  onNavigateToReport: (reportId: string) => void;
  onDiagnose: (reportId: string) => void;
}

export function DoctorReports({ onNavigateToReport, onDiagnose }: DoctorReportsProps) {
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "reviewed">("all");
  const { showToast } = useToast();

  useEffect(() => {
    fetchReports();
  }, []);

  const fetchReports = async (showInitialLoading = true) => {
    try {
      if (showInitialLoading) setLoading(true);
      const res = await ecgApi.getRecords();
      setRecords(res.records || []);
    } catch (error) {
      console.error("Failed to load reports:", error);
      showToast("error", "Failed to load reports");
    } finally {
      if (showInitialLoading) setLoading(false);
    }
  };

  const handleReportDeleted = async (recordId: string) => {
    setRecords((prev) => prev.filter((record) => record.id !== recordId));
    await fetchReports(false);
  };

  const filteredRecords = records.filter((r) => {
    const matchesSearch =
      (r.patient_name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (r.id || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (r.uploaded_by_name || "").toLowerCase().includes(searchQuery.toLowerCase());
    
    if (statusFilter !== "all" && r.status !== statusFilter) return false;
    
    return matchesSearch;
  });

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8 animate-in fade-in zoom-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-3xl font-extrabold text-gray-900 dark:text-white flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#1976D2] to-[#1565C0] flex items-center justify-center shadow-lg">
              <FileText className="w-6 h-6 text-white" />
            </div>
            Clinical ECG Directory
          </h2>
          <p className="text-gray-500 dark:text-gray-400 mt-2 md:pl-16">
            Search, filter, and manage all assigned patient electrocardiograms.
          </p>
        </div>
      </div>

      {/* Filters Section */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm border border-gray-200 dark:border-gray-700 flex flex-col md:flex-row gap-4 items-center">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search by Patient Name, Report ID, or Technician..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#1976D2] transition-shadow text-sm"
          />
        </div>
        <div className="flex items-center gap-2 w-full md:w-auto">
          <Filter className="w-5 h-5 text-gray-500" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="flex-1 md:w-48 py-2.5 px-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#1976D2] text-sm"
          >
            <option value="all">All Statuses</option>
            <option value="pending">Pending Review</option>
            <option value="reviewed">Reviewed / Completed</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center p-20 opacity-50">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#1976D2]"></div>
          <p className="mt-4 text-gray-500 dark:text-gray-400">Syncing database...</p>
        </div>
      ) : filteredRecords.length === 0 ? (
        <div className="text-center p-16 bg-white dark:bg-gray-800 rounded-3xl border border-dashed border-gray-300 dark:border-gray-700">
          <Activity className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-gray-800 dark:text-gray-200">No records found</h3>
          <p className="text-gray-500 dark:text-gray-400 mt-2">Adjust your search parameters or check back later.</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {filteredRecords.map((record, index) => {
            const isPending = record.status === "pending";
            const isAbnormal = record.prediction === "abnormal" || (record.prediction && !record.prediction.toLowerCase().includes('normal'));

            return (
              <motion.div
                key={record.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
                onClick={() => onNavigateToReport(record.id)}
                className={`group flex flex-col md:flex-row md:items-center gap-4 p-5 rounded-2xl bg-white dark:bg-gray-800 border-2 transition-all cursor-pointer ${
                  isPending ? "border-orange-100 hover:border-orange-300 dark:border-gray-700 dark:hover:border-orange-500 hover:shadow-orange-100 dark:hover:shadow-orange-900/20 hover:shadow-lg" :
                  isAbnormal ? "border-red-100 hover:border-red-300 dark:border-gray-700 dark:hover:border-red-500 hover:shadow-red-100 dark:hover:shadow-red-900/20 hover:shadow-lg" :
                  "border-gray-100 hover:border-[#1976D2] dark:border-gray-700 hover:shadow-blue-100 dark:hover:shadow-blue-900/20 hover:shadow-lg"
                }`}
              >
                <div
                  className={`w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-inner ${
                    isPending
                      ? "bg-gradient-to-br from-orange-100 to-orange-200 dark:from-orange-900/40 dark:to-orange-800/40"
                      : isAbnormal
                        ? "bg-gradient-to-br from-red-100 to-red-200 dark:from-red-900/40 dark:to-red-800/40"
                        : "bg-gradient-to-br from-green-100 to-green-200 dark:from-green-900/40 dark:to-green-800/40"
                  }`}
                >
                  {isPending ? (
                    <Clock className="w-7 h-7 text-orange-600 dark:text-orange-400" />
                  ) : isAbnormal ? (
                    <AlertCircle className="w-7 h-7 text-red-600 dark:text-red-400" />
                  ) : (
                    <CheckCircle className="w-7 h-7 text-green-600 dark:text-green-400" />
                  )}
                </div>

                <div className="flex-1 min-w-0 grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <h3 className="font-bold text-gray-900 dark:text-white truncate text-lg">
                      {record.patient_name || "Unknown Patient"}
                    </h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1 mt-1 truncate">
                      <FileText className="w-3 h-3" /> {record.id.split(':')[1] || record.id}
                    </p>
                  </div>
                  
                  <div className="flex flex-col justify-center space-y-1">
                    <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300 truncate">
                      <User className="w-4 h-4 opacity-70" />
                      Uploaded by: {record.uploaded_by_name}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                      <Calendar className="w-4 h-4 opacity-70" />
                      {new Date(record.created_at).toLocaleDateString()}
                    </div>
                  </div>

                  <div className="flex flex-col justify-center">
                     {record.prediction ? (
                       <div className="flex items-center gap-2">
                         <Heart className={`w-4 h-4 ${isAbnormal ? 'text-red-500' : 'text-green-500'}`} />
                         <span className="text-sm font-semibold capitalize text-gray-800 dark:text-gray-200 truncate">
                           {record.prediction}
                         </span>
                       </div>
                     ) : (
                       <span className="text-sm font-medium text-orange-600 dark:text-orange-400 flex items-center gap-1">
                          Processing / Pending AI
                       </span>
                     )}
                     {record.confidence && (
                        <span className="text-xs text-gray-500 dark:text-gray-400 font-bold mt-1">
                         Confidence: {record.confidence}%
                       </span>
                     )}
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 pl-4 md:border-l border-gray-100 dark:border-gray-700 ml-auto">
                  {isPending ? (
                    <MedicalButton
                      variant="primary"
                      className="px-4 py-2 text-sm shrink-0 whitespace-nowrap shadow-md z-10"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDiagnose(record.id);
                      }}
                    >
                      Run AI Diagnosis
                    </MedicalButton>
                  ) : (
                    <div className="flex items-center gap-2 text-gray-400 group-hover:text-[#1976D2] font-semibold text-sm transition-colors">
                      View Report <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                    </div>
                  )}
                  <ECGReportMenu
                    record={record}
                    onDeleted={handleReportDeleted}
                  />
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
