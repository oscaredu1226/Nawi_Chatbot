import {
  DEMO_CITIZEN,
  PROCEDURES,
  SIM_FILES,
  digitByDigit,
  type Procedure,
  type SimFile,
} from "./data";
import {
  classifyGlobal,
  extractDni,
  extractFileNumber,
  matchOption,
} from "./intents";

export type Channel = "web" | "whatsapp";
export type Language = "es" | "qu";

export type Option = {
  id: string;
  label: string;
  synonyms?: string[];
  tone?: "primary" | "default" | "danger" | "success";
};

export type Turn = {
  id: string;
  from: "nawi" | "user";
  text: string;
  /** spoken-only text (Web TTS prompt incl. options + cue). If absent, uses `text`. */
  spoken?: string;
  /** for user voice notes in WhatsApp */
  isVoiceNote?: boolean;
  /** simulated transcription (WhatsApp) */
  transcription?: string;
  /** options rendered as buttons under bubble */
  options?: Option[];
  /** sim card payload to render inline */
  card?: InlineCard;
  /** mark this Ñawi turn as simulated-data note */
  simulatedNote?: boolean;
  /** timestamp */
  at: number;
};

export type InlineCard =
  | { kind: "requirements"; procedure: Procedure }
  | { kind: "file-status"; file: SimFile }
  | { kind: "file-list"; files: SimFile[] }
  | { kind: "summary"; data: CollectedData; proc: Procedure }
  | { kind: "receipt"; fileNumber: string; proc: Procedure; data: CollectedData }
  | { kind: "notification"; file: SimFile };

export type Step =
  | "welcome"
  | "language"
  | "menu"
  | "req-ask"
  | "req-category"
  | "req-suggest"
  | "req-confirm-proc"
  | "req-result"
  | "start-explain"
  | "privacy"
  | "ask-name"
  | "confirm-name"
  | "ask-dni"
  | "confirm-dni"
  | "identity-summary"
  | "facial-consent"
  | "facial-module"
  | "facial-result"
  | "facial-result-fail"
  | "facial-cancelled"
  | "post-validation"
  | "choose-procedure"
  | "show-requirements"
  | "ask-motivo"
  | "ask-attachment"
  | "final-summary"
  | "submitted"
  | "status-explain"
  | "status-have-file"
  | "status-ask-file"
  | "status-confirm-file"
  | "status-show"
  | "status-list"
  | "observed"
  | "correct-attach"
  | "correct-done"
  | "human-support"
  | "notification"
  | "cancelled";

export type CollectedData = Partial<{
  fullName: string;
  dni: string;
  procedureId: string;
  fileNumber: string;
  motivo: string;
  attachment: string;
}>;

export type AgentState = {
  channel: Channel;
  language: Language;
  voiceMode: boolean;
  step: Step;
  turns: Turn[];
  history: Step[];
  collected: CollectedData;
  confirmed: CollectedData;
  identityValidated: boolean;
  unclearCount: number;
  currentOptions: Option[];
  /** set when an inline facial module should open */
  facialModuleOpen: boolean;
  /** set when notification has been pushed */
  notifiedFor?: string;
  /** intent to resume after facial validation finishes */
  resumeAfterFacial?: Step;
  flowOrigin?: "start-procedure" | "status" | "observed" | "notification";
};

// ---------- Speaking cues ----------
const CUE_WEB = "Ahora puedes decir la opción que prefieras.";
const CUE_WEB_SAY = "Ahora puedes hablar.";
const CUE_WHATSAPP =
  "Puedes responder escribiendo el número, escribiendo la opción o enviando una nota de voz.";

export function speakingCue(channel: Channel, kind: "say" | "options" = "options") {
  if (channel === "web") return kind === "say" ? CUE_WEB_SAY : CUE_WEB;
  return CUE_WHATSAPP;
}

export function initialState(channel: Channel): AgentState {
  return {
    channel,
    language: "es",
    voiceMode: false,
    step: "welcome",
    turns: [],
    history: [],
    collected: {},
    confirmed: {},
    identityValidated: false,
    unclearCount: 0,
    currentOptions: [],
    facialModuleOpen: false,
  };
}

// ---------- Helpers to build prompts ----------
const id = () => Math.random().toString(36).slice(2, 10);
const now = () => Date.now();

function withOptions(opts: Option[]): Option[] {
  return opts;
}

function optionsBlock(opts: Option[]) {
  return opts.map((o, i) => `${i + 1}. ${o.label}`).join(" ");
}

function buildSpokenPrompt(
  channel: Channel,
  body: string,
  opts: Option[],
  cueKind: "say" | "options" = "options",
): string {
  if (opts.length === 0) {
    return channel === "web" ? `${body} ${speakingCue(channel, "say")}` : body;
  }
  const parts = [body, `Opciones disponibles: ${optionsBlock(opts)}`];
  parts.push(speakingCue(channel, cueKind));
  return parts.join(" ");
}

// ---------- Step definitions ----------
type StepBuild = (s: AgentState) => Turn;

export function buildTurnFor(state: AgentState, step: Step): Turn {
  const c = state.channel;
  const b = STEP_BUILDERS[step];
  return b ? b(state) : nawi(state, "Continuemos.", []);
}

