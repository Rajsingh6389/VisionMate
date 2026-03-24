import { useCallback, useState } from 'react';
import { ModelCategory, AudioPlayback, ExtensionPoint } from '@runanywhere/web';
import { useModelLoader } from './useModelLoader';

export function useTTS() {
  const loader = useModelLoader(ModelCategory.SpeechSynthesis, true);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [player, setPlayer] = useState<AudioPlayback | null>(null);

  const speak = useCallback(async (text: string) => {
    if (loader.state !== 'ready') {
      const ok = await loader.ensure();
      if (!ok) return;
    }

    try {
      setIsSpeaking(true);
      // Retrieve the TTS provider registered by @runanywhere/web-onnx
      const tts = ExtensionPoint.requireProvider('tts' as any, '@runanywhere/web-onnx');
      const { audioData, sampleRate } = await tts.synthesize(text, { speed: 1.0 });
      
      const p = new AudioPlayback({ sampleRate });
      setPlayer(p);
      await p.play(audioData, sampleRate);
    } catch (err) {
      console.error("TTS Error:", err);
    } finally {
      setIsSpeaking(false);
      setPlayer(null);
    }
  }, [loader]);

  const stop = useCallback(async () => {
    if (player) {
      player.stop();
      setPlayer(null);
      setIsSpeaking(false);
    }
  }, [player]);

  return { speak, stop, isSpeaking, loader };
}
