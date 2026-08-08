import React, { useRef } from "react";
import { motion } from "motion/react";
import { ArrowRight, Activity } from "lucide-react";

interface HeroSectionProps {
  onNavigateToSignIn: () => void;
}

export function HeroSection({
  onNavigateToSignIn,
}: HeroSectionProps) {
  const cardRef = useRef<HTMLDivElement | null>(null);

  /** Parallax Tilt **/
  function handleCardMove(e: React.MouseEvent) {
    const el = cardRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x =
      (e.clientX - rect.left - rect.width / 2) /
      (rect.width / 2);
    const y =
      (e.clientY - rect.top - rect.height / 2) /
      (rect.height / 2);

    el.style.transform = `perspective(1200px) rotateX(${(
      -y * 5
    ).toFixed(2)}deg) rotateY(${(x * 5).toFixed(2)}deg)`;
  }

  function handleCardLeave() {
    const el = cardRef.current;
    if (!el) return;
    el.style.transform =
      "perspective(1200px) rotateX(0deg) rotateY(0deg)";
  }

  return (
    <section className="relative pt-32 pb-28 px-6 overflow-hidden select-none">
      {/* 🔵 Dynamic Gradient Background */}
      <motion.div
        className="absolute inset-0 bg-gradient-to-b from-blue-50 to-white dark:from-gray-900 dark:to-gray-800"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1.2 }}
      />

      {/* 🔮 Animated Blobs */}
      <motion.div
        className="absolute -top-24 -left-24 w-96 h-96 rounded-full bg-blue-300/40 blur-[120px] dark:bg-blue-600/30"
        animate={{ x: [0, 30, -20, 0], y: [0, 20, -10, 0] }}
        transition={{ duration: 12, repeat: Infinity }}
      />
      <motion.div
        className="absolute bottom-0 right-0 w-[28rem] h-[28rem] rounded-full bg-orange-300/40 blur-[140px] dark:bg-orange-600/20"
        animate={{ x: [0, -30, 20, 0], y: [0, -10, 20, 0] }}
        transition={{ duration: 14, repeat: Infinity }}
      />

      <div className="max-w-7xl mx-auto relative z-20">
        <div className="grid lg:grid-cols-2 gap-20 items-center">
          {/* =========================== */}
          {/* 🔥 LEFT SECTION */}
          {/* =========================== */}
          <div>
            {/* 🔠 Hero Title with reveal animation */}
            {/* ⚡ Cinematic Animated Heading */}
            {/* 🔥 Premium Animated Heading (NO letter animation) */}
            <motion.h1
              className="
    text-6xl lg:text-7xl font-extrabold 
    bg-clip-text text-transparent 
    bg-gradient-to-r from-[#0D47A1] via-[#1976D2] to-[#42A5F5]
    tracking-tight leading-[1.1] relative inline-block
  "
              initial={{ opacity: 0, y: 45, scale: 0.94 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.9, ease: "easeOut" }}
            >
              CardioDetect AI
              {/* ✨ Soft shimmer overlay */}
              <span
                className="
      absolute inset-0 
      bg-gradient-to-r from-transparent via-white/25 to-transparent 
      dark:via-white/10 
      blur-[6px]
      pointer-events-none 
      animate-headingShimmer
    "
              />
            </motion.h1>

            {/* 🌟 Subtitle — minimal, premium fade */}
            <motion.p
              className="text-2xl text-gray-700 dark:text-gray-300 mt-4 font-medium max-w-xl leading-relaxed"
              initial={{ opacity: 0, y: 22 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: 0.8,
                delay: 0.25,
                ease: "easeOut",
              }}
            >
              AI-Powered Cardiovascular Diagnostics.
            </motion.p>

            <style>{`
  @keyframes headingShimmer {
    0% { transform: translateX(-120%); opacity: 0; }
    15% { opacity: 1; }
    50% { transform: translateX(120%); opacity: 1; }
    100% { opacity: 0; }
  }
  .animate-headingShimmer {
    animation: headingShimmer 2.8s ease-in-out 1;
  }
`}</style>

            {/* 💬 Description */}
            <motion.p
              className="text-lg mt-6 text-gray-600 dark:text-gray-400 max-w-xl leading-relaxed"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1, delay: 0.35 }}
            >
              The next generation of ECG interpretation.
              Designed for clinicians, powered by cutting-edge
              AI, built with precision for Pakistan’s healthcare
              system.
            </motion.p>

            {/* 🚀 CTA Buttons */}
            <motion.div
              className="flex flex-wrap gap-5 mt-10"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
            >
              <motion.button
                onClick={onNavigateToSignIn}
                whileHover={{ scale: 1.05, y: -4 }}
                whileTap={{ scale: 0.97 }}
                className="px-8 py-4 bg-gradient-to-r from-[#1565C0] to-[#0D47A1] text-white rounded-2xl shadow-xl hover:shadow-2xl flex items-center gap-3 text-lg font-semibold"
              >
                Get Started
                <ArrowRight className="w-6 h-6" />
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.05, y: -4 }}
                onClick={() =>
                  document
                    .getElementById("how-it-works")
                    ?.scrollIntoView({ behavior: "smooth" })
                }
                className="px-8 py-4 bg-white dark:bg-gray-900 border-2 border-[#1565C0] text-[#1565C0] dark:text-blue-300 dark:border-blue-400 rounded-2xl shadow-lg hover:bg-blue-50 dark:hover:bg-gray-700 text-lg font-semibold"
              >
                Learn More
              </motion.button>
            </motion.div>
          </div>

          {/* =========================== */}
          {/* 🎛️ RIGHT — CARD WITH TILT + ECG ANIMATION */}
          {/* =========================== */}
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 1, delay: 0.25 }}
          >
            <div
              className="relative max-w-md mx-auto"
              onMouseMove={handleCardMove}
              onMouseLeave={handleCardLeave}
            >
              <motion.div
                ref={cardRef}
                className="p-8 bg-white dark:bg-gray-800 rounded-3xl shadow-2xl border border-gray-200 dark:border-gray-700"
                style={{ transformStyle: "preserve-3d" }}
                whileHover={{ translateY: -10 }}
              >
                {/* Header */}
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center shadow-lg">
                    <Activity className="w-7 h-7 text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                      ECG Analysis
                    </h3>
                    <p className="text-gray-500 dark:text-gray-400 text-sm">
                      Real-time Diagnostics
                    </p>
                  </div>
                </div>

                {/* Animated ECG Wave */}
                <div className="relative bg-gradient-to-b from-gray-50 to-white dark:from-gray-900 dark:to-gray-800 h-48 rounded-xl p-4 overflow-hidden">
                  <svg
                    viewBox="0 0 400 120"
                    className="w-full h-full"
                  >
                    <defs>
                      <linearGradient
                        id="pulse"
                        x1="0%"
                        x2="100%"
                      >
                        <stop offset="0%" stopColor="#00E1FF" />
                        <stop
                          offset="50%"
                          stopColor="#1976D2"
                        />
                        <stop
                          offset="100%"
                          stopColor="#7C4DFF"
                        />
                      </linearGradient>
                    </defs>

                    <motion.path
                      d="M0,60 L35,60 L45,25 L55,95 L65,40 L75,60 L120,60 L160,60 L170,25 L180,95 L190,40 L200,60 L250,60 L290,60 L300,25 L310,95 L320,40 L330,60 L400,60"
                      fill="none"
                      stroke="url(#pulse)"
                      strokeWidth="3"
                      strokeLinecap="round"
                      initial={{ pathLength: 0 }}
                      animate={{ pathLength: 1 }}
                      transition={{
                        duration: 2,
                        repeat: Infinity,
                        ease: "linear",
                      }}
                    />
                  </svg>
                </div>
              </motion.div>

              {/* Floating Shadow */}
              <motion.div
                className="w-40 h-3 bg-black/10 dark:bg-white/10 mx-auto blur-md rounded-full mt-8"
                animate={{
                  scale: [1, 1.1, 1],
                  opacity: [0.5, 1, 0.5],
                }}
                transition={{ duration: 2.5, repeat: Infinity }}
              />
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}