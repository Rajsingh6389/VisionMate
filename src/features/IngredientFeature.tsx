import { useState, useCallback } from 'react';
import { FeatureShell } from '../components/FeatureShell';
import { ModelCategory, ModelManager } from '@runanywhere/web';
import { VLMWorkerBridge } from '@runanywhere/web-llamacpp';
import { RECIPE_DATA } from '../data';
import { Search, ChefHat, Info, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const CAPTURE_DIM = 512;
const PROMPT = "List the main food ingredients visible in this image as a comma-separated list of single words.";

export function IngredientFeature() {
  const [ingredients, setIngredients] = useState<string[]>([]);
  const [recipes, setRecipes] = useState<string[]>([]);

  const analyze = useCallback(async (capture: any, setProcessing: (v: boolean) => void, setError: (v: string | null) => void) => {
    if (!capture?.isCapturing) return;

    try {
      setProcessing(true);
      setError(null);
      setIngredients([]);
      setRecipes([]);

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
        { maxTokens: 40, temperature: 0.2 }
      );

      const rawIngredients = res.text.toLowerCase().split(',').map(s => s.trim()).filter(s => s.length > 0);

      // Filter and match ingredients with dataset
      const detected = rawIngredients.filter(ing => ing.length > 2);
      setIngredients(detected);

      const foundRecipes = new Set<string>();
      detected.forEach(ing => {
        const name = ing.toLowerCase();
        for (const key in RECIPE_DATA) {
          if (name.includes(key) || key.includes(name)) {
            RECIPE_DATA[key].recipes.forEach(r => foundRecipes.add(r));
          }
        }
      });
      setRecipes(Array.from(foundRecipes));

    } catch (err) {
      setError(err instanceof Error ? err.message : "Analysis failed");
    } finally {
      setProcessing(false);
    }
  }, []);

  return (
    <FeatureShell category={ModelCategory.Multimodal} title="Ingredient Intelligence">
      {({ capture, isProcessing, setProcessing, setError, loader }) => (
        <div className="flex flex-col gap-6 mt-auto">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => analyze(capture, setProcessing, setError)}
            disabled={isProcessing || loader.state !== 'ready'}
            className="w-full bg-[#7000ff]/10 border border-[#7000ff]/30 hover:bg-[#7000ff]/20 text-[#7000ff] font-bold py-4 rounded-xl flex items-center justify-center gap-2 transition-colors shadow-[0_0_15px_rgba(112,0,255,0.1)] hover:shadow-[0_0_25px_rgba(112,0,255,0.3)] disabled:opacity-50 font-mono"
          >
            <Search className="h-5 w-5" />
            <span>Identify Ingredients</span>
            <Zap className="h-4 w-4 text-[#7000ff]/70" />
          </motion.button>

          <AnimatePresence>
            {ingredients.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="grid gap-6"
              >
                {/* Detected Ingredients */}
                <div className="glass-card relative overflow-hidden p-5 border-[#7000ff]/20 bg-[#7000ff]/5">
                  <div className="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-[#7000ff]/10 blur-2xl" />
                  <h4 className="mb-4 flex items-center gap-2 text-[10px] font-mono font-black uppercase tracking-[0.2em] text-[#7000ff]">
                    <Info className="h-4 w-4" /> Vision Analysis
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {ingredients.map((ing, i) => (
                      <motion.span
                        key={i}
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: i * 0.05 }}
                        className="rounded-full border border-[#7000ff]/30 bg-[#7000ff]/10 px-4 py-1.5 text-sm font-mono font-bold text-white shadow-sm backdrop-blur-md"
                      >
                        {ing}
                      </motion.span>
                    ))}
                  </div>
                </div>

                {/* Recipe Suggestions */}
                {recipes.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.2 }}
                    className="glass-card relative overflow-hidden p-5 border-[#00f2fe]/20 bg-[#00f2fe]/5"
                  >
                     <div className="absolute -left-4 -bottom-4 h-24 w-24 rounded-full bg-[#00f2fe]/10 blur-2xl" />
                    <h4 className="mb-4 flex items-center gap-2 text-[10px] font-mono font-black uppercase tracking-[0.2em] text-[#00f2fe]">
                      <ChefHat className="h-4 w-4" /> Neural Recipe Match
                    </h4>
                    <div className="space-y-3 font-mono">
                      {recipes.map((recipe, i) => (
                        <motion.div
                          key={i}
                          whileHover={{ x: 4 }}
                          className="flex items-center gap-3 rounded-xl bg-[#030014]/40 p-3 border border-white/5 transition-colors hover:bg-white/5 hover:border-[#00f2fe]/30"
                        >
                          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#00f2fe]/10 border border-[#00f2fe]/20 text-[#00f2fe]">
                            <Zap className="h-4 w-4" />
                          </div>
                          <span className="text-sm font-bold text-white">{recipe}</span>
                        </motion.div>
                      ))}
                    </div>
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
