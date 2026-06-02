import { useState, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Plus, Trash2, Upload, Camera, Wrench, X, ChevronRight, AlertCircle, CheckCircle2, ArrowLeft, ArrowRight, Users, ChevronUp, ChevronDown } from "lucide-react";
import { toast } from "sonner";
import {
  loadQuotes, saveQuotes, createEmptyQuote, emptyLine, emptyOption,
  formatEUR, formatDate, expiryDate, calcTotals, lineMontantHT,
  PRODUCT_CATALOG, OPTION_CATALOG, VALIDITE_OPTIONS, PAYS_OPTIONS, STATUT_LABELS,
  type Quote, type QuoteLine, type QuoteOption, uid
} from "@/lib/quote-data";
import { loadSettings, getEnabledTVARates, getLegalMention } from "@/lib/settings-data";
import {
  loadModeles, calculerPrix, calculerPoteaux, genererDescription,
  formatMM, formatCoef, formatDimDevis, getLabelsModele,
  calculerPrixCoulissant, genererDescriptionCoulissant,
  ABAQUE_COULISSANT, type AbaquePanneau,
  calculerPrixParoiFixe, genererDescriptionParoiFixe,
  calculerPrixParoiGrille, genererDescriptionParoiGrille,
  type ModelePergola, type ResultatCalcul, type ModeleCoulissant, type ResultatCoulissant, type ModeleParoiFixe, type ResultatParoiFixe, type ModeleParoiGrille, type ResultatParoiGrille, type AnyModele,
} from "@/lib/configurator-data";
import { ConfirmModal } from "@/components/ConfirmModal";

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
  hauteurPoteaux: number;
  poteauxSupp: number;
  longueurPoteauxSupp: number;
  moteur?: string;
  optionsSuppIds?: string[];
  
  // Parois coulissantes
  vantaux?: number;
  tarifPanneauId?: string;
  couleurCoulissant?: string;
  optionsCoulissantIds?: string[];
  largeurVerre?: number;
  hauteurVerre?: number;

  // Parois fixes
  typeParoi?: string;
  typeParoiId?: string;
  largeurParoi?: number;
  hauteurParoi?: number;
  prixAchatBaseHT?: number;
}

