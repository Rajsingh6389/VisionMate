import { useState, useCallback } from 'react';
import { FeatureShell } from '../components/FeatureShell';
import { ModelCategory } from '@runanywhere/web';
import Tesseract from 'tesseract.js';
import { Calculator, Equal, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export function MathFeature() {
  const [equation, setEquation] = useState<string | null>(null);
  const [solution, setSolution] = useState<number | string | null>(null);

  const solveMath = (expr: string) => {
    try {
      // Basic cleanup and lowercase
      const normalized = expr.toLowerCase().replace(/\s/g, '');
      
      // If it's a simple expression without an '=', just evaluate it
      if (!normalized.includes('=')) {
        const cleanExpr = normalized.replace(/[^-0-9+*/().]/g, '');
        if (!cleanExpr) return "No expression found";
        const result = new Function(`return ${cleanExpr}`)();
        return typeof result === 'number' ? result.toString() : "Invalid result";
      }

      // Handle simple quadratic: ax^2 + bx + c = 0
      // Match variants like x^2+3x+2=0 or 2x^2-4=0
      const quadMatch = normalized.match(/(-?\d*)x\^?2([+-]\d*)x?([+-]\d*)=0/);
      if (quadMatch) {
        let a = parseFloat(quadMatch[1] === "" || quadMatch[1] === "+" ? "1" : (quadMatch[1] === "-" ? "-1" : quadMatch[1]));
        let b = parseFloat(quadMatch[2] === "" || quadMatch[2] === "+" ? "1" : (quadMatch[2] === "-" ? "-1" : quadMatch[2]));
        let c = parseFloat(quadMatch[3] || "0");
        
        const disc = b*b - 4*a*c;
        if (disc < 0) return "No real roots";
        const x1 = (-b + Math.sqrt(disc)) / (2*a);
        const x2 = (-b - Math.sqrt(disc)) / (2*a);
        return x1 === x2 ? `x = ${x1}` : `x = ${x1}, x = ${x2}`;
      }

      // Handle simple linear: ax + b = c
      const linMatch = normalized.match(/(-?\d*)x([+-]\d+)=([+-]?\d+)/);
      if (linMatch) {
        let a = parseFloat(linMatch[1] === "" || linMatch[1] === "+" ? "1" : (linMatch[1] === "-" ? "-1" : linMatch[1]));
        let b = parseFloat(linMatch[2]);
        let c = parseFloat(linMatch[3]);
        const x = (c - b) / a;
        return `x = ${x}`;
      }

      return "Unsupported type";
    } catch (err) {
      return "Evaluation error";
    }
  };

  const analyze = useCallback(async (capture: any, setProcessing: (v: boolean) => void, setError: (v: string | null) => void) => {
    if (!capture?.isCapturing) return;

    try {
      setProcessing(true);
      setError(null);
      setEquation(null);
      setSolution(null);

      const frame = capture.captureFrame(1280); // Even higher res for math OCR
      if (!frame) throw new Error("Capture failed");

      // Use the canvas from the frame if available (preserves aspect ratio)
      const canvas = frame.canvas || (() => {
        const c = document.createElement('canvas');
        c.width = frame.width;
        c.height = frame.height;
        const ctx = c.getContext('2d');
        if (!ctx) return c;
        const imgData = ctx.createImageData(frame.width, frame.height);
        for (let i = 0; i < frame.rgbPixels.length / 3; i++) {
          imgData.data[i * 4] = frame.rgbPixels[i * 3];
          imgData.data[i * 4 + 1] = frame.rgbPixels[i * 3 + 1];
          imgData.data[i * 4 + 2] = frame.rgbPixels[i * 3 + 2];
          imgData.data[i * 4 + 3] = 255;
        }
        ctx.putImageData(imgData, 0, 0);
        return c;
      })();

      // Basic Image Pre-processing for better OCR: Grayscale + Contrast
      const processingCanvas = document.createElement('canvas');
      processingCanvas.width = canvas.width;
      processingCanvas.height = canvas.height;
      const pCtx = processingCanvas.getContext('2d');
      if (pCtx) {
        pCtx.filter = 'contrast(1.5) grayscale(1) brightness(1.1)';
        pCtx.drawImage(canvas, 0, 0);
      }

      const { data: { text } } = await Tesseract.recognize(processingCanvas, 'eng');
      console.log("OCR RAW:", text);
      
      // Smart extraction: keep anything that looks like math
      let filtered = text
        .replace(/o/g, '0') 
        .replace(/z/g, '2')
        .replace(/s/g, '5')
        .replace(/X/g, 'x')
        .replace(/[^0-9x^=+\-*\/().\n ]/g, '') // Keep space
        .trim();

      // Find the first line that contains both a number/variable and an operator or equals
      const lines = filtered.split('\n').map(l => l.trim().replace(/\s/g, ''));
      const mathLine = lines.find(l => l.length > 2 && /[0-9x]/.test(l));

      if (!mathLine) {
        setEquation("No math detected");
        setSolution(null);
        return;
      }
      
      let final = mathLine;
      if (final.includes('x2') && !final.includes('x^2')) {
        final = final.replace('x2', 'x^2');
      }

      setEquation(final);
      setSolution(solveMath(final));

    } catch (err) {
      setError(err instanceof Error ? err.message : "Math processing failed");
    } finally {
      setProcessing(false);
    }
  }, []);

  return (
    <FeatureShell title="Equation Solver">
      {({ capture, isProcessing, setProcessing, setError }) => (
        <div className="flex flex-col gap-4 mt-auto font-mono">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => analyze(capture, setProcessing, setError)}
            disabled={isProcessing}
            className="w-full bg-[#00f2fe]/10 border border-[#00f2fe]/30 hover:bg-[#00f2fe]/20 text-[#00f2fe] font-bold py-4 rounded-xl flex items-center justify-center gap-2 transition-colors shadow-[0_0_15px_rgba(0,242,254,0.1)] hover:shadow-[0_0_25px_rgba(0,242,254,0.3)] disabled:opacity-50"
          >
            <Calculator className="w-5 h-5" />
            Scan & Solve
          </motion.button>

          <AnimatePresence>
            {equation && (
              <motion.div
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                className="glass-card p-6 border-[#00f2fe]/30 bg-[#00f2fe]/5 relative overflow-hidden"
              >
                <div className="flex flex-col items-center gap-2">
                  <span className="text-xs font-bold uppercase tracking-widest text-[#00f2fe] mb-2 font-mono">Detected Equation</span>
                  <p className="text-xl font-mono text-white mb-4">{equation}</p>
                  
                  <div className="flex items-center gap-4 w-full">
                    <div className="flex-1 h-px bg-[#00f2fe]/20" />
                    <Equal className="w-8 h-8 text-[#00f2fe]" />
                    <div className="flex-1 h-px bg-[#00f2fe]/20" />
                  </div>

                  <div className="mt-4 text-center">
                    <span className="text-xs font-bold uppercase tracking-[0.2em] text-white block mb-1">Solution</span>
                    <motion.div 
                      initial={{ scale: 0.5, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ type: "spring", stiffness: 200, damping: 12, delay: 0.3 }}
                      className="text-4xl font-bold text-[#00f2fe] drop-shadow-[0_0_10px_rgba(0,242,254,0.5)]"
                    >
                      {solution}
                    </motion.div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </FeatureShell>
  );
}
