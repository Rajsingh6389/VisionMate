import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { cn } from "../utils/cn";

interface TextRevealProps {
  text: string;
  className?: string;
  delay?: number;
  wordMode?: boolean; 
}

export function TextReveal({ text, className, delay = 0, wordMode = false }: TextRevealProps) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-10%" });

  // Use words or characters depending on wordMode
  const items = wordMode ? text.split(" ") : text.split("");

  const container = {
    hidden: { opacity: 0 },
    visible: (i = 1) => ({
      opacity: 1,
      transition: { 
        staggerChildren: wordMode ? 0.08 : 0.03, 
        delayChildren: delay * i 
      },
    }),
  };

  const child = {
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      filter: "blur(0px)",
      transition: {
        type: "spring" as const,
        damping: 12,
        stiffness: 100,
      },
    },
    hidden: {
      opacity: 0,
      y: 20,
      scale: 0.95,
      filter: "blur(4px)",
      transition: {
        type: "spring" as const,
        damping: 12,
        stiffness: 100,
      },
    },
  };

  return (
    <motion.div
      ref={ref}
      className={cn("overflow-hidden flex flex-wrap", className)}
      variants={container}
      initial="hidden"
      animate={isInView ? "visible" : "hidden"}
    >
      {items.map((item, index) => (
        <motion.span
          variants={child}
          style={{ marginRight: wordMode ? "0.25em" : "0" }}
          key={index}
          className="inline-block whitespace-pre"
        >
          {item}
        </motion.span>
      ))}
    </motion.div>
  );
}
