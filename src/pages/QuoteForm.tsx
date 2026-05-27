import { useState, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Plus, Trash2, Upload, Camera, Wrench, X, ChevronRight, AlertCircle, CheckCircle2, ArrowLeft, ArrowRight, Users } from "lucide-react";
import {
  loadQuotes, saveQuotes, createEmptyQuote, emptyLine, emptyOption,
  formatEUR, formatDate, expiryDate, calcTotals, lineMontantHT,
  PRODUCT_CATALOG, OPTION_CATALOG, VALIDITE_OPTIONS, PAYS_OPTIONS, STATUT_LABELS,
  type Quote, type QuoteLine, type QuoteOption,
} from "@/lib/quote-data";
import { loadSettings, getEnabledTVARates, getLegalMention } from "@/lib/settings-data";
import {
  loadModeles, calculerPrix, calculerPoteaux, genererDescription,
  formatMM, formatCoef, formatDimDevis,
  type ModelePergola, type ResultatCalcul,
} from "@/lib/configurator-data";

const CATEGORIES = [
  "Pergola bioclimatique",
  "Pergola aluminium",
  "Store banne",
  "Store vertical",
  "Brise-soleil",
  "Carport",
  "Toiture terrasse",
  "Éclairage LED",
  "Motorisation",
  "Bardage",
  "Pose",
  "Autre",
];

// ── processImageFile ───────────────────────────────────────────────────────────

function processImageFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const maxDim = 300;
        let w = img.width, h = img.height;
        if (w > h) { if (w > maxDim) { h = Math.round(h*maxDim/w); w = maxDim; } }
        else { if (h > maxDim) { w = Math.round(w*maxDim/h); h = maxDim; } }
        canvas.width = w; canvas.height = h;
        const ctx = canvas.getContext("2d");
        if (ctx) { ctx.fillStyle="#fff"; ctx.fillRect(0,0,w,h); ctx.drawImage(img,0,0,w,h); resolve(canvas.toDataURL("image/jpeg",0.7)); }
        else resolve(e.target?.result as string);
      };
      img.onerror = () => reject(new Error("Image error"));
      img.src = e.target?.result as string;
    };
    reader.onerror = () => reject(new Error("File error"));
    reader.readAsDataURL(file);
  });
}

// ── AutocompleteInput ──────────────────────────────────────────────────────────

