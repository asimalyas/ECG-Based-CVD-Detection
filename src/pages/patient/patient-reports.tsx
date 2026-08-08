import React, { useState, useEffect } from "react";
import { useToast } from "../../components/ui/medical-toast";
import { ECGReportMenu } from "../../components/ecg-report-menu";
import { ecgApi } from "../../lib/api";
import {
  Calendar,
  Heart,
  Clock,
  CheckCircle,
  AlertCircle,
  Eye,
  Activity,
  FileText
} from "lucide-react";
import { motion } from "motion/react";

interface PatientReportsProps {
  onViewReport: (reportId: string) => void;
}

export function PatientReports({ onViewReport }: PatientReportsProps) {
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateFilter, setDateFilter] = useState("");
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
      showToast("error", "Failed to load your reports");
    } finally {
      if (showInitialLoading) setLoading(false);
    }
  };

  const handleReportDeleted = async (recordId: string) => {
    setRecords((prev) => prev.filter((record) => record.id !== recordId));
    await fetchReports(false);
  };

  const filteredRecords = records.filter((r) => {
    if (!dateFilter) return true;
    const recordDate = new Date(r.created_at).toISOString().split('T')[0];
    return recordDate === dateFilter;
  });

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-8 animate-in fade-in zoom-in duration-500">
      <div className="bg-gradient-to-r from-[#1976D2] to-[#1565C0] rounded-3xl p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-20 -mt-20 backdrop-blur-3xl"></div>
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/5 rounded-full -ml-16 -mb-16 backdrop-blur-xl"></div>
        
        <div className="relative z-10 flex items-center gap-6">
          <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-md shadow-inner border border-white/30">
            <Activity className="w-8 h-8 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight">My Health Reports</h1>
            <p className="text-blue-100 font-medium mt-1 opacity-90">
              Track and review all your cardiac analysis records in one place.
            </p>
          </div>
        </div>
      </div>

      {/* Date Filter */}
      <div className="flex items-center gap-3 bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 w-full sm:max-w-md">
        <Calendar className="w-5 h-5 text-gray-400" />
        <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Filter Date:</span>
        <input
          type="date"
          value={dateFilter}
          onChange={(e) => setDateFilter(e.target.value)}
          className="flex-1 px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#1976D2]"
        />
        {dateFilter && (
          <button 
            onClick={() => setDateFilter("")}
            className="text-xs text-[#1976D2] font-semibold hover:underline"
          >
            Clear
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex flex-col items-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#1976D2]"></div>
          <p className="text-gray-500 dark:text-gray-400 mt-4 font-medium animate-pulse">Loading health records...</p>
        </div>
      ) : filteredRecords.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-3xl p-16 text-center border border-gray-200 dark:border-gray-700 shadow-sm">
          <FileText className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
          <h3 className="text-2xl font-bold text-gray-800 dark:text-white">No Reports Found</h3>
          <p className="text-gray-500 dark:text-gray-400 mt-2 max-w-sm mx-auto">
            {dateFilter ? "You have no ECG scans on this specific date. Try selecting another date." : "You have not uploaded any ECG scans to your medical profile yet."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredRecords.map((record, index) => {
            const isPending = record.status === "pending";
            const isAbnormal = record.prediction === "abnormal" || (record.prediction && !record.prediction.toLowerCase().includes('normal'));

            return (
              <motion.div
                key={record.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.4, delay: index * 0.05 }}
                onClick={() => onViewReport(record.id)}
                className="group relative overflow-hidden rounded-3xl bg-white dark:bg-gray-800 border-[1.5px] border-gray-100 dark:border-gray-700 hover:border-[#1976D2] dark:hover:border-blue-500 p-6 cursor-pointer shadow-sm hover:shadow-xl transition-all duration-300 ease-out"
                style={{ paddingRight: "5rem" }}
              >
                <div className="flex items-start gap-5">
                  <div
                    className={`w-16 h-16 rounded-2xl flex items-center justify-center flex-shrink-0 transition-transform duration-500 group-hover:scale-110 shadow-inner ${
                      isPending
                        ? "bg-gradient-to-br from-orange-400 to-orange-500"
                        : isAbnormal
                          ? "bg-gradient-to-br from-red-400 to-red-600"
                          : "bg-gradient-to-br from-green-400 to-green-600"
                    }`}
                  >
                    {isPending ? (
                      <Clock className="w-8 h-8 text-white" />
                    ) : isAbnormal ? (
                      <AlertCircle className="w-8 h-8 text-white shadow-sm" />
                    ) : (
                      <CheckCircle className="w-8 h-8 text-white shadow-sm" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0 pr-4">
                    <div className="flex items-center gap-2 mb-2">
                      <h4 className="font-bold text-lg text-gray-900 dark:text-white truncate">
                        ECG Diagnostic Scan
                      </h4>
                      {isPending && (
                        <span className="px-2.5 py-0.5 bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-400 text-[10px] font-black uppercase tracking-wider rounded-full">
                          Processing
                        </span>
                      )}
                      {isAbnormal && !isPending && (
                        <span className="px-2.5 py-0.5 bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-400 text-[10px] font-black uppercase tracking-wider rounded-full flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" /> Note
                        </span>
                      )}
                    </div>

                    <div className="space-y-2.5 text-sm">
                      <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 font-medium">
                        <Calendar className="w-4 h-4 opacity-70 text-[#1976D2]" />
                        <span>
                          {new Date(record.created_at).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                        </span>
                      </div>

                      {record.prediction && (
                        <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300 font-semibold bg-gray-50 dark:bg-gray-900/50 p-2 rounded-lg border border-gray-100 dark:border-gray-800">
                          <Heart className={`w-4 h-4 ${isAbnormal ? 'text-red-500' : 'text-green-500'}`} />
                          <span className="capitalize truncate">
                            {record.prediction}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="absolute top-4 right-4 z-20">
                  <ECGReportMenu
                    record={record}
                    onDeleted={handleReportDeleted}
                  />
                </div>

                <div className="absolute opacity-0 group-hover:opacity-100 transition-all duration-300 translate-x-4 group-hover:translate-x-0" style={{ top: "50%", right: "1rem", transform: "translateY(-50%)" }}>
                  <div className="w-10 h-10 rounded-full bg-blue-50 dark:bg-gray-700 flex items-center justify-center">
                    <Eye className="w-5 h-5 text-[#1976D2] dark:text-blue-400" />
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
