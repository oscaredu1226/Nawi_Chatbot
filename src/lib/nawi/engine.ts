import {
  DEMO_CITIZEN,
  PROCEDURES,
  SIM_FILES,
  digitByDigit,
  type Procedure,
  type SimFile,
} from "./data";
import { classifyGlobal, extractDni, extractFileNumber, matchOption } from "./intents";

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
  spoken?: string;
  isVoiceNote?: boolean;
  transcription?: string;
  options?: Option[];
  card?: InlineCard;
  simulatedNote?: boolean;
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
  | "language"
  | "welcome"
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
  facialModuleOpen: boolean;
  notifiedFor?: string;
  resumeAfterFacial?: Step;
  flowOrigin?: "start-procedure" | "status" | "observed" | "notification";
};

// ---------- i18n ----------
function t(lang: Language, es: string, qu: string): string {
  return lang === "qu" ? qu : es;
}

function ts(s: AgentState, es: string, qu: string): string {
  return t(s.language, es, qu);
}

const CUE_WEB_ES = "Ahora puedes decir la opción que prefieras.";
const CUE_WEB_SAY_ES = "Ahora puedes hablar.";
const CUE_WHATSAPP_ES = "Responde seleccionando una opción o escribiendo el número.";

const CUE_WEB_QU = "Kunan munasqayki akllanata niykuwaq.";
const CUE_WEB_SAY_QU = "Kunan rimayta atinki.";
const CUE_WHATSAPP_QU = "Huk akllanata akllay utaq yupayta qillqay.";

export function speakingCue(
  channel: Channel,
  kind: "say" | "options" = "options",
  lang: Language = "es",
) {
  if (lang === "qu") {
    if (channel === "web") return kind === "say" ? CUE_WEB_SAY_QU : CUE_WEB_QU;
    return CUE_WHATSAPP_QU;
  }

  if (channel === "web") return kind === "say" ? CUE_WEB_SAY_ES : CUE_WEB_ES;
  return CUE_WHATSAPP_ES;
}

