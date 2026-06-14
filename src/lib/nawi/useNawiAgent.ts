import { useCallback, useEffect, useReducer, useRef } from "react";
import {
  type AgentState,
  type Channel,
  initialState,
  reducer,
} from "@/lib/nawi/engine";
import { useSpeech } from "@/lib/nawi/useSpeech";

export function useNawiAgent(channel: Channel) {
  const [state, dispatch] = useReducer(reducer, channel, (c) => {
    const s = initialState(c);
    return reducer(s, { type: "INIT", channel: c });
  });
  const speech = useSpeech();
  const lastSpokenIdRef = useRef<string | null>(null);

  // Web only: auto-speak each new Ñawi turn; after speaking, auto-listen if voiceMode
  useEffect(() => {
    if (channel !== "web") return;
    const last = [...state.turns].reverse().find((t) => t.from === "nawi");
    if (!last || last.id === lastSpokenIdRef.current) return;
    lastSpokenIdRef.current = last.id;
    if (!speech.caps.ttsAvailable) return;
    const text = last.spoken ?? last.text;
    speech.speak(text, {
      lang: state.language === "qu" ? "es-PE" : "es-PE",
      onEnd: () => {
        if (state.voiceMode && speech.caps.srAvailable && !state.facialModuleOpen) {
          // start listening after the cue
          setTimeout(() => {
            speech.listen((t) => {
              dispatch({ type: "SUBMIT_TEXT", text: t });
            });
          }, 250);
        }
      },
    });
  }, [state.turns, state.voiceMode, state.facialModuleOpen, channel, speech, state.language]);

  // proactive notification on WhatsApp after a delay
  useEffect(() => {
    if (channel !== "whatsapp") return;
    const t = setTimeout(() => {
      dispatch({ type: "TRIGGER_NOTIFICATION" });
    }, 45000);
    return () => clearTimeout(t);
  }, [channel]);

  const select = useCallback((optionId: string) => {
    speech.stop();
    speech.stopListening();
    dispatch({ type: "SELECT", optionId });
  }, [speech]);

  const submitText = useCallback((text: string, asVoiceNote = false) => {
    speech.stop();
    speech.stopListening();
    dispatch({ type: "SUBMIT_TEXT", text, asVoiceNote });
  }, [speech]);

  const facialResult = useCallback((success: boolean) => {
    dispatch({ type: "FACIAL_RESULT", success });
  }, []);

  const facialCancel = useCallback(() => {
    dispatch({ type: "FACIAL_CANCEL" });
  }, []);

  const facialPinSuccess = useCallback(() => {
    dispatch({ type: "FACIAL_PIN_SUCCESS" });
  }, []);

  const reset = useCallback(() => {
    speech.stop();
    speech.stopListening();
    dispatch({ type: "RESET" });
  }, [speech]);

  const replay = useCallback(() => {
    const last = [...state.turns].reverse().find((t) => t.from === "nawi");
    if (!last) return;
    speech.speak(last.spoken ?? last.text);
  }, [state.turns, speech]);

  return {
    state,
    dispatch,
    speech,
    select,
    submitText,
    facialResult,
    facialCancel,
    facialPinSuccess,
    reset,
    replay,
  };
}

export type AgentApi = ReturnType<typeof useNawiAgent>;
