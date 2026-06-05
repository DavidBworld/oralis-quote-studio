import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search, Plus, Eye, Pencil, Copy, FileText, Printer, Star, Trash2,
  ChevronRight, AlertTriangle, TrendingUp, Send, BarChart3, Clock,
  ChevronDown, X, Mail
} from "lucide-react";
import { toast } from "sonner";
import {
  formatEUR,
  formatDate,
  formatClientName,
  calcTotals,
  STATUT_LABELS,
  uid,
  type Quote,
} from "@/lib/quote-data";
import { ConfirmModal } from "@/components/ConfirmModal";
import {
  nextCommandeNumber,
  createCommandeFromDevis, getCommandeResteAFacturer,
  getCommandeTotalFacture, getProchainEcheancier,
  ECHEANCIER_DEFAUT, createFactureFromCommande,
  nextFactureNumberOR,
  type Commande,
} from "@/lib/commande-data";
import { dbLoadQuotes, dbSaveQuote, dbDeleteQuote } from "@/lib/supabase-data/devis";
import { dbLoadCommandes, dbSaveCommande } from "@/lib/supabase-data/commandes";
import { dbLoadFactures, dbSaveFacture } from "@/lib/supabase-data/factures";

const statusClass: Record<Quote["statut"], string> = {
  brouillon: "status-brouillon",
  envoye: "status-envoye",
  accepte: "status-accepte",
  refuse: "status-refuse",
};

const statusBorderClass: Record<Quote["statut"], string> = {
  brouillon: "",
  envoye: "",
  accepte: "border-l-[3px] border-l-[hsl(150_45%_33%)]",
  refuse: "border-l-[3px] border-l-destructive",
};



function loadFavoris(): string[] {
  try { return JSON.parse(localStorage.getItem("oralis_devis_favoris") || "[]"); } catch { return []; }
}
function saveFavoris(f: string[]) { localStorage.setItem("oralis_devis_favoris", JSON.stringify(f)); }

function daysSince(dateStr: string): number {
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000);
}

// ── Context Menu ──
interface CtxMenu { x: number; y: number; quote: Quote; subOpen?: string }

function ContextMenu({ ctx, onClose, onAction }: {
  ctx: CtxMenu;
  onClose: () => void;
  onAction: (action: string, q: Quote, sub?: string) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [subOpen, setSubOpen] = useState<string | null>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("mousedown", handler);
    document.addEventListener("keydown", esc);
    return () => { document.removeEventListener("mousedown", handler); document.removeEventListener("keydown", esc); };
  }, [onClose]);

  const q = ctx.quote;
  const isAccepte = q.statut === "accepte";

  const Item = ({ icon, label, onClick, danger, disabled }: { icon: React.ReactNode; label: string; onClick?: () => void; danger?: boolean; disabled?: boolean }) => (
    <button
      className={`w-full flex items-center gap-3 px-4 py-2 text-[13px] font-body text-left transition-colors ${danger ? "text-destructive" : ""} ${disabled ? "opacity-40 cursor-not-allowed" : "hover:bg-accent/[0.08] cursor-pointer"}`}
      onClick={disabled ? undefined : () => { onClick?.(); onClose(); }}
      disabled={disabled}
    >
      {icon}{label}
    </button>
  );

  const Divider = () => <div className="border-t border-border my-1" />;

  // Clamp position
  const style: React.CSSProperties = {
    position: "fixed",
    top: Math.min(ctx.y, window.innerHeight - 420),
    left: Math.min(ctx.x, window.innerWidth - 240),
    zIndex: 50,
  };

  return (
    <div ref={ref} style={style} className="w-[240px] bg-card border border-border rounded-lg py-1 shadow-[var(--shadow-elevated)]">
      <Item icon={<Pencil size={14} />} label="Modifier" onClick={() => onAction("edit", q)} />
      <Item icon={<Eye size={14} />} label="Aperçu PDF" onClick={() => onAction("preview", q)} />
      <Item icon={<Copy size={14} />} label="Dupliquer" onClick={() => onAction("duplicate", q)} />
      <Divider />
      <Item icon={<span className="text-sm">🔁</span>} label="Convertir en commande" onClick={() => onAction("convert_cmd", q)} disabled={!isAccepte} />
      <Item icon={<span className="text-sm">💰</span>} label="Créer facture d'acompte" onClick={() => onAction("create_fa", q)} disabled={!isAccepte} />
      <Item icon={<FileText size={14} />} label="Créer variante" onClick={() => onAction("variant", q)} />
      <Divider />
      {/* Status submenu */}
      <div
        className="relative"
        onMouseEnter={() => setSubOpen("status")}
        onMouseLeave={() => setSubOpen(null)}
      >
        <div className="w-full flex items-center justify-between gap-3 px-4 py-2 text-[13px] font-body hover:bg-accent/[0.08] cursor-pointer">
          <span className="flex items-center gap-3"><Send size={14} />Changer le statut</span>
          <ChevronRight size={12} />
        </div>
        {subOpen === "status" && (
          <div className="absolute left-full top-0 w-[160px] bg-card border border-border rounded-lg py-1 shadow-[var(--shadow-elevated)]">
            {(["brouillon", "envoye", "accepte", "refuse"] as const).map((s) => (
              <button
                key={s}
                className={`w-full text-left px-4 py-2 text-[13px] font-body hover:bg-accent/[0.08] ${q.statut === s ? "font-semibold text-accent" : ""}`}
                onClick={() => { onAction("set_status", q, s); onClose(); }}
              >
                {STATUT_LABELS[s]}
              </button>
            ))}
          </div>
        )}
      </div>
      <Divider />
      <Item icon={<Printer size={14} />} label="Imprimer/Exporter" onClick={() => onAction("print", q)} />
      <Item icon={<Star size={14} />} label="Ajouter aux favoris" onClick={() => onAction("toggle_fav", q)} />
      <Divider />
      <Item icon={<Trash2 size={14} />} label="Supprimer" onClick={() => onAction("delete", q)} danger />
    </div>
  );
}

