import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Search, Plus, Eye, Pencil, Printer, Trash2, Copy,
  ChevronRight, ChevronDown, X, CreditCard, FileText,
  Receipt, TrendingUp, AlertTriangle, Clock, Ban
} from "lucide-react";
import { toast } from "sonner";
import {
  loadQuotes, formatEUR, formatDate, formatClientName, calcTotals, uid,
  type Quote, type QuoteLine,
} from "@/lib/quote-data";
import { loadSettings, getLegalMention, defaultComptabilite } from "@/lib/settings-data";
import { nextFactureNumberOR } from "@/lib/commande-data";
import { ConfirmModal } from "@/components/ConfirmModal";
import { jsPDF } from "jspdf";
import { dbLoadFactures, dbSaveFacture, dbDeleteFacture } from "@/lib/supabase-data/factures";
import { dbLoadCommerciaux, type Commercial } from "@/lib/supabase-data/commerciaux";

// ── Facture types ──
export interface Reglement {
  id: string;
  mode: string;
  libelle: string;
  dateReception: string;
  dateEnregistrement: string;
  montant: number;
}

export interface TvaBreakdownItem {
  taux: number;
  baseHT: number;
  montantTVA: number;
  montantTTC: number;
}

export interface Facture {
  id: string;
  numero: string;
  type: "acompte" | "situation" | "solde" | "avoir";
  devisId: string;
  devisNumero: string;
  commandeId?: string;
  client: Quote["client"];
  lignes: QuoteLine[];
  totalHT: number;
  totalTTC: number;
  montantAcompte: number;
  montantAcomptePct: number;
  montantAcompte2?: number;
  montantAcompte2Pct?: number;
  labelAcompte1?: string;
  labelAcompte2?: string;
  libelle: string;
  dateFacture: string;
  dateEcheance: string;
  modePaiement: string;
  modeReglement?: string;
  statut: "non_payee" | "partiel" | "payee" | "retard";
  reglements: Reglement[];
  dateCreation: string;
  tvaBreakdown: TvaBreakdownItem[];
  referenceAffaire?: string;
  commercial?: string;
  comptableId?: string;
  interlocuteur?: string;
  delai?: string;
  dureeValidite?: string;
  exclureTotalCmd?: boolean;
  retenueGarantie?: boolean;
  marcheRG?: string;
  dateLeveeRG?: string;
  pctRG?: number;
  dateRappel1?: string;
}

// ── localStorage helpers (Bypassed for Supabase) ──
function loadFactures(): Facture[] { return []; }
function initializeSampleFactures() {}

function nextFactureNumber(type: string = "FA"): string {
  const all = loadFactures();
  const y = new Date().getFullYear();
  const prefix = type === "avoir" ? "AV" : type === "situation" ? "FS" : type === "solde" ? "SOLDE" : "FA";
  const nums = all
    .filter((f) => f.numero.includes(prefix))
    .map((f) => { const m = f.numero.match(new RegExp(`${prefix}-\\d+-(\\d+)`)); return m ? parseInt(m[1]) : 0; })
    .filter(Boolean);
  const next = nums.length > 0 ? Math.max(...nums) + 1 : 1;
  return `ORALIS-${prefix}-${y}-${String(next).padStart(3, "0")}`;
}

// ── Statut helpers ──
const STATUT_FACTURE_LABELS: Record<string, string> = {
  non_payee: "Non payée",
  partiel: "Partiellement payée",
  payee: "Payée",
  retard: "En retard",
};
const statutClass: Record<string, string> = {
  non_payee: "status-refuse",
  partiel: "bg-[hsl(30_80%_95%)] text-[hsl(30_80%_40%)] rounded-full",
  payee: "status-accepte",
  retard: "bg-[hsl(4_65%_90%)] text-[hsl(4_65%_30%)] rounded-full",
};
const statutBorderClass: Record<string, string> = {
  non_payee: "",
  partiel: "",
  payee: "border-l-[3px] border-l-[hsl(150_45%_33%)]",
  retard: "border-l-[3px] border-l-destructive",
};

const TYPE_LABELS: Record<string, string> = { acompte: "FA", situation: "FS", solde: "SOLDE", avoir: "AVOIR" };
const TYPE_BADGE_CLASS: Record<string, string> = {
  acompte: "bg-[hsl(220_75%_96%)] text-[hsl(220_75%_45%)]",
  situation: "bg-[hsl(270_50%_96%)] text-[hsl(270_50%_45%)]",
  solde: "bg-[hsl(150_40%_96%)] text-[hsl(150_45%_33%)]",
  avoir: "bg-[hsl(4_65%_96%)] text-[hsl(4_65%_47%)]",
};

function daysSince(dateStr: string): number {
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000);
}

// ── Context Menu ──
function FactureContextMenu({ ctx, onClose, onAction }: {
  ctx: { x: number; y: number; facture: Facture };
  onClose: () => void;
  onAction: (action: string, f: Facture, sub?: string) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [subOpen, setSubOpen] = useState<string | null>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) onClose(); };
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("mousedown", handler);
    document.addEventListener("keydown", esc);
    return () => { document.removeEventListener("mousedown", handler); document.removeEventListener("keydown", esc); };
  }, [onClose]);

  const f = ctx.facture;
  const Item = ({ icon, label, onClick, danger, disabled }: { icon: React.ReactNode; label: string; onClick?: () => void; danger?: boolean; disabled?: boolean }) => (
    <button
      className={`w-full flex items-center gap-3 px-4 py-2 text-[13px] font-body text-left transition-colors ${danger ? "text-destructive" : ""} ${disabled ? "opacity-40 cursor-not-allowed" : "hover:bg-accent/[0.08] cursor-pointer"}`}
      onClick={disabled ? undefined : () => { onClick?.(); onClose(); }}
      disabled={disabled}
    >{icon}{label}</button>
  );
  const Divider = () => <div className="border-t border-border my-1" />;

  const style: React.CSSProperties = {
    position: "fixed",
    top: Math.min(ctx.y, window.innerHeight - 380),
    left: Math.min(ctx.x, window.innerWidth - 240),
    zIndex: 50,
  };

  return (
    <div ref={ref} style={style} className="w-[260px] bg-card border border-border rounded-lg py-1 shadow-[var(--shadow-elevated)]">
      <Item icon={<Eye size={14} />} label="Voir l'aperçu PDF" onClick={() => onAction("preview", f)} />
      <Item icon={<Pencil size={14} />} label="Modifier" onClick={() => onAction("edit", f)} />
      <Item icon={<CreditCard size={14} />} label="Saisir un règlement" onClick={() => onAction("reglement", f)} />
      <Item icon={<Copy size={14} />} label="Dupliquer" onClick={() => onAction("duplicate", f)} />
      <Divider />
      <Item icon={<FileText size={14} />} label="Créer une facture de situation" onClick={() => onAction("create_situation", f)} />
      <Item icon={<Ban size={14} />} label="Créer une facture d'annulation" onClick={() => onAction("create_avoir", f)} danger />
      <Divider />
      <div className="relative" onMouseEnter={() => setSubOpen("status")} onMouseLeave={() => setSubOpen(null)}>
        <div className="w-full flex items-center justify-between gap-3 px-4 py-2 text-[13px] font-body hover:bg-accent/[0.08] cursor-pointer">
          <span className="flex items-center gap-3"><ChevronRight size={12} />Changer le statut</span>
          <ChevronRight size={12} />
        </div>
        {subOpen === "status" && (
          <div className="absolute left-full top-0 w-[180px] bg-card border border-border rounded-lg py-1 shadow-[var(--shadow-elevated)]">
            {(["non_payee", "partiel", "payee"] as const).map((s) => (
              <button key={s} className={`w-full text-left px-4 py-2 text-[13px] font-body hover:bg-accent/[0.08] ${f.statut === s ? "font-semibold text-accent" : ""}`}
                onClick={() => { onAction("set_status", f, s); onClose(); }}
              >{STATUT_FACTURE_LABELS[s]}</button>
            ))}
          </div>
        )}
      </div>
      <Divider />
      <Item icon={<Printer size={14} />} label="Imprimer/Exporter" onClick={() => onAction("print", f)} />
      <Divider />
      <Item icon={<Trash2 size={14} />} label="Supprimer" onClick={() => onAction("delete", f)} danger />
    </div>
  );
}

