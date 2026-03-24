import { useState, useCallback, useRef } from 'react';
import { FeatureShell } from '../components/FeatureShell';
import { ModelCategory, ModelManager } from '@runanywhere/web';
import { VLMWorkerBridge } from '@runanywhere/web-llamacpp';
import { useTTS } from '../hooks/useTTS';
import { Volume2, VolumeX, PlayCircle, RefreshCcw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { TextReveal } from '../components/TextReveal';

const CAPTURE_DIM = 512;
const PROMPT = "Describe the scene correctly for a visually impaired person. Focus on obstacles and key objects.";

export function AccessibilityFeature() {
  const [result, setResult] = useState<string | null>(null);
  const { speak, stop, isSpeaking } = useTTS();
  const [isLive, setIsLive] = useState(false);
  const liveIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const analyze = useCallback(async (capture: any, setProcessing: (v: boolean) => void, setError: (v: string | null) => void) => {
    if (!capture?.isCapturing) return;

    try {
      setProcessing(true);
      setError(null);

      const frame = capture.captureFrame(CAPTURE_DIM);
      if (!frame) throw new Error("Could not capture frame");

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
        frame.rgbPixels,
        frame.width,
        frame.height,
        PROMPT,
        { maxTokens: 80, temperature: 0.5 }
      );

      setResult(res.text);
      speak(res.text);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Analysis failed");
    } finally {
      setProcessing(false);
    }
  }, [speak]);

  return (
    <FeatureShell category={ModelCategory.Multimodal} title="Vision-Language">
      {({ capture, isProcessing, setProcessing, setError, loader }) => (
        <div className="flex flex-col gap-4 mt-auto">
          <div className="flex gap-3">
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => analyze(capture, setProcessing, setError)}
              disabled={isProcessing || loader.state !== 'ready'}
              className="flex-1 bg-[#00f2fe]/10 border border-[#00f2fe]/30 hover:bg-[#00f2fe]/20 text-[#00f2fe] font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition-colors shadow-[0_0_15px_rgba(0,242,254,0.1)] hover:shadow-[0_0_25px_rgba(0,242,254,0.3)] disabled:opacity-50 font-mono"
            >
              <PlayCircle className="w-5 h-5" />
              Describe Scene
            </motion.button>
            
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => isSpeaking ? stop() : result && speak(result)}
              disabled={!result}
              className="p-3 glass-card hover:bg-[#030014]/80 transition-colors disabled:opacity-30 border-[#00f2fe]/30"
            >
              {isSpeaking ? <VolumeX className="w-6 h-6 text-red-500" /> : <Volume2 className="w-6 h-6 text-[#00f2fe]" />}
            </motion.button>
          </div>

          <AnimatePresence>
            {result && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass-card p-6 border-[#00f2fe]/30 bg-[#00f2fe]/5"
              >
                <div className="flex items-center justify-between mb-3 font-mono">
                  <h4 className="text-xs font-bold uppercase tracking-widest text-[#00f2fe]">Scene Description</h4>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-[#00f2fe] animate-pulse" />
                    <span className="text-[10px] text-[#00f2fe] font-bold uppercase">Ready</span>
                  </div>
                </div>
                <TextReveal 
                  text={`"${result}"`} 
                  wordMode 
                  className="text-slate-200 leading-relaxed italic text-lg" 
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </FeatureShell>
  );
}
