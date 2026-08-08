import React, { useState, useEffect } from "react";
import { MedicalButton } from "../../components/ui/medical-button";
import { useToast } from "../../components/ui/medical-toast";
import {
  Users,
  UserCog,
  Activity,
  Shield,
  Server,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  Clock,
  Zap,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { statsApi, auditApi } from "../../lib/api";

interface AdminDashboardProps {
  onNavigateToUsers: () => void;
  onNavigateToAudit: () => void;
}

export function AdminDashboard({
  onNavigateToUsers,
  onNavigateToAudit,
}: AdminDashboardProps) {
  const [stats, setStats] = useState({
    totalUsers: 0,
    pendingUsers: 0,
    totalEcgs: 0,
    usersByRole: {
      patient: 0,
      doctor: 0,
      technician: 0,
      admin: 0,
    },
  });
  const [recentActivity, setRecentActivity] = useState<any[]>(
    [],
  );
  const [loading, setLoading] = useState(true);
  const { showToast } = useToast();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [statsResponse, logsResponse] = await Promise.all([
        statsApi.getStats(),
        auditApi.getLogs().catch(() => ({ logs: [] })),
      ]);

      setStats(statsResponse.stats);
      setRecentActivity((logsResponse.logs || []).slice(0, 10));
    } catch (error: any) {
      console.error("Error fetching dashboard data:", error);
      showToast("error", "Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  };

  const totalUsers = stats.totalUsers || 0;
  const pendingUsers = stats.pendingUsers || 0;
  const totalEcgs = stats.totalEcgs || 0;
  const patients = stats.usersByRole?.patient || 0;
  const doctors = stats.usersByRole?.doctor || 0;
  const technicians = stats.usersByRole?.technician || 0;
  const admins = stats.usersByRole?.admin || 0;

  const MetricTile = ({
    title,
    value,
    icon: Icon,
    color,
    trend,
    delay = 0,
  }: {
    title: string;
    value: number | string;
    icon: any;
    color: string;
    trend?: string;
    delay?: number;
  }) => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
      whileHover={{
        y: -4,
        boxShadow: "0 12px 24px rgba(0,0,0,0.15)",
      }}
      className="group relative overflow-hidden rounded-2xl p-6 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 transition-all"
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
            {title}
          </p>
          <h3 className="text-3xl font-bold text-gray-900 dark:text-white">
            {value}
          </h3>
          {trend && (
            <p className="text-xs text-green-600 dark:text-green-400 mt-2 flex items-center gap-1">
              <TrendingUp className="w-3 h-3" />
              {trend}
            </p>
          )}
        </div>
        <div
          className="w-14 h-14 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110"
          style={{ backgroundColor: `${color}20` }}
        >
          <Icon className="w-7 h-7" style={{ color }} />
        </div>
      </div>
      <div
        className="absolute bottom-0 left-0 right-0 h-1 transition-all duration-300 group-hover:h-2"
        style={{ backgroundColor: color }}
      />
    </motion.div>
  );

  const RoleDistributionRing = ({
    label,
    value,
    total,
    color,
    delay,
  }: {
    label: string;
    value: number;
    total: number;
    color: string;
    delay: number;
  }) => {
    const percentage = total > 0 ? (value / total) * 100 : 0;
    const circumference = 2 * Math.PI * 45;
    const offset =
      circumference - (percentage / 100) * circumference;

    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, delay }}
        className="flex flex-col items-center"
      >
        <div className="relative w-32 h-32">
          <svg className="transform -rotate-90 w-32 h-32">
            <circle
              cx="64"
              cy="64"
              r="45"
              stroke="currentColor"
              strokeWidth="8"
              fill="none"
              className="text-gray-200 dark:text-gray-700"
            />
            <motion.circle
              cx="64"
              cy="64"
              r="45"
              stroke={color}
              strokeWidth="8"
              fill="none"
              strokeDasharray={circumference}
              initial={{ strokeDashoffset: circumference }}
              animate={{ strokeDashoffset: offset }}
              transition={{ duration: 1, delay: delay + 0.2 }}
              strokeLinecap="round"
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center flex-col">
            <span className="text-2xl font-bold text-gray-900 dark:text-white">
              {value}
            </span>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {percentage.toFixed(0)}%
            </span>
          </div>
        </div>
        <p className="mt-3 text-sm font-medium text-gray-700 dark:text-gray-300">
          {label}
        </p>
      </motion.div>
    );
  };

  const ActivityStrip = ({
    activity,
    index,
  }: {
    activity: any;
    index: number;
  }) => {
    const getActionIcon = (action: string) => {
      if (action.includes("approve"))
        return <CheckCircle2 className="w-4 h-4" />;
      if (action.includes("reject"))
        return <AlertCircle className="w-4 h-4" />;
      if (action.includes("review"))
        return <Activity className="w-4 h-4" />;
      return <Zap className="w-4 h-4" />;
    };

    const getActionColor = (action: string) => {
      if (action.includes("approve")) return "#388E3C";
      if (action.includes("reject")) return "#D32F2F";
      if (action.includes("review")) return "#1976D2";
      return "#F57C00";
    };
    
    // Format activity details for display
    const formatDetails = (details: any) => {
      if (!details) return "No details available";
      if (typeof details === 'string') return details;
      
      // If it's an object, format it nicely
      if (typeof details === 'object') {
        // Common patterns for different activities
        if (details.email) {
          return `${details.email} (${details.role || 'user'})`;
        }
        if (details.approved_user_email) {
          return `Approved ${details.approved_user_name} (${details.approved_user_role})`;
        }
        if (details.rejected_user_email) {
          return `Rejected ${details.rejected_user_name} (${details.rejected_user_role})`;
        }
        // Fallback: stringify the object
        return JSON.stringify(details);
      }
      
      return String(details);
    };

    const color = getActionColor(activity.action);

    return (
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.4, delay: index * 0.05 }}
        className="group relative flex items-start gap-4 p-4 rounded-xl bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all border border-transparent hover:border-gray-300 dark:hover:border-gray-600"
      >
        <div
          className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 transition-transform group-hover:scale-110"
          style={{ backgroundColor: `${color}20`, color }}
        >
          {getActionIcon(activity.action)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <p className="font-medium text-gray-900 dark:text-white text-sm">
              {activity.user_name || activity.admin_name || activity.doctor_name || "System"}
            </p>
            <span className="text-xs text-gray-400">•</span>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {activity.action?.replace(/_/g, " ") || "Activity"}
            </p>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
            {formatDetails(activity.details)}
          </p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-2 flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {new Date(activity.timestamp).toLocaleString()}
          </p>
        </div>
      </motion.div>
    );
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-64" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
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

  return (
    <div className="space-y-8 pb-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.55, ease: "easeOut" }}
        className="relative mb-4"
      >
        {/* Decorative Glow */}
        <div
          className="
    absolute -top-6 left-0 w-40 h-20 
    bg-indigo-500/20 dark:bg-indigo-400/20 
    blur-3xl rounded-full 
    pointer-events-none
  "
        />

        {/* Main Title */}
        <h1
          className="
      text-3xl font-bold tracking-tight 
      text-[var(--text-color)] dark:text-white 
      relative z-10
    "
        >
          Admin Dashboard
        </h1>

        {/* Subtitle */}
        <p
          className="
      text-sm mt-1 
      text-[var(--text-secondary)] dark:text-gray-400 
      relative z-10
    "
        >
          System Overview & Management
        </p>

        {/* Gradient accent underline */}
        <div
          className="
      mt-3 w-20 h-1.5 
      rounded-full 
      bg-gradient-to-r 
      from-indigo-500 to-purple-600 
      dark:from-indigo-400 dark:to-purple-500
    "
        />
      </motion.div>

      {/* Floating Metric Tiles */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">
        <MetricTile
          title="Total Users"
          value={totalUsers}
          icon={Users}
          color="#1976D2"
          trend="+12% this month"
          delay={0}
        />
        <MetricTile
          title="Pending Approvals"
          value={pendingUsers}
          icon={UserCog}
          color="#F57C00"
          delay={0.1}
        />
        <MetricTile
          title="Total ECG Records"
          value={totalEcgs}
          icon={Activity}
          color="#388E3C"
          trend="+8% this week"
          delay={0.2}
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Activity Stream */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm"
        >
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-gray-900 dark:text-white">
                Recent Activity
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Latest system events and actions
              </p>
            </div>
            <MedicalButton
              variant="secondary"
              onClick={onNavigateToAudit}
            >
              View All
            </MedicalButton>
          </div>

          <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
            {recentActivity.length > 0 ? (
              recentActivity.map((activity, index) => (
                <ActivityStrip
                  key={activity.id || index}
                  activity={activity}
                  index={index}
                />
              ))
            ) : (
              <div className="text-center py-12">
                <Activity className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                <p className="text-gray-500 dark:text-gray-400">
                  No recent activity
                </p>
              </div>
            )}
          </div>
        </motion.div>

        {/* User Distribution & Quick Actions */}
        <div className="space-y-6">
          {/* User Distribution Rings */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.5 }}
            className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm"
          >
            <h3 className="text-gray-900 dark:text-white mb-6">
              User Distribution
            </h3>
            <div className="grid grid-cols-2 gap-6">
              <RoleDistributionRing
                label="Patients"
                value={patients}
                total={totalUsers}
                color="#1976D2"
                delay={0.6}
              />
              <RoleDistributionRing
                label="Doctors"
                value={doctors}
                total={totalUsers}
                color="#388E3C"
                delay={0.7}
              />
              <RoleDistributionRing
                label="Technicians"
                value={technicians}
                total={totalUsers}
                color="#F57C00"
                delay={0.8}
              />
              <RoleDistributionRing
                label="Admins"
                value={admins}
                total={totalUsers}
                color="#D32F2F"
                delay={0.9}
              />
            </div>
          </motion.div>

          {/* Quick Actions */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.6 }}
            className="bg-gradient-to-br from-blue-500 to-blue-600 dark:from-blue-600 dark:to-blue-700 rounded-2xl p-6 shadow-lg text-white"
          >
            <h3 className="mb-4 flex items-center gap-2">
              <Zap className="w-5 h-5" />
              Quick Actions
            </h3>
            <div className="space-y-3">
              <button
                onClick={onNavigateToUsers}
                className="w-full bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-xl p-3 flex items-center gap-3 transition-all hover:translate-x-1"
              >
                <Users className="w-5 h-5" />
                <span className="font-medium">
                  Manage Users
                </span>
              </button>
              <button
                onClick={onNavigateToAudit}
                className="w-full bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-xl p-3 flex items-center gap-3 transition-all hover:translate-x-1"
              >
                <Activity className="w-5 h-5" />
                <span className="font-medium">Audit Logs</span>
              </button>
              <button className="w-full bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-xl p-3 flex items-center gap-3 transition-all hover:translate-x-1">
                <Shield className="w-5 h-5" />
                <span className="font-medium">
                  System Settings
                </span>
              </button>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Custom Scrollbar Styles */}
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
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #a0aec0;
        }
      `}</style>
    </div>
  );
}