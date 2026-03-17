import { Receipt } from "lucide-react";
import ModuleNav from "@/components/ModuleNav";

export default function Factures() {
  return (
    <div className="p-8 lg:p-10 max-w-6xl mx-auto">
      <div className="mb-10">
        <h1 className="font-display text-[28px] font-semibold text-foreground tracking-tight">
          Factures
        </h1>
        <p className="text-[13px] text-muted-foreground mt-1 font-body">
          Gestion des factures ORALIS
        </p>
      </div>

      <ModuleNav />

      <div className="luxury-card p-16 text-center">
        <Receipt size={48} className="mx-auto text-muted-foreground/20 mb-4" />
        <h2 className="font-display text-xl text-foreground mb-2">Module Factures</h2>
        <p className="text-sm text-muted-foreground mb-6">
          Ce module sera disponible prochainement.
        </p>
        <span className="inline-block px-4 py-1.5 text-[11px] font-semibold tracking-wide bg-accent/15 text-accent rounded-full uppercase">
          Bientôt disponible
        </span>
      </div>
    </div>
  );
}
