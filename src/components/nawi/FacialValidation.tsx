import { useCallback, useEffect, useRef, useState } from "react";
import {
  X,
  RefreshCw,
  ShieldCheck,
  AlertTriangle,
  UserRound,
  KeyRound,
  ArrowLeft,
  LifeBuoy,
  CheckCircle2,
  XCircle,
} from "lucide-react";

// Deterministic state machine — modal never gets stuck.
type Stage =
  | "FACE_NOTICE"        // permission / explainer
  | "FACE_POSITIONING"   // looking for face
  | "FACE_DETECTED"      // face inside frame
  | "FACE_LIVENESS"      // blink/turn
  | "FACE_SUCCESS"       // ready to confirm
  | "FACE_FAILED"        // simulated failure recovery
  | "FACE_CANCEL_CONFIRM" // user clicked X
  | "FACE_PIN"           // PIN fallback
  | "FACE_PIN_FAILED";   // wrong PIN

const STAGE_LABEL: Record<Stage, string> = {
  FACE_NOTICE: "Listo para iniciar",
  FACE_POSITIONING: "Buscando rostro…",
  FACE_DETECTED: "Rostro detectado",
  FACE_LIVENESS: "Prueba de vida en curso",
  FACE_SUCCESS: "Identidad validada para esta demo",
  FACE_FAILED: "No se pudo validar la identidad",
  FACE_CANCEL_CONFIRM: "¿Cancelar validación?",
  FACE_PIN: "Validación por PIN simulado",
  FACE_PIN_FAILED: "PIN incorrecto",
};

const STAGE_INSTRUCTION: Record<Stage, string> = {
  FACE_NOTICE:
    "Validación facial simulada para demostración. No se compara con RENIEC ni se guardan datos biométricos reales.",
  FACE_POSITIONING:
    "Acomoda tu rostro dentro del recuadro. Permanece quieto unos segundos.",
  FACE_DETECTED:
    "Rostro detectado. Permanece quieto para la prueba de vida.",
  FACE_LIVENESS: "Parpadea para completar la prueba de vida.",
  FACE_SUCCESS: "Identidad validada para esta demo.",
  FACE_FAILED:
    "No se pudo validar tu identidad en esta demo. Puedes reintentar, usar PIN simulado o hablar con una persona.",
  FACE_CANCEL_CONFIRM:
    "Si cancelas, no podré continuar con este trámite personal.",
  FACE_PIN:
    "Usaremos un PIN simulado para esta demo. En una versión real, sería reemplazado por un método oficial autorizado. PIN demo: 1234.",
  FACE_PIN_FAILED:
    "PIN incorrecto. Por seguridad, no mostraré información personal.",
};

