// Simulated data for the Ñawi prototype. NEVER real personal data.
export const DEMO_CITIZEN = {
  fullName: "Óscar Soto Huamán",
  dni: "41234567",
  maskedDni: "••••••67",
  phone: "+51 900 000 000",
};

export const ALT_CITIZEN = {
  fullName: "María Quispe Mamani",
  dni: "48765432",
};

export type Procedure = {
  id: string;
  name: string;
  category: "constancia" | "documento" | "expediente" | "solicitud";
  requirements: string[];
  estimate: string;
  office: string;
};

export const PROCEDURES: Procedure[] = [
  {
    id: "constancia-no-adeudo",
    name: "Constancia de no adeudo",
    category: "constancia",
    requirements: [
      "DNI vigente.",
      "Solicitud simple.",
      "Comprobante de pago, si corresponde.",
    ],
    estimate: "5 días hábiles",
    office: "Mesa de Partes",
  },
  {
    id: "constancia-trabajo",
    name: "Constancia de trabajo",
    category: "constancia",
    requirements: ["DNI vigente.", "Solicitud simple.", "Última boleta de pago."],
    estimate: "7 días hábiles",
    office: "Gerencia Regional de Trabajo",
  },
  {
    id: "constancia-tramite-proceso",
    name: "Constancia de trámite en proceso",
    category: "constancia",
    requirements: ["DNI vigente.", "Número de expediente en curso."],
    estimate: "3 días hábiles",
    office: "Mesa de Partes",
  },
  {
    id: "solicitud-simple",
    name: "Solicitud simple",
    category: "solicitud",
    requirements: ["DNI vigente.", "Solicitud simple dirigida al GORE Cusco."],
    estimate: "5 días hábiles",
    office: "Mesa de Partes",
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
  procedureName: string;
  date: string;
  office: string;
  lastMovement: string;
  status: FileStatus;
  observation?: string;
};

export const SIM_FILES: SimFile[] = [
  {
    number: "EXP-0512-2026",
    ownerName: DEMO_CITIZEN.fullName,
    ownerDni: DEMO_CITIZEN.dni,
    procedureId: "constancia-no-adeudo",
    procedureName: "Constancia de no adeudo",
    date: "10 de junio de 2026",
    office: "Mesa de Partes",
    lastMovement: "Documento recibido y derivado para revisión",
    status: "En revisión",
  },
  {
    number: "EXP-0440-2026",
    ownerName: DEMO_CITIZEN.fullName,
    ownerDni: DEMO_CITIZEN.dni,
    procedureId: "solicitud-simple",
    procedureName: "Solicitud simple",
    date: "06 de junio de 2026",
    office: "Gerencia Regional de Trabajo",
    lastMovement: "Documento recibido",
    status: "Recibido",
  },
  {
    number: "EXP-0388-2026",
    ownerName: DEMO_CITIZEN.fullName,
    ownerDni: DEMO_CITIZEN.dni,
    procedureId: "constancia-trabajo",
    procedureName: "Constancia de trabajo",
    date: "02 de junio de 2026",
    office: "Gerencia Regional de Trabajo",
    lastMovement: "Falta adjuntar la solicitud simple firmada.",
    status: "Observado",
    observation: "Falta adjuntar la solicitud simple firmada.",
  },
  {
    number: "EXP-9999-2026",
    ownerName: "Persona no vinculada",
    ownerDni: "00000000",
    procedureId: "solicitud-simple",
    procedureName: "Solicitud simple",
    date: "01 de junio de 2026",
    office: "Mesa de Partes",
    lastMovement: "Documento recibido",
    status: "Recibido",
  },
];

export function digitByDigit(num: string, lang: "es" | "qu" = "es") {
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