function nawi(
  state: AgentState,
  text: string,
  options: Option[],
  extras: Partial<Turn> = {},
): Turn {
  return {
    id: id(),
    from: "nawi",
    text,
    spoken: buildSpokenPrompt(state.channel, text, options),
    options,
    at: now(),
    ...extras,
  };
}

const STEP_BUILDERS: Record<Step, StepBuild> = {
  welcome: (s) =>
    nawi(
      s,
      "Hola, soy Ñawi, tu asistente digital accesible del Gobierno Regional de Cusco. Esta es una demo accesible. Antes de comenzar, elige cómo quieres usar Ñawi.",
      [
        { id: "voice", label: "Iniciar Ñawi con voz y permitir micrófono", tone: "primary" },
        { id: "novoice", label: "Usar sin guía de voz" },
      ],
    ),
  language: (s) =>
    nawi(s, "Elige el idioma en el que quieres usar Ñawi.", [
      { id: "es", label: "Español", synonyms: ["espanol", "castellano"] },
      { id: "qu", label: "Quechua / Runa Simi", synonyms: ["quechua", "runa simi"] },
    ]),
  menu: (s) =>
    nawi(
      s,
      "Estoy aquí para ayudarte. ¿Qué deseas hacer hoy?",
      [
        { id: "req", label: "Consultar requisitos", synonyms: ["requisitos"] },
        { id: "start", label: "Iniciar trámite", synonyms: ["iniciar"] },
        { id: "status", label: "Ver estado de mi trámite", synonyms: ["estado", "ver estado"] },
        { id: "human", label: "Hablar con una persona", synonyms: ["persona", "humano"] },
      ],
    ),

  "req-ask": (s) =>
    nawi(
      s,
      "Dime qué necesitas hacer, aunque no sepas el nombre exacto del trámite. Por ejemplo: necesito una constancia, quiero presentar un documento, o quiero hacer una solicitud.",
      [
        { id: "no-se", label: "No sé el nombre del trámite", synonyms: ["no se"] },
        { id: "menu", label: "Volver al menú" },
      ],
    ),
  "req-category": (s) =>
    nawi(
      s,
      "No hay problema. Te ayudaré a encontrarlo. ¿Cuál se parece más a lo que necesitas?",
      [
        { id: "constancia", label: "Necesito una constancia" },
        { id: "documento", label: "Quiero presentar un documento" },
        { id: "expediente", label: "Quiero consultar un expediente" },
        { id: "solicitud", label: "Quiero hacer una solicitud general" },
        { id: "ninguna", label: "Ninguna de estas" },
      ],
    ),
  "req-suggest": (s) => {
    const cat = (s.collected as any).category as Procedure["category"] | undefined;
    const matches = cat ? PROCEDURES.filter((p) => p.category === cat) : PROCEDURES;
    return nawi(
      s,
      "Encontré estas opciones parecidas. Elige una para ver los requisitos.",
      [
        ...matches.map((p) => ({ id: p.id, label: p.name, synonyms: [p.name.toLowerCase()] })),
        { id: "ninguna", label: "Ninguna de estas" },
      ],
    );
  },
  "req-confirm-proc": (s) => {
    const p = PROCEDURES.find((x) => x.id === s.collected.procedureId)!;
    return nawi(
      s,
      `Entendí que quieres consultar: ${p.name}. ¿Es correcto?`,
      [
        { id: "yes", label: "Sí, ver requisitos", tone: "primary" },
        { id: "other", label: "No, elegir otro trámite" },
        { id: "back", label: "Volver atrás" },
        { id: "menu", label: "Volver al menú" },
      ],
    );
  },
  "req-result": (s) => {
    const p = PROCEDURES.find((x) => x.id === s.collected.procedureId)!;
    return nawi(
      s,
      `Encontré el trámite: ${p.name}. Esta información es pública y no requiere validar identidad. ¿Qué quieres hacer ahora?`,
      [
        { id: "start", label: "Iniciar este trámite", tone: "primary" },
        { id: "other", label: "Consultar otro trámite" },
        { id: "menu", label: "Volver al menú" },
        { id: "human", label: "Hablar con una persona" },
      ],
      { card: { kind: "requirements", procedure: p }, simulatedNote: true },
    );
  },

  "start-explain": (s) =>
    nawi(
      s,
      "Para iniciar un trámite a tu nombre, primero debo proteger tus datos y validar tu identidad. Te guiaré paso a paso.",
      [
        { id: "ok", label: "Continuar", tone: "primary" },
        { id: "back", label: "Volver al menú" },
      ],
    ),
  privacy: (s) =>
    nawi(
      s,
      "Aviso de privacidad. Para ayudarte con tu trámite, usaré tu nombre, DNI y, si corresponde, número de expediente. Solo se usarán para esta atención simulada. ¿Aceptas continuar?",
      [
        { id: "accept", label: "Sí, acepto", tone: "primary" },
        { id: "reject", label: "No acepto", tone: "danger" },
        { id: "repeat", label: "Repetir aviso" },
        { id: "back", label: "Volver atrás" },
      ],
    ),
  "ask-name": (s) => ({
    id: id(),
    from: "nawi",
    text: "Dime tus nombres y apellidos completos.",
    spoken:
      s.channel === "web"
        ? "Dime tus nombres y apellidos completos. Puedes hablar, escribir o usar el teclado. Ahora puedes hablar."
        : "Dime tus nombres y apellidos completos. Puedes responder escribiendo o enviando una nota de voz.",
    options: [
      { id: "demo", label: `Usar dato demo: ${DEMO_CITIZEN.fullName}` },
      { id: "cancel", label: "Cancelar", tone: "danger" },
    ],
    at: now(),
  }),
  "confirm-name": (s) =>
    nawi(s, `Entendí: ${s.collected.fullName}. ¿Es correcto?`, [
      { id: "yes", label: "Sí, es correcto", tone: "primary" },
      { id: "no", label: "No, corregir nombre" },
      { id: "repeat", label: "Repetir dato" },
      { id: "cancel", label: "Cancelar", tone: "danger" },
    ]),
  "ask-dni": (s) => ({
    id: id(),
    from: "nawi",
    text: "Ahora dime tu DNI de ocho dígitos.",
    spoken:
      s.channel === "web"
        ? "Ahora dime tu DNI de ocho dígitos. Ahora puedes hablar."
        : "Ahora dime tu DNI de ocho dígitos. Puedes responder escribiendo o enviando una nota de voz.",
    options: [
      { id: "demo", label: `Usar DNI demo: ${DEMO_CITIZEN.dni}` },
      { id: "cancel", label: "Cancelar", tone: "danger" },
    ],
    at: now(),
  }),
  "confirm-dni": (s) =>
    nawi(
      s,
      `Entendí el DNI: ${s.collected.dni}. Te lo repito dígito por dígito: ${digitByDigit(
        s.collected.dni ?? "",
        s.language,
      )}. ¿Es correcto?`,
      [
        { id: "yes", label: "Sí, es correcto", tone: "primary" },
        { id: "no", label: "No, corregir DNI" },
        { id: "repeat", label: "Repetir DNI" },
        { id: "cancel", label: "Cancelar", tone: "danger" },
      ],
    ),
  "identity-summary": (s) =>
    nawi(
      s,
      `Entonces, la atención quedará vinculada a: ${s.collected.fullName}, con DNI ${s.collected.dni}. Para proteger tus datos, ahora validaremos tu identidad con la cámara. ¿Deseas continuar?`,
      [
        { id: "yes", label: "Sí, validar identidad", tone: "primary" },
        { id: "fix-name", label: "Corregir nombre" },
        { id: "fix-dni", label: "Corregir DNI" },
        { id: "cancel", label: "Cancelar", tone: "danger" },
      ],
    ),
  "facial-consent": (s) =>
    nawi(
      s,
      "Validación facial simulada para demostración. Este prototipo no compara tu rostro con RENIEC ni con una base oficial. No se guardarán imágenes ni datos biométricos reales. ¿Aceptas continuar?",
      [
        { id: "yes", label: "Sí, validar identidad", tone: "primary" },
        { id: "nocam", label: "No puedo usar cámara" },
        { id: "no", label: "No acepto", tone: "danger" },
        { id: "back", label: "Volver atrás" },
      ],
    ),
  "facial-module": (s) =>
    nawi(s, "Abriendo módulo de validación facial simulado…", []),
  "facial-result": (s) =>
    nawi(s, "Identidad validada para esta demo.", [
      { id: "continue", label: "Continuar", tone: "primary" },
    ]),
  "post-validation": (s) => {
    if (s.flowOrigin === "status") {
      return nawi(
        s,
        `Identidad validada para esta demo. Buscaré trámites vinculados a ${s.confirmed.fullName}, DNI ${s.confirmed.dni}. ¿Tienes tu número de expediente?`,
        [
          { id: "have", label: "Sí, dictar expediente" },
          { id: "no-have", label: "No lo tengo, buscar mis trámites vinculados" },
          { id: "menu", label: "Volver al menú" },
          { id: "human", label: "Hablar con una persona" },
        ],
      );
    }
    const pid = s.collected.procedureId;
    if (pid) {
      const p = PROCEDURES.find((x) => x.id === pid)!;
      return nawi(
        s,
        `Identidad validada para esta demo. Continuaremos con: ${p.name}, a nombre de ${s.confirmed.fullName}, DNI ${s.confirmed.dni}. ¿Es correcto?`,
        [
          { id: "yes", label: "Sí, continuar", tone: "primary" },
          { id: "other", label: "No, elegir otro trámite" },
          { id: "reqs", label: "Consultar requisitos primero" },
          { id: "back", label: "Volver atrás" },
        ],
      );
    }
    return nawi(s, "¿Qué trámite quieres iniciar?", [
      ...PROCEDURES.map((p) => ({ id: p.id, label: p.name, synonyms: [p.name.toLowerCase()] })),
      { id: "no-se", label: "No sé cuál necesito" },
    ]);
  },
  "choose-procedure": (s) =>
    nawi(s, "¿Qué trámite quieres iniciar?", [
      ...PROCEDURES.map((p) => ({ id: p.id, label: p.name })),
      { id: "no-se", label: "No sé cuál necesito" },
    ]),
  "show-requirements": (s) => {
    const p = PROCEDURES.find((x) => x.id === s.collected.procedureId)!;
    return nawi(
      s,
      `Antes de iniciar, estos son los requisitos de ${p.name}. ¿Quieres continuar con este trámite?`,
      [
        { id: "yes", label: "Sí, continuar", tone: "primary" },
        { id: "other", label: "Consultar otro trámite" },
        { id: "back", label: "Volver atrás" },
        { id: "cancel", label: "Cancelar", tone: "danger" },
      ],
      { card: { kind: "requirements", procedure: p } },
    );
  },
  "ask-motivo": (s) => ({
    id: id(),
    from: "nawi",
    text: "Cuéntame brevemente el motivo de tu solicitud.",
    spoken:
      s.channel === "web"
        ? "Cuéntame brevemente el motivo de tu solicitud. Ahora puedes hablar."
        : "Cuéntame brevemente el motivo de tu solicitud. Puedes responder por texto o enviando una nota de voz.",
    options: [
      { id: "demo", label: "Usar motivo demo" },
      { id: "skip", label: "Sin motivo específico" },
    ],
    at: now(),
  }),
  "ask-attachment": (s) =>
    nawi(s, "¿Deseas adjuntar un documento simulado a este trámite?", [
      { id: "yes", label: "Sí, adjuntar (simulado)", tone: "primary" },
      { id: "no", label: "No adjuntar" },
    ]),
  "final-summary": (s) => {
    const p = PROCEDURES.find((x) => x.id === s.collected.procedureId)!;
    return nawi(
      s,
      "Antes de enviar, voy a revisar tus datos. ¿Está todo correcto?",
      [
        { id: "send", label: "Sí, enviar", tone: "primary" },
        { id: "fix", label: "Corregir un dato" },
        { id: "repeat", label: "Repetir resumen" },
        { id: "cancel", label: "Cancelar", tone: "danger" },
      ],
      { card: { kind: "summary", data: s.confirmed, proc: p }, simulatedNote: true },
    );
  },
  submitted: (s) => {
    const p = PROCEDURES.find((x) => x.id === s.collected.procedureId)!;
    const fileNumber = "EXP-0512-2026";
    return nawi(
      s,
      `Listo. Tu solicitud fue registrada en esta demo. Tu número de expediente simulado es: ${fileNumber}. Guarda este número para consultar el estado de tu trámite.`,
      [
        { id: "status", label: "Ver estado ahora", tone: "primary" },
        { id: "copy", label: "Copiar número de expediente" },
        { id: "menu", label: "Volver al menú" },
        { id: "human", label: "Hablar con una persona" },
      ],
      {
        card: { kind: "receipt", fileNumber, proc: p, data: s.confirmed },
        simulatedNote: true,
      },
    );
  },

  "status-explain": (s) =>
    nawi(
      s,
      "Para mostrar el estado de un trámite necesito validar tu identidad, porque esta información puede ser personal.",
      [
        { id: "ok", label: "Continuar", tone: "primary" },
        { id: "menu", label: "Volver al menú" },
      ],
    ),
  "status-have-file": (s) =>
    nawi(s, "¿Tienes tu número de expediente?", [
      { id: "have", label: "Sí, dictar expediente" },
      { id: "no-have", label: "No lo tengo, buscar mis trámites" },
      { id: "menu", label: "Volver al menú" },
      { id: "human", label: "Hablar con una persona" },
    ]),
  "status-ask-file": (s) => ({
    id: id(),
    from: "nawi",
    text: "Dime tu número de expediente. Formato: EXP guión cuatro dígitos guión año.",
    spoken:
      s.channel === "web"
        ? "Dime tu número de expediente. Ahora puedes hablar."
        : "Dime tu número de expediente. Puedes responder por texto o nota de voz.",
    options: [
      { id: "demo", label: "Usar EXP-0512-2026 (demo)" },
      { id: "demo2", label: "Usar EXP-9999-2026 (no vinculado)" },
      { id: "back", label: "Volver atrás" },
    ],
    at: now(),
  }),
  "status-confirm-file": (s) =>
    nawi(s, `Entendí el expediente: ${s.collected.fileNumber}. ¿Es correcto?`, [
      { id: "yes", label: "Sí, consultar ese expediente", tone: "primary" },
      { id: "no", label: "No, corregir expediente" },
      { id: "back", label: "Volver atrás" },
    ]),
  "status-show": (s) => {
    const f = SIM_FILES.find((x) => x.number === s.collected.fileNumber);
    if (!f) {
      return nawi(s, "No encontré ese expediente en la demo.", [
        { id: "retry", label: "Intentar otra vez" },
        { id: "menu", label: "Volver al menú" },
      ]);
    }
    if (f.ownerDni !== s.confirmed.dni) {
      return nawi(
        s,
        "Por privacidad, no puedo mostrar información de un expediente que no está vinculado a tu identidad validada.",
        [
          { id: "other", label: "Consultar otro expediente" },
          { id: "list", label: "Buscar mis trámites" },
          { id: "menu", label: "Volver al menú" },
          { id: "human", label: "Hablar con una persona" },
        ],
      );
    }
    const opts: Option[] = [
      { id: "last", label: "Ver último movimiento" },
      { id: "other", label: "Consultar otro expediente" },
      { id: "menu", label: "Volver al menú" },
      { id: "human", label: "Hablar con una persona" },
    ];
    if (f.status === "Observado") opts.unshift({ id: "fix", label: "Corregir ahora", tone: "primary" });
    return nawi(
      s,
      `Tu trámite ${f.procedureName}, expediente ${f.number}, está ${f.status}.`,
      opts,
      { card: { kind: "file-status", file: f }, simulatedNote: true },
    );
  },
  "status-list": (s) => {
    const mine = SIM_FILES.filter((f) => f.ownerDni === s.confirmed.dni);
    return nawi(
      s,
      `Encontré ${mine.length} trámites vinculados a ${s.confirmed.fullName}. Elige uno para ver el detalle.`,
      [
        ...mine.map((f) => ({
          id: f.number,
          label: `${f.number} — ${f.procedureName} — ${f.status}`,
        })),
        { id: "other", label: "Consultar otro expediente" },
        { id: "menu", label: "Volver al menú" },
      ],
      { card: { kind: "file-list", files: mine }, simulatedNote: true },
    );
  },

  observed: (s) => {
    const f = SIM_FILES.find((x) => x.number === s.collected.fileNumber)!;
    return nawi(
      s,
      `Tu trámite fue observado. ${f.observation ?? ""} Puedes corregirlo desde aquí.`,
      [
        { id: "fix", label: "Corregir ahora", tone: "primary" },
        { id: "repeat", label: "Repetir observación" },
        { id: "human", label: "Hablar con una persona" },
        { id: "menu", label: "Volver al menú" },
      ],
    );
  },
  "correct-attach": (s) =>
    nawi(
      s,
      "Para subsanar, simula adjuntar el documento solicitado. ¿Deseas adjuntar la solicitud simple firmada?",
      [
        { id: "yes", label: "Sí, adjuntar (simulado)", tone: "primary" },
        { id: "describe", label: "Describir corrección por voz" },
        { id: "back", label: "Volver atrás" },
        { id: "cancel", label: "Cancelar", tone: "danger" },
      ],
    ),
  "correct-done": (s) =>
    nawi(s, "Subsanación registrada en esta demo.", [
      { id: "status", label: "Ver estado actualizado", tone: "primary" },
      { id: "menu", label: "Volver al menú" },
      { id: "human", label: "Hablar con una persona" },
    ]),

  "human-support": (s) =>
    nawi(
      s,
      "Puedo orientarte con datos de contacto de Mesa de Partes. Atención: lunes a viernes, 8:00 a.m. a 4:30 p.m. Teléfono referencial para demo: 084-000000.",
      [
        { id: "menu", label: "Volver al menú", tone: "primary" },
        { id: "req", label: "Consultar requisitos" },
        { id: "retry", label: "Reintentar validación" },
        { id: "end", label: "Finalizar" },
      ],
    ),

  notification: (s) => {
    const f = SIM_FILES.find((x) => x.number === "EXP-0512-2026")!;
    return nawi(
      s,
      `Novedad en tu trámite: el expediente ${f.number} tiene una actualización.`,
      [
        { id: "details", label: "Ver detalles", tone: "primary" },
        { id: "menu", label: "Volver al menú" },
        { id: "human", label: "Hablar con una persona" },
      ],
      { card: { kind: "notification", file: f }, simulatedNote: true },
    );
  },

  cancelled: (s) =>
    nawi(s, "Proceso cancelado. No se envió nada.", [
      { id: "menu", label: "Volver al menú", tone: "primary" },
    ]),
};

