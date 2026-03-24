import { useState, useCallback } from 'react';
import { FeatureShell } from '../components/FeatureShell';
import { ModelCategory } from '@runanywhere/web';
import Tesseract from 'tesseract.js';
import { FileText, Copy, Check, Download } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export function ScannerFeature() {
  const [text, setText] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const analyze = useCallback(async (capture: any, setProcessing: (v: boolean) => void, setError: (v: string | null) => void) => {
    if (!capture?.isCapturing) return;

    try {
      setProcessing(true);
      setError(null);
      setText(null);

      const frame = capture.captureFrame(1024); // High res for OCR
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

      const { data: { text: ocrText } } = await Tesseract.recognize(canvas, 'eng');
      setText(ocrText.trim());

    } catch (err) {
      setError(err instanceof Error ? err.message : "OCR failed");
    } finally {
      setProcessing(false);
    }
  }, []);

  const copyToClipboard = () => {
    if (text) {
      navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <FeatureShell title="Document OCR">
      {({ capture, isProcessing, setProcessing, setError }) => (
        <div className="flex flex-col gap-4 mt-auto">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => analyze(capture, setProcessing, setError)}
            disabled={isProcessing}
            className="w-full bg-[#7000ff]/10 border border-[#7000ff]/30 hover:bg-[#7000ff]/20 text-[#7000ff] font-bold py-4 rounded-xl flex items-center justify-center gap-2 transition-all shadow-[0_0_15px_rgba(112,0,255,0.1)] hover:shadow-[0_0_25px_rgba(112,0,255,0.3)] disabled:opacity-50 font-mono"
          >
            <FileText className="w-5 h-5" />
            Scan Document
          </motion.button>

          <AnimatePresence>
            {text && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass-card p-4 border-[#7000ff]/30 flex flex-col font-mono"
              >
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-xs font-bold uppercase tracking-widest text-[#7000ff]">Extracted Text</h4>
                  <button 
                    onClick={copyToClipboard}
                    className="p-1.5 hover:bg-white/5 rounded-md transition-colors"
                    title="Copy to clipboard"
                  >
                    {copied ? <Check className="w-4 h-4 text-[#00f2fe]" /> : <Copy className="w-4 h-4 text-slate-400" />}
                  </button>
                </div>
                <div className="max-h-40 overflow-y-auto bg-[#030014]/50 p-3 rounded-lg border border-white/5">
                  <p className="text-sm text-slate-300 whitespace-pre-wrap font-mono leading-relaxed">
                    {text || "No text detected."}
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </FeatureShell>
  );
}
