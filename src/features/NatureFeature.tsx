import { useState, useCallback } from 'react';
import { FeatureShell } from '../components/FeatureShell';
import { ModelCategory, ModelManager } from '@runanywhere/web';
import { VLMWorkerBridge } from '@runanywhere/web-llamacpp';
import { NATURE_DATA } from '../data';
import { Leaf, Info, HelpCircle, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const CAPTURE_DIM = 512;
const PROMPT = "Identify the plant or animal in this image. Give me only the common name in 1-3 words.";

export function NatureFeature() {
  const [target, setTarget] = useState<string | null>(null);
  const [careInfo, setCareInfo] = useState<{ care: string; type: 'plant' | 'animal' } | null>(null);

  const analyze = useCallback(async (capture: any, setProcessing: (v: boolean) => void, setError: (v: string | null) => void) => {
    if (!capture?.isCapturing) return;

    try {
      setProcessing(true);
      setError(null);
      setTarget(null);
      setCareInfo(null);

      const frame = capture.captureFrame(CAPTURE_DIM);
      if (!frame) throw new Error("Capture failed");

      const bridge = VLMWorkerBridge.shared;
      if (!bridge.isInitialized) {
        await bridge.init();
      }
      
      const vlmModel = ModelManager.getModels().find((m: any) => m.modality === ModelCategory.Multimodal);
      if (!vlmModel) throw new Error("VLM not found");

      // Use bridge.isModelLoaded as the source of truth for the worker state
      if (!bridge.isModelLoaded) {
        await ModelManager.loadModel(vlmModel.id, { coexist: true });
        
        // Final sanity check - if still not loaded, something is wrong with the bridge/worker sync
        if (!bridge.isModelLoaded) {
          throw new Error("VLM model failed to sync with worker. Please try again.");
        }
      }

      const res = await bridge.process(
        frame.rgbPixels, frame.width, frame.height, PROMPT, 
        { maxTokens: 20, temperature: 0.1 }
      );

      const name = res.text.toLowerCase().replace(/\./g, '').trim();
      setTarget(name);

      // Match with local dataset - improved fragment matching
      const dataset = NATURE_DATA as Record<string, { care: string; type: 'plant' | 'animal' }>;
      let matched = null;
      
      // Try exact match first
      if (dataset[name]) {
        matched = dataset[name];
      } else {
        // Try fragment matching
        for (const key in dataset) {
          if (name.includes(key) || key.includes(name)) {
            matched = dataset[key];
            break;
          }
        }
      }
      setCareInfo(matched);

    } catch (err) {
      setError(err instanceof Error ? err.message : "Analysis failed");
    } finally {
      setProcessing(false);
    }
  }, []);

  return (
    <FeatureShell category={ModelCategory.Multimodal} title="Nature Intelligence">
      {({ capture, isProcessing, setProcessing, setError, loader }) => (
        <div className="flex flex-col gap-6 mt-auto">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => analyze(capture, setProcessing, setError)}
            disabled={isProcessing || loader.state !== 'ready'}
            className="w-full bg-[#4f46e5]/10 border border-[#4f46e5]/30 hover:bg-[#4f46e5]/20 text-[#4f46e5] font-bold py-4 rounded-xl flex items-center justify-center gap-2 transition-colors shadow-[0_0_15px_rgba(79,70,229,0.1)] hover:shadow-[0_0_25px_rgba(79,70,229,0.3)] disabled:opacity-50 font-mono"
          >
            <Leaf className="h-5 w-5" />
            <span>Identify Species</span>
            <Sparkles className="h-4 w-4 text-[#4f46e5]/70" />
          </motion.button>

          <AnimatePresence>
            {target && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="grid gap-6"
              >
                {/* Identification Card */}
                <div className="glass-card relative overflow-hidden p-6 border-[#4f46e5]/20 bg-[#4f46e5]/5 text-center">
                  <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-[#4f46e5]/10 blur-2xl" />
                  <h4 className="mb-2 text-[10px] font-mono font-black uppercase tracking-[0.2em] text-[#4f46e5]">
                    Species Identified
                  </h4>
                  <p className="text-3xl font-heading font-black text-white capitalize tracking-tight drop-shadow-md">
                    {target}
                  </p>
                </div>

                {/* Care Information / Help */}
                {careInfo ? (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="glass-card relative overflow-hidden p-6 border-[#4f46e5]/20 bg-[#4f46e5]/10 font-mono"
                  >
                    <div className="absolute -left-8 -bottom-8 h-32 w-32 rounded-full bg-[#4f46e5]/10 blur-3xl" />
                    <div className="absolute top-4 right-4 opacity-20">
                      <Info className="h-8 w-8 text-[#4f46e5]" />
                    </div>
                    <h4 className="mb-4 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-[#4f46e5]">
                      {careInfo.type === 'plant' ? 'Cultivation Guide' : 'Care Protocol'}
                    </h4>
                    <p className="text-white text-sm leading-relaxed font-bold">
                      {careInfo.care}
                    </p>
                  </motion.div>
                ) : (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="glass-card p-5 bg-[#030014]/80 border-white/5 flex items-center gap-3 font-mono"
                  >
                    <HelpCircle className="h-5 w-5 text-slate-500" />
                    <p className="text-slate-400 text-xs italic">
                      Detailed care protocol unavailable in local neural archives.
                    </p>
                  </motion.div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </FeatureShell>
  );
}