// ── Status Dropdown ──
const STATUS_ICONS: Record<Quote["statut"], string> = {
  brouillon: "✎",
  envoye: "✉",
  accepte: "✓",
  refuse: "✗",
};

const STATUS_TRANSITIONS: Record<Quote["statut"], Quote["statut"][]> = {
  brouillon: ["envoye"],
  envoye: ["accepte", "refuse"],
  accepte: [],
  refuse: ["brouillon"],
};

function StatusDropdown({ quote, onUpdate }: { quote: Quote; onUpdate: () => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const [dropPos, setDropPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 });

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const openDropdown = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      const dropdownHeight = 180; // approximate height of the 4-item dropdown
      const spaceBelow = window.innerHeight - rect.bottom;
      const top = (spaceBelow < dropdownHeight && rect.top > dropdownHeight)
        ? rect.top - dropdownHeight - 6
        : rect.bottom + 6;
      setDropPos({ top, left: rect.left });
    }
    setOpen(!open);
  };

  const changeStatus = async (s: Quote["statut"]) => {
    try {
      const updated = { ...quote, statut: s };
      await dbSaveQuote(updated);
      setOpen(false);
      onUpdate();
      toast.success(`Statut changé : ${STATUT_LABELS[s]}`);
    } catch (err) {
      toast.error("Erreur lors de la modification du statut.");
    }
  };

  const quickTransitions = STATUS_TRANSITIONS[quote.statut];

  return (
    <div className="relative inline-flex items-center gap-1.5" ref={ref}>
      {/* Current status badge — click to open full menu */}
      <button
        ref={btnRef}
        onClick={openDropdown}
        className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-semibold tracking-wide ${statusClass[quote.statut]} cursor-pointer hover:ring-2 hover:ring-accent/30 transition-all`}
        title="Cliquer pour changer le statut"
      >
        <span>{STATUS_ICONS[quote.statut]}</span>
        {STATUT_LABELS[quote.statut]}
        <ChevronDown size={11} className={`transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {/* Quick transition buttons */}
      {quickTransitions.length > 0 && (
        <div className="flex items-center gap-0.5">
          {quickTransitions.map((s) => (
            <button
              key={s}
              onClick={(e) => { e.stopPropagation(); changeStatus(s); }}
              className={`px-2 py-1 text-[10px] font-semibold tracking-wide rounded border transition-all hover:scale-105 ${
                s === "accepte"
                  ? "border-[hsl(var(--success))] text-[hsl(var(--success))] hover:bg-[hsl(150_40%_96%)]"
                  : s === "envoye"
                  ? "border-[hsl(220_75%_45%)] text-[hsl(220_75%_45%)] hover:bg-[hsl(220_75%_96%)]"
                  : s === "refuse"
                  ? "border-destructive text-destructive hover:bg-[hsl(4_65%_96%)]"
                  : "border-border text-muted-foreground hover:bg-muted"
              }`}
              title={`Passer en ${STATUT_LABELS[s]}`}
            >
              → {STATUT_LABELS[s]}
            </button>
          ))}
        </div>
      )}

      {/* Full dropdown — fixed position to escape overflow:hidden */}
      {open && (
        <div
          className="fixed z-[100] w-[170px] bg-card border border-border rounded-lg py-1.5 shadow-[var(--shadow-elevated)]"
          style={{ top: dropPos.top, left: dropPos.left }}
        >
          <div className="px-3 py-1.5 text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
            Changer le statut
          </div>
          {(["brouillon", "envoye", "accepte", "refuse"] as const).map((s) => (
            <button
              key={s}
              className={`w-full text-left px-3 py-2 text-[12px] font-body transition-colors flex items-center gap-2 ${
                quote.statut === s
                  ? "font-semibold text-accent bg-accent/5"
                  : "hover:bg-accent/[0.08]"
              }`}
              onClick={(e) => { e.stopPropagation(); changeStatus(s); }}
            >
              <span className={`inline-flex items-center justify-center w-5 h-5 rounded-full text-[10px] ${statusClass[s]}`}>
                {STATUS_ICONS[s]}
              </span>
              {STATUT_LABELS[s]}
              {quote.statut === s && <span className="ml-auto text-accent text-[10px]">actuel</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Convert to Commande Client Modal ──
function ConvertCommandeModal({ quote, commandes, onClose, onDone }: { quote: Quote; commandes: Commande[]; onClose: () => void; onDone: () => void }) {
  const [refAffaire, setRefAffaire] = useState("");
  const [dateLivraison, setDateLivraison] = useState("");

  const handleConvert = async () => {
    try {
      const cmd = createCommandeFromDevis(quote, refAffaire, dateLivraison, commandes);
      await dbSaveCommande(cmd);

      const updatedQuote = { ...quote, statut: "accepte" as const };
      await dbSaveQuote(updatedQuote);

      toast.success(`Commande ${cmd.numero} créée ✓`);
      onDone();
      onClose();
    } catch (err) {
      console.error("Erreur lors de la conversion en commande:", err);
      toast.error("Erreur lors de la conversion en commande.");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={onClose}>
      <div className="bg-card border border-border rounded-lg w-full max-w-md p-6 shadow-[var(--shadow-elevated)]" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-display text-xl font-semibold">Convertir le devis en commande</h2>
          <button onClick={onClose} className="p-1 hover:bg-muted rounded"><X size={16} /></button>
        </div>
        <p className="text-sm text-muted-foreground mb-4">
          Devis N° <span className="font-mono font-medium text-foreground">{quote.numero}</span> — Client : <span className="font-medium text-foreground">{formatClientName(quote.client)}</span>
        </p>
        <div className="space-y-4">
          <div>
            <label className="form-label">Référence affaire</label>
            <input className="form-input" placeholder="Ex: Villa Müller - Pergola" value={refAffaire} onChange={(e) => setRefAffaire(e.target.value)} />
          </div>
          <div>
            <label className="form-label">Date livraison/pose prévue</label>
            <input type="date" className="form-input" value={dateLivraison} onChange={(e) => setDateLivraison(e.target.value)} />
          </div>
          <div className="bg-muted/50 rounded-lg p-3 text-sm space-y-1">
            <p className="text-muted-foreground">Conditions de paiement :</p>
            <p className="font-medium">50% à la commande · 45% à la livraison · 5% fin de travaux</p>
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <button onClick={onClose} className="btn-ghost">Annuler</button>
          <button onClick={handleConvert} className="btn-gold">Convertir en commande</button>
        </div>
      </div>
    </div>
  );
}

// ── Facture Acompte Modal ──
function FactureAcompteModal({ quote, factures, onClose, onDone }: { quote: Quote; factures: any[]; onClose: () => void; onDone: () => void }) {
  const totals = calcTotals(quote.lignes);
  const montants = quote.montantsPaiement || [];
  const hasCustomPayments = montants.length > 0;
  const initialPct = hasCustomPayments ? montants[0].pourcentage : 30;
  const initialMontant = hasCustomPayments ? montants[0].montant : totals.totalTTC * 0.3;

  const [pct, setPct] = useState(initialPct);
  const [usePercent, setUsePercent] = useState(!hasCustomPayments);
  const [montantDirect, setMontantDirect] = useState(initialMontant);
  const [factureNumero, setFactureNumero] = useState(() => nextFactureNumberOR(factures));
  const [libelle, setLibelle] = useState(`Acompte sur devis ${quote.numero}`);
  const [dateFacture, setDateFacture] = useState(new Date().toISOString().split("T")[0]);
  const [dateEcheance, setDateEcheance] = useState(() => {
    const d = new Date(); d.setDate(d.getDate() + 30); return d.toISOString().split("T")[0];
  });
  const [modePaiement, setModePaiement] = useState("Virement");
  const [addReglement, setAddReglement] = useState(false);
  const [montantRecu, setMontantRecu] = useState(0);
  const [dateReception, setDateReception] = useState(new Date().toISOString().split("T")[0]);

  const montantAcompte = usePercent ? totals.totalTTC * (pct / 100) : montantDirect;

  const handleCreate = async () => {
    try {
      const tvaBreakdown = Object.entries(totals.tvaMap).map(([taux, montantTVA]) => {
        const t = parseFloat(taux);
        let baseHT = 0;
        for (const l of quote.lignes) {
          if (l.tva === t) baseHT += l.quantite * l.prixUnitaireHT;
          for (const o of l.options) { if (o.tva === t) baseHT += o.prixHT; }
        }
        return { taux: t, baseHT, montantTVA, montantTTC: baseHT + montantTVA };
      });

      const facture = {
        id: uid(),
        numero: factureNumero,
        type: "acompte" as const,
        devisId: quote.id,
        devisNumero: quote.numero,
        client: quote.client,
        lignes: quote.lignes,
        totalHT: totals.sousTotal,
        totalTTC: totals.totalTTC,
        montantAcompte,
        montantAcomptePct: usePercent ? pct : Math.round((montantAcompte / totals.totalTTC) * 100),
        libelle,
        dateFacture,
        dateEcheance,
        modePaiement,
        statut: "non_payee" as const,
        reglements: addReglement ? [{
          id: uid(),
          mode: modePaiement,
          libelle: "Règlement acompte",
          dateReception: dateReception,
          dateEnregistrement: new Date().toISOString().split("T")[0],
          montant: montantRecu
        }] : [],
        dateCreation: new Date().toISOString().split("T")[0],
        tvaBreakdown,
      };

      await dbSaveFacture(facture);
      toast.success("Facture d'acompte créée ✓");
      onDone();
      onClose();
    } catch (err) {
      console.error("Erreur lors de la création de la facture d'acompte:", err);
      toast.error("Erreur lors de la création de la facture.");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={onClose}>
      <div className="bg-card border border-border rounded-lg w-full max-w-lg p-6 shadow-[var(--shadow-elevated)] max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-display text-xl font-semibold">Créer une facture d'acompte</h2>
          <button onClick={onClose} className="p-1 hover:bg-muted rounded"><X size={16} /></button>
        </div>

        {/* Summary */}
        <div className="bg-muted/50 rounded-lg p-4 mb-5 space-y-1">
          <div className="flex justify-between text-sm"><span className="text-muted-foreground">Total HT</span><span className="font-mono font-medium">{formatEUR(totals.sousTotal)}</span></div>
          {Object.entries(totals.tvaMap).map(([taux, montant]) => (
            <div key={taux} className="flex justify-between text-sm"><span className="text-muted-foreground">TVA {taux}%</span><span className="font-mono">{formatEUR(montant)}</span></div>
          ))}
          <div className="flex justify-between text-sm font-semibold pt-1 border-t border-border"><span>Total TTC</span><span className="font-mono">{formatEUR(totals.totalTTC)}</span></div>
          <div className="flex justify-between text-sm font-semibold"><span>Net à payer</span><span className="font-mono">{formatEUR(totals.totalTTC)}</span></div>
        </div>

        <div className="space-y-4">
          {/* Acompte */}
          <div>
            <label className="form-label">Acompte demandé</label>
            <div className="flex gap-2 items-center">
              {usePercent ? (
                <input type="number" className="form-input w-24" value={pct} onChange={(e) => setPct(Number(e.target.value))} min={1} max={100} />
              ) : (
                <input type="number" className="form-input w-32" value={montantDirect} onChange={(e) => setMontantDirect(Number(e.target.value))} step={0.01} />
              )}
              <button className="text-[12px] text-accent font-medium px-2 py-1 hover:bg-accent/10 rounded" onClick={() => setUsePercent(!usePercent)}>
                {usePercent ? "% → €" : "€ → %"}
              </button>
              <span className="text-sm text-muted-foreground ml-auto font-mono">{formatEUR(montantAcompte)} TTC</span>
            </div>
          </div>
          <div>
            <label className="form-label">N° Facture</label>
            <input className="form-input" value={factureNumero} onChange={(e) => setFactureNumero(e.target.value)} />
          </div>
          <div>
            <label className="form-label">Libellé de la facture</label>
            <input className="form-input" value={libelle} onChange={(e) => setLibelle(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="form-label">Date de facturation</label><input type="date" className="form-input" value={dateFacture} onChange={(e) => setDateFacture(e.target.value)} /></div>
            <div><label className="form-label">Date d'échéance</label><input type="date" className="form-input" value={dateEcheance} onChange={(e) => setDateEcheance(e.target.value)} /></div>
          </div>
          <div>
            <label className="form-label">Mode de paiement</label>
            <select className="form-input" value={modePaiement} onChange={(e) => setModePaiement(e.target.value)}>
              {["Virement", "Chèque", "CB", "Espèces"].map((m) => <option key={m}>{m}</option>)}
            </select>
          </div>
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input type="checkbox" checked={addReglement} onChange={(e) => setAddReglement(e.target.checked)} className="accent-[hsl(var(--accent))]" />
            Ajouter un règlement reçu
          </label>
          {addReglement && (
            <div className="grid grid-cols-2 gap-3 pl-6">
              <div><label className="form-label">Montant reçu</label><input type="number" className="form-input" value={montantRecu} onChange={(e) => setMontantRecu(Number(e.target.value))} step={0.01} /></div>
              <div><label className="form-label">Date réception</label><input type="date" className="form-input" value={dateReception} onChange={(e) => setDateReception(e.target.value)} /></div>
            </div>
          )}
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <button onClick={onClose} className="btn-ghost">Annuler</button>
          <button onClick={handleCreate} className="btn-gold">Créer la facture</button>
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════
// MAIN DASHBOARD
// ════════════════════════════════════════
export default function Dashboard() {
  const navigate = useNavigate();
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [commandes, setCommandes] = useState<Commande[]>([]);
  const [factures, setFactures] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [favoris, setFavoris] = useState<string[]>([]);
  const [ctxMenu, setCtxMenu] = useState<CtxMenu | null>(null);
  const [convertModal, setConvertModal] = useState<Quote | null>(null);
  const [factureModal, setFactureModal] = useState<Quote | null>(null);
  const [relancesOpen, setRelancesOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<{
    isOpen: boolean;
    message: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    message: "",
    onConfirm: () => {},
  });

  const reload = useCallback(async () => {
    try {
      setLoading(true);
      const [allQuotes, allCommandes, allFactures] = await Promise.all([
        dbLoadQuotes(),
        dbLoadCommandes(),
        dbLoadFactures(),
      ]);
      setQuotes(allQuotes);
      setCommandes(allCommandes);
      setFactures(allFactures);
      setFavoris(loadFavoris());
    } catch (err) {
      console.error("Erreur lors du chargement des données du tableau de bord:", err);
      toast.error("Erreur lors du chargement des données.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  const duplicateQuote = async (q: Quote) => {
    try {
      const dup: Quote = {
        ...JSON.parse(JSON.stringify(q)),
        id: uid(),
        numero: `${q.numero}-COPIE`,
        statut: "brouillon" as const,
        date: new Date().toISOString().split("T")[0],
      };
      await dbSaveQuote(dup);
      await reload();
      toast.success("Devis dupliqué ✓");
    } catch (err) {
      toast.error("Erreur lors de la duplication du devis.");
    }
  };

  const createVariant = async (q: Quote) => {
    try {
      const base = q.numero.replace(/-[a-z]$/, "");
      const existingVars = quotes.filter((x) => x.numero.startsWith(base) && x.numero !== base);
      const nextLetter = String.fromCharCode(98 + existingVars.length); // b, c, d...
      const dup: Quote = {
        ...JSON.parse(JSON.stringify(q)),
        id: uid(),
        numero: `${base}-${nextLetter}`,
        statut: "brouillon" as const,
        date: new Date().toISOString().split("T")[0],
      };
      await dbSaveQuote(dup);
      await reload();
      toast.success(`Variante ${dup.numero} créée ✓`);
    } catch (err) {
      toast.error("Erreur lors de la création de la variante.");
    }
  };

  const deleteQuote = (q: Quote) => {
    setConfirmDelete({
      isOpen: true,
      message: "Êtes-vous sûr de vouloir supprimer ce devis ?",
      onConfirm: async () => {
        try {
          await dbDeleteQuote(q.id);
          await reload();
          toast.success("Devis supprimé ✓");
        } catch (err) {
          toast.error("Erreur lors de la suppression du devis.");
        }
      },
    });
  };

  const toggleFav = (q: Quote) => {
    const f = loadFavoris();
    const idx = f.indexOf(q.id);
    if (idx >= 0) f.splice(idx, 1); else f.push(q.id);
    saveFavoris(f);
    setFavoris([...f]);
  };

  const setStatus = async (q: Quote, s: Quote["statut"]) => {
    try {
      const updated = { ...q, statut: s };
      await dbSaveQuote(updated);
      await reload();
      toast.success(`Statut changé : ${STATUT_LABELS[s]}`);
    } catch (err) {
      toast.error("Erreur lors de la modification du statut.");
    }
  };

  const handleCtxAction = (action: string, q: Quote, sub?: string) => {
    switch (action) {
      case "edit": navigate(`/devis/${q.id}`); break;
      case "preview": navigate(`/devis/${q.id}/apercu`); break;
      case "duplicate": duplicateQuote(q); break;
      case "convert_cmd": setConvertModal(q); break;
      case "create_fa": setFactureModal(q); break;
      case "variant": createVariant(q); break;
      case "set_status": if (sub) setStatus(q, sub as Quote["statut"]); break;
      case "print": navigate(`/devis/${q.id}/apercu`); break;
      case "toggle_fav": toggleFav(q); break;
      case "delete": deleteQuote(q); break;
    }
    setCtxMenu(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-full border-4 border-accent border-t-transparent animate-spin"></div>
          <p className="text-xs text-muted-foreground font-body">Chargement du tableau de bord...</p>
        </div>
      </div>
    );
  }

  const filtered = quotes.filter(
    (q) =>
      q.client.nom.toLowerCase().includes(search.toLowerCase()) ||
      q.client.prenom.toLowerCase().includes(search.toLowerCase()) ||
      q.numero.toLowerCase().includes(search.toLowerCase())
  );

  const handleRowContextMenu = (e: React.MouseEvent, q: Quote) => {
    e.preventDefault();
    setCtxMenu({ x: e.clientX, y: e.clientY, quote: q });
  };

  // ── KPI calculations ──
  const now = new Date();
  const thisMonth = (d: string) => { const dt = new Date(d); return dt.getMonth() === now.getMonth() && dt.getFullYear() === now.getFullYear(); };
  const lastMonth = (d: string) => { const dt = new Date(d); const lm = new Date(now.getFullYear(), now.getMonth() - 1, 1); return dt.getMonth() === lm.getMonth() && dt.getFullYear() === lm.getFullYear(); };

  const acceptedThisMonth = quotes.filter((q) => q.statut === "accepte" && thisMonth(q.date));
  const caThisMonth = acceptedThisMonth.reduce((s, q) => s + calcTotals(q.lignes).totalTTC, 0);
  const acceptedLastMonth = quotes.filter((q) => q.statut === "accepte" && lastMonth(q.date));
  const caLastMonth = acceptedLastMonth.reduce((s, q) => s + calcTotals(q.lignes).totalTTC, 0);
  const caVariation = caLastMonth > 0 ? ((caThisMonth - caLastMonth) / caLastMonth) * 100 : 0;

  const devisEnvoyes = quotes.filter((q) => q.statut === "envoye" && thisMonth(q.date)).length;
  const totalAccepte = quotes.filter((q) => q.statut === "accepte").length;
  const totalRefuse = quotes.filter((q) => q.statut === "refuse").length;
  const tauxConversion = totalAccepte + totalRefuse > 0 ? Math.round((totalAccepte / (totalAccepte + totalRefuse)) * 100) : 0;

  const relances = quotes.filter((q) => q.statut === "envoye" && daysSince(q.date) > 7);

  const hasCmdForQuote = (qId: string) => commandes.some((c: any) => c.devisId === qId);
  const hasFaForQuote = (qId: string) => factures.some((f: any) => f.devisId === qId);
  const getVariantCount = (q: Quote) => {
    const base = q.numero.replace(/-[a-z]$/, "");
    return quotes.filter((x) => x.numero.startsWith(base) && x.id !== q.id).length;
  };

  return (
    <div className="p-6 lg:p-8 w-full">
      {/* Header bar */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-display text-[32px] font-semibold text-foreground tracking-tight">
            Tableau de bord
          </h1>
          <p className="text-[13px] text-muted-foreground mt-1 font-body">
            Gestion des devis ORALIS
          </p>
        </div>
        <button
          onClick={() => navigate("/devis/nouveau")}
          className="btn-gold flex items-center gap-2"
        >
          <Plus size={16} />
          Nouveau Devis
        </button>
      </div>

      {/* ── KPI Row ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="luxury-card !p-4 flex flex-col justify-between h-20 border-l-[3px] border-l-accent">
          <span className="text-[11px] uppercase tracking-wide text-muted-foreground font-body">CA Accepté ce mois</span>
          <div className="flex items-end justify-between">
            <span className="font-display text-2xl text-foreground">{formatEUR(caThisMonth)}</span>
            {caLastMonth > 0 && (
              <span className={`text-[11px] font-body ${caVariation >= 0 ? "text-[hsl(var(--success))]" : "text-destructive"}`}>
                {caVariation >= 0 ? "↑" : "↓"} {caVariation >= 0 ? "+" : ""}{caVariation.toFixed(0)}%
              </span>
            )}
          </div>
        </div>
        <div className="luxury-card !p-4 flex flex-col justify-between h-20 border-l-[3px] border-l-accent">
          <span className="text-[11px] uppercase tracking-wide text-muted-foreground font-body">Devis envoyés</span>
          <div className="flex items-end justify-between">
            <span className="font-display text-2xl text-foreground">{devisEnvoyes}</span>
            <span className="text-[11px] text-muted-foreground font-body">ce mois</span>
          </div>
        </div>
        <div className="luxury-card !p-4 flex flex-col justify-between h-20 border-l-[3px] border-l-accent">
          <span className="text-[11px] uppercase tracking-wide text-muted-foreground font-body">Taux de conversion</span>
          <div className="flex items-end gap-3">
            <span className="font-display text-2xl text-foreground">{tauxConversion}%</span>
            <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden mb-1">
              <div className="h-full bg-accent rounded-full transition-all" style={{ width: `${tauxConversion}%` }} />
            </div>
          </div>
        </div>
        <div className="luxury-card !p-4 flex flex-col justify-between h-20 border-l-[3px] border-l-accent cursor-pointer" onClick={() => { if (relances.length > 0) setRelancesOpen(!relancesOpen); }}>
          <span className="text-[11px] uppercase tracking-wide text-muted-foreground font-body">Relances à faire</span>
          <div className="flex items-end justify-between">
            <span className="font-display text-2xl text-foreground">{relances.length}</span>
            {relances.length > 0 && (
              <span className="inline-block px-2 py-0.5 text-[10px] font-semibold bg-destructive text-destructive-foreground rounded-full">{relances.length}</span>
            )}
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <Search
          size={16}
          className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground"
        />
        <input
          type="text"
          placeholder="Rechercher par client ou n° de devis..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="form-input pl-11 pr-4 h-11 rounded-lg shadow-[var(--shadow-card)]"
        />
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="luxury-card p-16 text-center">
          <FileText size={48} className="mx-auto text-muted-foreground/20 mb-4" />
          <h2 className="font-display text-xl text-foreground mb-2">
            Aucun devis trouvé
          </h2>
          <p className="text-sm text-muted-foreground mb-6">
            {search
              ? "Aucun résultat pour votre recherche."
              : "Commencez par créer votre premier devis premium."}
          </p>
          {!search && (
            <button
              onClick={() => navigate("/devis/nouveau")}
              className="btn-gold inline-flex items-center gap-2"
            >
              <Plus size={16} />
              Créer un devis
            </button>
          )}
        </div>
      ) : (
        <div className="bg-card border border-border rounded-lg overflow-hidden shadow-[var(--shadow-card)]">
          <table className="w-full text-sm">
            <thead>
              <tr className="table-header-dark">
                <th className="text-left">N° Devis</th>
                <th className="text-left">Client</th>
                <th className="text-left">Date</th>
                <th className="text-right">Montant TTC</th>
                <th className="text-center" style={{ minWidth: "220px" }}>Statut</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((q, i) => {
                const { totalTTC } = calcTotals(q.lignes);
                const isFav = favoris.includes(q.id);
                const varCount = getVariantCount(q);
                return (
                  <tr
                    key={q.id}
                    onContextMenu={(e) => handleRowContextMenu(e, q)}
                    className={`border-b border-border last:border-0 transition-colors duration-150 hover:bg-accent/5 ${statusBorderClass[q.statut]} ${
                      isFav ? "bg-[#FFF8E7]" : i % 2 === 1 ? "bg-background" : "bg-card"
                    }`}
                  >
                    <td className="px-4 py-2 font-medium font-mono text-[13px]">
                      <div className="flex items-center gap-1.5">
                        {isFav && <Star size={12} className="text-accent fill-accent" />}
                        {q.numero}
                        {hasCmdForQuote(q.id) && (
                          <span className="inline-block px-1.5 py-0.5 text-[9px] font-semibold bg-accent text-accent-foreground rounded">CMD</span>
                        )}
                        {hasFaForQuote(q.id) && (
                          <span className="inline-block px-1.5 py-0.5 text-[9px] font-semibold bg-[hsl(220_75%_96%)] text-[hsl(220_75%_45%)] rounded">FA</span>
                        )}
                        {varCount > 0 && (
                          <span className="inline-block px-1.5 py-0.5 text-[9px] font-medium bg-muted text-muted-foreground rounded">{varCount} var.</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-2">
                      <span className="font-medium">{formatClientName(q.client)}</span>
                      {q.client.societe && (
                        <span className="text-muted-foreground ml-1.5 text-xs">
                          — {q.client.societe}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-2 text-muted-foreground">
                      {formatDate(q.date)}
                    </td>
                    <td className="px-4 py-2 text-right font-medium font-mono text-[13px]">
                      {formatEUR(totalTTC)}
                    </td>
                    <td className="px-4 py-2 text-center">
                      <StatusDropdown quote={q} onUpdate={reload} />
                    </td>
                    <td className="px-4 py-2 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => navigate(`/devis/${q.id}`)}
                          className="p-2 rounded hover:bg-muted transition-colors"
                          title="Modifier"
                        >
                          <Pencil size={14} className="text-muted-foreground" />
                        </button>
                        <button
                          onClick={() => navigate(`/devis/${q.id}/apercu`)}
                          className="p-2 rounded hover:bg-muted transition-colors"
                          title="Aperçu"
                        >
                          <Eye size={14} className="text-muted-foreground" />
                        </button>
                        {q.statut === "accepte" && !hasCmdForQuote(q.id) && (
                          <button
                            onClick={() => setConvertModal(q)}
                            className="px-2 py-1 rounded text-[11px] font-semibold bg-accent text-accent-foreground hover:opacity-90 transition-opacity flex items-center gap-1"
                            title="Convertir en commande"
                          >
                            <span>🔁</span> Commande
                          </button>
                        )}
                        <button
                          onClick={() => duplicateQuote(q)}
                          className="p-2 rounded hover:bg-muted transition-colors"
                          title="Dupliquer"
                        >
                          <Copy size={14} className="text-muted-foreground" />
                        </button>
                        <button
                          onClick={() => deleteQuote(q)}
                          className="p-2 rounded hover:bg-destructive/10 text-destructive transition-colors"
                          title="Supprimer"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Relances Widget ── */}
      {relances.length > 0 && (
        <div className="mt-6">
          <button
            onClick={() => setRelancesOpen(!relancesOpen)}
            className="flex items-center gap-2 text-accent font-display text-lg font-semibold mb-3 hover:opacity-80 transition-opacity"
          >
            <AlertTriangle size={18} />
            Relances à faire ({relances.length})
            <ChevronDown size={16} className={`transition-transform ${relancesOpen ? "rotate-180" : ""}`} />
          </button>
          {relancesOpen && (
            <div className="bg-card border border-border rounded-lg overflow-hidden shadow-[var(--shadow-card)]">
              <table className="w-full text-sm">
                <thead>
                  <tr className="table-header-dark">
                    <th className="text-left">Client</th>
                    <th className="text-left">N° Devis</th>
                    <th className="text-left">Envoyé le</th>
                    <th className="text-center">Jours sans réponse</th>
                    <th className="text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {relances.map((q, i) => (
                    <tr key={q.id} className={`border-b border-border last:border-0 ${i % 2 === 1 ? "bg-background" : "bg-card"}`}>
                      <td className="px-4 py-2 font-medium">{formatClientName(q.client)}</td>
                      <td className="px-4 py-2 font-mono text-[13px]">{q.numero}</td>
                      <td className="px-4 py-2 text-muted-foreground">{formatDate(q.date)}</td>
                      <td className="px-4 py-2 text-center">
                        <span className="inline-block px-2 py-0.5 text-[11px] font-semibold bg-destructive/10 text-destructive rounded-full">
                          {daysSince(q.date)} jours
                        </span>
                      </td>
                      <td className="px-4 py-2 text-right">
                        <a
                          href={`mailto:${q.client.email}?subject=Relance devis ${q.numero}&body=Bonjour ${formatClientName(q.client)}, suite à notre devis ${q.numero}, nous souhaitions savoir si vous aviez des questions. Cordialement, ORALIS`}
                          className="btn-outline-gold !px-3 !py-1.5 !text-[11px] inline-flex items-center gap-1.5"
                        >
                          <Mail size={12} /> Relancer
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Context Menu */}
      {ctxMenu && <ContextMenu ctx={ctxMenu} onClose={() => setCtxMenu(null)} onAction={handleCtxAction} />}

      {/* Modals */}
      {convertModal && <ConvertCommandeModal quote={convertModal} commandes={commandes} onClose={() => setConvertModal(null)} onDone={reload} />}
      {factureModal && <FactureAcompteModal quote={factureModal} factures={factures} onClose={() => setFactureModal(null)} onDone={reload} />}

      <ConfirmModal
        isOpen={confirmDelete.isOpen}
        message={confirmDelete.message}
        onConfirm={() => {
          setConfirmDelete({ isOpen: false, message: "", onConfirm: () => {} });
          confirmDelete.onConfirm();
        }}
        onCancel={() => setConfirmDelete({ isOpen: false, message: "", onConfirm: () => {} })}
      />
    </div>
  );
}