export function FacialValidation({
  open,
  onResult,            // success / simulated facial failure
  onCancel,            // user confirmed cancel
  onPinSuccess,        // PIN fallback success
  onClose,             // legacy fallback (kept for back-compat)
  citizen,
  speak,               // only passed in Web flow
  sourceChannel = "web",
}: {
  open: boolean;
  onResult: (success: boolean) => void;
  onCancel?: () => void;
  onPinSuccess?: () => void;
  onClose?: () => void;
  citizen: { fullName?: string; dni?: string };
  speak?: (text: string) => void;
  sourceChannel?: "web" | "whatsapp";
}) {
  const [stage, setStage] = useState<Stage>("FACE_NOTICE");
  const [pin, setPin] = useState("");
  const [prevStage, setPrevStage] = useState<Stage>("FACE_NOTICE");
  const timersRef = useRef<number[]>([]);
  const speakRef = useRef(speak);

  useEffect(() => {
    speakRef.current = speak;
  }, [speak]);

  const clearTimers = useCallback(() => {
    timersRef.current.forEach((id) => window.clearTimeout(id));
    timersRef.current = [];
  }, []);

  // Se reinicia solo cuando se abre/cierra el modal.
  // No debe depender de `speak`, porque cuando Ñawi habla se reiniciaba el modal.
  useEffect(() => {
    if (!open) return;

    clearTimers();
    setStage("FACE_NOTICE");
    setPin("");
    setPrevStage("FACE_NOTICE");

    if (sourceChannel === "web") {
      speakRef.current?.(STAGE_INSTRUCTION.FACE_NOTICE);
    }

    return clearTimers;
  }, [open, sourceChannel, clearTimers]);

  if (!open) return null;

  const announce = (text: string) => {
    if (sourceChannel === "web") speakRef.current?.(text);
  };

  const goTo = (s: Stage) => {
    setPrevStage(stage);
    setStage(s);
    announce(STAGE_INSTRUCTION[s]);
  };

  // ---- Simulated guided progression ----
  const setStageWithVoice = (nextStage: Stage) => {
    setStage(nextStage);
    announce(STAGE_INSTRUCTION[nextStage]);
  };

  // ---- Simulated guided progression ----
  const startSimulation = () => {
    clearTimers();
    setStageWithVoice("FACE_POSITIONING");

    const guidedSteps: Array<[Stage, number]> = [
      ["FACE_DETECTED", 2200],
      ["FACE_LIVENESS", 4200],
      ["FACE_SUCCESS", 6500],
    ];

    guidedSteps.forEach(([nextStage, delay]) => {
      const timerId = window.setTimeout(() => {
        setStageWithVoice(nextStage);
      }, delay);

      timersRef.current.push(timerId);
    });
  };

  const simDetected = () => {
    clearTimers();
    setStageWithVoice("FACE_DETECTED");
  };

  const simLiveness = () => {
    clearTimers();
    setStageWithVoice("FACE_LIVENESS");

    const timerId = window.setTimeout(() => {
      setStageWithVoice("FACE_SUCCESS");
    }, 900);

    timersRef.current.push(timerId);
  };

  const simInstantSuccess = () => {
    clearTimers();
    setStageWithVoice("FACE_SUCCESS");
  };

  const simFailure = () => {
    clearTimers();
    setStageWithVoice("FACE_FAILED");
  };

  // ---- Resolution callbacks ----
  const confirmSuccess = () => onResult(true);
  const reportFailureToAgent = () => onResult(false);
  const reportCancel = () => (onCancel ? onCancel() : onClose?.());
  const reportPinSuccess = () => (onPinSuccess ? onPinSuccess() : onResult(true));

  const requestClose = () => {
    setPrevStage(stage);
    setStage("FACE_CANCEL_CONFIRM");
    announce(STAGE_INSTRUCTION.FACE_CANCEL_CONFIRM);
  };

  // ---- PIN ----
  const submitPin = () => {
    if (pin === "1234") {
      reportPinSuccess();
      return;
    }
    setStage("FACE_PIN_FAILED");
    announce(STAGE_INSTRUCTION.FACE_PIN_FAILED);
  };

  const showCamera = !(
    stage === "FACE_CANCEL_CONFIRM" ||
    stage === "FACE_PIN" ||
    stage === "FACE_PIN_FAILED"
  );

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
            <h2 id="facial-title" className="text-lg font-bold">
              Validación facial simulada
            </h2>
          </div>
          <button
            aria-label="Cerrar módulo de validación"
            onClick={requestClose}
            className="rounded-md p-2 hover:bg-white/10"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-4">
          <p className="text-sm text-muted-foreground">
            Este prototipo no compara tu rostro con RENIEC ni con una base oficial. No se guardarán
            imágenes ni datos biométricos reales.
          </p>

          {showCamera && (
            <div className="relative mt-4 aspect-[4/3] overflow-hidden rounded-xl border-2 border-foreground/30 bg-foreground">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_45%,oklch(0.35_0.02_60)_0%,oklch(0.15_0.01_60)_70%)]" />
              <div className="absolute inset-0 flex items-center justify-center">
                <div
                  className={`relative flex h-44 w-36 items-center justify-center rounded-[50%_50%_45%_45%/55%_55%_45%_45%] border-2 transition-colors duration-300 ${
                    stage === "FACE_POSITIONING"
                      ? "border-warning/70"
                      : stage === "FACE_DETECTED" || stage === "FACE_LIVENESS"
                        ? "border-audio/80"
                        : stage === "FACE_SUCCESS"
                          ? "border-audio"
                          : stage === "FACE_FAILED"
                            ? "border-destructive"
                            : "border-white/40"
                  }`}
                >
                  <UserRound
                    className={`h-24 w-24 text-white/70 ${
                      stage === "FACE_POSITIONING" || stage === "FACE_NOTICE"
                        ? "animate-nawi-pulse"
                        : ""
                    }`}
                    strokeWidth={1.2}
                  />
                </div>
              </div>
              {(stage === "FACE_DETECTED" || stage === "FACE_LIVENESS") && (
                <div className="pointer-events-none absolute inset-x-6 top-0 h-px bg-audio/80 shadow-[0_0_20px_var(--color-audio)] animate-nawi-scan" />
              )}
              <div className="absolute left-3 top-3">
                <span className="rounded-md bg-foreground/70 px-2.5 py-1 text-xs font-semibold text-background">
                  {STAGE_LABEL[stage]}
                </span>
              </div>
              {stage === "FACE_SUCCESS" && (
                <div className="absolute inset-0 flex items-center justify-center bg-audio/20">
                  <div className="rounded-full bg-audio p-4 text-background">
                    <ShieldCheck className="h-10 w-10" />
                  </div>
                </div>
              )}
              {stage === "FACE_FAILED" && (
                <div className="absolute inset-0 flex items-center justify-center bg-destructive/20">
                  <div className="rounded-full bg-destructive p-4 text-background">
                    <AlertTriangle className="h-10 w-10" />
                  </div>
                </div>
              )}
            </div>
          )}

          <p className="mt-4 text-[17px] font-medium text-foreground" aria-live="polite">
            {STAGE_INSTRUCTION[stage]}
          </p>

          {citizen.fullName && stage !== "FACE_CANCEL_CONFIRM" && (
            <p className="mt-2 text-sm text-muted-foreground">
              Vinculando a:{" "}
              <span className="font-semibold text-foreground">{citizen.fullName}</span> · DNI{" "}
              {citizen.dni}
            </p>
          )}

          {/* ---- ACTIONS BY STAGE ---- */}

          {stage === "FACE_NOTICE" && (
            <div className="mt-4 grid gap-2">
              <button
                onClick={startSimulation}
                className="inline-flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-3 text-base font-semibold text-primary-foreground hover:bg-primary/90"
              >
                <ShieldCheck className="h-4 w-4" /> Iniciar validación simulada
              </button>
              <button
                onClick={simInstantSuccess}
                className="inline-flex items-center justify-center gap-2 rounded-md bg-audio px-4 py-3 text-base font-semibold text-background hover:opacity-90"
              >
                <CheckCircle2 className="h-4 w-4" /> Simular validación exitosa
              </button>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={simFailure}
                  className="rounded-md border border-input bg-background px-3 py-2 text-sm font-semibold text-muted-foreground hover:bg-accent"
                >
                  <XCircle className="mr-1 inline h-3.5 w-3.5" /> Simular fallo
                </button>
                <button
                  onClick={() => goTo("FACE_PIN")}
                  className="rounded-md border border-input bg-background px-3 py-2 text-sm font-semibold text-foreground hover:bg-accent"
                >
                  <KeyRound className="mr-1 inline h-3.5 w-3.5" /> Usar PIN alternativo
                </button>
                <button
                  onClick={requestClose}
                  className="ml-auto rounded-md px-3 py-2 text-sm font-semibold text-muted-foreground hover:bg-accent"
                >
                  Cancelar validación
                </button>
              </div>
            </div>
          )}

          {stage === "FACE_POSITIONING" && (
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                onClick={simDetected}
                className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-3 text-base font-semibold text-primary-foreground hover:bg-primary/90"
              >
                Simular rostro detectado
              </button>
              <button
                onClick={simInstantSuccess}
                className="inline-flex items-center gap-2 rounded-md bg-audio px-4 py-3 text-base font-semibold text-background hover:opacity-90"
              >
                <CheckCircle2 className="h-4 w-4" /> Simular validación exitosa
              </button>
              <button
                onClick={simFailure}
                className="rounded-md border border-input bg-background px-3 py-2 text-sm font-semibold text-muted-foreground hover:bg-accent"
              >
                Simular fallo
              </button>
              <button
                onClick={requestClose}
                className="ml-auto rounded-md px-3 py-2 text-sm font-semibold text-muted-foreground hover:bg-accent"
              >
                Cancelar
              </button>
            </div>
          )}

          {stage === "FACE_DETECTED" && (
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                onClick={simLiveness}
                className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-3 text-base font-semibold text-primary-foreground hover:bg-primary/90"
              >
                Simular prueba de vida exitosa
              </button>
              <button
                onClick={simInstantSuccess}
                className="inline-flex items-center gap-2 rounded-md bg-audio px-4 py-3 text-base font-semibold text-background hover:opacity-90"
              >
                <CheckCircle2 className="h-4 w-4" /> Simular validación exitosa
              </button>
              <button
                onClick={simFailure}
                className="rounded-md border border-input bg-background px-3 py-2 text-sm font-semibold text-muted-foreground hover:bg-accent"
              >
                Simular fallo
              </button>
              <button
                onClick={requestClose}
                className="ml-auto rounded-md px-3 py-2 text-sm font-semibold text-muted-foreground hover:bg-accent"
              >
                Cancelar
              </button>
            </div>
          )}

          {stage === "FACE_LIVENESS" && (
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                onClick={simInstantSuccess}
                className="inline-flex items-center gap-2 rounded-md bg-audio px-4 py-3 text-base font-semibold text-background hover:opacity-90"
              >
                <CheckCircle2 className="h-4 w-4" /> Confirmar validación exitosa
              </button>
              <button
                onClick={simFailure}
                className="rounded-md border border-input bg-background px-3 py-2 text-sm font-semibold text-muted-foreground hover:bg-accent"
              >
                Simular fallo
              </button>
              <button
                onClick={requestClose}
                className="ml-auto rounded-md px-3 py-2 text-sm font-semibold text-muted-foreground hover:bg-accent"
              >
                Cancelar
              </button>
            </div>
          )}

          {stage === "FACE_SUCCESS" && (
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                onClick={confirmSuccess}
                className="inline-flex items-center gap-2 rounded-md bg-audio px-5 py-3 text-base font-semibold text-background hover:opacity-90"
              >
                <ShieldCheck className="h-4 w-4" /> Continuar
              </button>
            </div>
          )}

          {stage === "FACE_FAILED" && (
            <div className="mt-4 grid gap-2">
              <button
                onClick={startSimulation}
                className="inline-flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-3 text-base font-semibold text-primary-foreground hover:bg-primary/90"
              >
                <RefreshCw className="h-4 w-4" /> Reintentar validación
              </button>
              <button
                onClick={() => goTo("FACE_PIN")}
                className="inline-flex items-center justify-center gap-2 rounded-md border-2 border-input bg-background px-4 py-3 text-base font-semibold text-foreground hover:bg-accent"
              >
                <KeyRound className="h-4 w-4" /> Usar PIN alternativo
              </button>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={reportFailureToAgent}
                  className="inline-flex items-center gap-2 rounded-md border border-input bg-background px-3 py-2 text-sm font-semibold text-foreground hover:bg-accent"
                >
                  <ArrowLeft className="h-3.5 w-3.5" /> Volver atrás
                </button>
                <button
                  onClick={reportFailureToAgent}
                  className="inline-flex items-center gap-2 rounded-md border border-input bg-background px-3 py-2 text-sm font-semibold text-foreground hover:bg-accent"
                >
                  <LifeBuoy className="h-3.5 w-3.5" /> Hablar con una persona
                </button>
              </div>
            </div>
          )}

          {stage === "FACE_CANCEL_CONFIRM" && (
            <div className="mt-4 grid gap-2">
              <div className="rounded-md border-2 border-warning/30 bg-warning/10 p-3 text-sm font-medium text-foreground">
                ¿Quieres cancelar la validación de identidad? Si cancelas, no podré continuar con
                este trámite personal.
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={reportCancel}
                  className="inline-flex items-center gap-2 rounded-md bg-destructive px-4 py-3 text-base font-semibold text-destructive-foreground hover:opacity-90"
                >
                  Sí, cancelar validación
                </button>
                <button
                  onClick={() => {
                    setStage(prevStage === "FACE_CANCEL_CONFIRM" ? "FACE_NOTICE" : prevStage);
                    announce(
                      STAGE_INSTRUCTION[
                        prevStage === "FACE_CANCEL_CONFIRM" ? "FACE_NOTICE" : prevStage
                      ],
                    );
                  }}
                  className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-3 text-base font-semibold text-primary-foreground hover:bg-primary/90"
                >
                  No, continuar validación
                </button>
                <button
                  onClick={() => goTo("FACE_PIN")}
                  className="rounded-md border border-input bg-background px-3 py-2 text-sm font-semibold text-foreground hover:bg-accent"
                >
                  Usar otro método
                </button>
                <button
                  onClick={reportCancel}
                  className="rounded-md border border-input bg-background px-3 py-2 text-sm font-semibold text-foreground hover:bg-accent"
                >
                  Hablar con una persona
                </button>
              </div>
            </div>
          )}

          {(stage === "FACE_PIN" || stage === "FACE_PIN_FAILED") && (
            <div className="mt-4 grid gap-3">
              <label htmlFor="nawi-pin" className="text-sm font-semibold text-foreground">
                Ingresa el PIN simulado (demo: 1234)
              </label>
              <input
                id="nawi-pin"
                inputMode="numeric"
                pattern="\d*"
                maxLength={4}
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
                className="w-32 rounded-md border-2 border-input bg-background px-3 py-2 text-center text-2xl font-bold tracking-[0.5em] outline-none focus:border-primary"
                aria-label="PIN simulado de 4 dígitos"
              />
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={submitPin}
                  disabled={pin.length !== 4}
                  className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-3 text-base font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-40"
                >
                  Validar PIN
                </button>
                {stage === "FACE_PIN_FAILED" && (
                  <button
                    onClick={() => {
                      setPin("");
                      setStage("FACE_PIN");
                    }}
                    className="rounded-md border border-input bg-background px-3 py-2 text-sm font-semibold text-foreground hover:bg-accent"
                  >
                    Reintentar PIN
                  </button>
                )}
                <button
                  onClick={() => goTo("FACE_POSITIONING")}
                  className="rounded-md border border-input bg-background px-3 py-2 text-sm font-semibold text-foreground hover:bg-accent"
                >
                  Reintentar validación facial
                </button>
                <button
                  onClick={reportCancel}
                  className="ml-auto rounded-md px-3 py-2 text-sm font-semibold text-muted-foreground hover:bg-accent"
                >
                  Hablar con una persona
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
