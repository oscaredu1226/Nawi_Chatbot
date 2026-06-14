import { useEffect, useRef, useState } from "react";
import { Camera, X, RefreshCw, ShieldCheck, AlertTriangle, UserRound } from "lucide-react";

type Stage =
  | "ready"
  | "no-face"
  | "face-detected"
  | "liveness"
  | "success"
  | "failure";

const STAGE_LABEL: Record<Stage, string> = {
  ready: "Cámara lista",
  "no-face": "Buscando rostro…",
  "face-detected": "Rostro detectado",
  liveness: "Prueba de vida en curso",
  success: "Identidad validada para esta demo",
  failure: "No se pudo validar la identidad",
};

const STAGE_INSTRUCTION: Record<Stage, string> = {
  ready: "Coloca tu rostro frente a la cámara. Ahora puedes seguir la indicación.",
  "no-face": "Acomoda tu rostro dentro del recuadro. Ahora puedes seguir la indicación.",
  "face-detected": "Permanece quieto unos segundos. Ahora puedes seguir la indicación.",
  liveness: "Parpadea para completar la prueba de vida.",
  success: "Identidad validada para esta demo.",
  failure: "No se pudo validar tu identidad. Puedes reintentar, usar PIN o hablar con una persona.",
};

export function FacialValidation({
  open,
  onResult,
  onClose,
  citizen,
  speak,
}: {
  open: boolean;
  onResult: (success: boolean) => void;
  onClose: () => void;
  citizen: { fullName?: string; dni?: string };
  speak?: (text: string) => void;
}) {
  const [stage, setStage] = useState<Stage>("ready");
  const timersRef = useRef<number[]>([]);

  useEffect(() => {
    if (!open) return;
    setStage("ready");
    speak?.(STAGE_INSTRUCTION["ready"]);
    const schedule = (ms: number, fn: () => void) => {
      const id = window.setTimeout(fn, ms);
      timersRef.current.push(id);
    };
    schedule(1400, () => { setStage("no-face"); speak?.(STAGE_INSTRUCTION["no-face"]); });
    schedule(2800, () => { setStage("face-detected"); speak?.(STAGE_INSTRUCTION["face-detected"]); });
    schedule(4200, () => { setStage("liveness"); speak?.(STAGE_INSTRUCTION["liveness"]); });
    schedule(6000, () => { setStage("success"); speak?.(STAGE_INSTRUCTION["success"]); });
    return () => {
      timersRef.current.forEach((id) => window.clearTimeout(id));
      timersRef.current = [];
    };
  }, [open, speak]);

  if (!open) return null;

  const isDone = stage === "success" || stage === "failure";

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="facial-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/60 p-4 backdrop-blur-sm"
    >
      <div className="nawi-card w-full max-w-lg overflow-hidden">
        <div className="nawi-gradient-header flex items-center justify-between p-4 text-primary-foreground">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5" />
            <h2 id="facial-title" className="text-lg font-bold">Validación facial simulada</h2>
          </div>
          <button
            aria-label="Cerrar módulo de validación"
            onClick={onClose}
            className="rounded-md p-2 hover:bg-white/10"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-4">
          <p className="text-sm text-muted-foreground">
            Este prototipo no compara tu rostro con RENIEC ni con una base oficial.
            No se guardarán imágenes ni datos biométricos reales.
          </p>

          {/* Camera simulation */}
          <div className="relative mt-4 aspect-[4/3] overflow-hidden rounded-xl border-2 border-foreground/30 bg-foreground">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_45%,oklch(0.35_0.02_60)_0%,oklch(0.15_0.01_60)_70%)]" />
            {/* Face silhouette */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div
                className={`relative flex h-44 w-36 items-center justify-center rounded-[50%_50%_45%_45%/55%_55%_45%_45%] border-2 transition-colors duration-300 ${
                  stage === "no-face"
                    ? "border-warning/70"
                    : stage === "face-detected" || stage === "liveness"
                    ? "border-audio/80"
                    : stage === "success"
                    ? "border-audio"
                    : stage === "failure"
                    ? "border-destructive"
                    : "border-white/40"
                }`}
              >
                <UserRound
                  className={`h-24 w-24 text-white/70 ${
                    stage === "no-face" || stage === "ready" ? "animate-nawi-pulse" : ""
                  }`}
                  strokeWidth={1.2}
                />
              </div>
            </div>
            {/* Scanner line */}
            {(stage === "face-detected" || stage === "liveness") && (
              <div className="pointer-events-none absolute inset-x-6 top-0 h-px bg-audio/80 shadow-[0_0_20px_var(--color-audio)] animate-nawi-scan" />
            )}
            {/* Stage chip */}
            <div className="absolute left-3 top-3">
              <span className="rounded-md bg-foreground/70 px-2.5 py-1 text-xs font-semibold text-background">
                {STAGE_LABEL[stage]}
              </span>
            </div>
            {stage === "success" && (
              <div className="absolute inset-0 flex items-center justify-center bg-audio/20">
                <div className="rounded-full bg-audio p-4 text-background"><ShieldCheck className="h-10 w-10" /></div>
              </div>
            )}
            {stage === "failure" && (
              <div className="absolute inset-0 flex items-center justify-center bg-destructive/20">
                <div className="rounded-full bg-destructive p-4 text-background"><AlertTriangle className="h-10 w-10" /></div>
              </div>
            )}
          </div>

          {/* Instruction */}
          <p className="mt-4 text-[17px] font-medium text-foreground" aria-live="polite">
            {STAGE_INSTRUCTION[stage]}
          </p>

          {citizen.fullName && (
            <p className="mt-2 text-sm text-muted-foreground">
              Vinculando a: <span className="font-semibold text-foreground">{citizen.fullName}</span>{" "}
              · DNI {citizen.dni}
            </p>
          )}

          {/* Actions */}
          <div className="mt-4 flex flex-wrap gap-2">
            {!isDone && (
              <button
                onClick={() => { setStage("failure"); speak?.(STAGE_INSTRUCTION["failure"]); }}
                className="rounded-md border border-input bg-background px-3 py-2 text-sm font-semibold text-muted-foreground hover:bg-accent"
              >
                Simular fallo
              </button>
            )}
            {stage === "success" && (
              <button
                onClick={() => onResult(true)}
                className="inline-flex items-center gap-2 rounded-md bg-audio px-5 py-3 text-base font-semibold text-background hover:opacity-90"
              >
                <ShieldCheck className="h-4 w-4" /> Continuar
              </button>
            )}
            {stage === "failure" && (
              <>
                <button
                  onClick={() => setStage("ready")}
                  className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-3 text-base font-semibold text-primary-foreground hover:bg-primary/90"
                >
                  <RefreshCw className="h-4 w-4" /> Reintentar
                </button>
                <button
                  onClick={() => onResult(false)}
                  className="rounded-md border border-input bg-background px-4 py-3 text-base font-semibold text-foreground hover:bg-accent"
                >
                  Usar otro método
                </button>
              </>
            )}
            <button
              onClick={onClose}
              className="ml-auto rounded-md px-3 py-2 text-sm font-semibold text-muted-foreground hover:bg-accent"
            >
              Cancelar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
