import type { ReactNode } from "react";
import type { InlineCard, Language } from "@/lib/nawi/engine";
import {
  getFileDate,
  getFileLastMovement,
  getFileObservation,
  getFileOffice,
  getFileProcedureName,
  getFileStatus,
  getProcedureEstimate,
  getProcedureName,
  getProcedureOffice,
  getProcedureRequirements,
} from "@/lib/nawi/data";
import {
  BellRing,
  Building2,
  CalendarClock,
  FileText,
  Inbox,
  MapPin,
  ShieldCheck,
} from "lucide-react";

const statusTone: Record<string, string> = {
  Recibido: "bg-info/15 text-info border-info/30",
  "En revisión": "bg-warning/15 text-warning border-warning/30",
  Observado: "bg-destructive/15 text-destructive border-destructive/30",
  Aprobado: "bg-audio/15 text-audio border-audio/30",
  "Listo para recojo": "bg-audio/15 text-audio border-audio/30",
};

function t(lang: Language, es: string, qu: string): string {
  return lang === "qu" ? qu : es;
}

export function InlineCardView({ card, lang = "es" }: { card: InlineCard; lang?: Language }) {
  if (card.kind === "requirements") {
    const p = card.procedure;

    const procedureName = getProcedureName(p, lang);
    const requirements = getProcedureRequirements(p, lang);
    const estimate = getProcedureEstimate(p, lang);
    const office = getProcedureOffice(p, lang);

    return (
      <div className="nawi-card mt-3 p-4">
        <div className="flex items-start gap-3">
          <div className="rounded-lg bg-primary/10 p-2 text-primary">
            <FileText className="h-5 w-5" />
          </div>

          <div className="flex-1">
            <div className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              {t(lang, "Requisitos", "Munasqakuna")}
            </div>
            <h3 className="text-lg font-bold text-foreground">{procedureName}</h3>
          </div>
        </div>

        <ol className="mt-3 space-y-1.5 pl-1 text-[17px]">
          {requirements.map((requirement, index) => (
            <li key={index} className="flex gap-2">
              <span className="font-bold text-primary">{index + 1}.</span>
              <span>{requirement}</span>
            </li>
          ))}
        </ol>

        <div className="mt-3 grid grid-cols-2 gap-2 text-[15px] text-muted-foreground">
          <div className="flex items-center gap-2">
            <CalendarClock className="h-4 w-4" />
            {t(lang, "Plazo", "Pacha")}: {estimate}
          </div>

          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            {office}
          </div>
        </div>

        <SimulatedTag lang={lang} />
      </div>
    );
  }

  if (card.kind === "file-status") {
    const f = card.file;

    const procedureName = getFileProcedureName(f, lang);
    const status = getFileStatus(f, lang);
    const date = getFileDate(f, lang);
    const office = getFileOffice(f, lang);
    const lastMovement = getFileLastMovement(f, lang);
    const observation = getFileObservation(f, lang);

    return (
      <div className="nawi-card mt-3 p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              {t(lang, "Expediente", "Expediente")}
            </div>
            <h3 className="text-lg font-bold text-foreground">{f.number}</h3>
            <p className="text-[15px] text-muted-foreground">{procedureName}</p>
          </div>

          <span className={`nawi-chip border ${statusTone[f.status] ?? ""}`}>{status}</span>
        </div>

        <dl className="mt-3 grid grid-cols-1 gap-2 text-[15px] sm:grid-cols-2">
          <Row
            icon={<CalendarClock className="h-4 w-4" />}
            k={t(lang, "Fecha de ingreso", "Yaykusqan p'unchay")}
            v={date}
          />

          <Row
            icon={<MapPin className="h-4 w-4" />}
            k={t(lang, "Oficina actual", "Kunan oficina")}
            v={office}
          />

          <Row
            icon={<Inbox className="h-4 w-4" />}
            k={t(lang, "Último movimiento", "Qhipa kuyuy")}
            v={lastMovement}
            className="sm:col-span-2"
          />

          {observation ? (
            <Row
              k={t(lang, "Observación", "Qhawarisqa")}
              v={observation}
              className="sm:col-span-2"
            />
          ) : null}
        </dl>

        <SimulatedTag lang={lang} />
      </div>
    );
  }

  if (card.kind === "file-list") {
    return (
      <div className="nawi-card mt-3 divide-y divide-border">
        <div className="p-4">
          <div className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            {t(lang, "Tus trámites vinculados", "Qampa watasqa ruraynikikuna")}
          </div>
        </div>

        {card.files.map((file) => {
          const procedureName = getFileProcedureName(file, lang);
          const status = getFileStatus(file, lang);

          return (
            <div key={file.number} className="flex items-center justify-between gap-3 p-4">
              <div>
                <div className="font-bold">{file.number}</div>
                <div className="text-[15px] text-muted-foreground">{procedureName}</div>
              </div>

              <span className={`nawi-chip border ${statusTone[file.status] ?? ""}`}>{status}</span>
            </div>
          );
        })}

        <div className="p-3">
          <SimulatedTag lang={lang} />
        </div>
      </div>
    );
  }

  if (card.kind === "summary") {
    const { data, proc } = card;
    const procedureName = getProcedureName(proc, lang);

    return (
      <div className="nawi-card mt-3 p-4">
        <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          <ShieldCheck className="h-4 w-4 text-audio" />
          {t(lang, "Resumen antes de enviar", "Manaraq apachispa pisiyachisqa willakuy")}
        </div>

        <dl className="mt-3 grid grid-cols-1 gap-2 text-[15px] sm:grid-cols-2">
          <Row k={t(lang, "Nombre", "Suti")} v={data.fullName ?? "—"} />
          <Row k="DNI" v={data.dni ?? "—"} />
          <Row k={t(lang, "Trámite", "Ruray")} v={procedureName} className="sm:col-span-2" />
          <Row k={t(lang, "Motivo", "Imarayku")} v={data.motivo ?? "—"} className="sm:col-span-2" />
          <Row k={t(lang, "Adjunto", "Yapasqa qillqa")} v={data.attachment ?? "—"} />
          <Row
            k={t(lang, "Identidad", "Identidad")}
            v={t(lang, "Validada para esta demo", "Kay demopaq chiqaqchasqa")}
          />
        </dl>

        <SimulatedTag lang={lang} />
      </div>
    );
  }

  if (card.kind === "receipt") {
    const procedureName = getProcedureName(card.proc, lang);
    const office = getProcedureOffice(card.proc, lang);
    const estimate = getProcedureEstimate(card.proc, lang);

    return (
      <div className="nawi-card mt-3 overflow-hidden">
        <div className="nawi-gradient-header p-4 text-primary-foreground">
          <div className="text-xs font-semibold uppercase tracking-widest opacity-80">
            {t(lang, "Constancia simulada", "Demo constancia")}
          </div>
          <div className="mt-1 text-2xl font-bold tracking-tight">{card.fileNumber}</div>
          <div className="text-sm opacity-90">{procedureName}</div>
        </div>

        <div className="p-4 text-[15px]">
          <Row k={t(lang, "A nombre de", "Sutipi")} v={card.data.fullName ?? "—"} />
          <Row k="DNI" v={card.data.dni ?? "—"} />
          <Row k={t(lang, "Oficina", "Oficina")} v={office} />
          <Row k={t(lang, "Plazo estimado", "Unay pacha")} v={estimate} />
          <SimulatedTag lang={lang} />
        </div>
      </div>
    );
  }

  if (card.kind === "notification") {
    const file = card.file;
    const procedureName = getFileProcedureName(file, lang);

    return (
      <div className="nawi-card mt-3 border-l-4 border-l-info p-4">
        <div className="flex items-start gap-3">
          <BellRing className="h-5 w-5 text-info" />

          <div>
            <div className="text-sm font-semibold text-info">
              {t(lang, "Novedad simulada", "Demo musuq willakuy")}
            </div>

            <div className="font-bold">
              {file.number} — {procedureName}
            </div>

            <p className="text-[15px] text-muted-foreground">
              {t(
                lang,
                "Hay una actualización en tu trámite.",
                "Rurayniykipi musuq willakuy kachkan.",
              )}
            </p>
          </div>
        </div>

        <SimulatedTag lang={lang} />
      </div>
    );
  }

  return null;
}

function Row({
  k,
  v,
  icon,
  className,
}: {
  k: string;
  v: string;
  icon?: ReactNode;
  className?: string;
}) {
  return (
    <div className={`flex flex-col ${className ?? ""}`}>
      <dt className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {icon}
        {k}
      </dt>
      <dd className="text-foreground">{v}</dd>
    </div>
  );
}

export function SimulatedTag({ lang = "es" }: { lang?: Language }) {
  return (
    <div className="mt-3 inline-flex items-center gap-1.5 rounded-md bg-warning/10 px-2 py-1 text-xs font-semibold text-warning">
      <span className="inline-block h-1.5 w-1.5 rounded-full bg-warning" />
      {t(lang, "Datos simulados para demostración", "Demo hinalla willakuykuna")}
    </div>
  );
}
