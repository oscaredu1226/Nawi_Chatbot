import { useEffect, useRef, useState } from "react";
import {
  Mic, MicOff, Send, Volume2, Pause, Play, Square, RotateCw,
  Languages, ShieldCheck, ShieldAlert, CircleDot, Sparkles, Keyboard,
} from "lucide-react";
import { useNawiAgent } from "@/lib/nawi/useNawiAgent";
import { InlineCardView, SimulatedTag } from "./InlineCard";
import { FacialValidation } from "./FacialValidation";
import type { Option, Turn } from "@/lib/nawi/engine";

export function WebFlow() {
  const agent = useNawiAgent("web");
  const { state, speech, select, submitText, facialResult, reset, replay } = agent;
  const [input, setInput] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [state.turns.length]);

  const onSend = () => {
    if (!input.trim()) return;
    submitText(input);
    setInput("");
  };

  const micStatus = !speech.caps.srAvailable
    ? { label: "Entrada de voz simulada", tone: "warning" as const, icon: <MicOff className="h-4 w-4" /> }
    : speech.isSpeaking
    ? { label: "Micrófono preparado, esperando turno", tone: "muted" as const, icon: <CircleDot className="h-4 w-4" /> }
    : speech.isListening
    ? { label: "Escuchando tu respuesta", tone: "audio" as const, icon: <Mic className="h-4 w-4 animate-nawi-pulse" /> }
    : state.voiceMode
    ? { label: "Micrófono activo", tone: "info" as const, icon: <Mic className="h-4 w-4" /> }
    : { label: "Micrófono pausado", tone: "muted" as const, icon: <MicOff className="h-4 w-4" /> };

  const audioStatus = speech.isSpeaking
    ? { label: "Ñawi está hablando", tone: "primary" as const }
    : { label: "Ahora puedes responder", tone: "audio" as const };

  return (
    <div className="grid h-[calc(100dvh-72px)] grid-rows-[1fr] gap-4 px-4 pb-4 md:grid-cols-[1fr_320px]">
      {/* Chat column */}
      <section
        aria-label="Conversación con Ñawi"
        className="nawi-card flex min-h-0 flex-col overflow-hidden"
      >
        {/* Mini header inside chat */}
        <div className="flex items-center justify-between gap-3 border-b border-border bg-secondary/50 px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-full bg-primary text-primary-foreground">
              <NawiMark />
            </div>
            <div>
              <div className="font-bold leading-tight">Ñawi</div>
              <div className="text-xs text-muted-foreground">Agente digital · Canal Web</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className={`nawi-chip ${audioStatus.tone === "primary" ? "border-primary/40 bg-primary/10 text-primary" : "border-audio/40 bg-audio/10 text-audio"}`}>
              <Volume2 className="h-3.5 w-3.5" />
              {audioStatus.label}
            </span>
            <button
              onClick={reset}
              title="Reiniciar conversación"
              aria-label="Reiniciar conversación"
              className="rounded-md p-2 text-muted-foreground hover:bg-accent"
            >
              <RotateCw className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 space-y-4 overflow-y-auto px-4 py-5">
          {state.turns.map((t) => (
            <TurnBubble
              key={t.id}
              turn={t}
              onOption={select}
              onSpeak={(text) => speech.speak(text)}
              onPause={speech.pause}
              onResume={speech.resume}
              onStop={speech.stop}
              ttsAvailable={speech.caps.ttsAvailable}
            />
          ))}
          {speech.isSpeaking && (
            <div className="ml-1 inline-flex items-center gap-1 text-xs text-muted-foreground" aria-live="polite">
              <span className="h-1.5 w-1.5 rounded-full bg-primary animate-nawi-typing" />
              <span className="h-1.5 w-1.5 rounded-full bg-primary animate-nawi-typing [animation-delay:.15s]" />
              <span className="h-1.5 w-1.5 rounded-full bg-primary animate-nawi-typing [animation-delay:.3s]" />
              <span className="ml-2">Ñawi está hablando…</span>
            </div>
          )}
          <div ref={endRef} />
        </div>

        {/* Input */}
        <div className="border-t border-border bg-card/80 p-3">
          <div className="flex items-end gap-2">
            <button
              onClick={() => {
                if (speech.isListening) speech.stopListening();
                else speech.listen((t) => submitText(t));
              }}
              aria-pressed={speech.isListening}
              aria-label={speech.isListening ? "Detener micrófono" : "Activar micrófono"}
              className={`grid h-12 w-12 place-items-center rounded-full border-2 transition ${
                speech.isListening
                  ? "border-audio bg-audio text-background animate-nawi-pulse"
                  : "border-input bg-background text-foreground hover:bg-accent"
              }`}
              disabled={!speech.caps.srAvailable && !state.voiceMode}
              title={speech.caps.srAvailable ? "Hablar" : "Reconocimiento no disponible"}
            >
              {speech.isListening ? <Mic className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
            </button>
            <div className="flex-1">
              <label htmlFor="nawi-input" className="sr-only">Escribe tu respuesta a Ñawi</label>
              <textarea
                id="nawi-input"
                rows={1}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    onSend();
                  }
                }}
                placeholder="Escribe o usa la voz…"
                className="w-full resize-none rounded-xl border border-input bg-background px-4 py-3 text-[17px] outline-none placeholder:text-muted-foreground"
              />
            </div>
            <button
              onClick={onSend}
              disabled={!input.trim()}
              aria-label="Enviar mensaje"
              className="grid h-12 w-12 place-items-center rounded-full bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-40"
            >
              <Send className="h-5 w-5" />
            </button>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <QuickCmd label="Repetir" onClick={() => submitText("repetir")} />
            <QuickCmd label="Volver atrás" onClick={() => submitText("volver atrás")} />
            <QuickCmd label="Volver al menú" onClick={() => submitText("menú")} />
            <QuickCmd label="Cancelar" onClick={() => submitText("cancelar")} />
            <QuickCmd label="Hablar con una persona" onClick={() => submitText("hablar con una persona")} />
            {!speech.caps.srAvailable && (
              <span className="nawi-chip border-warning/40 bg-warning/10 text-warning">
                <Keyboard className="h-3.5 w-3.5" /> Entrada de voz simulada
              </span>
            )}
          </div>
        </div>
      </section>

      {/* Status panel */}
      <aside aria-label="Estado de la sesión" className="hidden md:block">
        <div className="nawi-card sticky top-4 p-4">
          <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Estado de la sesión</div>
          <StatusRow label="Canal" value="Web" icon={<Sparkles className="h-4 w-4" />} />
          <StatusRow label="Idioma" value={state.language === "qu" ? "Quechua / Runa Simi" : "Español"} icon={<Languages className="h-4 w-4" />} />
          <StatusRow label="Guía de voz" value={state.voiceMode ? "Activada" : "Desactivada"} icon={<Volume2 className="h-4 w-4" />} tone={state.voiceMode ? "audio" : "muted"} />
          <StatusRow label="Audio" value={audioStatus.label} tone={audioStatus.tone === "primary" ? "primary" : "audio"} />
          <StatusRow label="Micrófono" value={micStatus.label} icon={micStatus.icon} tone={micStatus.tone} />
          <StatusRow
            label="Identidad"
            value={state.identityValidated ? "Validada para esta demo" : "No validada"}
            icon={state.identityValidated ? <ShieldCheck className="h-4 w-4" /> : <ShieldAlert className="h-4 w-4" />}
            tone={state.identityValidated ? "audio" : "warning"}
          />
          {state.confirmed.fullName && (
            <StatusRow label="Vinculado a" value={`${state.confirmed.fullName}${state.confirmed.dni ? ` · DNI ${state.confirmed.dni}` : ""}`} />
          )}
          {state.collected.fileNumber && (
            <StatusRow label="Expediente" value={state.collected.fileNumber} />
          )}
          <StatusRow label="Paso actual" value={prettyStep(state.step)} />
          <div className="my-3 border-t border-border" />
          <button
            onClick={replay}
            className="inline-flex w-full items-center justify-center gap-2 rounded-md border border-input bg-background px-3 py-2 text-sm font-semibold hover:bg-accent"
            disabled={!speech.caps.ttsAvailable}
          >
            <RotateCw className="h-4 w-4" /> Repetir último mensaje
          </button>
          <div className="mt-3">
            <SimulatedTag />
          </div>
        </div>
      </aside>

      <FacialValidation
        open={state.facialModuleOpen}
        onResult={(ok) => facialResult(ok)}
        onClose={() => facialResult(false)}
        citizen={{ fullName: state.collected.fullName, dni: state.collected.dni }}
        speak={(t) => speech.speak(t)}
      />
    </div>
  );
}

