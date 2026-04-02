import { useState, useCallback, useEffect } from "react";
import {
  Plus, Search, Pencil, Trash2, ChevronDown, ChevronRight,
  Truck, Package, X, Save, Euro,
} from "lucide-react";
import { toast } from "sonner";
import { formatEUR, uid } from "@/lib/quote-data";

// ── Types ──────────────────────────────────────────────────────────────────────

export interface ProduitFournisseur {
  id: string;
  designation: string;
  reference: string;
  categorie: string;
  prixAchatHT: number;   // prix d'achat au fournisseur
  prixVenteHT: number;   // prix de vente conseillé HT
  unite: string;         // "unité", "ml", "m²", ...
  notes: string;
}

export interface Fournisseur {
  id: string;
  nom: string;
  societe: string;
  email: string;
  telephone: string;
  adresse: string;
  categorie: string;    // "Pergola", "Store", "Brise-soleil", "Éclairage", ...
  notes: string;
  produits: ProduitFournisseur[];
  dateCreation: string;
}

// ── Storage ────────────────────────────────────────────────────────────────────

function loadFournisseurs(): Fournisseur[] {
  try { return JSON.parse(localStorage.getItem("oralis_fournisseurs") || "[]"); } catch { return []; }
}
function saveFournisseurs(data: Fournisseur[]) {
  localStorage.setItem("oralis_fournisseurs", JSON.stringify(data));
}

// ── Categories list ────────────────────────────────────────────────────────────

const CATEGORIES = [
  "Pergola bioclimatique", "Pergola aluminium", "Store banne", "Store vertical",
  "Brise-soleil", "Carport", "Toiture terrasse", "Éclairage LED",
  "Motorisation", "Bardage", "Autre",
];

// ── Blank helpers ──────────────────────────────────────────────────────────────

function blankFournisseur(): Fournisseur {
  return {
    id: uid(), nom: "", societe: "", email: "", telephone: "",
    adresse: "", categorie: "", notes: "",
    produits: [], dateCreation: new Date().toISOString().split("T")[0],
  };
}

function blankProduit(): ProduitFournisseur {
  return {
    id: uid(), designation: "", reference: "", categorie: "",
    prixAchatHT: 0, prixVenteHT: 0, unite: "unité", notes: "",
  };
}

// ── Margin badge ───────────────────────────────────────────────────────────────

