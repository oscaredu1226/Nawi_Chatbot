import { useCallback, useEffect, useRef, useState } from "react";

type SR = any;

export type SpeechCaps = {
  ttsAvailable: boolean;
  srAvailable: boolean;
};

export function useSpeech() {
  const [caps, setCaps] = useState<SpeechCaps>({ ttsAvailable: false, srAvailable: false });
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState<string>("");
  const recognitionRef = useRef<SR | null>(null);
  const onResultRef = useRef<((t: string) => void) | null>(null);
  const onEndRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const tts = "speechSynthesis" in window;
    const SR =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    setCaps({ ttsAvailable: tts, srAvailable: !!SR });
    if (SR) {
      const r: SR = new SR();
      r.lang = "es-PE";
      r.interimResults = false;
      r.continuous = false;
      r.maxAlternatives = 1;
      r.onresult = (ev: any) => {
        const t = ev.results?.[0]?.[0]?.transcript ?? "";
        setTranscript(t);
        onResultRef.current?.(t);
      };
      r.onend = () => {
        setIsListening(false);
        onEndRef.current?.();
      };
      r.onerror = () => {
        setIsListening(false);
        onEndRef.current?.();
      };
      recognitionRef.current = r;
    }
  }, []);

  const speak = useCallback(
    (text: string, opts?: { lang?: string; onEnd?: () => void }) => {
      if (typeof window === "undefined" || !("speechSynthesis" in window)) {
        opts?.onEnd?.();
        return;
      }
      try {
        window.speechSynthesis.cancel();
        const u = new SpeechSynthesisUtterance(text);
        u.lang = opts?.lang ?? "es-PE";
        u.rate = 1;
        u.pitch = 1;
        u.onstart = () => setIsSpeaking(true);
        u.onend = () => {
          setIsSpeaking(false);
          opts?.onEnd?.();
        };
        u.onerror = () => {
          setIsSpeaking(false);
          opts?.onEnd?.();
        };
        window.speechSynthesis.speak(u);
      } catch {
        opts?.onEnd?.();
      }
    },
    [],
  );

  const pause = useCallback(() => {
    try { window.speechSynthesis.pause(); } catch {}
  }, []);
  const resume = useCallback(() => {
    try { window.speechSynthesis.resume(); } catch {}
  }, []);
  const stop = useCallback(() => {
    try { window.speechSynthesis.cancel(); } catch {}
    setIsSpeaking(false);
  }, []);

  const listen = useCallback(
    (cb: (t: string) => void, onEnd?: () => void) => {
      onResultRef.current = cb;
      onEndRef.current = onEnd ?? null;
      const r = recognitionRef.current;
      if (!r) {
        // no SR available -> caller should fall back to simulated input
        return false;
      }
      try {
        setTranscript("");
        setIsListening(true);
        r.start();
        return true;
      } catch {
        setIsListening(false);
        return false;
      }
    },
    [],
  );

  const stopListening = useCallback(() => {
    try { recognitionRef.current?.stop(); } catch {}
    setIsListening(false);
  }, []);

  return {
    caps,
    isSpeaking,
    isListening,
    transcript,
    speak,
    pause,
    resume,
    stop,
    listen,
    stopListening,
  };
}