// ── Status Dropdown for facture ──
function FStatutDropdown({ facture, onUpdate }: { facture: Facture; onUpdate: () => void }) {
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

  const changeStatus = async (s: Facture["statut"]) => {
    try {
      let updatedFacture = { ...facture, statut: s };

      if (s === "payee") {
        const totalExistant = facture.reglements.reduce((acc, r) => acc + r.montant, 0);
        if (totalExistant < facture.montantAcompte) {
          const resteAPayer = Math.round((facture.montantAcompte - totalExistant) * 100) / 100;
          const today = new Date().toISOString().split("T")[0];
          updatedFacture.reglements = [
            ...facture.reglements,
            {
              id: uid(),
              mode: facture.modePaiement || "Virement",
              libelle: "Règlement automatique",
              dateReception: today,
              dateEnregistrement: today,
              montant: resteAPayer
            }
          ];
        }
      }

      await dbSaveFacture(updatedFacture);
      setOpen(false);
      onUpdate();
      toast.success(`Statut changé : ${STATUT_FACTURE_LABELS[s]}`);
    } catch (err) {
      toast.error("Erreur lors de la mise à jour du statut.");
    }
  };

  const openDropdown = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      const dropdownHeight = 130; // approximate height of 3 items
      const spaceBelow = window.innerHeight - rect.bottom;
      const top = (spaceBelow < dropdownHeight && rect.top > dropdownHeight)
        ? rect.top - dropdownHeight - 6
        : rect.bottom + 6;
      setDropPos({ top, left: rect.left });
    }
    setOpen(!open);
  };

  return (
    <div className="relative inline-block" ref={ref}>
      <button ref={btnRef} onClick={openDropdown}
        className={`inline-flex items-center gap-1 px-3 py-1 text-[11px] font-semibold tracking-wide ${statutClass[facture.statut]} cursor-pointer`}
      >{STATUT_FACTURE_LABELS[facture.statut]}<ChevronDown size={10} /></button>
      {open && (
        <div className="fixed z-50 w-[170px] bg-card border border-border rounded-lg py-1 shadow-[var(--shadow-elevated)]"
          style={{ top: dropPos.top, left: dropPos.left }}>
          {(["non_payee", "partiel", "payee"] as const).map((s) => (
            <button key={s} className={`w-full text-left px-3 py-1.5 text-[12px] font-body hover:bg-accent/[0.08] ${facture.statut === s ? "font-semibold text-accent" : ""}`}
              onClick={(e) => { e.stopPropagation(); changeStatus(s); }}
            >{STATUT_FACTURE_LABELS[s]}</button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Add Reglement Modal ──
function ReglementModal({ facture, onClose, onDone }: { facture: Facture; onClose: () => void; onDone: () => void }) {
  const [mode, setMode] = useState("Virement");
  const [libelle, setLibelle] = useState("Acompte");
  const [dateReception, setDateReception] = useState(new Date().toISOString().split("T")[0]);
  const [dateEnreg, setDateEnreg] = useState(new Date().toISOString().split("T")[0]);
  const [montant, setMontant] = useState(0);
  const [solder, setSolder] = useState(false);

  const totalRecu = facture.reglements.reduce((s, r) => s + r.montant, 0);
  const restant = facture.montantAcompte - totalRecu;

  const handleAdd = async () => {
    if (!montant || montant <= 0) { toast.error("Montant invalide"); return; }
    try {
      const newReglement = { id: uid(), mode, libelle, dateReception, dateEnregistrement: dateEnreg, montant };
      const updatedReglements = [...facture.reglements, newReglement];
      const newTotal = Math.round(updatedReglements.reduce((s, r) => s + r.montant, 0) * 100) / 100;
      const due = Math.round(facture.montantAcompte * 100) / 100;
      
      let newStatut: Facture["statut"] = facture.statut;
      if (solder || newTotal >= due - 0.01) {
        newStatut = "payee";
      } else if (newTotal > 0) {
        newStatut = "partiel";
      }
      
      const updatedFacture: Facture = {
        ...facture,
        reglements: updatedReglements,
        statut: newStatut
      };
      
      await dbSaveFacture(updatedFacture);
      toast.success("Règlement enregistré ✓");
      onDone();
      onClose();
    } catch (err) {
      toast.error("Erreur lors de l'enregistrement du règlement.");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={onClose}>
      <div className="bg-card border border-border rounded-lg w-full max-w-md p-6 shadow-[var(--shadow-elevated)]" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-display text-xl font-semibold">Saisir un règlement</h2>
          <button onClick={onClose} className="p-1 hover:bg-muted rounded"><X size={16} /></button>
        </div>
        <p className="text-sm text-muted-foreground mb-4">
          Facture <span className="font-mono font-medium text-foreground">{facture.numero}</span> — Restant : <span className="font-mono font-medium text-accent">{formatEUR(restant)}</span>
        </p>
        <div className="space-y-4">
          <div>
            <label className="form-label">Mode</label>
            <select className="form-input" value={mode} onChange={(e) => setMode(e.target.value)}>
              {["Virement", "Chèque", "CB", "Espèces"].map((m) => <option key={m}>{m}</option>)}
            </select>
          </div>
          <div>
            <label className="form-label">Libellé</label>
            <input className="form-input" value={libelle} onChange={(e) => setLibelle(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="form-label">Date réception</label><input type="date" className="form-input" value={dateReception} onChange={(e) => setDateReception(e.target.value)} /></div>
            <div><label className="form-label">Date enregistrement</label><input type="date" className="form-input" value={dateEnreg} onChange={(e) => setDateEnreg(e.target.value)} /></div>
          </div>
          <div>
            <label className="form-label">Montant (€)</label>
            <input type="number" className="form-input" value={montant} onChange={(e) => setMontant(Number(e.target.value))} step={0.01} />
          </div>
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input type="checkbox" checked={solder} onChange={(e) => setSolder(e.target.checked)} className="accent-[hsl(var(--accent))]" />
            Solder ce document
          </label>
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <button onClick={onClose} className="btn-ghost">Annuler</button>
          <button onClick={handleAdd} className="btn-gold">Enregistrer</button>
        </div>
      </div>
    </div>
  );
}

// ── Facture Detail View ──
function FactureDetail({ factureId, onBack }: { factureId: string; onBack: () => void }) {
  const [facture, setFacture] = useState<Facture | null>(null);
  const [tab, setTab] = useState<"affaire" | "contenu" | "reglement">("affaire");
  const [reglementModal, setReglementModal] = useState(false);
  const navigate = useNavigate();
  const [confirmDelete, setConfirmDelete] = useState<{
    isOpen: boolean;
    message: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    message: "",
    onConfirm: () => {},
  });
  const [loading, setLoading] = useState(true);
  const [comptables, setComptables] = useState<Commercial[]>([]);

  const reload = useCallback(async () => {
    try {
      setLoading(true);
      const [all, loadedComms] = await Promise.all([
        dbLoadFactures(),
        dbLoadCommerciaux()
      ]);
      const found = all.find((f) => f.id === factureId);
      if (found) {
        const activeComptables = loadedComms.filter(c => c.role === 'comptable' && c.actif);
        setComptables(activeComptables);

        // Auto-select if empty and country is known
        if (!found.comptableId && found.client?.pays) {
          const autoC = activeComptables.find(c => c.pays.toLowerCase() === found.client.pays.toLowerCase());
          if (autoC) {
            found.comptableId = autoC.id;
            await dbSaveFacture(found);
          }
        }
        setFacture(found);
      }
    } catch (err) {
      toast.error("Erreur lors du chargement de la facture.");
    } finally {
      setLoading(false);
    }
  }, [factureId]);

  useEffect(() => { reload(); }, [reload]);

  const updateField = async (field: string, value: any) => {
    if (!facture) return;
    try {
      const updatedFacture = { ...facture, [field]: value };
      await dbSaveFacture(updatedFacture);
      setFacture(updatedFacture);
    } catch (err) {
      toast.error("Erreur lors de la mise à jour de la facture.");
    }
  };

  if (loading || !facture) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-full border-4 border-accent border-t-transparent animate-spin"></div>
          <p className="text-xs text-muted-foreground font-body">Chargement de la facture...</p>
        </div>
      </div>
    );
  }

  const totals = calcTotals(facture.lignes);
  const totalRecu = facture.reglements.reduce((s, r) => s + r.montant, 0);
  const netAPayer = facture.montantAcompte - totalRecu;

  const tabs = [
    { key: "affaire", label: "Données affaire" },
    { key: "contenu", label: "Contenu" },
    { key: "reglement", label: "Règlement reçu" },
  ] as const;

  return (
    <div className="p-6 lg:p-8 w-full">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 hover:bg-muted rounded transition-colors"><X size={18} /></button>
          <div>
            <h1 className="font-display text-[32px] font-semibold text-foreground tracking-tight">
              {facture.numero}
            </h1>
            <p className="text-[13px] text-muted-foreground mt-0.5 font-body">
              {formatClientName(facture.client)} — {facture.libelle}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(`/factures/${facture.id}/apercu`)} className="btn-outline-gold flex items-center gap-2 text-xs"><Eye size={14} />Aperçu PDF</button>
          <button onClick={() => navigate(`/factures/${facture.id}/apercu`, { state: { autoPrint: true } })} className="btn-gold flex items-center gap-2 text-xs"><Printer size={14} />Imprimer</button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-0 border-b border-border mb-6">
        {tabs.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`px-5 py-3 text-[13px] font-medium font-body border-b-2 transition-colors ${tab === t.key ? "border-accent text-accent" : "border-transparent text-muted-foreground hover:text-foreground"}`}
          >{t.label}</button>
        ))}
      </div>

      {/* TAB 1 — Données affaire */}
      {tab === "affaire" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="luxury-card space-y-4">
              <h3 className="section-title">Informations facture</h3>
              <div>
                <label className="form-label">N° Facture</label>
                <input
                  className="form-input"
                  value={facture.numero}
                  onChange={(e) => updateField("numero", e.target.value)}
                />
              </div>
              <div>
                <label className="form-label">Type</label>
                <select className="form-input" value={facture.type} onChange={(e) => updateField("type", e.target.value)}>
                  <option value="acompte">FA — Acompte</option>
                  <option value="situation">FS — Situation</option>
                  <option value="solde">Solde</option>
                  <option value="avoir">Avoir</option>
                </select>
              </div>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" checked={facture.exclureTotalCmd || false} onChange={(e) => updateField("exclureTotalCmd", e.target.checked)} className="accent-[hsl(var(--accent))]" />
                Exclure du total des commandes
              </label>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="form-label">Date du document</label><input type="date" className="form-input" value={facture.dateFacture} onChange={(e) => updateField("dateFacture", e.target.value)} /></div>
                <div><label className="form-label">Date d'échéance</label><input type="date" className="form-input" value={facture.dateEcheance} onChange={(e) => updateField("dateEcheance", e.target.value)} /></div>
              </div>
              <div><label className="form-label">Délai</label><input className="form-input" placeholder="30 jours" value={facture.delai || ""} onChange={(e) => updateField("delai", e.target.value)} /></div>
              <div><label className="form-label">Interlocuteur</label><input className="form-input" value={facture.interlocuteur || ""} onChange={(e) => updateField("interlocuteur", e.target.value)} /></div>
              <div><label className="form-label">Durée de validité</label><input className="form-input" value={facture.dureeValidite || ""} onChange={(e) => updateField("dureeValidite", e.target.value)} /></div>
            </div>

            <div className="luxury-card space-y-4">
              <h3 className="section-title">Client & Références</h3>
              <div className="bg-muted/30 rounded p-4 text-sm space-y-1">
                <p className="font-semibold">{formatClientName(facture.client)}</p>
                {facture.client.societe && <p>{facture.client.societe}</p>}
                <p>{facture.client.rue}</p>
                <p>{facture.client.codePostal} {facture.client.ville}, {facture.client.pays}</p>
                <p className="text-muted-foreground">{facture.client.email}</p>
                <p className="text-muted-foreground">{facture.client.telephone}</p>
              </div>
              <div><label className="form-label">Référence affaire</label><input className="form-input" value={facture.referenceAffaire || ""} onChange={(e) => updateField("referenceAffaire", e.target.value)} /></div>
              <div><label className="form-label">Devis lié</label><input className="form-input bg-muted/30" value={facture.devisNumero} readOnly /></div>
              <div>
                <label className="form-label">Comptable</label>
                <select className="form-input" value={facture.comptableId || ""} onChange={(e) => updateField("comptableId", e.target.value)}>
                  <option value="">Sélectionner un comptable...</option>
                  {comptables.map(c => (
                    <option key={c.id} value={c.id}>{c.prenom} {c.nom} — {c.pays}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Acomptes section */}
          <div className="luxury-card space-y-4">
            <h3 className="section-title">Infos Acomptes</h3>
            <div>
              <label className="form-label">Mode de règlement</label>
              <select className="form-input" value={facture.modeReglement || "50% à la commande, 45% à la livraison, 5% à la réception des travaux"} onChange={(e) => updateField("modeReglement", e.target.value)}>
                <option>50% à la commande, 45% à la livraison, 5% à la réception des travaux</option>
                <option>30% à la commande, solde à la livraison</option>
                <option>50% à la commande, 50% à la livraison</option>
                <option>100% à la commande</option>
                <option>Paiement à réception</option>
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="form-label">Acompte demandé 1 (%)</label>
                <div className="flex items-center gap-2">
                  <input type="number" className="form-input w-24" value={facture.montantAcomptePct} onChange={(e) => {
                    const pct = Number(e.target.value);
                    updateField("montantAcomptePct", pct);
                    updateField("montantAcompte", facture.totalTTC * (pct / 100));
                  }} />
                  <span className="text-sm text-muted-foreground font-mono">= {formatEUR(facture.montantAcompte)}</span>
                </div>
                <input className="form-input mt-2" placeholder="Label (ex: Acompte à la commande)" value={facture.labelAcompte1 || ""} onChange={(e) => updateField("labelAcompte1", e.target.value)} />
              </div>
              <div>
                <label className="form-label">Acompte demandé 2 (%) — optionnel</label>
                <div className="flex items-center gap-2">
                  <input type="number" className="form-input w-24" value={facture.montantAcompte2Pct || 0} onChange={(e) => {
                    const pct = Number(e.target.value);
                    updateField("montantAcompte2Pct", pct);
                    updateField("montantAcompte2", facture.totalTTC * (pct / 100));
                  }} />
                  <span className="text-sm text-muted-foreground font-mono">= {formatEUR(facture.montantAcompte2 || 0)}</span>
                </div>
                <input className="form-input mt-2" placeholder="Label (optionnel)" value={facture.labelAcompte2 || ""} onChange={(e) => updateField("labelAcompte2", e.target.value)} />
              </div>
            </div>
            <div className="bg-muted/30 rounded p-3 text-sm">
              <span className="text-muted-foreground">Acompte reçu :</span> <span className="font-mono font-medium">{formatEUR(totalRecu)}</span>
            </div>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" checked={facture.retenueGarantie || false} onChange={(e) => updateField("retenueGarantie", e.target.checked)} className="accent-[hsl(var(--accent))]" />
              Retenue de garantie
            </label>
            {facture.retenueGarantie && (
              <div className="grid grid-cols-3 gap-3 pl-6">
                <div><label className="form-label">Marché RG</label><input className="form-input" value={facture.marcheRG || ""} onChange={(e) => updateField("marcheRG", e.target.value)} /></div>
                <div><label className="form-label">Date levée RG</label><input type="date" className="form-input" value={facture.dateLeveeRG || ""} onChange={(e) => updateField("dateLeveeRG", e.target.value)} /></div>
                <div><label className="form-label">% RG</label><input type="number" className="form-input" value={facture.pctRG || 5} onChange={(e) => updateField("pctRG", Number(e.target.value))} /></div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2 — Contenu */}
      {tab === "contenu" && (
        <div className="space-y-6">
          <div className="bg-card border border-border rounded-lg overflow-hidden shadow-[var(--shadow-card)]">
            <table className="w-full text-sm">
              <thead>
                <tr className="table-header-dark">
                  <th className="text-left">N°</th>
                  <th className="text-left">Désignation</th>
                  <th className="text-center">Dim1</th>
                  <th className="text-center">Dim2</th>
                  <th className="text-center">Qté</th>
                  <th className="text-right">PU HT</th>
                  <th className="text-right">Total HT</th>
                </tr>
              </thead>
              <tbody>
                {facture.lignes.map((l, i) => (
                  <tr key={l.id} className={`border-b border-border ${i % 2 === 1 ? "bg-background" : "bg-card"}`}>
                    <td className="px-4 py-2 font-mono text-[13px]">{i + 1}</td>
                    <td className="px-4 py-2">
                      <span className="font-medium">{l.designation}</span>
                      {l.description && <p className="text-xs text-muted-foreground whitespace-pre-line">{l.description}</p>}
                    </td>
                    <td className="px-4 py-2 text-center text-muted-foreground">—</td>
                    <td className="px-4 py-2 text-center text-muted-foreground">—</td>
                    <td className="px-4 py-2 text-center font-mono">{l.quantite}</td>
                    <td className="px-4 py-2 text-right font-mono">{formatEUR(l.prixUnitaireHT)}</td>
                    <td className="px-4 py-2 text-right font-mono font-medium">{formatEUR(l.quantite * l.prixUnitaireHT)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totaux */}
          <div className="flex justify-end">
            <div className="luxury-card w-96 space-y-2">
              <h3 className="section-title">Totaux du document</h3>
              {facture.tvaBreakdown.map((tb) => (
                <div key={tb.taux} className="flex justify-between text-sm">
                  <span className="text-muted-foreground">TVA {tb.taux}% sur {formatEUR(tb.baseHT)}</span>
                  <span className="font-mono">{formatEUR(tb.montantTVA)}</span>
                </div>
              ))}
              <div className="flex justify-between text-sm pt-2 border-t border-border">
                <span className="text-muted-foreground">Total HT</span>
                <span className="font-mono font-medium">{formatEUR(totals.sousTotal)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Total TVA</span>
                <span className="font-mono">{formatEUR(totals.totalTVA)}</span>
              </div>
              <div className="flex justify-between pt-2 border-t-2 border-accent">
                <span className="font-display text-xl font-bold">TOTAL TTC</span>
                <span className="font-display text-xl font-bold text-accent">{formatEUR(totals.totalTTC)}</span>
              </div>
              <div className="flex justify-between text-sm pt-2">
                <span className="text-muted-foreground">Acompte demandé (TTC)</span>
                <span className="font-mono font-medium">{formatEUR(facture.montantAcompte)}</span>
              </div>
              <div className="flex justify-between text-sm font-semibold">
                <span>Reste à régler</span>
                <span className="font-mono">{formatEUR(netAPayer > 0 ? netAPayer : facture.montantAcompte)}</span>
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <button className="btn-ghost text-xs opacity-50 cursor-not-allowed">Prestations</button>
            <button className="btn-ghost text-xs opacity-50 cursor-not-allowed">Marges</button>
            <button className="btn-ghost text-xs opacity-50 cursor-not-allowed">Conditions tarifaires</button>
          </div>
        </div>
      )}

      {/* TAB 3 — Règlement reçu */}
      {tab === "reglement" && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="font-display text-lg font-semibold">Règlements reçus</h3>
            <button onClick={() => setReglementModal(true)} className="btn-gold flex items-center gap-2 text-xs">
              <Plus size={14} />Ajouter un règlement
            </button>
          </div>

          {facture.reglements.length === 0 ? (
            <div className="luxury-card p-12 text-center">
              <CreditCard size={40} className="mx-auto text-muted-foreground/20 mb-3" />
              <p className="text-sm text-muted-foreground">Aucun règlement enregistré</p>
            </div>
          ) : (
            <div className="bg-card border border-border rounded-lg overflow-hidden shadow-[var(--shadow-card)]">
              <table className="w-full text-sm">
                <thead>
                  <tr className="table-header-dark">
                    <th className="text-left">Mode</th>
                    <th className="text-left">Libellé</th>
                    <th className="text-left">Date réception</th>
                    <th className="text-left">Date enregistrement</th>
                    <th className="text-right">Montant</th>
                    <th className="text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {facture.reglements.map((r, i) => (
                    <tr key={r.id} className={`border-b border-border ${i % 2 === 1 ? "bg-background" : "bg-card"}`}>
                      <td className="px-4 py-2">{r.mode}</td>
                      <td className="px-4 py-2">{r.libelle}</td>
                      <td className="px-4 py-2 text-muted-foreground">{formatDate(r.dateReception)}</td>
                      <td className="px-4 py-2 text-muted-foreground">{formatDate(r.dateEnregistrement)}</td>
                      <td className="px-4 py-2 text-right font-mono font-medium">{formatEUR(r.montant)}</td>
                      <td className="px-4 py-2 text-right">
                        <button onClick={() => {
                          setConfirmDelete({
                            isOpen: true,
                            message: "Voulez-vous vraiment supprimer ce règlement ?",
                            onConfirm: async () => {
                              try {
                                const updatedReglements = facture.reglements.filter((x) => x.id !== r.id);
                                const newTotal = Math.round(updatedReglements.reduce((s, x) => s + x.montant, 0) * 100) / 100;
                                const due = Math.round(facture.montantAcompte * 100) / 100;
                                
                                let newStatut: Facture["statut"] = "non_payee";
                                if (newTotal >= due - 0.01) {
                                  newStatut = "payee";
                                } else if (newTotal > 0) {
                                  newStatut = "partiel";
                                }

                                const updatedFacture: Facture = {
                                  ...facture,
                                  reglements: updatedReglements,
                                  statut: newStatut
                                };
                                await dbSaveFacture(updatedFacture);
                                toast.success("Règlement supprimé ✓");
                                reload();
                              } catch (err) {
                                toast.error("Erreur lors de la suppression du règlement.");
                              }
                            },
                          });
                        }} className="p-1.5 rounded hover:bg-muted transition-colors"><Trash2 size={13} className="text-destructive" /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="luxury-card space-y-2 max-w-sm ml-auto">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Règlements reçus</span>
              <span className="font-mono font-medium text-[hsl(var(--success))]">{formatEUR(totalRecu)}</span>
            </div>
            <div className="flex justify-between text-sm font-semibold">
              <span>Reste à régler</span>
              <span className="font-mono">{formatEUR(netAPayer > 0 ? netAPayer : 0)}</span>
            </div>
            {facture.retenueGarantie && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Solde Retenue</span>
                <span className="font-mono">{formatEUR(facture.totalTTC * ((facture.pctRG || 5) / 100))}</span>
              </div>
            )}
          </div>

          {reglementModal && <ReglementModal facture={facture} onClose={() => setReglementModal(false)} onDone={reload} />}
        </div>
      )}
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

// ════════════════════════════════════════
// MAIN FACTURES PAGE
// ════════════════════════════════════════
export default function Factures() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [factures, setFactures] = useState<Facture[]>([]);
  const [search, setSearch] = useState("");
  const [filterTab, setFilterTab] = useState("toutes");
  const [ctxMenu, setCtxMenu] = useState<{ x: number; y: number; facture: Facture } | null>(null);
  const [reglementModal, setReglementModal] = useState<Facture | null>(null);
  const [kpiPeriod, setKpiPeriod] = useState<"mois" | "mois_prec" | "annee" | "tout">("mois");
  const [confirmDelete, setConfirmDelete] = useState<{
    isOpen: boolean;
    message: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    message: "",
    onConfirm: () => {},
  });
  const [rappelModalInvoice, setRappelModalInvoice] = useState<Facture | null>(null);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    try {
      setLoading(true);
      const all = await dbLoadFactures();
      
      // Check overdue invoices and update them in Supabase
      const updatedList = await Promise.all(all.map(async (f) => {
        if (f.statut === "non_payee" && daysSince(f.dateEcheance) > 0) {
          const updated = { ...f, statut: "retard" as const };
          await dbSaveFacture(updated);
          return updated;
        }
        return f;
      }));

      setFactures(updatedList);
    } catch (err) {
      toast.error("Erreur lors du chargement des factures.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { reload(); }, [reload]);

  // If detail view
  if (id) {
    return <FactureDetail factureId={id} onBack={() => navigate("/factures")} />;
  }

  const filtered = factures.filter((f) => {
    const matchSearch = f.numero.toLowerCase().includes(search.toLowerCase()) ||
      f.client.nom.toLowerCase().includes(search.toLowerCase()) ||
      f.client.prenom.toLowerCase().includes(search.toLowerCase());
    if (!matchSearch) return false;
    switch (filterTab) {
      case "non_payee": return f.statut === "non_payee" || f.statut === "retard";
      case "partiel": return f.statut === "partiel";
      case "payee": return f.statut === "payee";
      case "retard": return f.statut === "retard";
      default: return true;
    }
  });

  // KPIs
  const now = new Date();
  const periodFilter = (d: string): boolean => {
    if (!d) return false;
    const dt = new Date(d);
    if (isNaN(dt.getTime())) return false;
    if (kpiPeriod === "mois") return dt.getMonth() === now.getMonth() && dt.getFullYear() === now.getFullYear();
    if (kpiPeriod === "mois_prec") {
      const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      return dt.getMonth() === prev.getMonth() && dt.getFullYear() === prev.getFullYear();
    }
    if (kpiPeriod === "annee") return dt.getFullYear() === now.getFullYear();
    return true; // "tout"
  };
  const KPI_PERIOD_LABELS: Record<string, string> = { mois: "ce mois", mois_prec: "mois préc.", annee: "cette année", tout: "total" };
  const kpiPeriodLabel = KPI_PERIOD_LABELS[kpiPeriod];
  const facturesPeriod = factures.filter((f) => periodFilter(f.dateFacture));
  const totalFacture = facturesPeriod.reduce((s, f) => s + f.montantAcompte, 0);
  const enAttente = factures.filter((f) => f.statut === "non_payee" || f.statut === "partiel").reduce((s, f) => s + (f.montantAcompte - f.reglements.reduce((a, r) => a + r.montant, 0)), 0);
  const enRetard = factures.filter((f) => f.statut === "retard").length;
  const encaisse = facturesPeriod.reduce((s, f) => {
    // Factures marked payée directly without reglements: count full montantAcompte
    if (f.statut === "payee" && f.reglements.length === 0) return s + f.montantAcompte;
    // Factures with reglements: sum only those within the period
    const reglementTotal = f.reglements
      .filter((r) => kpiPeriod === "tout" || periodFilter(r.dateReception))
      .reduce((a, r) => a + r.montant, 0);
    return s + reglementTotal;
  }, 0);
  // TVA encaissée = portion TVA de l'encaissé, calculée au prorata TTC/HT de chaque facture
  const tvaEncaisse = facturesPeriod.reduce((s, f) => {
    const tvaRatio = f.totalTTC > 0 ? (f.totalTTC - f.totalHT) / f.totalTTC : 0;
    if (f.statut === "payee" && f.reglements.length === 0) return s + f.montantAcompte * tvaRatio;
    const reglementTotal = f.reglements
      .filter((r) => kpiPeriod === "tout" || periodFilter(r.dateReception))
      .reduce((a, r) => a + r.montant, 0);
    return s + reglementTotal * tvaRatio;
  }, 0);
  const totalAllTTC = filtered.reduce((s, f) => s + f.montantAcompte, 0);
  const totalAllEncaisse = filtered.reduce((s, f) => s + f.reglements.reduce((a, r) => a + r.montant, 0), 0);

  const handleCtxAction = async (action: string, f: Facture, sub?: string) => {
    switch (action) {
      case "preview": navigate(`/factures/${f.id}/apercu`); break;
      case "edit": navigate(`/factures/${f.id}`); break;
      case "reglement": setReglementModal(f); break;
      case "duplicate": {
        try {
          const nextNum = nextFactureNumberOR(factures);
          const dup: Facture = {
            ...JSON.parse(JSON.stringify(f)),
            id: uid(),
            numero: nextNum,
            statut: "non_payee",
            reglements: [],
            dateCreation: new Date().toISOString().split("T")[0]
          };
          await dbSaveFacture(dup);
          await reload();
          toast.success("Facture dupliquée ✓");
        } catch (err) {
          toast.error("Erreur lors de la duplication de la facture.");
        }
        break;
      }
      case "create_situation": {
        try {
          const nextNum = nextFactureNumberOR(factures);
          const sit: Facture = {
            ...JSON.parse(JSON.stringify(f)),
            id: uid(),
            numero: nextNum,
            type: "situation",
            statut: "non_payee",
            reglements: [],
            dateFacture: new Date().toISOString().split("T")[0],
            dateEcheance: (() => { const d = new Date(); d.setDate(d.getDate() + 30); return d.toISOString().split("T")[0]; })(),
            dateCreation: new Date().toISOString().split("T")[0],
          };
          await dbSaveFacture(sit);
          await reload();
          toast.success("Facture de situation créée ✓");
        } catch (err) {
          toast.error("Erreur lors de la création de la situation.");
        }
        break;
      }
      case "create_avoir": {
        try {
          const nextNum = nextFactureNumberOR(factures);
          const avoir: Facture = {
            ...JSON.parse(JSON.stringify(f)),
            id: uid(),
            numero: nextNum,
            type: "avoir",
            statut: "payee",
            reglements: [],
            dateFacture: new Date().toISOString().split("T")[0],
            dateEcheance: new Date().toISOString().split("T")[0],
            dateCreation: new Date().toISOString().split("T")[0],
            libelle: `Avoir sur facture ${f.numero}`,
          };
          await dbSaveFacture(avoir);
          await reload();
          toast.success("Facture d'annulation créée ✓");
        } catch (err) {
          toast.error("Erreur lors de la création de l'avoir.");
        }
        break;
      }
      case "set_status": {
        if (sub) {
          try {
            const updated = { ...f, statut: sub as Facture["statut"] };
            await dbSaveFacture(updated);
            await reload();
            toast.success(`Statut changé : ${STATUT_FACTURE_LABELS[sub]}`);
          } catch (err) {
            toast.error("Erreur lors du changement de statut.");
          }
        }
        break;
      }
      case "print": navigate(`/factures/${f.id}/apercu`); break;
      case "delete": {
        setConfirmDelete({
          isOpen: true,
          message: `Voulez-vous vraiment supprimer la facture ${f.numero} ? Cette action est irréversible.`,
          onConfirm: async () => {
            try {
              await dbDeleteFacture(f.id);
              await reload();
              toast.success("Facture supprimée ✓");
            } catch (err) {
              toast.error("Erreur lors de la suppression de la facture.");
            }
          },
        });
        break;
      }
    }
    setCtxMenu(null);
  };

  const filterTabs = [
    { key: "toutes", label: "Toutes" },
    { key: "non_payee", label: "Non payées" },
    { key: "partiel", label: "Partiellement payées" },
    { key: "payee", label: "Payées" },
    { key: "retard", label: "En retard" },
  ];

  return (
    <div className="p-6 lg:p-8 w-full">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-[32px] font-semibold text-foreground tracking-tight">Factures</h1>
          <p className="text-[13px] text-muted-foreground mt-1 font-body">Gestion des factures ORALIS</p>
        </div>
        <button onClick={() => { toast.info("Créez une facture depuis un devis accepté dans le Tableau de bord"); }} className="btn-gold flex items-center gap-2">
          <Plus size={16} />Nouvelle facture
        </button>
      </div>

      {/* KPI Period selector */}
      <div className="flex items-center gap-1.5 mb-3">
        <span className="text-[11px] text-muted-foreground uppercase tracking-wide font-body mr-1">Période :</span>
        {(["mois", "mois_prec", "annee", "tout"] as const).map((p) => {
          const labels: Record<string, string> = { mois: "Ce mois", mois_prec: "Mois préc.", annee: "Cette année", tout: "Tout" };
          return (
            <button key={p} onClick={() => setKpiPeriod(p)}
              className={`px-3 py-1 text-[12px] rounded font-body transition-colors border ${kpiPeriod === p ? "bg-accent text-accent-foreground border-accent" : "bg-card text-muted-foreground border-border hover:text-foreground hover:border-accent/50"}`}>
              {labels[p]}
            </button>
          );
        })}
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 mb-6">
        <div className="luxury-card !p-4 flex flex-col justify-between h-20 border-l-[3px] border-l-accent">
          <span className="text-[11px] uppercase tracking-wide text-muted-foreground font-body">Total facturé {kpiPeriodLabel}</span>
          <span className="font-display text-2xl text-accent">{formatEUR(totalFacture)}</span>
        </div>
        <div className="luxury-card !p-4 flex flex-col justify-between h-20 border-l-[3px] border-l-[hsl(30_80%_50%)]">
          <span className="text-[11px] uppercase tracking-wide text-muted-foreground font-body">En attente de paiement</span>
          <span className="font-display text-2xl text-[hsl(30_80%_50%)]">{formatEUR(enAttente)}</span>
        </div>
        <div className="luxury-card !p-4 flex flex-col justify-between h-20 border-l-[3px] border-l-destructive">
          <span className="text-[11px] uppercase tracking-wide text-muted-foreground font-body">Factures en retard</span>
          <div className="flex items-end justify-between">
            <span className="font-display text-2xl text-foreground">{enRetard}</span>
            {enRetard > 0 && <span className="inline-block px-2 py-0.5 text-[10px] font-semibold bg-destructive text-destructive-foreground rounded-full">{enRetard}</span>}
          </div>
        </div>
        <div className="luxury-card !p-4 flex flex-col justify-between h-20 border-l-[3px] border-l-[hsl(var(--success))]">
          <span className="text-[11px] uppercase tracking-wide text-muted-foreground font-body">Encaissé {kpiPeriodLabel}</span>
          <span className="font-display text-2xl text-[hsl(var(--success))]">{formatEUR(encaisse)}</span>
        </div>
        <div className="luxury-card !p-4 flex flex-col justify-between h-20 border-l-[3px] border-l-[hsl(220_60%_55%)]">
          <span className="text-[11px] uppercase tracking-wide text-muted-foreground font-body">TVA encaissée {kpiPeriodLabel}</span>
          <span className="font-display text-2xl text-[hsl(220_60%_55%)]">{formatEUR(tvaEncaisse)}</span>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-0 border-b border-border mb-4">
        {filterTabs.map((t) => (
          <button key={t.key} onClick={() => setFilterTab(t.key)}
            className={`px-4 py-2.5 text-[13px] font-medium font-body border-b-2 transition-colors ${filterTab === t.key ? "border-accent text-accent" : "border-transparent text-muted-foreground hover:text-foreground"}`}
          >{t.label}</button>
        ))}
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input type="text" placeholder="Rechercher par n° facture ou client..." value={search} onChange={(e) => setSearch(e.target.value)}
          className="form-input pl-11 pr-4 h-11 rounded-lg shadow-[var(--shadow-card)]" />
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="luxury-card p-16 text-center">
          <Receipt size={48} className="mx-auto text-muted-foreground/20 mb-4" />
          <h2 className="font-display text-xl text-foreground mb-2">Aucune facture</h2>
          <p className="text-sm text-muted-foreground">Créez votre première facture depuis un devis accepté.</p>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-lg shadow-[var(--shadow-card)] overflow-x-auto">
          <table className="w-full min-w-[900px] text-sm">
            <thead>
              <tr className="table-header-dark">
                <th className="text-left">N° Facture</th>
                <th className="text-center">Type</th>
                <th className="text-left">Date</th>
                <th className="text-left">Client</th>
                <th className="text-left">Ref affaire</th>
                <th className="text-right">Montant HT</th>
                <th className="text-right">Montant TTC</th>
                <th className="text-center">Acompte %</th>
                <th className="text-right">Montant acompte</th>
                <th className="text-right">Solde</th>
                <th className="text-center">Statut</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((f, i) => {
                const totalRecu = f.reglements.reduce((s, r) => s + r.montant, 0);
                const solde = f.montantAcompte - totalRecu;
                return (
                  <tr key={f.id}
                    onContextMenu={(e) => { e.preventDefault(); setCtxMenu({ x: e.clientX, y: e.clientY, facture: f }); }}
                    className={`border-b border-border last:border-0 transition-colors duration-150 hover:bg-accent/5 ${statutBorderClass[f.statut]} ${i % 2 === 1 ? "bg-background" : "bg-card"}`}
                  >
                    <td className="px-4 py-2 font-medium font-mono text-[13px]">{f.numero}</td>
                    <td className="px-4 py-2 text-center">
                      <span className={`inline-block px-2 py-0.5 text-[10px] font-semibold rounded ${TYPE_BADGE_CLASS[f.type]}`}>{TYPE_LABELS[f.type]}</span>
                    </td>
                    <td className="px-4 py-2 text-muted-foreground">{formatDate(f.dateFacture)}</td>
                    <td className="px-4 py-2">
                      <span className="font-medium">{formatClientName(f.client)}</span>
                      {f.client.societe && <span className="text-muted-foreground ml-1 text-xs">— {f.client.societe}</span>}
                    </td>
                    <td className="px-4 py-2 text-muted-foreground text-[12px]">{f.referenceAffaire || "—"}</td>
                    <td className="px-4 py-2 text-right font-mono text-[13px]">{formatEUR(f.totalHT)}</td>
                    <td className="px-4 py-2 text-right font-mono text-[13px] font-medium">{formatEUR(f.totalTTC)}</td>
                    <td className="px-4 py-2 text-center font-mono text-[13px]">{f.montantAcomptePct}%</td>
                    <td className="px-4 py-2 text-right font-mono text-[13px]">{formatEUR(f.montantAcompte)}</td>
                    <td className="px-4 py-2 text-right font-mono text-[13px]">{formatEUR(solde > 0 ? solde : 0)}</td>
                    <td className="px-4 py-2 text-center">
                      <FStatutDropdown facture={f} onUpdate={reload} />
                    </td>
                    <td className="px-4 py-2 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {f.statut === "retard" && (
                          <button
                            onClick={() => setRappelModalInvoice(f)}
                            className="px-2.5 py-1 text-[11px] font-semibold bg-destructive/15 text-destructive rounded hover:bg-destructive/20 transition-colors"
                            title="Générer un rappel de paiement"
                          >
                            Rappel
                          </button>
                        )}
                        <button onClick={() => navigate(`/factures/${f.id}/apercu`)} className="p-2 rounded hover:bg-muted transition-colors" title="Aperçu"><Eye size={14} className="text-muted-foreground" /></button>
                        <button onClick={() => navigate(`/factures/${f.id}`)} className="p-2 rounded hover:bg-muted transition-colors" title="Modifier"><Pencil size={14} className="text-muted-foreground" /></button>
                        <button onClick={() => window.print()} className="p-2 rounded hover:bg-muted transition-colors" title="Imprimer"><Printer size={14} className="text-muted-foreground" /></button>
                        <button onClick={() => handleCtxAction("delete", f)} className="p-2 rounded hover:bg-muted transition-colors" title="Supprimer"><Trash2 size={14} className="text-muted-foreground" /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Record count */}
      <div className="mt-4 text-[12px] text-muted-foreground font-body">
        {filtered.length} facture(s) — Total TTC : {formatEUR(totalAllTTC)} — Encaissé : {formatEUR(totalAllEncaisse)} — Solde : {formatEUR(totalAllTTC - totalAllEncaisse)}
      </div>

      {/* Context Menu */}
      {ctxMenu && <FactureContextMenu ctx={ctxMenu} onClose={() => setCtxMenu(null)} onAction={handleCtxAction} />}

      {/* Reglement Modal */}
      {reglementModal && <ReglementModal facture={reglementModal} onClose={() => setReglementModal(null)} onDone={reload} />}

      {/* Rappel Modal */}
      {rappelModalInvoice && (
        <RappelModal
          facture={rappelModalInvoice}
          onClose={() => setRappelModalInvoice(null)}
          onUpdate={reload}
        />
      )}

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

function RappelModal({
  facture,
  onClose,
  onUpdate,
}: {
  facture: Facture;
  onClose: () => void;
  onUpdate: () => void;
}) {
  const [type, setType] = useState<1 | 2>(1);
  const defaultDateRappel1 = (() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d.toISOString().split("T")[0];
  })();
  const [dateRappel1, setDateRappel1] = useState(facture.dateRappel1 || defaultDateRappel1);

  const handleGenerate = async () => {
    generateReminderPDF(facture, type, type === 2 ? dateRappel1 : undefined);

    try {
      if (type === 1) {
        const updatedFacture = { ...facture, dateRappel1: new Date().toISOString().split("T")[0] };
        await dbSaveFacture(updatedFacture);
        onUpdate();
      }
    } catch (err) {
      console.error("Erreur lors de l'enregistrement de la relance :", err);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={onClose}>
      <div className="bg-card border border-border rounded-lg w-full max-w-md p-6 shadow-[var(--shadow-elevated)]" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-display text-xl font-semibold">Générer un rappel de paiement</h2>
          <button onClick={onClose} className="p-1 hover:bg-muted rounded"><X size={16} /></button>
        </div>
        <p className="text-sm text-muted-foreground mb-4 font-body">
          Facture N° <span className="font-mono font-medium text-foreground">{facture.numero}</span> — Client : <span className="font-medium text-foreground">{formatClientName(facture.client)}</span>
        </p>

        <div className="space-y-4 font-body">
          <div>
            <label className="form-label mb-2 block">Niveau de rappel</label>
            <div className="space-y-2">
              <label className="flex items-center gap-3 p-3 rounded border border-border hover:bg-accent/5 cursor-pointer">
                <input type="radio" checked={type === 1} onChange={() => setType(1)} className="accent-accent" />
                <div>
                  <div className="text-sm font-semibold text-foreground">Rappel 1 — Première relance amiable</div>
                  <div className="text-[11px] text-muted-foreground">Courrier cordial de relance pour oubli</div>
                </div>
              </label>
              <label className="flex items-center gap-3 p-3 rounded border border-border hover:bg-accent/5 cursor-pointer">
                <input type="radio" checked={type === 2} onChange={() => setType(2)} className="accent-accent" />
                <div>
                  <div className="text-sm font-semibold text-foreground">Rappel 2 — Mise en demeure</div>
                  <div className="text-[11px] text-muted-foreground">Mise en demeure sous 8 jours avant poursuites</div>
                </div>
              </label>
            </div>
          </div>

          {type === 2 && (
            <div>
              <label className="form-label">Date du premier rappel (Rappel 1)</label>
              <input
                type="date"
                className="form-input"
                value={dateRappel1}
                onChange={(e) => setDateRappel1(e.target.value)}
              />
              <p className="text-[11px] text-muted-foreground mt-1">
                Utilisée pour faire référence au premier courrier dans le corps du texte.
              </p>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <button onClick={onClose} className="btn-ghost">Annuler</button>
          <button onClick={handleGenerate} className="btn-gold font-semibold">Télécharger le PDF</button>
        </div>
      </div>
    </div>
  );
}

function formatPDFMoney(val: number): string {
  let formatted = val.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  // Replace non-breaking spaces (u202F, u00A0) with standard space
  formatted = formatted.replace(/[\u202F\u00A0]/g, " ");
  return formatted + " EUR";
}

function generateReminderPDF(facture: Facture, type: 1 | 2, dateRappel1Input?: string) {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4"
  });

  const settings = loadSettings();
  const compta = settings.comptabilite || defaultComptabilite();
  const accentColor = type === 1 ? [220, 120, 40] : [200, 30, 30];

  // 1. Bandeau accent en haut
  doc.setFillColor(accentColor[0], accentColor[1], accentColor[2]);
  doc.rect(0, 0, 210, 15, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  const title = type === 1 ? "LETTRE DE RAPPEL — RELANCE AMIABLE" : "MISE EN DEMEURE DE PAYER";
  doc.text(title, 15, 10);

  doc.setTextColor(0, 0, 0);
  doc.setFont("helvetica", "normal");

  // 2. En-tête 2 colonnes
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text(compta.nomEntreprise, 15, 28);

  let currentHeaderY = 33;
  if (compta.nomEntreprise === "TOUT POUR MA TERRASSE - SAS") {
    doc.setFont("helvetica", "bold");
    doc.text("ORALIS - Marque premium", 15, 33);
    currentHeaderY = 38;
  }

  doc.setFont("helvetica", "normal");
  doc.setTextColor(80, 80, 80);
  doc.text(compta.adresseEntreprise, 15, currentHeaderY);
  doc.text(compta.cpVilleEntreprise, 15, currentHeaderY + 5);
  doc.text(`Tél : ${compta.telephone}`, 15, currentHeaderY + 10);
  doc.text(`Email : ${compta.emailComptabilite}`, 15, currentHeaderY + 15);
  doc.text(`SIRET : ${compta.siret}`, 15, currentHeaderY + 20);

  doc.setTextColor(0, 0, 0);
  doc.setFont("helvetica", "bold");
  doc.text("DESTINATAIRE :", 120, 28);
  const clientName = facture.client.societe
    ? `${facture.client.societe} (${formatClientName(facture.client)})`
    : formatClientName(facture.client);
  doc.text(clientName, 120, 33);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(80, 80, 80);
  doc.text(facture.client.rue, 120, 38);
  doc.text(`${facture.client.codePostal} ${facture.client.ville}`, 120, 43);
  doc.text(facture.client.pays, 120, 48);
  if (facture.client.telephone) doc.text(`Tél : ${facture.client.telephone}`, 120, 53);
  if (facture.client.email) doc.text(`Email : ${facture.client.email}`, 120, 58);

  // 3. Zone méta
  doc.setDrawColor(220, 220, 220);
  doc.setFillColor(250, 250, 250);
  doc.rect(15, 68, 180, 28, "FD");

  doc.setTextColor(0, 0, 0);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  doc.text("Date d'émission :", 20, 74);
  doc.text("Référence :", 20, 80);
  doc.text("Objet :", 20, 86);
  doc.text("Échéance dépassée :", 20, 92);

  doc.setFont("helvetica", "normal");
  const todayStr = new Date().toLocaleDateString("fr-FR");
  const refRappel = `RAPPEL-${type}-${facture.numero}`;
  const objectText = type === 1 ? "Relance pour facture impayée" : "Mise en demeure pour non-paiement";
  const dateEcheanceFormatted = formatDate(facture.dateEcheance);

  doc.text(todayStr, 60, 74);
  doc.text(refRappel, 60, 80);
  doc.text(objectText, 60, 86);
  doc.setTextColor(200, 30, 30);
  doc.setFont("helvetica", "bold");
  doc.text(dateEcheanceFormatted, 60, 92);

  // 4. Corps du courrier
  doc.setTextColor(0, 0, 0);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10.5);

  const acompteVerse = facture.reglements.reduce((s, r) => s + r.montant, 0);
  const soldeDu = facture.totalTTC - acompteVerse;
  const dateEcheance = formatDate(facture.dateEcheance);

  let currentY = 110;

  if (type === 1) {
    doc.text("Madame, Monsieur,", 15, currentY);
    currentY += 10;

    doc.text("Sauf erreur ou omission de notre part, nous constatons que votre compte présente un solde", 15, currentY);
    currentY += 6;
    doc.text(`débiteur de ${formatPDFMoney(soldeDu)} TTC au titre de la facture N° ${facture.numero}.`, 15, currentY);
    currentY += 10;

    doc.text(`Cette facture, dont la date d'échéance était fixée au ${dateEcheance}, est restée impayée à ce`, 15, currentY);
    currentY += 6;
    doc.text("jour dans notre comptabilité.", 15, currentY);
    currentY += 10;

    doc.text("Nous vous prions de bien vouloir procéder à la régularisation de ce montant par virement", 15, currentY);
    currentY += 6;
    doc.text("bancaire dans les plus brefs délais. Vous trouverez nos coordonnées bancaires au bas de ce document.", 15, currentY);
    currentY += 10;

    doc.text("Si votre paiement a déjà été effectué avant la réception de cette lettre, nous vous prions de ne pas", 15, currentY);
    currentY += 6;
    doc.text("en tenir compte et de nous en excuser.", 15, currentY);
  } else {
    doc.text("Madame, Monsieur,", 15, currentY);
    currentY += 10;

    const formattedRappel1Date = dateRappel1Input ? formatDate(dateRappel1Input) : todayStr;
    doc.text(`Malgré notre première lettre de relance amiable en date du ${formattedRappel1Date}, nous n'avons`, 15, currentY);
    currentY += 6;
    doc.text(`toujours pas reçu le règlement de votre facture N° ${facture.numero} d'un montant de ${formatPDFMoney(soldeDu)} TTC`, 15, currentY);
    currentY += 6;
    doc.text(`(échéance dépassée le ${dateEcheance}).`, 15, currentY);
    currentY += 10;

    doc.text("Par la présente, nous vous mettons formellement en demeure de régler cette somme sous ", 15, currentY);
    const w1 = doc.getTextWidth("Par la présente, nous vous mettons formellement en demeure de régler cette somme sous ");
    doc.setFont("helvetica", "bold");
    doc.setTextColor(200, 30, 30);
    doc.text("8 jours", 15 + w1, currentY);
    const w2 = doc.getTextWidth("8 jours");
    doc.setFont("helvetica", "normal");
    doc.setTextColor(0, 0, 0);
    doc.text(" à réception de la présente,", 15 + w1 + w2, currentY);
    currentY += 6;
    doc.text("conformément aux dispositions légales.", 15, currentY);
    currentY += 10;

    doc.text("À défaut de paiement intégral dans ce délai, nous serons contraints d'engager des poursuites", 15, currentY);
    currentY += 6;
    doc.text("judiciaires pour recouvrer cette créance, ce qui entraînera des frais de procédure supplémentaires", 15, currentY);
    currentY += 6;
    doc.text("à votre charge.", 15, currentY);
  }

  // 5. Tableau facture
  currentY = 160;
  doc.setFillColor(accentColor[0], accentColor[1], accentColor[2]);
  doc.rect(15, currentY, 180, 8, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text("Désignation", 18, currentY + 5.5);
  doc.text("Montant HT", 100, currentY + 5.5, { align: "right" });
  doc.text("TVA", 122, currentY + 5.5, { align: "right" });
  doc.text("Montant TTC", 146, currentY + 5.5, { align: "right" });
  doc.text("Acompte payé", 170, currentY + 5.5, { align: "right" });
  doc.text("Solde dû", 192, currentY + 5.5, { align: "right" });

  currentY += 8;
  doc.setFillColor(245, 245, 245);
  doc.rect(15, currentY, 180, 10, "F");

  doc.setTextColor(0, 0, 0);
  doc.setFont("helvetica", "normal");
  doc.text(`Facture N° ${facture.numero}`, 18, currentY + 6);

  const totalHT = facture.totalHT;
  const tvaAmount = facture.totalTTC - totalHT;

  doc.text(formatPDFMoney(totalHT), 100, currentY + 6, { align: "right" });
  doc.text(formatPDFMoney(tvaAmount), 122, currentY + 6, { align: "right" });
  doc.text(formatPDFMoney(facture.totalTTC), 146, currentY + 6, { align: "right" });
  doc.text(formatPDFMoney(acompteVerse), 170, currentY + 6, { align: "right" });

  doc.setFont("helvetica", "bold");
  doc.setTextColor(accentColor[0], accentColor[1], accentColor[2]);
  doc.text(formatPDFMoney(soldeDu), 192, currentY + 6, { align: "right" });

  // 6. Barre "Solde restant dû"
  currentY += 16;
  doc.setFillColor(accentColor[0], accentColor[1], accentColor[2]);
  doc.rect(15, currentY, 180, 8, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  doc.text(`Solde restant dû : ${formatPDFMoney(soldeDu)} — Virement bancaire uniquement`, 18, currentY + 5.5);

  // 7. Encadré coordonnées bancaires
  currentY += 12;
  doc.setDrawColor(200, 200, 200);
  doc.setFillColor(255, 255, 255);
  doc.rect(15, currentY, 180, 30, "D");

  doc.setTextColor(0, 0, 0);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text("Coordonnées bancaires pour le virement :", 20, currentY + 6);

  doc.setFont("helvetica", "normal");
  doc.setTextColor(80, 80, 80);
  doc.text("Titulaire :", 20, currentY + 12);
  doc.text("IBAN :", 20, currentY + 18);
  doc.text("BIC :", 20, currentY + 24);

  doc.setTextColor(0, 0, 0);
  doc.setFont("helvetica", "bold");
  doc.text(compta.nomEntreprise, 40, currentY + 12);
  doc.text(compta.iban, 40, currentY + 18);
  doc.text(compta.bic, 40, currentY + 24);

  // Right side label
  doc.setFillColor(255, 245, 235);
  doc.rect(130, currentY + 2, 60, 26, "F");
  doc.setTextColor(accentColor[0], accentColor[1], accentColor[2]);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.text("RÉFÉRENCE À INDIQUER :", 133, currentY + 8);
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(10);
  doc.text(facture.numero, 133, currentY + 16);
  doc.setFontSize(7.5);
  doc.setTextColor(100, 100, 100);
  doc.text("Indication obligatoire pour la", 133, currentY + 21);
  doc.text("validation de votre paiement.", 133, currentY + 24);

  // 8. Footer fixe en bas de page
  doc.setTextColor(100, 100, 100);
  doc.setFont("helvetica", "italic");
  doc.setFontSize(8.5);
  doc.text(`Pour toute question relative à votre règlement, contactez-nous par email à : ${compta.emailComptabilite}`, 15, 265);
  doc.text(`ou par téléphone au ${compta.telephone}.`, 15, 269);

  doc.setTextColor(0, 0, 0);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("Service Comptabilité", 195, 265, { align: "right" });
  doc.setFont("helvetica", "normal");
  doc.text(compta.nomEntreprise, 195, 270, { align: "right" });

  // 9. Bande accent en bas de page
  doc.setFillColor(accentColor[0], accentColor[1], accentColor[2]);
  doc.rect(0, 290, 210, 7, "F");

  const filename = `RAPPEL-${type}-${facture.numero}-${new Date().toISOString().split("T")[0]}.pdf`;
  doc.save(filename);
}
