import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  LayoutDashboard, Users, Truck, FileText,
  ShoppingCart, Receipt, Settings,
} from "lucide-react";
import { checkPassword } from "@/lib/settings-data";

const MODULES = [
  { label: "Tableau de bord", icon: LayoutDashboard, path: "/" },
  { label: "Clients",         icon: Users,           path: "/clients" },
  { label: "Fournisseurs",    icon: Truck,           path: "/fournisseurs" },
  { label: "Devis",           icon: FileText,        path: "/devis" },
  { label: "Commandes",       icon: ShoppingCart,    path: "/commandes" },
  { label: "Factures",        icon: Receipt,         path: "/factures" },
];

export function AppTopNav() {
  const navigate  = useNavigate();
  const location  = useLocation();
  const [modal, setModal]       = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError]       = useState("");

  const openSettings = () => {
    if (sessionStorage.getItem("oralis_supervisor_unlocked") === "true") {
      navigate("/parametres");
      return;
    }
    setPassword("");
    setError("");
    setModal(true);
  };
  const confirm = () => {
    if (checkPassword(password)) {
      sessionStorage.setItem("oralis_supervisor_unlocked", "true");
      setModal(false);
      navigate("/parametres");
    }
    else setError("Mot de passe incorrect");
  };

  return (
    <>
      {/* ── Single full-width navigation bar ── */}
      <header
        className="print:hidden shrink-0 z-20"
        style={{
          height: 58,
          display: "flex",
          alignItems: "center",
          width: "100%",
          background: "hsl(var(--card))",
          borderBottom: "1px solid hsl(var(--border))",
          boxShadow: "0 1px 6px rgba(0,0,0,0.07)",
          padding: "0 20px",
          gap: 0,
        }}
      >
        {/* ── Brand ── */}
        <div style={{ flexShrink: 0, marginRight: 28 }}>
          <span style={{
            fontFamily: "var(--font-display)",
            fontSize: 20,
            fontWeight: 800,
            letterSpacing: "0.06em",
            color: "hsl(var(--accent))",
          }}>
            ExpertDEVIS
          </span>
        </div>

        {/* ── Module tabs — fill all available space ── */}
        <nav style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          gap: 4,
          overflowX: "auto",
          minWidth: 0,
        }}>
          {MODULES.map((m) => {
            const active =
              m.path === "/"
                ? location.pathname === "/"
                : location.pathname.startsWith(m.path);

            return (
              <button
                key={m.path}
                onClick={() => navigate(m.path)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "8px 20px",
                  borderRadius: 999,
                  border: "none",
                  cursor: "pointer",
                  fontFamily: "var(--font-body)",
                  fontSize: 14,
                  fontWeight: active ? 700 : 500,
                  whiteSpace: "nowrap",
                  flexShrink: 0,
                  transition: "background 0.15s, color 0.15s, box-shadow 0.15s",
                  background: active ? "hsl(var(--accent))" : "transparent",
                  color: active
                    ? "hsl(var(--accent-foreground))"
                    : "hsl(var(--foreground) / 0.60)",
                  boxShadow: active ? "0 2px 10px hsl(var(--accent) / 0.28)" : "none",
                }}
                onMouseEnter={(e) => {
                  if (!active) {
                    e.currentTarget.style.background = "hsl(var(--accent) / 0.10)";
                    e.currentTarget.style.color = "hsl(var(--foreground))";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!active) {
                    e.currentTarget.style.background = "transparent";
                    e.currentTarget.style.color = "hsl(var(--foreground) / 0.60)";
                  }
                }}
              >
                <m.icon size={16} />
                {m.label}
              </button>
            );
          })}
        </nav>

        {/* ── Right zone: Settings + User ── */}
        <div style={{
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
          gap: 6,
          marginLeft: 16,
          borderLeft: "1px solid hsl(var(--border))",
          paddingLeft: 16,
        }}>
          {/* Paramètres */}
          <button
            onClick={openSettings}
            title="Paramètres"
            style={{
              display: "flex", alignItems: "center", gap: 7,
              padding: "7px 14px",
              borderRadius: 8,
              border: "1px solid hsl(var(--border))",
              background: "transparent",
              cursor: "pointer",
              fontFamily: "var(--font-body)",
              fontSize: 13,
              fontWeight: 500,
              color: "hsl(var(--foreground) / 0.70)",
              transition: "background 0.15s, border-color 0.15s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "hsl(var(--accent) / 0.08)";
              e.currentTarget.style.borderColor = "hsl(var(--accent) / 0.4)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "transparent";
              e.currentTarget.style.borderColor = "hsl(var(--border))";
            }}
          >
            <Settings size={15} />
            Paramètres
          </button>

          {/* User avatar + name */}
          <div style={{
            display: "flex", alignItems: "center", gap: 8,
            padding: "6px 12px",
            borderRadius: 8,
            background: "hsl(var(--accent) / 0.06)",
          }}>
            <div style={{
              width: 28, height: 28, borderRadius: "50%",
              background: "hsl(var(--accent) / 0.20)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 11, fontWeight: 700, color: "hsl(var(--accent))",
              flexShrink: 0,
            }}>DB</div>
            <span style={{
              fontFamily: "var(--font-body)",
              fontSize: 13,
              fontWeight: 500,
              color: "hsl(var(--foreground) / 0.75)",
              whiteSpace: "nowrap",
            }}>David B.</span>
          </div>
        </div>
      </header>

      {/* ── Password modal ── */}
      {modal && (
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
              onKeyDown={(e) => e.key === "Enter" && confirm()}
              placeholder="••••••••"
              className="form-input mb-2"
              autoFocus
            />
            {error && <p className="text-xs text-destructive mb-2">{error}</p>}
            <div className="flex gap-2 mt-5">
              <button onClick={confirm} className="btn-gold flex-1">Confirmer</button>
              <button onClick={() => setModal(false)} className="btn-ghost flex-1 border border-border">Annuler</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
