import { useState, useRef } from "react";
import { Plus, Trash2, Upload, Download, X } from "lucide-react";
import { toast } from "sonner";
import {
  loadSettings,
  saveSettings,
  formatEURCoeff,
  type AppSettings,
  type CoefficientRow,
  type FournisseurRemise,
  type CatalogProduct,
  type CatalogPose,
} from "@/lib/settings-data";
import { uid } from "@/lib/quote-data";

const inputCls = "w-full px-3 py-2 bg-card border border-border text-sm font-body focus:outline-none focus:ring-1 focus:ring-accent";
const labelCls = "block text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1";

export default function Settings() {
  const [settings, setSettings] = useState<AppSettings>(loadSettings);
  const [activeTab, setActiveTab] = useState<"entreprise" | "tarifs" | "bibliotheque">("entreprise");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const update = (patch: Partial<AppSettings>) => setSettings((s) => ({ ...s, ...patch }));
  const updateCompany = (patch: Partial<AppSettings["company"]>) =>
    update({ company: { ...settings.company, ...patch } });

  const handleSave = () => {
    saveSettings(settings);
    toast.success("Paramètres enregistrés");
  };

  const tabs = [
    { key: "entreprise" as const, label: "Entreprise" },
    { key: "tarifs" as const, label: "Tarifs" },
    { key: "bibliotheque" as const, label: "Bibliothèque" },
  ];

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <h1 className="font-display text-3xl font-semibold mb-1">Paramètres</h1>
      <p className="text-sm text-muted-foreground mb-8">Configuration de l'application ORALIS</p>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-border">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            className={`px-5 py-2.5 text-sm font-medium tracking-wide transition-colors -mb-px border-b-2 ${
              activeTab === t.key
                ? "border-accent text-accent"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {activeTab === "entreprise" && <EntrepriseTab settings={settings} update={update} updateCompany={updateCompany} fileInputRef={fileInputRef} />}
      {activeTab === "tarifs" && <TarifsTab settings={settings} update={update} />}
      {activeTab === "bibliotheque" && <BibliothequeTab settings={settings} update={update} />}

      {/* Save */}
      <div className="mt-8">
        <button onClick={handleSave} className="btn-gold">
          Enregistrer les paramètres
        </button>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════
// TAB 1 — ENTREPRISE
// ══════════════════════════════════════════════

function EntrepriseTab({
  settings,
  update,
  updateCompany,
  fileInputRef,
}: {
  settings: AppSettings;
  update: (p: Partial<AppSettings>) => void;
  updateCompany: (p: Partial<AppSettings["company"]>) => void;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
}) {
  const [docSubTab, setDocSubTab] = useState<"devis" | "facture">("devis");
  const c = settings.company;

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => update({ logo: reader.result as string });
    reader.readAsDataURL(file);
  };

  const docSettings = docSubTab === "devis" ? settings.documentDevis : settings.documentFacture;
  const updateDoc = (patch: Partial<AppSettings["documentDevis"]>) => {
    if (docSubTab === "devis") update({ documentDevis: { ...settings.documentDevis, ...patch } });
    else update({ documentFacture: { ...settings.documentFacture, ...patch } });
  };

  return (
    <div className="space-y-6">
      {/* Section A: Company details */}
      <section className="bg-card border border-border p-6">
        <h2 className="font-display text-lg font-semibold mb-4">Détails de l'entreprise</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className={labelCls}>Nom de l'entreprise</label>
            <input type="text" value={c.nom} onChange={(e) => updateCompany({ nom: e.target.value })} className={inputCls} />
          </div>
          <div className="md:col-span-2">
            <label className={labelCls}>Adresse (rue)</label>
            <input type="text" value={c.rue} onChange={(e) => updateCompany({ rue: e.target.value })} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Ville</label>
            <input type="text" value={c.ville} onChange={(e) => updateCompany({ ville: e.target.value })} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Code postal</label>
            <input type="text" value={c.codePostal} onChange={(e) => updateCompany({ codePostal: e.target.value })} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Pays</label>
            <input type="text" value={c.pays} onChange={(e) => updateCompany({ pays: e.target.value })} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Téléphone</label>
            <input type="tel" value={c.telephone} onChange={(e) => updateCompany({ telephone: e.target.value })} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Email</label>
            <input type="email" value={c.email} onChange={(e) => updateCompany({ email: e.target.value })} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Site web</label>
            <input type="text" value={c.siteWeb} onChange={(e) => updateCompany({ siteWeb: e.target.value })} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>SIRET</label>
            <input type="text" value={c.siret} onChange={(e) => updateCompany({ siret: e.target.value })} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>N° TVA intracommunautaire</label>
            <input type="text" value={c.tvaIntra} onChange={(e) => updateCompany({ tvaIntra: e.target.value })} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Forme juridique</label>
            <input type="text" value={c.formeJuridique} onChange={(e) => updateCompany({ formeJuridique: e.target.value })} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Capital social</label>
            <input type="text" value={c.capitalSocial} onChange={(e) => updateCompany({ capitalSocial: e.target.value })} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>RCS (ville)</label>
            <input type="text" value={c.rcsVille} onChange={(e) => updateCompany({ rcsVille: e.target.value })} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Mention garantie</label>
            <input type="text" value={c.mentionGarantie} onChange={(e) => updateCompany({ mentionGarantie: e.target.value })} className={inputCls} />
          </div>
          <div className="md:col-span-2">
            <label className={labelCls}>Mot de passe superviseur</label>
            <input type="password" value={c.motDePasse} onChange={(e) => updateCompany({ motDePasse: e.target.value })} className={inputCls} />
          </div>
        </div>
      </section>

      {/* Section B: Logo */}
      <section className="bg-card border border-border p-6">
        <h2 className="font-display text-lg font-semibold mb-4">Logo</h2>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg,image/svg+xml"
          className="hidden"
          onChange={handleLogoUpload}
        />
        {settings.logo ? (
          <div className="flex items-start gap-4">
            <img src={settings.logo} alt="Logo" className="w-24 h-24 object-contain border border-border p-2" />
            <button
              onClick={() => update({ logo: "" })}
              className="text-sm text-destructive hover:underline flex items-center gap-1"
            >
              <X size={14} /> Supprimer le logo
            </button>
          </div>
        ) : (
          <button
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-border px-8 py-6 text-sm text-muted-foreground hover:border-accent hover:text-accent transition-colors flex flex-col items-center gap-2"
          >
            <Upload size={24} />
            Cliquez pour uploader un logo
            <span className="text-xs">PNG, JPG, SVG — 300×300px recommandé</span>
          </button>
        )}
      </section>

      {/* Section C: Document customization */}
      <section className="bg-card border border-border p-6">
        <h2 className="font-display text-lg font-semibold mb-4">Personnaliser les documents</h2>
        <div className="flex gap-2 mb-4">
          {(["devis", "facture"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setDocSubTab(t)}
              className={`px-4 py-1.5 text-sm border transition-colors ${
                docSubTab === t
                  ? "bg-accent text-accent-foreground border-accent"
                  : "border-border text-muted-foreground hover:bg-muted"
              }`}
            >
              {t === "devis" ? "Devis" : "Facture"}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className={labelCls}>En-tête personnalisé</label>
            <textarea value={docSettings.enTete} onChange={(e) => updateDoc({ enTete: e.target.value })} className={`${inputCls} resize-none`} rows={2} />
          </div>
          <div className="md:col-span-2">
            <label className={labelCls}>Pied de page personnalisé</label>
            <textarea value={docSettings.piedDePage} onChange={(e) => updateDoc({ piedDePage: e.target.value })} className={`${inputCls} resize-none`} rows={2} />
          </div>
          <div>
            <label className={labelCls}>Couleur principale</label>
            <div className="flex items-center gap-2">
              <input type="color" value={docSettings.couleurPrincipale} onChange={(e) => updateDoc({ couleurPrincipale: e.target.value })} className="w-10 h-10 border border-border cursor-pointer" />
              <span className="text-sm text-muted-foreground">{docSettings.couleurPrincipale}</span>
            </div>
          </div>
          <div>
            <label className={labelCls}>Couleur secondaire</label>
            <div className="flex items-center gap-2">
              <input type="color" value={docSettings.couleurSecondaire} onChange={(e) => updateDoc({ couleurSecondaire: e.target.value })} className="w-10 h-10 border border-border cursor-pointer" />
              <span className="text-sm text-muted-foreground">{docSettings.couleurSecondaire}</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <label className="text-sm">Afficher le logo</label>
            <button
              onClick={() => updateDoc({ afficherLogo: !docSettings.afficherLogo })}
              className={`w-10 h-5 rounded-full transition-colors ${docSettings.afficherLogo ? "bg-accent" : "bg-border"}`}
            >
              <div className={`w-4 h-4 rounded-full bg-card transition-transform ${docSettings.afficherLogo ? "translate-x-5" : "translate-x-0.5"}`} />
            </button>
          </div>
          <div className="flex items-center gap-3">
            <label className="text-sm">Afficher la photo du produit</label>
            <button
              onClick={() => updateDoc({ afficherPhoto: !docSettings.afficherPhoto })}
              className={`w-10 h-5 rounded-full transition-colors ${docSettings.afficherPhoto ? "bg-accent" : "bg-border"}`}
            >
              <div className={`w-4 h-4 rounded-full bg-card transition-transform ${docSettings.afficherPhoto ? "translate-x-5" : "translate-x-0.5"}`} />
            </button>
          </div>
          <div className="md:col-span-2">
            <label className={labelCls}>Mention légale personnalisée</label>
            <textarea value={docSettings.mentionLegale} onChange={(e) => updateDoc({ mentionLegale: e.target.value })} className={`${inputCls} resize-none`} rows={2} placeholder="Laisser vide pour utiliser la mention par défaut" />
          </div>
          <div className="flex items-center gap-3">
            <label className="text-sm">Zone de signature</label>
            <button
              onClick={() => updateDoc({ zoneSignature: !docSettings.zoneSignature })}
              className={`w-10 h-5 rounded-full transition-colors ${docSettings.zoneSignature ? "bg-accent" : "bg-border"}`}
            >
              <div className={`w-4 h-4 rounded-full bg-card transition-transform ${docSettings.zoneSignature ? "translate-x-5" : "translate-x-0.5"}`} />
            </button>
          </div>
          <div />
          <div>
            <label className={labelCls}>Texte signature client</label>
            <input type="text" value={docSettings.texteSignatureClient} onChange={(e) => updateDoc({ texteSignatureClient: e.target.value })} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Texte signature entreprise</label>
            <input type="text" value={docSettings.texteSignatureEntreprise} onChange={(e) => updateDoc({ texteSignatureEntreprise: e.target.value })} className={inputCls} />
          </div>
        </div>
      </section>
    </div>
  );
}

// ══════════════════════════════════════════════
// TAB 2 — TARIFS
// ══════════════════════════════════════════════

function TarifsTab({
  settings,
  update,
}: {
  settings: AppSettings;
  update: (p: Partial<AppSettings>) => void;
}) {
  const updateCoeff = (id: string, patch: Partial<CoefficientRow>) =>
    update({ coefficients: settings.coefficients.map((c) => (c.id === id ? { ...c, ...patch } : c)) });

  const updateRemise = (id: string, patch: Partial<FournisseurRemise>) =>
    update({ fournisseurRemises: settings.fournisseurRemises.map((r) => (r.id === id ? { ...r, ...patch } : r)) });

  return (
    <div className="space-y-6">
      {/* Section A: Coefficients */}
      <section className="bg-card border border-border p-6">
        <h2 className="font-display text-lg font-semibold mb-2">Coefficients de vente</h2>
        <p className="text-sm text-muted-foreground mb-4">
          Le coefficient multiplie le prix d'achat pour calculer le prix de vente HT
        </p>
        <div className="overflow-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-2 text-xs uppercase tracking-wider text-muted-foreground font-medium">Catégorie</th>
                <th className="text-center py-2 text-xs uppercase tracking-wider text-muted-foreground font-medium w-28">Coefficient</th>
                <th className="text-right py-2 text-xs uppercase tracking-wider text-muted-foreground font-medium w-40">Prix exemple PA 1 000 € → PV HT</th>
                <th className="w-10" />
              </tr>
            </thead>
            <tbody>
              {settings.coefficients.map((row) => (
                <tr key={row.id} className="border-b border-border last:border-0">
                  <td className="py-2 pr-3">
                    <input
                      type="text"
                      value={row.categorie}
                      onChange={(e) => updateCoeff(row.id, { categorie: e.target.value })}
                      className={inputCls}
                    />
                  </td>
                  <td className="py-2 px-2">
                    <input
                      type="number"
                      step={0.01}
                      min={0}
                      value={row.coefficient}
                      onChange={(e) => updateCoeff(row.id, { coefficient: Number(e.target.value) || 0 })}
                      className={`${inputCls} text-center`}
                    />
                  </td>
                  <td className="py-2 pl-3 text-right text-muted-foreground">
                    → {formatEURCoeff(1000, row.coefficient)}
                  </td>
                  <td className="py-2 pl-1">
                    <button
                      onClick={() => update({ coefficients: settings.coefficients.filter((c) => c.id !== row.id) })}
                      className="p-1 text-destructive hover:bg-destructive/10 transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <button
          onClick={() => update({ coefficients: [...settings.coefficients, { id: uid(), categorie: "", coefficient: 1 }] })}
          className="mt-3 text-xs text-accent hover:underline flex items-center gap-1"
        >
          <Plus size={12} /> Ajouter une catégorie
        </button>
      </section>

      {/* Section B: TVA Rates */}
      <section className="bg-card border border-border p-6">
        <h2 className="font-display text-lg font-semibold mb-4">Taux de TVA disponibles</h2>
        <div className="space-y-3">
          {settings.tvaRates.map((tva, i) => (
            <div key={tva.rate} className="flex items-center gap-4">
              <button
                onClick={() => {
                  const newRates = [...settings.tvaRates];
                  newRates[i] = { ...newRates[i], enabled: !newRates[i].enabled };
                  update({ tvaRates: newRates });
                }}
                className={`w-10 h-5 rounded-full transition-colors ${tva.enabled ? "bg-accent" : "bg-border"}`}
              >
                <div className={`w-4 h-4 rounded-full bg-card transition-transform ${tva.enabled ? "translate-x-5" : "translate-x-0.5"}`} />
              </button>
              <span className="text-sm">{tva.label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Section C: Supplier Discounts */}
      <section className="bg-card border border-border p-6">
        <h2 className="font-display text-lg font-semibold mb-4">Remises fournisseurs globales</h2>
        {settings.fournisseurRemises.length > 0 && (
          <table className="w-full text-sm mb-3">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-2 text-xs uppercase tracking-wider text-muted-foreground font-medium">Fournisseur</th>
                <th className="text-center py-2 text-xs uppercase tracking-wider text-muted-foreground font-medium w-24">Remise %</th>
                <th className="text-left py-2 text-xs uppercase tracking-wider text-muted-foreground font-medium">Notes</th>
                <th className="w-10" />
              </tr>
            </thead>
            <tbody>
              {settings.fournisseurRemises.map((r) => (
                <tr key={r.id} className="border-b border-border last:border-0">
                  <td className="py-2 pr-2">
                    <input type="text" value={r.fournisseur} onChange={(e) => updateRemise(r.id, { fournisseur: e.target.value })} className={inputCls} />
                  </td>
                  <td className="py-2 px-2">
                    <input type="number" min={0} max={100} value={r.remise} onChange={(e) => updateRemise(r.id, { remise: Number(e.target.value) || 0 })} className={`${inputCls} text-center`} />
                  </td>
                  <td className="py-2 px-2">
                    <input type="text" value={r.notes} onChange={(e) => updateRemise(r.id, { notes: e.target.value })} className={inputCls} />
                  </td>
                  <td className="py-2 pl-1">
                    <button onClick={() => update({ fournisseurRemises: settings.fournisseurRemises.filter((x) => x.id !== r.id) })} className="p-1 text-destructive hover:bg-destructive/10 transition-colors">
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <button
          onClick={() => update({ fournisseurRemises: [...settings.fournisseurRemises, { id: uid(), fournisseur: "", remise: 0, notes: "" }] })}
          className="text-xs text-accent hover:underline flex items-center gap-1"
        >
          <Plus size={12} /> Ajouter un fournisseur
        </button>
      </section>
    </div>
  );
}

// ══════════════════════════════════════════════
// TAB 3 — BIBLIOTHÈQUE
// ══════════════════════════════════════════════

function BibliothequeTab({
  settings,
  update,
}: {
  settings: AppSettings;
  update: (p: Partial<AppSettings>) => void;
}) {
  const [subTab, setSubTab] = useState<"produits" | "pose">("produits");
  const [search, setSearch] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFileImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    try {
      // Simple CSV parsing
      const lines = text.split("\n").filter((l) => l.trim());
      if (lines.length < 2) { toast.error("Fichier vide ou invalide"); return; }

      const headers = lines[0].split(/[;\t,]/).map((h) => h.trim().toLowerCase());

      if (subTab === "produits") {
        const products: CatalogProduct[] = lines.slice(1).map((line) => {
          const cols = line.split(/[;\t,]/).map((c) => c.trim());
          return {
            id: uid(),
            reference: cols[headers.indexOf("référence")] || cols[headers.indexOf("reference")] || cols[0] || "",
            designation: cols[headers.indexOf("désignation")] || cols[headers.indexOf("designation")] || cols[1] || "",
            description: cols[headers.indexOf("description")] || cols[2] || "",
            prixAchatHT: parseFloat(cols[headers.indexOf("prix achat ht")] || cols[3] || "0") || 0,
            categorie: cols[headers.indexOf("catégorie")] || cols[headers.indexOf("categorie")] || cols[4] || "",
            fournisseur: cols[headers.indexOf("fournisseur")] || cols[5] || "",
            unite: cols[headers.indexOf("unité")] || cols[headers.indexOf("unite")] || cols[6] || "unité",
          };
        }).filter((p) => p.designation);
        update({ catalogProduits: [...settings.catalogProduits, ...products] });
        toast.success(`${products.length} produits importés`);
      } else {
        const poses: CatalogPose[] = lines.slice(1).map((line) => {
          const cols = line.split(/[;\t,]/).map((c) => c.trim());
          return {
            id: uid(),
            typePose: cols[0] || "",
            description: cols[1] || "",
            unite: cols[2] || "m²",
            prixUnitaireHT: parseFloat(cols[3] || "0") || 0,
            dureeEstimee: parseFloat(cols[4] || "0") || 0,
          };
        }).filter((p) => p.typePose);
        update({ catalogPose: [...settings.catalogPose, ...poses] });
        toast.success(`${poses.length} tarifs pose importés`);
      }
    } catch {
      toast.error("Erreur lors de l'import du fichier");
    }
    if (fileRef.current) fileRef.current.value = "";
  };

  const downloadTemplate = () => {
    const content = subTab === "produits"
      ? "Référence;Désignation;Description;Prix achat HT;Catégorie;Fournisseur;Unité\nREF-001;Pergola Standard;Modèle 4x3m;5000;Pergolas bioclimatiques;Fournisseur A;unité"
      : "Type de pose;Description;Unité;Prix unitaire HT;Durée estimée (h)\nPose standard;Installation pergola;m²;45;8";
    const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = subTab === "produits" ? "modele-produits.csv" : "modele-pose.csv";
    link.click();
  };

  const filteredProduits = settings.catalogProduits.filter(
    (p) => p.designation.toLowerCase().includes(search.toLowerCase()) || p.reference.toLowerCase().includes(search.toLowerCase())
  );
  const filteredPose = settings.catalogPose.filter(
    (p) => p.typePose.toLowerCase().includes(search.toLowerCase())
  );

  const getCoeffForCategory = (cat: string) => {
    const found = settings.coefficients.find((c) => c.categorie.toLowerCase() === cat.toLowerCase());
    return found ? found.coefficient : 1;
  };

  return (
    <div className="space-y-6">
      {/* Sub-tabs */}
      <div className="flex gap-2">
        {(["produits", "pose"] as const).map((t) => (
          <button
            key={t}
            onClick={() => { setSubTab(t); setSearch(""); }}
            className={`px-4 py-1.5 text-sm border transition-colors ${
              subTab === t
                ? "bg-accent text-accent-foreground border-accent"
                : "border-border text-muted-foreground hover:bg-muted"
            }`}
          >
            {t === "produits" ? "Tarifs Produits" : "Tarifs Pose"}
          </button>
        ))}
      </div>

      {/* Import section */}
      <section className="bg-card border border-border p-6">
        <h2 className="font-display text-lg font-semibold mb-4">Importer</h2>
        <input ref={fileRef} type="file" accept=".csv,.xls,.xlsx" className="hidden" onChange={handleFileImport} />
        <div
          onClick={() => fileRef.current?.click()}
          className="border-2 border-dashed border-border p-8 text-center cursor-pointer hover:border-accent transition-colors mb-4"
        >
          <Upload size={24} className="mx-auto mb-2 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Glissez votre fichier ici ou cliquez pour parcourir</p>
          <p className="text-xs text-muted-foreground mt-1">CSV, XLS, XLSX</p>
        </div>
        <button
          onClick={downloadTemplate}
          className="text-xs text-accent hover:underline flex items-center gap-1"
        >
          <Download size={12} /> Télécharger le modèle Excel
        </button>
      </section>

      {/* Product table */}
      <section className="bg-card border border-border p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-lg font-semibold">
            {subTab === "produits"
              ? `${settings.catalogProduits.length} produits importés`
              : `${settings.catalogPose.length} tarifs pose`}
          </h2>
          {((subTab === "produits" && settings.catalogProduits.length > 0) || (subTab === "pose" && settings.catalogPose.length > 0)) && (
            <button
              onClick={() => {
                if (confirm("Supprimer tous les éléments ?")) {
                  if (subTab === "produits") update({ catalogProduits: [] });
                  else update({ catalogPose: [] });
                }
              }}
              className="text-xs text-destructive hover:underline"
            >
              Tout supprimer
            </button>
          )}
        </div>

        {((subTab === "produits" && settings.catalogProduits.length > 0) || (subTab === "pose" && settings.catalogPose.length > 0)) && (
          <input
            type="text"
            placeholder="Rechercher..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={`${inputCls} mb-4`}
          />
        )}

        {subTab === "produits" ? (
          filteredProduits.length > 0 ? (
            <div className="overflow-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-2 text-xs uppercase tracking-wider text-muted-foreground font-medium">Référence</th>
                    <th className="text-left py-2 text-xs uppercase tracking-wider text-muted-foreground font-medium">Désignation</th>
                    <th className="text-right py-2 text-xs uppercase tracking-wider text-muted-foreground font-medium">Prix achat HT</th>
                    <th className="text-left py-2 text-xs uppercase tracking-wider text-muted-foreground font-medium">Catégorie</th>
                    <th className="text-left py-2 text-xs uppercase tracking-wider text-muted-foreground font-medium">Fournisseur</th>
                    <th className="text-right py-2 text-xs uppercase tracking-wider text-muted-foreground font-medium">Prix vente HT</th>
                    <th className="w-10" />
                  </tr>
                </thead>
                <tbody>
                  {filteredProduits.map((p) => (
                    <tr key={p.id} className="border-b border-border last:border-0">
                      <td className="py-2 pr-2">{p.reference}</td>
                      <td className="py-2 pr-2">{p.designation}</td>
                      <td className="py-2 pr-2 text-right">{formatEURCoeff(p.prixAchatHT, 1)}</td>
                      <td className="py-2 pr-2">{p.categorie}</td>
                      <td className="py-2 pr-2">{p.fournisseur}</td>
                      <td className="py-2 pr-2 text-right font-medium">{formatEURCoeff(p.prixAchatHT, getCoeffForCategory(p.categorie))}</td>
                      <td className="py-2">
                        <button onClick={() => update({ catalogProduits: settings.catalogProduits.filter((x) => x.id !== p.id) })} className="p-1 text-destructive hover:bg-destructive/10 transition-colors">
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-8">Aucun produit importé</p>
          )
        ) : (
          filteredPose.length > 0 ? (
            <div className="overflow-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-2 text-xs uppercase tracking-wider text-muted-foreground font-medium">Type de pose</th>
                    <th className="text-left py-2 text-xs uppercase tracking-wider text-muted-foreground font-medium">Description</th>
                    <th className="text-center py-2 text-xs uppercase tracking-wider text-muted-foreground font-medium">Unité</th>
                    <th className="text-right py-2 text-xs uppercase tracking-wider text-muted-foreground font-medium">Prix unitaire HT</th>
                    <th className="text-center py-2 text-xs uppercase tracking-wider text-muted-foreground font-medium">Durée (h)</th>
                    <th className="w-10" />
                  </tr>
                </thead>
                <tbody>
                  {filteredPose.map((p) => (
                    <tr key={p.id} className="border-b border-border last:border-0">
                      <td className="py-2 pr-2">{p.typePose}</td>
                      <td className="py-2 pr-2">{p.description}</td>
                      <td className="py-2 text-center">{p.unite}</td>
                      <td className="py-2 text-right">{formatEURCoeff(p.prixUnitaireHT, 1)}</td>
                      <td className="py-2 text-center">{p.dureeEstimee}</td>
                      <td className="py-2">
                        <button onClick={() => update({ catalogPose: settings.catalogPose.filter((x) => x.id !== p.id) })} className="p-1 text-destructive hover:bg-destructive/10 transition-colors">
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-8">Aucun tarif pose importé</p>
          )
        )}
      </section>
    </div>
  );
}
