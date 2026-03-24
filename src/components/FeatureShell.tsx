import { useState, useRef, useEffect, useCallback, ReactNode } from 'react';
import { ModelCategory, VideoCapture } from '@runanywhere/web';
import { useModelLoader } from '../hooks/useModelLoader';
import { Loader2, Camera, Upload, AlertCircle, CheckCircle2, RefreshCcw } from 'lucide-react';
import { motion } from 'framer-motion';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface FeatureShellProps {
  children: (props: { 
    capture: { captureFrame: (dim: number) => any; isCapturing: boolean } | null; 
    isProcessing: boolean; 
    setProcessing: (v: boolean) => void;
    error: string | null;
    setError: (v: string | null) => void;
    loader: any;
  }) => ReactNode;
  category?: ModelCategory;
  title: string;
}

export function FeatureShell({ children, category, title }: FeatureShellProps) {
  const loader = useModelLoader(category as any, true);
  const [cameraActive, setCameraActive] = useState(false);
  const [uploadedImage, setUploadedImage] = useState<HTMLImageElement | null>(null);
  const [isProcessing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const videoMountRef = useRef<HTMLDivElement>(null);
  const captureRef = useRef<VideoCapture | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const startCamera = useCallback(async () => {
    try {
      setError(null);
      setUploadedImage(null);
      const cam = new VideoCapture({ facingMode: 'environment' });
      await cam.start();
      captureRef.current = cam;

      if (videoMountRef.current) {
        const el = cam.videoElement;
        el.className = "w-full h-full object-cover rounded-2xl shadow-2xl";
        videoMountRef.current.appendChild(el);
      }
      setCameraActive(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start camera");
    }
  }, []);

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        setUploadedImage(img);
        setCameraActive(false);
        if (captureRef.current) {
          captureRef.current.stop();
          captureRef.current = null;
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  // Unified capture interface for both Camera and Upload
  const unifiedCapture = {
    isCapturing: cameraActive || !!uploadedImage,
    captureFrame: (maxDim: number) => {
      if (cameraActive && captureRef.current) {
        // VideoCapture natively handles aspect ratio
        return captureRef.current.captureFrame(maxDim);
      }
      if (uploadedImage) {
        const ratio = uploadedImage.width / uploadedImage.height;
        let w = maxDim;
        let h = maxDim / ratio;
        
        if (h > maxDim) {
          h = maxDim;
          w = maxDim * ratio;
        }

        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (!ctx) return null;
        ctx.drawImage(uploadedImage, 0, 0, w, h);
        
        const imgData = ctx.getImageData(0, 0, w, h);
        const rgbPixels = new Uint8Array(imgData.data.length / 4 * 3);
        for (let i = 0, j = 0; i < imgData.data.length; i += 4, j += 3) {
          rgbPixels[j] = imgData.data[i];
          rgbPixels[j+1] = imgData.data[i+1];
          rgbPixels[j+2] = imgData.data[i+2];
        }
        return { rgbPixels, width: w, height: h, canvas };
      }
      return null;
    }
  };

  useEffect(() => {
    // Auto-activate the neural model on mount if a category is provided
    if (category) {
      loader.ensure();
    }

    return () => {
      if (captureRef.current) {
        captureRef.current.stop();
        captureRef.current = null;
      }
    };
  }, [category]); // Re-run if category changes (though usually shell is per-feature)

  return (
    <div className="flex flex-col gap-6 h-full">
      {/* Model Loader Banner */}
      {category && (
        <motion.div 
          layout
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className={cn(
            "glass-card p-4 flex items-center justify-between border-l-4 transition-all overflow-hidden",
            loader.state === 'ready' ? "border-l-emerald-500 bg-emerald-500/5" : 
            loader.state === 'error' ? "border-l-red-500 bg-red-500/5" : "border-l-primary bg-primary/5"
          )}
        >
          {/* ... existing Model Loader UI ... */}
          <div className="flex items-center gap-3">
            {loader.state === 'ready' ? <CheckCircle2 className="w-5 h-5 text-emerald-500" /> :
             loader.state === 'error' ? <AlertCircle className="w-5 h-5 text-red-500" /> :
             <Loader2 className="w-5 h-5 text-primary animate-spin" />}
            <div>
              <p className="text-sm font-bold uppercase tracking-wider text-slate-400">{title} Neural Model</p>
              <p className="text-xs text-slate-500">
                {loader.state === 'ready' ? "Hyper-optimized & Ready" : 
                 loader.state === 'downloading' ? `Downloading weights... ${Math.round(loader.progress * 100)}%` :
                 loader.state === 'loading' ? "Igniting..." : "Awaiting activation"}
              </p>
            </div>
          </div>
          {loader.state === 'error' && (
            <button 
              onClick={() => loader.ensure()}
              className="px-4 py-1.5 bg-red-500/20 hover:bg-red-500/30 text-red-400 text-xs font-bold rounded-full transition-all flex items-center gap-2"
            >
              <RefreshCcw className="w-3 h-3" />
              Retry
            </button>
          )}
        </motion.div>
      )}

      {/* Camera / Interaction Area */}
      <div className="relative aspect-video glass-card overflow-hidden bg-background group">
        {!cameraActive && !uploadedImage ? (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="absolute inset-0 flex flex-col items-center justify-center gap-4 p-8"
          >
            <div className="flex gap-6">
              <motion.button 
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={startCamera}
                className="flex flex-col items-center gap-3 p-6 rounded-3xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-primary/50 transition-colors shadow-xl"
              >
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center border border-primary/20">
                  <Camera className="w-6 h-6 text-primary" />
                </div>
                <span className="text-sm font-bold tracking-wide font-mono text-primary">Enable Camera</span>
              </motion.button>
              
              <motion.button 
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => fileInputRef.current?.click()}
                className="flex flex-col items-center gap-3 p-6 rounded-3xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-secondary/50 transition-colors shadow-xl"
              >
                <div className="w-12 h-12 rounded-full bg-secondary/10 flex items-center justify-center border border-secondary/20">
                  <Upload className="w-6 h-6 text-secondary" />
                </div>
                <span className="text-sm font-bold tracking-wide font-mono text-secondary">Upload Image</span>
              </motion.button>
            </div>
            
            <p className="text-slate-400 text-xs text-center mt-4 tracking-wider uppercase font-medium font-mono">VisionMate processes all data locally.<br/>No images are sent to any server.</p>
            <input 
              type="file" 
              ref={fileInputRef} 
              className="hidden" 
              accept="image/*" 
              onChange={handleUpload} 
            />
          </motion.div>
        ) : (
          <div className="w-full h-full relative">
            {cameraActive ? (
              <div ref={videoMountRef} className="w-full h-full" />
            ) : (
              <img 
                src={uploadedImage?.src} 
                className="w-full h-full object-contain bg-black" 
                alt="Uploaded source" 
              />
            )}
            
            {/* Scanning Laser Effect */}
            {cameraActive && !isProcessing && (
              <motion.div 
                className="absolute inset-x-0 h-[2px] bg-[#00f2fe] shadow-[0_0_20px_#00f2fe] z-10 pointer-events-none"
                initial={{ top: "0%" }}
                animate={{ top: ["0%", "98%", "0%"] }}
                transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
              />
            )}

            {/* Scanning Grid Overlay */}
            {cameraActive && (
              <div 
                className="absolute inset-0 z-0 pointer-events-none opacity-20"
                style={{
                  backgroundImage: "linear-gradient(rgba(139, 92, 246, 0.4) 1px, transparent 1px), linear-gradient(90deg, rgba(139, 92, 246, 0.4) 1px, transparent 1px)",
                  backgroundSize: "40px 40px"
                }}
              />
            )}

            {/* Reset Button */}
            <motion.button 
               whileHover={{ scale: 1.1, rotate: -90 }}
               whileTap={{ scale: 0.9 }}
               onClick={() => {
                 setCameraActive(false);
                 setUploadedImage(null);
                 captureRef.current?.stop();
                 captureRef.current = null;
               }}
               className="absolute top-4 right-4 p-2 bg-black/50 hover:bg-black/80 rounded-full transition-all z-20 backdrop-blur-md border border-white/10"
               title="Reset Source"
            >
              <RefreshCcw className="w-4 h-4 text-white" />
            </motion.button>
          </div>
        )}
        
        {isProcessing && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center z-20"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 10 }}
              animate={{ scale: 1, y: 0 }}
              className="bg-slate-900/90 px-8 py-4 rounded-2xl flex flex-col items-center gap-4 shadow-[0_0_50px_rgba(139,92,246,0.2)] border border-primary/20 animated-border"
            >
              <Loader2 className="w-8 h-8 text-primary animate-spin" />
              <div className="flex flex-col items-center">
                <span className="text-sm font-bold tracking-widest uppercase text-white">Analyzing Core</span>
                <span className="text-[10px] text-primary mt-1">Applying Neural Weights...</span>
              </div>
            </motion.div>
          </motion.div>
        )}

        {error && (
          <div className="absolute bottom-4 left-4 right-4 bg-red-500/90 text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm shadow-xl z-30">
            <AlertCircle className="w-4 h-4" />
            {error}
          </div>
        )}
      </div>

      {/* Feature Specific Controls */}
      <div className="flex-1 flex flex-col">
        {children({ 
          capture: unifiedCapture, 
          isProcessing, 
          setProcessing,
          error,
          setError,
          loader
        })}
      </div>
    </div>
  );
}
