import React from "react";
import { motion } from "motion/react";
import {
  Upload,
  Brain,
  FileCheck,
  CheckCircle,
} from "lucide-react";

const steps = [
  {
    number: "01",
    icon: Upload,
    title: "Upload ECG",
    description:
      "Patients or technicians securely upload ECG images or data through our encrypted platform.",
    color: "#1976D2",
    delay: 0.1,
  },
  {
    number: "02",
    icon: Brain,
    title: "AI Analysis",
    description:
      "Advanced deep learning algorithms analyze the ECG patterns and detect potential cardiovascular abnormalities.",
    color: "#7B1FA2",
    delay: 0.2,
  },
  {
    number: "03",
    icon: FileCheck,
    title: "Doctor Review",
    description:
      "Board-certified cardiologists review AI predictions and provide clinical validation and recommendations.",
    color: "#F57C00",
    delay: 0.3,
  },
  {
    number: "04",
    icon: CheckCircle,
    title: "Get Results",
    description:
      "Patients receive comprehensive diagnostic reports with actionable insights and treatment recommendations.",
    color: "#388E3C",
    delay: 0.4,
  },
];

export function HowItWorksSection() {
  return (
    <section
      id="how-it-works"
      className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-white to-blue-50 dark:from-gray-800 dark:to-gray-900 transition-colors duration-300"
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
          {/* 🔥 Bold, premium heading with gradient accent */}
          <motion.h2
            className="
      text-4xl sm:text-5xl lg:text-6xl 
      font-extrabold 
      bg-clip-text 
      text-transparent 
      bg-gradient-to-r 
      from-[#0D47A1] via-[#1976D2] to-[#42A5F5]
      drop-shadow-sm
      tracking-tight
    "
            initial={{ opacity: 0, y: 25 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{
              delay: 0.15,
              duration: 0.7,
              ease: "easeOut",
            }}
          >
            How It Works
          </motion.h2>

          {/* 💬 Subtitle - clean, premium */}
          <motion.p
            className="
      text-lg sm:text-xl 
      text-gray-700 dark:text-gray-300 
      max-w-3xl mx-auto 
      mt-5 
      leading-relaxed 
      font-medium
    "
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.25, duration: 0.7 }}
          >
            A smooth and intelligent process built to blend
            naturally with modern clinical workflows.
          </motion.p>

          {/* ✨ Glowing underline accent */}
          <motion.div
            className="
      w-32 h-1.5 
      bg-gradient-to-r 
      from-[#1976D2] to-[#42A5F5] 
      rounded-full 
      mx-auto 
      mt-6
      shadow-lg
    "
            initial={{ scaleX: 0, opacity: 0 }}
            whileInView={{ scaleX: 1, opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.35, duration: 0.6 }}
          />
        </motion.div>

        {/* Steps */}
        <div className="relative">
          {/* Connection Line - Desktop */}
          <div className="hidden lg:block absolute top-24 left-0 right-0 h-1 bg-gradient-to-r from-[#1976D2] via-[#7B1FA2] via-[#F57C00] to-[#388E3C] opacity-20" />

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8 relative">
            {steps.map((step, index) => {
              const Icon = step.icon;
              return (
                <motion.div
                  key={index}
                  className="relative"
                  initial={{ opacity: 0, y: 50 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{
                    delay: step.delay,
                    duration: 0.6,
                  }}
                >
                  {/* Card */}
                  <motion.div
                    className="group relative bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 border-2 border-transparent hover:border-current cursor-pointer h-full"
                    style={{ borderColor: "transparent" }}
                    whileHover={{
                      y: -10,
                      borderColor: step.color,
                      scale: 1.02,
                    }}
                  >
                    {/* Step Number */}
                    <div
                      className="absolute -top-4 -right-4 w-12 h-12 rounded-full flex items-center justify-center shadow-lg"
                      style={{ backgroundColor: step.color }}
                    >
                      <span className="text-white text-sm">
                        {step.number}
                      </span>
                    </div>

                    {/* Icon */}
                    <motion.div
                      className="w-16 h-16 rounded-2xl flex items-center justify-center mb-6 shadow-md group-hover:shadow-xl transition-shadow"
                      style={{
                        backgroundColor: `${step.color}15`,
                      }}
                      whileHover={{ rotate: 360, scale: 1.1 }}
                      transition={{ duration: 0.6 }}
                    >
                      <Icon
                        className="w-8 h-8"
                        style={{ color: step.color }}
                      />
                    </motion.div>

                    {/* Content */}
                    <h3
                      className="text-2xl text-gray-900 dark:text-white mb-4 transition-colors group-hover:opacity-90"
                      style={{ color: step.color }}
                    >
                      {step.title}
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                      {step.description}
                    </p>

                    {/* Hover Arrow */}
                    {index < steps.length - 1 && (
                      <motion.div
                        className="hidden lg:block absolute -right-8 top-1/2 transform -translate-y-1/2 text-gray-300 dark:text-gray-600 text-3xl opacity-0 group-hover:opacity-100 transition-opacity"
                        animate={{ x: [0, 5, 0] }}
                        transition={{
                          duration: 1.5,
                          repeat: Infinity,
                        }}
                      >
                        →
                      </motion.div>
                    )}
                  </motion.div>
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* Bottom Info */}
      </div>
    </section>
  );
}