function AutocompleteInput({ value, onChange, suggestions, placeholder }: {
  value: string; onChange: (v: string) => void; suggestions: string[]; placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const [filtered, setFiltered] = useState<string[]>([]);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);
  return (
    <div ref={ref} className="relative">
      <input type="text" value={value}
        onChange={(e)=>{ onChange(e.target.value); setFiltered(suggestions.filter((s)=>s.toLowerCase().includes(e.target.value.toLowerCase()))); setOpen(true); }}
        onFocus={()=>{ setFiltered(suggestions.filter((s)=>s.toLowerCase().includes(value.toLowerCase()))); setOpen(true); }}
        placeholder={placeholder} className="form-input"/>
      {open && filtered.length>0 && (
        <ul className="absolute z-20 left-0 right-0 bg-card border border-border shadow-elevated max-h-48 overflow-auto mt-0.5 rounded-md">
          {filtered.map((s)=>(
            <li key={s} className="px-3 py-2.5 text-sm hover:bg-accent/5 cursor-pointer transition-colors"
              onMouseDown={()=>{ onChange(s); setOpen(false); }}>{s}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// WIZARD CONFIGURATEUR PERGOLA
// ═══════════════════════════════════════════════════════════════════════════════

type WizardStep = 1 | 2 | 3 | 4;

interface WizardState {
  modeleId: string;
  toitureId: string;
  couleurId: string;
  largeur: number;
  profondeur: number;
  coefficient: number;
}

function ConfigurateurWizard({ onApply, onClose }: {
  onApply: (data: { designation: string; description: string; prixVenteHT: number; prixAchatHT: number; image?: string }) => void;
  onClose: () => void;
}) {
  const modeles = loadModeles();
  const [step, setStep] = useState<WizardStep>(1);
  const [state, setState] = useState<WizardState>({
    modeleId: modeles[0]?.id || "",
    toitureId: "",
    couleurId: "",
    largeur: 4000,
    profondeur: 3000,
    coefficient: modeles[0]?.margeDefaut || 1.4,
  });
  const [calcError, setCalcError] = useState<string | null>(null);
  const [resultat, setResultat] = useState<ResultatCalcul | null>(null);

  const modele = modeles.find((m) => m.id === state.modeleId);

  // Auto-sélection toiture/couleur quand le modèle change
  useEffect(() => {
    if (modele) {
      setState((s) => ({
        ...s,
        toitureId: modele.toitures[0]?.id || "",
        couleurId: modele.couleurs[0]?.id || "",
        coefficient: modele.margeDefaut,
      }));
    }
  }, [state.modeleId]);

  // Recalcul live dès l'étape 3
  useEffect(() => {
    if (step < 3 || !modele || !state.toitureId || !state.couleurId) return;
    try {
      const r = calculerPrix(modele, state.largeur, state.profondeur, state.toitureId, state.couleurId, state.coefficient);
      setResultat(r); setCalcError(null);
    } catch (e) {
      setCalcError((e as Error).message); setResultat(null);
    }
  }, [modele, state.largeur, state.profondeur, state.toitureId, state.couleurId, state.coefficient, step]);

  // Poteaux calculés en live
  const poteauxCalc = modele ? calculerPoteaux(modele.reglesPoteau, state.largeur) : 0;
  const dim2Label = modele?.typeDim === "largeur_hauteur" ? "Hauteur" : "Profondeur";

  const canNext = () => {
    if (step === 1) return !!modele;
    if (step === 2) return !!state.toitureId && !!state.couleurId;
    if (step === 3) return !calcError && !!resultat;
    return false;
  };

  const handleApply = () => {
    if (!modele || !resultat) return;
    const toiture = modele.toitures.find((t) => t.id === state.toitureId);
    const couleur = modele.couleurs.find((c) => c.id === state.couleurId);

    // Désignation
    const largeurM = formatDimDevis(state.largeur);
    const dim2M    = formatDimDevis(state.profondeur);
    const designation = `${modele.nom} ${largeurM} × ${dim2M}`;

    // Description auto depuis template
    const description = genererDescription(modele.templateDescription, {
      nom: modele.nom,
      largeurMm: state.largeur,
      profondeurMm: state.profondeur,
      toiture: toiture?.nom || "—",
      couleur: couleur?.nom || "—",
      poteaux: resultat.nombrePoteaux,
      typeDim: modele.typeDim,
    });

    onApply({ designation, description, prixVenteHT: resultat.prixVenteHT, prixAchatHT: resultat.prixAchatTotalHT, image: modele.image });
  };

  const STEPS = [
    { n: 1 as WizardStep, label: "Modèle" },
    { n: 2 as WizardStep, label: "Options" },
    { n: 3 as WizardStep, label: "Dimensions" },
    { n: 4 as WizardStep, label: "Prix" },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="bg-card border border-border rounded-xl shadow-elevated w-full max-w-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-accent/15 flex items-center justify-center">
              <Wrench size={16} className="text-accent"/>
            </div>
            <div>
              <h2 className="font-display text-[16px] font-semibold">Configurateur</h2>
              <p className="text-[11px] text-muted-foreground">Chiffrage rapide depuis la grille de tarifs</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded hover:bg-muted transition-colors"><X size={18}/></button>
        </div>

        {/* Stepper */}
        <div className="flex items-center px-6 py-3 border-b border-border bg-muted/20 gap-2 overflow-x-auto">
          {STEPS.map((s, i) => (
            <div key={s.n} className="flex items-center gap-2">
              <button
                onClick={() => { if (s.n < step || (s.n === step+1 && canNext())) setStep(s.n); }}
                className={`flex items-center gap-1.5 text-[12px] font-medium px-2 py-1 rounded transition-colors ${step===s.n?"bg-accent text-accent-foreground":step>s.n?"text-[hsl(150_45%_40%)]":"text-muted-foreground"}`}>
                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${step===s.n?"bg-accent-foreground/20":step>s.n?"bg-[hsl(150_45%_40%/0.15)]":"bg-muted"}`}>
                  {step>s.n?"✓":s.n}
                </span>
                {s.label}
              </button>
              {i<STEPS.length-1 && <ChevronRight size={12} className="text-muted-foreground shrink-0"/>}
            </div>
          ))}
        </div>

        {/* Corps */}
        <div className="px-6 py-5 min-h-[260px]">

          {/* Étape 1 — Choix du modèle */}
          {step===1 && (
            <div>
              <h3 className="font-semibold text-[14px] mb-4">Choisissez un modèle</h3>
              {modeles.length===0 ? (
                <div className="text-center py-8">
                  <AlertCircle size={32} className="mx-auto text-muted-foreground/30 mb-3"/>
                  <p className="text-[13px] text-muted-foreground">Aucun modèle configuré.</p>
                  <p className="text-[12px] text-muted-foreground mt-1">Allez dans <strong>Fournisseurs → Grilles de tarifs</strong> pour créer un modèle.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {modeles.map((m)=>(
                    <button key={m.id} onClick={()=>setState({...state,modeleId:m.id})}
                      className={`w-full text-left px-4 py-3 rounded-lg border transition-all ${state.modeleId===m.id?"border-accent bg-accent/5 shadow-sm":"border-border hover:border-accent/50 hover:bg-muted/30"}`}>
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium text-[14px]">{m.nom}</div>
                          <div className="text-[11px] text-muted-foreground mt-0.5">
                            {m.nomFournisseur && <span className="font-mono mr-2 text-muted-foreground/60">{m.nomFournisseur}</span>}
                            {m.fournisseurNom && <span>{m.fournisseurNom} · </span>}
                            <span>{m.grille.largeurs.length}L × {m.grille.profondeurs.length}P · </span>
                            <span className="font-mono">{formatCoef(m.margeDefaut)}</span>
                          </div>
                        </div>
                        {state.modeleId===m.id && <CheckCircle2 size={18} className="text-accent shrink-0"/>}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Étape 2 — Options */}
          {step===2 && modele && (
            <div>
              <h3 className="font-semibold text-[14px] mb-4">Options — <span className="text-accent">{modele.nom}</span></h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="text-[11px] uppercase tracking-wide font-semibold text-muted-foreground mb-2 block">Toiture / Couverture</label>
                  <div className="space-y-1.5">
                    {modele.toitures.map((t)=>(
                      <button key={t.id} onClick={()=>setState({...state,toitureId:t.id})}
                        className={`w-full text-left px-3 py-2 rounded border transition-all text-[13px] ${state.toitureId===t.id?"border-accent bg-accent/5":"border-border hover:border-accent/40"}`}>
                        <div className="flex items-center justify-between">
                          <span>{t.nom}</span>
                          <span className="text-[11px] text-muted-foreground font-mono">
                            {t.surchargeHT>0&&`+${formatEUR(t.surchargeHT)}`}
                            {t.surchargePct>0&&`+${t.surchargePct}%`}
                            {t.surchargeHT===0&&t.surchargePct===0&&"inclus"}
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-[11px] uppercase tracking-wide font-semibold text-muted-foreground mb-2 block">Couleur / Finition</label>
                  <div className="space-y-1.5">
                    {modele.couleurs.map((c)=>(
                      <button key={c.id} onClick={()=>setState({...state,couleurId:c.id})}
                        className={`w-full text-left px-3 py-2 rounded border transition-all text-[13px] ${state.couleurId===c.id?"border-accent bg-accent/5":"border-border hover:border-accent/40"}`}>
                        <div className="flex items-center justify-between">
                          <span>{c.nom}</span>
                          <span className="text-[11px] text-muted-foreground font-mono">
                            {c.surchargeHT>0&&`+${formatEUR(c.surchargeHT)}`}
                            {c.surchargePct>0&&`+${c.surchargePct}%`}
                            {c.surchargeHT===0&&c.surchargePct===0&&"standard"}
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Étape 3 — Dimensions */}
          {step===3 && modele && (
            <div>
              <h3 className="font-semibold text-[14px] mb-4">Dimensions (mm)</h3>
              <div className="grid grid-cols-2 gap-6 mb-4">
                <div>
                  <label className="form-label">Largeur (mm)</label>
                  <input type="number" min={100} step={10} value={state.largeur}
                    onChange={(e)=>setState({...state,largeur:parseInt(e.target.value)||state.largeur})}
                    className="form-input font-mono text-lg text-center"/>
                  <p className="text-[11px] text-muted-foreground mt-1">
                    → {formatMM(state.largeur)} — Grille : {modele.grille.largeurs.map((l)=>`${(l/1000).toFixed(2).replace(".",",")}m`).join(" / ")}
                  </p>
                </div>
                <div>
                  <label className="form-label">{dim2Label} (mm)</label>
                  <input type="number" min={100} step={10} value={state.profondeur}
                    onChange={(e)=>setState({...state,profondeur:parseInt(e.target.value)||state.profondeur})}
                    className="form-input font-mono text-lg text-center"/>
                  <p className="text-[11px] text-muted-foreground mt-1">
                    → {formatMM(state.profondeur)} — Grille : {modele.grille.profondeurs.map((p)=>`${(p/1000).toFixed(2).replace(".",",")}m`).join(" / ")}
                  </p>
                </div>
              </div>

              {/* Poteaux calculés automatiquement */}
              {modele.reglesPoteau.length > 0 && poteauxCalc > 0 && (
                <div className="flex items-center gap-3 bg-accent/5 border border-accent/20 rounded-lg px-4 py-2.5 mb-3">
                  <Users size={15} className="text-accent shrink-0"/>
                  <div>
                    <span className="text-[13px] font-semibold text-accent">{poteauxCalc} poteaux</span>
                    <span className="text-[12px] text-muted-foreground ml-2">calculés automatiquement pour {formatMM(state.largeur)} de largeur</span>
                  </div>
                </div>
              )}

              {calcError ? (
                <div className="flex items-center gap-2 text-destructive bg-destructive/10 rounded-lg px-4 py-3 text-[13px]">
                  <AlertCircle size={16} className="shrink-0"/> {calcError}
                </div>
              ) : resultat ? (
                <div className="bg-muted/30 rounded-lg px-4 py-3 text-[12px] text-muted-foreground">
                  <span className="font-medium text-foreground">Case grille utilisée :</span>{" "}
                  {formatMM(resultat.largeurGrille)} × {formatMM(resultat.profondeurGrille)}
                  {(resultat.largeurGrille!==state.largeur||resultat.profondeurGrille!==state.profondeur) && (
                    <span className="text-[hsl(40_80%_45%)] ml-2">
                      (arrondi depuis {formatMM(state.largeur)} × {formatMM(state.profondeur)})
                    </span>
                  )}
                </div>
              ) : null}
            </div>
          )}

          {/* Étape 4 — Prix */}
          {step===4 && modele && (
            <div>
              <h3 className="font-semibold text-[14px] mb-4">Calculateur de prix</h3>
              <div className="mb-4">
                <label className="form-label">Coefficient de marge — {formatCoef(state.coefficient)}</label>
                <input type="number" min={1} max={5} step={0.05} value={state.coefficient}
                  onChange={(e)=>setState({...state,coefficient:parseFloat(e.target.value)||modele.margeDefaut})}
                  className="form-input w-40 font-mono"/>
              </div>

              {calcError ? (
                <div className="flex items-center gap-2 text-destructive bg-destructive/10 rounded-lg px-4 py-3 text-[13px]">
                  <AlertCircle size={16} className="shrink-0"/> {calcError}
                </div>
              ) : resultat ? (
                <div className="space-y-2">
                  <div className="bg-muted/30 rounded-lg p-4 space-y-2 text-[13px]">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Prix achat base HT ({formatMM(resultat.largeurGrille)} × {formatMM(resultat.profondeurGrille)})</span>
                      <span className="font-mono font-medium">{formatEUR(resultat.prixAchatBaseHT)}</span>
                    </div>
                    {resultat.surchargeToitureHT>0 && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Surcharge toiture</span>
                        <span className="font-mono text-[hsl(40_80%_45%)]">+{formatEUR(resultat.surchargeToitureHT)}</span>
                      </div>
                    )}
                    {resultat.surchargeCouleurHT>0 && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Surcharge couleur</span>
                        <span className="font-mono text-[hsl(40_80%_45%)]">+{formatEUR(resultat.surchargeCouleurHT)}</span>
                      </div>
                    )}
                    <div className="flex justify-between border-t border-border pt-2">
                      <span className="text-muted-foreground font-medium">Prix achat total HT</span>
                      <span className="font-mono font-semibold">{formatEUR(resultat.prixAchatTotalHT)}</span>
                    </div>
                    <div className="flex justify-between text-[11px]">
                      <span className="text-muted-foreground">Coefficient</span>
                      <span className="font-mono text-muted-foreground">{formatCoef(resultat.coefficient)}</span>
                    </div>
                    {modele.reglesPoteau.length>0 && (
                      <div className="flex justify-between text-[11px]">
                        <span className="text-muted-foreground">Poteaux</span>
                        <span className="font-mono font-semibold">{resultat.nombrePoteaux} poteaux</span>
                      </div>
                    )}
                  </div>

                  <div className="bg-accent/10 border border-accent/30 rounded-lg px-4 py-3 flex items-center justify-between">
                    <span className="font-semibold text-[14px]">Prix de vente HT</span>
                    <span className="font-display text-2xl font-bold text-accent">{formatEUR(resultat.prixVenteHT)}</span>
                  </div>

                  {/* Preview désignation + description */}
                  <div className="bg-muted/20 border border-border rounded p-3 text-[11px]">
                    <div className="font-semibold text-foreground text-[12px] mb-1">
                      {modele.nom} {formatDimDevis(state.largeur)} × {formatDimDevis(state.profondeur)}
                    </div>
                    <div className="text-muted-foreground whitespace-pre-line leading-relaxed">
                      {(() => {
                        const t = modele.toitures.find((x)=>x.id===state.toitureId);
                        const c = modele.couleurs.find((x)=>x.id===state.couleurId);
                        return `Toiture : ${t?.nom||"—"} · Couleur : ${c?.nom||"—"}${modele.reglesPoteau.length>0?` · ${resultat.nombrePoteaux} poteaux`:""}`;
                      })()}
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-border bg-muted/10">
          <button onClick={()=>step>1?setStep((step-1) as WizardStep):onClose()} className="btn-ghost border border-border flex items-center gap-1.5 text-[13px]">
            <ArrowLeft size={14}/> {step===1?"Annuler":"Retour"}
          </button>
          {step<4 ? (
            <button onClick={()=>setStep((step+1) as WizardStep)} disabled={!canNext()}
              className="btn-gold flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed">
              Suivant <ArrowRight size={14}/>
            </button>
          ) : (
            <button onClick={handleApply} disabled={!resultat||!!calcError}
              className="btn-gold flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed">
              <CheckCircle2 size={15}/> Appliquer au devis
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── QUOTE LINE ROW ─────────────────────────────────────────────────────────────

function QuoteLineRow({
  line, li, totalLines, allProductSuggestions, TVA_RATES,
  onUpdate, onRemove, onAddOption, onRemoveOption, onUpdateOption, onApplyTvaToAll
}: {
  line: QuoteLine; li: number; totalLines: number; allProductSuggestions: string[]; TVA_RATES: number[];
  onUpdate: (patch: Partial<QuoteLine>) => void; onRemove: () => void; onAddOption: () => void;
  onRemoveOption: (optId: string) => void; onUpdateOption: (optId: string, patch: Partial<QuoteOption>) => void;
  onApplyTvaToAll: (tva: number) => void;
}) {
  const [showWizard, setShowWizard] = useState(false);

  const handleWizardApply = (data: { designation: string; description: string; prixVenteHT: number; prixAchatHT: number; image?: string }) => {
    onUpdate({
      designation: data.designation,
      description: data.description,
      prixUnitaireHT: data.prixVenteHT,
      prixAchatHT: data.prixAchatHT,
      categorie: "Pergola bioclimatique",
      image: data.image
    });
    setShowWizard(false);
  };

  return (
    <>
      <div className="mb-6 last:mb-0 page-break-avoid">
        <div className="flex items-start justify-between mb-3">
          <span className="form-label !mb-0">Ligne {li+1}</span>
          <div className="flex items-center gap-2">
            <button onClick={()=>setShowWizard(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium rounded border border-accent/50 text-accent hover:bg-accent/5 transition-colors"
              title="Ouvrir le configurateur">
              <Wrench size={13}/> Configurateur
            </button>
            <button onClick={onRemove} className="p-1.5 text-destructive hover:bg-destructive/10 transition-colors rounded" title="Supprimer la ligne"><Trash2 size={14}/></button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 mb-3">
          <div className="md:col-span-2">
            <label className="form-label">Image</label>
            <div className="relative group flex items-center justify-center border border-border rounded h-10 bg-muted/30 overflow-hidden hover:border-accent/50 transition-colors">
              {line.image ? (
                <>
                  <img src={line.image} alt={line.designation||"Ligne"} className="w-full h-full object-cover"/>
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center gap-2 transition-opacity">
                    <label className="p-1 text-white hover:text-accent rounded cursor-pointer transition-colors">
                      <Upload size={14}/>
                      <input type="file" accept="image/*" className="hidden" onChange={async(e)=>{
                        const f=e.target.files?.[0]; if(f){try{onUpdate({image:await processImageFile(f)})}catch{}}
                      }}/>
                    </label>
                    <button type="button" onClick={()=>onUpdate({image:""})} className="p-1 text-white hover:text-destructive rounded transition-colors"><Trash2 size={14}/></button>
                  </div>
                </>
              ) : (
                <label className="flex items-center justify-center gap-1.5 w-full h-full cursor-pointer text-xs font-semibold text-muted-foreground hover:text-accent transition-colors">
                  <Camera size={14}/><span>Ajouter</span>
                  <input type="file" accept="image/*" className="hidden" onChange={async(e)=>{
                    const f=e.target.files?.[0]; if(f){try{onUpdate({image:await processImageFile(f)})}catch{}}
                  }}/>
                </label>
              )}
            </div>
          </div>
          <div className="md:col-span-3">
            <label className="form-label">Désignation</label>
            <AutocompleteInput value={line.designation} onChange={(v)=>onUpdate({designation:v})} suggestions={allProductSuggestions} placeholder="Sélectionner ou saisir..."/>
          </div>
          <div className="md:col-span-1">
            <label className="form-label">Qté</label>
            <input type="number" min={1} value={line.quantite} onChange={(e)=>onUpdate({quantite:Number(e.target.value)||1})} className="form-input text-center font-mono"/>
          </div>
          <div className="md:col-span-2">
            <label className="form-label">Prix U. HT (€)</label>
            <input type="number" min={0} step={0.01} value={line.prixUnitaireHT||""} onChange={(e)=>onUpdate({prixUnitaireHT:Number(e.target.value)||0})} className="form-input font-mono"/>
          </div>
          <div className="md:col-span-2">
            <div className="flex justify-between items-center mb-1">
              <label className="form-label !mb-0">TVA</label>
              <button
                type="button"
                onClick={() => onApplyTvaToAll(line.tva)}
                className="text-[10px] text-accent hover:text-accent/80 hover:underline font-semibold"
                title="Appliquer cette TVA à toutes les lignes existantes et futures"
              >
                Appliquer à tout
              </button>
            </div>
            <select value={line.tva} onChange={(e)=>onUpdate({tva:Number(e.target.value)})} className="form-input">
              {TVA_RATES.map((r)=><option key={r} value={r}>{r}%</option>)}
            </select>
          </div>
          <div className="md:col-span-2">
            <label className="form-label">Montant HT</label>
            <div className="h-10 px-3 py-2 bg-muted border border-border text-sm font-medium font-mono rounded flex items-center justify-end">{formatEUR(lineMontantHT(line))}</div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 mb-3">
          <div className="md:col-span-8">
            <label className="form-label">Description</label>
            <textarea value={line.description} onChange={(e)=>onUpdate({description:e.target.value})} className="form-input resize-none" rows={3} placeholder="Renseigné automatiquement par le configurateur..."/>
          </div>
          <div className="md:col-span-4 bg-muted/20 border border-border rounded-lg p-3 flex flex-col justify-between">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] text-muted-foreground uppercase tracking-wide font-medium">Achat HT (€)</label>
                <input
                  type="number"
                  min={0}
                  step={0.01}
                  value={line.prixAchatHT || 0}
                  onChange={(e)=>onUpdate({prixAchatHT:Number(e.target.value)||0})}
                  className="form-input font-mono !h-8 !text-xs mt-1 w-full"
                />
              </div>
              <div>
                <label className="text-[10px] text-muted-foreground uppercase tracking-wide font-medium">Marge Unit.</label>
                <div className="h-8 flex items-center justify-end font-mono text-[11px] font-semibold text-right mt-1 px-2 bg-muted border border-border rounded">
                  {(() => {
                    const achat = line.prixAchatHT || 0;
                    const vente = line.prixUnitaireHT || 0;
                    if ((line.categorie || "").toLowerCase() === "pose") {
                      return <span className="text-muted-foreground/60 italic text-[9px]">Exclue (Pose)</span>;
                    }
                    if (vente <= 0) return "—";
                    const marginValue = vente - achat;
                    const marginPct = (marginValue / vente) * 100;
                    return `${formatEUR(marginValue)} (${marginPct.toFixed(0)}%)`;
                  })()}
                </div>
              </div>
            </div>
            
            <div className="mt-2 pt-2 border-t border-border/50 flex items-center justify-between text-[10px]">
              <span className="text-muted-foreground uppercase font-medium">Catégorie</span>
              <select
                value={line.categorie || ""}
                onChange={(e)=>onUpdate({categorie:e.target.value})}
                className="bg-transparent border-0 text-accent font-semibold text-right focus:ring-0 p-0 text-[11px] cursor-pointer"
              >
                <option value="">Sélectionner...</option>
                {CATEGORIES.map((c)=><option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>
        </div>

        {line.options.length>0 && (
          <div className="ml-6 border-l-2 border-dashed border-accent pl-5 space-y-3 mb-3">
            {line.options.map((opt)=>(
              <div key={opt.id} className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
                <div className="md:col-span-5">
                  <label className="form-label">Option</label>
                  <AutocompleteInput value={opt.designation} onChange={(v)=>onUpdateOption(opt.id,{designation:v})} suggestions={OPTION_CATALOG} placeholder="Sélectionner une option..."/>
                </div>
                <div className="md:col-span-2">
                  <label className="form-label">Prix HT (€)</label>
                  <input type="number" min={0} step={0.01} value={opt.prixHT||""} onChange={(e)=>onUpdateOption(opt.id,{prixHT:Number(e.target.value)||0})} className="form-input font-mono"/>
                </div>
                <div className="md:col-span-2">
                  <label className="form-label">TVA</label>
                  <select value={opt.tva} onChange={(e)=>onUpdateOption(opt.id,{tva:Number(e.target.value)})} className="form-input">
                    {TVA_RATES.map((r)=><option key={r} value={r}>{r}%</option>)}
                  </select>
                </div>
                <div className="md:col-span-2">
                  <label className="form-label">TTC</label>
                  <div className="h-10 px-3 py-2 bg-muted border border-border text-sm font-mono rounded flex items-center justify-end">{formatEUR(opt.prixHT*(1+opt.tva/100))}</div>
                </div>
                <div className="md:col-span-1 flex justify-end">
                  <button onClick={()=>onRemoveOption(opt.id)} className="p-1.5 text-destructive hover:bg-destructive/10 transition-colors rounded"><Trash2 size={14}/></button>
                </div>
              </div>
            ))}
          </div>
        )}

        <button onClick={onAddOption} className="text-xs text-accent hover:text-accent-hover font-medium flex items-center gap-1 transition-colors">
          <Plus size={12}/> Ajouter une option
        </button>
      </div>

      {showWizard && <ConfigurateurWizard onApply={handleWizardApply} onClose={()=>setShowWizard(false)}/>}
    </>
  );
}

// ── MAIN QuoteForm ─────────────────────────────────────────────────────────────

export default function QuoteForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [quote, setQuote] = useState<Quote | null>(null);
  const [suppliers, setSuppliers] = useState<any[]>([]);

  const settings = loadSettings();
  const TVA_RATES = getEnabledTVARates(settings);
  const [defaultTva, setDefaultTva] = useState<number>(TVA_RATES[0] || 20);
  const catalogDesignations = settings.catalogProduits.map((p) => p.designation);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("oralis_fournisseurs");
      if (raw) setSuppliers(JSON.parse(raw));
    } catch (e) {
      console.error("Error loading suppliers in QuoteForm:", e);
    }
  }, []);

  const supplierProductDesignations = suppliers.flatMap((s) => (s.produits || []).map((p: any) => p.designation));

  const allProductSuggestions = [
    ...PRODUCT_CATALOG,
    ...catalogDesignations.filter((d) => !PRODUCT_CATALOG.includes(d)),
    ...supplierProductDesignations.filter((d) => !PRODUCT_CATALOG.includes(d) && !catalogDesignations.includes(d))
  ];

  useEffect(()=>{
    const all = loadQuotes();
    if (id && id!=="nouveau") {
      const found = all.find((q)=>q.id===id);
      if (found) {
        setQuote(found);
        if (found.lignes && found.lignes.length > 0) {
          setDefaultTva(found.lignes[0].tva);
        }
      } else navigate("/");
    } else {
      const nq = createEmptyQuote(all);
      nq.conditionsPaiement = settings.company.conditionsPaiement||nq.conditionsPaiement;
      nq.delaiRealisation = settings.company.delaiRealisation||nq.delaiRealisation;
      setQuote(nq);
    }
  },[id]);

  if (!quote) return null;

  const update = (patch: Partial<Quote>) => setQuote({...quote,...patch});
  const updateClient = (patch: Partial<Quote["client"]>) => setQuote({...quote,client:{...quote.client,...patch}});
  const updateLine = (lineId: string, patch: Partial<QuoteLine>) => {
    let finalPatch = { ...patch };
    if (patch.designation !== undefined) {
      // Find matching product in suppliers
      for (const s of suppliers) {
        const prod = (s.produits || []).find((p: any) => p.designation === patch.designation);
        if (prod) {
          if (prod.notes) finalPatch.description = prod.notes;
          else if (prod.reference) finalPatch.description = prod.reference;
          if (prod.image) finalPatch.image = prod.image;
          break;
        }
      }
    }
    update({lignes:quote.lignes.map((l)=>l.id===lineId?{...l,...finalPatch}:l)});
  };
  const updateOption = (lineId: string, optId: string, patch: Partial<QuoteOption>) =>
    update({lignes:quote.lignes.map((l)=>l.id===lineId?{...l,options:l.options.map((o)=>o.id===optId?{...o,...patch}:o)}:l)});
  const addLine = () => update({lignes:[...quote.lignes,emptyLine(defaultTva)]});
  const removeLine = (lineId: string) => update({lignes:quote.lignes.filter((l)=>l.id!==lineId)});
  const addOption = (lineId: string) => updateLine(lineId,{options:[...quote.lignes.find((l)=>l.id===lineId)!.options,emptyOption(defaultTva)]});
  const removeOption = (lineId: string, optId: string) => updateLine(lineId,{options:quote.lignes.find((l)=>l.id===lineId)!.options.filter((o)=>o.id!==optId)});

  const handleApplyTvaToAll = (tva: number) => {
    setDefaultTva(tva);
    const updatedLines = quote.lignes.map(l => ({
      ...l,
      tva: tva,
      options: l.options.map(o => ({ ...o, tva: tva }))
    }));
    update({ lignes: updatedLines });
    toast.success(`TVA ${tva}% appliquée à tout le document`);
  };

  const save = () => {
    if (quote.lignes.length === 0) {
      toast.error("Le devis doit contenir au moins une ligne.");
      return false;
    }
    const all = loadQuotes();
    const idx = all.findIndex((q)=>q.id===quote.id);
    if (idx>=0) all[idx]=quote; else all.push(quote);
    saveQuotes(all); navigate("/");
    return true;
  };

  const totals = calcTotals(quote.lignes);

  const productLines = quote.lignes.filter(l => (l.categorie || "").toLowerCase() !== "pose");
  const totalAchatProduits = productLines.reduce((acc, l) => acc + ((l.prixAchatHT || 0) * l.quantite), 0);
  const totalVenteProduits = productLines.reduce((acc, l) => acc + (l.prixUnitaireHT * l.quantite), 0);
  const totalMargeHT = totalVenteProduits - totalAchatProduits;
  const marginPct = totalVenteProduits > 0 ? (totalMargeHT / totalVenteProduits) * 100 : 0;

  return (
    <div className="p-6 lg:p-8 w-full pb-32">
      <h1 className="font-display text-[28px] font-semibold mb-1 tracking-tight">
        {id==="nouveau"?"Nouveau Devis":`Devis ${quote.numero}`}
      </h1>
      <p className="text-[13px] text-muted-foreground mb-8 font-body">
        {id==="nouveau"?"Créez un nouveau devis premium":"Modifiez les informations du devis"}
      </p>

      {/* Section A — Header */}
      <section className="luxury-card mb-5">
        <h2 className="section-title">Informations du devis</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div><label className="form-label">N° Devis</label><input type="text" value={quote.numero} readOnly className="form-input bg-muted"/></div>
          <div><label className="form-label">Date</label><input type="date" value={quote.date} onChange={(e)=>update({date:e.target.value})} className="form-input"/></div>
          <div><label className="form-label">Validité (jours)</label>
            <select value={quote.validite} onChange={(e)=>update({validite:Number(e.target.value)})} className="form-input">
              {VALIDITE_OPTIONS.map((v)=><option key={v} value={v}>{v} jours</option>)}
            </select></div>
          <div><label className="form-label">Expiration</label><input type="text" readOnly value={formatDate(expiryDate(quote.date,quote.validite))} className="form-input bg-muted"/></div>
        </div>
        <div className="mt-4 flex flex-wrap gap-4 items-end">
          <div className="w-48">
            <label className="form-label">Statut</label>
            <select value={quote.statut} onChange={(e)=>update({statut:e.target.value as Quote["statut"]})} className="form-input">
              {(Object.keys(STATUT_LABELS) as Quote["statut"][]).map((s)=><option key={s} value={s}>{STATUT_LABELS[s]}</option>)}
            </select>
          </div>
          <div className="w-64">
            <label className="form-label text-accent font-semibold">TVA par défaut du document</label>
            <div className="flex gap-2">
              <select value={defaultTva} onChange={(e)=>{
                const val = Number(e.target.value);
                setDefaultTva(val);
              }} className="form-input w-24">
                {TVA_RATES.map((r)=><option key={r} value={r}>{r}%</option>)}
              </select>
              <button
                type="button"
                onClick={() => handleApplyTvaToAll(defaultTva)}
                className="px-3 py-1.5 bg-accent/10 border border-accent/30 text-accent hover:bg-accent/20 rounded font-medium text-[12px] flex-1"
              >
                Appliquer à tout le devis
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Section B — Client */}
      <section className="luxury-card mb-5">
        <h2 className="section-title">Client</h2>
        <div className="flex gap-3 mb-5">
          {(["particulier","professionnel"] as const).map((t)=>(
            <button key={t} onClick={()=>updateClient({type:t})}
              className={`px-4 py-2 text-[13px] rounded border transition-all duration-200 ${quote.client.type===t?"bg-accent text-accent-foreground border-accent shadow-sm":"border-border text-muted-foreground hover:border-accent/50 hover:text-foreground"}`}>
              {t==="particulier"?"Particulier":"Professionnel"}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div><label className="form-label">Prénom *</label><input type="text" value={quote.client.prenom} onChange={(e)=>updateClient({prenom:e.target.value})} className="form-input" required/></div>
          <div><label className="form-label">Nom *</label><input type="text" value={quote.client.nom} onChange={(e)=>updateClient({nom:e.target.value})} className="form-input" required/></div>
          {quote.client.type==="professionnel" && <div className="md:col-span-2"><label className="form-label">Société</label><input type="text" value={quote.client.societe} onChange={(e)=>updateClient({societe:e.target.value})} className="form-input"/></div>}
          <div><label className="form-label">Email *</label><input type="email" value={quote.client.email} onChange={(e)=>updateClient({email:e.target.value})} className="form-input" required/></div>
          <div><label className="form-label">Téléphone</label><input type="tel" value={quote.client.telephone} onChange={(e)=>updateClient({telephone:e.target.value})} className="form-input"/></div>
          <div className="md:col-span-2"><label className="form-label">Adresse</label><input type="text" value={quote.client.rue} onChange={(e)=>updateClient({rue:e.target.value})} className="form-input" placeholder="Rue"/></div>
          <div><label className="form-label">Ville</label><input type="text" value={quote.client.ville} onChange={(e)=>updateClient({ville:e.target.value})} className="form-input"/></div>
          <div><label className="form-label">Code postal</label><input type="text" value={quote.client.codePostal} onChange={(e)=>updateClient({codePostal:e.target.value})} className="form-input"/></div>
          <div><label className="form-label">Pays</label>
            <select value={quote.client.pays} onChange={(e)=>updateClient({pays:e.target.value})} className="form-input">
              {PAYS_OPTIONS.map((p)=><option key={p} value={p}>{p}</option>)}
            </select></div>
        </div>
      </section>

      {/* Section C — Lines */}
      <section className="luxury-card mb-5">
        <h2 className="section-title">Lignes du devis</h2>
        {quote.lignes.map((line, li) => (
          <div key={line.id}>
            <QuoteLineRow
              line={line} li={li} totalLines={quote.lignes.length}
              allProductSuggestions={allProductSuggestions} TVA_RATES={TVA_RATES}
              onUpdate={(patch)=>updateLine(line.id,patch)}
              onRemove={()=>removeLine(line.id)}
              onAddOption={()=>addOption(line.id)}
              onRemoveOption={(optId)=>removeOption(line.id,optId)}
              onUpdateOption={(optId,patch)=>updateOption(line.id,optId,patch)}
              onApplyTvaToAll={handleApplyTvaToAll}
            />
            {li<quote.lignes.length-1 && <hr className="mt-6 mb-6 border-border"/>}
          </div>
        ))}
        <button onClick={addLine} className="mt-5 btn-outline-gold flex items-center gap-2 text-xs"><Plus size={14}/> Ajouter une ligne</button>
      </section>

      {/* Section D — Totals */}
      <section className="bg-primary text-primary-foreground border border-sidebar-border p-6 mb-5 sticky bottom-0 z-10 rounded-lg shadow-elevated">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
          {/* Marge Interne (gauche) */}
          <div className="border-b md:border-b-0 md:border-r border-primary-foreground/20 pb-4 md:pb-0 md:pr-6">
            <div className="text-[11px] uppercase tracking-wider text-accent font-semibold mb-2">Marge commerciale (Interne)</div>
            <div className="space-y-1 text-xs">
              <div className="flex justify-between max-w-xs"><span className="text-primary-foreground/60">Achat (Hors Pose) :</span><span className="font-mono">{formatEUR(totalAchatProduits)}</span></div>
              <div className="flex justify-between max-w-xs"><span className="text-primary-foreground/60">Vente (Hors Pose) :</span><span className="font-mono">{formatEUR(totalVenteProduits)}</span></div>
              <div className="flex justify-between max-w-xs font-semibold border-t border-primary-foreground/10 pt-1 mt-1 text-[13px]">
                <span>Marge brute :</span>
                <span className="font-mono text-accent">{formatEUR(totalMargeHT)} ({marginPct.toFixed(0)}%)</span>
              </div>
            </div>
          </div>
          
          {/* Totaux client (droite) */}
          <div className="flex flex-col items-end gap-1 text-sm">
            <div className="flex justify-between w-full md:w-72"><span className="text-primary-foreground/60">Sous-total HT</span><span className="font-mono">{formatEUR(totals.sousTotal)}</span></div>
            {Object.entries(totals.tvaMap).filter(([,v])=>v>0).sort(([a],[b])=>Number(a)-Number(b)).map(([rate,amount])=>(
              <div key={rate} className="flex justify-between w-full md:w-72"><span className="text-primary-foreground/60">TVA {rate}%</span><span className="font-mono">{formatEUR(amount)}</span></div>
            ))}
            <div className="flex justify-between w-full md:w-72"><span className="text-primary-foreground/60">Total TVA</span><span className="font-mono">{formatEUR(totals.totalTVA)}</span></div>
            <div className="border-t border-accent mt-2 pt-3 flex justify-between w-full md:w-72">
              <span className="font-display text-xl font-bold">TOTAL TTC</span>
              <span className="font-display text-xl font-bold text-accent">{formatEUR(totals.totalTTC)}</span>
            </div>
          </div>
        </div>
      </section>

      {/* Section E — Terms */}
      <section className="luxury-card mb-5">
        <h2 className="section-title">Conditions commerciales</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div><label className="form-label">Conditions de paiement</label><input type="text" value={quote.conditionsPaiement} onChange={(e)=>update({conditionsPaiement:e.target.value})} className="form-input"/></div>
          <div><label className="form-label">Délai de réalisation</label><input type="text" value={quote.delaiRealisation} onChange={(e)=>update({delaiRealisation:e.target.value})} className="form-input"/></div>
        </div>
        <div className="mb-4"><label className="form-label">Notes / Remarques</label><textarea value={quote.notes} onChange={(e)=>update({notes:e.target.value})} className="form-input resize-none" rows={3}/></div>
        <p className="text-[11px] text-muted-foreground leading-relaxed">Devis valable {quote.validite} jours. TVA selon pays du chantier. {getLegalMention(settings)}</p>
      </section>

      {/* Section F — Actions */}
      <div className="flex flex-wrap gap-3">
        <button onClick={save} className="btn-gold">Sauvegarder</button>
        <button onClick={()=>{ if (save()) { const all=loadQuotes(); const saved=all.find((q)=>q.id===quote.id); if(saved) navigate(`/devis/${saved.id}/apercu`); } }} className="btn-outline-gold">Aperçu PDF</button>
        <button onClick={()=>navigate("/")} className="btn-ghost">Retour au tableau de bord</button>
      </div>
    </div>
  );
}
