import { useState, useEffect } from 'react';
import { initSDK, getAccelerationMode } from './runanywhere';
import { 
  Eye, 
  Leaf, 
  Utensils, 
  FileText, 
  Calculator, 
  ArrowLeft,
  Settings,
  ShieldCheck,
  Zap
} from 'lucide-react';
import { motion, AnimatePresence, type Variants } from 'framer-motion';
import { cn } from './utils/cn';

type FeatureId = 'accessibility' | 'food' | 'nature' | 'scanner' | 'math';

interface FeatureDef {
  id: FeatureId;
  title: string;
  description: string;
  icon: any;
  color: string;
}

const FEATURES: FeatureDef[] = [
  {
    id: 'accessibility',
    title: 'Accessibility Mode',
    description: 'Real-time scene description and voice output for the visually impaired.',
    icon: Eye,
    color: 'from-primary to-blue-500' // Unifying to theme colors
  },
  {
    id: 'food',
    title: 'Ingredient Tracker',
    description: 'Identify food items and discover smart recipe suggestions.',
    icon: Utensils,
    color: 'from-primary to-cyan-400'
  },
  {
    id: 'nature',
    title: 'Nature Guide',
    description: 'Identify plants and animals with expert care instructions.',
    icon: Leaf,
    color: 'from-secondary to-purple-400'
  },
  {
    id: 'scanner',
    title: 'Doc Scanner',
    description: 'Extract text from documents and signs using local OCR.',
    icon: FileText,
    color: 'from-accent to-indigo-400'
  },
  {
    id: 'math',
    title: 'Math Solver',
    description: 'Solve mathematical equations instantly via camera.',
    icon: Calculator,
    color: 'from-primary to-secondary'
  }
];

import { AccessibilityFeature } from './features/AccessibilityFeature';
import { IngredientFeature } from './features/IngredientFeature';
import { NatureFeature } from './features/NatureFeature';
import { ScannerFeature } from './features/ScannerFeature';
import { MathFeature } from './features/MathFeature';
import { TiltCard } from './components/TiltCard';
import { TextReveal } from './components/TextReveal';

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 30 },
  show: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 300, damping: 24 } }
};

