import React from "react";
import { motion } from "motion/react";
import {
  Brain,
  Shield,
  Zap,
  Users,
  FileText,
  Clock,
  Award,
  Lock,
} from "lucide-react";

const features = [
  {
    icon: Brain,
    title: "Advanced AI Analysis",
    description:
      "State-of-the-art deep learning models trained on thousands of ECG records for accurate cardiovascular disease detection.",
    color: "#1976D2",
    delay: 0.1,
  },

  {
    icon: Zap,
    title: "Instant Results",
    description:
      "Real-time ECG analysis with results delivered in seconds, enabling faster clinical decision-making.",
    color: "#F57C00",
    delay: 0.3,
  },
  {
    icon: Users,
    title: "Multi-Role Support",
    description:
      "Seamless collaboration between doctors, technicians, and patients with role-based access control.",
    color: "#7B1FA2",
    delay: 0.4,
  },
  {
    icon: FileText,
    title: "Comprehensive Reports",
    description:
      "Detailed diagnostic reports with visual analysis, predictions, and confidence scores for clinical documentation.",
    color: "#0288D1",
    delay: 0.5,
  },
];

export function FeaturesSection() {
  return (
    <section
      id="features"
      className="py-20 px-4 sm:px-6 lg:px-8 bg-white dark:bg-gray-800 transition-colors duration-300"
    >
      <div className="max-w-7xl mx-auto">
        {/* Section Header */}
        <motion.div
          className="text-center mb-20"
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, ease: "easeOut" }}
        >
          {/* 🔥 Gradient heading with bold premium look */}
          <motion.h2
            className="
      text-4xl sm:text-5xl lg:text-6xl
      font-extrabold
      bg-clip-text text-transparent
      bg-gradient-to-r from-[#0D47A1] via-[#1976D2] to-[#42A5F5]
      tracking-tight leading-tight
      drop-shadow-sm
      mb-6
    "
            initial={{ opacity: 0, y: 25 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.15, duration: 0.7 }}
          >
            Why Choose CardioDetect AI?
          </motion.h2>

          {/* 💬 Clean professional subtitle */}
          <motion.p
            className="
      text-lg sm:text-xl
      text-gray-700 dark:text-gray-300
      max-w-3xl mx-auto
      leading-relaxed font-medium
    "
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.25, duration: 0.7 }}
          >
            Powerful features designed to revolutionize
            cardiovascular care and improve patient outcomes
            through intelligent automation.
          </motion.p>

          {/* ✨ small glowing underline accent */}
          <motion.div
            className="
      w-28 h-1.5 rounded-full mt-6 mx-auto
      bg-gradient-to-r from-[#1976D2] to-[#42A5F5]
      shadow-lg
    "
            initial={{ scaleX: 0, opacity: 0 }}
            whileInView={{ scaleX: 1, opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.35, duration: 0.6 }}
          />
        </motion.div>

        {/* Features Grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <motion.div
                key={index}
                className="group relative bg-white dark:bg-gray-900 p-6 rounded-2xl shadow-md hover:shadow-2xl transition-all duration-300 border border-gray-100 dark:border-gray-700 hover:border-transparent cursor-pointer"
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{
                  delay: feature.delay,
                  duration: 0.5,
                }}
                whileHover={{ y: -8, scale: 1.02 }}
              >
                {/* Gradient Overlay on Hover */}
                <div
                  className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-10 transition-opacity duration-300"
                  style={{
                    background: `linear-gradient(135deg, ${feature.color} 0%, transparent 100%)`,
                  }}
                />

                {/* Icon */}
                <motion.div
                  className="w-14 h-14 rounded-xl flex items-center justify-center mb-4 shadow-lg group-hover:shadow-xl transition-shadow"
                  style={{
                    backgroundColor: `${feature.color}15`,
                  }}
                  whileHover={{ rotate: 360, scale: 1.1 }}
                  transition={{ duration: 0.6 }}
                >
                  <Icon
                    className="w-7 h-7"
                    style={{ color: feature.color }}
                  />
                </motion.div>

                {/* Content */}
                <h3 className="text-xl text-gray-900 dark:text-white mb-3 group-hover:text-[#1976D2] dark:group-hover:text-blue-400 transition-colors">
                  {feature.title}
                </h3>
                <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                  {feature.description}
                </p>

                {/* Hover Indicator */}
                <motion.div
                  className="absolute bottom-4 right-4 w-8 h-8 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  style={{
                    backgroundColor: `${feature.color}20`,
                  }}
                >
                  <motion.div
                    animate={{ x: [0, 4, 0] }}
                    transition={{
                      duration: 1,
                      repeat: Infinity,
                    }}
                  >
                    →
                  </motion.div>
                </motion.div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}