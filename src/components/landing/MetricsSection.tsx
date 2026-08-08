import React from "react";
import { motion } from "motion/react";
import { TrendingUp, Users, Award, Clock } from "lucide-react";

const metrics = [
  {
    icon: Award,
    value: "98.5%",
    label: "Diagnostic Accuracy",
    description: "Validated by leading cardiologists",
    color: "#388E3C",
    delay: 0.1,
  },
  {
    icon: Users,
    value: "50,000+",
    label: "ECGs Analyzed",
    description: "Helping patients across Pakistan",
    color: "#1976D2",
    delay: 0.2,
  },
  {
    icon: Clock,
    value: "< 30 sec",
    label: "Analysis Time",
    description: "Lightning-fast results",
    color: "#F57C00",
    delay: 0.3,
  },
  {
    icon: TrendingUp,
    value: "95%",
    label: "Early Detection Rate",
    description: "Catching conditions early",
    color: "#7B1FA2",
    delay: 0.4,
  },
];

export function MetricsSection() {
  return (
    <section
      id="metrics"
      className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-blue-50 to-white dark:from-gray-900 dark:to-gray-800 transition-colors duration-300"
    >
      <div className="max-w-7xl mx-auto">
        {/* Section Header */}
        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <motion.h2
            className="text-4xl sm:text-5xl text-gray-900 dark:text-white mb-4"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2, duration: 0.6 }}
          >
            Proven Results That Matter
          </motion.h2>
          <motion.p
            className="text-xl text-gray-600 dark:text-gray-400 max-w-3xl mx-auto leading-relaxed"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.3, duration: 0.6 }}
          >
            Our AI-powered system delivers exceptional
            performance metrics that healthcare professionals
            trust
          </motion.p>
        </motion.div>

        {/* Metrics Grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {metrics.map((metric, index) => {
            const Icon = metric.icon;
            return (
              <motion.div
                key={index}
                className="relative group"
                initial={{ opacity: 0, scale: 0.8 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{
                  delay: metric.delay,
                  duration: 0.5,
                }}
              >
                <motion.div
                  className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 border-2 border-transparent hover:border-current text-center cursor-pointer h-full"
                  whileHover={{
                    y: -10,
                    scale: 1.05,
                    borderColor: metric.color,
                  }}
                >
                  {/* Icon */}
                  <motion.div
                    className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-md group-hover:shadow-xl transition-shadow"
                    style={{
                      backgroundColor: `${metric.color}15`,
                    }}
                    whileHover={{ rotate: 360 }}
                    transition={{ duration: 0.6 }}
                  >
                    <Icon
                      className="w-8 h-8"
                      style={{ color: metric.color }}
                    />
                  </motion.div>

                  {/* Value */}
                  <motion.h3
                    className="text-5xl mb-2 transition-colors"
                    style={{ color: metric.color }}
                    initial={{ scale: 1 }}
                    whileInView={{ scale: [1, 1.1, 1] }}
                    viewport={{ once: true }}
                    transition={{
                      delay: metric.delay + 0.3,
                      duration: 0.5,
                    }}
                  >
                    {metric.value}
                  </motion.h3>

                  {/* Label */}
                  <h4 className="text-xl text-gray-900 dark:text-white mb-2">
                    {metric.label}
                  </h4>

                  {/* Description */}
                  <p className="text-gray-600 dark:text-gray-400 text-sm">
                    {metric.description}
                  </p>

                  {/* Decorative Element */}
                  <motion.div
                    className="absolute top-0 right-0 w-20 h-20 rounded-full opacity-5 -z-10"
                    style={{ backgroundColor: metric.color }}
                    animate={{
                      scale: [1, 1.2, 1],
                      opacity: [0.05, 0.1, 0.05],
                    }}
                    transition={{
                      duration: 3,
                      repeat: Infinity,
                      ease: "easeInOut",
                    }}
                  />
                </motion.div>
              </motion.div>
            );
          })}
        </div>

        {/* Additional Stats */}
        <motion.div
          className="mt-16 bg-gradient-to-r from-[#1976D2] to-[#1565C0] rounded-3xl p-8 sm:p-12 shadow-2xl text-white"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.5, duration: 0.6 }}
        >
          <div className="grid sm:grid-cols-3 gap-8 text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.6, duration: 0.5 }}
            >
              <h3 className="text-4xl sm:text-5xl mb-2">
                200+
              </h3>
              <p className="text-blue-100">
                Healthcare Facilities
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.7, duration: 0.5 }}
            >
              <h3 className="text-4xl sm:text-5xl mb-2">
                500+
              </h3>
              <p className="text-blue-100">
                Medical Professionals
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.8, duration: 0.5 }}
            >
              <h3 className="text-4xl sm:text-5xl mb-2">
                24/7
              </h3>
              <p className="text-blue-100">Support Available</p>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}