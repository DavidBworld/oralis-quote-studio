import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Search, Plus, Eye, Pencil, Printer, Trash2, Copy,
  ChevronRight, ChevronDown, X, CreditCard, FileText,
  Receipt, TrendingUp, AlertTriangle, Clock, Ban
} from "lucide-react";
import { toast } from "sonner";
import {
  loadQuotes, formatEUR, formatDate, calcTotals, uid,
  type Quote, type QuoteLine,
} from "@/lib/quote-data";
import { loadSettings, getLegalMention } from "@/lib/settings-data";
import ModuleNav from "@/components/ModuleNav";

// ── Facture types ──
interface Reglement {
  id: string;
  mode: string;
  libelle: string;
  dateReception: string;
  dateEnregistrement: string;
  montant: number;
}

interface TvaBreakdownItem {
  taux: number;
  baseHT: number;
  montantTVA: number;
  montantTTC: number;
}

interface Facture {
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
  interlocuteur?: string;
  delai?: string;
  dureeValidite?: string;
  exclureTotalCmd?: boolean;
  retenueGarantie?: boolean;
  marcheRG?: string;
  dateLeveeRG?: string;
  pctRG?: number;
}

// ── localStorage helpers ──
function loadFactures(): Facture[] {
  try { return JSON.parse(localStorage.getItem("oralis_factures") || "[]"); } catch { return []; }
}
function saveFactures(f: Facture[]) { localStorage.setItem("oralis_factures", JSON.stringify(f)); }
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