export function initialState(channel: Channel): AgentState {
  return {
    channel,
    language: "es",
    voiceMode: false,
    step: "language",
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

// ---------- Helpers ----------
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
  lang: Language = "es",
): string {
  if (opts.length === 0) {
    return channel === "web" ? `${body} ${speakingCue(channel, "say", lang)}` : body;
  }

  const optionsTitle = t(lang, "Opciones disponibles:", "Akllanapaq kaykunam kachkan:");
  return [body, `${optionsTitle} ${optionsBlock(opts)}`, speakingCue(channel, cueKind, lang)].join(
    " ",
  );
}

function valueOrFallback(value: string | undefined, fallback = "no registrado"): string {
  return value && value.trim().length > 0 ? value : fallback;
}

function fileNumberForVoice(fileNumber: string, lang: Language): string {
  return fileNumber
    .split("-")
    .map((part) => {
      if (/^\d+$/.test(part)) return digitByDigit(part, lang);
      if (/^[a-zA-Z]+$/.test(part)) return part.toUpperCase().split("").join(" ");
      return part;
    })
    .join(" guion ");
}

function procedureRequirementsSpoken(p: Procedure, lang: Language): string {
  const requirements = p.requirements
    .map((req, index) =>
      t(lang, `Requisito ${index + 1}: ${req}.`, `Munasqa ${index + 1}: ${req}.`),
    )
    .join(" ");

  return [
    t(lang, `Datos del trámite ${p.name}.`, `${p.name} ruraypa willakuynin.`),
    requirements,
    t(lang, `Plazo: ${p.estimate}.`, `Pacha: ${p.estimate}.`),
    t(lang, `Oficina responsable: ${p.office}.`, `Kamachiq oficina: ${p.office}.`),
    t(lang, "Datos simulados para demostración.", "Demo hinalla willakuykuna."),
  ].join(" ");
}

function finalSummarySpoken(data: CollectedData, p: Procedure, lang: Language): string {
  return [
    t(lang, "Resumen antes de enviar.", "Manaraq apachispa pisiyachisqa willakuy."),
    t(
      lang,
      `Nombre: ${valueOrFallback(data.fullName)}.`,
      `Suti: ${valueOrFallback(data.fullName)}.`,
    ),
    t(
      lang,
      `DNI: ${data.dni ? digitByDigit(data.dni, lang) : "no registrado"}.`,
      `DNI: ${data.dni ? digitByDigit(data.dni, lang) : "mana qillqasqa"}.`,
    ),
    t(lang, `Trámite: ${p.name}.`, `Ruray: ${p.name}.`),
    t(
      lang,
      `Motivo: ${valueOrFallback(data.motivo, "sin motivo específico")}.`,
      `Imarayku: ${valueOrFallback(data.motivo, "mana sut'i imaraykuyuq")}.`,
    ),
    t(
      lang,
      `Adjunto: ${valueOrFallback(data.attachment, "sin adjunto")}.`,
      `Yapasqa qillqa: ${valueOrFallback(data.attachment, "mana yapasqa qillqayuq")}.`,
    ),
    t(lang, "Identidad: validada para esta demo.", "Identidad: kay demopaq chiqaqchasqa."),
    t(lang, "Datos simulados para demostración.", "Demo hinalla willakuykuna."),
  ].join(" ");
}

function receiptSpoken(
  fileNumber: string,
  p: Procedure,
  data: CollectedData,
  lang: Language,
): string {
  return [
    t(lang, "Constancia simulada generada.", "Demo constancia ruwasqañam."),
    t(
      lang,
      `Número de expediente: ${fileNumberForVoice(fileNumber, lang)}.`,
      `Expediente yupay: ${fileNumberForVoice(fileNumber, lang)}.`,
    ),
    t(lang, `Trámite: ${p.name}.`, `Ruray: ${p.name}.`),
    t(
      lang,
      `A nombre de: ${valueOrFallback(data.fullName)}.`,
      `Sutipi: ${valueOrFallback(data.fullName)}.`,
    ),
    t(
      lang,
      `DNI: ${data.dni ? digitByDigit(data.dni, lang) : "no registrado"}.`,
      `DNI: ${data.dni ? digitByDigit(data.dni, lang) : "mana qillqasqa"}.`,
    ),
    t(lang, `Oficina: ${p.office}.`, `Oficina: ${p.office}.`),
    t(lang, `Plazo estimado: ${p.estimate}.`, `Unay pacha: ${p.estimate}.`),
    t(lang, "Datos simulados para demostración.", "Demo hinalla willakuykuna."),
  ].join(" ");
}

function fileStatusSpoken(file: SimFile, lang: Language): string {
  return [
    t(lang, "Detalle del expediente.", "Expedientepa sut'inchaynin."),
    t(
      lang,
      `Número de expediente: ${fileNumberForVoice(file.number, lang)}.`,
      `Expediente yupay: ${fileNumberForVoice(file.number, lang)}.`,
    ),
    t(lang, `Trámite: ${file.procedureName}.`, `Ruray: ${file.procedureName}.`),
    t(lang, `Estado actual: ${file.status}.`, `Kunan kaynin: ${file.status}.`),
    t(lang, `Fecha de ingreso: ${file.date}.`, `Yaykusqan p'unchay: ${file.date}.`),
    t(lang, `Oficina actual: ${file.office}.`, `Kunan oficina: ${file.office}.`),
    t(lang, `Último movimiento: ${file.lastMovement}.`, `Qhipa kuyuy: ${file.lastMovement}.`),
    file.observation
      ? t(lang, `Observación: ${file.observation}.`, `Qhawarisqa: ${file.observation}.`)
      : "",
    t(lang, "Datos simulados para demostración.", "Demo hinalla willakuykuna."),
  ]
    .filter(Boolean)
    .join(" ");
}

function fileListSpoken(files: SimFile[], lang: Language): string {
  if (files.length === 0) {
    return t(
      lang,
      "No se encontraron trámites vinculados. Datos simulados para demostración.",
      "Manam watasqa ruraykunata tarirqanichu. Demo hinalla willakuykuna.",
    );
  }

  const items = files
    .map((file, index) =>
      t(
        lang,
        `Trámite ${index + 1}. Expediente ${fileNumberForVoice(file.number, lang)}. ${file.procedureName}. Estado: ${file.status}.`,
        `Ruray ${index + 1}. Expediente ${fileNumberForVoice(file.number, lang)}. ${file.procedureName}. Kaynin: ${file.status}.`,
      ),
    )
    .join(" ");

  return [
    t(lang, "Tus trámites vinculados.", "Qampa watasqa ruraynikikuna."),
    items,
    t(lang, "Datos simulados para demostración.", "Demo hinalla willakuykuna."),
  ].join(" ");
}

function notificationSpoken(file: SimFile, lang: Language): string {
  return [
    t(lang, "Novedad simulada.", "Demo musuq willakuy."),
    t(
      lang,
      `Expediente: ${fileNumberForVoice(file.number, lang)}.`,
      `Expediente: ${fileNumberForVoice(file.number, lang)}.`,
    ),
    t(lang, `Trámite: ${file.procedureName}.`, `Ruray: ${file.procedureName}.`),
    t(lang, `Estado actual: ${file.status}.`, `Kunan kaynin: ${file.status}.`),
    t(lang, `Oficina actual: ${file.office}.`, `Kunan oficina: ${file.office}.`),
    t(lang, `Último movimiento: ${file.lastMovement}.`, `Qhipa kuyuy: ${file.lastMovement}.`),
    file.observation
      ? t(lang, `Observación: ${file.observation}.`, `Qhawarisqa: ${file.observation}.`)
      : "",
    t(lang, "Datos simulados para demostración.", "Demo hinalla willakuykuna."),
  ]
    .filter(Boolean)
    .join(" ");
}

function inlineCardToSpoken(card: InlineCard, lang: Language): string {
  switch (card.kind) {
    case "requirements":
      return procedureRequirementsSpoken(card.procedure, lang);
    case "summary":
      return finalSummarySpoken(card.data, card.proc, lang);
    case "receipt":
      return receiptSpoken(card.fileNumber, card.proc, card.data, lang);
    case "file-status":
      return fileStatusSpoken(card.file, lang);
    case "file-list":
      return fileListSpoken(card.files, lang);
    case "notification":
      return notificationSpoken(card.file, lang);
    default:
      return "";
  }
}

type StepBuild = (s: AgentState) => Turn;

export function buildTurnFor(state: AgentState, step: Step): Turn {
  const b = STEP_BUILDERS[step];
  return b ? b(state) : nawi(state, ts(state, "Continuemos.", "Qatisun."), []);
}

function nawi(
  state: AgentState,
  text: string,
  options: Option[],
  extras: Partial<Turn> = {},
): Turn {
  const { spoken: customSpoken, ...restExtras } = extras;

  const cardSpoken = restExtras.card ? inlineCardToSpoken(restExtras.card, state.language) : "";
  const fullSpokenText = [text, cardSpoken].filter((part) => part.trim().length > 0).join(" ");

  return {
    id: id(),
    from: "nawi",
    text,
    spoken:
      customSpoken ??
      buildSpokenPrompt(state.channel, fullSpokenText, options, "options", state.language),
    options,
    at: now(),
    ...restExtras,
  };
}

const STEP_BUILDERS: Record<Step, StepBuild> = {
  language: (s) =>
    nawi(
      s,
      "Antes de comenzar, elige el idioma en el que quieres usar Ñawi. Puedes elegir Español o Quechua, también llamado Runa Simi.",
      [
        {
          id: "es",
          label: "Español",
          synonyms: ["espanol", "español", "castellano", "opcion uno", "opción uno", "uno"],
          tone: "primary",
        },
        {
          id: "qu",
          label: "Quechua / Runa Simi",
          synonyms: ["quechua", "runa simi", "runasimi", "runa", "opcion dos", "opción dos", "dos"],
        },
      ],
    ),

  welcome: (s) =>
    nawi(
      s,
      ts(
        s,
        "Hola, soy Ñawi, tu asistente digital accesible del Gobierno Regional de Cusco. Esta es una demo accesible. Ahora elige si quieres usar Ñawi con guía de voz o sin guía de voz.",
        "Allin hamusqayki. Ñawi kani, Gobierno Regional de Cusco nisqapa yanapaq digitalnin. Kayqa demo accesiblemi. Kunan akllay, Ñawita rimaywan llamk'achiyta munankichu icha mana.",
      ),
      [
        {
          id: "voice",
          label: ts(s, "Iniciar Ñawi con voz y permitir micrófono", "Ñawita rimaywan qallariy"),
          synonyms: [
            "voz",
            "con voz",
            "microfono",
            "micrófono",
            "rimay",
            "opcion uno",
            "opción uno",
            "uno",
          ],
          tone: "primary",
        },
        {
          id: "novoice",
          label: ts(s, "Usar sin guía de voz", "Rimay yanapaywan mana"),
          synonyms: [
            "sin voz",
            "sin guia",
            "sin guía",
            "mana rimay",
            "opcion dos",
            "opción dos",
            "dos",
          ],
        },
      ],
    ),

  menu: (s) =>
    nawi(
      s,
      ts(
        s,
        "Estoy aquí para ayudarte. ¿Qué deseas hacer hoy?",
        "Yanapanaypaq kaypi kani. Kunan imata ruwanayta munanki?",
      ),
      [
        {
          id: "req",
          label: ts(s, "Consultar requisitos", "Munasqakunata tapuy"),
          synonyms: ["requisitos", "munasqakuna"],
        },
        {
          id: "start",
          label: ts(s, "Iniciar trámite", "Rurayta qallariy"),
          synonyms: ["iniciar", "qallariy"],
        },
        {
          id: "status",
          label: ts(s, "Ver estado de mi trámite", "Rurayniypa kayninta qhaway"),
          synonyms: ["estado", "ver estado", "kaynin", "qhaway"],
        },
        {
          id: "human",
          label: ts(s, "Hablar con una persona", "Runawan rimay"),
          synonyms: ["persona", "humano", "runa"],
        },
      ],
    ),

  "req-ask": (s) =>
    nawi(
      s,
      ts(
        s,
        "Dime qué necesitas hacer, aunque no sepas el nombre exacto del trámite. Por ejemplo: necesito una constancia, quiero presentar un documento, o quiero hacer una solicitud.",
        "Imata ruwanayta munasqaykita niway, ruraypa sutinta mana yachaspa hinapas. Kay hina niwaq: constanciata munani, qillqata haywayta munani, utaq solicitudta ruwani.",
      ),
      [
        {
          id: "no-se",
          label: ts(s, "No sé el nombre del trámite", "Ruraypa sutinta manam yachanichu"),
          synonyms: ["no se", "mana yachanichu"],
        },
        { id: "menu", label: ts(s, "Volver al menú", "Menuman kutiy") },
      ],
    ),

  "req-category": (s) =>
    nawi(
      s,
      ts(
        s,
        "No hay problema. Te ayudaré a encontrarlo. ¿Cuál se parece más a lo que necesitas?",
        "Ama llakikuychu. Tarinaykipaq yanapasqayki. Kaykunamanta mayqinqa aswan rikch'akun?",
      ),
      [
        { id: "constancia", label: ts(s, "Necesito una constancia", "Constanciata munani") },
        {
          id: "documento",
          label: ts(s, "Quiero presentar un documento", "Qillqata haywayta munani"),
        },
        {
          id: "expediente",
          label: ts(s, "Quiero consultar un expediente", "Expedienteta tapuyta munani"),
        },
        {
          id: "solicitud",
          label: ts(s, "Quiero hacer una solicitud general", "Solicitud generalta ruwani"),
        },
        { id: "ninguna", label: ts(s, "Ninguna de estas", "Manam kaykunachu") },
      ],
    ),

  "req-suggest": (s) => {
    const cat = (s.collected as any).category as Procedure["category"] | undefined;
    const matches = cat ? PROCEDURES.filter((p) => p.category === cat) : PROCEDURES;

    return nawi(
      s,
      ts(
        s,
        "Encontré estas opciones parecidas. Elige una para ver los requisitos.",
        "Kay rikch'aq ruraykunata tarirqani. Hukninta akllay, munasqakunata qhawanaykipaq.",
      ),
      [
        ...matches.map((p) => ({ id: p.id, label: p.name, synonyms: [p.name.toLowerCase()] })),
        { id: "ninguna", label: ts(s, "Ninguna de estas", "Manam kaykunachu") },
      ],
    );
  },

  "req-confirm-proc": (s) => {
    const p = PROCEDURES.find((x) => x.id === s.collected.procedureId)!;

    return nawi(
      s,
      ts(
        s,
        `Entendí que quieres consultar: ${p.name}. ¿Es correcto?`,
        `Kayta tapuyta munanki nispa hamut'arqani: ${p.name}. Chaychu?`,
      ),
      [
        {
          id: "yes",
          label: ts(s, "Sí, ver requisitos", "Arí, munasqakunata qhaway"),
          synonyms: ["si", "sí", "ari", "arí"],
          tone: "primary",
        },
        {
          id: "other",
          label: ts(s, "No, elegir otro trámite", "Mana, huk rurayta akllay"),
          synonyms: ["no", "mana"],
        },
        { id: "back", label: ts(s, "Volver atrás", "Qhipaman kutiy") },
        { id: "menu", label: ts(s, "Volver al menú", "Menuman kutiy") },
      ],
    );
  },

  "req-result": (s) => {
    const p = PROCEDURES.find((x) => x.id === s.collected.procedureId)!;

    return nawi(
      s,
      ts(
        s,
        `Encontré el trámite: ${p.name}. Esta información es pública y no requiere validar identidad. ¿Qué quieres hacer ahora?`,
        `Kay rurayta tarirqani: ${p.name}. Kay willakuyqa llaqta willakuymi, identidadta chiqaqchayta mana munanchu. Kunan imata ruwanayta munanki?`,
      ),
      [
        {
          id: "start",
          label: ts(s, "Iniciar este trámite", "Kay rurayta qallariy"),
          tone: "primary",
        },
        { id: "other", label: ts(s, "Consultar otro trámite", "Huk rurayta tapuy") },
        { id: "menu", label: ts(s, "Volver al menú", "Menuman kutiy") },
        { id: "human", label: ts(s, "Hablar con una persona", "Runawan rimay") },
      ],
      {
        card: { kind: "requirements", procedure: p },
        simulatedNote: true,
      },
    );
  },

  "start-explain": (s) =>
    nawi(
      s,
      ts(
        s,
        "Para iniciar un trámite a tu nombre, primero debo proteger tus datos y validar tu identidad. Te guiaré paso a paso.",
        "Sutiykipi rurayta qallarinapaq, ñawpaqta willakuykikunata waqaychanaymi, hinaspa identidadniykita chiqaqchanaymi. Sapa kutillata yanapasqayki.",
      ),
      [
        { id: "ok", label: ts(s, "Continuar", "Qatiy"), tone: "primary" },
        { id: "back", label: ts(s, "Volver al menú", "Menuman kutiy") },
      ],
    ),

  privacy: (s) =>
    nawi(
      s,
      ts(
        s,
        "Aviso de privacidad. Para ayudarte con tu trámite, usaré tu nombre, DNI y, si corresponde, número de expediente. Solo se usarán para esta atención simulada. ¿Aceptas continuar?",
        "Privacidad willakuy. Yanapanaypaq sutiykita, DNIykita, hinallataq expediente yupayta llamk'achisaq. Kay demo atencionllapaqmi kanqa. Qatiyta chaskinkichu?",
      ),
      [
        {
          id: "accept",
          label: ts(s, "Sí, acepto", "Arí, chaskini"),
          synonyms: ["si", "sí", "ari", "arí"],
          tone: "primary",
        },
        {
          id: "reject",
          label: ts(s, "No acepto", "Mana chaskinichu"),
          synonyms: ["no", "mana"],
          tone: "danger",
        },
        { id: "repeat", label: ts(s, "Repetir aviso", "Willakuyta hukmanta niy") },
        { id: "back", label: ts(s, "Volver atrás", "Qhipaman kutiy") },
      ],
    ),

  "ask-name": (s) => ({
    id: id(),
    from: "nawi",
    text: ts(
      s,
      "Dime tus nombres y apellidos completos.",
      "Hunt'a sutiykita, tayta mamaykipa sutiyuq ima, niway.",
    ),
    spoken:
      s.language === "qu"
        ? s.channel === "web"
          ? "Hunt'a sutiykita, tayta mamaykipa sutiyuq ima, niway. Rimayta, qillqayta utaq teclado llamk'achiyta atinki. Kunan rimayta atinki."
          : "Hunt'a sutiykita niway. Qillqaspa utaq voz nota apachispa kutichiyta atinki."
        : s.channel === "web"
          ? "Dime tus nombres y apellidos completos. Puedes hablar, escribir o usar el teclado. Ahora puedes hablar."
          : "Dime tus nombres y apellidos completos. Puedes responder escribiendo o enviando una nota de voz.",
    options: [
      {
        id: "demo",
        label: ts(
          s,
          `Usar dato demo: ${DEMO_CITIZEN.fullName}`,
          `Demo willakuyta llamk'achiy: ${DEMO_CITIZEN.fullName}`,
        ),
      },
      { id: "cancel", label: ts(s, "Cancelar", "Saqiy"), tone: "danger" },
    ],
    at: now(),
  }),

  "confirm-name": (s) =>
    nawi(
      s,
      ts(
        s,
        `Entendí: ${s.collected.fullName}. ¿Es correcto?`,
        `Kayta hamut'arqani: ${s.collected.fullName}. Allinchu?`,
      ),
      [
        {
          id: "yes",
          label: ts(s, "Sí, es correcto", "Arí, allinmi"),
          synonyms: ["si", "sí", "ari", "arí"],
          tone: "primary",
        },
        {
          id: "no",
          label: ts(s, "No, corregir nombre", "Mana, sutita allinchay"),
          synonyms: ["no", "mana"],
        },
        { id: "repeat", label: ts(s, "Repetir dato", "Willakuyta hukmanta niy") },
        { id: "cancel", label: ts(s, "Cancelar", "Saqiy"), tone: "danger" },
      ],
    ),

  "ask-dni": (s) => ({
    id: id(),
    from: "nawi",
    text: ts(s, "Ahora dime tu DNI de ocho dígitos.", "Kunan pusaq yupayniyuq DNIykita niway."),
    spoken:
      s.language === "qu"
        ? s.channel === "web"
          ? "Kunan pusaq yupayniyuq DNIykita niway. Kunan rimayta atinki."
          : "Kunan pusaq yupayniyuq DNIykita niway. Qillqaspa utaq voz nota apachispa kutichiyta atinki."
        : s.channel === "web"
          ? "Ahora dime tu DNI de ocho dígitos. Ahora puedes hablar."
          : "Ahora dime tu DNI de ocho dígitos. Puedes responder escribiendo o enviando una nota de voz.",
    options: [
      {
        id: "demo",
        label: ts(
          s,
          `Usar DNI demo: ${DEMO_CITIZEN.dni}`,
          `Demo DNI-ta llamk'achiy: ${DEMO_CITIZEN.dni}`,
        ),
      },
      { id: "cancel", label: ts(s, "Cancelar", "Saqiy"), tone: "danger" },
    ],
    at: now(),
  }),

  "confirm-dni": (s) =>
    nawi(
      s,
      ts(
        s,
        `Entendí el DNI: ${s.collected.dni}. Te lo repito dígito por dígito: ${digitByDigit(
          s.collected.dni ?? "",
          s.language,
        )}. ¿Es correcto?`,
        `DNIykita hamut'arqani: ${s.collected.dni}. Huk yupaymanta huk yupaykama kutichisqayki: ${digitByDigit(
          s.collected.dni ?? "",
          s.language,
        )}. Allinchu?`,
      ),
      [
        {
          id: "yes",
          label: ts(s, "Sí, es correcto", "Arí, allinmi"),
          synonyms: ["si", "sí", "ari", "arí"],
          tone: "primary",
        },
        {
          id: "no",
          label: ts(s, "No, corregir DNI", "Mana, DNI-ta allinchay"),
          synonyms: ["no", "mana"],
        },
        { id: "repeat", label: ts(s, "Repetir DNI", "DNI-ta hukmanta niy") },
        { id: "cancel", label: ts(s, "Cancelar", "Saqiy"), tone: "danger" },
      ],
    ),

  "identity-summary": (s) =>
    nawi(
      s,
      ts(
        s,
        `Entonces, la atención quedará vinculada a: ${s.collected.fullName}, con DNI ${s.collected.dni}. Para proteger tus datos, ahora validaremos tu identidad con la cámara. ¿Deseas continuar?`,
        `Chaynaqa kay atencionqa kay runaman watasqa kanqa: ${s.collected.fullName}, DNI ${s.collected.dni}. Willakuykikunata waqaychanapaq, kunan identidadniykita camarawan chiqaqchasun. Qatiyta munankichu?`,
      ),
      [
        {
          id: "yes",
          label: ts(s, "Sí, validar identidad", "Arí, identidadta chiqaqchay"),
          synonyms: ["si", "sí", "ari", "arí"],
          tone: "primary",
        },
        { id: "fix-name", label: ts(s, "Corregir nombre", "Sutita allinchay") },
        { id: "fix-dni", label: ts(s, "Corregir DNI", "DNI-ta allinchay") },
        { id: "cancel", label: ts(s, "Cancelar", "Saqiy"), tone: "danger" },
      ],
    ),

  "facial-consent": (s) =>
    nawi(
      s,
      ts(
        s,
        "Validación facial simulada para demostración. Este prototipo no compara tu rostro con RENIEC ni con una base oficial. No se guardarán imágenes ni datos biométricos reales. ¿Aceptas continuar?",
        "Demo hina uya chiqaqchay. Kay prototipoqa manam uyaykita RENIEC nisqawan nitaq base oficial nisqawan tupachinchu. Manam rikch'aykunata nitaq datos biométricos reales nisqata waqaychanqachu. Qatiyta chaskinkichu?",
      ),
      [
        {
          id: "yes",
          label: ts(s, "Sí, validar identidad", "Arí, identidadta chiqaqchay"),
          synonyms: ["si", "sí", "ari", "arí"],
          tone: "primary",
        },
        {
          id: "nocam",
          label: ts(s, "No puedo usar cámara", "Manam camarata llamk'achiyta atinichu"),
        },
        {
          id: "no",
          label: ts(s, "No acepto", "Mana chaskinichu"),
          synonyms: ["no", "mana"],
          tone: "danger",
        },
        { id: "back", label: ts(s, "Volver atrás", "Qhipaman kutiy") },
      ],
    ),

  "facial-module": (s) =>
    nawi(
      s,
      ts(
        s,
        "Abriendo módulo de validación facial simulado…",
        "Demo hina uya chiqaqchay módulo kichakuchkan...",
      ),
      [],
    ),

  "facial-result": (s) =>
    nawi(
      s,
      ts(s, "Identidad validada para esta demo.", "Identidadniyki kay demopaq chiqaqchasqañam."),
      [{ id: "continue", label: ts(s, "Continuar", "Qatiy"), tone: "primary" }],
    ),

  "facial-result-fail": (s) =>
    nawi(
      s,
      ts(
        s,
        "No se pudo validar tu identidad en esta demo. Puedes reintentar, usar otro método o hablar con una persona.",
        "Kay demopi identidadniykita mana chiqaqchayta atirqanichu. Hukmanta rurayta, huk ñanta llamk'achiyta, utaq runawan rimayta atinki.",
      ),
      [
        {
          id: "retry",
          label: ts(s, "Reintentar validación", "Hukmanta chiqaqchay"),
          tone: "primary",
        },
        { id: "back", label: ts(s, "Volver atrás", "Qhipaman kutiy") },
        { id: "menu", label: ts(s, "Volver al menú", "Menuman kutiy") },
        { id: "human", label: ts(s, "Hablar con una persona", "Runawan rimay") },
      ],
    ),

  "facial-cancelled": (s) =>
    nawi(
      s,
      ts(
        s,
        "Validación cancelada. No se mostró ni envió información personal.",
        "Chiqaqchayqa saqisqam. Manam willakuy personal rikuchisqachu nitaq apachisqachu.",
      ),
      [
        {
          id: "retry",
          label: ts(s, "Reintentar validación", "Hukmanta chiqaqchay"),
          tone: "primary",
        },
        { id: "menu", label: ts(s, "Volver al menú", "Menuman kutiy") },
        { id: "human", label: ts(s, "Hablar con una persona", "Runawan rimay") },
      ],
    ),

  "post-validation": (s) => {
    if (s.flowOrigin === "status") {
      return nawi(
        s,
        ts(
          s,
          `Identidad validada para esta demo. Buscaré trámites vinculados a ${s.confirmed.fullName}, DNI ${s.confirmed.dni}. ¿Tienes tu número de expediente?`,
          `Identidadniyki kay demopaq chiqaqchasqañam. ${s.confirmed.fullName}, DNI ${s.confirmed.dni}, payman watasqa ruraykunata maskasaq. Expediente yupayniyki kanchu?`,
        ),
        [
          { id: "have", label: ts(s, "Sí, dictar expediente", "Arí, expediente yupayta niy") },
          {
            id: "no-have",
            label: ts(
              s,
              "No lo tengo, buscar mis trámites vinculados",
              "Manam kanchu, rurayniykunata maskay",
            ),
          },
          { id: "menu", label: ts(s, "Volver al menú", "Menuman kutiy") },
          { id: "human", label: ts(s, "Hablar con una persona", "Runawan rimay") },
        ],
      );
    }

    const pid = s.collected.procedureId;

    if (pid) {
      const p = PROCEDURES.find((x) => x.id === pid)!;

      return nawi(
        s,
        ts(
          s,
          `Identidad validada para esta demo. Continuaremos con: ${p.name}, a nombre de ${s.confirmed.fullName}, DNI ${s.confirmed.dni}. ¿Es correcto?`,
          `Identidadniyki kay demopaq chiqaqchasqañam. Kay ruraywan qatisun: ${p.name}, ${s.confirmed.fullName} sutipi, DNI ${s.confirmed.dni}. Allinchu?`,
        ),
        [
          {
            id: "yes",
            label: ts(s, "Sí, continuar", "Arí, qatiy"),
            synonyms: ["si", "sí", "ari", "arí"],
            tone: "primary",
          },
          { id: "other", label: ts(s, "No, elegir otro trámite", "Mana, huk rurayta akllay") },
          {
            id: "reqs",
            label: ts(s, "Consultar requisitos primero", "Ñawpaqta munasqakunata tapuy"),
          },
          { id: "back", label: ts(s, "Volver atrás", "Qhipaman kutiy") },
        ],
      );
    }

    return nawi(s, ts(s, "¿Qué trámite quieres iniciar?", "Ima rurayta qallariyta munanki?"), [
      ...PROCEDURES.map((p) => ({ id: p.id, label: p.name, synonyms: [p.name.toLowerCase()] })),
      { id: "no-se", label: ts(s, "No sé cuál necesito", "Mayqinta munasqayta manam yachanichu") },
    ]);
  },

  "choose-procedure": (s) =>
    nawi(s, ts(s, "¿Qué trámite quieres iniciar?", "Ima rurayta qallariyta munanki?"), [
      ...PROCEDURES.map((p) => ({ id: p.id, label: p.name })),
      { id: "no-se", label: ts(s, "No sé cuál necesito", "Mayqinta munasqayta manam yachanichu") },
    ]),

  "show-requirements": (s) => {
    const p = PROCEDURES.find((x) => x.id === s.collected.procedureId)!;

    return nawi(
      s,
      ts(
        s,
        `Antes de iniciar, estos son los requisitos de ${p.name}. ¿Quieres continuar con este trámite?`,
        `${p.name} rurayta qallarinapaq kay munasqakunam kachkan. Kay ruraywan qatiyta munankichu?`,
      ),
      [
        {
          id: "yes",
          label: ts(s, "Sí, continuar", "Arí, qatiy"),
          synonyms: ["si", "sí", "ari", "arí"],
          tone: "primary",
        },
        { id: "other", label: ts(s, "Consultar otro trámite", "Huk rurayta tapuy") },
        { id: "back", label: ts(s, "Volver atrás", "Qhipaman kutiy") },
        { id: "cancel", label: ts(s, "Cancelar", "Saqiy"), tone: "danger" },
      ],
      {
        card: { kind: "requirements", procedure: p },
      },
    );
  },

  "ask-motivo": (s) => ({
    id: id(),
    from: "nawi",
    text: ts(
      s,
      "Cuéntame brevemente el motivo de tu solicitud.",
      "Mañakuyki imarayku kasqanta pisillata willaway.",
    ),
    spoken:
      s.language === "qu"
        ? s.channel === "web"
          ? "Mañakuyki imarayku kasqanta pisillata willaway. Kunan rimayta atinki."
          : "Mañakuyki imarayku kasqanta pisillata willaway. Qillqaspa utaq voz nota apachispa kutichiyta atinki."
        : s.channel === "web"
          ? "Cuéntame brevemente el motivo de tu solicitud. Ahora puedes hablar."
          : "Cuéntame brevemente el motivo de tu solicitud. Puedes responder por texto o enviando una nota de voz.",
    options: [
      { id: "demo", label: ts(s, "Usar motivo demo", "Demo imaraykuta llamk'achiy") },
      { id: "skip", label: ts(s, "Sin motivo específico", "Mana sut'i imaraykuyuq") },
    ],
    at: now(),
  }),

  "ask-attachment": (s) =>
    nawi(
      s,
      ts(
        s,
        "¿Deseas adjuntar un documento simulado a este trámite?",
        "Kay rurayman huk demo qillqata yapayta munankichu?",
      ),
      [
        {
          id: "yes",
          label: ts(s, "Sí, adjuntar (simulado)", "Arí, qillqata yapay demo hina"),
          synonyms: ["si", "sí", "ari", "arí"],
          tone: "primary",
        },
        {
          id: "no",
          label: ts(s, "No adjuntar", "Ama qillqata yapaychu"),
          synonyms: ["no", "mana"],
        },
      ],
    ),

  "final-summary": (s) => {
    const p = PROCEDURES.find((x) => x.id === s.collected.procedureId)!;

    return nawi(
      s,
      ts(
        s,
        "Antes de enviar, voy a revisar tus datos. ¿Está todo correcto?",
        "Manaraq apachispa, willakuykikunata qhawasaq. Llapan allinchu?",
      ),
      [
        {
          id: "send",
          label: ts(s, "Sí, enviar", "Arí, apachiy"),
          synonyms: ["si", "sí", "ari", "arí"],
          tone: "primary",
        },
        { id: "fix", label: ts(s, "Corregir un dato", "Huk willakuyta allinchay") },
        { id: "repeat", label: ts(s, "Repetir resumen", "Pisiyachisqa willakuyta hukmanta niy") },
        { id: "cancel", label: ts(s, "Cancelar", "Saqiy"), tone: "danger" },
      ],
      {
        card: { kind: "summary", data: s.confirmed, proc: p },
        simulatedNote: true,
      },
    );
  },

  submitted: (s) => {
    const p = PROCEDURES.find((x) => x.id === s.collected.procedureId)!;
    const fileNumber = "EXP-0512-2026";

    return nawi(
      s,
      ts(
        s,
        `Listo. Tu solicitud fue registrada en esta demo. Tu número de expediente simulado es: ${fileNumber}. Guarda este número para consultar el estado de tu trámite.`,
        `Listo. Mañakuyki kay demopi registrasqañam. Expediente yupay simuladoqa ${fileNumberForVoice(fileNumber, s.language)}. Kay yupayta waqaychay, rurayniykipa kayninta tapunaykipaq.`,
      ),
      [
        {
          id: "status",
          label: ts(s, "Ver estado ahora", "Kunan kayninta qhaway"),
          tone: "primary",
        },
        { id: "copy", label: ts(s, "Copiar número de expediente", "Expediente yupayta copiay") },
        { id: "menu", label: ts(s, "Volver al menú", "Menuman kutiy") },
        { id: "human", label: ts(s, "Hablar con una persona", "Runawan rimay") },
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
      ts(
        s,
        "Para mostrar el estado de un trámite necesito validar tu identidad, porque esta información puede ser personal.",
        "Huk ruraypa kayninta rikuchinaypaq identidadniykita chiqaqchanaymi, kay willakuyqa personal kanman.",
      ),
      [
        { id: "ok", label: ts(s, "Continuar", "Qatiy"), tone: "primary" },
        { id: "menu", label: ts(s, "Volver al menú", "Menuman kutiy") },
      ],
    ),

  "status-have-file": (s) =>
    nawi(s, ts(s, "¿Tienes tu número de expediente?", "Expediente yupayniyki kanchu?"), [
      { id: "have", label: ts(s, "Sí, dictar expediente", "Arí, expediente yupayta niy") },
      {
        id: "no-have",
        label: ts(s, "No lo tengo, buscar mis trámites", "Manam kanchu, rurayniykunata maskay"),
      },
      { id: "menu", label: ts(s, "Volver al menú", "Menuman kutiy") },
      { id: "human", label: ts(s, "Hablar con una persona", "Runawan rimay") },
    ]),

  "status-ask-file": (s) => ({
    id: id(),
    from: "nawi",
    text: ts(
      s,
      "Dime tu número de expediente. Formato: EXP guión cuatro dígitos guión año.",
      "Expediente yupayniykita niway. Formato: EXP guion tawa yupay guion wata.",
    ),
    spoken:
      s.language === "qu"
        ? s.channel === "web"
          ? "Expediente yupayniykita niway. Kunan rimayta atinki."
          : "Expediente yupayniykita niway. Qillqaspa utaq voz nota apachispa kutichiyta atinki."
        : s.channel === "web"
          ? "Dime tu número de expediente. Ahora puedes hablar."
          : "Dime tu número de expediente. Puedes responder por texto o nota de voz.",
    options: [
      { id: "demo", label: ts(s, "Usar EXP-0512-2026 (demo)", "EXP-0512-2026 llamk'achiy demo") },
      {
        id: "demo2",
        label: ts(s, "Usar EXP-9999-2026 (no vinculado)", "EXP-9999-2026 llamk'achiy mana watasqa"),
      },
      { id: "back", label: ts(s, "Volver atrás", "Qhipaman kutiy") },
    ],
    at: now(),
  }),

  "status-confirm-file": (s) =>
    nawi(
      s,
      ts(
        s,
        `Entendí el expediente: ${s.collected.fileNumber}. ¿Es correcto?`,
        `Kay expediente yupayta hamut'arqani: ${s.collected.fileNumber}. Allinchu?`,
      ),
      [
        {
          id: "yes",
          label: ts(s, "Sí, consultar ese expediente", "Arí, kay expedienteta tapuy"),
          synonyms: ["si", "sí", "ari", "arí"],
          tone: "primary",
        },
        {
          id: "no",
          label: ts(s, "No, corregir expediente", "Mana, expedienteta allinchay"),
          synonyms: ["no", "mana"],
        },
        { id: "back", label: ts(s, "Volver atrás", "Qhipaman kutiy") },
      ],
    ),

  "status-show": (s) => {
    const f = SIM_FILES.find((x) => x.number === s.collected.fileNumber);

    if (!f) {
      return nawi(
        s,
        ts(
          s,
          "No encontré ese expediente en la demo.",
          "Kay demopi chay expedienteta mana tarirqanichu.",
        ),
        [
          { id: "retry", label: ts(s, "Intentar otra vez", "Hukmanta kallpachakuy") },
          { id: "menu", label: ts(s, "Volver al menú", "Menuman kutiy") },
        ],
      );
    }

    if (f.ownerDni !== s.confirmed.dni) {
      return nawi(
        s,
        ts(
          s,
          "Por privacidad, no puedo mostrar información de un expediente que no está vinculado a tu identidad validada.",
          "Privacidadrayku, manam rikuchiyta atinichu kay expediente willakuyta, identidadniykiman mana watasqa kaptin.",
        ),
        [
          { id: "other", label: ts(s, "Consultar otro expediente", "Huk expedienteta tapuy") },
          { id: "list", label: ts(s, "Buscar mis trámites", "Rurayniykunata maskay") },
          { id: "menu", label: ts(s, "Volver al menú", "Menuman kutiy") },
          { id: "human", label: ts(s, "Hablar con una persona", "Runawan rimay") },
        ],
      );
    }

    const opts: Option[] = [
      { id: "last", label: ts(s, "Ver último movimiento", "Qhipa kuyuyta qhaway") },
      { id: "other", label: ts(s, "Consultar otro expediente", "Huk expedienteta tapuy") },
      { id: "menu", label: ts(s, "Volver al menú", "Menuman kutiy") },
      { id: "human", label: ts(s, "Hablar con una persona", "Runawan rimay") },
    ];

    if (f.status === "Observado") {
      opts.unshift({
        id: "fix",
        label: ts(s, "Corregir ahora", "Kunan allinchay"),
        tone: "primary",
      });
    }

    return nawi(
      s,
      ts(
        s,
        `Tu trámite ${f.procedureName}, expediente ${f.number}, está ${f.status}.`,
        `Rurayniyki ${f.procedureName}, expediente ${fileNumberForVoice(f.number, s.language)}, kayninqa ${f.status}.`,
      ),
      opts,
      {
        card: { kind: "file-status", file: f },
        simulatedNote: true,
      },
    );
  },

  "status-list": (s) => {
    const mine = SIM_FILES.filter((f) => f.ownerDni === s.confirmed.dni);

    return nawi(
      s,
      ts(
        s,
        `Encontré ${mine.length} trámites vinculados a ${s.confirmed.fullName}. Elige uno para ver el detalle.`,
        `Kaypi ${mine.length} ruraykunata tarirqani, ${s.confirmed.fullName} sutiman watasqa. Hukninta akllay sut'inchayta qhawanaykipaq.`,
      ),
      [
        ...mine.map((f) => ({
          id: f.number,
          label: `${f.number} — ${f.procedureName} — ${f.status}`,
        })),
        { id: "other", label: ts(s, "Consultar otro expediente", "Huk expedienteta tapuy") },
        { id: "menu", label: ts(s, "Volver al menú", "Menuman kutiy") },
      ],
      {
        card: { kind: "file-list", files: mine },
        simulatedNote: true,
      },
    );
  },

  observed: (s) => {
    const f = SIM_FILES.find((x) => x.number === s.collected.fileNumber)!;

    return nawi(
      s,
      ts(
        s,
        `Tu trámite fue observado. ${f.observation ?? ""} Puedes corregirlo desde aquí.`,
        `Rurayniykiqa observado kachkan. ${f.observation ?? ""} Kaymanta allinchayta atinki.`,
      ),
      [
        { id: "fix", label: ts(s, "Corregir ahora", "Kunan allinchay"), tone: "primary" },
        { id: "repeat", label: ts(s, "Repetir observación", "Qhawarisqata hukmanta niy") },
        { id: "human", label: ts(s, "Hablar con una persona", "Runawan rimay") },
        { id: "menu", label: ts(s, "Volver al menú", "Menuman kutiy") },
      ],
    );
  },

  "correct-attach": (s) =>
    nawi(
      s,
      ts(
        s,
        "Para subsanar, simula adjuntar el documento solicitado. ¿Deseas adjuntar la solicitud simple firmada?",
        "Allinchanapaq, mañakusqa qillqata demo hina yapay. Solicitud simple firmada nisqata yapayta munankichu?",
      ),
      [
        {
          id: "yes",
          label: ts(s, "Sí, adjuntar (simulado)", "Arí, yapay demo hina"),
          synonyms: ["si", "sí", "ari", "arí"],
          tone: "primary",
        },
        {
          id: "describe",
          label: ts(s, "Describir corrección por voz", "Allinchayta rimaywan willay"),
        },
        { id: "back", label: ts(s, "Volver atrás", "Qhipaman kutiy") },
        { id: "cancel", label: ts(s, "Cancelar", "Saqiy"), tone: "danger" },
      ],
    ),

  "correct-done": (s) =>
    nawi(
      s,
      ts(s, "Subsanación registrada en esta demo.", "Subsanación kay demopi registrasqañam."),
      [
        {
          id: "status",
          label: ts(s, "Ver estado actualizado", "Musuq kayninta qhaway"),
          tone: "primary",
        },
        { id: "menu", label: ts(s, "Volver al menú", "Menuman kutiy") },
        { id: "human", label: ts(s, "Hablar con una persona", "Runawan rimay") },
      ],
    ),

  "human-support": (s) =>
    nawi(
      s,
      ts(
        s,
        "Puedo orientarte con datos de contacto de Mesa de Partes. Atención: lunes a viernes, 8:00 a.m. a 4:30 p.m. Teléfono referencial para demo: 084-000000.",
        "Mesa de Partes nisqapa willakuyninwan yanapayta atini. Atencionqa lunesmanta vierneskama, pusaq pacha tutamanta tawa treinta tardekama. Demo telefonoqa cero ocho cuatro, cero cero cero cero cero cero.",
      ),
      [
        { id: "menu", label: ts(s, "Volver al menú", "Menuman kutiy"), tone: "primary" },
        { id: "req", label: ts(s, "Consultar requisitos", "Munasqakunata tapuy") },
        { id: "retry", label: ts(s, "Reintentar validación", "Hukmanta chiqaqchay") },
        { id: "end", label: ts(s, "Finalizar", "Tukuy") },
      ],
    ),

  notification: (s) => {
    const f = SIM_FILES.find((x) => x.number === "EXP-0512-2026")!;

    return nawi(
      s,
      ts(
        s,
        `Novedad en tu trámite: el expediente ${f.number} tiene una actualización.`,
        `Rurayniykipi musuq willakuy kachkan: expediente ${fileNumberForVoice(f.number, s.language)} huk musuq willakuyuqmi.`,
      ),
      [
        { id: "details", label: ts(s, "Ver detalles", "Sut'inchayta qhaway"), tone: "primary" },
        { id: "menu", label: ts(s, "Volver al menú", "Menuman kutiy") },
        { id: "human", label: ts(s, "Hablar con una persona", "Runawan rimay") },
      ],
      {
        card: { kind: "notification", file: f },
        simulatedNote: true,
      },
    );
  },

  cancelled: (s) =>
    nawi(
      s,
      ts(
        s,
        "Proceso cancelado. No se envió nada.",
        "Procesoqa saqisqam. Manam imapas apachisqachu.",
      ),
      [{ id: "menu", label: ts(s, "Volver al menú", "Menuman kutiy"), tone: "primary" }],
    ),
};

// ---------- Engine ----------
export type EngineAction =
  | { type: "INIT"; channel: Channel }
  | { type: "SET_VOICE_MODE"; voiceMode: boolean }
  | { type: "SELECT"; optionId: string }
  | { type: "SUBMIT_TEXT"; text: string; asVoiceNote?: boolean }
  | { type: "FACIAL_RESULT"; success: boolean }
  | { type: "FACIAL_CANCEL" }
  | { type: "FACIAL_PIN_SUCCESS" }
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

function unclear(state: AgentState): AgentState {
  const next = state.unclearCount + 1;

  const baseTurn: Turn = {
    id: id(),
    from: "nawi",
    text:
      next === 1
        ? ts(
            state,
            "No logré identificar tu respuesta. Te repito la última pregunta y las opciones disponibles.",
            "Manam kutichisqaykita riqsiyta atirqanichu. Qhipa tapukuyta akllanakunawan kuska hukmanta nisqayki.",
          )
        : next === 2
          ? ts(
              state,
              "Puedes responder con el número de la opción. Por ejemplo, di ‘opción uno’ o el nombre de la opción.",
              "Akllanapaq yupayta niyta atinki. Kay hina: opción uno, utaq akllanapa sutinta.",
            )
          : ts(
              state,
              "Parece que esta parte no está siendo clara. ¿Qué deseas hacer?",
              "Kay chiqaqa manachá sut'ichu kachkan. Imata ruwanayta munanki?",
            ),
    options:
      next >= 3
        ? [
            {
              id: "retry",
              label: ts(state, "Intentar otra vez", "Hukmanta kallpachakuy"),
              tone: "primary",
            },
            { id: "menu", label: ts(state, "Volver al menú", "Menuman kutiy") },
            { id: "human", label: ts(state, "Hablar con una persona", "Runawan rimay") },
          ]
        : state.currentOptions,
    at: now(),
  };

  baseTurn.spoken = buildSpokenPrompt(
    state.channel,
    baseTurn.text,
    baseTurn.options ?? [],
    "options",
    state.language,
  );

  return {
    ...state,
    turns: [...state.turns, baseTurn],
    unclearCount: next,
    currentOptions: baseTurn.options ?? state.currentOptions,
  };
}

export function reducer(state: AgentState, action: EngineAction): AgentState {
  switch (action.type) {
    case "INIT": {
      const base = initialState(action.channel);
      return pushNawi(base, "language");
    }

    case "RESET": {
      const base = initialState(state.channel);
      return pushNawi(base, "language");
    }

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
      const after = pushUser(
        { ...state, facialModuleOpen: false },
        action.success ? "[Validación facial exitosa]" : "[Validación facial fallida]",
      );

      if (action.success) {
        const validated = {
          ...after,
          identityValidated: true,
          confirmed: {
            ...after.confirmed,
            fullName: after.collected.fullName,
            dni: after.collected.dni,
          },
        };

        return pushNawi(validated, "post-validation");
      }

      return pushNawi(after, "facial-result-fail");
    }

    case "FACIAL_PIN_SUCCESS": {
      const after = pushUser(
        { ...state, facialModuleOpen: false },
        "[Identidad validada por PIN simulado]",
      );

      const validated = {
        ...after,
        identityValidated: true,
        confirmed: {
          ...after.confirmed,
          fullName: after.collected.fullName,
          dni: after.collected.dni,
        },
      };

      return pushNawi(validated, "post-validation");
    }

    case "FACIAL_CANCEL": {
      const after = pushUser(
        { ...state, facialModuleOpen: false },
        "[Validación cancelada por el usuario]",
      );

      return pushNawi(after, "facial-cancelled");
    }

    case "SELECT": {
      return handleSelect(state, action.optionId);
    }

    case "SUBMIT_TEXT": {
      const txt = action.text.trim();
      if (!txt) return state;

      let s = pushUser(state, txt, action.asVoiceNote);

      const g = classifyGlobal(txt);

      if (g === "back") return goBack(s);
      if (g === "cancel") return askCancel(s);
      if (g === "repeat") return pushNawi(s, s.step);
      if (g === "menu") return pushNawi({ ...s, history: [], collected: {} }, "menu");
      if (g === "help") return pushNawi({ ...s, flowOrigin: undefined }, "human-support");

      switch (s.step) {
        case "ask-name": {
          const name = txt.replace(/\s+/g, " ").trim();
          s = { ...s, collected: { ...s.collected, fullName: name } };
          return pushNawi(s, "confirm-name");
        }

        case "ask-dni": {
          const dni = extractDni(txt);

          if (!dni) {
            const t = nawi(
              s,
              ts(
                s,
                "El DNI debe tener 8 dígitos. Puedes repetirlo o escribirlo nuevamente.",
                "DNIqa pusaq yupayniyuq kanan. Hukmanta niyta utaq qillqayta atinki.",
              ),
              s.currentOptions,
            );

            return { ...s, turns: [...s.turns, t] };
          }

          s = { ...s, collected: { ...s.collected, dni } };
          return pushNawi(s, "confirm-dni");
        }

        case "status-ask-file": {
          const fn = extractFileNumber(txt);

          if (!fn) {
            const t = nawi(
              s,
              ts(
                s,
                "No reconocí el número. Formato esperado: EXP-XXXX-AAAA.",
                "Manam yupayta riqsirqanichu. Formatoqa kay hinam kanan: EXP-XXXX-AAAA.",
              ),
              s.currentOptions,
            );

            return { ...s, turns: [...s.turns, t] };
          }

          s = { ...s, collected: { ...s.collected, fileNumber: fn } };
          return pushNawi(s, "status-confirm-file");
        }

        case "ask-motivo": {
          s = {
            ...s,
            collected: { ...s.collected, motivo: txt },
            confirmed: { ...s.confirmed, motivo: txt },
          };

          return pushNawi(s, "ask-attachment");
        }

        default: {
          const optId = matchOption(txt, s.currentOptions);

          if (optId) return handleSelect(s, optId);

          if (g === "yes" && s.currentOptions.find((o) => o.id === "yes")) {
            return handleSelect(s, "yes");
          }

          if (g === "no" && s.currentOptions.find((o) => o.id === "no")) {
            return handleSelect(s, "no");
          }

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
    ts(
      state,
      "¿Quieres cancelar este proceso? Si cancelas, no se enviará nada.",
      "Kay procesota saqiyta munankichu? Saqispaqa manam imapas apachisqachu kanqa.",
    ),
    [
      { id: "cancel-yes", label: ts(state, "Sí, cancelar", "Arí, saqiy"), tone: "danger" },
      { id: "cancel-no", label: ts(state, "No, continuar", "Mana, qatiy"), tone: "primary" },
      { id: "back", label: ts(state, "Volver atrás", "Qhipaman kutiy") },
    ],
  );

  return { ...state, turns: [...state.turns, t], currentOptions: t.options ?? [] };
}

function handleSelect(state: AgentState, optionId: string): AgentState {
  if (optionId === "cancel-yes") {
    return pushNawi(
      { ...state, collected: {}, identityValidated: false, confirmed: {}, history: [] },
      "cancelled",
    );
  }

  if (optionId === "cancel-no") return pushNawi(state, state.step);
  if (optionId === "back") return goBack(state);

  if (optionId === "menu") {
    return pushNawi({ ...state, history: [], flowOrigin: undefined }, "menu");
  }

  if (optionId === "repeat") return pushNawi(state, state.step);
  if (optionId === "human") return pushNawi(state, "human-support");

  if (optionId === "retry") {
    if (state.step === "facial-result-fail" || state.step === "facial-cancelled") {
      return pushNawi(state, "facial-module");
    }

    return pushNawi(state, state.step);
  }

  if (optionId === "end") return pushNawi(state, "cancelled");

  switch (state.step) {
    case "language": {
      const lang: Language = optionId === "qu" ? "qu" : "es";

      if (state.channel === "web") {
        return pushNawi({ ...state, language: lang }, "welcome");
      }

      return pushNawi({ ...state, language: lang }, "menu");
    }

    case "welcome":
      if (optionId === "voice") {
        return pushNawi({ ...state, voiceMode: true }, "menu");
      }

      if (optionId === "novoice") {
        return pushNawi({ ...state, voiceMode: false }, "menu");
      }

      break;

    case "menu":
      if (optionId === "req") {
        return pushNawi({ ...state, flowOrigin: undefined, collected: {} }, "req-ask");
      }

      if (optionId === "start") {
        return pushNawi({ ...state, flowOrigin: "start-procedure" }, "start-explain");
      }

      if (optionId === "status") {
        return pushNawi({ ...state, flowOrigin: "status" }, "status-explain");
      }

      break;

    case "req-ask":
      if (optionId === "no-se") return pushNawi(state, "req-category");
      break;

    case "req-category": {
      const cat = optionId as any;

      if (optionId === "ninguna") {
        return pushNawi(state, "human-support");
      }

      return pushNawi(
        { ...state, collected: { ...state.collected, category: cat } as any },
        "req-suggest",
      );
    }

    case "req-suggest": {
      if (optionId === "ninguna") return pushNawi(state, "human-support");

      if (PROCEDURES.find((p) => p.id === optionId)) {
        return pushNawi(
          { ...state, collected: { ...state.collected, procedureId: optionId } },
          "req-confirm-proc",
        );
      }

      break;
    }

    case "req-confirm-proc":
      if (optionId === "yes") return pushNawi(state, "req-result");
      if (optionId === "other") return pushNawi(state, "req-category");
      break;

    case "req-result":
      if (optionId === "start") {
        return pushNawi({ ...state, flowOrigin: "start-procedure" }, "start-explain");
      }

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
      if (optionId === "demo") {
        return pushNawi(
          { ...state, collected: { ...state.collected, fullName: DEMO_CITIZEN.fullName } },
          "confirm-name",
        );
      }

      if (optionId === "cancel") return askCancel(state);
      break;

    case "confirm-name":
      if (optionId === "yes") {
        return pushNawi(
          { ...state, confirmed: { ...state.confirmed, fullName: state.collected.fullName } },
          "ask-dni",
        );
      }

      if (optionId === "no") return pushNawi(state, "ask-name");
      if (optionId === "cancel") return askCancel(state);
      break;

    case "ask-dni":
      if (optionId === "demo") {
        return pushNawi(
          { ...state, collected: { ...state.collected, dni: DEMO_CITIZEN.dni } },
          "confirm-dni",
        );
      }

      if (optionId === "cancel") return askCancel(state);
      break;

    case "confirm-dni":
      if (optionId === "yes") {
        return pushNawi(
          { ...state, confirmed: { ...state.confirmed, dni: state.collected.dni } },
          "identity-summary",
        );
      }

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

      if (optionId === "nocam" || optionId === "no") {
        return pushNawi(state, "human-support");
      }

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

        if (PROCEDURES.find((p) => p.id === optionId)) {
          return pushNawi(
            { ...state, collected: { ...state.collected, procedureId: optionId } },
            "show-requirements",
          );
        }

        if (optionId === "no-se") return pushNawi(state, "req-category");
      }

      break;

    case "choose-procedure":
      if (PROCEDURES.find((p) => p.id === optionId)) {
        return pushNawi(
          { ...state, collected: { ...state.collected, procedureId: optionId } },
          "show-requirements",
        );
      }

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
          {
            ...state,
            collected: { ...state.collected, motivo },
            confirmed: { ...state.confirmed, motivo },
          },
          "ask-attachment",
        );
      }

      if (optionId === "skip") {
        return pushNawi(
          { ...state, confirmed: { ...state.confirmed, motivo: "—" } },
          "ask-attachment",
        );
      }

      break;

    case "ask-attachment":
      if (optionId === "yes") {
        return pushNawi(
          { ...state, confirmed: { ...state.confirmed, attachment: "solicitud_simulada.pdf" } },
          "final-summary",
        );
      }

      if (optionId === "no") {
        return pushNawi(
          { ...state, confirmed: { ...state.confirmed, attachment: "—" } },
          "final-summary",
        );
      }

      break;

    case "final-summary":
      if (optionId === "send") return pushNawi(state, "submitted");
      if (optionId === "fix") return pushNawi(state, "ask-motivo");
      if (optionId === "cancel") return askCancel(state);
      break;

    case "submitted":
      if (optionId === "status") {
        return pushNawi(
          {
            ...state,
            flowOrigin: "status",
            collected: { ...state.collected, fileNumber: "EXP-0512-2026" },
          },
          "status-confirm-file",
        );
      }

      if (optionId === "copy") {
        if (typeof navigator !== "undefined" && navigator.clipboard) {
          navigator.clipboard.writeText("EXP-0512-2026").catch(() => {});
        }

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
      if (optionId === "demo") {
        return pushNawi(
          { ...state, collected: { ...state.collected, fileNumber: "EXP-0512-2026" } },
          "status-confirm-file",
        );
      }

      if (optionId === "demo2") {
        return pushNawi(
          { ...state, collected: { ...state.collected, fileNumber: "EXP-9999-2026" } },
          "status-confirm-file",
        );
      }

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

      if (f) {
        return pushNawi(
          { ...state, collected: { ...state.collected, fileNumber: f.number } },
          "status-show",
        );
      }

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
        if (!state.identityValidated) {
          return pushNawi(
            {
              ...state,
              flowOrigin: "status",
              collected: { ...state.collected, fileNumber: state.notifiedFor },
            },
            "status-explain",
          );
        }

        return pushNawi(
          { ...state, collected: { ...state.collected, fileNumber: state.notifiedFor } },
          "status-show",
        );
      }

      break;

    case "cancelled":
      if (optionId === "menu") {
        return pushNawi({ ...state, collected: {}, history: [] }, "menu");
      }

      break;
  }

  return state;
}