function ConfigurateurWizard({ initialState, onApply, onClose }: {
  initialState?: WizardState;
  onApply: (data: { designation: string; description: string; prixVenteHT: number; prixAchatHT: number; image?: string }, state: WizardState) => void;
  onClose: () => void;
}) {
  const modeles = loadModeles();
  const [step, setStep] = useState<WizardStep>(() => {
    if (!initialState) return 1;
    const found = modeles.find((m) => m.id === initialState.modeleId);
    if (!found) return 1;
    if (found.typeModele === "coulissant" || found.typeModele === "paroi_fixe" || found.typeModele === "paroi_avec_grille") {
      return 3;
    }
    return 4;
  });
  
  const [state, setState] = useState<WizardState>(() => {
    if (initialState) {
      const modelExists = modeles.some((m) => m.id === initialState.modeleId);
      if (modelExists) {
        const found = modeles.find((m) => m.id === initialState.modeleId);
        return {
          ...initialState,
          largeur: initialState.largeur || 4000,
          profondeur: initialState.profondeur || 3000,
          hauteurPoteaux: initialState.hauteurPoteaux || 2500,
          poteauxSupp: initialState.poteauxSupp || 0,
          longueurPoteauxSupp: initialState.longueurPoteauxSupp || 2500,
          moteur: initialState.moteur !== undefined ? initialState.moteur : ((found?.typeModele === "screen" || found?.typeModele === "volet") ? "Moteur Somfy" : ""),
          optionsSuppIds: initialState.optionsSuppIds || [],
          vantaux: initialState.vantaux || (found?.typeModele === "coulissant" ? (found as ModeleCoulissant).vantauxMin : 3),
          tarifPanneauId: initialState.tarifPanneauId || (found?.typeModele === "coulissant" ? (found as ModeleCoulissant).tarifsPanneau[0]?.id : ""),
          couleurCoulissant: initialState.couleurCoulissant || "Anthracite RAL 7016",
          optionsCoulissantIds: initialState.optionsCoulissantIds || [],
          largeurVerre: initialState.largeurVerre || 90,
          hauteurVerre: initialState.hauteurVerre || 200,
          typeParoi: initialState.typeParoi || "Aluminium 12 lattes (192 cm de haut)",
          typeParoiId: initialState.typeParoiId || (found?.typeModele === "paroi_avec_grille" ? (found as ModeleParoiGrille).typesParoi[0]?.id : ""),
          largeurParoi: initialState.largeurParoi || 100,
          hauteurParoi: initialState.hauteurParoi || 192,
          prixAchatBaseHT: initialState.prixAchatBaseHT || 0,
        };
      }
    }
    const defaultModele = modeles[0];
    return {
      modeleId: defaultModele?.id || "",
      toitureId: defaultModele?.toitures?.[0]?.id || "",
      couleurId: defaultModele?.couleurs?.[0]?.id || "",
      largeur: 4000,
      profondeur: 3000,
      coefficient: defaultModele?.margeDefaut || 1.4,
      hauteurPoteaux: 2500,
      poteauxSupp: 0,
      longueurPoteauxSupp: 2500,
      moteur: (defaultModele?.typeModele === "screen" || defaultModele?.typeModele === "volet") ? "Moteur Somfy" : "",
      optionsSuppIds: [],
      vantaux: defaultModele?.typeModele === "coulissant" ? (defaultModele as ModeleCoulissant).vantauxMin : 3,
      tarifPanneauId: defaultModele?.typeModele === "coulissant" ? (defaultModele as ModeleCoulissant).tarifsPanneau[0]?.id : "",
      couleurCoulissant: "Anthracite RAL 7016",
      optionsCoulissantIds: [],
      largeurVerre: 90,
      hauteurVerre: 200,
      typeParoi: "Aluminium 12 lattes (192 cm de haut)",
      typeParoiId: defaultModele?.typeModele === "paroi_avec_grille" ? (defaultModele as ModeleParoiGrille).typesParoi[0]?.id : "",
      largeurParoi: 100,
      hauteurParoi: 192,
      prixAchatBaseHT: 0,
    };
  });

  const isFirstRender = useRef(true);
  const [calcError, setCalcError] = useState<string | null>(null);
  const [resultat, setResultat] = useState<ResultatCalcul | null>(null);
  const [resultatCoulissant, setResultatCoulissant] = useState<ResultatCoulissant | null>(null);
  const [resultatParoiFixe, setResultatParoiFixe] = useState<ResultatParoiFixe | null>(null);
  const [resultatParoiGrille, setResultatParoiGrille] = useState<ResultatParoiGrille | null>(null);

  const modele = modeles.find((m) => m.id === state.modeleId);
  const isOrisSolid = (modele && modele.typeModele !== "coulissant" && modele.typeModele !== "paroi_fixe" && modele.typeModele !== "paroi_avec_grille") ? (modele as ModelePergola).nom.toLowerCase().includes("oris solid") : false;

  // Auto-sélection quand le modèle change
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    if (modele) {
      if (modele.typeModele === "coulissant") {
        const mc = modele as ModeleCoulissant;
        setState((s) => ({
          ...s,
          coefficient: mc.margeDefaut,
          vantaux: mc.vantauxMin,
          tarifPanneauId: mc.tarifsPanneau[0]?.id || "",
          couleurId: mc.couleurs?.[0]?.id || "",
          optionsCoulissantIds: [],
          largeurVerre: 90,
          hauteurVerre: 200,
        }));
      } else if (modele.typeModele === "paroi_fixe") {
        const mf = modele as ModeleParoiFixe;
        setState((s) => ({
          ...s,
          coefficient: mf.margeDefaut,
          couleurId: mf.couleurs?.[0]?.id || "",
          typeParoi: "Aluminium 12 lattes (192 cm de haut)",
          largeurParoi: 100,
          hauteurParoi: 192,
          prixAchatBaseHT: 0,
        }));
      } else if (modele.typeModele === "paroi_avec_grille") {
        const mg = modele as ModeleParoiGrille;
        setState((s) => ({
          ...s,
          coefficient: mg.margeDefaut,
          couleurId: mg.couleurs?.[0]?.id || "",
          typeParoiId: mg.typesParoi?.[0]?.id || "",
          typeParoi: mg.typesParoi?.[0]?.nom || "",
          largeurParoi: 250, // default 250cm
          hauteurParoi: 200, // default height
        }));
      } else {
        const mp = modele as ModelePergola;
        setState((s) => ({
          ...s,
          toitureId: mp.toitures[0]?.id || "",
          couleurId: mp.couleurs[0]?.id || "",
          coefficient: mp.margeDefaut,
          moteur: (mp.typeModele === "screen" || mp.typeModele === "volet") ? "Moteur Somfy" : "",
          optionsSuppIds: [],
        }));
      }
    }
  }, [state.modeleId]);

  // Recalcul live pour pergolas/screens
  useEffect(() => {
    if (step < 3 || !modele || (modele.typeModele !== "pergola" && modele.typeModele !== "screen" && modele.typeModele !== "volet")) return;
    const mp = modele as ModelePergola;
    if (!state.toitureId || !state.couleurId) return;
    try {
      const r = calculerPrix(
        mp,
        state.largeur,
        state.profondeur,
        state.toitureId,
        state.couleurId,
        state.coefficient,
        state.hauteurPoteaux,
        state.poteauxSupp,
        state.longueurPoteauxSupp,
        state.optionsSuppIds || []
      );
      setResultat(r); setCalcError(null);
    } catch (e) {
      setCalcError((e as Error).message); setResultat(null);
    }
  }, [modele, state.largeur, state.profondeur, state.toitureId, state.couleurId, state.coefficient, state.hauteurPoteaux, state.poteauxSupp, state.longueurPoteauxSupp, state.optionsSuppIds, step]);

  // Recalcul live pour parois coulissantes
  useEffect(() => {
    if (!modele || modele.typeModele !== "coulissant") return;
    const mc = modele as ModeleCoulissant;
    try {
      const r = calculerPrixCoulissant(
        mc,
        state.vantaux || 3,
        state.tarifPanneauId || "",
        state.optionsCoulissantIds || [],
        state.couleurId || "",
        state.coefficient
      );
      setResultatCoulissant(r);
    } catch {
      setResultatCoulissant(null);
    }
  }, [modele, state.vantaux, state.tarifPanneauId, state.optionsCoulissantIds, state.couleurId, state.coefficient, step]);

  // Recalcul live pour parois fixes
  useEffect(() => {
    if (!modele || modele.typeModele !== "paroi_fixe") return;
    const mf = modele as ModeleParoiFixe;
    try {
      const r = calculerPrixParoiFixe(
        mf,
        {
          typeParoi: state.typeParoi || "",
          largeurParoi: state.largeurParoi || 0,
          hauteurParoi: state.hauteurParoi || 0,
          prixAchatBaseHT: state.prixAchatBaseHT || 0,
        },
        state.coefficient
      );
      setResultatParoiFixe(r);
    } catch {
      setResultatParoiFixe(null);
    }
  }, [modele, state.typeParoi, state.largeurParoi, state.hauteurParoi, state.prixAchatBaseHT, state.coefficient, step]);

  // Recalcul live pour parois avec grille
  useEffect(() => {
    if (!modele || modele.typeModele !== "paroi_avec_grille") return;
    const mg = modele as ModeleParoiGrille;
    try {
      const r = calculerPrixParoiGrille(
        mg,
        {
          typeParoiId: state.typeParoiId || "",
          largeurMm: (state.largeurParoi || 0) * 10,
          hauteurCm: state.hauteurParoi,
          couleurId: state.couleurId || "",
        },
        state.coefficient
      );
      setResultatParoiGrille(r);
    } catch {
      setResultatParoiGrille(null);
    }
  }, [modele, state.typeParoiId, state.largeurParoi, state.hauteurParoi, state.couleurId, state.coefficient, step]);

  // Poteaux calculés en live (pergolas uniquement)
  const poteauxCalc = (modele && modele.typeModele !== "coulissant" && modele.typeModele !== "paroi_fixe" && modele.typeModele !== "paroi_avec_grille")
    ? calculerPoteaux((modele as ModelePergola).reglesPoteau, state.largeur, state.profondeur)
    : 0;

  const labels = getLabelsModele(modele?.typeModele);
  const dim2Label = labels.dim2Label;

  const canNext = () => {
    if (step === 1) return !!modele;
    if (modele?.typeModele === "coulissant") {
      if (step === 2) return !!state.tarifPanneauId;
      return false;
    }
    if (modele?.typeModele === "paroi_fixe") {
      if (step === 2) {
        const isVerre = state.typeParoi?.toLowerCase().includes("verre");
        const hasHeight = !isVerre || (state.hauteurParoi && state.hauteurParoi > 0);
        return !!state.typeParoi && !!state.largeurParoi && state.largeurParoi > 0 && !!hasHeight && state.prixAchatBaseHT !== undefined && state.prixAchatBaseHT >= 0;
      }
      return false;
    }
    if (modele?.typeModele === "paroi_avec_grille") {
      if (step === 2) {
        return !!state.typeParoiId && !!state.largeurParoi && state.largeurParoi > 0 && !!state.couleurId;
      }
      return false;
    }
    if (step === 2) return !!state.toitureId && !!state.couleurId;
    if (step === 3) return !calcError && !!resultat;
    return false;
  };

  const handleApply = () => {
    if (!modele) return;
    if (modele.typeModele === "coulissant") {
      if (!resultatCoulissant) return;
      const mc = modele as ModeleCoulissant;
      const tarif = mc.tarifsPanneau.find((t) => t.id === state.tarifPanneauId);
      const opts = mc.options
        .filter((o) => (state.optionsCoulissantIds || []).includes(o.id))
        .map((o) => o.nom);

      const abac = ABAQUE_COULISSANT.find((a) => a.hauteurVerre === state.hauteurVerre);
      const encastrementStr = abac ? `${abac.encastrementMin} - ${abac.encastrementMax}` : "";

      const couleurOpt = mc.couleurs?.find((c) => c.id === state.couleurId);
      const couleurNom = couleurOpt ? couleurOpt.nom : "—";

      const hasPrefix = mc.nom.toLowerCase().includes("paroi") || mc.nom.toLowerCase().includes("couliss");
      const designation = `${hasPrefix ? "" : "Parois coulissantes "}${mc.nom} — ${state.vantaux} vantaux`;
      const description = genererDescriptionCoulissant(mc, {
        vantaux: state.vantaux || 3,
        tarifPanneau: tarif?.label || "—",
        couleur: couleurNom,
        options: opts,
        largeurVerre: state.largeurVerre,
        hauteurVerre: state.hauteurVerre,
        hauteurEncastrement: encastrementStr,
      });

      onApply({ designation, description, prixVenteHT: resultatCoulissant.prixVenteHT, prixAchatHT: resultatCoulissant.prixAchatTotalHT, image: mc.image }, state);
    } else if (modele.typeModele === "paroi_fixe") {
      if (!resultatParoiFixe) return;
      const mf = modele as ModeleParoiFixe;
      const couleurOpt = mf.couleurs?.find((c) => c.id === state.couleurId);
      const couleurNom = couleurOpt ? couleurOpt.nom : "—";

      const designation = `${state.typeParoi} — ${state.largeurParoi} cm`;
      
      let warningNotes = "";
      if (state.typeParoi?.includes("12 lattes") && (state.largeurParoi || 0) > 96) {
        warningNotes = "Note : Largeur supérieure à 96 cm avec profil F (lattes de 16 cm)";
      } else if (state.typeParoi?.includes("10 lattes") && (state.largeurParoi || 0) > 100) {
        warningNotes = "Note : Largeur supérieure à 100 cm avec profil F (lattes de 20 cm)";
      }

      const description = genererDescriptionParoiFixe(mf, {
        typeParoi: state.typeParoi || "—",
        largeur: state.largeurParoi || 0,
        hauteur: state.hauteurParoi || 0,
        couleur: couleurNom,
        notes: warningNotes,
      });

      onApply({ designation, description, prixVenteHT: resultatParoiFixe.prixVenteHT, prixAchatHT: resultatParoiFixe.prixAchatTotalHT, image: mf.image }, state);
    } else if (modele.typeModele === "paroi_avec_grille") {
      if (!resultatParoiGrille) return;
      const mg = modele as ModeleParoiGrille;
      const typeParoiOpt = mg.typesParoi.find((t) => t.id === state.typeParoiId);
      const typeParoiNom = typeParoiOpt ? typeParoiOpt.nom : "—";
      const couleurOpt = mg.couleurs?.find((c) => c.id === state.couleurId);
      const couleurNom = couleurOpt ? couleurOpt.nom : "—";

      const designation = `${typeParoiNom} — ${state.largeurParoi} cm`;

      let warningNotes = "";
      if (typeParoiNom.includes("12 lattes") && (state.largeurParoi || 0) > 96) {
        warningNotes = "Note : Largeur supérieure à 96 cm avec profil F (lattes de 16 cm)";
      } else if (typeParoiNom.includes("10 lattes") && (state.largeurParoi || 0) > 100) {
        warningNotes = "Note : Largeur supérieure à 100 cm avec profil F (lattes de 20 cm)";
      }

      const description = genererDescriptionParoiGrille(mg, {
        typeParoi: typeParoiNom,
        largeur: state.largeurParoi || 0,
        hauteur: state.hauteurParoi,
        couleur: couleurNom,
        notes: warningNotes,
      });

      onApply({ designation, description, prixVenteHT: resultatParoiGrille.prixVenteHT, prixAchatHT: resultatParoiGrille.prixAchatTotalHT, image: mg.image }, state);
    } else {
      if (!resultat) return;
      const mp = modele as ModelePergola;
      const toiture = mp.toitures.find((t) => t.id === state.toitureId);
      const couleur = mp.couleurs.find((c) => c.id === state.couleurId);
      const optsSupp = (state.optionsSuppIds || [])
        .map((id) => mp.optionsSupp?.find((o) => o.id === id)?.nom)
        .filter(Boolean) as string[];

      const designation = mp.nom;

      const description = genererDescription(mp.templateDescription, {
        nom: mp.nom,
        largeurMm: state.largeur,
        profondeurMm: state.profondeur,
        toiture: toiture?.nom || "—",
        couleur: couleur?.nom || "—",
        poteaux: resultat.nombrePoteaux,
        typeDim: mp.typeDim,
        hauteurPoteauxMm: state.hauteurPoteaux,
        poteauxSupp: state.poteauxSupp,
        longueurPoteauxSuppMm: state.longueurPoteauxSupp,
        sectionPoteaux: mp.sectionPoteaux,
        moteur: state.moteur,
        optionsSupp: optsSupp,
      });

      onApply({ designation, description, prixVenteHT: resultat.prixVenteHT, prixAchatHT: resultat.prixAchatTotalHT, image: mp.image }, state);
    }
  };

  const STEPS = (modele?.typeModele === "coulissant" || modele?.typeModele === "paroi_fixe" || modele?.typeModele === "paroi_avec_grille")
    ? [
        { n: 1 as WizardStep, label: "Modèle" },
        { n: 2 as WizardStep, label: "Configuration" },
        { n: 3 as WizardStep, label: "Prix & Marge" },
      ]
    : [
        { n: 1 as WizardStep, label: "Modèle" },
        { n: 2 as WizardStep, label: "Options" },
        { n: 3 as WizardStep, label: "Dimensions" },
        { n: 4 as WizardStep, label: "Prix" },
      ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="bg-card border border-border rounded-xl shadow-elevated w-full max-w-2xl max-h-[90vh] flex flex-col">
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
        <div className="px-6 py-5 min-h-[260px] flex-1 overflow-y-auto">

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
                            {m.typeModele === "coulissant" ? (
                              <span>{(m as ModeleCoulissant).tarifsPanneau.length} tarifs · vantaux {(m as ModeleCoulissant).vantauxMin}-{(m as ModeleCoulissant).vantauxMax} · </span>
                            ) : m.typeModele === "paroi_fixe" ? (
                              <span>Tarification manuelle · </span>
                            ) : m.typeModele === "paroi_avec_grille" ? (
                              <span>{(m as ModeleParoiGrille).typesParoi.length} types de paroi · </span>
                            ) : (
                              <span>{(m as ModelePergola).grille.largeurs.length}L × {(m as ModelePergola).grille.profondeurs.length}P · </span>
                            )}
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
          {step===2 && modele && (modele.typeModele === "pergola" || modele.typeModele === "screen" || modele.typeModele === "volet") && (
            <div>
              <h3 className="font-semibold text-[14px] mb-4">Options — <span className="text-accent">{modele.nom}</span></h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="text-[11px] uppercase tracking-wide font-semibold text-muted-foreground mb-2 block">{labels.toituresLabel}</label>
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
                {(modele.typeModele === "screen" || modele.typeModele === "volet") && (
                  <div className="md:col-span-2 pt-4 border-t border-border">
                    <label className="text-[11px] uppercase tracking-wide font-semibold text-muted-foreground mb-1.5 block">Motorisation</label>
                    <input
                      type="text"
                      value={state.moteur ?? "Moteur Somfy"}
                      onChange={(e) => setState({ ...state, moteur: e.target.value })}
                      className="form-input w-full"
                      placeholder="Ex: Moteur Somfy"
                    />
                  </div>
                )}
                {modele.optionsSupp && modele.optionsSupp.length > 0 && (
                  <div className="md:col-span-2 pt-4 border-t border-border">
                    <label className="text-[11px] uppercase tracking-wide font-semibold text-muted-foreground mb-2 block">
                      Options supplémentaires
                    </label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {modele.optionsSupp.map((opt) => {
                        const selected = (state.optionsSuppIds || []).includes(opt.id);
                        return (
                          <label
                            key={opt.id}
                            className={`flex items-center justify-between p-2.5 rounded border cursor-pointer transition-all text-[13px] ${
                              selected
                                ? "border-accent bg-accent/5 font-medium text-accent"
                                : "border-border hover:border-accent/40"
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                checked={selected}
                                onChange={(e) => {
                                  const current = state.optionsSuppIds || [];
                                  const next = e.target.checked
                                    ? [...current, opt.id]
                                    : current.filter((id) => id !== opt.id);
                                  setState({ ...state, optionsSuppIds: next });
                                }}
                                className="rounded border-gray-300 text-accent focus:ring-accent"
                              />
                              <span>{opt.nom}</span>
                            </div>
                            <span className="text-[11px] text-muted-foreground font-mono">
                              {opt.surchargeHT > 0 && `+${formatEUR(opt.surchargeHT)}`}
                              {opt.surchargePct > 0 && `+${opt.surchargePct}%`}
                              {opt.surchargeHT === 0 && opt.surchargePct === 0 && "inclus"}
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Étape 3 — Dimensions */}
          {step===3 && modele && (modele.typeModele === "pergola" || modele.typeModele === "screen" || modele.typeModele === "volet") && (
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

              {labels.showPoteaux && (
                <div className="grid grid-cols-2 gap-6 mb-4">
                  <div>
                    <label className="form-label">Hauteur des poteaux (mm)</label>
                    <input type="number" min={100} step={10} value={state.hauteurPoteaux}
                      onChange={(e)=>setState({...state,hauteurPoteaux:parseInt(e.target.value)||2500})}
                      className="form-input font-mono text-lg text-center"/>
                    <p className="text-[11px] text-muted-foreground mt-1">
                      {isOrisSolid ? "→ Section : 136×136 mm" : `→ ${formatMM(state.hauteurPoteaux)} (Standard : 2,50m)`}
                    </p>
                  </div>
                  {isOrisSolid ? (
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="form-label">Poteaux supp. (Longueur)</label>
                        <select
                          value={state.longueurPoteauxSupp}
                          onChange={(e)=>setState({...state,longueurPoteauxSupp:parseInt(e.target.value)||2500})}
                          className="form-input font-mono text-[14px] text-center h-11"
                        >
                          <option value={2500}>2500 mm (2,50 m)</option>
                          <option value={3000}>3000 mm (3,00 m)</option>
                          <option value={3500}>3500 mm (3,50 m)</option>
                          <option value={5000}>5000 mm (5,00 m)</option>
                          <option value={6000}>6000 mm (6,00 m)</option>
                        </select>
                        <p className="text-[11px] text-muted-foreground mt-1">
                          → Option poteaux supp.
                        </p>
                      </div>
                      <div>
                        <label className="form-label">Poteaux supp. (Qté)</label>
                        <input type="number" min={0} step={1} value={state.poteauxSupp}
                          onChange={(e)=>setState({...state,poteauxSupp:parseInt(e.target.value)||0})}
                          className="form-input font-mono text-lg text-center"/>
                        <p className="text-[11px] text-muted-foreground mt-1">
                          → Chiffrée en ml
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <label className="form-label">Poteaux supplémentaires (Qté)</label>
                      <input type="number" min={0} step={1} value={state.poteauxSupp}
                        onChange={(e)=>setState({...state,poteauxSupp:parseInt(e.target.value)||0})}
                        className="form-input font-mono text-lg text-center"/>
                      <p className="text-[11px] text-muted-foreground mt-1">
                        → Option poteaux supp. chiffrée en ml
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Poteaux calculés automatiquement */}
              {labels.showPoteaux && modele.reglesPoteau.length > 0 && poteauxCalc > 0 && (
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
          {step===4 && modele && (modele.typeModele === "pergola" || modele.typeModele === "screen" || modele.typeModele === "volet") && (
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
                    {resultat.surchargeToitureHT>0 && (() => {
                      const t = modele.toitures.find(x => x.id === state.toitureId);
                      const detail = t?.modeCalcul === "m2"
                        ? ` (m² : ${((state.largeur/1000)*(state.profondeur/1000)).toFixed(2)}m² × ${formatEUR(t.surchargeHT)}/m²)`
                        : t?.modeCalcul === "ml"
                        ? ` (ml : ${(state.poteauxSupp * (state.hauteurPoteaux/1000)).toFixed(2)}ml × ${formatEUR(t.surchargeHT)}/ml)`
                        : "";
                      return (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Surcharge {labels.toituresLabel.toLowerCase()}{detail}</span>
                          <span className="font-mono text-[hsl(40_80%_45%)]">+{formatEUR(resultat.surchargeToitureHT)}</span>
                        </div>
                      );
                    })()}
                    {resultat.surchargeCouleurHT>0 && (() => {
                      const c = modele.couleurs.find(x => x.id === state.couleurId);
                      const detail = c?.modeCalcul === "m2"
                        ? ` (m² : ${((state.largeur/1000)*(state.profondeur/1000)).toFixed(2)}m² × ${formatEUR(c.surchargeHT)}/m²)`
                        : c?.modeCalcul === "ml"
                        ? ` (ml : ${(state.poteauxSupp * (state.hauteurPoteaux/1000)).toFixed(2)}ml × ${formatEUR(c.surchargeHT)}/ml)`
                        : "";
                      return (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Surcharge couleur{detail}</span>
                          <span className="font-mono text-[hsl(40_80%_45%)]">+{formatEUR(resultat.surchargeCouleurHT)}</span>
                        </div>
                      );
                    })()}
                    {labels.showPoteaux && resultat.surchargePoteauxAchatHT !== undefined && resultat.surchargePoteauxAchatHT > 0 && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Surcharge poteaux (32€/ml HT)</span>
                        <span className="font-mono text-[hsl(40_80%_45%)]">+{formatEUR(resultat.surchargePoteauxAchatHT)}</span>
                      </div>
                    )}
                    {resultat.surchargeOptionsSuppHT !== undefined && resultat.surchargeOptionsSuppHT > 0 && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Options supplémentaires</span>
                        <span className="font-mono text-[hsl(40_80%_45%)]">+{formatEUR(resultat.surchargeOptionsSuppHT)}</span>
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
                    {labels.showPoteaux && (
                      <>
                        {modele.reglesPoteau.length>0 && (
                          <div className="flex justify-between text-[11px]">
                            <span className="text-muted-foreground">Poteaux structurels</span>
                            <span className="font-mono font-semibold">{resultat.nombrePoteaux} poteaux</span>
                          </div>
                        )}
                        {state.poteauxSupp>0 && (
                          <div className="flex justify-between text-[11px]">
                            <span className="text-muted-foreground font-semibold text-accent">Poteaux supplémentaires</span>
                            <span className="font-mono font-semibold text-accent">+{state.poteauxSupp} poteaux {isOrisSolid ? `(h: ${formatMM(state.longueurPoteauxSupp)})` : ""}</span>
                          </div>
                        )}
                        {isOrisSolid && (
                          <div className="flex justify-between text-[11px]">
                            <span className="text-muted-foreground">Section poteaux</span>
                            <span className="font-mono">136×136 mm</span>
                          </div>
                        )}
                        {state.hauteurPoteaux!==2500 && (
                          <div className="flex justify-between text-[11px]">
                            <span className="text-muted-foreground">Hauteur configurée</span>
                            <span className="font-mono">{formatMM(state.hauteurPoteaux)}</span>
                          </div>
                        )}
                      </>
                    )}
                    {state.optionsSuppIds && state.optionsSuppIds.length > 0 && (
                      <div className="flex justify-between text-[11px]">
                        <span className="text-muted-foreground font-semibold text-accent">Options supplémentaires</span>
                        <span className="font-mono font-semibold text-accent text-right max-w-[240px] truncate" title={
                          (state.optionsSuppIds || [])
                            .map((id) => modele.optionsSupp?.find((o) => o.id === id)?.nom)
                            .filter(Boolean)
                            .join(", ")
                        }>
                          {(state.optionsSuppIds || [])
                            .map((id) => modele.optionsSupp?.find((o) => o.id === id)?.nom)
                            .filter(Boolean)
                            .join(", ")}
                        </span>
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
                      {modele.nom}
                    </div>
                    <div className="text-muted-foreground whitespace-pre-line leading-relaxed">
                      {(() => {
                        const t = modele.toitures.find((x)=>x.id===state.toitureId);
                        const c = modele.couleurs.find((x)=>x.id===state.couleurId);
                        const optsSupp = (state.optionsSuppIds || [])
                          .map((id) => modele.optionsSupp?.find((o) => o.id === id)?.nom)
                          .filter(Boolean) as string[];
                        return genererDescription(modele.templateDescription, {
                          nom: modele.nom,
                          largeurMm: state.largeur,
                          profondeurMm: state.profondeur,
                          toiture: t?.nom || "—",
                          couleur: c?.nom || "—",
                          poteaux: resultat.nombrePoteaux,
                          typeDim: modele.typeDim,
                          hauteurPoteauxMm: state.hauteurPoteaux,
                          poteauxSupp: state.poteauxSupp,
                          longueurPoteauxSuppMm: state.longueurPoteauxSupp,
                          sectionPoteaux: modele.sectionPoteaux,
                          moteur: state.moteur,
                          optionsSupp: optsSupp,
                        });
                      })()}
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          )}

          {/* Étape 2 — Configuration (uniquement pour coulissant) */}
          {step === 2 && modele && modele.typeModele === "coulissant" && (() => {
            const mc = modele as ModeleCoulissant;
            const buttons = [];
            for (let v = mc.vantauxMin; v <= mc.vantauxMax; v++) {
              buttons.push(
                <button
                  key={v}
                  type="button"
                  onClick={() => setState({ ...state, vantaux: v })}
                  className={`px-4 py-2 text-sm font-semibold rounded border transition-all ${
                    state.vantaux === v
                      ? "bg-accent text-accent-foreground border-accent shadow-sm"
                      : "border-border text-muted-foreground hover:border-accent/40"
                  }`}
                >
                  {v} vantaux
                </button>
              );
            }

            return (
              <div className="space-y-6">
                <div>
                  <label className="text-[11px] uppercase tracking-wide font-semibold text-muted-foreground mb-2 block">
                    Nombre de vantaux
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {buttons}
                  </div>
                </div>

                <div>
                  <label className="text-[11px] uppercase tracking-wide font-semibold text-muted-foreground mb-2 block">
                    Type de verre
                  </label>
                  <div className="space-y-2">
                    {mc.tarifsPanneau.map((t) => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => setState({ ...state, tarifPanneauId: t.id })}
                        className={`w-full text-left px-4 py-3 rounded-lg border transition-all ${
                          state.tarifPanneauId === t.id
                            ? "border-accent bg-accent/5 shadow-sm"
                            : "border-border hover:border-accent/40 hover:bg-muted/30"
                        }`}
                      >
                        <div className="flex justify-between items-center mb-1">
                          <span className="font-semibold text-sm">{t.label}</span>
                          <span className="font-mono text-accent text-xs font-bold">{t.prixHT} € / panneau</span>
                        </div>
                        {t.description && (
                          <p className="text-xs text-muted-foreground leading-relaxed">{t.description}</p>
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Dimensions du verre (Abaque) */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 rounded-lg bg-muted/20 border border-border">
                  <div>
                    <label className="text-[11px] uppercase tracking-wide font-semibold text-muted-foreground mb-2 block">
                      Largeur du panneau de verre
                    </label>
                    <div className="flex gap-2">
                      {[82, 90, 98, 103].map((w) => {
                        const hVal = state.hauteurVerre || 200;
                        const abacForH = ABAQUE_COULISSANT.find((a) => a.hauteurVerre === hVal);
                        const isAllowed = abacForH ? abacForH.largeursPermises.includes(w) : true;
                        const isSelected = state.largeurVerre === w;
                        return (
                          <button
                            key={w}
                            type="button"
                            onClick={() => {
                              let nextH = state.hauteurVerre || 200;
                              const abacForNewW = ABAQUE_COULISSANT.find((a) => a.hauteurVerre === nextH);
                              if (abacForNewW && !abacForNewW.largeursPermises.includes(w)) {
                                nextH = 200; // Fallback
                              }
                              setState({ ...state, largeurVerre: w, hauteurVerre: nextH });
                            }}
                            className={`flex-1 py-2 text-xs font-semibold rounded border transition-all text-center ${
                              isSelected
                                ? "bg-accent text-accent-foreground border-accent shadow-sm"
                                : isAllowed
                                ? "border-border text-muted-foreground hover:border-accent/40 bg-card"
                                : "border-border/30 text-muted-foreground/30 bg-muted/10 cursor-not-allowed"
                            }`}
                            title={!isAllowed ? "Non disponible pour la hauteur sélectionnée" : ""}
                          >
                            {w} cm
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] uppercase tracking-wide font-semibold text-muted-foreground mb-2 block">
                      Hauteur du panneau (et Encastrement)
                    </label>
                    <select
                      value={state.hauteurVerre || 200}
                      onChange={(e) => {
                        const hVal = parseInt(e.target.value) || 200;
                        let nextW = state.largeurVerre || 90;
                        const abacForNewH = ABAQUE_COULISSANT.find((a) => a.hauteurVerre === hVal);
                        if (abacForNewH && !abacForNewH.largeursPermises.includes(nextW)) {
                          nextW = 90; // Fallback
                        }
                        setState({ ...state, hauteurVerre: hVal, largeurVerre: nextW });
                      }}
                      className="form-input w-full font-body text-sm"
                    >
                      {ABAQUE_COULISSANT.map((abaque) => {
                        const wVal = state.largeurVerre || 90;
                        const isAllowed = abaque.largeursPermises.includes(wVal);
                        if (!isAllowed) return null; // Filtre les hauteurs autorisées pour la largeur courante
                        return (
                          <option key={abaque.hauteurVerre} value={abaque.hauteurVerre}>
                            {abaque.hauteurVerre} cm (Encastrement : {abaque.encastrementMin} - {abaque.encastrementMax} cm)
                          </option>
                        );
                      })}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="text-[11px] uppercase tracking-wide font-semibold text-muted-foreground mb-2 block">
                      Couleur structure
                    </label>
                    <div className="space-y-1.5 max-h-[180px] overflow-y-auto pr-1">
                      {(mc.couleurs || []).map((c) => (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => setState({ ...state, couleurId: c.id })}
                          className={`w-full text-left px-3 py-2 rounded border transition-all text-[13px] ${
                            state.couleurId === c.id
                              ? "border-accent bg-accent/5 font-semibold text-accent"
                              : "border-border hover:border-accent/40 bg-card"
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span>{c.nom}</span>
                            <span className="text-[11px] text-muted-foreground font-mono">
                              {c.surchargeHT > 0 && `+${formatEUR(c.surchargeHT)}`}
                              {c.surchargePct > 0 && `+${c.surchargePct}%`}
                              {c.surchargeHT === 0 && c.surchargePct === 0 && "standard"}
                            </span>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="text-[11px] uppercase tracking-wide font-semibold text-muted-foreground mb-2 block">
                      Options
                    </label>
                    <div className="grid grid-cols-1 gap-2">
                      {mc.options.map((opt) => {
                        const selected = (state.optionsCoulissantIds || []).includes(opt.id);
                        return (
                          <label
                            key={opt.id}
                            className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-all text-sm ${
                              selected
                                ? "border-accent bg-accent/5 font-medium text-accent"
                                : "border-border hover:border-accent/40"
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <input
                                type="checkbox"
                                checked={selected}
                                onChange={(e) => {
                                  const current = state.optionsCoulissantIds || [];
                                  const next = e.target.checked
                                    ? [...current, opt.id]
                                    : current.filter((id) => id !== opt.id);
                                  setState({ ...state, optionsCoulissantIds: next });
                                }}
                                className="rounded border-gray-300 text-accent focus:ring-accent"
                              />
                              <span>{opt.nom}</span>
                            </div>
                            <span className="text-xs text-muted-foreground font-mono font-bold">
                              {opt.surchargeHT > 0 && `+${formatEUR(opt.surchargeHT)}`}
                              {opt.surchargePct > 0 && `+${opt.surchargePct}%`}
                              {opt.surchargeHT === 0 && opt.surchargePct === 0 && "inclus"}
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* Étape 2 — Configuration (uniquement pour paroi fixe) */}
          {step === 2 && modele && modele.typeModele === "paroi_fixe" && (() => {
            const mf = modele as ModeleParoiFixe;
            const isVerre = state.typeParoi?.toLowerCase().includes("verre");
            
            let warningMsg = "";
            if (state.typeParoi?.includes("12 lattes") && (state.largeurParoi || 0) > 96) {
              warningMsg = "⚠️ Largeur maximale avec profil F : 96 cm (pour des lattes de 16 cm)";
            } else if (state.typeParoi?.includes("10 lattes") && (state.largeurParoi || 0) > 100) {
              warningMsg = "⚠️ Largeur maximale avec profil F : 100 cm (pour des lattes de 20 cm)";
            }

            return (
              <div className="space-y-6">
                <div>
                  <label className="text-[11px] uppercase tracking-wide font-semibold text-muted-foreground mb-2 block">
                    Type de paroi
                  </label>
                  <select
                    value={state.typeParoi || ""}
                    onChange={(e) => {
                      const selectedType = e.target.value;
                      let defaultH = state.hauteurParoi || 192;
                      if (selectedType.includes("12 lattes")) {
                        defaultH = 192;
                      } else if (selectedType.includes("10 lattes")) {
                        defaultH = 200;
                      } else if (selectedType.includes("Verre fixe rectangle") && defaultH < 100) {
                        defaultH = 220;
                      }
                      setState({ ...state, typeParoi: selectedType, hauteurParoi: defaultH });
                    }}
                    className="form-input w-full font-body text-sm"
                  >
                    <option value="Aluminium 12 lattes (192 cm de haut)">Aluminium 12 lattes (192 cm de haut)</option>
                    <option value="Aluminium 10 lattes (200 cm de haut)">Aluminium 10 lattes (200 cm de haut)</option>
                    <option value="Verre fixe rectangle">Verre fixe rectangle</option>
                    <option value="Verre fixe incliné">Verre fixe incliné</option>
                    <option value="Polycarbonate">Polycarbonate</option>
                  </select>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="text-[11px] uppercase tracking-wide font-semibold text-muted-foreground mb-2 block">
                      Largeur (cm)
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={state.largeurParoi || ""}
                      onChange={(e) => setState({ ...state, largeurParoi: parseFloat(e.target.value) || 0 })}
                      className="form-input w-full font-mono text-sm"
                      placeholder="Saisir la largeur en cm"
                    />
                    {warningMsg && (
                      <p className="text-xs text-destructive mt-1.5 font-medium">{warningMsg}</p>
                    )}
                    <div className="mt-2 text-[10px] text-muted-foreground">
                      Valeurs de référence : 100, 150, 200, 250, 300, 350, 400, 450, 500 cm
                    </div>
                  </div>

                  {isVerre && (
                    <div>
                      <label className="text-[11px] uppercase tracking-wide font-semibold text-muted-foreground mb-2 block">
                        Hauteur (cm)
                      </label>
                      <input
                        type="number"
                        min={0}
                        value={state.hauteurParoi || ""}
                        onChange={(e) => setState({ ...state, hauteurParoi: parseFloat(e.target.value) || 0 })}
                        className="form-input w-full font-mono text-sm"
                        placeholder="Saisir la hauteur en cm"
                      />
                      <p className="text-[10px] text-muted-foreground mt-1.5 italic">
                        {state.typeParoi === "Verre fixe rectangle"
                          ? "Supplément de 150 € si hauteur > 220 cm"
                          : "Supplément de 150 € si hauteur > 275 cm"}
                      </p>
                    </div>
                  )}
                </div>

                <div>
                  <label className="text-[11px] uppercase tracking-wide font-semibold text-muted-foreground mb-2 block">
                    Couleur structure
                  </label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-[180px] overflow-y-auto pr-1">
                    {(mf.couleurs || []).map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => setState({ ...state, couleurId: c.id })}
                        className={`w-full text-left px-3 py-2 rounded border transition-all text-[13px] ${
                          state.couleurId === c.id
                            ? "border-accent bg-accent/5 font-semibold text-accent"
                            : "border-border hover:border-accent/40 bg-card"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span>{c.nom}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="p-4 rounded-lg bg-accent/5 border border-accent/25">
                  <label className="text-[11px] uppercase tracking-wide font-semibold text-accent mb-2 block">
                    Prix d'achat HT catalogue (€)
                  </label>
                  <input
                    type="number"
                    min={0}
                    step={0.01}
                    value={state.prixAchatBaseHT || ""}
                    onChange={(e) => setState({ ...state, prixAchatBaseHT: parseFloat(e.target.value) || 0 })}
                    className="form-input w-full font-mono text-sm"
                    placeholder="Saisir le prix d'achat HT de base"
                  />
                  <p className="text-[11px] text-muted-foreground mt-1.5">
                    Source : MB Aluminium — Prix MB Partners HT (TVA non incluse).
                  </p>
                </div>
              </div>
            );
          })()}

          {/* Étape 2 — Configuration (uniquement pour paroi avec grille) */}
          {step === 2 && modele && modele.typeModele === "paroi_avec_grille" && (() => {
            const mg = modele as ModeleParoiGrille;
            const isVerre = state.typeParoi?.toLowerCase().includes("verre");

            let warningMsg = "";
            if (state.typeParoi?.includes("12 lattes") && (state.largeurParoi || 0) > 96) {
              warningMsg = "⚠️ Largeur maximale avec profil F : 96 cm (pour des lattes de 16 cm)";
            } else if (state.typeParoi?.includes("10 lattes") && (state.largeurParoi || 0) > 100) {
              warningMsg = "⚠️ Largeur maximale avec profil F : 100 cm (pour des lattes de 20 cm)";
            }

            return (
              <div className="space-y-6">
                <div>
                  <label className="text-[11px] uppercase tracking-wide font-semibold text-muted-foreground mb-2 block">
                    Type de paroi
                  </label>
                  <select
                    value={state.typeParoiId || ""}
                    onChange={(e) => {
                      const selectedId = e.target.value;
                      const tp = mg.typesParoi.find((t) => t.id === selectedId);
                      if (tp) {
                        let defaultH = state.hauteurParoi || 192;
                        if (tp.nom.includes("12 lattes")) {
                          defaultH = 192;
                        } else if (tp.nom.includes("10 lattes")) {
                          defaultH = 200;
                        } else if (tp.nom.toLowerCase().includes("verre fixe rectangle") && defaultH < 100) {
                          defaultH = 220;
                        }
                        setState({ ...state, typeParoiId: selectedId, typeParoi: tp.nom, hauteurParoi: defaultH });
                      }
                    }}
                    className="form-input w-full font-body text-sm"
                  >
                    {(mg.typesParoi || []).map((tp) => (
                      <option key={tp.id} value={tp.id}>
                        {tp.nom}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="text-[11px] uppercase tracking-wide font-semibold text-muted-foreground mb-2 block">
                      Largeur (cm)
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={state.largeurParoi || ""}
                      onChange={(e) => setState({ ...state, largeurParoi: parseFloat(e.target.value) || 0 })}
                      className="form-input w-full font-mono text-sm"
                      placeholder="Saisir la largeur en cm"
                    />
                    {warningMsg && (
                      <p className="text-xs text-destructive mt-1.5 font-medium">{warningMsg}</p>
                    )}
                    <div className="mt-2 text-[10px] text-muted-foreground">
                      Valeurs de référence : {(mg.typesParoi[0]?.largeurs || []).map((l) => `${Math.round(l / 10)}`).join(", ")} cm
                    </div>
                  </div>

                  {isVerre && (
                    <div>
                      <label className="text-[11px] uppercase tracking-wide font-semibold text-muted-foreground mb-2 block">
                        Hauteur (cm)
                      </label>
                      <input
                        type="number"
                        min={0}
                        value={state.hauteurParoi || ""}
                        onChange={(e) => setState({ ...state, hauteurParoi: parseFloat(e.target.value) || 0 })}
                        className="form-input w-full font-mono text-sm"
                        placeholder="Saisir la hauteur en cm"
                      />
                      <p className="text-[10px] text-muted-foreground mt-1.5 italic">
                        {state.typeParoi === "Verre fixe rectangle"
                          ? "Supplément de 150 € si hauteur > 220 cm"
                          : "Supplément de 150 € si hauteur > 275 cm"}
                      </p>
                    </div>
                  )}
                </div>

                <div>
                  <label className="text-[11px] uppercase tracking-wide font-semibold text-muted-foreground mb-2 block">
                    Couleur structure
                  </label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-[180px] overflow-y-auto pr-1">
                    {(mg.couleurs || []).map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => setState({ ...state, couleurId: c.id })}
                        className={`w-full text-left px-3 py-2 rounded border transition-all text-[13px] ${
                          state.couleurId === c.id
                            ? "border-accent bg-accent/5 font-semibold text-accent"
                            : "border-border hover:border-accent/40 bg-card"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span>{c.nom}</span>
                          <span className="text-[11px] text-muted-foreground font-mono">
                            {c.surchargeHT > 0 && `+${formatEUR(c.surchargeHT)}`}
                            {c.surchargePct > 0 && `+${c.surchargePct}%`}
                            {c.surchargeHT === 0 && c.surchargePct === 0 && "standard"}
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {resultatParoiGrille && (
                  <div className="p-4 rounded-lg bg-accent/5 border border-accent/25">
                    <div className="flex justify-between items-center text-sm">
                      <span className="font-semibold text-accent">Prix d'achat HT base (grille) :</span>
                      <span className="font-mono font-bold text-accent">{formatEUR(resultatParoiGrille.prixAchatBaseHT)}</span>
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-1">
                      Calculé pour une largeur grille de {(resultatParoiGrille.largeurGrille / 10).toFixed(0)} cm (arrondi supérieur).
                    </p>
                  </div>
                )}
              </div>
            );
          })()}

          {/* Étape 3 — Prix (uniquement pour coulissant) */}
          {step === 3 && modele && modele.typeModele === "coulissant" && resultatCoulissant && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-semibold text-[14px] mb-4">Détail du chiffrage</h3>
                <div className="bg-muted/30 border border-border rounded-lg p-4 space-y-2.5 text-[13px]">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Panneaux (Base d'achat)</span>
                    <span className="font-mono">
                      {state.vantaux} × {resultatCoulissant.prixPanneau}€ = <span className="font-semibold">{formatEUR(resultatCoulissant.prixAchatBaseHT)}</span>
                    </span>
                  </div>
                  {resultatCoulissant.surchargesHT > 0 && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Surcharges options</span>
                      <span className="font-mono text-[hsl(40_80%_45%)] font-semibold">+{formatEUR(resultatCoulissant.surchargesHT)}</span>
                    </div>
                  )}
                  {resultatCoulissant.surchargeCouleurHT && resultatCoulissant.surchargeCouleurHT > 0 ? (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Surcharge couleur</span>
                      <span className="font-mono text-[hsl(40_80%_45%)] font-semibold">+{formatEUR(resultatCoulissant.surchargeCouleurHT)}</span>
                    </div>
                  ) : null}
                  <div className="flex justify-between border-t border-border pt-2 font-medium">
                    <span className="text-muted-foreground">Prix achat total HT</span>
                    <span className="font-mono font-semibold">{formatEUR(resultatCoulissant.prixAchatTotalHT)}</span>
                  </div>
                  <div className="flex justify-between text-[11px] text-muted-foreground">
                    <span>Marge appliquée</span>
                    <span className="font-mono">{formatCoef(resultatCoulissant.coefficient)}</span>
                  </div>
                </div>

                <div className="mt-4">
                  <label className="form-label">Coefficient de marge — {formatCoef(state.coefficient)}</label>
                  <input
                    type="number"
                    min={1}
                    max={5}
                    step={0.05}
                    value={state.coefficient}
                    onChange={(e) => setState({ ...state, coefficient: parseFloat(e.target.value) || 1.0 })}
                    className="form-input w-40 font-mono"
                  />
                </div>
              </div>

              <div className="flex flex-col justify-between">
                <div>
                  <h3 className="font-semibold text-[14px] mb-4">Prix de vente final</h3>
                  <div className="bg-accent/10 border border-accent/30 rounded-lg px-5 py-4 flex flex-col items-center justify-center text-center">
                    <span className="text-xs text-muted-foreground font-medium mb-1 uppercase tracking-wider">Prix de vente HT conseillé</span>
                    <span className="font-display text-3xl font-bold text-accent font-mono">{formatEUR(resultatCoulissant.prixVenteHT)}</span>
                    <span className="text-[10px] text-muted-foreground mt-1.5 italic">
                      (achat : {formatEUR(resultatCoulissant.prixAchatTotalHT)} × marge {state.coefficient.toFixed(2)})
                    </span>
                  </div>
                </div>

                {/* Preview de la désignation et de la description */}
                <div className="bg-muted/20 border border-border rounded p-3 text-[11px] mt-4">
                  <div className="font-semibold text-foreground text-[12px] mb-1">
                    {modele.nom.toLowerCase().includes("paroi") || modele.nom.toLowerCase().includes("couliss") ? "" : "Parois coulissantes "}
                    {modele.nom} — {state.vantaux} vantaux
                  </div>
                  <div className="text-muted-foreground whitespace-pre-line leading-relaxed max-h-[120px] overflow-y-auto pr-1">
                    {(() => {
                      const mc = modele as ModeleCoulissant;
                      const tarif = mc.tarifsPanneau.find(t => t.id === state.tarifPanneauId);
                      const opts = mc.options
                        .filter(o => (state.optionsCoulissantIds || []).includes(o.id))
                        .map(o => o.nom);
                      return genererDescriptionCoulissant(mc, {
                        vantaux: state.vantaux || 3,
                        tarifPanneau: tarif?.label || "—",
                        couleur: state.couleurCoulissant || "—",
                        options: opts,
                      });
                    })()}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Étape 3 — Prix (uniquement pour paroi fixe) */}
          {step === 3 && modele && modele.typeModele === "paroi_fixe" && resultatParoiFixe && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-semibold text-[14px] mb-4">Détail du chiffrage</h3>
                <div className="bg-muted/30 border border-border rounded-lg p-4 space-y-2.5 text-[13px]">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Type de paroi</span>
                    <span className="font-semibold">{state.typeParoi}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Prix d'achat de base HT</span>
                    <span className="font-mono">{formatEUR(resultatParoiFixe.prixAchatBaseHT)}</span>
                  </div>
                  {resultatParoiFixe.surchargeHauteurHT > 0 && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground text-destructive">Surcharge hauteur verre (+150€)</span>
                      <span className="font-mono text-destructive font-semibold">+{formatEUR(resultatParoiFixe.surchargeHauteurHT)}</span>
                    </div>
                  )}
                  <div className="flex justify-between border-t border-border pt-2 font-medium">
                    <span className="text-muted-foreground">Prix achat total HT</span>
                    <span className="font-mono font-semibold">{formatEUR(resultatParoiFixe.prixAchatTotalHT)}</span>
                  </div>
                  <div className="flex justify-between text-[11px] text-muted-foreground">
                    <span>Marge appliquée</span>
                    <span className="font-mono">{formatCoef(resultatParoiFixe.coefficient)}</span>
                  </div>
                </div>

                <div className="mt-4">
                  <label className="form-label">Coefficient de marge — {formatCoef(state.coefficient)}</label>
                  <input
                    type="number"
                    min={1}
                    max={5}
                    step={0.05}
                    value={state.coefficient}
                    onChange={(e) => setState({ ...state, coefficient: parseFloat(e.target.value) || 1.0 })}
                    className="form-input w-40 font-mono"
                  />
                </div>
              </div>

              <div className="flex flex-col justify-between">
                <div>
                  <h3 className="font-semibold text-[14px] mb-4">Prix de vente final</h3>
                  <div className="bg-accent/10 border border-accent/30 rounded-lg px-5 py-4 flex flex-col items-center justify-center text-center">
                    <span className="text-xs text-muted-foreground font-medium mb-1 uppercase tracking-wider">Prix de vente HT conseillé</span>
                    <span className="font-display text-3xl font-bold text-accent font-mono">{formatEUR(resultatParoiFixe.prixVenteHT)}</span>
                    <span className="text-[10px] text-muted-foreground mt-1.5 italic">
                      (achat : {formatEUR(resultatParoiFixe.prixAchatTotalHT)} × marge {state.coefficient.toFixed(2)})
                    </span>
                  </div>
                </div>

                {/* Preview de la désignation et de la description */}
                <div className="bg-muted/20 border border-border rounded p-3 text-[11px] mt-4">
                  <div className="font-semibold text-foreground text-[12px] mb-1">
                    {state.typeParoi} — {state.largeurParoi} cm
                  </div>
                  <div className="text-muted-foreground whitespace-pre-line leading-relaxed max-h-[120px] overflow-y-auto pr-1">
                    {(() => {
                      const mf = modele as ModeleParoiFixe;
                      const couleurOpt = mf.couleurs?.find(c => c.id === state.couleurId);
                      const couleurNom = couleurOpt ? couleurOpt.nom : "—";
                      
                      let warningNotes = "";
                      if (state.typeParoi?.includes("12 lattes") && (state.largeurParoi || 0) > 96) {
                        warningNotes = "Note : Largeur supérieure à 96 cm avec profil F (lattes de 16 cm)";
                      } else if (state.typeParoi?.includes("10 lattes") && (state.largeurParoi || 0) > 100) {
                        warningNotes = "Note : Largeur supérieure à 100 cm avec profil F (lattes de 20 cm)";
                      }

                      return genererDescriptionParoiFixe(mf, {
                        typeParoi: state.typeParoi || "—",
                        largeur: state.largeurParoi || 0,
                        hauteur: state.hauteurParoi || 0,
                        couleur: couleurNom,
                        notes: warningNotes,
                      });
                    })()}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Étape 3 — Prix (uniquement pour paroi avec grille) */}
          {step === 3 && modele && modele.typeModele === "paroi_avec_grille" && resultatParoiGrille && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-semibold text-[14px] mb-4">Détail du chiffrage</h3>
                <div className="bg-muted/30 border border-border rounded-lg p-4 space-y-2.5 text-[13px]">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Type de paroi</span>
                    <span className="font-semibold">{state.typeParoi}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Prix d'achat de base HT</span>
                    <span className="font-mono">{formatEUR(resultatParoiGrille.prixAchatBaseHT)}</span>
                  </div>
                  {resultatParoiGrille.surchargeCouleurHT > 0 && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground text-accent">Surcharge couleur</span>
                      <span className="font-mono text-accent font-semibold">+{formatEUR(resultatParoiGrille.surchargeCouleurHT)}</span>
                    </div>
                  )}
                  {resultatParoiGrille.surchargeHauteurHT > 0 && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground text-destructive">Surcharge hauteur verre (+150€)</span>
                      <span className="font-mono text-destructive font-semibold">+{formatEUR(resultatParoiGrille.surchargeHauteurHT)}</span>
                    </div>
                  )}
                  <div className="flex justify-between border-t border-border pt-2 font-medium">
                    <span className="text-muted-foreground">Prix achat total HT</span>
                    <span className="font-mono font-semibold">{formatEUR(resultatParoiGrille.prixAchatTotalHT)}</span>
                  </div>
                  <div className="flex justify-between text-[11px] text-muted-foreground">
                    <span>Marge appliquée</span>
                    <span className="font-mono">{formatCoef(resultatParoiGrille.coefficient)}</span>
                  </div>
                </div>

                <div className="mt-4">
                  <label className="form-label">Coefficient de marge — {formatCoef(state.coefficient)}</label>
                  <input
                    type="number"
                    min={1}
                    max={5}
                    step={0.05}
                    value={state.coefficient}
                    onChange={(e) => setState({ ...state, coefficient: parseFloat(e.target.value) || 1.0 })}
                    className="form-input w-40 font-mono"
                  />
                </div>
              </div>

              <div className="flex flex-col justify-between">
                <div>
                  <h3 className="font-semibold text-[14px] mb-4">Prix de vente final</h3>
                  <div className="bg-accent/10 border border-accent/30 rounded-lg px-5 py-4 flex flex-col items-center justify-center text-center">
                    <span className="text-xs text-muted-foreground font-medium mb-1 uppercase tracking-wider">Prix de vente HT conseillé</span>
                    <span className="font-display text-3xl font-bold text-accent font-mono">{formatEUR(resultatParoiGrille.prixVenteHT)}</span>
                    <span className="text-[10px] text-muted-foreground mt-1.5 italic">
                      (achat : {formatEUR(resultatParoiGrille.prixAchatTotalHT)} × marge {state.coefficient.toFixed(2)})
                    </span>
                  </div>
                </div>

                {/* Preview de la désignation et de la description */}
                <div className="bg-muted/20 border border-border rounded p-3 text-[11px] mt-4">
                  <div className="font-semibold text-foreground text-[12px] mb-1">
                    {state.typeParoi} — {state.largeurParoi} cm
                  </div>
                  <div className="text-muted-foreground whitespace-pre-line leading-relaxed max-h-[120px] overflow-y-auto pr-1">
                    {(() => {
                      const mg = modele as ModeleParoiGrille;
                      const couleurOpt = mg.couleurs?.find(c => c.id === state.couleurId);
                      const couleurNom = couleurOpt ? couleurOpt.nom : "—";
                      
                      let warningNotes = "";
                      if (state.typeParoi?.includes("12 lattes") && (state.largeurParoi || 0) > 96) {
                        warningNotes = "Note : Largeur supérieure à 96 cm avec profil F (lattes de 16 cm)";
                      } else if (state.typeParoi?.includes("10 lattes") && (state.largeurParoi || 0) > 100) {
                        warningNotes = "Note : Largeur supérieure à 100 cm avec profil F (lattes de 20 cm)";
                      }

                      return genererDescriptionParoiGrille(mg, {
                        typeParoi: state.typeParoi || "—",
                        largeur: state.largeurParoi || 0,
                        hauteur: state.hauteurParoi,
                        couleur: couleurNom,
                        notes: warningNotes,
                      });
                    })()}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-border bg-muted/10">
          <button onClick={()=>step>1?setStep((step-1) as WizardStep):onClose()} className="btn-ghost border border-border flex items-center gap-1.5 text-[13px]">
            <ArrowLeft size={14}/> {step===1?"Annuler":"Retour"}
          </button>
          {step < (modele?.typeModele === "coulissant" || modele?.typeModele === "paroi_fixe" || modele?.typeModele === "paroi_avec_grille" ? 3 : 4) ? (
            <button onClick={()=>setStep((step+1) as WizardStep)} disabled={!canNext()}
              className="btn-gold flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed">
              Suivant <ArrowRight size={14}/>
            </button>
          ) : (
            <button onClick={handleApply} disabled={modele?.typeModele === "coulissant" ? !resultatCoulissant : modele?.typeModele === "paroi_fixe" ? !resultatParoiFixe : modele?.typeModele === "paroi_avec_grille" ? !resultatParoiGrille : (!resultat||!!calcError)}
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
  onUpdate, onRemove, onAddOption, onRemoveOption, onUpdateOption, onApplyTvaToAll,
  onMoveUp, onMoveDown
}: {
  line: QuoteLine; li: number; totalLines: number; allProductSuggestions: string[]; TVA_RATES: number[];
  onUpdate: (patch: Partial<QuoteLine>) => void; onRemove: () => void; onAddOption: () => void;
  onRemoveOption: (optId: string) => void; onUpdateOption: (optId: string, patch: Partial<QuoteOption>) => void;
  onApplyTvaToAll: (tva: number) => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
}) {
  const [showWizard, setShowWizard] = useState(false);

  const handleWizardApply = (
    data: { designation: string; description: string; prixVenteHT: number; prixAchatHT: number; image?: string },
    wizardState: any
  ) => {
    onUpdate({
      designation: data.designation,
      description: data.description,
      prixUnitaireHT: data.prixVenteHT,
      prixOriginalHT: data.prixVenteHT,
      prixAchatHT: data.prixAchatHT,
      categorie: "Pergola bioclimatique",
      image: data.image,
      configuratorState: wizardState
    });
    setShowWizard(false);
  };

  return (
    <>
      <div className="mb-6 last:mb-0 page-break-avoid">
        <div className="flex items-start justify-between mb-3">
          <span className="form-label !mb-0">Ligne {li+1}</span>
          <div className="flex items-center gap-1.5">
            <div className="flex items-center gap-0.5 border border-border/60 rounded p-0.5 bg-muted/20">
              <button
                type="button"
                onClick={onMoveUp}
                disabled={li === 0}
                className="p-1 text-muted-foreground hover:text-accent hover:bg-accent/5 disabled:opacity-30 disabled:pointer-events-none transition-colors rounded"
                title="Monter la ligne (devenir ligne précédente)"
              >
                <ChevronUp size={14}/>
              </button>
              <button
                type="button"
                onClick={onMoveDown}
                disabled={li === totalLines - 1}
                className="p-1 text-muted-foreground hover:text-accent hover:bg-accent/5 disabled:opacity-30 disabled:pointer-events-none transition-colors rounded"
                title="Descendre la ligne (devenir ligne suivante)"
              >
                <ChevronDown size={14}/>
              </button>
            </div>
            <button type="button" onClick={()=>setShowWizard(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium rounded border border-accent/50 text-accent hover:bg-accent/5 transition-colors"
              title="Ouvrir le configurateur">
              <Wrench size={13}/> Configurateur
            </button>
            <button type="button" onClick={onRemove} className="p-1.5 text-destructive hover:bg-destructive/10 transition-colors rounded" title="Supprimer la ligne"><Trash2 size={14}/></button>
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
            <label className="form-label">
              {line.unite && line.unite !== "unité" ? `Qté (${line.unite})` : "Qté"}
            </label>
            <input
              type="number"
              min={line.unite && ["ml", "m²", "m³"].includes(line.unite) ? 0.01 : 1}
              step={line.unite && ["ml", "m²", "m³"].includes(line.unite) ? "0.01" : "1"}
              value={line.quantite}
              onChange={(e) => onUpdate({ quantite: Number(e.target.value) || 1 })}
              className="form-input text-center font-mono"
            />
          </div>
          <div className="md:col-span-2">
            <label className="form-label">Prix U. HT (€)</label>
            <input type="number" min={0} step={0.01} value={line.prixUnitaireHT||""} onChange={(e)=>{
              const val = Number(e.target.value)||0;
              onUpdate({ prixUnitaireHT: val, prixOriginalHT: val });
            }} className="form-input font-mono"/>
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
              <span className="text-muted-foreground uppercase font-medium">Unité</span>
              <select
                value={line.unite || "unité"}
                onChange={(e)=>onUpdate({unite:e.target.value})}
                className="bg-transparent border-0 text-accent font-semibold text-right focus:ring-0 p-0 text-[11px] cursor-pointer"
              >
                {["unité", "ml", "m²", "m³", "lot", "forfait"].map((u)=><option key={u} value={u}>{u}</option>)}
              </select>
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

      {showWizard && <ConfigurateurWizard initialState={line.configuratorState} onApply={handleWizardApply} onClose={()=>setShowWizard(false)}/>}
    </>
  );
}

// ── MAIN QuoteForm ─────────────────────────────────────────────────────────────

export default function QuoteForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [quote, setQuote] = useState<Quote | null>(null);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [confirmDelete, setConfirmDelete] = useState<{
    isOpen: boolean;
    message: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    message: "",
    onConfirm: () => {},
  });

  const [adjustmentPct, setAdjustmentPct] = useState<string>("");
  const [adjustmentHT, setAdjustmentHT] = useState<string>("");
  const [adjustmentTTC, setAdjustmentTTC] = useState<string>("");
  const [adjustmentMethod, setAdjustmentMethod] = useState<"proportional" | "line">("proportional");

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

  const update = (patch: Partial<Quote> | ((prev: Quote) => Partial<Quote>)) => {
    setQuote(prev => {
      if (!prev) return null;
      const resolvedPatch = typeof patch === "function" ? patch(prev) : patch;
      return { ...prev, ...resolvedPatch };
    });
  };
  const updateClient = (patch: Partial<Quote["client"]> | ((prev: Quote["client"]) => Partial<Quote["client"]>)) => {
    setQuote(prev => {
      if (!prev) return null;
      const resolvedPatch = typeof patch === "function" ? patch(prev.client) : patch;
      return { ...prev, client: { ...prev.client, ...resolvedPatch } };
    });
  };
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
          finalPatch.prixAchatHT = prod.prixAchatHT || 0;
          finalPatch.categorie = prod.categorie || "";
          finalPatch.prixUnitaireHT = prod.prixVenteHT || 0;
          finalPatch.prixOriginalHT = prod.prixVenteHT || 0;
          finalPatch.unite = prod.unite || "unité";
          break;
        }
      }
    }
    update(prev => ({
      lignes: prev.lignes.map((l) => l.id === lineId ? { ...l, ...finalPatch } : l)
    }));
  };
  const updateOption = (lineId: string, optId: string, patch: Partial<QuoteOption>) =>
    update(prev => ({
      lignes: prev.lignes.map((l) => l.id === lineId ? { ...l, options: l.options.map((o) => o.id === optId ? { ...o, ...patch } : o) } : l)
    }));
  const addLine = () => update(prev => ({ lignes: [...prev.lignes, emptyLine(defaultTva)] }));
  const removeLine = (lineId: string) => {
    setConfirmDelete({
      isOpen: true,
      message: "Voulez-vous vraiment supprimer cette ligne de devis ?",
      onConfirm: () => {
        update(prev => ({ lignes: prev.lignes.filter((l) => l.id !== lineId) }));
        toast.success("Ligne de devis supprimée");
      },
    });
  };
  const moveLineUp = (index: number) => {
    if (index <= 0) return;
    update(prev => {
      const newLignes = [...prev.lignes];
      const temp = newLignes[index];
      newLignes[index] = newLignes[index - 1];
      newLignes[index - 1] = temp;
      return { lignes: newLignes };
    });
  };
  const moveLineDown = (index: number) => {
    update(prev => {
      if (index < 0 || index >= prev.lignes.length - 1) return {};
      const newLignes = [...prev.lignes];
      const temp = newLignes[index];
      newLignes[index] = newLignes[index + 1];
      newLignes[index + 1] = temp;
      return { lignes: newLignes };
    });
  };
  const addOption = (lineId: string) => update(prev => ({
    lignes: prev.lignes.map(l => l.id === lineId ? { ...l, options: [...l.options, emptyOption(defaultTva)] } : l)
  }));
  const removeOption = (lineId: string, optId: string) => {
    setConfirmDelete({
      isOpen: true,
      message: "Voulez-vous vraiment supprimer cette option de la ligne ?",
      onConfirm: () => {
        update(prev => ({
          lignes: prev.lignes.map(l => l.id === lineId ? { ...l, options: l.options.filter(o => o.id !== optId) } : l)
        }));
        toast.success("Option supprimée");
      },
    });
  };

  const handleApplyTvaToAll = (tva: number) => {
    setDefaultTva(tva);
    update(prev => {
      const updatedLines = prev.lignes.map(l => ({
        ...l,
        tva: tva,
        options: l.options.map(o => ({ ...o, tva: tva }))
      }));
      return { lignes: updatedLines };
    });
    toast.success(`TVA ${tva}% appliquée à tout le document`);
  };

  const handleApplyAdjustment = () => {
    try {
      if (adjustmentPct === "" && adjustmentHT === "" && adjustmentTTC === "") {
        toast.error("Veuillez remplir au moins un des champs d'ajustement (%, HT ou TTC).");
        return;
      }

      update(prev => {
        const productLines = prev.lignes.filter(l => (l.categorie || "").toLowerCase() !== "pose");
        const poseLines = prev.lignes.filter(l => (l.categorie || "").toLowerCase() === "pose");
        
        if (productLines.length === 0) {
          throw new Error("Aucune ligne de produit (hors pose) n'est disponible pour appliquer une remise.");
        }

        const currentVenteProduits = productLines.reduce((acc, l) => acc + ((l.prixUnitaireHT || 0) * l.quantite), 0);
        const currentVentePose = poseLines.reduce((acc, l) => acc + ((l.prixUnitaireHT || 0) * l.quantite), 0);
        const currentQuoteTotalHT = currentVenteProduits + currentVentePose;

        const prevTotals = calcTotals(prev.lignes);
        const currentQuoteTotalTTC = prevTotals.totalTTC;
        const currentTTCProduits = productLines.reduce((acc, l) => acc + ((l.prixUnitaireHT || 0) * l.quantite * (1 + (l.tva || 0) / 100)), 0);
        const currentTTCPose = poseLines.reduce((acc, l) => acc + ((l.prixUnitaireHT || 0) * l.quantite * (1 + (l.tva || 0) / 100)), 0);

        let factor = 1;
        let diffHT = 0;

        if (adjustmentPct !== "") {
          const pct = parseFloat(adjustmentPct);
          if (isNaN(pct) || pct < 0 || pct > 100) {
            throw new Error("Veuillez saisir un pourcentage valide entre 0 et 100.");
          }
          if (adjustmentMethod === "proportional") {
            factor = 1 - pct / 100;
          } else {
            diffHT = -(currentVenteProduits * (pct / 100));
          }
        } else if (adjustmentHT !== "") {
          const targetHT = parseFloat(adjustmentHT);
          if (isNaN(targetHT) || targetHT < 0) {
            throw new Error("Veuillez saisir un montant HT valide.");
          }
          diffHT = targetHT - currentQuoteTotalHT;
          if (adjustmentMethod === "proportional") {
            if (currentVenteProduits <= 0) {
              throw new Error("Le total de vente des produits est de 0€, impossible de répartir proportionnellement.");
            }
            const targetVenteProduits = currentVenteProduits + diffHT;
            if (targetVenteProduits < 0) {
              throw new Error("Le montant ajusté des produits ne peut pas être négatif.");
            }
            factor = targetVenteProduits / currentVenteProduits;
          }
        } else if (adjustmentTTC !== "") {
          const targetTTC = parseFloat(adjustmentTTC);
          if (isNaN(targetTTC) || targetTTC < 0) {
            throw new Error("Veuillez saisir un montant TTC valide.");
          }
          if (adjustmentMethod === "proportional") {
            if (currentTTCProduits <= 0) {
              throw new Error("Le total TTC des produits est de 0€, impossible de répartir proportionnellement.");
            }
            const targetTTCProduits = targetTTC - currentTTCPose;
            if (targetTTCProduits < 0) {
              throw new Error("Le montant TTC après déduction de la pose ne peut pas être négatif.");
            }
            factor = targetTTCProduits / currentTTCProduits;
          } else {
            const diffTTC = targetTTC - currentQuoteTotalTTC;
            diffHT = diffTTC / (1 + defaultTva / 100);
          }
        }

        if (adjustmentMethod === "proportional") {
          const updatedLines = prev.lignes.map(l => {
            if ((l.categorie || "").toLowerCase() === "pose") return l;
            return {
              ...l,
              prixUnitaireHT: Math.round((l.prixUnitaireHT || 0) * factor * 100) / 100
            };
          });
          setTimeout(() => toast.success("Ajustement proportionnel appliqué aux produits !"), 50);
          return { lignes: updatedLines };
        } else {
          if (Math.abs(diffHT) < 0.01) {
            setTimeout(() => toast.info("L'ajustement est trop faible pour ajouter une ligne de remise."), 50);
            return {};
          }
          const isDiscount = diffHT < 0;
          const newLine: QuoteLine = {
            id: uid(),
            designation: isDiscount ? "Remise commerciale exceptionnelle" : "Ajustement commercial exceptionnel",
            description: isDiscount ? "Remise commerciale exceptionnelle" : "Ajustement commercial exceptionnel",
            quantite: 1,
            prixUnitaireHT: Math.round(diffHT * 100) / 100,
            tva: defaultTva,
            options: [],
            prixAchatHT: 0,
            categorie: "Remise",
            image: "",
            prixOriginalHT: Math.round(diffHT * 100) / 100
          };
          setTimeout(() => toast.success("Ligne d'ajustement commercial ajoutée avec succès !"), 50);
          return { lignes: [...prev.lignes, newLine] };
        }
      });

      setAdjustmentPct("");
      setAdjustmentHT("");
      setAdjustmentTTC("");
    } catch (error: any) {
      console.error(error);
      toast.error(error.message);
    }
  };

  const handleResetAdjustment = () => {
    update(prev => {
      const restoredLines = prev.lignes
        .filter(l => (l.categorie || "").toLowerCase() !== "remise" && !l.designation.includes("Remise exceptionnelle") && !l.designation.includes("Ajustement commercial") && !l.designation.includes("Remise commerciale"))
        .map(l => ({
          ...l,
          prixUnitaireHT: l.prixOriginalHT !== undefined ? l.prixOriginalHT : l.prixUnitaireHT
        }));
      return { lignes: restoredLines };
    });
    setAdjustmentPct("");
    setAdjustmentHT("");
    setAdjustmentTTC("");
    toast.success("Prix d'origine et totaux restaurés !");
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
              onMoveUp={()=>moveLineUp(li)}
              onMoveDown={()=>moveLineDown(li)}
            />
            {li<quote.lignes.length-1 && <hr className="mt-6 mb-6 border-border"/>}
          </div>
        ))}
        <button onClick={addLine} className="mt-5 btn-outline-gold flex items-center gap-2 text-xs"><Plus size={14}/> Ajouter une ligne</button>
      </section>

      {/* Section D1 — Remises & Ajustements (Interne) */}
      <section className="luxury-card mb-5 bg-accent/5 border-accent/25">
        <h2 className="section-title text-accent">Remises &amp; Ajustements (Interne)</h2>
        <p className="text-xs text-muted-foreground mb-4">
          Ajustez le montant du devis. La pose ne sera jamais impactée par ces remises ou augmentations.
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
          <div>
            <label className="form-label">Remise en % (produits)</label>
            <div className="flex gap-2">
              <input
                type="number"
                min={0}
                max={100}
                step={0.1}
                placeholder="Ex: 5"
                value={adjustmentPct || ""}
                onChange={(e) => {
                  setAdjustmentPct(e.target.value);
                  setAdjustmentHT("");
                  setAdjustmentTTC("");
                }}
                className="form-input font-mono"
              />
              <span className="flex items-center text-sm font-semibold px-2 bg-muted border border-border rounded">%</span>
            </div>
          </div>
          
          <div>
            <label className="form-label">Nouveau Total HT souhaité (€)</label>
            <input
              type="number"
              min={0}
              step={0.01}
              placeholder="Ex: 10500"
              value={adjustmentHT || ""}
              onChange={(e) => {
                setAdjustmentHT(e.target.value);
                setAdjustmentPct("");
                setAdjustmentTTC("");
              }}
              className="form-input font-mono"
            />
          </div>

          <div>
            <label className="form-label">Nouveau Total TTC souhaité (€)</label>
            <input
              type="number"
              min={0}
              step={0.01}
              placeholder="Ex: 12500"
              value={adjustmentTTC || ""}
              onChange={(e) => {
                setAdjustmentTTC(e.target.value);
                setAdjustmentPct("");
                setAdjustmentHT("");
              }}
              className="form-input font-mono"
            />
          </div>

          <div>
            <label className="form-label">Méthode d'application</label>
            <select
              value={adjustmentMethod}
              onChange={(e) => setAdjustmentMethod(e.target.value as "proportional" | "line")}
              className="form-input font-semibold text-accent"
            >
              <option value="proportional">Répartition Proportionnelle</option>
              <option value="line">Ligne "Remise exceptionnelle"</option>
            </select>
          </div>
        </div>

        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={handleResetAdjustment}
            className="btn-ghost text-xs border border-border text-destructive hover:bg-destructive/5"
            title="Annuler toutes les remises/ajustements et restaurer les prix d'origine des lignes"
          >
            Réinitialiser &amp; Annuler Ajustements
          </button>
          <button
            type="button"
            onClick={handleApplyAdjustment}
            className="btn-gold text-xs font-semibold"
          >
            Appliquer l'ajustement
          </button>
        </div>
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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div>
            <label className="form-label">Formule de règlement</label>
            <select
              value={quote.paymentConditionId || ""}
              onChange={(e) => {
                const condId = e.target.value;
                const foundCond = settings?.paymentConditionsList?.find(c => c.id === condId);
                if (foundCond) {
                  const autoText = foundCond.steps.map(s => `${s.pct}% ${s.label}`).join(", ");
                  update({
                    paymentConditionId: condId,
                    conditionsPaiement: autoText
                  });
                } else {
                  update({ paymentConditionId: "" });
                }
              }}
              className="form-input"
            >
              <option value="">-- Personnalisé / Autre --</option>
              {settings?.paymentConditionsList?.map((cond) => (
                <option key={cond.id} value={cond.id}>
                  {cond.nom || "Formule sans nom"}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="form-label">Conditions de paiement (Description)</label>
            <input
              type="text"
              value={quote.conditionsPaiement}
              onChange={(e) => update({ conditionsPaiement: e.target.value })}
              className="form-input"
            />
          </div>
          <div>
            <label className="form-label">Délai de réalisation</label>
            <input
              type="text"
              value={quote.delaiRealisation}
              onChange={(e) => update({ delaiRealisation: e.target.value })}
              className="form-input"
            />
          </div>
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