export function App() {
  const [sdkReady, setSdkReady] = useState(false);
  const [sdkError, setSdkError] = useState<string | null>(null);
  const [activeFeature, setActiveFeature] = useState<FeatureId | null>(null);

  useEffect(() => {
    initSDK()
      .then(() => setSdkReady(true))
      .catch((err) => setSdkError(err instanceof Error ? err.message : String(err)));
  }, []);

  if (sdkError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-900 text-white p-6">
        <div className="glass-card p-8 border-red-500/50 max-w-md text-center">
          <h2 className="text-2xl font-bold mb-4 text-red-400">Initialization Failed</h2>
          <p className="text-slate-300 mb-6">{sdkError}</p>
          <button 
            onClick={() => window.location.reload()}
            className="px-6 py-2 bg-red-500 hover:bg-red-600 rounded-lg transition-colors"
          >
            Retry Launch
          </button>
        </div>
      </div>
    );
  }

  if (!sdkReady) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-900 text-white">
        <motion.div 
          animate={{ scale: [1, 1.1, 1], rotate: [0, 5, -5, 0] }}
          transition={{ repeat: Infinity, duration: 2 }}
          className="w-20 h-20 mb-6 relative"
        >
          <div className="absolute inset-0 bg-primary/30 blur-xl rounded-full" />
          <Zap className="w-full h-full text-primary relative z-10" />
        </motion.div>
        <h2 className="text-2xl font-bold mb-2 gradient-text">VisionMate</h2>
        <p className="text-slate-400 animate-pulse">Initializing Neural Engine...</p>
      </div>
    );
  }

  const accel = getAccelerationMode();

  return (
    <div className="min-h-screen flex flex-col bg-background relative overflow-hidden font-sans text-white font-mono">
      <div className="bg-noise absolute inset-0 opacity-40 mix-blend-overlay pointer-events-none z-[60]" />
      <div className="bg-grid absolute inset-0 opacity-20 pointer-events-none z-10" />
      
      {/* Pure CSS Neon Background (No WebGL = Zero Lag) */}
      <div className="absolute inset-0 z-0 bg-background overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/20 rounded-full blur-[120px] mix-blend-screen animate-pulse" style={{ animationDuration: '4s' }} />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-secondary/20 rounded-full blur-[120px] mix-blend-screen animate-pulse" style={{ animationDuration: '7s' }} />
      </div>
      
      <div className="absolute inset-0 z-0 bg-[#030014]/60 backdrop-blur-[2px] pointer-events-none" />

      {/* Header */}
      <motion.header 
        layout
        className="relative z-50 glass-card rounded-none border-t-0 border-x-0 bg-[#030014]/40 backdrop-blur-xl px-6 py-4 flex items-center justify-between shadow-2xl"
      >
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/20 rounded-lg">
            <Zap className="w-5 h-5 text-primary" />
          </div>
          <h1 className="text-xl font-bold tracking-tight">VisionMate</h1>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="hidden sm:flex items-center gap-2 px-3 py-1 bg-slate-800 rounded-full border border-white/5 text-xs font-medium text-slate-400">
            <ShieldCheck className="w-3 h-3 text-emerald-400" />
            Private & Offline
          </div>
          {accel && (
            <span className={cn(
              "px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider",
              accel === 'webgpu' ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" : "bg-slate-700 text-slate-300"
            )}>
              {accel}
            </span>
          )}
          <button className="p-2 text-slate-400 hover:text-white transition-colors">
            <Settings className="w-5 h-5" />
          </button>
        </div>
      </motion.header>

      <main className="flex-1 overflow-y-auto p-6 md:p-10 relative z-10">
        <AnimatePresence mode="wait">
          {!activeFeature ? (
            <motion.div 
              key="dashboard"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.05 }}
              className="max-w-6xl mx-auto"
            >
              <div className="mb-10 text-center md:text-left">
                <TextReveal text="Welcome to the Future" wordMode className="text-4xl font-bold mb-2 tracking-tight block" />
                <motion.p 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                  className="text-slate-400 text-lg"
                >
                  Select a neural module to begin your private AI vision experience.
                </motion.p>
              </div>

              <motion.div 
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
                variants={containerVariants}
                initial="hidden"
                animate="show"
              >
                {FEATURES.map((f) => (
                  <motion.div key={f.id} variants={itemVariants} className="h-full">
                    <TiltCard
                      className="h-full"
                      onClick={() => setActiveFeature(f.id)}
                    >
                      <div className="glass-card p-8 h-full text-left group hover:border-primary/50 transition-all bg-surface backdrop-blur-xl relative overflow-hidden flex flex-col border-white/10">
                        <div className={cn("absolute top-0 right-0 w-40 h-40 bg-gradient-to-br opacity-10 blur-3xl transition-opacity duration-500 group-hover:opacity-30", f.color)} />
                        
                        <div 
                          className={cn("inline-flex p-4 rounded-2xl bg-gradient-to-br mb-6 shadow-2xl transform transition-transform duration-300 group-hover:scale-110 group-hover:-translate-y-2", f.color)}
                        >
                          <f.icon className="w-8 h-8 text-white drop-shadow-md" />
                        </div>
                        
                        <h3 
                          className="text-2xl font-bold mb-3 group-hover:text-primary transition-colors text-white font-heading"
                        >
                          {f.title}
                        </h3>
                        
                        <p 
                          className="text-slate-400 text-sm leading-relaxed mb-8 flex-1"
                        >
                          {f.description}
                        </p>
                        
                        <div className="flex items-center gap-2 text-xs font-bold text-primary opacity-70 group-hover:opacity-100 group-hover:translate-x-2 transition-all">
                          EXPLORE MODULE →
                        </div>
                      </div>
                    </TiltCard>
                  </motion.div>
                ))}
              </motion.div>
            </motion.div>
          ) : (
            <motion.div 
              key="feature"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="max-w-4xl mx-auto h-full flex flex-col"
            >
              <div className="flex items-center gap-4 mb-8">
                <button 
                  onClick={() => setActiveFeature(null)}
                  className="p-3 glass-card hover:bg-slate-800 transition-all hover:scale-110 active:scale-95"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <div>
                  <h2 className="text-3xl font-bold tracking-tight text-white font-heading">
                    {FEATURES.find(f => f.id === activeFeature)?.title}
                  </h2>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                    <p className="text-xs text-primary font-bold uppercase tracking-wider font-mono">Neural Core Active</p>
                  </div>
                </div>
              </div>

              {/* Feature Content Holder */}
              <div className="flex-1">
                {activeFeature === 'accessibility' && <AccessibilityFeature />}
                {activeFeature === 'food' && <IngredientFeature />}
                {activeFeature === 'nature' && <NatureFeature />}
                {activeFeature === 'scanner' && <ScannerFeature />}
                {activeFeature === 'math' && <MathFeature />}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <footer className="px-6 py-6 border-t border-white/5 text-center text-slate-500 text-[10px] tracking-widest uppercase font-bold">
        Built with Google Antigravity & RunAnywhere SDK • 100% Client-Side
      </footer>
    </div>
  );
}
