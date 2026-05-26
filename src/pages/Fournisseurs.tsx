import { useState, useCallback, useEffect } from "react";
import {
  Plus, Search, Pencil, Trash2, ChevronDown, ChevronRight,
  Truck, Save, Grid3X3, ClipboardPaste, AlertCircle, CheckCircle2, X,
} from "lucide-react";
import { toast } from "sonner";
import { formatEUR, uid } from "@/lib/quote-data";
import {
  loadModeles, saveModeles, blankModele, blankOption,
  parseExcelGrid, validateGrille, formatMM, formatCoef,
  TEMPLATE_DEFAUT, VARIABLES_DISPONIBLES,
  type ModelePergola, type OptionConfigurable, type GrilleTarif, type ReglePoteau,
} from "@/lib/configurator-data";

// ── Types Fournisseurs ─────────────────────────────────────────────────────────

export interface ProduitFournisseur {
  id: string;
  designation: string;
  reference: string;
  categorie: string;
  prixAchatHT: number;
  prixVenteHT: number;
  unite: string;
  notes: string;
}

export interface Fournisseur {
  id: string;
  nom: string;
  societe: string;
  email: string;
  telephone: string;
  adresse: string;
  categorie: string;
  notes: string;
  produits: ProduitFournisseur[];
  dateCreation: string;
}

function loadFournisseurs(): Fournisseur[] {
  try {
    return JSON.parse(localStorage.getItem("oralis_fournisseurs") || "[]");
  } catch {
    return [];
  }
}

function saveFournisseurs(data: Fournisseur[]) {
  localStorage.setItem("oralis_fournisseurs", JSON.stringify(data));
}

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
  "Autre",
];

function blankFournisseur(): Fournisseur {
  return {
    id: uid(),
    nom: "",
    societe: "",
    email: "",
    telephone: "",
    adresse: "",
    categorie: "",
    notes: "",
    produits: [],
    dateCreation: new Date().toISOString().split("T")[0],
  };
}

function blankProduit(): ProduitFournisseur {
  return {
    id: uid(),
    designation: "",
    reference: "",
    categorie: "",
    prixAchatHT: 0,
    prixVenteHT: 0,
    unite: "unité",
    notes: "",
  };
}

