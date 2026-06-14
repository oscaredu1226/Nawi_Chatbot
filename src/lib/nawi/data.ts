// Simulated data for the Ñawi prototype. NEVER real personal data.

export type Language = "es" | "qu";

export const DEMO_CITIZEN = {
  fullName: "Oscar Soto Zorrilla",
  dni: "41234567",
  maskedDni: "••••••67",
  phone: "+51 900 000 000",
};

export const ALT_CITIZEN = {
  fullName: "María Quispe Mamani",
  dni: "48765432",
};

export type ProcedureCategory = "constancia" | "documento" | "expediente" | "solicitud";

export type Procedure = {
  id: string;

  // Español
  name: string;
  requirements: string[];
  estimate: string;
  office: string;

  // Quechua / Runa Simi
  nameQu: string;
  requirementsQu: string[];
  estimateQu: string;
  officeQu: string;

  // Se mantiene en español porque sirve como identificador lógico interno.
  category: ProcedureCategory;
};

export const PROCEDURES: Procedure[] = [
  {
    id: "constancia-no-adeudo",
    name: "Constancia de no adeudo",
    nameQu: "Mana manu kasqanmanta constancia",
    category: "constancia",
    requirements: ["DNI vigente.", "Solicitud simple.", "Comprobante de pago, si corresponde."],
    requirementsQu: [
      "Kunan pacha DNI.",
      "Solicitud simple qillqa.",
      "Pagasqa kasqanmanta comprobante, chay kanan kaptinqa.",
    ],
    estimate: "5 días hábiles",
    estimateQu: "5 llamk'ana p'unchay",
    office: "Mesa de Partes",
    officeQu: "Mesa de Partes oficina",
  },
  {
    id: "constancia-trabajo",
    name: "Constancia de trabajo",
    nameQu: "Llamk'aymanta constancia",
    category: "constancia",
    requirements: ["DNI vigente.", "Solicitud simple.", "Última boleta de pago."],
    requirementsQu: ["Kunan pacha DNI.", "Solicitud simple qillqa.", "Qhipa pagasqa boleta."],
    estimate: "7 días hábiles",
    estimateQu: "7 llamk'ana p'unchay",
    office: "Gerencia Regional de Trabajo",
    officeQu: "Llamk'aypa Gerencia Regionalnin",
  },
  {
    id: "constancia-tramite-proceso",
    name: "Constancia de trámite en proceso",
    nameQu: "Ruray qatiq kasqanmanta constancia",
    category: "constancia",
    requirements: ["DNI vigente.", "Número de expediente en curso."],
    requirementsQu: ["Kunan pacha DNI.", "Qatiq expediente yupay."],
    estimate: "3 días hábiles",
    estimateQu: "3 llamk'ana p'unchay",
    office: "Mesa de Partes",
    officeQu: "Mesa de Partes oficina",
  },
  {
    id: "solicitud-simple",
    name: "Solicitud simple",
    nameQu: "Solicitud simple qillqa",
    category: "solicitud",
    requirements: ["DNI vigente.", "Solicitud simple dirigida al GORE Cusco."],
    requirementsQu: ["Kunan pacha DNI.", "GORE Cuscoman apachisqa solicitud simple qillqa."],
    estimate: "5 días hábiles",
    estimateQu: "5 llamk'ana p'unchay",
    office: "Mesa de Partes",
    officeQu: "Mesa de Partes oficina",
  },
];

export type FileStatus =
  | "Recibido"
  | "En revisión"
  | "Observado"
  | "Aprobado"
  | "Listo para recojo";

export type SimFile = {
  number: string;
  ownerName: string;
  ownerDni: string;
  procedureId: string;

  // Español
  procedureName: string;
  date: string;
  office: string;
  lastMovement: string;
  status: FileStatus;
  observation?: string;

  // Quechua / Runa Simi
  procedureNameQu: string;
  dateQu: string;
  officeQu: string;
  lastMovementQu: string;
  statusQu: string;
  observationQu?: string;
};