// ---------- Engine ----------
export type EngineAction =
  | { type: "INIT"; channel: Channel }
  | { type: "SET_VOICE_MODE"; voiceMode: boolean }
  | { type: "SELECT"; optionId: string }
  | { type: "SUBMIT_TEXT"; text: string; asVoiceNote?: boolean }
  | { type: "FACIAL_RESULT"; success: boolean }
  | { type: "PUSH_NAWI"; turn: Turn }
  | { type: "GOTO"; step: Step }
  | { type: "RESET" }
  | { type: "TRIGGER_NOTIFICATION" };

function pushNawi(state: AgentState, step: Step): AgentState {
  const turn = buildTurnFor({ ...state, step }, step);
  const history =
    state.step !== step && state.step !== "facial-module"
      ? [...state.history, state.step]
      : state.history;
  return {
    ...state,
    step,
    history,
    turns: [...state.turns, turn],
    currentOptions: turn.options ?? [],
    unclearCount: 0,
    facialModuleOpen: step === "facial-module",
  };
}

function pushUser(state: AgentState, text: string, asVoiceNote = false): AgentState {
  return {
    ...state,
    turns: [
      ...state.turns,
      {
        id: id(),
        from: "user",
        text,
        isVoiceNote: asVoiceNote,
        transcription: asVoiceNote ? text : undefined,
        at: now(),
      },
    ],
  };
}