function MarginBadge({ achat, vente }: { achat: number; vente: number }) {
  if (!achat || !vente) return null;
  const marge = ((vente - achat) / vente) * 100;
  const color =
    marge >= 40
      ? "text-[hsl(150_45%_40%)] bg-[hsl(150_45%_40%/0.1)]"
      : marge >= 25
      ? "text-[hsl(40_80%_45%)] bg-[hsl(40_80%_45%/0.1)]"
      : "text-destructive bg-destructive/10";
  return (
    <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold ${color}`}>
      {marge.toFixed(0)}% marge
    </span>
  );
}

// ── ProduitRow ─────────────────────────────────────────────────────────────────

function ProduitRow({
  produit,
  onUpdate,
  onDelete,
}: {
  produit: ProduitFournisseur;
  onUpdate: (p: ProduitFournisseur) => void;
  onDelete: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(produit);
  const save = () => {
    onUpdate(draft);
    setEditing(false);
  };
  const cancel = () => {
    setDraft(produit);
    setEditing(false);
  };

  if (!editing)
    return (
      <tr className="border-b border-border last:border-0 hover:bg-accent/5 transition-colors group">
        <td className="px-4 py-2 font-medium text-[13px]">
          {produit.designation || <span className="text-muted-foreground italic">—</span>}
        </td>
        <td className="px-4 py-2 text-[12px] text-muted-foreground font-mono">
          {produit.reference || "—"}
        </td>
        <td className="px-4 py-2 text-[12px]">{produit.categorie || "—"}</td>
        <td className="px-4 py-2 text-right font-mono text-[13px]">{formatEUR(produit.prixAchatHT)}</td>
        <td className="px-4 py-2 text-right font-mono text-[13px] font-semibold">
          {formatEUR(produit.prixVenteHT)}
        </td>
        <td className="px-4 py-2 text-center">
          <MarginBadge achat={produit.prixAchatHT} vente={produit.prixVenteHT} />
        </td>
        <td className="px-4 py-2 text-[12px] text-muted-foreground">{produit.unite}</td>
        <td className="px-4 py-2 text-right">
          <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button onClick={() => setEditing(true)} className="p-1.5 rounded hover:bg-muted transition-colors">
              <Pencil size={13} className="text-muted-foreground" />
            </button>
            <button onClick={onDelete} className="p-1.5 rounded hover:bg-destructive/10 transition-colors">
              <Trash2 size={13} className="text-destructive/70" />
            </button>
          </div>
        </td>
      </tr>
    );

  return (
    <tr className="border-b border-border bg-accent/5">
      <td className="px-2 py-1.5" colSpan={8}>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-2">
          <div>
            <label className="text-[10px] text-muted-foreground uppercase tracking-wide">Désignation *</label>
            <input
              value={draft.designation}
              onChange={(e) => setDraft({ ...draft, designation: e.target.value })}
              className="form-input !h-8 !text-[12px] w-full"
            />
          </div>
          <div>
            <label className="text-[10px] text-muted-foreground uppercase tracking-wide">Référence</label>
            <input
              value={draft.reference}
              onChange={(e) => setDraft({ ...draft, reference: e.target.value })}
              className="form-input !h-8 !text-[12px] w-full"
            />
          </div>
          <div>
            <label className="text-[10px] text-muted-foreground uppercase tracking-wide">Catégorie</label>
            <input
              value={draft.categorie}
              onChange={(e) => setDraft({ ...draft, categorie: e.target.value })}
              className="form-input !h-8 !text-[12px] w-full"
              list="cat-list"
            />
            <datalist id="cat-list">
              {CATEGORIES.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
          </div>
          <div>
            <label className="text-[10px] text-muted-foreground uppercase tracking-wide">Unité</label>
            <select
              value={draft.unite}
              onChange={(e) => setDraft({ ...draft, unite: e.target.value })}
              className="form-input !h-8 !text-[12px] w-full"
            >
              {["unité", "ml", "m²", "m³", "lot", "forfait"].map((u) => (
                <option key={u} value={u}>
                  {u}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-[10px] text-muted-foreground uppercase tracking-wide">
              Prix achat HT (€)
            </label>
            <input
              type="number"
              min={0}
              step={0.01}
              value={draft.prixAchatHT}
              onChange={(e) => setDraft({ ...draft, prixAchatHT: parseFloat(e.target.value) || 0 })}
              className="form-input !h-8 !text-[12px] w-full"
            />
          </div>
          <div>
            <label className="text-[10px] text-muted-foreground uppercase tracking-wide">
              Prix vente HT (€)
            </label>
            <input
              type="number"
              min={0}
              step={0.01}
              value={draft.prixVenteHT}
              onChange={(e) => setDraft({ ...draft, prixVenteHT: parseFloat(e.target.value) || 0 })}
              className="form-input !h-8 !text-[12px] w-full"
            />
          </div>
          <div className="flex items-end">
            <MarginBadge achat={draft.prixAchatHT} vente={draft.prixVenteHT} />
          </div>
          <div>
            <label className="text-[10px] text-muted-foreground uppercase tracking-wide">Notes</label>
            <input
              value={draft.notes}
              onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
              className="form-input !h-8 !text-[12px] w-full"
            />
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={save} className="btn-gold !h-7 !text-[12px] flex items-center gap-1">
            <Save size={12} /> Enregistrer
          </button>
          <button onClick={cancel} className="btn-ghost !h-7 !text-[12px] border border-border">
            Annuler
          </button>
        </div>
      </td>
    </tr>
  );
}

// ── FournisseurRow ─────────────────────────────────────────────────────────────

function FournisseurRow({
  fournisseur,
  onUpdate,
  onDelete,
}: {
  fournisseur: Fournisseur;
  onUpdate: (f: Fournisseur) => void;
  onDelete: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(fournisseur);

  const saveInfo = () => {
    onUpdate({ ...draft, produits: fournisseur.produits });
    setEditing(false);
  };
  const updateProduit = (p: ProduitFournisseur) =>
    onUpdate({ ...fournisseur, produits: fournisseur.produits.map((x) => (x.id === p.id ? p : x)) });
  const deleteProduit = (pid: string) =>
    onUpdate({ ...fournisseur, produits: fournisseur.produits.filter((p) => p.id !== pid) });
  const addProduit = () => {
    onUpdate({ ...fournisseur, produits: [...fournisseur.produits, blankProduit()] });
    setExpanded(true);
  };

  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden shadow-[var(--shadow-card)] mb-3">
      <div
        className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-accent/5 transition-colors"
        onClick={() => setExpanded((v) => !v)}
      >
        <button className="text-muted-foreground shrink-0">
          {expanded ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
        </button>
        <div className="w-9 h-9 rounded-full bg-accent/15 flex items-center justify-center text-accent font-semibold text-[13px] shrink-0">
          {(fournisseur.societe || fournisseur.nom).slice(0, 2).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-medium text-[14px] leading-tight truncate">
            {fournisseur.societe || (
              fournisseur.nom || <span className="text-muted-foreground italic">Nouveau fournisseur</span>
            )}
          </div>
          <div className="text-[12px] text-muted-foreground truncate">
            {fournisseur.nom && fournisseur.societe && <span>{fournisseur.nom} · </span>}
            {fournisseur.categorie && <span className="text-accent/80">{fournisseur.categorie} · </span>}
            {fournisseur.telephone}
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <span className="text-[12px] text-muted-foreground hidden sm:block">
            {fournisseur.produits.length} produit{fournisseur.produits.length !== 1 ? "s" : ""}
          </span>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setEditing(true);
              setExpanded(true);
            }}
            className="p-1.5 rounded hover:bg-muted transition-colors"
          >
            <Pencil size={14} className="text-muted-foreground" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className="p-1.5 rounded hover:bg-destructive/10 transition-colors"
          >
            <Trash2 size={14} className="text-destructive/70" />
          </button>
        </div>
      </div>

      {expanded && (
        <div className="border-t border-border">
          {editing && (
            <div className="p-4 bg-accent/5 border-b border-border">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-3">
                <div>
                  <label className="form-label">Société</label>
                  <input
                    value={draft.societe}
                    onChange={(e) => setDraft({ ...draft, societe: e.target.value })}
                    className="form-input w-full"
                  />
                </div>
                <div>
                  <label className="form-label">Contact</label>
                  <input
                    value={draft.nom}
                    onChange={(e) => setDraft({ ...draft, nom: e.target.value })}
                    className="form-input w-full"
                  />
                </div>
                <div>
                  <label className="form-label">Catégorie</label>
                  <input
                    value={draft.categorie}
                    onChange={(e) => setDraft({ ...draft, categorie: e.target.value })}
                    className="form-input w-full"
                    list="cat-list-f"
                  />
                  <datalist id="cat-list-f">
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c} />
                    ))}
                  </datalist>
                </div>
                <div>
                  <label className="form-label">Téléphone</label>
                  <input
                    value={draft.telephone}
                    onChange={(e) => setDraft({ ...draft, telephone: e.target.value })}
                    className="form-input w-full"
                  />
                </div>
                <div>
                  <label className="form-label">Email</label>
                  <input
                    type="email"
                    value={draft.email}
                    onChange={(e) => setDraft({ ...draft, email: e.target.value })}
                    className="form-input w-full"
                  />
                </div>
                <div>
                  <label className="form-label">Adresse</label>
                  <input
                    value={draft.adresse}
                    onChange={(e) => setDraft({ ...draft, adresse: e.target.value })}
                    className="form-input w-full"
                  />
                </div>
                <div className="col-span-2 md:col-span-3">
                  <label className="form-label">Notes internes</label>
                  <textarea
                    value={draft.notes}
                    onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
                    className="form-input w-full !h-16 resize-none"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={saveInfo} className="btn-gold !h-8 !text-[12px] flex items-center gap-1">
                  <Save size={13} /> Enregistrer
                </button>
                <button
                  onClick={() => {
                    setDraft(fournisseur);
                    setEditing(false);
                  }}
                  className="btn-ghost !h-8 !text-[12px] border border-border"
                >
                  Annuler
                </button>
              </div>
            </div>
          )}
          {!editing && (fournisseur.email || fournisseur.telephone || fournisseur.adresse || fournisseur.notes) && (
            <div className="px-4 py-2 flex flex-wrap gap-x-6 gap-y-1 text-[12px] text-muted-foreground border-b border-border/50 bg-muted/20">
              {fournisseur.email && <span>✉ {fournisseur.email}</span>}
              {fournisseur.telephone && <span>📞 {fournisseur.telephone}</span>}
              {fournisseur.adresse && <span>📍 {fournisseur.adresse}</span>}
              {fournisseur.notes && <span className="italic">💬 {fournisseur.notes}</span>}
            </div>
          )}
          <div className="overflow-x-auto">
            {fournisseur.produits.length > 0 ? (
              <table className="w-full min-w-[700px] text-sm">
                <thead>
                  <tr className="table-header-dark text-[11px]">
                    <th className="text-left px-4 py-2">Désignation</th>
                    <th className="text-left px-4 py-2">Référence</th>
                    <th className="text-left px-4 py-2">Catégorie</th>
                    <th className="text-right px-4 py-2">Prix achat HT</th>
                    <th className="text-right px-4 py-2">Prix vente HT</th>
                    <th className="text-center px-4 py-2">Marge</th>
                    <th className="text-left px-4 py-2">Unité</th>
                    <th className="text-right px-4 py-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {fournisseur.produits.map((p) => (
                    <ProduitRow
                      key={p.id}
                      produit={p}
                      onUpdate={updateProduit}
                      onDelete={() => deleteProduit(p.id)}
                    />
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="px-4 py-4 text-[13px] text-muted-foreground italic">Aucun produit enregistré.</div>
            )}
          </div>
          <div className="px-4 py-2 border-t border-border/50">
            <button
              onClick={addProduit}
              className="flex items-center gap-2 text-[12px] text-accent hover:text-accent/80 font-medium transition-colors"
            >
              <Plus size={14} /> Ajouter un produit / tarif
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── OptionsList ───────────────────────────────────────────────────────────────

function OptionsList({
  label,
  options,
  onChange,
}: {
  label: string;
  options: OptionConfigurable[];
  onChange: (opts: OptionConfigurable[]) => void;
}) {
  const add = () => onChange([...options, blankOption()]);
  const update = (id: string, patch: Partial<OptionConfigurable>) =>
    onChange(options.map((o) => (o.id === id ? { ...o, ...patch } : o)));
  const remove = (id: string) => onChange(options.filter((o) => o.id !== id));

  return (
    <div className="mb-4">
      <div className="flex items-center justify-between mb-2">
        <label className="text-[11px] uppercase tracking-wide font-semibold text-muted-foreground">
          {label}
        </label>
        <button
          onClick={add}
          className="flex items-center gap-1 text-[11px] text-accent hover:text-accent/80 font-medium transition-colors"
        >
          <Plus size={12} /> Ajouter
        </button>
      </div>
      {options.length === 0 && <p className="text-[12px] text-muted-foreground italic">Aucune option.</p>}
      <div className="space-y-2">
        {options.map((opt) => (
          <div key={opt.id} className="flex items-center gap-2 bg-muted/30 rounded p-2">
            <input
              value={opt.nom}
              onChange={(e) => update(opt.id, { nom: e.target.value })}
              placeholder="Nom de l'option"
              className="form-input !h-7 !text-[12px] flex-1"
            />
            <div className="flex items-center gap-1 shrink-0">
              <span className="text-[10px] text-muted-foreground">+€</span>
              <input
                type="number"
                min={0}
                step={0.01}
                value={opt.surchargeHT}
                onChange={(e) => update(opt.id, { surchargeHT: parseFloat(e.target.value) || 0 })}
                className="form-input !h-7 !text-[12px] w-20 text-right font-mono"
                title="Surcharge fixe €"
              />
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <span className="text-[10px] text-muted-foreground">+%</span>
              <input
                type="number"
                min={0}
                max={100}
                step={0.5}
                value={opt.surchargePct}
                onChange={(e) => update(opt.id, { surchargePct: parseFloat(e.target.value) || 0 })}
                className="form-input !h-7 !text-[12px] w-16 text-right font-mono"
                title="Surcharge % du prix de base"
              />
            </div>
            <button
              onClick={() => remove(opt.id)}
              className="p-1 rounded hover:bg-destructive/10 transition-colors"
            >
              <X size={12} className="text-destructive/70" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── ReglesPoteauxEditor ────────────────────────────────────────────────────────

function ReglesPoteauxEditor({
  regles,
  onChange,
}: {
  regles: ReglePoteau[];
  onChange: (r: ReglePoteau[]) => void;
}) {
  const add = () => {
    const last = regles[regles.length - 1];
    onChange([
      ...regles,
      {
        largeurMinMm: last ? last.largeurMaxMm + 1 : 0,
        largeurMaxMm: last ? last.largeurMaxMm + 3000 : 6060,
        nombrePoteaux: (last?.nombrePoteaux ?? 2) + 1,
      },
    ]);
  };
  const update = (i: number, patch: Partial<ReglePoteau>) =>
    onChange(regles.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  const remove = (i: number) => onChange(regles.filter((_, idx) => idx !== i));

  return (
    <div className="mb-4">
      <div className="flex items-center justify-between mb-2">
        <div>
          <label className="text-[11px] uppercase tracking-wide font-semibold text-muted-foreground">
            Règles poteaux (informatif — visible dans le devis)
          </label>
          <p className="text-[10px] text-muted-foreground mt-0.5">
            Le nombre de poteaux est calculé automatiquement selon la largeur saisie.
          </p>
        </div>
        <button
          onClick={add}
          className="flex items-center gap-1 text-[11px] text-accent hover:text-accent/80 font-medium transition-colors shrink-0"
        >
          <Plus size={12} /> Ajouter
        </button>
      </div>
      {regles.length === 0 && (
        <p className="text-[12px] text-muted-foreground italic">
          Aucune règle — le nombre de poteaux ne sera pas affiché.
        </p>
      )}
      <div className="space-y-2">
        {regles.map((r, i) => (
          <div key={i} className="flex items-center gap-2 bg-muted/30 rounded p-2 text-[12px]">
            <span className="text-muted-foreground w-20 shrink-0 text-[11px]">Largeur de</span>
            <input
              type="number"
              min={0}
              step={10}
              value={r.largeurMinMm}
              onChange={(e) => update(i, { largeurMinMm: parseInt(e.target.value) || 0 })}
              className="form-input !h-7 !text-[12px] w-24 text-right font-mono"
              title="Largeur min (mm)"
            />
            <span className="text-muted-foreground text-[11px] shrink-0">mm à</span>
            <input
              type="number"
              min={0}
              step={10}
              value={r.largeurMaxMm}
              onChange={(e) => update(i, { largeurMaxMm: parseInt(e.target.value) || 0 })}
              className="form-input !h-7 !text-[12px] w-24 text-right font-mono"
              title="Largeur max (mm)"
            />
            <span className="text-muted-foreground text-[11px] shrink-0">mm →</span>
            <input
              type="number"
              min={1}
              max={20}
              value={r.nombrePoteaux}
              onChange={(e) => update(i, { nombrePoteaux: parseInt(e.target.value) || 2 })}
              className="form-input !h-7 !text-[12px] w-16 text-center font-mono font-bold"
              title="Nombre de poteaux"
            />
            <span className="text-muted-foreground text-[11px] shrink-0">poteau{r.nombrePoteaux > 1 ? "x" : ""}</span>
            {regles.length > 1 && (
              <button
                onClick={() => remove(i)}
                className="p-1 rounded hover:bg-destructive/10 transition-colors ml-auto"
              >
                <X size={12} className="text-destructive/70" />
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── TemplateEditor ─────────────────────────────────────────────────────────────

function TemplateEditor({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [showPreview, setShowPreview] = useState(false);
  const preview = value
    .replace(/\{\{nom\}\}/g, "ORIS SOLID")
    .replace(/\{\{largeur\}\}/g, "6,06m")
    .replace(/\{\{profondeur\}\}/g, "3,00m")
    .replace(/\{\{hauteur\}\}/g, "3,00m")
    .replace(/\{\{toiture\}\}/g, "Verre clair")
    .replace(/\{\{couleur\}\}/g, "Anthracite RAL 7016")
    .replace(/\{\{poteaux\}\}/g, "3")
    .replace(/\{\{moteur\}\}/g, "Moteur 15 NM");

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <div>
          <label className="text-[11px] uppercase tracking-wide font-semibold text-muted-foreground">
            Template de description (devis)
          </label>
          <p className="text-[10px] text-muted-foreground mt-0.5">
            Inséré automatiquement dans la ligne devis. Utilisez les variables ci-dessous.
          </p>
        </div>
        <button
          onClick={() => setShowPreview((v) => !v)}
          className="text-[11px] text-accent hover:text-accent/80 font-medium transition-colors shrink-0"
        >
          {showPreview ? "Masquer l'aperçu" : "Aperçu"}
        </button>
      </div>

      {/* Variables disponibles */}
      <div className="flex flex-wrap gap-1 mb-2">
        {VARIABLES_DISPONIBLES.map((v) => (
          <button
            key={v}
            onClick={() => onChange(value + v)}
            className="text-[10px] font-mono bg-accent/10 text-accent px-1.5 py-0.5 rounded hover:bg-accent/20 transition-colors"
            title="Cliquer pour insérer"
          >
            {v}
          </button>
        ))}
      </div>

      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="form-input w-full !h-36 resize-none font-mono !text-[11px] leading-relaxed"
        placeholder="Ex: {{nom}} sur mesure&#10;Dimensions : Largeur {{largeur}} × Profondeur {{profondeur}} — {{poteaux}} poteaux&#10;Couverture : {{toiture}}&#10;Couleur : {{couleur}}"
      />

      {showPreview && (
        <div className="mt-2 p-3 bg-muted/30 border border-border rounded text-[12px] whitespace-pre-line leading-relaxed text-foreground">
          <div className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1">
            Aperçu avec données exemple :
          </div>
          {preview}
        </div>
      )}

      <button
        onClick={() => onChange(TEMPLATE_DEFAUT)}
        className="mt-1.5 text-[10px] text-muted-foreground hover:text-foreground transition-colors"
      >
        ↺ Remettre le template par défaut
      </button>
    </div>
  );
}

// ── GrilleEditor ───────────────────────────────────────────────────────────────

function GrilleEditor({ grille, onChange }: { grille: GrilleTarif; onChange: (g: GrilleTarif) => void }) {
  const [tsvInput, setTsvInput] = useState("");
  const [parseStatus, setParseStatus] = useState<"idle" | "ok" | "error">("idle");
  const [parseMsg, setParseMsg] = useState("");
  const [showPaste, setShowPaste] = useState(false);

  const handlePaste = () => {
    const parsed = parseExcelGrid(tsvInput);
    if (!parsed) {
      setParseStatus("error");
      setParseMsg(
        "Format invalide — vérifiez que la 1ère ligne contient les largeurs et la 1ère colonne les profondeurs."
      );
      return;
    }
    const err = validateGrille(parsed);
    if (err) {
      setParseStatus("error");
      setParseMsg(err);
      return;
    }
    onChange(parsed);
    setParseStatus("ok");
    setParseMsg(`Grille importée : ${parsed.largeurs.length} largeurs × ${parsed.profondeurs.length} profondeurs`);
    setShowPaste(false);
  };

  const updateCell = (ri: number, ci: number, value: number) =>
    onChange({
      ...grille,
      prixAchatHT: grille.prixAchatHT.map((row, r) => (r === ri ? row.map((v, c) => (c === ci ? value : v)) : row)),
    });
  const addLargeur = () => {
    const last = grille.largeurs[grille.largeurs.length - 1] || 3000;
    onChange({
      ...grille,
      largeurs: [...grille.largeurs, last + 1000],
      prixAchatHT: grille.prixAchatHT.map((row) => [...row, 0]),
    });
  };
  const addProfondeur = () => {
    const last = grille.profondeurs[grille.profondeurs.length - 1] || 2000;
    onChange({
      ...grille,
      profondeurs: [...grille.profondeurs, last + 500],
      prixAchatHT: [...grille.prixAchatHT, new Array(grille.largeurs.length).fill(0)],
    });
  };
  const removeLargeur = (ci: number) => {
    if (grille.largeurs.length <= 1) return;
    onChange({
      ...grille,
      largeurs: grille.largeurs.filter((_, i) => i !== ci),
      prixAchatHT: grille.prixAchatHT.map((row) => row.filter((_, i) => i !== ci)),
    });
  };
  const removeProfondeur = (ri: number) => {
    if (grille.profondeurs.length <= 1) return;
    onChange({
      ...grille,
      profondeurs: grille.profondeurs.filter((_, i) => i !== ri),
      prixAchatHT: grille.prixAchatHT.filter((_, i) => i !== ri),
    });
  };
  const updateLargeur = (idx: number, val: number) =>
    onChange({ ...grille, largeurs: grille.largeurs.map((v, i) => (i === idx ? val : v)) });
  const updateProfondeur = (idx: number, val: number) =>
    onChange({ ...grille, profondeurs: grille.profondeurs.map((v, i) => (i === idx ? val : v)) });

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <label className="text-[11px] uppercase tracking-wide font-semibold text-muted-foreground">
          Matrice prix achat HT (€) — Profondeur/Hauteur × Largeur
        </label>
        <button
          onClick={() => setShowPaste((v) => !v)}
          className="flex items-center gap-1.5 text-[11px] text-accent hover:text-accent/80 font-medium transition-colors"
        >
          <ClipboardPaste size={13} /> {showPaste ? "Masquer" : "Importer depuis Excel"}
        </button>
      </div>

      {showPaste && (
        <div className="mb-4 p-3 bg-muted/40 border border-border rounded-lg">
          <p className="text-[11px] text-muted-foreground mb-2">
            Copiez votre tableau depuis Excel et collez-le ici. 1ère ligne = largeurs, 1ère colonne =
            profondeurs. Dimensions en cm ou mm.
          </p>
          <textarea
            value={tsvInput}
            onChange={(e) => {
              setTsvInput(e.target.value);
              setParseStatus("idle");
            }}
            className="form-input resize-none w-full font-mono !text-[11px] !h-28 mb-2"
            placeholder={
              "(vide)\t3000\t4000\t5000\n2000\t1850\t2100\t2450\n2500\t2050\t2350\t2700"
            }
          />
          <div className="flex items-center gap-3">
            <button onClick={handlePaste} className="btn-gold !h-7 !text-[11px] flex items-center gap-1">
              <ClipboardPaste size={12} /> Analyser et importer
            </button>
            {parseStatus === "ok" && (
              <span className="flex items-center gap-1 text-[11px] text-[hsl(150_45%_40%)]">
                <CheckCircle2 size={12} /> {parseMsg}
              </span>
            )}
            {parseStatus === "error" && (
              <span className="flex items-center gap-1 text-[11px] text-destructive">
                <AlertCircle size={12} /> {parseMsg}
              </span>
            )}
          </div>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="text-[11px] border-collapse">
          <thead>
            <tr>
              <th className="px-2 py-1 bg-muted/50 border border-border text-muted-foreground font-normal text-center w-24">
                <span className="text-[9px]">Prof/Haut ↓ / Larg →</span>
              </th>
              {grille.largeurs.map((l, ci) => (
                <th key={ci} className="px-1 py-1 bg-accent/10 border border-border min-w-[80px]">
                  <div className="flex items-center gap-0.5">
                    <input
                      type="number"
                      value={l}
                      step={100}
                      onChange={(e) => updateLargeur(ci, parseInt(e.target.value) || l)}
                      className="w-full bg-transparent text-center font-mono font-semibold text-accent focus:outline-none text-[11px]"
                    />
                    {grille.largeurs.length > 1 && (
                      <button onClick={() => removeLargeur(ci)} className="shrink-0 hover:text-destructive transition-colors">
                        <X size={9} />
                      </button>
                    )}
                  </div>
                  <div className="text-[9px] text-muted-foreground text-center">{formatMM(l)}</div>
                </th>
              ))}
              <th className="px-2 py-1 border border-dashed border-border text-center">
                <button
                  onClick={addLargeur}
                  className="text-accent hover:text-accent/80 transition-colors"
                  title="Ajouter largeur"
                >
                  <Plus size={13} />
                </button>
              </th>
            </tr>
          </thead>
          <tbody>
            {grille.profondeurs.map((p, ri) => (
              <tr key={ri}>
                <td className="px-1 py-1 bg-accent/10 border border-border">
                  <div className="flex items-center gap-0.5">
                    <input
                      type="number"
                      value={p}
                      step={100}
                      onChange={(e) => updateProfondeur(ri, parseInt(e.target.value) || p)}
                      className="w-full bg-transparent text-center font-mono font-semibold text-accent focus:outline-none text-[11px]"
                    />
                    {grille.profondeurs.length > 1 && (
                      <button
                        onClick={() => removeProfondeur(ri)}
                        className="shrink-0 hover:text-destructive transition-colors"
                      >
                        <X size={9} />
                      </button>
                    )}
                  </div>
                  <div className="text-[9px] text-muted-foreground text-center">{formatMM(p)}</div>
                </td>
                {grille.largeurs.map((_, ci) => (
                  <td key={ci} className="px-1 py-0.5 border border-border">
                    <input
                      type="number"
                      min={0}
                      step={10}
                      value={grille.prixAchatHT[ri]?.[ci] ?? 0}
                      onChange={(e) => updateCell(ri, ci, parseFloat(e.target.value) || 0)}
                      className="w-full form-input !h-7 !text-[11px] !py-0 text-right font-mono min-w-[72px]"
                    />
                  </td>
                ))}
                <td className="border border-dashed border-border" />
              </tr>
            ))}
            <tr>
              <td className="px-2 py-1 border border-dashed border-border text-center">
                <button
                  onClick={addProfondeur}
                  className="text-accent hover:text-accent/80 transition-colors"
                  title="Ajouter profondeur"
                >
                  <Plus size={13} />
                </button>
              </td>
              {grille.largeurs.map((_, ci) => (
                <td key={ci} className="border border-dashed border-border" />
              ))}
              <td className="border border-dashed border-border" />
            </tr>
          </tbody>
        </table>
      </div>
      <p className="text-[10px] text-muted-foreground mt-2">
        Dimensions en mm. Règle : arrondi à la case immédiatement supérieure.
      </p>
    </div>
  );
}

// ── ModeleEditorModal ──────────────────────────────────────────────────────────

function ModeleEditorModal({
  modele,
  fournisseurs,
  onSave,
  onClose,
}: {
  modele: ModelePergola;
  fournisseurs: Fournisseur[];
  onSave: (m: ModelePergola) => void;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState<ModelePergola>(modele);
  const [tab, setTab] = useState<"grille" | "options" | "poteaux" | "description">("grille");

  const handleSave = () => {
    if (!draft.nom.trim()) {
      toast.error("Donnez un nom au modèle");
      return;
    }
    const err = validateGrille(draft.grille);
    if (err) {
      toast.error(`Grille invalide : ${err}`);
      return;
    }
    onSave(draft);
    toast.success("Modèle enregistré");
  };

  const TABS = [
    { key: "grille" as const, label: "Grille de tarifs" },
    { key: "options" as const, label: "Toitures & Couleurs" },
    { key: "poteaux" as const, label: "Poteaux" },
    { key: "description" as const, label: "Description devis" },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 overflow-y-auto py-8 px-4">
      <div className="bg-card border border-border rounded-xl shadow-elevated w-full max-w-4xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div>
            <h2 className="font-display text-[18px] font-semibold">
              {modele.nom ? `Modifier : ${modele.nom}` : "Nouveau modèle"}
            </h2>
            <p className="text-[12px] text-muted-foreground mt-0.5">Grille tarifaire, options et description devis</p>
          </div>
          <button onClick={onClose} className="p-2 rounded hover:bg-muted transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Infos générales */}
        <div className="px-6 py-4 border-b border-border bg-muted/20">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <div className="md:col-span-2">
              <label className="form-label">
                Nom catalogue ORALIS * <span className="text-[10px] text-muted-foreground font-normal">(visible client)</span>
              </label>
              <input
                value={draft.nom}
                onChange={(e) => setDraft({ ...draft, nom: e.target.value })}
                className="form-input w-full"
                placeholder="ex: ORIS SOLID, PRIME ADVANCED..."
              />
            </div>
            <div>
              <label className="form-label">
                Nom fournisseur <span className="text-[10px] text-muted-foreground font-normal">(interne)</span>
              </label>
              <input
                value={draft.nomFournisseur}
                onChange={(e) => setDraft({ ...draft, nomFournisseur: e.target.value })}
                className="form-input w-full"
                placeholder="ex: MB SOLID"
              />
            </div>
            <div>
              <label className="form-label">Fournisseur</label>
              <select
                value={draft.fournisseurId}
                onChange={(e) => {
                  const f = fournisseurs.find((x) => x.id === e.target.value);
                  setDraft({ ...draft, fournisseurId: e.target.value, fournisseurNom: f?.societe || f?.nom || "" });
                }}
                className="form-input w-full"
              >
                <option value="">— Non lié —</option>
                {fournisseurs.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.societe || f.nom}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="form-label">Marge par défaut — {formatCoef(draft.margeDefaut)}</label>
              <input
                type="number"
                min={1}
                max={5}
                step={0.05}
                value={draft.margeDefaut}
                onChange={(e) => setDraft({ ...draft, margeDefaut: parseFloat(e.target.value) || 1.4 })}
                className="form-input w-full font-mono"
              />
            </div>
          </div>
          <div className="mt-3">
            <label className="form-label">Type de dimensions</label>
            <div className="flex gap-2">
              {(["largeur_profondeur", "largeur_hauteur"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setDraft({ ...draft, typeDim: t })}
                  className={`px-3 py-1.5 text-[12px] rounded border transition-all ${
                    draft.typeDim === t
                      ? "bg-accent text-accent-foreground border-accent"
                      : "border-border text-muted-foreground hover:border-accent/50"
                  }`}
                >
                  {t === "largeur_profondeur"
                    ? "Largeur × Profondeur (pergolas, vérandas)"
                    : "Largeur × Hauteur (screens, volets, parois)"}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Onglets */}
        <div className="flex border-b border-border px-6 pt-2 gap-1 overflow-x-auto">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-4 py-2 text-[13px] font-medium border-b-2 transition-colors -mb-px whitespace-nowrap ${
                tab === t.key ? "border-accent text-accent" : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="px-6 py-4 max-h-[55vh] overflow-y-auto">
          {tab === "grille" && <GrilleEditor grille={draft.grille} onChange={(g) => setDraft({ ...draft, grille: g })} />}
          {tab === "options" && (
            <div>
              <OptionsList
                label="Toitures / Couvertures"
                options={draft.toitures}
                onChange={(opts) => setDraft({ ...draft, toitures: opts })}
              />
              <OptionsList
                label="Couleurs / Finitions"
                options={draft.couleurs}
                onChange={(opts) => setDraft({ ...draft, couleurs: opts })}
              />
            </div>
          )}
          {tab === "poteaux" && (
            <ReglesPoteauxEditor regles={draft.reglesPoteau} onChange={(r) => setDraft({ ...draft, reglesPoteau: r })} />
          )}
          {tab === "description" && (
            <TemplateEditor
              value={draft.templateDescription}
              onChange={(v) => setDraft({ ...draft, templateDescription: v })}
            />
          )}
        </div>

        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-border bg-muted/10">
          <button onClick={onClose} className="btn-ghost border border-border">
            Annuler
          </button>
          <button onClick={handleSave} className="btn-gold flex items-center gap-2">
            <Save size={15} /> Enregistrer le modèle
          </button>
        </div>
      </div>
    </div>
  );
}

// ── GrilleTarifsTab ────────────────────────────────────────────────────────────

function GrilleTarifsTab({ fournisseurs }: { fournisseurs: Fournisseur[] }) {
  const [modeles, setModeles] = useState<ModelePergola[]>([]);
  const [editingModele, setEditingModele] = useState<ModelePergola | null>(null);

  useEffect(() => setModeles(loadModeles()), []);

  const save = (list: ModelePergola[]) => {
    saveModeles(list);
    setModeles(list);
  };

  const handleSaveModele = (m: ModelePergola) => {
    const idx = modeles.findIndex((x) => x.id === m.id);
    if (idx >= 0) save(modeles.map((x) => (x.id === m.id ? m : x)));
    else save([...modeles, m]);
    setEditingModele(null);
  };

  const handleDelete = (id: string) => {
    if (!confirm("Supprimer ce modèle et sa grille de tarifs ?")) return;
    save(modeles.filter((m) => m.id !== id));
    toast.success("Modèle supprimé");
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="font-display text-[18px] font-semibold">Grilles de tarifs</h2>
          <p className="text-[12px] text-muted-foreground mt-0.5">
            Matrices de prix Largeur × Profondeur/Hauteur — descriptions et règles de poteaux
          </p>
        </div>
        <button onClick={() => setEditingModele(blankModele())} className="btn-gold flex items-center gap-2">
          <Plus size={15} /> Nouveau modèle
        </button>
      </div>

      {modeles.length === 0 ? (
        <div className="luxury-card p-12 text-center">
          <Grid3X3 size={40} className="mx-auto text-muted-foreground/20 mb-4" />
          <h3 className="font-display text-[16px] mb-2">Aucun modèle configuré</h3>
          <p className="text-[13px] text-muted-foreground mb-4">
            Créez votre premier modèle avec sa grille de prix pour accélérer le chiffrage.
          </p>
          <button onClick={() => setEditingModele(blankModele())} className="btn-gold inline-flex items-center gap-2">
            <Plus size={15} /> Créer un modèle
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {modeles.map((m) => (
            <div key={m.id} className="bg-card border border-border rounded-lg p-4 shadow-[var(--shadow-card)]">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <div className="font-medium text-[14px]">{m.nom}</div>
                    {m.nomFournisseur && (
                      <span className="text-[10px] bg-muted text-muted-foreground px-1.5 py-0.5 rounded font-mono">
                        {m.nomFournisseur}
                      </span>
                    )}
                  </div>
                  <div className="text-[12px] text-muted-foreground mt-0.5">
                    {m.fournisseurNom && <span>{m.fournisseurNom} · </span>}
                    <span className="font-mono">{formatCoef(m.margeDefaut)}</span>
                    {" · "}
                    <span>
                      {m.grille.largeurs.length} largeurs × {m.grille.profondeurs.length} profondeurs
                    </span>
                    {" · "}
                    <span>
                      {m.toitures.length} toiture{m.toitures.length !== 1 ? "s" : ""}
                    </span>
                    {" · "}
                    <span>
                      {m.couleurs.length} couleur{m.couleurs.length !== 1 ? "s" : ""}
                    </span>
                    {m.reglesPoteau.length > 0 && (
                      <span>
                        {" "}
                        · {m.reglesPoteau.length} règle{m.reglesPoteau.length !== 1 ? "s" : ""} poteaux
                      </span>
                    )}
                  </div>
                  <div className="flex gap-1 mt-2 flex-wrap">
                    {m.grille.largeurs.slice(0, 8).map((l, i) => (
                      <span key={i} className="text-[10px] bg-accent/10 text-accent px-1.5 py-0.5 rounded font-mono">
                        {(l / 1000).toFixed(2).replace(".", ",")}m
                      </span>
                    ))}
                    {m.grille.largeurs.length > 8 && (
                      <span className="text-[10px] text-muted-foreground">+{m.grille.largeurs.length - 8}</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setEditingModele(m)}
                    className="btn-ghost !h-8 !text-[12px] flex items-center gap-1 border border-border"
                  >
                    <Pencil size={13} /> Modifier
                  </button>
                  <button onClick={() => handleDelete(m.id)} className="p-2 rounded hover:bg-destructive/10 transition-colors">
                    <Trash2 size={14} className="text-destructive/70" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {editingModele && (
        <ModeleEditorModal
          modele={editingModele}
          fournisseurs={fournisseurs}
          onSave={handleSaveModele}
          onClose={() => setEditingModele(null)}
        />
      )}
    </div>
  );
}

// ── MAIN PAGE ─────────────────────────────────────────────────────────────────

export default function Fournisseurs() {
  const [fournisseurs, setFournisseurs] = useState<Fournisseur[]>([]);
  const [search, setSearch] = useState("");
  const [filterCat, setFilterCat] = useState("toutes");
  const [activeTab, setActiveTab] = useState<"fournisseurs" | "grilles">("fournisseurs");

  const reload = useCallback(() => setFournisseurs(loadFournisseurs()), []);
  useEffect(() => reload(), [reload]);

  const save = (list: Fournisseur[]) => {
    saveFournisseurs(list);
    setFournisseurs(list);
  };
  const addFournisseur = () => {
    save([blankFournisseur(), ...fournisseurs]);
    toast.success("Nouveau fournisseur créé");
  };
  const updateFournisseur = (f: Fournisseur) => save(fournisseurs.map((x) => (x.id === f.id ? f : x)));
  const deleteFournisseur = (id: string) => {
    if (!confirm("Supprimer ce fournisseur et tous ses tarifs ?")) return;
    save(fournisseurs.filter((f) => f.id !== id));
    toast.success("Fournisseur supprimé");
  };

  const allCats = Array.from(new Set(fournisseurs.map((f) => f.categorie).filter(Boolean)));
  const filtered = fournisseurs.filter((f) => {
    const txt = search.toLowerCase();
    const matchSearch =
      !txt ||
      f.nom.toLowerCase().includes(txt) ||
      f.societe.toLowerCase().includes(txt) ||
      f.email.toLowerCase().includes(txt) ||
      f.produits.some((p) => p.designation.toLowerCase().includes(txt));
    return matchSearch && (filterCat === "toutes" || f.categorie === filterCat);
  });

  const totalProduits = fournisseurs.reduce((s, f) => s + f.produits.length, 0);
  const allPrix = fournisseurs.flatMap((f) => f.produits.map((p) => p.prixVenteHT)).filter(Boolean);
  const prixMoyen = allPrix.length ? allPrix.reduce((a, b) => a + b, 0) / allPrix.length : 0;
  const nModeles = loadModeles().length;

  return (
    <div className="p-6 lg:p-8 w-full">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-[32px] font-semibold text-foreground tracking-tight">Fournisseurs</h1>
          <p className="text-[13px] text-muted-foreground mt-1 font-body">Base de tarifs et grilles de prix fournisseurs</p>
        </div>
        {activeTab === "fournisseurs" && (
          <button onClick={addFournisseur} className="btn-gold flex items-center gap-2">
            <Plus size={16} /> Nouveau fournisseur
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <div className="luxury-card !p-4 flex flex-col justify-between h-20 border-l-[3px] border-l-accent">
          <span className="text-[11px] uppercase tracking-wide text-muted-foreground font-body">Fournisseurs</span>
          <span className="font-display text-2xl text-accent">{fournisseurs.length}</span>
        </div>
        <div className="luxury-card !p-4 flex flex-col justify-between h-20 border-l-[3px] border-l-[hsl(220_60%_55%)]">
          <span className="text-[11px] uppercase tracking-wide text-muted-foreground font-body">Produits / tarifs</span>
          <span className="font-display text-2xl text-[hsl(220_60%_55%)]">{totalProduits}</span>
        </div>
        <div className="luxury-card !p-4 flex flex-col justify-between h-20 border-l-[3px] border-l-[hsl(var(--success))]">
          <span className="text-[11px] uppercase tracking-wide text-muted-foreground font-body">Prix vente moyen HT</span>
          <span className="font-display text-2xl text-[hsl(var(--success))]">{formatEUR(prixMoyen)}</span>
        </div>
        <div className="luxury-card !p-4 flex flex-col justify-between h-20 border-l-[3px] border-l-[hsl(40_80%_45%)]">
          <span className="text-[11px] uppercase tracking-wide text-muted-foreground font-body">Modèles pergola</span>
          <span className="font-display text-2xl text-[hsl(40_80%_45%)]">{nModeles}</span>
        </div>
      </div>

      <div className="flex gap-1 border-b border-border mb-6">
        {(
          [
            { key: "fournisseurs", label: "Fournisseurs", icon: <Truck size={14} /> },
            { key: "grilles", label: "Grilles de tarifs", icon: <Grid3X3 size={14} /> },
          ] as const
        ).map(({ key, label, icon }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`flex items-center gap-2 px-4 py-2.5 text-[13px] font-medium border-b-2 transition-colors -mb-px ${
              activeTab === key
                ? "border-accent text-accent"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {icon} {label}
          </button>
        ))}
      </div>

      {activeTab === "fournisseurs" && (
        <>
          <div className="flex gap-3 mb-6 flex-wrap items-center">
            <div className="relative flex-1 min-w-[200px]">
              <Search size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Rechercher fournisseur ou produit..."
                className="form-input pl-10 h-10 w-full rounded-lg shadow-[var(--shadow-card)]"
              />
            </div>
            <div className="flex gap-1 flex-wrap">
              <button
                onClick={() => setFilterCat("toutes")}
                className={`px-3 py-1.5 text-[12px] rounded border font-body transition-colors ${
                  filterCat === "toutes"
                    ? "bg-accent text-accent-foreground border-accent"
                    : "bg-card text-muted-foreground border-border hover:text-foreground"
                }`}
              >
                Toutes
              </button>
              {allCats.map((c) => (
                <button
                  key={c}
                  onClick={() => setFilterCat(c)}
                  className={`px-3 py-1.5 text-[12px] rounded border font-body transition-colors ${
                    filterCat === c
                      ? "bg-accent text-accent-foreground border-accent"
                      : "bg-card text-muted-foreground border-border hover:text-foreground"
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>
          {filtered.length === 0 ? (
            <div className="luxury-card p-16 text-center">
              <Truck size={48} className="mx-auto text-muted-foreground/20 mb-4" />
              <h2 className="font-display text-xl text-foreground mb-2">
                {fournisseurs.length === 0 ? "Aucun fournisseur" : "Aucun résultat"}
              </h2>
              <p className="text-sm text-muted-foreground mb-4">
                {fournisseurs.length === 0
                  ? "Ajoutez vos fournisseurs et leurs tarifs pour accélérer le chiffrage."
                  : "Affinez votre recherche."}
              </p>
              {fournisseurs.length === 0 && (
                <button onClick={addFournisseur} className="btn-gold inline-flex items-center gap-2">
                  <Plus size={16} /> Ajouter un fournisseur
                </button>
              )}
            </div>
          ) : (
            <div>
              {filtered.map((f) => (
                <FournisseurRow
                  key={f.id}
                  fournisseur={f}
                  onUpdate={updateFournisseur}
                  onDelete={() => deleteFournisseur(f.id)}
                />
              ))}
            </div>
          )}
        </>
      )}

      {activeTab === "grilles" && <GrilleTarifsTab fournisseurs={fournisseurs} />}
    </div>
  );
}
