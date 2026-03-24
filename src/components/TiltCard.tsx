import { useRef } from 'react';
import { motion, useMotionValue, useTransform, useSpring } from 'framer-motion';
import { cn } from '../utils/cn';

interface TiltCardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}

export function TiltCard({ children, className, onClick }: TiltCardProps) {
  return (
    <motion.div
      onClick={onClick}
      className={cn(
        "relative rounded-2xl transition-all duration-300 ease-out cursor-pointer group",
        "shadow-2xl hover:shadow-[0_0_40px_rgba(0,242,254,0.3)] hover:scale-[1.02]",
        className
      )}
    >
      <div className="relative z-10 w-full h-full">{children}</div>
      
      {/* Spotlight border glow - CSS Only */}
      <div className="pointer-events-none absolute -inset-px rounded-2xl opacity-0 transition-opacity duration-300 group-hover:opacity-100 z-0 bg-gradient-to-br from-[#00f2fe]/20 to-transparent blur-md" />

      {/* Internal Content Container - Flat design */}
      <div 
        className="absolute inset-px z-0 rounded-2xl border border-white/10 glass-card bg-surface backdrop-blur-xl"
      />
    </motion.div>
  );
}
