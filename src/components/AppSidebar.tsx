import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { LayoutDashboard, FilePlus, Settings } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { checkPassword } from "@/lib/settings-data";

export function AppSidebar() {
  const navigate = useNavigate();
  const [showModal, setShowModal] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleSettingsClick = () => {
    setPassword("");
    setError("");
    setShowModal(true);
  };

  const handleConfirm = () => {
    if (checkPassword(password)) {
      setShowModal(false);
      navigate("/parametres");
    } else {
      setError("Mot de passe incorrect");
    }
  };

  return (
    <>
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

        {/* Settings */}
        <div className="px-3 pb-2">
          <button
            onClick={handleSettingsClick}
            className="flex items-center gap-3 px-3 py-2.5 text-sm text-sidebar-foreground hover:bg-sidebar-accent transition-colors duration-150 w-full text-left"
          >
            <Settings size={18} />
            <span>Paramètres</span>
          </button>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-sidebar-border">
          <p className="text-[10px] text-sidebar-foreground/50 leading-tight">
            © 2026 ORALIS SAS<br />Tous droits réservés
          </p>
        </div>
      </aside>

      {/* Password modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/50">
          <div className="bg-card border border-border p-8 w-full max-w-sm shadow-lg">
            <h2 className="font-display text-xl font-semibold mb-2">Accès Superviseur</h2>
            <p className="text-sm text-muted-foreground mb-4">
              Entrez le mot de passe pour accéder aux paramètres.
            </p>
            <input
              type="password"
              value={password}
              onChange={(e) => { setPassword(e.target.value); setError(""); }}
              onKeyDown={(e) => e.key === "Enter" && handleConfirm()}
              placeholder="Mot de passe"
              className="w-full px-3 py-2 bg-card border border-border text-sm font-body focus:outline-none focus:ring-1 focus:ring-accent mb-2"
              autoFocus
            />
            {error && <p className="text-xs text-destructive mb-2">{error}</p>}
            <div className="flex gap-2 mt-4">
              <button onClick={handleConfirm} className="btn-gold flex-1">
                Confirmer
              </button>
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 px-4 py-2 text-sm border border-border hover:bg-muted transition-colors"
              >
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
