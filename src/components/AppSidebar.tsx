import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { LayoutDashboard, FilePlus, Settings, Users, FileText, Receipt, Package } from "lucide-react";
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

  const navLinkBase =
    "flex items-center gap-3 px-5 py-3 text-[13px] text-sidebar-foreground hover:bg-[rgba(201,168,76,0.08)] transition-all duration-200 border-l-2 border-transparent";
  const navLinkActive = "border-l-2 !border-accent text-accent bg-[rgba(201,168,76,0.06)]";

  return (
    <>
      <aside className="w-60 min-h-screen bg-sidebar flex flex-col shrink-0 border-r border-sidebar-border">
        {/* Brand */}
        <div className="px-6 py-8">
          <h1 className="font-display text-2xl font-bold text-accent" style={{ letterSpacing: "0.15em" }}>
            ORALIS
          </h1>
          <p className="text-[11px] text-muted-foreground mt-1.5 tracking-wide font-body">
            Quote Studio
          </p>
        </div>

        {/* Nav */}
        <nav className="flex-1 py-2 space-y-0.5">
          <NavLink to="/" end className={navLinkBase} activeClassName={navLinkActive}>
            <LayoutDashboard size={16} />
            <span>Tableau de bord</span>
          </NavLink>
          <NavLink to="/clients" className={navLinkBase} activeClassName={navLinkActive}>
            <Users size={16} />
            <span>Clients & Prospects</span>
          </NavLink>
          <NavLink to="/devis/nouveau" className={navLinkBase} activeClassName={navLinkActive}>
            <FilePlus size={16} />
            <span>Nouveau devis</span>
          </NavLink>
          <NavLink to="/devis" className={navLinkBase} activeClassName={navLinkActive}>
            <FileText size={16} />
            <span>Devis (liste)</span>
          </NavLink>
          <NavLink to="/factures" className={navLinkBase} activeClassName={navLinkActive}>
            <Receipt size={16} />
            <span>Factures</span>
          </NavLink>
          <NavLink to="/commandes" className={navLinkBase} activeClassName={navLinkActive}>
            <Package size={16} />
            <span>Commandes</span>
          </NavLink>
        </nav>

        {/* Settings */}
        <div className="px-2 py-1">
          <button
            onClick={handleSettingsClick}
            className={`${navLinkBase} w-full text-left rounded`}
          >
            <Settings size={16} />
            <span>Paramètres</span>
          </button>
        </div>

        {/* User + Version */}
        <div className="px-5 py-4 border-t border-sidebar-border">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center text-accent text-xs font-semibold">
              DB
            </div>
            <div>
              <p className="text-[12px] text-sidebar-accent-foreground font-medium leading-tight">David Boilon</p>
              <p className="text-[10px] text-sidebar-foreground/50">Administrateur</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[9px] px-2 py-0.5 rounded-full bg-sidebar-accent text-sidebar-foreground/60 tracking-wider uppercase font-medium">
              v1.0 ORALIS
            </span>
          </div>
        </div>
      </aside>

      {/* Password modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 backdrop-blur-sm">
          <div className="bg-card border border-border p-8 w-full max-w-sm shadow-elevated rounded-lg">
            <h2 className="font-display text-xl font-semibold mb-2">Accès Superviseur</h2>
            <p className="text-sm text-muted-foreground mb-5">
              Entrez le mot de passe pour accéder aux paramètres.
            </p>
            <label className="form-label">Mot de passe</label>
            <input
              type="password"
              value={password}
              onChange={(e) => { setPassword(e.target.value); setError(""); }}
              onKeyDown={(e) => e.key === "Enter" && handleConfirm()}
              placeholder="••••••••"
              className="form-input mb-2"
              autoFocus
            />
            {error && <p className="text-xs text-destructive mb-2">{error}</p>}
            <div className="flex gap-2 mt-5">
              <button onClick={handleConfirm} className="btn-gold flex-1">
                Confirmer
              </button>
              <button
                onClick={() => setShowModal(false)}
                className="btn-ghost flex-1 border border-border"
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
