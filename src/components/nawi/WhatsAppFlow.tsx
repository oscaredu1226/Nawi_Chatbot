import { useEffect, useRef, useState } from "react";
import { Mic, Send, Paperclip, Camera, Phone, Video, MoreVertical, ChevronLeft, Check, CheckCheck, Play, ShieldCheck, ShieldAlert } from "lucide-react";
import { useNawiAgent } from "@/lib/nawi/useNawiAgent";
import { InlineCardView, SimulatedTag } from "./InlineCard";
import { FacialValidation } from "./FacialValidation";
import { NawiMark } from "./WebFlow";
import type { Option, Turn } from "@/lib/nawi/engine";

const SAMPLE_VOICE_NOTES = [
  "Hola, quiero iniciar un trámite.",
  "Necesito una constancia.",
  "Quiero ver el estado de mi trámite.",
  "Sí, es correcto.",
  "Mi nombre es Óscar Soto Huamán.",
  "Mi DNI es 41234567.",
];

export function WhatsAppFlow() {
  const agent = useNawiAgent("whatsapp");
  const { state, select, submitText, facialResult, facialCancel, facialPinSuccess } = agent;
  const [input, setInput] = useState("");
  const [showVoiceMenu, setShowVoiceMenu] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [state.turns.length]);

  const onSend = () => {
    if (!input.trim()) return;
    submitText(input);
    setInput("");
  };

  return (
    <div className="grid h-[calc(100dvh-72px)] place-items-center px-4 pb-4">
      <div className="grid w-full max-w-6xl grid-cols-1 gap-6 lg:grid-cols-[1fr_auto_1fr]">
        {/* Left: explanation */}
        <aside className="hidden lg:block">
          <div className="nawi-card sticky top-4 p-5">
            <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Flujo WhatsApp simulado</div>
            <h2 className="mt-1 text-xl font-bold">Demo de conversación</h2>
            <p className="mt-2 text-[15px] text-muted-foreground">
              Esta vista simula cómo Ñawi responde por WhatsApp. Puedes escribir, tocar respuestas
              rápidas o enviar una <strong>nota de voz simulada</strong>. La transcripción aparecerá
              en la conversación.
            </p>
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
              <li>• Ñawi no controla el micrófono ni los lectores de pantalla del teléfono.</li>
              <li>• La validación facial abre el módulo accesible Web.</li>
              <li>• Notificación proactiva: se enviará una novedad simulada al cabo de unos segundos.</li>
            </ul>
            <div className="mt-4">
              <SimulatedTag />
            </div>
          </div>
        </aside>

        {/* Phone frame */}
        <div className="mx-auto w-full max-w-[420px]">
          <div className="relative aspect-[9/19] w-full rounded-[44px] border-[12px] border-foreground bg-foreground shadow-2xl">
            {/* notch */}
            <div className="absolute left-1/2 top-0 z-20 h-6 w-32 -translate-x-1/2 rounded-b-2xl bg-foreground" />
            {/* screen */}
            <div className="relative grid h-full grid-rows-[auto_1fr_auto] overflow-hidden rounded-[30px] bg-wa-bg">
              {/* WA header */}
              <div className="flex items-center gap-2 bg-wa-header px-3 py-2 text-primary-foreground">
                <ChevronLeft className="h-5 w-5 opacity-80" />
                <div className="grid h-9 w-9 place-items-center rounded-full bg-primary text-primary-foreground ring-2 ring-white/30">
                  <NawiMark size={18} />
                </div>
                <div className="flex-1 leading-tight">
                  <div className="text-sm font-bold">Ñawi · GORE Cusco</div>
                  <div className="text-[11px] opacity-80">Asistente digital accesible</div>
                </div>
                <Video className="h-5 w-5 opacity-80" />
                <Phone className="h-5 w-5 opacity-80" />
                <MoreVertical className="h-5 w-5 opacity-80" />
              </div>

              {/* Validation chip */}
              <div className="absolute left-1/2 top-[64px] z-10 -translate-x-1/2">
                <span
                  className={`nawi-chip text-[11px] ${
                    state.identityValidated
                      ? "border-audio/40 bg-audio/15 text-audio"
                      : "border-warning/40 bg-warning/10 text-warning"
                  }`}
                >
                  {state.identityValidated ? <ShieldCheck className="h-3 w-3" /> : <ShieldAlert className="h-3 w-3" />}
                  {state.identityValidated ? "Identidad validada (demo)" : "Validación pendiente"}
                </span>
              </div>

              {/* Messages */}
              <div className="relative space-y-2 overflow-y-auto bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2240%22 height=%2240%22><circle cx=%221%22 cy=%221%22 r=%221%22 fill=%22%23000%22 fill-opacity=%220.04%22/></svg>')] px-2.5 pb-3 pt-12">
                <div className="mx-auto my-2 w-fit rounded-md bg-foreground/5 px-2 py-1 text-center text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Demo / Flujo WhatsApp simulado
                </div>
                {state.turns.map((t) => (
                  <WAMessage key={t.id} turn={t} onOption={select} />
                ))}
                <div ref={endRef} />
              </div>

              {/* Input bar */}
              <div className="border-t border-black/10 bg-wa-bg px-2 py-2">
                {showVoiceMenu && (
                  <div className="mb-2 rounded-2xl bg-card p-3 shadow-md ring-1 ring-border">
                    <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Enviar nota de voz simulada
                    </div>
                    <div className="grid grid-cols-1 gap-1.5">
                      {SAMPLE_VOICE_NOTES.map((vn) => (
                        <button
                          key={vn}
                          onClick={() => {
                            setShowVoiceMenu(false);
                            submitText(vn, true);
                          }}
                          className="flex items-center gap-2 rounded-lg border border-input bg-background px-3 py-2 text-left text-[13px] hover:bg-accent"
                        >
                          <Play className="h-3.5 w-3.5 text-audio" />
                          <span className="line-clamp-1">{vn}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                <div className="flex items-end gap-1.5">
                  <div className="flex flex-1 items-center gap-1 rounded-full bg-card px-3 py-1.5 ring-1 ring-border">
                    <input
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && onSend()}
                      placeholder="Mensaje"
                      className="flex-1 bg-transparent py-1 text-[14px] outline-none placeholder:text-muted-foreground"
                      aria-label="Mensaje para Ñawi por WhatsApp"
                    />
                    <Paperclip className="h-5 w-5 text-muted-foreground" />
                    <Camera className="h-5 w-5 text-muted-foreground" />
                  </div>
                  {input.trim() ? (
                    <button
                      onClick={onSend}
                      aria-label="Enviar mensaje"
                      className="grid h-10 w-10 place-items-center rounded-full bg-wa-header text-primary-foreground"
                    >
                      <Send className="h-4 w-4" />
                    </button>
                  ) : (
                    <button
                      onClick={() => setShowVoiceMenu((v) => !v)}
                      aria-pressed={showVoiceMenu}
                      aria-label="Enviar nota de voz simulada"
                      className={`grid h-10 w-10 place-items-center rounded-full text-primary-foreground ${
                        showVoiceMenu ? "bg-primary" : "bg-wa-header"
                      }`}
                    >
                      <Mic className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
          <p className="mt-3 text-center text-xs text-muted-foreground">
            Simulación. WhatsApp no es controlado por Ñawi.
          </p>
        </div>

        {/* Right: notes */}
        <aside className="hidden lg:block">
          <div className="nawi-card sticky top-4 p-5">
            <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Cómo responder</div>
            <ul className="mt-2 space-y-2 text-[15px]">
              <li>1. Escribe el número de la opción.</li>
              <li>2. Escribe el nombre de la opción.</li>
              <li>3. Envía una nota de voz simulada (botón micrófono).</li>
            </ul>
            <div className="mt-4 rounded-lg bg-secondary/60 p-3 text-sm text-muted-foreground">
              Cuando un flujo requiere validar identidad, Ñawi enviará un botón
              <strong> Validar identidad</strong> que abre el módulo facial accesible.
            </div>
          </div>
        </aside>
      </div>

      <FacialValidation
        open={state.facialModuleOpen}
        onResult={(ok) => facialResult(ok)}
        onCancel={() => facialCancel()}
        onPinSuccess={() => facialPinSuccess()}
        onClose={() => facialCancel()}
        citizen={{ fullName: state.collected.fullName, dni: state.collected.dni }}
        sourceChannel="whatsapp"
      />
    </div>
  );
}

function WAMessage({ turn, onOption }: { turn: Turn; onOption: (id: string) => void }) {
  if (turn.from === "user") {
    return (
      <div className="flex justify-end">
        <div className="max-w-[80%] rounded-2xl rounded-tr-sm bg-wa-me px-3 py-2 shadow-sm">
          {turn.isVoiceNote ? (
            <div>
              <div className="flex items-center gap-2">
                <button className="grid h-7 w-7 place-items-center rounded-full bg-wa-header text-primary-foreground" aria-label="Reproducir nota de voz">
                  <Play className="h-3.5 w-3.5" />
                </button>
                <div className="flex h-6 flex-1 items-center gap-0.5">
                  {Array.from({ length: 22 }).map((_, i) => (
                    <span
                      key={i}
                      className="block w-0.5 rounded-full bg-wa-tick/70"
                      style={{ height: `${20 + Math.sin(i * 0.6) * 8 + (i % 3) * 4}%` }}
                    />
                  ))}
                </div>
                <span className="text-[11px] text-muted-foreground">0:04</span>
              </div>
              <div className="mt-1 rounded-md bg-foreground/5 px-2 py-1 text-[12px] italic text-muted-foreground">
                Transcripción simulada: “{turn.transcription}”
              </div>
            </div>
          ) : (
            <p className="text-[14px] leading-snug">{turn.text}</p>
          )}
          <div className="mt-0.5 flex items-center justify-end gap-1 text-[10px] text-muted-foreground">
            <span>{fmtTime(turn.at)}</span>
            <CheckCheck className="h-3 w-3 text-wa-tick" />
          </div>
        </div>
      </div>
    );
  }
  return (
    <div className="flex">
      <div className="max-w-[85%] rounded-2xl rounded-tl-sm bg-wa-them px-3 py-2 shadow-sm">
        <div className="text-[11px] font-bold text-primary">Ñawi</div>
        <p className="whitespace-pre-line text-[14px] leading-snug">{turn.text}</p>
        {turn.options && turn.options.length > 0 && (
          <div className="mt-1.5 space-y-1 text-[12px]">
            {turn.options.map((o, i) => (
              <div key={o.id}>
                <span className="font-bold text-primary">{i + 1}.</span> {o.label}
              </div>
            ))}
            <div className="mt-1 italic text-muted-foreground">
              Puedes responder escribiendo el número, escribiendo la opción o enviando una nota de voz.
            </div>
          </div>
        )}
        {turn.card && (
          <div className="mt-2 -mx-1">
            <div className="rounded-lg bg-background ring-1 ring-border">
              <div className="scale-[0.97] origin-top-left">
                <InlineCardView card={turn.card} />
              </div>
            </div>
          </div>
        )}
        {turn.options && turn.options.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {turn.options.map((o) => (
              <button
                key={o.id}
                onClick={() => onOption(o.id)}
                className="rounded-full border border-wa-header/40 bg-wa-header/10 px-2.5 py-1 text-[12px] font-semibold text-wa-header hover:bg-wa-header/20"
              >
                {o.label}
              </button>
            ))}
          </div>
        )}
        <div className="mt-1 flex items-center justify-end gap-1 text-[10px] text-muted-foreground">
          <span>{fmtTime(turn.at)}</span>
        </div>
      </div>
    </div>
  );
}

function fmtTime(ts: number) {
  const d = new Date(ts);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}
