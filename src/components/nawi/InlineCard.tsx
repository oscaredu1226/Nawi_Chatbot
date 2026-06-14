import type { InlineCard } from "@/lib/nawi/engine";
import { FileText, Building2, CalendarClock, MapPin, ShieldCheck, Inbox, BellRing } from "lucide-react";

const statusTone: Record<string, string> = {
  "Recibido": "bg-info/15 text-info border-info/30",
  "En revisión": "bg-warning/15 text-warning border-warning/30",
  "Observado": "bg-destructive/15 text-destructive border-destructive/30",
  "Aprobado": "bg-audio/15 text-audio border-audio/30",
  "Listo para recojo": "bg-audio/15 text-audio border-audio/30",
};

export function InlineCardView({ card }: { card: InlineCard }) {
  if (card.kind === "requirements") {
    const p = card.procedure;
    return (
      <div className="nawi-card mt-3 p-4">
        <div className="flex items-start gap-3">
          <div className="rounded-lg bg-primary/10 p-2 text-primary"><FileText className="h-5 w-5" /></div>
          <div className="flex-1">
            <div className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Requisitos</div>
            <h3 className="text-lg font-bold text-foreground">{p.name}</h3>
          </div>
        </div>
        <ol className="mt-3 space-y-1.5 pl-1 text-[17px]">
          {p.requirements.map((r, i) => (
            <li key={i} className="flex gap-2">
              <span className="font-bold text-primary">{i + 1}.</span>
              <span>{r}</span>
            </li>
          ))}
        </ol>
        <div className="mt-3 grid grid-cols-2 gap-2 text-[15px] text-muted-foreground">
          <div className="flex items-center gap-2"><CalendarClock className="h-4 w-4" /> Plazo: {p.estimate}</div>
          <div className="flex items-center gap-2"><Building2 className="h-4 w-4" /> {p.office}</div>
        </div>
        <SimulatedTag />
      </div>
    );
  }
  if (card.kind === "file-status") {
    const f = card.file;
    return (
      <div className="nawi-card mt-3 p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Expediente</div>
            <h3 className="text-lg font-bold text-foreground">{f.number}</h3>
            <p className="text-[15px] text-muted-foreground">{f.procedureName}</p>
          </div>
          <span className={`nawi-chip border ${statusTone[f.status] ?? ""}`}>{f.status}</span>
        </div>
        <dl className="mt-3 grid grid-cols-1 gap-2 text-[15px] sm:grid-cols-2">
          <Row icon={<CalendarClock className="h-4 w-4" />} k="Fecha de ingreso" v={f.date} />
          <Row icon={<MapPin className="h-4 w-4" />} k="Oficina actual" v={f.office} />
          <Row icon={<Inbox className="h-4 w-4" />} k="Último movimiento" v={f.lastMovement} className="sm:col-span-2" />
        </dl>
        <SimulatedTag />
      </div>
    );
  }
  if (card.kind === "file-list") {
    return (
      <div className="nawi-card mt-3 divide-y divide-border">
        <div className="p-4">
          <div className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Tus trámites vinculados</div>
        </div>
        {card.files.map((f) => (
          <div key={f.number} className="flex items-center justify-between gap-3 p-4">
            <div>
              <div className="font-bold">{f.number}</div>
              <div className="text-[15px] text-muted-foreground">{f.procedureName}</div>
            </div>
            <span className={`nawi-chip border ${statusTone[f.status] ?? ""}`}>{f.status}</span>
          </div>
        ))}
        <div className="p-3"><SimulatedTag /></div>
      </div>
    );
  }
  if (card.kind === "summary") {
    const { data, proc } = card;
    return (
      <div className="nawi-card mt-3 p-4">
        <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          <ShieldCheck className="h-4 w-4 text-audio" /> Resumen antes de enviar
        </div>
        <dl className="mt-3 grid grid-cols-1 gap-2 text-[15px] sm:grid-cols-2">
          <Row k="Nombre" v={data.fullName ?? "—"} />
          <Row k="DNI" v={data.dni ?? "—"} />
          <Row k="Trámite" v={proc.name} className="sm:col-span-2" />
          <Row k="Motivo" v={data.motivo ?? "—"} className="sm:col-span-2" />
          <Row k="Adjunto" v={data.attachment ?? "—"} />
          <Row k="Identidad" v="Validada para esta demo" />
        </dl>
        <SimulatedTag />
      </div>
    );
  }
  if (card.kind === "receipt") {
    return (
      <div className="nawi-card mt-3 overflow-hidden">
        <div className="nawi-gradient-header p-4 text-primary-foreground">
          <div className="text-xs font-semibold uppercase tracking-widest opacity-80">Constancia simulada</div>
          <div className="mt-1 text-2xl font-bold tracking-tight">{card.fileNumber}</div>
          <div className="text-sm opacity-90">{card.proc.name}</div>
        </div>
        <div className="p-4 text-[15px]">
          <Row k="A nombre de" v={card.data.fullName ?? "—"} />
          <Row k="DNI" v={card.data.dni ?? "—"} />
          <Row k="Oficina" v={card.proc.office} />
          <Row k="Plazo estimado" v={card.proc.estimate} />
          <SimulatedTag />
        </div>
      </div>
    );
  }
  if (card.kind === "notification") {
    return (
      <div className="nawi-card mt-3 border-l-4 border-l-info p-4">
        <div className="flex items-start gap-3">
          <BellRing className="h-5 w-5 text-info" />
          <div>
            <div className="text-sm font-semibold text-info">Novedad simulada</div>
            <div className="font-bold">{card.file.number} — {card.file.procedureName}</div>
            <p className="text-[15px] text-muted-foreground">Hay una actualización en tu trámite.</p>
          </div>
        </div>
        <SimulatedTag />
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
  icon?: React.ReactNode;
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

export function SimulatedTag() {
  return (
    <div className="mt-3 inline-flex items-center gap-1.5 rounded-md bg-warning/10 px-2 py-1 text-xs font-semibold text-warning">
      <span className="inline-block h-1.5 w-1.5 rounded-full bg-warning" />
      Datos simulados para demostración
    </div>
  );
}
