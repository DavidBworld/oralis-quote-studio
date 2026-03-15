import { useNavigate } from "react-router-dom";
import { LayoutDashboard, FilePlus, FileText } from "lucide-react";
import { NavLink } from "@/components/NavLink";

export function AppSidebar() {
  return (
    <aside className="w-56 min-h-screen bg-sidebar flex flex-col shrink-0">
      {/* Brand */}
      <div className="px-6 py-8 border-b border-sidebar-border">
        <h1 className="font-display text-2xl font-bold tracking-wider text-accent">
          ORALIS
        </h1>
        <p className="text-xs text-sidebar-foreground mt-1 leading-tight tracking-wide">
          Pergola Bioclimatique<br />&amp; Jardin d'Hiver Sur-Mesure
        </p>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-6 space-y-1">
        <NavLink
          to="/"
          end
          className="flex items-center gap-3 px-3 py-2.5 text-sm text-sidebar-foreground hover:bg-sidebar-accent transition-colors duration-150"
          activeClassName="bg-sidebar-accent text-accent"
        >
          <LayoutDashboard size={18} />
          <span>Tableau de bord</span>
        </NavLink>
        <NavLink
          to="/devis/nouveau"
          className="flex items-center gap-3 px-3 py-2.5 text-sm text-sidebar-foreground hover:bg-sidebar-accent transition-colors duration-150"
          activeClassName="bg-sidebar-accent text-accent"
        >
          <FilePlus size={18} />
          <span>Nouveau devis</span>
        </NavLink>
      </nav>

      {/* Footer */}
      <div className="px-6 py-4 border-t border-sidebar-border">
        <p className="text-[10px] text-sidebar-foreground/50 leading-tight">
          © 2026 ORALIS SAS<br />Tous droits réservés
        </p>
      </div>
    </aside>
  );
}