function initializeSampleFactures() {
  const existing = loadFactures();
  if (existing.length > 0) return;
  const samples: Facture[] = [
    {
      id: "fa-sample-1",
      numero: "ORALIS-FA-2026-001",
      type: "acompte",
      devisId: "sample1",
      devisNumero: "ORALIS-2026-001",
      client: { type: "particulier", prenom: "Jean-Pierre", nom: "Müller", societe: "", email: "jp.muller@email.lu", telephone: "+352 621 123 456", rue: "12 Rue de la Gare", ville: "Luxembourg", codePostal: "1616", pays: "Luxembourg" },
      lignes: [{ id: "l1", designation: "Pergola Bioclimatique à Lames Orientables", description: "Structure aluminium laqué RAL 7016, 6m x 4m", quantite: 1, prixUnitaireHT: 18500, tva: 17, options: [{ id: "o1", designation: "Motorisation Somfy", prixHT: 1200, tva: 17 }, { id: "o2", designation: "Éclairage LED Intégré", prixHT: 800, tva: 17 }] }],
      totalHT: 20500,
      totalTTC: 23985,
      montantAcompte: 7195.50,
      montantAcomptePct: 30,
      libelle: "Acompte sur devis ORALIS-2026-001",
      dateFacture: "2026-03-12",
      dateEcheance: "2026-04-11",
      modePaiement: "Virement",
      statut: "non_payee",
      reglements: [],
      dateCreation: "2026-03-12",
      tvaBreakdown: [{ taux: 17, baseHT: 20500, montantTVA: 3485, montantTTC: 23985 }],
    },
    {
      id: "fa-sample-2",
      numero: "ORALIS-FA-2026-002",
      type: "acompte",
      devisId: "sample2",
      devisNumero: "ORALIS-2026-002",
      client: { type: "particulier", prenom: "Marie", nom: "Laurent", societe: "", email: "m.laurent@email.fr", telephone: "+33 6 12 34 56 78", rue: "8 Avenue Foch", ville: "Nancy", codePostal: "54000", pays: "France" },
      lignes: [{ id: "l2", designation: "Jardin d'Hiver & Parois Vitrées", description: "Structure aluminium, 4m x 3m", quantite: 1, prixUnitaireHT: 6666.67, tva: 20, options: [] }],
      totalHT: 6666.67,
      totalTTC: 8000,
      montantAcompte: 2400,
      montantAcomptePct: 30,
      libelle: "Acompte sur devis ORALIS-2026-002",
      dateFacture: "2026-03-05",
      dateEcheance: "2026-04-04",
      modePaiement: "Chèque",
      statut: "payee",
      reglements: [{ id: "r1", mode: "Chèque", libelle: "Acompte", dateReception: "2026-03-10", dateEnregistrement: "2026-03-10", montant: 2400 }],
      dateCreation: "2026-03-05",
      tvaBreakdown: [{ taux: 20, baseHT: 6666.67, montantTVA: 1333.33, montantTTC: 8000 }],
    },
  ];
  saveFactures(samples);
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

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const changeStatus = (s: Facture["statut"]) => {
    const all = loadFactures();
    const idx = all.findIndex((f) => f.id === facture.id);
    if (idx >= 0) { all[idx].statut = s; saveFactures(all); }
    setOpen(false);
    onUpdate();
    toast.success(`Statut changé : ${STATUT_FACTURE_LABELS[s]}`);
  };

  return (
    <div className="relative inline-block" ref={ref}>
      <button onClick={(e) => { e.stopPropagation(); setOpen(!open); }}
        className={`inline-flex items-center gap-1 px-3 py-1 text-[11px] font-semibold tracking-wide ${statutClass[facture.statut]} cursor-pointer`}
      >{STATUT_FACTURE_LABELS[facture.statut]}<ChevronDown size={10} /></button>
      {open && (
        <div className="absolute top-full mt-1 left-1/2 -translate-x-1/2 z-50 w-[170px] bg-card border border-border rounded-lg py-1 shadow-[var(--shadow-elevated)]">
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

  const handleAdd = () => {
    const all = loadFactures();
    const idx = all.findIndex((f) => f.id === facture.id);
    if (idx >= 0) {
      all[idx].reglements.push({ id: uid(), mode, libelle, dateReception, dateEnregistrement: dateEnreg, montant });
      const newTotal = all[idx].reglements.reduce((s, r) => s + r.montant, 0);
      if (solder || newTotal >= all[idx].montantAcompte) {
        all[idx].statut = "payee";
      } else if (newTotal > 0) {
        all[idx].statut = "partiel";
      }
      saveFactures(all);
    }
    toast.success("Règlement enregistré ✓");
    onDone();
    onClose();
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

  const reload = useCallback(() => {
    const all = loadFactures();
    const found = all.find((f) => f.id === factureId);
    if (found) setFacture(found);
  }, [factureId]);

  useEffect(() => { reload(); }, [reload]);

  const updateField = (field: string, value: any) => {
    const all = loadFactures();
    const idx = all.findIndex((f) => f.id === factureId);
    if (idx >= 0) {
      (all[idx] as any)[field] = value;
      saveFactures(all);
      setFacture({ ...all[idx] });
    }
  };

  if (!facture) return null;

  const totals = calcTotals(facture.lignes);
  const totalRecu = facture.reglements.reduce((s, r) => s + r.montant, 0);
  const netAPayer = facture.montantAcompte - totalRecu;

  const tabs = [
    { key: "affaire", label: "Données affaire" },
    { key: "contenu", label: "Contenu" },
    { key: "reglement", label: "Règlement reçu" },
  ] as const;

  return (
    <div className="p-8 lg:p-10 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 hover:bg-muted rounded transition-colors"><X size={18} /></button>
          <div>
            <h1 className="font-display text-[28px] font-semibold text-foreground tracking-tight">
              {facture.numero}
            </h1>
            <p className="text-[13px] text-muted-foreground mt-0.5 font-body">
              {facture.client.prenom} {facture.client.nom} — {facture.libelle}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(`/factures/${facture.id}/apercu`)} className="btn-outline-gold flex items-center gap-2 text-xs"><Eye size={14} />Aperçu PDF</button>
          <button onClick={() => window.print()} className="btn-gold flex items-center gap-2 text-xs"><Printer size={14} />Imprimer</button>
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
                <input className="form-input bg-muted/30" value={facture.numero} readOnly />
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
                <p className="font-semibold">{facture.client.prenom} {facture.client.nom}</p>
                {facture.client.societe && <p>{facture.client.societe}</p>}
                <p>{facture.client.rue}</p>
                <p>{facture.client.codePostal} {facture.client.ville}, {facture.client.pays}</p>
                <p className="text-muted-foreground">{facture.client.email}</p>
                <p className="text-muted-foreground">{facture.client.telephone}</p>
              </div>
              <div><label className="form-label">Référence affaire</label><input className="form-input" value={facture.referenceAffaire || ""} onChange={(e) => updateField("referenceAffaire", e.target.value)} /></div>
              <div><label className="form-label">Devis lié</label><input className="form-input bg-muted/30" value={facture.devisNumero} readOnly /></div>
              <div><label className="form-label">Commercial</label><input className="form-input" value={facture.commercial || ""} onChange={(e) => updateField("commercial", e.target.value)} /></div>
            </div>
          </div>

          {/* Acomptes section */}
          <div className="luxury-card space-y-4">
            <h3 className="section-title">Infos Acomptes</h3>
            <div>
              <label className="form-label">Mode de règlement</label>
              <select className="form-input" value={facture.modeReglement || "30% à la commande, solde à la livraison"} onChange={(e) => updateField("modeReglement", e.target.value)}>
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
                      {l.description && <p className="text-xs text-muted-foreground">{l.description}</p>}
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
                <span>Net à payer</span>
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
                          const all = loadFactures();
                          const idx = all.findIndex((f) => f.id === facture.id);
                          if (idx >= 0) {
                            all[idx].reglements = all[idx].reglements.filter((x) => x.id !== r.id);
                            const newTotal = all[idx].reglements.reduce((s, x) => s + x.montant, 0);
                            all[idx].statut = newTotal >= all[idx].montantAcompte ? "payee" : newTotal > 0 ? "partiel" : "non_payee";
                            saveFactures(all);
                            reload();
                          }
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
              <span>Net à payer</span>
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

  const reload = useCallback(() => {
    initializeSampleFactures();
    setFactures(loadFactures());
  }, []);

  useEffect(() => { reload(); }, [reload]);

  // If detail view
  if (id) {
    return <FactureDetail factureId={id} onBack={() => navigate("/factures")} />;
  }

  // Check overdue
  useEffect(() => {
    const all = loadFactures();
    let changed = false;
    all.forEach((f) => {
      if (f.statut === "non_payee" && daysSince(f.dateEcheance) > 0) {
        f.statut = "retard";
        changed = true;
      }
    });
    if (changed) { saveFactures(all); setFactures([...all]); }
  }, []);

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
  const thisMonth = (d: string) => { const dt = new Date(d); return dt.getMonth() === now.getMonth() && dt.getFullYear() === now.getFullYear(); };
  const facturesThisMonth = factures.filter((f) => thisMonth(f.dateFacture));
  const totalFacture = facturesThisMonth.reduce((s, f) => s + f.montantAcompte, 0);
  const enAttente = factures.filter((f) => f.statut === "non_payee" || f.statut === "partiel").reduce((s, f) => s + (f.montantAcompte - f.reglements.reduce((a, r) => a + r.montant, 0)), 0);
  const enRetard = factures.filter((f) => f.statut === "retard").length;
  const encaisse = facturesThisMonth.reduce((s, f) => s + f.reglements.filter((r) => thisMonth(r.dateReception)).reduce((a, r) => a + r.montant, 0), 0);
  const totalAllTTC = filtered.reduce((s, f) => s + f.montantAcompte, 0);
  const totalAllEncaisse = filtered.reduce((s, f) => s + f.reglements.reduce((a, r) => a + r.montant, 0), 0);

  const handleCtxAction = (action: string, f: Facture, sub?: string) => {
    switch (action) {
      case "preview": navigate(`/factures/${f.id}/apercu`); break;
      case "edit": navigate(`/factures/${f.id}`); break;
      case "reglement": setReglementModal(f); break;
      case "duplicate": {
        const all = loadFactures();
        const dup: Facture = { ...JSON.parse(JSON.stringify(f)), id: uid(), numero: nextFactureNumber(f.type), statut: "non_payee", reglements: [], dateCreation: new Date().toISOString().split("T")[0] };
        all.push(dup);
        saveFactures(all);
        reload();
        toast.success("Facture dupliquée ✓");
        break;
      }
      case "create_situation": {
        const all = loadFactures();
        const sit: Facture = {
          ...JSON.parse(JSON.stringify(f)),
          id: uid(),
          numero: nextFactureNumber("situation"),
          type: "situation",
          statut: "non_payee",
          reglements: [],
          dateFacture: new Date().toISOString().split("T")[0],
          dateEcheance: (() => { const d = new Date(); d.setDate(d.getDate() + 30); return d.toISOString().split("T")[0]; })(),
          dateCreation: new Date().toISOString().split("T")[0],
        };
        all.push(sit);
        saveFactures(all);
        reload();
        toast.success("Facture de situation créée ✓");
        break;
      }
      case "create_avoir": {
        const all = loadFactures();
        const avoir: Facture = {
          ...JSON.parse(JSON.stringify(f)),
          id: uid(),
          numero: nextFactureNumber("avoir"),
          type: "avoir",
          statut: "payee",
          reglements: [],
          dateFacture: new Date().toISOString().split("T")[0],
          dateEcheance: new Date().toISOString().split("T")[0],
          dateCreation: new Date().toISOString().split("T")[0],
          libelle: `Avoir sur facture ${f.numero}`,
        };
        all.push(avoir);
        saveFactures(all);
        reload();
        toast.success("Facture d'annulation créée ✓");
        break;
      }
      case "set_status": {
        if (sub) {
          const all = loadFactures();
          const idx = all.findIndex((x) => x.id === f.id);
          if (idx >= 0) { all[idx].statut = sub as Facture["statut"]; saveFactures(all); reload(); }
          toast.success(`Statut changé : ${STATUT_FACTURE_LABELS[sub]}`);
        }
        break;
      }
      case "print": navigate(`/factures/${f.id}/apercu`); break;
      case "delete": {
        const all = loadFactures().filter((x) => x.id !== f.id);
        saveFactures(all);
        reload();
        toast.success("Facture supprimée");
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
    <div className="p-8 lg:p-10 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-[28px] font-semibold text-foreground tracking-tight">Factures</h1>
          <p className="text-[13px] text-muted-foreground mt-1 font-body">Gestion des factures ORALIS</p>
        </div>
        <button onClick={() => { toast.info("Créez une facture depuis un devis accepté dans le Tableau de bord"); }} className="btn-gold flex items-center gap-2">
          <Plus size={16} />Nouvelle facture
        </button>
      </div>

      <ModuleNav />

      {/* KPI Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="luxury-card !p-4 flex flex-col justify-between h-20 border-l-[3px] border-l-accent">
          <span className="text-[11px] uppercase tracking-wide text-muted-foreground font-body">Total facturé ce mois</span>
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
          <span className="text-[11px] uppercase tracking-wide text-muted-foreground font-body">Encaissé ce mois</span>
          <span className="font-display text-2xl text-[hsl(var(--success))]">{formatEUR(encaisse)}</span>
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
        <div className="bg-card border border-border rounded-lg overflow-hidden shadow-[var(--shadow-card)]">
          <table className="w-full text-sm">
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
                      <span className="font-medium">{f.client.prenom} {f.client.nom}</span>
                      {f.client.societe && <span className="text-muted-foreground ml-1 text-xs">— {f.client.societe}</span>}
                    </td>
                    <td className="px-4 py-2 text-muted-foreground text-[12px]">{f.referenceAffaire || "—"}</td>
                    <td className="px-4 py-2 text-right font-mono text-[13px]">{formatEUR(f.totalHT)}</td>
                    <td className="px-4 py-2 text-right font-mono text-[13px] font-medium">{formatEUR(f.totalTTC)}</td>
                    <td className="px-4 py-2 text-center font-mono text-[13px]">{f.montantAcomptePct}%</td>
                    <td className="px-4 py-2 text-right font-mono text-[13px]">{formatEUR(solde > 0 ? solde : 0)}</td>
                    <td className="px-4 py-2 text-center">
                      <FStatutDropdown facture={f} onUpdate={reload} />
                    </td>
                    <td className="px-4 py-2 text-right">
                      <div className="flex items-center justify-end gap-1">
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
    </div>
  );
}
