import { useState, useCallback, useEffect } from "react";
import {
  Plus, Search, Pencil, Trash2, ChevronDown, ChevronRight, ChevronUp, ChevronLeft,
  Truck, Save, Grid3X3, ClipboardPaste, AlertCircle, CheckCircle2, X,
  Camera, Upload, Copy,
} from "lucide-react";
import { toast } from "sonner";
import { formatEUR, uid } from "@/lib/quote-data";
import {
  loadModeles, saveModeles, blankModele, blankModeleScreen, blankModeleCoulissant, blankModeleParoiFixe, blankModeleParoiGrille, blankModeleMBPrime, getLabelsModele, blankOption,
  parseExcelGrid, validateGrille, formatMM, formatCoef,
  TEMPLATE_DEFAUT, VARIABLES_DISPONIBLES,
  type ModelePergola, type ModeleCoulissant, type ModeleParoiFixe, type ModeleParoiGrille, type AnyModele, type OptionConfigurable, type GrilleTarif, type ReglePoteau, type TarifPanneau,
} from "@/lib/configurator-data";
import { ConfirmModal } from "@/components/ConfirmModal";

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
  image?: string;
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
  "Pose",
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
    image: "",
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
  onDuplicate,
}: {
  produit: ProduitFournisseur;
  onUpdate: (p: ProduitFournisseur) => void;
  onDelete: () => void;
  onDuplicate: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(produit);

  // Sync draft when product changes
  useEffect(() => {
    setDraft(produit);
  }, [produit]);

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
        <td className="px-4 py-2">
          {produit.image ? (
            <img src={produit.image} alt={produit.designation} className="w-10 h-10 object-cover rounded border border-border" />
          ) : (
            <div className="w-10 h-10 bg-muted border border-border border-dashed rounded flex items-center justify-center text-[10px] text-muted-foreground">—</div>
          )}
        </td>
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
            <button onClick={onDuplicate} className="p-1.5 rounded hover:bg-muted transition-colors" title="Dupliquer">
              <Copy size={13} className="text-muted-foreground" />
            </button>
            <button onClick={() => setEditing(true)} className="p-1.5 rounded hover:bg-muted transition-colors" title="Modifier">
              <Pencil size={13} className="text-muted-foreground" />
            </button>
            <button onClick={onDelete} className="p-1.5 rounded hover:bg-destructive/10 transition-colors" title="Supprimer">
              <Trash2 size={13} className="text-destructive/70" />
            </button>
          </div>
        </td>
      </tr>
    );

  return (
    <tr className="border-b border-border bg-accent/5">
      <td className="px-2 py-1.5" colSpan={9}>
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
            <label className="text-[10px] text-muted-foreground uppercase tracking-wide font-semibold text-accent">Image</label>
            <div className="flex items-center gap-2 mt-0.5">
              {draft.image ? (
                <div className="relative group w-8 h-8 rounded border border-border overflow-hidden">
                  <img src={draft.image} className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => setDraft({ ...draft, image: "" })}
                    className="absolute inset-0 bg-black/60 flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Trash2 size={12} className="text-white hover:text-destructive" />
                  </button>
                </div>
              ) : (
                <label className="h-8 px-2 border border-border border-dashed rounded flex items-center gap-1 cursor-pointer text-[11px] text-muted-foreground hover:text-accent hover:border-accent/50 transition-colors w-full">
                  <Camera size={12} />
                  <span>Ajouter</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={async (e) => {
                      const f = e.target.files?.[0];
                      if (f) {
                        try {
                          setDraft({ ...draft, image: await processImageFile(f) });
                        } catch {}
                      }
                    }}
                  />
                </label>
              )}
            </div>
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
          <div className="flex items-end justify-center">
            <MarginBadge achat={draft.prixAchatHT} vente={draft.prixVenteHT} />
          </div>
          <div className="col-span-2">
            <label className="text-[10px] text-muted-foreground uppercase tracking-wide">Notes (Description devis)</label>
            <textarea
              value={draft.notes}
              onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
              className="form-input !text-[12px] w-full min-h-[60px] py-1 resize-none"
              rows={2}
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
  const [confirmDelete, setConfirmDelete] = useState<{
    isOpen: boolean;
    message: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    message: "",
    onConfirm: () => {},
  });

  const saveInfo = () => {
    onUpdate({ ...draft, produits: fournisseur.produits });
    setEditing(false);
  };
  const updateProduit = (p: ProduitFournisseur) =>
    onUpdate({ ...fournisseur, produits: fournisseur.produits.map((x) => (x.id === p.id ? p : x)) });
  const deleteProduit = (pid: string) => {
    setConfirmDelete({
      isOpen: true,
      message: "Voulez-vous vraiment supprimer ce produit / tarif ?",
      onConfirm: () => {
        onUpdate({ ...fournisseur, produits: fournisseur.produits.filter((p) => p.id !== pid) });
      },
    });
  };
  const duplicateProduit = (p: ProduitFournisseur) => {
    const duplicated: ProduitFournisseur = {
      ...p,
      id: uid(),
      designation: p.designation ? `${p.designation} (copie)` : "(copie)",
    };
    const idx = fournisseur.produits.findIndex((x) => x.id === p.id);
    const updated = [...fournisseur.produits];
    if (idx >= 0) {
      updated.splice(idx + 1, 0, duplicated);
    } else {
      updated.push(duplicated);
    }
    onUpdate({ ...fournisseur, produits: updated });
    toast.success("Produit dupliqué !");
  };
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
                    <th className="text-left px-4 py-2 w-16">Visuel</th>
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
                      onDuplicate={() => duplicateProduit(p)}
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

  const moveUp = (index: number) => {
    if (index <= 0) return;
    const newOpts = [...options];
    const temp = newOpts[index];
    newOpts[index] = newOpts[index - 1];
    newOpts[index - 1] = temp;
    onChange(newOpts);
  };

  const moveDown = (index: number) => {
    if (index >= options.length - 1) return;
    const newOpts = [...options];
    const temp = newOpts[index];
    newOpts[index] = newOpts[index + 1];
    newOpts[index + 1] = temp;
    onChange(newOpts);
  };

  return (
    <div className="mb-4">
      <div className="flex items-center justify-between mb-2">
        <label className="text-[11px] uppercase tracking-wide font-semibold text-muted-foreground font-body">
          {label}
        </label>
        <button
          onClick={add}
          className="flex items-center gap-1 text-[11px] text-accent hover:text-accent/80 font-medium transition-colors"
        >
          <Plus size={12} /> Ajouter
        </button>
      </div>
      {options.length === 0 && <p className="text-[12px] text-muted-foreground italic font-body">Aucune option.</p>}
      <div className="space-y-2">
        {options.map((opt, i) => {
          const mode = opt.modeCalcul || "forfait";
          const suffix = mode === "m2" ? "/m²" : mode === "ml" ? "/ml" : "";
          return (
            <div key={opt.id} className="flex items-center gap-2 bg-muted/30 rounded p-2 font-body">
              <div className="flex flex-col shrink-0 gap-0.5">
                <button
                  type="button"
                  onClick={() => moveUp(i)}
                  disabled={i === 0}
                  className="text-muted-foreground hover:text-accent disabled:opacity-20 disabled:pointer-events-none transition-colors"
                  title="Monter"
                >
                  <ChevronUp size={12} />
                </button>
                <button
                  type="button"
                  onClick={() => moveDown(i)}
                  disabled={i === options.length - 1}
                  className="text-muted-foreground hover:text-accent disabled:opacity-20 disabled:pointer-events-none transition-colors"
                  title="Descendre"
                >
                  <ChevronDown size={12} />
                </button>
              </div>

              <input
                value={opt.nom}
                onChange={(e) => update(opt.id, { nom: e.target.value })}
                placeholder="Nom de l'option"
                className="form-input !h-7 !text-[12px] flex-1"
              />

              <div className="w-24 shrink-0">
                <select
                  value={mode}
                  onChange={(e) => update(opt.id, { modeCalcul: e.target.value as any })}
                  className="form-input !h-7 !text-[11px] py-0"
                >
                  <option value="forfait">Forfait</option>
                  <option value="ml">Par ml</option>
                  <option value="m2">Par m²</option>
                </select>
              </div>

              <div className="flex items-center gap-1 shrink-0">
                <span className="text-[10px] text-muted-foreground">+{suffix}€</span>
                <input
                  type="number"
                  min={0}
                  step={0.01}
                  value={opt.surchargeHT}
                  onChange={(e) => update(opt.id, { surchargeHT: parseFloat(e.target.value) || 0 })}
                  className="form-input !h-7 !text-[12px] w-20 text-right font-mono"
                  title={mode === "forfait" ? "Surcharge fixe €" : `Surcharge € ${suffix}`}
                />
              </div>

              {mode === "forfait" && (
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
              )}

              <button
                onClick={() => remove(opt.id)}
                className="p-1 rounded hover:bg-destructive/10 transition-colors shrink-0"
              >
                <X size={12} className="text-destructive/70" />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── ReglesPoteauxEditor ────────────────────────────────────────────────────────

function ReglesPoteauxEditor({
  regles,
  onChange,
  sectionPoteaux,
  onChangeSection,
  tarifPoteauSuppHT,
  onChangeTarif,
}: {
  regles: ReglePoteau[];
  onChange: (r: ReglePoteau[]) => void;
  sectionPoteaux: string;
  onChangeSection: (s: string) => void;
  tarifPoteauSuppHT: number;
  onChangeTarif: (t: number) => void;
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

  const update = (i: number, patch: Partial<ReglePoteau>) => {
    const updated = regles.map((r, idx) => {
      if (idx !== i) return r;
      const copy = { ...r, ...patch };
      if (patch.profondeurMinMm === undefined && patch.hasOwnProperty("profondeurMinMm")) {
        delete copy.profondeurMinMm;
      }
      if (patch.profondeurMaxMm === undefined && patch.hasOwnProperty("profondeurMaxMm")) {
        delete copy.profondeurMaxMm;
      }
      return copy;
    });
    onChange(updated);
  };

  const remove = (i: number) => onChange(regles.filter((_, idx) => idx !== i));

  const move = (i: number, direction: number) => {
    const target = i + direction;
    if (target < 0 || target >= regles.length) return;
    const copy = [...regles];
    const temp = copy[i];
    copy[i] = copy[target];
    copy[target] = temp;
    onChange(copy);
  };

  return (
    <div className="space-y-6">
      {/* Configuration Caractéristiques & Tarification des Poteaux */}
      <div className="bg-accent/5 border border-accent/20 rounded-xl p-4">
        <h4 className="font-semibold text-[13px] text-accent uppercase tracking-wider mb-3">
          Caractéristiques &amp; Tarification des poteaux
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="form-label text-[11px] uppercase tracking-wide font-semibold text-muted-foreground">Section des poteaux</label>
            <input
              type="text"
              value={sectionPoteaux}
              onChange={(e) => onChangeSection(e.target.value)}
              className="form-input w-full font-mono text-[13px] mt-1"
              placeholder="Ex: 136×136 mm (laisser vide pour la section standard)"
            />
            <p className="text-[10px] text-muted-foreground mt-1.5 leading-relaxed">
              Cette section sera injectée automatiquement dans les descriptifs de devis (ex: "poteaux (section 136×136mm, hauteur...)").
            </p>
          </div>
          <div>
            <label className="form-label text-[11px] uppercase tracking-wide font-semibold text-muted-foreground">Tarif d'achat poteaux supp. (€ HT / ml)</label>
            <div className="flex gap-2 mt-1">
              <input
                type="number"
                min={0}
                step={0.1}
                value={tarifPoteauSuppHT || ""}
                onChange={(e) => onChangeTarif(parseFloat(e.target.value) || 0)}
                className="form-input w-full font-mono text-[13px] text-right"
                placeholder="Ex: 32"
              />
              <span className="flex items-center text-sm font-semibold px-3 bg-muted border border-border rounded">€/ml</span>
            </div>
            <p className="text-[10px] text-muted-foreground mt-1.5 leading-relaxed">
              Prix d'achat HT par mètre linéaire. Appliqué automatiquement selon la longueur configurée dans le devis. Mettre à 0 pour désactiver.
            </p>
          </div>
        </div>
      </div>

      <div className="border border-border rounded-xl p-4 bg-muted/10">
        <div className="flex items-center justify-between mb-2">
          <div>
            <label className="text-[11px] uppercase tracking-wide font-semibold text-muted-foreground">
              Règles poteaux (pour le calcul automatique du nombre de poteaux)
            </label>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              Le nombre de poteaux est calculé automatiquement selon la largeur (et optionnellement la profondeur) saisie.
            </p>
          </div>
          <button
            onClick={add}
            className="flex items-center gap-1 text-[11px] text-accent hover:text-accent/80 font-medium transition-colors shrink-0"
          >
            <Plus size={12} /> Ajouter une règle
          </button>
        </div>
        {regles.length === 0 && (
          <p className="text-[12px] text-muted-foreground italic">
            Aucune règle — le nombre de poteaux ne sera pas affiché.
          </p>
        )}
        <div className="space-y-2">
          {regles.map((r, i) => (
            <div key={i} className="flex flex-wrap items-center gap-2 bg-card border border-border rounded p-2 text-[12px]">
              {/* Boutons de déplacement */}
              <div className="flex flex-col -space-y-1">
                <button
                  type="button"
                  disabled={i === 0}
                  onClick={() => move(i, -1)}
                  className="p-0.5 rounded hover:bg-muted disabled:opacity-30 disabled:hover:bg-transparent transition-colors text-muted-foreground"
                  title="Monter la règle"
                >
                  <ChevronUp size={14} />
                </button>
                <button
                  type="button"
                  disabled={i === regles.length - 1}
                  onClick={() => move(i, 1)}
                  className="p-0.5 rounded hover:bg-muted disabled:opacity-30 disabled:hover:bg-transparent transition-colors text-muted-foreground"
                  title="Descendre la règle"
                >
                  <ChevronDown size={14} />
                </button>
              </div>

              {/* Largeur */}
              <span className="text-muted-foreground text-[11px] shrink-0">Largeur de</span>
              <input
                type="number"
                min={0}
                step={10}
                value={r.largeurMinMm}
                onChange={(e) => update(i, { largeurMinMm: parseInt(e.target.value) || 0 })}
                className="form-input !h-7 !text-[12px] w-20 text-right font-mono"
                title="Largeur min (mm)"
              />
              <span className="text-muted-foreground text-[11px] shrink-0">mm à</span>
              <input
                type="number"
                min={0}
                step={10}
                value={r.largeurMaxMm}
                onChange={(e) => update(i, { largeurMaxMm: parseInt(e.target.value) || 0 })}
                className="form-input !h-7 !text-[12px] w-20 text-right font-mono"
                title="Largeur max (mm)"
              />
              <span className="text-muted-foreground text-[11px] shrink-0">mm</span>

              {/* Contrainte de profondeur optionnelle */}
              {r.profondeurMinMm !== undefined || r.profondeurMaxMm !== undefined ? (
                <div className="flex items-center gap-1 bg-accent/5 border border-accent/20 rounded px-1.5 py-0.5">
                  <span className="text-muted-foreground text-[11px] shrink-0">Prof. de</span>
                  <input
                    type="number"
                    min={0}
                    step={10}
                    value={r.profondeurMinMm ?? 0}
                    onChange={(e) => update(i, { profondeurMinMm: parseInt(e.target.value) || 0 })}
                    className="form-input !h-7 !text-[12px] w-16 text-right font-mono"
                    title="Profondeur min (mm)"
                  />
                  <span className="text-muted-foreground text-[11px] shrink-0">à</span>
                  <input
                    type="number"
                    min={0}
                    step={10}
                    value={r.profondeurMaxMm ?? 99999}
                    onChange={(e) => update(i, { profondeurMaxMm: parseInt(e.target.value) || 0 })}
                    className="form-input !h-7 !text-[12px] w-16 text-right font-mono"
                    title="Profondeur max (mm)"
                  />
                  <span className="text-muted-foreground text-[11px] shrink-0">mm</span>
                  <button
                    type="button"
                    onClick={() => update(i, { profondeurMinMm: undefined, profondeurMaxMm: undefined })}
                    className="p-1 rounded hover:bg-destructive/10 text-destructive/70 transition-colors ml-0.5"
                    title="Supprimer la contrainte de profondeur"
                  >
                    <X size={10} />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => update(i, { profondeurMinMm: 0, profondeurMaxMm: 4000 })}
                  className="text-[10px] bg-accent/10 hover:bg-accent/20 text-accent font-medium px-2 py-1 rounded transition-colors ml-1"
                  title="Ajouter une contrainte sur la profondeur"
                >
                  + Profondeur
                </button>
              )}

              {/* Rendu final */}
              <span className="text-muted-foreground text-[11px] shrink-0 ml-auto mr-1">→</span>
              <input
                type="number"
                min={1}
                max={20}
                value={r.nombrePoteaux}
                onChange={(e) => update(i, { nombrePoteaux: parseInt(e.target.value) || 2 })}
                className="form-input !h-7 !text-[12px] w-12 text-center font-mono font-bold"
                title="Nombre de poteaux"
              />
              <span className="text-muted-foreground text-[11px] shrink-0">poteau{r.nombrePoteaux > 1 ? "x" : ""}</span>
              
              {regles.length > 1 && (
                <button
                  type="button"
                  onClick={() => remove(i)}
                  className="p-1 rounded hover:bg-destructive/10 transition-colors ml-1"
                  title="Supprimer la règle"
                >
                  <X size={12} className="text-destructive/70" />
                </button>
              )}
            </div>
          ))}
        </div>
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
    .replace(/\{\{hauteur_poteaux\}\}/g, "2,50m")
    .replace(/\{\{poteaux_supp\}\}/g, "0")
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
        className="form-input w-full !h-36 min-h-[144px] resize-y font-mono !text-[11px] leading-relaxed"
        placeholder="Ex: {{nom}} sur mesure&#10;Dimensions : Largeur {{largeur}} × Profondeur {{profondeur}} — {{poteaux}} poteaux (hauteur {{hauteur_poteaux}})&#10;Couverture : {{toiture}}&#10;Couleur : {{couleur}}"
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

function GrilleEditor({ grille, onChange, modelName }: { grille: GrilleTarif; onChange: (g: GrilleTarif) => void; modelName?: string }) {
  const isPrime = modelName?.toLowerCase().includes("prime");
  const formatVal = (val: number) => {
    if (isPrime) return `${val} mm`;
    return formatMM(val);
  };
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
                  <div className="text-[9px] text-muted-foreground text-center">{formatVal(l)}</div>
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
                  <div className="text-[9px] text-muted-foreground text-center">{formatVal(p)}</div>
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

// ── TarifsPanneauList ─────────────────────────────────────────────────────────

function TarifsPanneauList({
  tarifs,
  onChange,
}: {
  tarifs: TarifPanneau[];
  onChange: (tarifs: TarifPanneau[]) => void;
}) {
  const add = () => onChange([...tarifs, { id: uid(), label: "", prixHT: 0, description: "" }]);
  const update = (id: string, patch: Partial<TarifPanneau>) =>
    onChange(tarifs.map((t) => (t.id === id ? { ...t, ...patch } : t)));
  const remove = (id: string) => onChange(tarifs.filter((t) => t.id !== id));

  return (
    <div className="mb-4">
      <div className="flex items-center justify-between mb-2">
        <label className="text-[11px] uppercase tracking-wide font-semibold text-muted-foreground font-body">
          Tarifs par panneau
        </label>
        <button
          type="button"
          onClick={add}
          className="flex items-center gap-1 text-[11px] text-accent hover:text-accent/80 font-medium transition-colors"
        >
          <Plus size={12} /> Ajouter un tarif
        </button>
      </div>
      {tarifs.length === 0 && <p className="text-[12px] text-muted-foreground italic font-body">Aucun tarif défini.</p>}
      <div className="space-y-3">
        {tarifs.map((tarif) => (
          <div key={tarif.id} className="bg-muted/30 border border-border/50 rounded-lg p-3 space-y-2 font-body">
            <div className="flex items-center gap-3">
              <input
                value={tarif.label}
                onChange={(e) => update(tarif.id, { label: e.target.value })}
                placeholder="Libellé (ex: Verre clair standard)"
                className="form-input !h-8 !text-[12px] flex-1"
              />
              <div className="w-36 shrink-0 flex items-center gap-1">
                <input
                  type="number"
                  min={0}
                  value={tarif.prixHT || ""}
                  onChange={(e) => update(tarif.id, { prixHT: parseFloat(e.target.value) || 0 })}
                  placeholder="Prix d'achat HT"
                  className="form-input !h-8 !text-[12px] font-mono w-full"
                />
                <span className="text-xs text-muted-foreground">€</span>
              </div>
              <button
                type="button"
                onClick={() => remove(tarif.id)}
                className="p-1.5 text-destructive hover:bg-destructive/10 transition-colors rounded"
              >
                <Trash2 size={14} />
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 items-center">
              <input
                value={tarif.description}
                onChange={(e) => update(tarif.id, { description: e.target.value })}
                placeholder="Description du contenu inclus (ex: Panneau + rail sup/inf + roulettes...)"
                className="form-input !h-8 !text-[12px] w-full"
              />
              <div className="text-[11px] text-muted-foreground font-mono text-right flex items-center justify-end gap-1">
                <span>Exemple :</span>
                <strong>2 panneaux × {tarif.prixHT}€ = {2 * tarif.prixHT}€ HT</strong>
                <span>(pour 2 vantaux)</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── ModeleCoulissantEditorModal ──────────────────────────────────────────────

function ModeleCoulissantEditorModal({
  modele,
  fournisseurs,
  onSave,
  onClose,
}: {
  modele: ModeleCoulissant;
  fournisseurs: Fournisseur[];
  onSave: (m: ModeleCoulissant) => void;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState<ModeleCoulissant>(modele);
  const [tab, setTab] = useState<"tarifs" | "couleurs" | "options" | "description">("tarifs");

  const handleSave = () => {
    if (!draft.nom.trim()) {
      toast.error("Donnez un nom au modèle");
      return;
    }
    if (draft.tarifsPanneau.length === 0) {
      toast.error("Définissez au moins un tarif par panneau");
      return;
    }
    onSave(draft);
    toast.success("Modèle enregistré");
  };

  const TABS = [
    { key: "tarifs" as const, label: "Tarifs par panneau" },
    { key: "couleurs" as const, label: "Couleurs" },
    { key: "options" as const, label: "Options" },
    { key: "description" as const, label: "Description devis" },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 overflow-y-auto py-8 px-4">
      <div className="bg-card border border-border rounded-xl shadow-elevated w-full max-w-4xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div>
            <h2 className="font-display text-[18px] font-semibold">
              {modele.nom ? `Modifier : ${modele.nom}` : "Nouveau modèle coulissant"}
            </h2>
            <p className="text-[12px] text-muted-foreground mt-0.5">Configuration des parois coulissantes, tarifs et options</p>
          </div>
          <button onClick={onClose} className="p-2 rounded hover:bg-muted transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Infos générales */}
        <div className="px-6 py-4 border-b border-border bg-muted/20">
          <div className="flex flex-col md:flex-row gap-5">
            {/* Infos textuelles (gauche) */}
            <div className="flex-1 space-y-3">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="col-span-2">
                  <div className="flex items-center gap-2 mb-1">
                    <label className="form-label !mb-0">
                      Nom catalogue ORALIS * <span className="text-[10px] text-muted-foreground font-normal">(visible client)</span>
                    </label>
                    <span className="text-[9px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400 px-1.5 py-0.5 rounded tracking-wide uppercase shrink-0">
                      COULISSANT
                    </span>
                  </div>
                  <input
                    value={draft.nom}
                    onChange={(e) => setDraft({ ...draft, nom: e.target.value })}
                    className="form-input w-full"
                    placeholder="ex: PAROI COULISSANTE MB..."
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
                    placeholder="ex: PAROIS COULISSANTES MB"
                  />
                </div>
                <div>
                  <label className="form-label">Marge par défaut — {formatCoef(draft.margeDefaut)}</label>
                  <input
                    type="number"
                    min={1}
                    max={5}
                    step={0.05}
                    value={draft.margeDefaut}
                    onChange={(e) => setDraft({ ...draft, margeDefaut: parseFloat(e.target.value) || 1.45 })}
                    className="form-input w-full font-mono"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
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
                  <label className="form-label">Vantaux Minimum</label>
                  <input
                    type="number"
                    min={1}
                    max={10}
                    value={draft.vantauxMin}
                    onChange={(e) => setDraft({ ...draft, vantauxMin: parseInt(e.target.value) || 2 })}
                    className="form-input w-full font-mono"
                  />
                </div>
                <div>
                  <label className="form-label">Vantaux Maximum</label>
                  <input
                    type="number"
                    min={1}
                    max={20}
                    value={draft.vantauxMax}
                    onChange={(e) => setDraft({ ...draft, vantauxMax: parseInt(e.target.value) || 6 })}
                    className="form-input w-full font-mono"
                  />
                </div>
              </div>
            </div>

            {/* Photo / Image (droite) */}
            <div className="w-full md:w-44 shrink-0 flex flex-col justify-between">
              <label className="form-label">Photo du modèle</label>
              <div className="relative group flex items-center justify-center border border-border rounded-lg h-[88px] bg-card overflow-hidden hover:border-accent/50 transition-colors">
                {draft.image ? (
                  <>
                    <img src={draft.image} alt={draft.nom || "Modèle"} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center gap-2 transition-opacity">
                      <label className="p-1.5 text-white hover:text-accent rounded cursor-pointer transition-colors bg-black/40 hover:bg-black/60">
                        <Upload size={14} />
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={async (e) => {
                            const f = e.target.files?.[0];
                            if (f) {
                              try {
                                setDraft({ ...draft, image: await processImageFile(f) });
                              } catch {}
                            }
                          }}
                        />
                      </label>
                      <button
                        type="button"
                        onClick={() => setDraft({ ...draft, image: "" })}
                        className="p-1.5 text-white hover:text-destructive rounded transition-colors bg-black/40 hover:bg-black/60"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </>
                ) : (
                  <label className="flex flex-col items-center justify-center gap-1 w-full h-full cursor-pointer text-xs font-semibold text-muted-foreground hover:text-accent transition-colors">
                    <Camera size={18} />
                    <span>Ajouter photo</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={async (e) => {
                        const f = e.target.files?.[0];
                        if (f) {
                          try {
                            setDraft({ ...draft, image: await processImageFile(f) });
                          } catch {}
                        }
                      }}
                    />
                  </label>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Sélecteur d'onglets */}
        <div className="flex border-b border-border bg-muted/10 px-6 gap-2">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-4 py-3 text-[13px] font-medium border-b-2 transition-all ${
                tab === t.key
                  ? "border-accent text-accent"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Contenu onglet */}
        <div className="px-6 py-5 min-h-[300px]">
          {tab === "tarifs" && (
            <TarifsPanneauList
              tarifs={draft.tarifsPanneau}
              onChange={(t) => setDraft({ ...draft, tarifsPanneau: t })}
            />
          )}

          {tab === "couleurs" && (
            <OptionsList
              label="Couleurs / Finitions"
              options={draft.couleurs || []}
              onChange={(c) => setDraft({ ...draft, couleurs: c })}
            />
          )}

          {tab === "options" && (
            <OptionsList
              label="Options configurables (Serrure, poignées...)"
              options={draft.options}
              onChange={(o) => setDraft({ ...draft, options: o })}
            />
          )}

          {tab === "description" && (
            <div className="space-y-4">
              <div>
                <label className="form-label">Template de description pour le devis</label>
                <textarea
                  value={draft.templateDescription}
                  onChange={(e) => setDraft({ ...draft, templateDescription: e.target.value })}
                  className="form-input w-full font-mono text-[12px] leading-relaxed !h-36 min-h-[144px] resize-y"
                  placeholder="Gabarit de description du produit..."
                />
              </div>
              <div>
                <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground block mb-2">
                  Variables disponibles :
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {["{{nom}}", "{{vantaux}}", "{{tarif_panneau}}", "{{couleur}}", "{{options_texte}}", "{{largeur_verre}}", "{{hauteur_verre}}", "{{hauteur_encastrement}}"].map((v) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => {
                        setDraft({ ...draft, templateDescription: draft.templateDescription + " " + v });
                      }}
                      className="px-2 py-1 bg-muted hover:bg-muted-foreground/15 border border-border text-muted-foreground text-[10px] font-mono rounded transition-colors"
                    >
                      {v}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-border bg-muted/10 rounded-b-xl">
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

function ModeleParoiFixeEditorModal({
  modele,
  fournisseurs,
  onSave,
  onClose,
}: {
  modele: ModeleParoiFixe;
  fournisseurs: any[];
  onSave: (m: ModeleParoiFixe) => void;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState<ModeleParoiFixe>(modele);
  const [tab, setTab] = useState<"couleurs" | "description">("couleurs");
  const [imagePreview, setImagePreview] = useState<string | null>(modele.image || null);

  const handleSave = () => {
    if (!draft.nom.trim()) {
      toast.error("Donnez un nom au modèle");
      return;
    }
    onSave(draft);
    toast.success("Modèle enregistré");
  };

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const compressed = await processImageFile(file);
        setDraft({ ...draft, image: compressed });
        setImagePreview(compressed);
      } catch (err) {
        toast.error("Erreur lors du traitement de l'image");
      }
    }
  };

  const TABS = [
    { key: "couleurs" as const, label: "Couleurs" },
    { key: "description" as const, label: "Description devis" },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 overflow-y-auto py-8 px-4">
      <div className="bg-card border border-border rounded-xl shadow-elevated w-full max-w-4xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div>
            <h2 className="font-display text-[18px] font-semibold">
              {modele.nom ? `Modifier : ${modele.nom}` : "Nouveau modèle de paroi fixe"}
            </h2>
            <p className="text-[12px] text-muted-foreground mt-0.5">Configuration des parois latérales fixes et couleurs</p>
          </div>
          <button onClick={onClose} className="p-2 rounded hover:bg-muted transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Infos générales */}
        <div className="px-6 py-4 border-b border-border bg-muted/20">
          <div className="flex flex-col md:flex-row gap-5">
            {/* Image (droite ou gauche) */}
            <div className="w-full md:w-44 shrink-0 flex flex-col items-center gap-2">
              <div className="w-full h-32 rounded-lg border border-border bg-card flex flex-col items-center justify-center overflow-hidden relative group shadow-sm">
                {imagePreview ? (
                  <>
                    <img src={imagePreview} alt="Aperçu" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => {
                        setDraft({ ...draft, image: undefined });
                        setImagePreview(null);
                      }}
                      className="absolute top-1 right-1 p-1 bg-background/80 hover:bg-background rounded-full border border-border opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 size={12} className="text-destructive" />
                    </button>
                  </>
                ) : (
                  <div className="flex flex-col items-center justify-center text-muted-foreground p-3 text-center">
                    <Camera size={24} className="mb-1 opacity-40" />
                    <span className="text-[10px]">Aucune image</span>
                  </div>
                )}
              </div>
              <label className="btn-ghost !h-7 !text-[11px] border border-border cursor-pointer flex items-center gap-1">
                <Upload size={12} /> Choisir une image
                <input type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
              </label>
            </div>

            {/* Infos textuelles (droite) */}
            <div className="flex-1 space-y-3">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="col-span-2">
                  <div className="flex items-center gap-2 mb-1">
                    <label className="form-label !mb-0">
                      Nom catalogue ORALIS * <span className="text-[10px] text-muted-foreground font-normal">(visible client)</span>
                    </label>
                    <span className="text-[9px] font-bold bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400 px-1.5 py-0.5 rounded tracking-wide uppercase shrink-0">
                      PAROI FIXE
                    </span>
                  </div>
                  <input
                    value={draft.nom}
                    onChange={(e) => setDraft({ ...draft, nom: e.target.value })}
                    className="form-input w-full"
                    placeholder="ex: PAROI LATÉRALE FIXE MB..."
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
                    placeholder="ex: PAROIS FIXES MB"
                  />
                </div>
                <div>
                  <label className="form-label">Marge par défaut — {formatCoef(draft.margeDefaut)}</label>
                  <input
                    type="number"
                    min={1}
                    max={5}
                    step={0.05}
                    value={draft.margeDefaut}
                    onChange={(e) => setDraft({ ...draft, margeDefaut: parseFloat(e.target.value) || 1.45 })}
                    className="form-input w-full font-mono"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
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
              </div>
            </div>
          </div>
        </div>

        {/* Corps - Tabs */}
        <div className="px-6 py-4">
          <div className="flex border-b border-border mb-4">
            {TABS.map((t) => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`px-4 py-2 text-[13px] font-medium border-b-2 transition-colors -mb-[2px] ${
                  tab === t.key
                    ? "border-accent text-accent"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {tab === "couleurs" && (
            <OptionsList
              label="Couleurs / Finitions structure"
              options={draft.couleurs || []}
              onChange={(c) => setDraft({ ...draft, couleurs: c })}
            />
          )}

          {tab === "description" && (
            <div className="space-y-4">
              <div>
                <label className="form-label">Template de description pour le devis</label>
                <textarea
                  value={draft.templateDescription}
                  onChange={(e) => setDraft({ ...draft, templateDescription: e.target.value })}
                  className="form-input w-full font-mono text-[12px] leading-relaxed !h-36 min-h-[144px] resize-y"
                  placeholder="Gabarit de description du produit..."
                />
              </div>
              <div>
                <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground block mb-2">
                  Variables disponibles :
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {["{{nom}}", "{{type_paroi}}", "{{largeur}}", "{{hauteur}}", "{{couleur}}", "{{notes}}"].map((v) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => {
                        setDraft({ ...draft, templateDescription: draft.templateDescription + " " + v });
                      }}
                      className="px-2 py-1 bg-muted hover:bg-muted-foreground/15 border border-border text-muted-foreground text-[10px] font-mono rounded transition-colors"
                    >
                      {v}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-border bg-muted/10 rounded-b-xl">
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

function ModeleParoiGrilleEditorModal({
  modele,
  fournisseurs,
  onSave,
  onClose,
}: {
  modele: ModeleParoiGrille;
  fournisseurs: any[];
  onSave: (m: ModeleParoiGrille) => void;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState<ModeleParoiGrille>(modele);
  const [tab, setTab] = useState<"tarifs" | "couleurs" | "description">("tarifs");
  const [imagePreview, setImagePreview] = useState<string | null>(modele.image || null);

  const handleSave = () => {
    if (!draft.nom.trim()) {
      toast.error("Donnez un nom au modèle");
      return;
    }
    for (const tp of draft.typesParoi) {
      if (!tp.nom.trim()) {
        toast.error("Chaque type de paroi doit avoir un nom");
        return;
      }
    }
    onSave(draft);
    toast.success("Modèle enregistré");
  };

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const compressed = await processImageFile(file);
        setDraft({ ...draft, image: compressed });
        setImagePreview(compressed);
      } catch (err) {
        toast.error("Erreur lors du traitement de l'image");
      }
    }
  };

  const curLargeurs = draft.typesParoi[0]?.largeurs || [2500, 3000, 3500, 4000, 5000];

  const handleAddType = () => {
    const newType = {
      id: uid(),
      nom: "Nouveau type",
      largeurs: [...curLargeurs],
      prixAchatHT: new Array(curLargeurs.length).fill(0),
    };
    setDraft({
      ...draft,
      typesParoi: [...draft.typesParoi, newType],
    });
  };

  const handleRemoveType = (id: string) => {
    setDraft({
      ...draft,
      typesParoi: draft.typesParoi.filter((t) => t.id !== id),
    });
  };

  const updateLargeur = (widthIdx: number, valMm: number) => {
    const newTypes = draft.typesParoi.map((tp) => {
      const newLargeurs = [...tp.largeurs];
      newLargeurs[widthIdx] = valMm;
      return { ...tp, largeurs: newLargeurs };
    });
    setDraft({ ...draft, typesParoi: newTypes });
  };

  const addLargeur = () => {
    const last = curLargeurs[curLargeurs.length - 1] || 5000;
    const newMm = last + 500; // +50cm (500mm) par défaut
    const newTypes = draft.typesParoi.map((tp) => ({
      ...tp,
      largeurs: [...tp.largeurs, newMm],
      prixAchatHT: [...tp.prixAchatHT, 0],
    }));
    setDraft({ ...draft, typesParoi: newTypes });
  };

  const removeLargeur = (widthIdx: number) => {
    if (curLargeurs.length <= 1) return;
    const newTypes = draft.typesParoi.map((tp) => ({
      ...tp,
      largeurs: tp.largeurs.filter((_, i) => i !== widthIdx),
      prixAchatHT: tp.prixAchatHT.filter((_, i) => i !== widthIdx),
    }));
    setDraft({ ...draft, typesParoi: newTypes });
  };

  const moveColumn = (fromIdx: number, toIdx: number) => {
    if (toIdx < 0 || toIdx >= curLargeurs.length) return;
    const newTypes = draft.typesParoi.map((tp) => {
      const newLargeurs = [...tp.largeurs];
      const newPrix = [...tp.prixAchatHT];
      const tempL = newLargeurs[fromIdx];
      newLargeurs[fromIdx] = newLargeurs[toIdx];
      newLargeurs[toIdx] = tempL;
      const tempP = newPrix[fromIdx];
      newPrix[fromIdx] = newPrix[toIdx];
      newPrix[toIdx] = tempP;
      return { ...tp, largeurs: newLargeurs, prixAchatHT: newPrix };
    });
    setDraft({ ...draft, typesParoi: newTypes });
  };

  const TABS = [
    { key: "tarifs" as const, label: "Grille de tarifs" },
    { key: "couleurs" as const, label: "Couleurs" },
    { key: "description" as const, label: "Description devis" },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 overflow-y-auto py-8 px-4">
      <div className="bg-card border border-border rounded-xl shadow-elevated w-full max-w-5xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div>
            <h2 className="font-display text-[18px] font-semibold">
              {modele.nom ? `Modifier : ${modele.nom}` : "Nouveau modèle de paroi avec grille"}
            </h2>
            <p className="text-[12px] text-muted-foreground mt-0.5">Configuration des parois fixes avec grille de tarifs</p>
          </div>
          <button onClick={onClose} className="p-2 rounded hover:bg-muted transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Infos générales */}
        <div className="px-6 py-4 border-b border-border bg-muted/20">
          <div className="flex flex-col md:flex-row gap-5">
            {/* Image */}
            <div className="w-full md:w-44 shrink-0 flex flex-col items-center gap-2">
              <div className="w-full h-32 rounded-lg border border-border bg-card flex flex-col items-center justify-center overflow-hidden relative group shadow-sm">
                {imagePreview ? (
                  <>
                    <img src={imagePreview} alt="Aperçu" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => {
                        setDraft({ ...draft, image: undefined });
                        setImagePreview(null);
                      }}
                      className="absolute top-1 right-1 p-1 bg-background/80 hover:bg-background rounded-full border border-border opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 size={12} className="text-destructive" />
                    </button>
                  </>
                ) : (
                  <div className="flex flex-col items-center justify-center text-muted-foreground p-3 text-center">
                    <Camera size={24} className="mb-1 opacity-40" />
                    <span className="text-[10px]">Aucune image</span>
                  </div>
                )}
              </div>
              <label className="btn-ghost !h-7 !text-[11px] border border-border cursor-pointer flex items-center gap-1">
                <Upload size={12} /> Choisir une image
                <input type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
              </label>
            </div>

            {/* Infos textuelles */}
            <div className="flex-1 space-y-3">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="col-span-2">
                  <div className="flex items-center gap-2 mb-1">
                    <label className="form-label !mb-0">
                      Nom catalogue ORALIS * <span className="text-[10px] text-muted-foreground font-normal">(visible client)</span>
                    </label>
                    <span className="text-[9px] font-bold bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400 px-1.5 py-0.5 rounded tracking-wide uppercase shrink-0">
                      PAROI AVEC GRILLE
                    </span>
                  </div>
                  <input
                    value={draft.nom}
                    onChange={(e) => setDraft({ ...draft, nom: e.target.value })}
                    className="form-input w-full"
                    placeholder="ex: PAROI LATÉRALE FIXE AVEC GRILLE..."
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
                    placeholder="ex: PAROIS FIXES MB"
                  />
                </div>
                <div>
                  <label className="form-label">Marge par défaut — {formatCoef(draft.margeDefaut)}</label>
                  <input
                    type="number"
                    min={1}
                    max={5}
                    step={0.05}
                    value={draft.margeDefaut}
                    onChange={(e) => setDraft({ ...draft, margeDefaut: parseFloat(e.target.value) || 1.45 })}
                    className="form-input w-full font-mono"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
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
              </div>
            </div>
          </div>
        </div>

        {/* Corps - Tabs */}
        <div className="px-6 py-4">
          <div className="flex border-b border-border mb-4">
            {TABS.map((t) => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`px-4 py-2 text-[13px] font-medium border-b-2 transition-colors -mb-[2px] ${
                  tab === t.key
                    ? "border-accent text-accent"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {tab === "tarifs" && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-[13px] font-semibold text-muted-foreground">Grille de prix d'achat HT par largeur (en mm)</span>
                <button
                  type="button"
                  onClick={handleAddType}
                  className="btn-ghost !h-7 !text-[11px] border border-border flex items-center gap-1 text-accent hover:text-accent-hover"
                >
                  <Plus size={12} /> Ajouter un type de paroi
                </button>
              </div>

              <div className="overflow-x-auto border border-border rounded-lg">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-muted/40 border-b border-border">
                      <th className="p-3 font-semibold text-muted-foreground min-w-[280px]">Type de paroi</th>
                      {curLargeurs.map((l, ci) => (
                        <th key={ci} className="p-3 font-semibold text-muted-foreground text-center font-mono min-w-[135px]">
                          <div className="flex items-center justify-center gap-1">
                            {/* Bouton Déplacer à Gauche */}
                            {ci > 0 && (
                              <button
                                type="button"
                                onClick={() => moveColumn(ci, ci - 1)}
                                className="text-muted-foreground hover:text-accent p-0.5"
                                title="Déplacer vers la gauche"
                              >
                                <ChevronLeft size={13} />
                              </button>
                            )}
                            <input
                              type="number"
                              min={10}
                              value={Math.round(l / 10)}
                              onChange={(e) => {
                                const valCm = parseInt(e.target.value) || 0;
                                updateLargeur(ci, valCm * 10);
                              }}
                              className="w-12 bg-transparent text-center font-mono font-semibold border-b border-dashed border-border focus:outline-none focus:border-accent text-xs"
                              title="Modifier la largeur en cm"
                            />
                            <span className="text-[10px] text-muted-foreground font-normal">cm</span>
                            {/* Bouton Déplacer à Droite */}
                            {ci < curLargeurs.length - 1 && (
                              <button
                                type="button"
                                onClick={() => moveColumn(ci, ci + 1)}
                                className="text-muted-foreground hover:text-accent p-0.5"
                                title="Déplacer vers la droite"
                              >
                                <ChevronRight size={13} />
                              </button>
                            )}
                            {curLargeurs.length > 1 && (
                              <button
                                type="button"
                                onClick={() => removeLargeur(ci)}
                                className="text-muted-foreground hover:text-destructive transition-colors ml-1"
                                title="Supprimer cette largeur"
                              >
                                <X size={12} />
                              </button>
                            )}
                          </div>
                          <span className="text-[9px] text-muted-foreground block font-normal mt-0.5">({l} mm)</span>
                        </th>
                      ))}
                      <th className="p-3 border border-dashed border-border text-center w-12">
                        <button
                          type="button"
                          onClick={addLargeur}
                          className="text-accent hover:text-accent-hover transition-colors"
                          title="Ajouter une largeur"
                        >
                          <Plus size={14} />
                        </button>
                      </th>
                      <th className="p-3 font-semibold text-muted-foreground text-center w-12">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {draft.typesParoi.map((tp, idx) => (
                      <tr key={tp.id} className="hover:bg-muted/10">
                        <td className="p-2.5 min-w-[280px]">
                          <input
                            type="text"
                            value={tp.nom}
                            onChange={(e) => {
                              const newTypes = [...draft.typesParoi];
                              newTypes[idx] = { ...tp, nom: e.target.value };
                              setDraft({ ...draft, typesParoi: newTypes });
                            }}
                            className="form-input w-full text-xs font-medium"
                            placeholder="Nom du type"
                          />
                        </td>
                        {curLargeurs.map((_, widthIdx) => (
                          <td key={widthIdx} className="p-2.5">
                            <div className="flex items-center justify-center">
                              <input
                                type="number"
                                min={0}
                                step={1}
                                value={tp.prixAchatHT[widthIdx] ?? 0}
                                onChange={(e) => {
                                  const newTypes = [...draft.typesParoi];
                                  const newPrix = [...tp.prixAchatHT];
                                  newPrix[widthIdx] = parseFloat(e.target.value) || 0;
                                  newTypes[idx] = { ...tp, prixAchatHT: newPrix };
                                  setDraft({ ...draft, typesParoi: newTypes });
                                }}
                                className="form-input w-24 text-center font-mono text-xs"
                              />
                            </div>
                          </td>
                        ))}
                        {/* Cellule vide pour la colonne "+" */}
                        <td className="p-2.5 bg-muted/5 border-l border-r border-dashed border-border"></td>
                        <td className="p-2.5 text-center">
                          <button
                            type="button"
                            onClick={() => handleRemoveType(tp.id)}
                            className="p-1.5 text-muted-foreground hover:text-destructive rounded hover:bg-muted transition-colors"
                            title="Supprimer ce type"
                          >
                            <Trash2 size={13} />
                          </button>
                        </td>
                      </tr>
                    ))}
                    {draft.typesParoi.length === 0 && (
                      <tr>
                        <td colSpan={3 + curLargeurs.length} className="p-6 text-center text-muted-foreground italic">
                          Aucun type de paroi configuré. Cliquez sur « Ajouter un type de paroi » pour commencer.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {tab === "couleurs" && (
            <OptionsList
              label="Couleurs / Finitions structure"
              options={draft.couleurs || []}
              onChange={(c) => setDraft({ ...draft, couleurs: c })}
            />
          )}

          {tab === "description" && (
            <div className="space-y-4">
              <div>
                <label className="form-label">Template de description pour le devis</label>
                <textarea
                  value={draft.templateDescription}
                  onChange={(e) => setDraft({ ...draft, templateDescription: e.target.value })}
                  className="form-input w-full font-mono text-[12px] leading-relaxed !h-36 min-h-[144px] resize-y"
                  placeholder="Gabarit de description du produit..."
                />
              </div>
              <div>
                <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground block mb-2">
                  Variables disponibles :
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {["{{nom}}", "{{type_paroi}}", "{{largeur}}", "{{hauteur}}", "{{couleur}}", "{{notes}}"].map((v) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => {
                        setDraft({ ...draft, templateDescription: draft.templateDescription + " " + v });
                      }}
                      className="px-2 py-1 bg-muted hover:bg-muted-foreground/15 border border-border text-muted-foreground text-[10px] font-mono rounded transition-colors"
                    >
                      {v}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-border bg-muted/10 rounded-b-xl">
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
  const [tab, setTab] = useState<"grille" | "options" | "poteaux" | "options_supp" | "description">("grille");

  const labels = getLabelsModele(draft.typeModele);

  useEffect(() => {
    if (tab === "poteaux" && !labels.showPoteaux) {
      setTab("grille");
    }
    if (tab === "options_supp" && labels.showPoteaux) {
      setTab("grille");
    }
  }, [labels.showPoteaux, tab]);

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
    { key: "options" as const, label: `${labels.toituresLabel} & Couleurs` },
    ...(!labels.showPoteaux ? [{ key: "options_supp" as const, label: "Option Supplémentaire" }] : []),
    ...(labels.showPoteaux ? [{ key: "poteaux" as const, label: "Poteaux" }] : []),
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
          <div className="flex flex-col md:flex-row gap-5">
            {/* Infos textuelles (gauche) */}
            <div className="flex-1 space-y-3">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="col-span-2">
                  <div className="flex items-center gap-2 mb-1">
                    <label className="form-label !mb-0">
                      Nom catalogue ORALIS * <span className="text-[10px] text-muted-foreground font-normal">(visible client)</span>
                    </label>
                    {draft.typeModele === "screen" || draft.typeModele === "volet" ? (
                      <span className="text-[9px] font-bold bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 px-1.5 py-0.5 rounded tracking-wide uppercase shrink-0">
                        SCREEN / VOLET
                      </span>
                    ) : (
                      <span className="text-[9px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400 px-1.5 py-0.5 rounded tracking-wide uppercase shrink-0">
                        PERGOLA
                      </span>
                    )}
                  </div>
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
              <div className="grid grid-cols-2 gap-3">
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
                  <label className="form-label">Type de dimensions</label>
                  <select
                    value={draft.typeDim}
                    onChange={(e) => setDraft({ ...draft, typeDim: e.target.value as any })}
                    className="form-input w-full"
                  >
                    <option value="largeur_profondeur">Largeur × Profondeur (pergolas, vérandas)</option>
                    <option value="largeur_hauteur">Largeur × Hauteur (screens, volets, parois)</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Photo / Image (droite) */}
            <div className="w-full md:w-44 shrink-0 flex flex-col justify-between">
              <label className="form-label">Photo du modèle</label>
              <div className="relative group flex items-center justify-center border border-border rounded-lg h-[88px] bg-card overflow-hidden hover:border-accent/50 transition-colors">
                {draft.image ? (
                  <>
                    <img src={draft.image} alt={draft.nom || "Modèle"} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center gap-2 transition-opacity">
                      <label className="p-1.5 text-white hover:text-accent rounded cursor-pointer transition-colors bg-black/40 hover:bg-black/60">
                        <Upload size={14} />
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={async (e) => {
                            const f = e.target.files?.[0];
                            if (f) {
                              try {
                                setDraft({ ...draft, image: await processImageFile(f) });
                              } catch {}
                            }
                          }}
                        />
                      </label>
                      <button
                        type="button"
                        onClick={() => setDraft({ ...draft, image: "" })}
                        className="p-1.5 text-white hover:text-destructive rounded transition-colors bg-black/40 hover:bg-black/60"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </>
                ) : (
                  <label className="flex flex-col items-center justify-center gap-1 w-full h-full cursor-pointer text-xs font-semibold text-muted-foreground hover:text-accent transition-colors">
                    <Camera size={18} />
                    <span>Ajouter photo</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={async (e) => {
                        const f = e.target.files?.[0];
                        if (f) {
                          try {
                            setDraft({ ...draft, image: await processImageFile(f) });
                          } catch {}
                        }
                      }}
                    />
                  </label>
                )}
              </div>
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
          {tab === "grille" && <GrilleEditor grille={draft.grille} onChange={(g) => setDraft({ ...draft, grille: g })} modelName={draft.nom} />}
          {tab === "options" && (
            <div>
              <OptionsList
                label={labels.toituresLabel}
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
            <ReglesPoteauxEditor
              regles={draft.reglesPoteau}
              onChange={(r) => setDraft({ ...draft, reglesPoteau: r })}
              sectionPoteaux={draft.sectionPoteaux || ""}
              onChangeSection={(s) => setDraft({ ...draft, sectionPoteaux: s })}
              tarifPoteauSuppHT={draft.tarifPoteauSuppHT || 0}
              onChangeTarif={(t) => setDraft({ ...draft, tarifPoteauSuppHT: t })}
            />
          )}
          {tab === "options_supp" && (
            <OptionsList
              label="Options supplémentaires"
              options={draft.optionsSupp || []}
              onChange={(opts) => setDraft({ ...draft, optionsSupp: opts })}
            />
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
  const [modeles, setModeles] = useState<AnyModele[]>([]);
  const [editingModele, setEditingModele] = useState<AnyModele | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<{
    isOpen: boolean;
    message: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    message: "",
    onConfirm: () => {},
  });

  useEffect(() => setModeles(loadModeles()), []);

  const save = (list: AnyModele[]) => {
    saveModeles(list);
    setModeles(list);
  };

  const handleMove = (index: number, direction: -1 | 1) => {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= modeles.length) return;
    const newModeles = [...modeles];
    const temp = newModeles[index];
    newModeles[index] = newModeles[targetIndex];
    newModeles[targetIndex] = temp;
    save(newModeles);
  };

  const handleSaveModele = (m: AnyModele) => {
    const idx = modeles.findIndex((x) => x.id === m.id);
    if (idx >= 0) save(modeles.map((x) => (x.id === m.id ? m : x)));
    else save([...modeles, m]);
    setEditingModele(null);
  };

  const handleDelete = (id: string) => {
    setConfirmDelete({
      isOpen: true,
      message: "Voulez-vous vraiment supprimer ce modèle et ses tarifs ?",
      onConfirm: () => {
        save(modeles.filter((m) => m.id !== id));
        toast.success("Modèle supprimé");
      },
    });
  };

  const handleDuplicate = (m: AnyModele) => {
    let duplicated: AnyModele;
    if (m.typeModele === "coulissant") {
      duplicated = {
        ...m,
        id: uid(),
        nom: `${m.nom} (copie)`,
        tarifsPanneau: m.tarifsPanneau.map((t) => ({ ...t, id: uid() })),
        options: m.options.map((o) => ({ ...o, id: uid() })),
        couleurs: (m.couleurs || []).map((c) => ({ ...c, id: uid() })),
      };
    } else if (m.typeModele === "paroi_fixe") {
      duplicated = {
        ...m,
        id: uid(),
        nom: `${m.nom} (copie)`,
        couleurs: (m.couleurs || []).map((c) => ({ ...c, id: uid() })),
      } as ModeleParoiFixe;
    } else if (m.typeModele === "paroi_avec_grille") {
      duplicated = {
        ...m,
        id: uid(),
        nom: `${m.nom} (copie)`,
        typesParoi: m.typesParoi.map((tp) => ({
          ...tp,
          id: uid(),
          largeurs: [...tp.largeurs],
          prixAchatHT: [...tp.prixAchatHT],
        })),
        couleurs: (m.couleurs || []).map((c) => ({ ...c, id: uid() })),
      } as ModeleParoiGrille;
    } else {
      duplicated = {
        ...m,
        id: uid(),
        nom: `${m.nom} (copie)`,
        grille: {
          ...m.grille,
          largeurs: [...m.grille.largeurs],
          profondeurs: [...m.grille.profondeurs],
          prixAchatHT: m.grille.prixAchatHT.map((row) => [...row]),
        },
        toitures: m.toitures.map((t) => ({ ...t, id: uid() })),
        couleurs: m.couleurs.map((c) => ({ ...c, id: uid() })),
        optionsSupp: (m.optionsSupp || []).map((o) => ({ ...o, id: uid() })),
        reglesPoteau: m.reglesPoteau.map((r) => ({ ...r })),
      } as ModelePergola;
    }
    save([...modeles, duplicated]);
    setEditingModele(duplicated);
    toast.success("Modèle dupliqué ! Modifiez-le ci-dessous.");
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="font-display text-[18px] font-semibold">Grilles de tarifs</h2>
          <p className="text-[12px] text-muted-foreground mt-0.5">
            Matrices de prix et tarifs unitaires par vantail — descriptions et configurations
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button onClick={() => setEditingModele(blankModele())} className="btn-gold flex items-center gap-2">
            <Plus size={15} /> Nouveau modèle pergola
          </button>
          <button onClick={() => setEditingModele(blankModeleMBPrime())} className="btn-ghost border border-border flex items-center gap-2 text-foreground">
            <Plus size={15} /> Nouveau modèle MB PRIME
          </button>
          <button onClick={() => setEditingModele(blankModeleScreen())} className="btn-ghost border border-border flex items-center gap-2 text-foreground">
            <Plus size={15} /> Nouveau modèle screen/volet
          </button>
          <button onClick={() => setEditingModele(blankModeleCoulissant())} className="btn-ghost border border-border flex items-center gap-2 text-foreground">
            <Plus size={15} /> Nouveau modèle coulissant
          </button>
          <button onClick={() => setEditingModele(blankModeleParoiGrille())} className="btn-ghost border border-border flex items-center gap-2 text-foreground">
            <Plus size={15} /> Nouveau modèle Paroi avec grille
          </button>
        </div>
      </div>

      {modeles.length === 0 ? (
        <div className="luxury-card p-12 text-center">
          <Grid3X3 size={40} className="mx-auto text-muted-foreground/20 mb-4" />
          <h3 className="font-display text-[16px] mb-2">Aucun modèle configuré</h3>
          <p className="text-[13px] text-muted-foreground mb-4">
            Créez votre premier modèle avec sa grille de prix pour accélérer le chiffrage.
          </p>
          <div className="flex gap-2 justify-center flex-wrap">
            <button onClick={() => setEditingModele(blankModele())} className="btn-gold inline-flex items-center gap-2">
              <Plus size={15} /> Créer un modèle pergola
            </button>
            <button onClick={() => setEditingModele(blankModeleMBPrime())} className="btn-ghost border border-border inline-flex items-center gap-2 text-foreground">
              <Plus size={15} /> Créer un modèle MB PRIME
            </button>
            <button onClick={() => setEditingModele(blankModeleScreen())} className="btn-ghost border border-border inline-flex items-center gap-2 text-foreground">
              <Plus size={15} /> Créer un modèle screen/volet
            </button>
            <button onClick={() => setEditingModele(blankModeleCoulissant())} className="btn-ghost border border-border inline-flex items-center gap-2 text-foreground">
              <Plus size={15} /> Créer un modèle coulissant
            </button>
            <button onClick={() => setEditingModele(blankModeleParoiGrille())} className="btn-ghost border border-border inline-flex items-center gap-2 text-foreground">
              <Plus size={15} /> Créer un modèle paroi avec grille
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {modeles.map((m, index) => {
            const isCoulissant = m.typeModele === "coulissant";
            return (
              <div key={m.id} className="bg-card border border-border rounded-lg p-4 shadow-[var(--shadow-card)] flex gap-4 items-center">
                {/* Boutons de tri (Monter / Descendre) */}
                <div className="flex flex-col shrink-0 gap-0.5">
                  <button
                    type="button"
                    onClick={() => handleMove(index, -1)}
                    disabled={index === 0}
                    className="text-muted-foreground hover:text-accent disabled:opacity-20 disabled:pointer-events-none transition-colors"
                    title="Monter le modèle"
                  >
                    <ChevronUp size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleMove(index, 1)}
                    disabled={index === modeles.length - 1}
                    className="text-muted-foreground hover:text-accent disabled:opacity-20 disabled:pointer-events-none transition-colors"
                    title="Descendre le modèle"
                  >
                    <ChevronDown size={14} />
                  </button>
                </div>

                {m.image && (
                  <div className="w-16 h-16 rounded border border-border overflow-hidden shrink-0 bg-muted/20">
                    <img src={m.image} alt={m.nom} className="w-full h-full object-cover" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <div className="font-medium text-[14px]">{m.nom || <span className="text-muted-foreground italic">Sans nom</span>}</div>
                        {m.nomFournisseur && (
                          <span className="text-[10px] bg-muted text-muted-foreground px-1.5 py-0.5 rounded font-mono">
                            {m.nomFournisseur}
                          </span>
                        )}
                        {m.typeModele === "coulissant" ? (
                          <span className="text-[9px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400 px-1.5 py-0.5 rounded tracking-wide uppercase shrink-0">
                            COULISSANT
                          </span>
                        ) : m.typeModele === "paroi_fixe" ? (
                          <span className="text-[9px] font-bold bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400 px-1.5 py-0.5 rounded tracking-wide uppercase shrink-0">
                            PAROI FIXE
                          </span>
                        ) : m.typeModele === "paroi_avec_grille" ? (
                          <span className="text-[9px] font-bold bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400 px-1.5 py-0.5 rounded tracking-wide uppercase shrink-0">
                            PAROI AVEC GRILLE
                          </span>
                        ) : m.typeModele === "screen" || m.typeModele === "volet" ? (
                          <span className="text-[9px] font-bold bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 px-1.5 py-0.5 rounded tracking-wide uppercase shrink-0">
                            SCREEN / VOLET
                          </span>
                        ) : (
                          <span className="text-[9px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400 px-1.5 py-0.5 rounded tracking-wide uppercase shrink-0">
                            PERGOLA
                          </span>
                        )}
                      </div>

                      {m.typeModele === "coulissant" ? (
                        (() => {
                          const mc = m as ModeleCoulissant;
                          return (
                            <>
                              <div className="text-[12px] text-muted-foreground mt-0.5">
                                {mc.fournisseurNom && <span>{mc.fournisseurNom} · </span>}
                                <span className="font-mono">{formatCoef(mc.margeDefaut)}</span>
                                {" · "}
                                <span>{mc.tarifsPanneau.length} tarif{mc.tarifsPanneau.length !== 1 ? "s" : ""}</span>
                                {" · "}
                                <span>vantaux {mc.vantauxMin}-{mc.vantauxMax}</span>
                                {" · "}
                                <span>{mc.options.length} option{mc.options.length !== 1 ? "s" : ""}</span>
                              </div>
                              <div className="flex gap-1 mt-2 flex-wrap">
                                {mc.tarifsPanneau.slice(0, 4).map((t, i) => (
                                  <span key={i} className="text-[10px] bg-accent/10 text-accent px-1.5 py-0.5 rounded font-mono">
                                    {t.label} ({t.prixHT}€)
                                  </span>
                                ))}
                                {mc.tarifsPanneau.length > 4 && (
                                  <span className="text-[10px] text-muted-foreground">+{mc.tarifsPanneau.length - 4}</span>
                                )}
                              </div>
                            </>
                          );
                        })()
                      ) : m.typeModele === "paroi_fixe" ? (
                        (() => {
                          const mf = m as ModeleParoiFixe;
                          return (
                            <>
                              <div className="text-[12px] text-muted-foreground mt-0.5">
                                {mf.fournisseurNom && <span>{mf.fournisseurNom} · </span>}
                                <span className="font-mono">{formatCoef(mf.margeDefaut)}</span>
                                {" · "}
                                <span>Tarification manuelle</span>
                                {" · "}
                                <span>{mf.couleurs?.length || 0} couleur{(mf.couleurs?.length || 0) !== 1 ? "s" : ""}</span>
                              </div>
                            </>
                          );
                        })()
                      ) : m.typeModele === "paroi_avec_grille" ? (
                        (() => {
                          const mg = m as ModeleParoiGrille;
                          return (
                            <>
                              <div className="text-[12px] text-muted-foreground mt-0.5">
                                {mg.fournisseurNom && <span>{mg.fournisseurNom} · </span>}
                                <span className="font-mono">{formatCoef(mg.margeDefaut)}</span>
                                {" · "}
                                <span>{mg.typesParoi?.length || 0} type{(mg.typesParoi?.length || 0) !== 1 ? "s" : ""} de paroi</span>
                                {" · "}
                                <span>{mg.couleurs?.length || 0} couleur{(mg.couleurs?.length || 0) !== 1 ? "s" : ""}</span>
                              </div>
                            </>
                          );
                        })()
                      ) : (
                        (() => {
                          const mp = m as ModelePergola;
                          return (
                            <>
                              <div className="text-[12px] text-muted-foreground mt-0.5">
                                {mp.fournisseurNom && <span>{mp.fournisseurNom} · </span>}
                                <span className="font-mono">{formatCoef(mp.margeDefaut)}</span>
                                {" · "}
                                <span>
                                  {mp.grille.largeurs.length} largeurs × {mp.grille.profondeurs.length} {mp.typeModele === "screen" || mp.typeModele === "volet" ? "hauteurs" : "profondeurs"}
                                </span>
                                {" · "}
                                <span>
                                  {mp.toitures.length} {mp.typeModele === "screen" || mp.typeModele === "volet" ? "toile" : "toiture"}{mp.toitures.length !== 1 ? "s" : ""}
                                </span>
                                {" · "}
                                <span>
                                  {mp.couleurs.length} couleur{mp.couleurs.length !== 1 ? "s" : ""}
                                </span>
                                {mp.reglesPoteau.length > 0 && (
                                  <span>
                                    {" "}
                                    · {mp.reglesPoteau.length} règle{mp.reglesPoteau.length !== 1 ? "s" : ""} poteaux
                                  </span>
                                )}
                              </div>
                              <div className="flex gap-1 mt-2 flex-wrap">
                                {mp.grille.largeurs.slice(0, 8).map((l, i) => (
                                  <span key={i} className="text-[10px] bg-accent/10 text-accent px-1.5 py-0.5 rounded font-mono">
                                    {mp.nom.toLowerCase().includes("prime") ? `${l} mm` : `${(l / 1000).toFixed(2).replace(".", ",")}m`}
                                  </span>
                                ))}
                                {mp.grille.largeurs.length > 8 && (
                                  <span className="text-[10px] text-muted-foreground">+{mp.grille.largeurs.length - 8}</span>
                                )}
                              </div>
                            </>
                          );
                        })()
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleDuplicate(m)}
                        className="btn-ghost !h-8 !text-[12px] flex items-center gap-1 border border-border"
                      >
                        <Copy size={13} /> Dupliquer
                      </button>
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
              </div>
            );
          })}
        </div>
      )}

      {editingModele && (
        editingModele.typeModele === "coulissant" ? (
          <ModeleCoulissantEditorModal
            modele={editingModele as ModeleCoulissant}
            fournisseurs={fournisseurs}
            onSave={handleSaveModele}
            onClose={() => setEditingModele(null)}
          />
        ) : editingModele.typeModele === "paroi_fixe" ? (
          <ModeleParoiFixeEditorModal
            modele={editingModele as ModeleParoiFixe}
            fournisseurs={fournisseurs}
            onSave={handleSaveModele}
            onClose={() => setEditingModele(null)}
          />
        ) : editingModele.typeModele === "paroi_avec_grille" ? (
          <ModeleParoiGrilleEditorModal
            modele={editingModele as ModeleParoiGrille}
            fournisseurs={fournisseurs}
            onSave={handleSaveModele}
            onClose={() => setEditingModele(null)}
          />
        ) : (
          <ModeleEditorModal
            modele={editingModele as ModelePergola}
            fournisseurs={fournisseurs}
            onSave={handleSaveModele}
            onClose={() => setEditingModele(null)}
          />
        )
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

// ── MAIN PAGE ─────────────────────────────────────────────────────────────────

export default function Fournisseurs() {
  const [fournisseurs, setFournisseurs] = useState<Fournisseur[]>([]);
  const [search, setSearch] = useState("");
  const [filterCat, setFilterCat] = useState("toutes");
  const [activeTab, setActiveTab] = useState<"fournisseurs" | "grilles">("fournisseurs");
  const [confirmDelete, setConfirmDelete] = useState<{
    isOpen: boolean;
    message: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    message: "",
    onConfirm: () => {},
  });

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
    setConfirmDelete({
      isOpen: true,
      message: "Voulez-vous vraiment supprimer ce fournisseur et tous ses tarifs ?",
      onConfirm: () => {
        save(fournisseurs.filter((f) => f.id !== id));
        toast.success("Fournisseur supprimé");
      },
    });
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
