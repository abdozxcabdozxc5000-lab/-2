import React from 'react';
import { motion } from 'framer-motion';

interface PageTransitionProps {
  children: React.ReactNode;
}

/**
 * PageTransition Component
 * 
 * Provides a smooth, professional entry/exit animation for pages.
 * - Subtle Fade (Opacity 0 -> 1)
 * - Subtle Slide Up (y: 15px -> 0px)
 * - Fast & Smooth (0.3s duration)
 * - Material Design Easing
 */
const PageTransition: React.FC<PageTransitionProps> = ({ children }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }} // Start slightly lower and transparent
      animate={{ opacity: 1, y: 0 }}  // Animate to natural position and full opacity
      exit={{ opacity: 0, y: -15 }}   // Exit slightly upward and fade out
      transition={{
        duration: 0.3, // 300ms is the sweet spot for UI transitions
        ease: [0.4, 0, 0.2, 1], // "Standard" easing (fast out, slow in) for a premium feel
      }}
      className="w-full h-full"
    >
      {children}
    </motion.div>
  );
};

export default PageTransition;