function repeatLast(state: AgentState): AgentState {
  // re-issue last Ñawi turn
  const last = [...state.turns].reverse().find((t) => t.from === "nawi");
  if (!last) return state;
  return pushNawi(state, state.step);
}

function unclear(state: AgentState): AgentState {
  const next = state.unclearCount + 1;
  const baseTurn: Turn = {
    id: id(),
    from: "nawi",
    text:
      next === 1
        ? "No logré identificar tu respuesta. Te repito la última pregunta y las opciones disponibles."
        : next === 2
        ? "Puedes responder con el número de la opción. Por ejemplo, di ‘opción uno’ o el nombre de la opción."
        : "Parece que esta parte no está siendo clara. ¿Qué deseas hacer?",
    options:
      next >= 3
        ? [
            { id: "retry", label: "Intentar otra vez", tone: "primary" },
            { id: "menu", label: "Volver al menú" },
            { id: "human", label: "Hablar con una persona" },
          ]
        : state.currentOptions,
    at: now(),
  };
  baseTurn.spoken = buildSpokenPrompt(state.channel, baseTurn.text, baseTurn.options ?? []);
  return {
    ...state,
    turns: [...state.turns, baseTurn],
    unclearCount: next,
    currentOptions: baseTurn.options ?? state.currentOptions,
  };
}