export const SIM_FILES: SimFile[] = [
  {
    number: "EXP-0512-2026",
    ownerName: DEMO_CITIZEN.fullName,
    ownerDni: DEMO_CITIZEN.dni,
    procedureId: "constancia-no-adeudo",

    procedureName: "Constancia de no adeudo",
    procedureNameQu: "Mana manu kasqanmanta constancia",

    date: "10 de junio de 2026",
    dateQu: "2026 watapi junio killapi chunka p'unchay",

    office: "Mesa de Partes",
    officeQu: "Mesa de Partes oficina",

    lastMovement: "Documento recibido y derivado para revisión",
    lastMovementQu: "Qillqa chaskisqa, hinaspa qhawarinapaq apachisqa",

    status: "En revisión",
    statusQu: "Qhawarisqachkan",
  },
  {
    number: "EXP-0440-2026",
    ownerName: DEMO_CITIZEN.fullName,
    ownerDni: DEMO_CITIZEN.dni,
    procedureId: "solicitud-simple",

    procedureName: "Solicitud simple",
    procedureNameQu: "Solicitud simple qillqa",

    date: "06 de junio de 2026",
    dateQu: "2026 watapi junio killapi suqta p'unchay",

    office: "Gerencia Regional de Trabajo",
    officeQu: "Llamk'aypa Gerencia Regionalnin",

    lastMovement: "Documento recibido",
    lastMovementQu: "Qillqa chaskisqa",

    status: "Recibido",
    statusQu: "Chaskisqa",
  },
  {
    number: "EXP-0388-2026",
    ownerName: DEMO_CITIZEN.fullName,
    ownerDni: DEMO_CITIZEN.dni,
    procedureId: "constancia-trabajo",

    procedureName: "Constancia de trabajo",
    procedureNameQu: "Llamk'aymanta constancia",

    date: "02 de junio de 2026",
    dateQu: "2026 watapi junio killapi iskay p'unchay",

    office: "Gerencia Regional de Trabajo",
    officeQu: "Llamk'aypa Gerencia Regionalnin",

    lastMovement: "Falta adjuntar la solicitud simple firmada.",
    lastMovementQu: "Solicitud simple firmasqa qillqa yapayta faltachkan.",

    status: "Observado",
    statusQu: "Qhawarisqa",

    observation: "Falta adjuntar la solicitud simple firmada.",
    observationQu: "Solicitud simple firmasqa qillqa yapayta faltachkan.",
  },
  {
    number: "EXP-9999-2026",
    ownerName: "Persona no vinculada",
    ownerDni: "00000000",
    procedureId: "solicitud-simple",

    procedureName: "Solicitud simple",
    procedureNameQu: "Solicitud simple qillqa",

    date: "01 de junio de 2026",
    dateQu: "2026 watapi junio killapi huk p'unchay",

    office: "Mesa de Partes",
    officeQu: "Mesa de Partes oficina",

    lastMovement: "Documento recibido",
    lastMovementQu: "Qillqa chaskisqa",

    status: "Recibido",
    statusQu: "Chaskisqa",
  },
];

// ---------- Helpers i18n para usar en engine.ts e InlineCard.tsx ----------
export function getProcedureName(procedure: Procedure, lang: Language = "es") {
  return lang === "qu" ? procedure.nameQu : procedure.name;
}

export function getProcedureRequirements(procedure: Procedure, lang: Language = "es") {
  return lang === "qu" ? procedure.requirementsQu : procedure.requirements;
}

export function getProcedureEstimate(procedure: Procedure, lang: Language = "es") {
  return lang === "qu" ? procedure.estimateQu : procedure.estimate;
}

export function getProcedureOffice(procedure: Procedure, lang: Language = "es") {
  return lang === "qu" ? procedure.officeQu : procedure.office;
}

export function getFileProcedureName(file: SimFile, lang: Language = "es") {
  return lang === "qu" ? file.procedureNameQu : file.procedureName;
}

export function getFileDate(file: SimFile, lang: Language = "es") {
  return lang === "qu" ? file.dateQu : file.date;
}

export function getFileOffice(file: SimFile, lang: Language = "es") {
  return lang === "qu" ? file.officeQu : file.office;
}

export function getFileLastMovement(file: SimFile, lang: Language = "es") {
  return lang === "qu" ? file.lastMovementQu : file.lastMovement;
}

export function getFileStatus(file: SimFile, lang: Language = "es") {
  return lang === "qu" ? file.statusQu : file.status;
}

export function getFileObservation(file: SimFile, lang: Language = "es") {
  return lang === "qu" ? file.observationQu : file.observation;
}

export function digitByDigit(num: string, lang: Language = "es") {
  const map: Record<string, { es: string; qu: string }> = {
    "0": { es: "cero", qu: "ch'usaq" },
    "1": { es: "uno", qu: "huk" },
    "2": { es: "dos", qu: "iskay" },
    "3": { es: "tres", qu: "kimsa" },
    "4": { es: "cuatro", qu: "tawa" },
    "5": { es: "cinco", qu: "pichqa" },
    "6": { es: "seis", qu: "suqta" },
    "7": { es: "siete", qu: "qanchis" },
    "8": { es: "ocho", qu: "pusaq" },
    "9": { es: "nueve", qu: "isqun" },
  };

  return num
    .split("")
    .map((d) => map[d]?.[lang] ?? d)
    .join(", ");
}
