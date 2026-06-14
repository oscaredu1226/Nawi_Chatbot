import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Globe, MessageCircle, Eye } from "lucide-react";
import { WebFlow } from "@/components/nawi/WebFlow";
import { WhatsAppFlow } from "@/components/nawi/WhatsAppFlow";
import { NawiMark } from "@/components/nawi/WebFlow";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Ñawi — Asistente Digital Accesible del GORE Cusco" },
      {
        name: "description",
        content:
          "Prototipo accesible para trámites del Gobierno Regional de Cusco. Voz, texto y WhatsApp para personas con discapacidad visual.",
      },
      { property: "og:title", content: "Ñawi — Asistente Digital Accesible" },
      {
        property: "og:description",
        content:
          "Demo institucional GORE Cusco con flujo Web (voz) y flujo WhatsApp simulado.",
      },
    ],
  }),
  component: Page,
});

function Page() {
  const [tab, setTab] = useState<"web" | "whatsapp">("web");
  return (
    <main className="min-h-dvh bg-background">
      <header className="nawi-gradient-header sticky top-0 z-30 border-b border-primary/40 text-primary-foreground">
        <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-xl bg-white/15 ring-1 ring-white/20">
              <Eye className="h-6 w-6" />
            </div>
            <div className="leading-tight">
              <div className="flex items-center gap-2">
                <span className="text-xl font-bold tracking-tight">Ñawi</span>
                <span className="rounded bg-white/15 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-widest">
                  Demo
                </span>
              </div>
              <p className="text-[12px] text-primary-foreground/80">
                Agente digital accesible · Gobierno Regional de Cusco
              </p>
            </div>
          </div>

          <div
            role="tablist"
            aria-label="Selección de canal"
            className="ml-auto inline-flex rounded-full bg-black/20 p-1 ring-1 ring-white/15"
          >
            <TabButton
              active={tab === "web"}
              onClick={() => setTab("web")}
              icon={<Globe className="h-4 w-4" />}
              label="Flujo Web"
            />
            <TabButton
              active={tab === "whatsapp"}
              onClick={() => setTab("whatsapp")}
              icon={<MessageCircle className="h-4 w-4" />}
              label="Flujo WhatsApp"
            />
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl pt-4">
        {tab === "web" ? <WebFlow /> : <WhatsAppFlow />}
      </div>
    </main>
  );
}

function TabButton({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={`inline-flex min-h-10 items-center gap-2 rounded-full px-4 py-1.5 text-sm font-semibold transition ${
        active
          ? "bg-white text-primary shadow"
          : "text-primary-foreground/80 hover:text-primary-foreground"
      }`}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}