export function reducer(state: AgentState, action: EngineAction): AgentState {
  switch (action.type) {
    case "INIT":
      return pushNawi(initialState(action.channel), "welcome");
    case "RESET":
      return pushNawi(initialState(state.channel), "welcome");
    case "SET_VOICE_MODE":
      return { ...state, voiceMode: action.voiceMode };
    case "GOTO":
      return pushNawi(state, action.step);
    case "PUSH_NAWI":
      return {
        ...state,
        turns: [...state.turns, action.turn],
        currentOptions: action.turn.options ?? state.currentOptions,
      };
    case "TRIGGER_NOTIFICATION": {
      if (state.notifiedFor) return state;
      const next = pushNawi(state, "notification");
      return { ...next, notifiedFor: "EXP-0512-2026", flowOrigin: "notification" };
    }
    case "FACIAL_RESULT": {
      const after = pushUser(state, action.success ? "[Validación exitosa]" : "[Validación fallida]");
      if (action.success) {
        const validated = { ...after, identityValidated: true, confirmed: { ...after.confirmed, fullName: after.collected.fullName, dni: after.collected.dni } };
        return pushNawi(validated, "post-validation");
      }
      return pushNawi(after, "facial-result-fail" as any) ?? after;
    }
    case "SELECT": {
      return handleSelect(state, action.optionId);
    }
    case "SUBMIT_TEXT": {
      const txt = action.text.trim();
      if (!txt) return state;
      let s = pushUser(state, txt, action.asVoiceNote);
      // global commands
      const g = classifyGlobal(txt);
      if (g === "back") return goBack(s);
      if (g === "cancel") return askCancel(s);
      if (g === "repeat") return pushNawi(s, s.step);
      if (g === "menu") return pushNawi({ ...s, history: [], collected: {} }, "menu");
      if (g === "help") return pushNawi({ ...s, flowOrigin: undefined }, "human-support");

      // step-specific text handling
      switch (s.step) {
        case "ask-name": {
          const name = txt.replace(/\s+/g, " ").trim();
          s = { ...s, collected: { ...s.collected, fullName: name } };
          return pushNawi(s, "confirm-name");
        }
        case "ask-dni": {
          const dni = extractDni(txt);
          if (!dni) {
            const t = nawi(s, "El DNI debe tener 8 dígitos. Puedes repetirlo o escribirlo nuevamente.", s.currentOptions);
            return { ...s, turns: [...s.turns, t] };
          }
          s = { ...s, collected: { ...s.collected, dni } };
          return pushNawi(s, "confirm-dni");
        }
        case "status-ask-file": {
          const fn = extractFileNumber(txt);
          if (!fn) {
            const t = nawi(s, "No reconocí el número. Formato esperado: EXP-XXXX-AAAA.", s.currentOptions);
            return { ...s, turns: [...s.turns, t] };
          }
          s = { ...s, collected: { ...s.collected, fileNumber: fn } };
          return pushNawi(s, "status-confirm-file");
        }
        case "ask-motivo": {
          s = { ...s, collected: { ...s.collected, motivo: txt }, confirmed: { ...s.confirmed, motivo: txt } };
          return pushNawi(s, "ask-attachment");
        }
        default: {
          // try matching to current options
          const optId = matchOption(txt, s.currentOptions);
          if (optId) return handleSelect(s, optId);
          if (g === "yes" && s.currentOptions.find((o) => o.id === "yes"))
            return handleSelect(s, "yes");
          if (g === "no" && s.currentOptions.find((o) => o.id === "no"))
            return handleSelect(s, "no");
          return unclear(s);
        }
      }
    }
  }
  return state;
}

