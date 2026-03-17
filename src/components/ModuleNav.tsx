import { useNavigate, useLocation } from "react-router-dom";
import { Users, Factory, FileText, ShoppingCart, Package, Receipt } from "lucide-react";

const modules = [
  { label: "Clients", icon: Users, path: "/clients" },
  { label: "Fournisseurs", icon: Factory, path: "/fournisseurs" },
  { label: "Devis", icon: FileText, path: "/devis" },
  { label: "Commandes", icon: ShoppingCart, path: "/commandes" },
  { label: "Bons de livraison", icon: Package, path: "/bons-livraison" },
  { label: "Factures", icon: Receipt, path: "/factures" },
];

export default function ModuleNav() {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <div className="w-full bg-card border-b border-border flex h-11 mb-6">
      {modules.map((m) => {
        const active = location.pathname.startsWith(m.path);
        return (
          <button
            key={m.path}
            onClick={() => navigate(m.path)}
            className={`flex items-center gap-2 px-5 h-full text-[13px] font-medium border-r border-border transition-colors duration-150 ${
              active
                ? "bg-accent text-accent-foreground font-semibold"
                : "bg-card text-foreground hover:bg-accent/10"
            }`}
            style={{ fontFamily: "var(--font-body)", borderRadius: 0 }}
          >
            <m.icon size={14} />
            {m.label}
          </button>
        );
      })}
    </div>
  );
}
