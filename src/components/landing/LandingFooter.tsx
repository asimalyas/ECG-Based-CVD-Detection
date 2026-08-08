import React from "react";
import { motion } from "motion/react";
import {
  Activity,
  Mail,
  Phone,
  MapPin,
  Facebook,
  Twitter,
  Linkedin,
  Instagram,
} from "lucide-react";

interface LandingFooterProps {
  onNavigateToSignIn: () => void;
}

export function LandingFooter({
  onNavigateToSignIn,
}: LandingFooterProps) {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-gradient-to-b from-gray-900 to-black text-white pt-16 pb-10 transition-colors duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Main Grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-12 mb-14">
          {/* Brand */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-11 h-11 bg-[#1976D2] rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20">
                <Activity className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-semibold tracking-wide">
                CardioDetect AI
              </h3>
            </div>

            <p className="text-gray-400 leading-relaxed mb-6">
              Advanced AI-powered ECG analysis platform
              delivering accurate insights for early
              cardiovascular risk detection.
            </p>

            {/* Social Icons */}
            <div className="flex gap-4">
              {[Facebook, Twitter, Linkedin, Instagram].map(
                (Icon, index) => (
                  <motion.a
                    key={index}
                    href="#"
                    className="w-10 h-10 bg-gray-800 hover:bg-[#1976D2] rounded-xl flex items-center justify-center transition-colors shadow-md"
                    whileHover={{ scale: 1.1, y: -3 }}
                    whileTap={{ scale: 0.92 }}
                  >
                    <Icon className="w-5 h-5" />
                  </motion.a>
                ),
              )}
            </div>
          </motion.div>

          {/* Quick Links */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1, duration: 0.5 }}
          >
            <h4 className="text-lg font-medium mb-4">
              Quick Links
            </h4>
            <ul className="space-y-3">
              {["Features", "How it Works"].map(
                (link, index) => (
                  <li key={index}>
                    <motion.a
                      href={`#${link.toLowerCase().replace(/ /g, "-")}`}
                      className="text-gray-400 hover:text-[#1976D2] flex items-center gap-2 transition-colors group"
                      whileHover={{ x: 5 }}
                    >
                      <span className="w-1.5 h-1.5 bg-[#1976D2] rounded-full opacity-0 group-hover:opacity-100 transition-all" />
                      {link}
                    </motion.a>
                  </li>
                ),
              )}
              <li>
                <motion.button
                  onClick={onNavigateToSignIn}
                  className="text-gray-400 hover:text-[#1976D2] flex items-center gap-2 transition-colors group"
                  whileHover={{ x: 5 }}
                >
                  <span className="w-1.5 h-1.5 bg-[#1976D2] rounded-full opacity-0 group-hover:opacity-100 transition-all" />
                  Sign In
                </motion.button>
              </li>
            </ul>
          </motion.div>

          {/* Contact */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.3, duration: 0.5 }}
          >
            <h4 className="text-lg font-medium mb-4">
              Contact
            </h4>
            <ul className="space-y-4">
              <li className="flex items-start gap-3 text-gray-400">
                <MapPin className="w-5 h-5 text-[#1976D2] mt-1 flex-shrink-0" />
                <span>
                  COMSATS University
                  <br />
                  Abbottabad Campus
                </span>
              </li>

              <li className="flex items-center gap-3 text-gray-400 hover:text-[#1976D2] cursor-pointer transition-colors">
                <Mail className="w-5 h-5 text-[#1976D2]" />
                <span>ferdousgulzar543@gmail.com</span>
              </li>
              <li className="flex items-center gap-3 text-gray-400 hover:text-[#1976D2] cursor-pointer transition-colors">
                <Mail className="w-5 h-5 text-[#1976D2]" />
                <span>asimalyas4440@gmail.com</span>
              </li>

              <li className="flex items-center gap-3 text-gray-400 hover:text-[#1976D2] cursor-pointer transition-colors">
                <Phone className="w-5 h-5 text-[#1976D2]" />
                <span>+92 (320) 15-87154</span>
              </li>
            </ul>
          </motion.div>
        </div>

        {/* Divider */}
        <div className="border-t border-gray-800 mb-6" />

        {/* Bottom */}
        <motion.div
          className="flex flex-col md:flex-row justify-between items-center gap-4"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.4, duration: 0.5 }}
        >
          <p className="text-gray-500 text-sm text-center md:text-left">
            © {currentYear} CardioDetect AI — Crafted with
            precision by{" "}
            <span className="text-[#1976D2] font-medium">
              Ferdous Gulzar && Muhammad Asim Ilyas
            </span>
            
            .
          </p>
        </motion.div>
      </div>
    </footer>
  );
}