function MarginBadge({ achat, vente }: { achat: number; vente: number }) {
  if (!achat || !vente) return null;
  const marge = ((vente - achat) / vente) * 100;
  const color = marge >= 40 ? "text-[hsl(150_45%_40%)] bg-[hsl(150_45%_40%/0.1)]"
    : marge >= 25 ? "text-[hsl(40_80%_45%)] bg-[hsl(40_80%_45%/0.1)]"
    : "text-destructive bg-destructive/10";
  return (
    <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold ${color}`}>
      {marge.toFixed(0)}% marge
    </span>
  );
}

// ── Produit row (inline editable) ──────────────────────────────────────────────

function ProduitRow({
  produit, onUpdate, onDelete,
}: {
  produit: ProduitFournisseur;
  onUpdate: (p: ProduitFournisseur) => void;
  onDelete: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(produit);

  const save = () => { onUpdate(draft); setEditing(false); };
  const cancel = () => { setDraft(produit); setEditing(false); };

  if (!editing) {
    return (
      <tr className="border-b border-border last:border-0 hover:bg-accent/5 transition-colors group">
        <td className="px-4 py-2 font-medium text-[13px]">{produit.designation || <span className="text-muted-foreground italic">—</span>}</td>
        <td className="px-4 py-2 text-[12px] text-muted-foreground font-mono">{produit.reference || "—"}</td>
        <td className="px-4 py-2 text-[12px]">{produit.categorie || "—"}</td>
        <td className="px-4 py-2 text-right font-mono text-[13px]">{formatEUR(produit.prixAchatHT)}</td>
        <td className="px-4 py-2 text-right font-mono text-[13px] font-semibold">{formatEUR(produit.prixVenteHT)}</td>
        <td className="px-4 py-2 text-center"><MarginBadge achat={produit.prixAchatHT} vente={produit.prixVenteHT} /></td>
        <td className="px-4 py-2 text-[12px] text-muted-foreground">{produit.unite}</td>
        <td className="px-4 py-2 text-right">
          <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
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
  }

  // Edit mode
  return (
    <tr className="border-b border-border bg-accent/5">
      <td className="px-2 py-1.5" colSpan={8}>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-2">
          <div>
            <label className="text-[10px] text-muted-foreground uppercase tracking-wide">Désignation *</label>
            <input value={draft.designation} onChange={(e) => setDraft({ ...draft, designation: e.target.value })}
              className="form-input !h-8 !text-[12px] w-full" placeholder="Nom du produit" />
          </div>
          <div>
            <label className="text-[10px] text-muted-foreground uppercase tracking-wide">Référence</label>
            <input value={draft.reference} onChange={(e) => setDraft({ ...draft, reference: e.target.value })}
              className="form-input !h-8 !text-[12px] w-full" placeholder="Réf. fournisseur" />
          </div>
          <div>
            <label className="text-[10px] text-muted-foreground uppercase tracking-wide">Catégorie</label>
            <input value={draft.categorie} onChange={(e) => setDraft({ ...draft, categorie: e.target.value })}
              className="form-input !h-8 !text-[12px] w-full" placeholder="Type" list="cat-list" />
            <datalist id="cat-list">{CATEGORIES.map((c) => <option key={c} value={c} />)}</datalist>
          </div>
          <div>
            <label className="text-[10px] text-muted-foreground uppercase tracking-wide">Unité</label>
            <select value={draft.unite} onChange={(e) => setDraft({ ...draft, unite: e.target.value })}
              className="form-input !h-8 !text-[12px] w-full">
              {["unité", "ml", "m²", "m³", "lot", "forfait"].map((u) => <option key={u} value={u}>{u}</option>)}
            </select>
          </div>
          <div>
            <label className="text-[10px] text-muted-foreground uppercase tracking-wide">Prix achat HT (€)</label>
            <input type="number" min={0} step={0.01} value={draft.prixAchatHT}
              onChange={(e) => setDraft({ ...draft, prixAchatHT: parseFloat(e.target.value) || 0 })}
              className="form-input !h-8 !text-[12px] w-full" />
          </div>
          <div>
            <label className="text-[10px] text-muted-foreground uppercase tracking-wide">Prix vente HT (€)</label>
            <input type="number" min={0} step={0.01} value={draft.prixVenteHT}
              onChange={(e) => setDraft({ ...draft, prixVenteHT: parseFloat(e.target.value) || 0 })}
              className="form-input !h-8 !text-[12px] w-full" />
          </div>
          <div className="flex items-end gap-1">
            <MarginBadge achat={draft.prixAchatHT} vente={draft.prixVenteHT} />
          </div>
          <div>
            <label className="text-[10px] text-muted-foreground uppercase tracking-wide">Notes</label>
            <input value={draft.notes} onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
              className="form-input !h-8 !text-[12px] w-full" placeholder="Optionnel" />
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={save} className="btn-gold !h-7 !text-[12px] flex items-center gap-1">
            <Save size={12} /> Enregistrer
          </button>
          <button onClick={cancel} className="btn-ghost !h-7 !text-[12px] border border-border">Annuler</button>
        </div>
      </td>
    </tr>
  );
}

// ── Fournisseur card / expandable row ─────────────────────────────────────────

function FournisseurRow({
  fournisseur, onUpdate, onDelete,
}: {
  fournisseur: Fournisseur;
  onUpdate: (f: Fournisseur) => void;
  onDelete: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(fournisseur);

  const saveInfo = () => { onUpdate({ ...draft, produits: fournisseur.produits }); setEditing(false); };

  const updateProduit = (p: ProduitFournisseur) => {
    const updated = fournisseur.produits.map((x) => (x.id === p.id ? p : x));
    onUpdate({ ...fournisseur, produits: updated });
  };
  const deleteProduit = (pid: string) => {
    onUpdate({ ...fournisseur, produits: fournisseur.produits.filter((p) => p.id !== pid) });
  };
  const addProduit = () => {
    onUpdate({ ...fournisseur, produits: [...fournisseur.produits, blankProduit()] });
    setExpanded(true);
  };

  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden shadow-[var(--shadow-card)] mb-3">
      {/* Header row */}
      <div className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-accent/5 transition-colors"
        onClick={() => setExpanded((v) => !v)}>
        <button className="text-muted-foreground shrink-0">
          {expanded ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
        </button>

        {/* Avatar */}
        <div className="w-9 h-9 rounded-full bg-accent/15 flex items-center justify-center text-accent font-semibold text-[13px] shrink-0">
          {(fournisseur.societe || fournisseur.nom).slice(0, 2).toUpperCase()}
        </div>

        <div className="flex-1 min-w-0">
          <div className="font-medium text-[14px] leading-tight truncate">
            {fournisseur.societe || fournisseur.nom || <span className="text-muted-foreground italic">Nouveau fournisseur</span>}
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
          {fournisseur.produits.length > 0 && (
            <span className="text-[11px] text-muted-foreground hidden md:block font-mono">
              à partir de {formatEUR(Math.min(...fournisseur.produits.map((p) => p.prixVenteHT).filter(Boolean)))}
            </span>
          )}
          <button
            onClick={(e) => { e.stopPropagation(); setEditing(true); setExpanded(true); }}
            className="p-1.5 rounded hover:bg-muted transition-colors" title="Modifier"
          >
            <Pencil size={14} className="text-muted-foreground" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
            className="p-1.5 rounded hover:bg-destructive/10 transition-colors" title="Supprimer"
          >
            <Trash2 size={14} className="text-destructive/70" />
          </button>
        </div>
      </div>

      {/* Expanded content */}
      {expanded && (
        <div className="border-t border-border">
          {/* Edit form */}
          {editing && (
            <div className="p-4 bg-accent/5 border-b border-border">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-3">
                <div>
                  <label className="form-label">Société</label>
                  <input value={draft.societe} onChange={(e) => setDraft({ ...draft, societe: e.target.value })}
                    className="form-input w-full" placeholder="Nom de la société" />
                </div>
                <div>
                  <label className="form-label">Contact (nom)</label>
                  <input value={draft.nom} onChange={(e) => setDraft({ ...draft, nom: e.target.value })}
                    className="form-input w-full" placeholder="Prénom Nom" />
                </div>
                <div>
                  <label className="form-label">Catégorie principale</label>
                  <input value={draft.categorie} onChange={(e) => setDraft({ ...draft, categorie: e.target.value })}
                    className="form-input w-full" placeholder="Ex: Pergola, Store..." list="cat-list-f" />
                  <datalist id="cat-list-f">{CATEGORIES.map((c) => <option key={c} value={c} />)}</datalist>
                </div>
                <div>
                  <label className="form-label">Téléphone</label>
                  <input value={draft.telephone} onChange={(e) => setDraft({ ...draft, telephone: e.target.value })}
                    className="form-input w-full" />
                </div>
                <div>
                  <label className="form-label">Email</label>
                  <input type="email" value={draft.email} onChange={(e) => setDraft({ ...draft, email: e.target.value })}
                    className="form-input w-full" />
                </div>
                <div>
                  <label className="form-label">Adresse</label>
                  <input value={draft.adresse} onChange={(e) => setDraft({ ...draft, adresse: e.target.value })}
                    className="form-input w-full" />
                </div>
                <div className="col-span-2 md:col-span-3">
                  <label className="form-label">Notes internes</label>
                  <textarea value={draft.notes} onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
                    className="form-input w-full !h-16 resize-none" />
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={saveInfo} className="btn-gold !h-8 !text-[12px] flex items-center gap-1">
                  <Save size={13} /> Enregistrer
                </button>
                <button onClick={() => { setDraft(fournisseur); setEditing(false); }}
                  className="btn-ghost !h-8 !text-[12px] border border-border">Annuler</button>
              </div>
            </div>
          )}

          {/* Contact info (read mode) */}
          {!editing && (fournisseur.email || fournisseur.telephone || fournisseur.adresse || fournisseur.notes) && (
            <div className="px-4 py-2 flex flex-wrap gap-x-6 gap-y-1 text-[12px] text-muted-foreground border-b border-border/50 bg-muted/20">
              {fournisseur.email    && <span>✉ {fournisseur.email}</span>}
              {fournisseur.telephone && <span>📞 {fournisseur.telephone}</span>}
              {fournisseur.adresse  && <span>📍 {fournisseur.adresse}</span>}
              {fournisseur.notes    && <span className="italic">💬 {fournisseur.notes}</span>}
            </div>
          )}

          {/* Products table */}
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
              <div className="px-4 py-4 text-[13px] text-muted-foreground italic">
                Aucun produit enregistré pour ce fournisseur.
              </div>
            )}
          </div>

          {/* Add product button */}
          <div className="px-4 py-2 border-t border-border/50">
            <button onClick={addProduit}
              className="flex items-center gap-2 text-[12px] text-accent hover:text-accent/80 font-medium transition-colors">
              <Plus size={14} /> Ajouter un produit / tarif
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// MAIN PAGE
// ══════════════════════════════════════════════════════════════════

export default function Fournisseurs() {
  const [fournisseurs, setFournisseurs] = useState<Fournisseur[]>([]);
  const [search, setSearch] = useState("");
  const [filterCat, setFilterCat] = useState("toutes");

  const reload = useCallback(() => setFournisseurs(loadFournisseurs()), []);
  useEffect(() => reload(), [reload]);

  const save = (list: Fournisseur[]) => { saveFournisseurs(list); setFournisseurs(list); };

  const addFournisseur = () => {
    const nf = blankFournisseur();
    const updated = [nf, ...fournisseurs];
    save(updated);
    toast.success("Nouveau fournisseur créé");
  };

  const updateFournisseur = (f: Fournisseur) => {
    save(fournisseurs.map((x) => (x.id === f.id ? f : x)));
  };

  const deleteFournisseur = (id: string) => {
    if (!confirm("Supprimer ce fournisseur et tous ses tarifs ?")) return;
    save(fournisseurs.filter((f) => f.id !== id));
    toast.success("Fournisseur supprimé");
  };

  // Computed categories for filter
  const allCats = Array.from(new Set(fournisseurs.map((f) => f.categorie).filter(Boolean)));

  const filtered = fournisseurs.filter((f) => {
    const txt = search.toLowerCase();
    const matchSearch = !txt
      || f.nom.toLowerCase().includes(txt)
      || f.societe.toLowerCase().includes(txt)
      || f.email.toLowerCase().includes(txt)
      || f.produits.some((p) => p.designation.toLowerCase().includes(txt));
    const matchCat = filterCat === "toutes" || f.categorie === filterCat;
    return matchSearch && matchCat;
  });

  // KPIs
  const totalProduits = fournisseurs.reduce((s, f) => s + f.produits.length, 0);
  const allPrix = fournisseurs.flatMap((f) => f.produits.map((p) => p.prixVenteHT)).filter(Boolean);
  const prixMoyen = allPrix.length ? allPrix.reduce((a, b) => a + b, 0) / allPrix.length : 0;

  return (
    <div className="p-6 lg:p-8 w-full">

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-[32px] font-semibold text-foreground tracking-tight">
            Fournisseurs
          </h1>
          <p className="text-[13px] text-muted-foreground mt-1 font-body">
            Base de tarifs fournisseurs pour le chiffrage
          </p>
        </div>
        <button onClick={addFournisseur} className="btn-gold flex items-center gap-2">
          <Plus size={16} /> Nouveau fournisseur
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="luxury-card !p-4 flex flex-col justify-between h-20 border-l-[3px] border-l-accent">
          <span className="text-[11px] uppercase tracking-wide text-muted-foreground font-body">Fournisseurs</span>
          <span className="font-display text-2xl text-accent">{fournisseurs.length}</span>
        </div>
        <div className="luxury-card !p-4 flex flex-col justify-between h-20 border-l-[3px] border-l-[hsl(220_60%_55%)]">
          <span className="text-[11px] uppercase tracking-wide text-muted-foreground font-body">Produits / tarifs</span>
          <span className="font-display text-2xl text-[hsl(220_60%_55%)]">{totalProduits}</span>
        </div>
        <div className="luxury-card !p-4 flex flex-col justify-between h-20 border-l-[3px] border-l-[hsl(var(--success))]">
          <span className="text-[11px] uppercase tracking-wide text-muted-foreground font-body">Prix de vente moyen HT</span>
          <span className="font-display text-2xl text-[hsl(var(--success))]">{formatEUR(prixMoyen)}</span>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-6 flex-wrap items-center">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <Search size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher fournisseur ou produit..."
            className="form-input pl-10 h-10 w-full rounded-lg shadow-[var(--shadow-card)]"
          />
        </div>
        {/* Category filter */}
        <div className="flex gap-1 flex-wrap">
          <button
            onClick={() => setFilterCat("toutes")}
            className={`px-3 py-1.5 text-[12px] rounded border font-body transition-colors
              ${filterCat === "toutes" ? "bg-accent text-accent-foreground border-accent" : "bg-card text-muted-foreground border-border hover:text-foreground"}`}
          >Toutes</button>
          {allCats.map((c) => (
            <button key={c} onClick={() => setFilterCat(c)}
              className={`px-3 py-1.5 text-[12px] rounded border font-body transition-colors
                ${filterCat === c ? "bg-accent text-accent-foreground border-accent" : "bg-card text-muted-foreground border-border hover:text-foreground"}`}>
              {c}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <div className="luxury-card p-16 text-center">
          <Truck size={48} className="mx-auto text-muted-foreground/20 mb-4" />
          <h2 className="font-display text-xl text-foreground mb-2">
            {fournisseurs.length === 0 ? "Aucun fournisseur" : "Aucun résultat"}
          </h2>
          <p className="text-sm text-muted-foreground mb-4">
            {fournisseurs.length === 0
              ? "Ajoutez vos fournisseurs et leurs tarifs pour accélérer le chiffrage."
              : "Affinez votre recherche ou modifiez le filtre."}
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
          <div className="mt-3 text-[12px] text-muted-foreground font-body">
            {filtered.length} fournisseur{filtered.length !== 1 ? "s" : ""} —{" "}
            {filtered.reduce((s, f) => s + f.produits.length, 0)} produit{filtered.reduce((s, f) => s + f.produits.length, 0) !== 1 ? "s" : ""}
          </div>
        </div>
      )}
    </div>
  );
}
