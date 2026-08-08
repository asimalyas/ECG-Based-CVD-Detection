import React from "react";
import { LandingHeader } from "../components/landing/LandingHeader";
import { HeroSection } from "../components/landing/HeroSection";
import { FeaturesSection } from "../components/landing/FeaturesSection";
import { HowItWorksSection } from "../components/landing/HowItWorksSection";
import { MetricsSection } from "../components/landing/MetricsSection";
import { TestimonialsSection } from "../components/landing/TestimonialsSection";
import { LandingFooter } from "../components/landing/LandingFooter";

interface LandingPageProps {
  onNavigateToSignIn: () => void;
}

export function LandingPage({
  onNavigateToSignIn,
}: LandingPageProps) {
  return (
    <div className="min-h-screen bg-white dark:bg-gray-900 transition-colors duration-300">
      <LandingHeader onNavigateToSignIn={onNavigateToSignIn} />
      <main>
        <HeroSection onNavigateToSignIn={onNavigateToSignIn} />
        <FeaturesSection />
        <HowItWorksSection />
      </main>
      <LandingFooter onNavigateToSignIn={onNavigateToSignIn} />
    </div>
  );
}