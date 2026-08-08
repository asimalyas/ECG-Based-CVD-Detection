import React from "react";
import { motion } from "motion/react";
import { Quote, Star } from "lucide-react";

const testimonials = [
  {
    name: "Dr. Ahmed Hassan",
    role: "Senior Cardiologist",
    hospital: "Aga Khan University Hospital, Karachi",
    image:
      "https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=400&h=400&fit=crop",
    quote:
      "CardioDetect AI has transformed our cardiac diagnostics workflow. The accuracy and speed of ECG analysis have significantly improved our patient care capabilities.",
    rating: 5,
    delay: 0.1,
  },
  {
    name: "Dr. Fatima Malik",
    role: "Head of Cardiology",
    hospital: "Shifa International Hospital, Islamabad",
    image:
      "https://images.unsplash.com/photo-1594824476967-48c8b964273f?w=400&h=400&fit=crop",
    quote:
      "As a leading cardiologist, I appreciate the medical-grade precision. This AI system catches subtle abnormalities that might be missed during manual review.",
    rating: 5,
    delay: 0.2,
  },
  {
    name: "Dr. Usman Sheikh",
    role: "Interventional Cardiologist",
    hospital: "PIMS Hospital, Islamabad",
    image:
      "https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=400&h=400&fit=crop",
    quote:
      "The real-time analysis and comprehensive reporting save us valuable time. Our team can now focus more on patient consultation rather than manual ECG interpretation.",
    rating: 5,
    delay: 0.3,
  },
  {
    name: "Dr. Sana Riaz",
    role: "Consultant Cardiologist",
    hospital: "Jinnah Hospital, Lahore",
    image:
      "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=400&h=400&fit=crop",
    quote:
      "This is the future of cardiovascular diagnostics. The AI predictions are remarkably accurate, and the system integrates seamlessly into our clinical workflow.",
    rating: 5,
    delay: 0.4,
  },
  {
    name: "Dr. Ali Raza",
    role: "Director Cardiology",
    hospital: "Services Hospital, Lahore",
    image:
      "https://images.unsplash.com/photo-1537368910025-700350fe46c7?w=400&h=400&fit=crop",
    quote:
      "CardioDetect AI has become an indispensable tool in our department. The early detection capabilities have literally saved lives in our emergency department.",
    rating: 5,
    delay: 0.5,
  },
  {
    name: "Dr. Ayesha Khan",
    role: "Cardiac Electrophysiologist",
    hospital: "Tabba Heart Institute, Karachi",
    image:
      "https://images.unsplash.com/photo-1551836022-deb4988cc6c0?w=400&h=400&fit=crop",
    quote:
      "Exceptional AI technology combined with user-friendly interface. The confidence scores and detailed analysis help us make better clinical decisions every day.",
    rating: 5,
    delay: 0.6,
  },
];

export function TestimonialsSection() {
  return (
    <section
      id="testimonials"
      className="py-20 px-4 sm:px-6 lg:px-8 bg-white dark:bg-gray-800 transition-colors duration-300"
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
            Trusted by Leading Pakistani Cardiologists
          </motion.h2>
          <motion.p
            className="text-xl text-gray-600 dark:text-gray-400 max-w-3xl mx-auto leading-relaxed"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.3, duration: 0.6 }}
          >
            Hear from healthcare professionals using
            CardioDetect AI to revolutionize cardiac care
          </motion.p>
        </motion.div>

        {/* Testimonials Grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {testimonials.map((testimonial, index) => (
            <motion.div
              key={index}
              className="group relative"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{
                delay: testimonial.delay,
                duration: 0.5,
              }}
            >
              <motion.div
                className="bg-white dark:bg-gray-900 p-8 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 border border-gray-100 dark:border-gray-700 hover:border-[#1976D2] dark:hover:border-blue-400 cursor-pointer h-full flex flex-col"
                whileHover={{ y: -8, scale: 1.02 }}
              >
                {/* Quote Icon */}
                <div className="absolute -top-4 -left-4 w-12 h-12 bg-gradient-to-br from-[#1976D2] to-[#1565C0] rounded-full flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                  <Quote className="w-6 h-6 text-white" />
                </div>

                {/* Rating */}
                <div className="flex gap-1 mb-4">
                  {[...Array(testimonial.rating)].map(
                    (_, i) => (
                      <Star
                        key={i}
                        className="w-5 h-5 fill-[#F57C00] text-[#F57C00]"
                      />
                    ),
                  )}
                </div>

                {/* Quote */}
                <p className="text-gray-700 dark:text-gray-300 mb-6 leading-relaxed flex-grow italic">
                  "{testimonial.quote}"
                </p>

                {/* Doctor Info */}
                <div className="flex items-center gap-4 pt-6 border-t border-gray-200 dark:border-gray-700">
                  <motion.img
                    src={testimonial.image}
                    alt={testimonial.name}
                    className="w-14 h-14 rounded-full object-cover border-2 border-[#1976D2] shadow-md"
                    whileHover={{ scale: 1.1, rotate: 5 }}
                    transition={{ duration: 0.3 }}
                  />
                  <div>
                    <h4 className="text-gray-900 dark:text-white mb-1">
                      {testimonial.name}
                    </h4>
                    <p className="text-sm text-[#1976D2] dark:text-blue-400 mb-1">
                      {testimonial.role}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-500">
                      {testimonial.hospital}
                    </p>
                  </div>
                </div>

                {/* Decorative Element */}
                <motion.div
                  className="absolute bottom-0 right-0 w-32 h-32 bg-gradient-to-tl from-[#1976D2] opacity-5 rounded-tl-full -z-10"
                  animate={{
                    scale: [1, 1.1, 1],
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
          ))}
        </div>

        {/* Bottom Stats */}
        <motion.div
          className="mt-16 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-gray-900 dark:to-gray-800 rounded-2xl p-8 border border-blue-100 dark:border-gray-700"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.7, duration: 0.6 }}
        >
          <div className="grid sm:grid-cols-3 gap-8 text-center">
            <div>
              <h3 className="text-4xl text-[#1976D2] dark:text-blue-400 mb-2">
                4.9/5.0
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                Average Rating
              </p>
            </div>
            <div>
              <h3 className="text-4xl text-[#1976D2] dark:text-blue-400 mb-2">
                500+
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                Doctor Reviews
              </p>
            </div>
            <div>
              <h3 className="text-4xl text-[#1976D2] dark:text-blue-400 mb-2">
                98%
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                Would Recommend
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}