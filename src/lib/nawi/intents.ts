// Global command intent classifier shared by Web and WhatsApp.

export type GlobalIntent =
  | "back"
  | "cancel"
  | "correct"
  | "help"
  | "repeat"
  | "menu"
  | "yes"
  | "no"
  | null;

const norm = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[¿¡?.!,]/g, "")
    .trim();

const includesAny = (t: string, words: string[]) =>
  words.some((w) => t === w || t.includes(w));

export function classifyGlobal(text: string): GlobalIntent {
  const t = norm(text);
  if (!t) return null;
  if (
    includesAny(t, [
      "volver atras",
      "atras",
      "volver",
      "anterior",
      "regresar",
      "me equivoque",
      "cambiar opcion",
      "elegi mal",
      "quiero cambiar",
    ])
  )
    return "back";
  if (
    includesAny(t, [
      "cancelar",
      "salir",
      "detener",
      "ya no",
      "anular",
      "empezar de nuevo",
      "reiniciar",
    ])
  )
    return "cancel";
  if (
    includesAny(t, [
      "corregir",
      "cambiar dato",
      "cambiar tramite",
      "cambiar expediente",
    ])
  )
    return "correct";
  if (
    includesAny(t, [
      "ayuda",
      "no se",
      "no entiendo",
      "hablar con una persona",
      "mesa de partes",
    ])
  )
    return "help";
  if (
    includesAny(t, [
      "repetir",
      "otra vez",
      "vuelve a leer",
      "repitelo",
      "lee de nuevo",
    ])
  )
    return "repeat";
  if (includesAny(t, ["menu", "volver al menu", "ir al menu"])) return "menu";
  if (includesAny(t, ["si", "correcto", "afirmativo", "claro", "acepto"]))
    return "yes";
  if (includesAny(t, ["no", "negativo", "incorrecto", "no acepto"])) return "no";
  return null;
}

// Match user text against an option's label, synonyms, or numbered position.
export function matchOption(
  text: string,
  options: { id: string; label: string; synonyms?: string[] }[],
): string | null {
  const t = norm(text);
  if (!t) return null;
  // Numbered "opción uno", "1", "uno", "primera"
  const numWords: Record<string, number> = {
    "uno": 1, "una": 1, "primera": 1, "primero": 1, "1": 1,
    "dos": 2, "segunda": 2, "segundo": 2, "2": 2,
    "tres": 3, "tercera": 3, "tercero": 3, "3": 3,
    "cuatro": 4, "cuarta": 4, "cuarto": 4, "4": 4,
    "cinco": 5, "quinta": 5, "quinto": 5, "5": 5,
    "seis": 6, "sexta": 6, "sexto": 6, "6": 6,
  };
  for (const [word, idx] of Object.entries(numWords)) {
    const re = new RegExp(`(^|\\s)(opcion\\s+)?${word}(\\s|$)`);
    if (re.test(t) && options[idx - 1]) return options[idx - 1].id;
  }
  // direct label / synonym match
  for (const o of options) {
    const cand = [o.label, ...(o.synonyms ?? [])].map(norm);
    if (cand.some((c) => t === c || t.includes(c) || c.includes(t))) return o.id;
  }
  return null;
}

// Best-effort DNI extraction (8 digits).
export function extractDni(text: string): string | null {
  const digits = text.replace(/[^0-9]/g, "");
  if (digits.length === 8) return digits;
  // try spoken form
  const numMap: Record<string, string> = {
    cero: "0", uno: "1", dos: "2", tres: "3", cuatro: "4",
    cinco: "5", seis: "6", siete: "7", ocho: "8", nueve: "9",
  };
  const spoken = norm(text)
    .split(/[\s,]+/)
    .map((w) => numMap[w] ?? w)
    .join("")
    .replace(/[^0-9]/g, "");
  if (spoken.length === 8) return spoken;
  return null;
}

// Best-effort file number extraction.
export function extractFileNumber(text: string): string | null {
  const m = text.toUpperCase().match(/EXP[-\s]?(\d{3,5})[-\s]?(\d{4})/);
  if (m) return `EXP-${m[1].padStart(4, "0")}-${m[2]}`;
  // spoken: "expediente cero cinco uno dos guion dos mil veintiseis"
  return null;
}