function TurnBubble({
  turn,
  onOption,
  onSpeak,
  onPause,
  onResume,
  onStop,
  ttsAvailable,
}: {
  turn: Turn;
  onOption: (id: string) => void;
  onSpeak: (text: string) => void;
  onPause: () => void;
  onResume: () => void;
  onStop: () => void;
  ttsAvailable: boolean;
}) {
  if (turn.from === "user") {
    return (
      <div className="flex justify-end">
        <div className="max-w-[80%] rounded-2xl rounded-br-sm bg-primary px-4 py-2.5 text-primary-foreground">
          <p className="text-[17px]">{turn.text}</p>
        </div>
      </div>
    );
  }
  return (
    <div className="flex items-start gap-3">
      <div className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground">
        <NawiMark size={18} />
      </div>
      <div className="max-w-[85%] flex-1">
        <div className="rounded-2xl rounded-tl-sm bg-card px-4 py-3 shadow-[0_1px_0_oklch(0_0_0/0.04)] ring-1 ring-border">
          <p className="text-[17px] leading-relaxed text-foreground">{turn.text}</p>
          {turn.card && <InlineCardView card={turn.card} />}
          {turn.options && turn.options.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {turn.options.map((o) => (
                <OptionButton key={o.id} option={o} onClick={() => onOption(o.id)} />
              ))}
            </div>
          )}
          {ttsAvailable && (
            <div className="mt-3 flex flex-wrap items-center gap-1.5 border-t border-border pt-2">
              <AudioBtn onClick={() => onSpeak(turn.spoken ?? turn.text)} icon={<Volume2 className="h-3.5 w-3.5" />} label="Escuchar" />
              <AudioBtn onClick={() => onSpeak(turn.spoken ?? turn.text)} icon={<RotateCw className="h-3.5 w-3.5" />} label="Repetir" />
              <AudioBtn onClick={onPause} icon={<Pause className="h-3.5 w-3.5" />} label="Pausar" />
              <AudioBtn onClick={onResume} icon={<Play className="h-3.5 w-3.5" />} label="Continuar" />
              <AudioBtn onClick={onStop} icon={<Square className="h-3.5 w-3.5" />} label="Detener" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function AudioBtn({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold text-muted-foreground hover:bg-secondary hover:text-foreground"
      aria-label={`${label} audio`}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}

function OptionButton({ option, onClick }: { option: Option; onClick: () => void }) {
  const tone =
    option.tone === "primary"
      ? "bg-primary text-primary-foreground hover:bg-primary/90 border-primary"
      : option.tone === "danger"
      ? "bg-background border-destructive/50 text-destructive hover:bg-destructive/10"
      : option.tone === "success"
      ? "bg-audio text-background border-audio hover:opacity-90"
      : "bg-background border-input text-foreground hover:bg-accent";
  return (
    <button
      onClick={onClick}
      className={`inline-flex min-h-11 items-center gap-2 rounded-lg border-2 px-3.5 py-2 text-[15px] font-semibold transition ${tone}`}
    >
      {option.label}
    </button>
  );
}

function QuickCmd({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="rounded-full border border-input bg-secondary/40 px-3 py-1 text-xs font-semibold text-muted-foreground hover:bg-accent hover:text-foreground"
    >
      {label}
    </button>
  );
}

function StatusRow({
  label,
  value,
  icon,
  tone = "default",
}: {
  label: string;
  value: string;
  icon?: React.ReactNode;
  tone?: "default" | "audio" | "warning" | "primary" | "info" | "muted";
}) {
  const cls =
    tone === "audio"
      ? "text-audio"
      : tone === "warning"
      ? "text-warning"
      : tone === "primary"
      ? "text-primary"
      : tone === "info"
      ? "text-info"
      : tone === "muted"
      ? "text-muted-foreground"
      : "text-foreground";
  return (
    <div className="mt-2.5 flex items-start justify-between gap-3">
      <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={`flex items-center gap-1.5 text-right text-sm font-semibold ${cls}`}>
        {icon}
        <span>{value}</span>
      </div>
    </div>
  );
}

function prettyStep(s: string) {
  return s.replace(/-/g, " ").replace(/\b\w/g, (m) => m.toUpperCase());
}

export function NawiMark({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M2 12C4.5 7.5 8 5 12 5s7.5 2.5 10 7c-2.5 4.5-6 7-10 7S4.5 16.5 2 12Z"
        stroke="currentColor"
        strokeWidth="2"
        fill="currentColor"
        fillOpacity="0.18"
      />
      <circle cx="12" cy="12" r="3.5" fill="currentColor" />
    </svg>
  );
}