function goBack(state: AgentState): AgentState {
  const prev = state.history[state.history.length - 1];
  if (!prev) return pushNawi(state, "menu");
  const history = state.history.slice(0, -1);
  return pushNawi({ ...state, history }, prev);
}

function askCancel(state: AgentState): AgentState {
  const t = nawi(
    state,
    "¿Quieres cancelar este proceso? Si cancelas, no se enviará nada.",
    [
      { id: "cancel-yes", label: "Sí, cancelar", tone: "danger" },
      { id: "cancel-no", label: "No, continuar", tone: "primary" },
      { id: "back", label: "Volver atrás" },
    ],
  );
  return { ...state, turns: [...state.turns, t], currentOptions: t.options ?? [] };
}

function handleSelect(state: AgentState, optionId: string): AgentState {
  // global controls at any step
  if (optionId === "cancel-yes")
    return pushNawi(
      { ...state, collected: {}, identityValidated: false, confirmed: {}, history: [] },
      "cancelled",
    );
  if (optionId === "cancel-no") return pushNawi(state, state.step);
  if (optionId === "back") return goBack(state);
  if (optionId === "menu")
    return pushNawi({ ...state, history: [], flowOrigin: undefined }, "menu");
  if (optionId === "repeat") return pushNawi(state, state.step);
  if (optionId === "human") return pushNawi(state, "human-support");
  if (optionId === "retry") return pushNawi(state, state.step);
  if (optionId === "end") return pushNawi(state, "cancelled");

  switch (state.step) {
    case "welcome":
      if (optionId === "voice")
        return pushNawi({ ...state, voiceMode: true }, "language");
      if (optionId === "novoice")
        return pushNawi({ ...state, voiceMode: false }, "language");
      break;
    case "language": {
      const lang: Language = optionId === "qu" ? "qu" : "es";
      const next = pushNawi({ ...state, language: lang }, "menu");
      // confirm message
      return next;
    }
    case "menu":
      if (optionId === "req")
        return pushNawi({ ...state, flowOrigin: undefined, collected: {} }, "req-ask");
      if (optionId === "start")
        return pushNawi({ ...state, flowOrigin: "start-procedure" }, "start-explain");
      if (optionId === "status")
        return pushNawi({ ...state, flowOrigin: "status" }, "status-explain");
      break;

    case "req-ask":
      if (optionId === "no-se") return pushNawi(state, "req-category");
      break;
    case "req-category": {
      const cat = optionId as any;
      if (optionId === "ninguna")
        return pushNawi(state, "human-support");
      return pushNawi({ ...state, collected: { ...state.collected, category: cat } as any }, "req-suggest");
    }
    case "req-suggest": {
      if (optionId === "ninguna") return pushNawi(state, "human-support");
      if (PROCEDURES.find((p) => p.id === optionId))
        return pushNawi({ ...state, collected: { ...state.collected, procedureId: optionId } }, "req-confirm-proc");
      break;
    }
    case "req-confirm-proc":
      if (optionId === "yes") return pushNawi(state, "req-result");
      if (optionId === "other") return pushNawi(state, "req-category");
      break;
    case "req-result":
      if (optionId === "start")
        return pushNawi({ ...state, flowOrigin: "start-procedure" }, "start-explain");
      if (optionId === "other") return pushNawi(state, "req-ask");
      if (optionId === "copy") return state;
      break;

    case "start-explain":
      if (optionId === "ok") return pushNawi(state, "privacy");
      break;
    case "privacy":
      if (optionId === "accept") return pushNawi(state, "ask-name");
      if (optionId === "reject") return pushNawi(state, "cancelled");
      if (optionId === "repeat") return pushNawi(state, "privacy");
      break;
    case "ask-name":
      if (optionId === "demo")
        return pushNawi({ ...state, collected: { ...state.collected, fullName: DEMO_CITIZEN.fullName } }, "confirm-name");
      if (optionId === "cancel") return askCancel(state);
      break;
    case "confirm-name":
      if (optionId === "yes")
        return pushNawi(
          { ...state, confirmed: { ...state.confirmed, fullName: state.collected.fullName } },
          "ask-dni",
        );
      if (optionId === "no") return pushNawi(state, "ask-name");
      if (optionId === "cancel") return askCancel(state);
      break;
    case "ask-dni":
      if (optionId === "demo")
        return pushNawi({ ...state, collected: { ...state.collected, dni: DEMO_CITIZEN.dni } }, "confirm-dni");
      if (optionId === "cancel") return askCancel(state);
      break;
    case "confirm-dni":
      if (optionId === "yes")
        return pushNawi(
          { ...state, confirmed: { ...state.confirmed, dni: state.collected.dni } },
          "identity-summary",
        );
      if (optionId === "no") return pushNawi(state, "ask-dni");
      if (optionId === "cancel") return askCancel(state);
      break;
    case "identity-summary":
      if (optionId === "yes") return pushNawi(state, "facial-consent");
      if (optionId === "fix-name") return pushNawi(state, "ask-name");
      if (optionId === "fix-dni") return pushNawi(state, "ask-dni");
      if (optionId === "cancel") return askCancel(state);
      break;
    case "facial-consent":
      if (optionId === "yes") return pushNawi(state, "facial-module");
      if (optionId === "nocam" || optionId === "no")
        return pushNawi(state, "human-support");
      break;
    case "facial-result":
      if (optionId === "continue") return pushNawi(state, "post-validation");
      break;
    case "post-validation":
      if (state.flowOrigin === "status") {
        if (optionId === "have") return pushNawi(state, "status-ask-file");
        if (optionId === "no-have") return pushNawi(state, "status-list");
      } else {
        if (optionId === "yes") return pushNawi(state, "show-requirements");
        if (optionId === "other") return pushNawi(state, "choose-procedure");
        if (optionId === "reqs") return pushNawi(state, "req-ask");
        if (PROCEDURES.find((p) => p.id === optionId))
          return pushNawi({ ...state, collected: { ...state.collected, procedureId: optionId } }, "show-requirements");
        if (optionId === "no-se") return pushNawi(state, "req-category");
      }
      break;
    case "choose-procedure":
      if (PROCEDURES.find((p) => p.id === optionId))
        return pushNawi({ ...state, collected: { ...state.collected, procedureId: optionId } }, "show-requirements");
      if (optionId === "no-se") return pushNawi(state, "req-category");
      break;
    case "show-requirements":
      if (optionId === "yes") return pushNawi(state, "ask-motivo");
      if (optionId === "other") return pushNawi(state, "choose-procedure");
      if (optionId === "cancel") return askCancel(state);
      break;
    case "ask-motivo":
      if (optionId === "demo") {
        const motivo = "Necesito el documento para un trámite laboral.";
        return pushNawi(
          { ...state, collected: { ...state.collected, motivo }, confirmed: { ...state.confirmed, motivo } },
          "ask-attachment",
        );
      }
      if (optionId === "skip")
        return pushNawi({ ...state, confirmed: { ...state.confirmed, motivo: "—" } }, "ask-attachment");
      break;
    case "ask-attachment":
      if (optionId === "yes")
        return pushNawi(
          { ...state, confirmed: { ...state.confirmed, attachment: "solicitud_simulada.pdf" } },
          "final-summary",
        );
      if (optionId === "no")
        return pushNawi({ ...state, confirmed: { ...state.confirmed, attachment: "—" } }, "final-summary");
      break;
    case "final-summary":
      if (optionId === "send") return pushNawi(state, "submitted");
      if (optionId === "fix") return pushNawi(state, "ask-motivo");
      if (optionId === "cancel") return askCancel(state);
      break;
    case "submitted":
      if (optionId === "status")
        return pushNawi(
          { ...state, flowOrigin: "status", collected: { ...state.collected, fileNumber: "EXP-0512-2026" } },
          "status-confirm-file",
        );
      if (optionId === "copy") {
        if (typeof navigator !== "undefined" && navigator.clipboard)
          navigator.clipboard.writeText("EXP-0512-2026").catch(() => {});
        return state;
      }
      break;

    case "status-explain":
      if (optionId === "ok") {
        if (state.identityValidated) return pushNawi(state, "status-have-file");
        return pushNawi(state, "privacy");
      }
      break;
    case "status-have-file":
      if (optionId === "have") return pushNawi(state, "status-ask-file");
      if (optionId === "no-have") return pushNawi(state, "status-list");
      break;
    case "status-ask-file":
      if (optionId === "demo")
        return pushNawi({ ...state, collected: { ...state.collected, fileNumber: "EXP-0512-2026" } }, "status-confirm-file");
      if (optionId === "demo2")
        return pushNawi({ ...state, collected: { ...state.collected, fileNumber: "EXP-9999-2026" } }, "status-confirm-file");
      break;
    case "status-confirm-file":
      if (optionId === "yes") return pushNawi(state, "status-show");
      if (optionId === "no") return pushNawi(state, "status-ask-file");
      break;
    case "status-show":
      if (optionId === "fix") return pushNawi(state, "correct-attach");
      if (optionId === "other") return pushNawi(state, "status-ask-file");
      if (optionId === "list") return pushNawi(state, "status-list");
      if (optionId === "last") return pushNawi(state, "status-show");
      break;
    case "status-list": {
      const f = SIM_FILES.find((x) => x.number === optionId);
      if (f) return pushNawi({ ...state, collected: { ...state.collected, fileNumber: f.number } }, "status-show");
      if (optionId === "other") return pushNawi(state, "status-ask-file");
      break;
    }
    case "correct-attach":
      if (optionId === "yes" || optionId === "describe") return pushNawi(state, "correct-done");
      if (optionId === "cancel") return askCancel(state);
      break;
    case "correct-done":
      if (optionId === "status") return pushNawi(state, "status-show");
      break;
    case "notification":
      if (optionId === "details") {
        if (!state.identityValidated)
          return pushNawi({ ...state, flowOrigin: "status", collected: { ...state.collected, fileNumber: state.notifiedFor } }, "status-explain");
        return pushNawi({ ...state, collected: { ...state.collected, fileNumber: state.notifiedFor } }, "status-show");
      }
      break;
    case "cancelled":
      if (optionId === "menu") return pushNawi({ ...state, collected: {}, history: [] }, "menu");
      break;
  }
  return state;
}
