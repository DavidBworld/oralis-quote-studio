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
    <div className="p-6 lg:p-8 max-w-3xl mx-auto">
      <h1 className="font-display text-[28px] font-semibold mb-1 tracking-tight">Paramètres</h1>
      <p className="text-[13px] text-muted-foreground mb-8 font-body">Configuration de l'application ORALIS</p>

      {/* Tabs */}
      <div className="flex gap-0 mb-8 border-b border-border">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            className={`px-6 py-3 text-[13px] font-medium tracking-wide transition-all duration-200 -mb-px border-b-2 ${
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
      <section className="luxury-card">
        <h2 className="section-title">Détails de l'entreprise</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className="form-label">Nom de l'entreprise</label>
            <input type="text" value={c.nom} onChange={(e) => updateCompany({ nom: e.target.value })} className="form-input" />
          </div>
          <div className="md:col-span-2">
            <label className="form-label">Adresse (rue)</label>
            <input type="text" value={c.rue} onChange={(e) => updateCompany({ rue: e.target.value })} className="form-input" />
          </div>
          <div>
            <label className="form-label">Ville</label>
            <input type="text" value={c.ville} onChange={(e) => updateCompany({ ville: e.target.value })} className="form-input" />
          </div>
          <div>
            <label className="form-label">Code postal</label>
            <input type="text" value={c.codePostal} onChange={(e) => updateCompany({ codePostal: e.target.value })} className="form-input" />
          </div>
          <div>
            <label className="form-label">Pays</label>
            <input type="text" value={c.pays} onChange={(e) => updateCompany({ pays: e.target.value })} className="form-input" />
          </div>
          <div>
            <label className="form-label">Téléphone</label>
            <input type="tel" value={c.telephone} onChange={(e) => updateCompany({ telephone: e.target.value })} className="form-input" />
          </div>
          <div>
            <label className="form-label">Email</label>
            <input type="email" value={c.email} onChange={(e) => updateCompany({ email: e.target.value })} className="form-input" />
          </div>
          <div>
            <label className="form-label">Site web</label>
            <input type="text" value={c.siteWeb} onChange={(e) => updateCompany({ siteWeb: e.target.value })} className="form-input" />
          </div>
          <div>
            <label className="form-label">SIRET</label>
            <input type="text" value={c.siret} onChange={(e) => updateCompany({ siret: e.target.value })} className="form-input" />
          </div>
          <div>
            <label className="form-label">N° TVA intracommunautaire</label>
            <input type="text" value={c.tvaIntra} onChange={(e) => updateCompany({ tvaIntra: e.target.value })} className="form-input" />
          </div>
          <div>
            <label className="form-label">Forme juridique</label>
            <input type="text" value={c.formeJuridique} onChange={(e) => updateCompany({ formeJuridique: e.target.value })} className="form-input" />
          </div>
          <div>
            <label className="form-label">Capital social</label>
            <input type="text" value={c.capitalSocial} onChange={(e) => updateCompany({ capitalSocial: e.target.value })} className="form-input" />
          </div>
          <div>
            <label className="form-label">RCS (ville)</label>
            <input type="text" value={c.rcsVille} onChange={(e) => updateCompany({ rcsVille: e.target.value })} className="form-input" />
          </div>
          <div>
            <label className="form-label">Mention garantie</label>
            <input type="text" value={c.mentionGarantie} onChange={(e) => updateCompany({ mentionGarantie: e.target.value })} className="form-input" />
          </div>
          <div className="md:col-span-2">
            <label className="form-label">Mot de passe superviseur</label>
            <input type="password" value={c.motDePasse} onChange={(e) => updateCompany({ motDePasse: e.target.value })} className="form-input" />
          </div>
        </div>
      </section>

      {/* Section B: Logo */}
      <section className="luxury-card">
        <h2 className="section-title">Logo</h2>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg,image/svg+xml"
          className="hidden"
          onChange={handleLogoUpload}
        />
        {settings.logo ? (
          <div className="flex items-start gap-4">
            <img src={settings.logo} alt="Logo" className="w-24 h-24 object-contain border border-border p-2 rounded-lg bg-background" />
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
            className="border-2 border-dashed border-border px-8 py-8 text-sm text-muted-foreground hover:border-accent hover:text-accent transition-all duration-200 flex flex-col items-center gap-2 rounded-lg"
          >
            <Upload size={28} className="text-accent/50" />
            <span className="font-medium">Cliquez pour uploader un logo</span>
            <span className="text-xs text-muted-foreground/70">PNG, JPG, SVG — 300×300px recommandé</span>
          </button>
        )}
      </section>

      {/* Section C: Document customization */}
      <section className="luxury-card">
        <h2 className="section-title">Personnaliser les documents</h2>
        <div className="flex gap-2 mb-5">
          {(["devis", "facture"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setDocSubTab(t)}
              className={`px-4 py-2 text-[13px] rounded border transition-all duration-200 ${
                docSubTab === t
                  ? "bg-accent text-accent-foreground border-accent shadow-sm"
                  : "border-border text-muted-foreground hover:border-accent/50"
              }`}
            >
              {t === "devis" ? "Devis" : "Facture"}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className="form-label">En-tête personnalisé</label>
            <textarea value={docSettings.enTete} onChange={(e) => updateDoc({ enTete: e.target.value })} className="form-input resize-none" rows={2} />
          </div>
          <div className="md:col-span-2">
            <label className="form-label">Pied de page personnalisé</label>
            <textarea value={docSettings.piedDePage} onChange={(e) => updateDoc({ piedDePage: e.target.value })} className="form-input resize-none" rows={2} />
          </div>
          <div>
            <label className="form-label">Couleur principale</label>
            <div className="flex items-center gap-3">
              <input type="color" value={docSettings.couleurPrincipale} onChange={(e) => updateDoc({ couleurPrincipale: e.target.value })} className="w-10 h-10 border border-border cursor-pointer rounded" />
              <span className="text-sm text-muted-foreground font-mono">{docSettings.couleurPrincipale}</span>
            </div>
          </div>
          <div>
            <label className="form-label">Couleur secondaire</label>
            <div className="flex items-center gap-3">
              <input type="color" value={docSettings.couleurSecondaire} onChange={(e) => updateDoc({ couleurSecondaire: e.target.value })} className="w-10 h-10 border border-border cursor-pointer rounded" />
              <span className="text-sm text-muted-foreground font-mono">{docSettings.couleurSecondaire}</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <label className="text-sm font-medium">Afficher le logo</label>
            <button
              onClick={() => updateDoc({ afficherLogo: !docSettings.afficherLogo })}
              className={`w-11 h-6 rounded-full transition-colors ${docSettings.afficherLogo ? "bg-accent" : "bg-border"}`}
            >
              <div className={`w-5 h-5 rounded-full bg-card transition-transform shadow-sm ${docSettings.afficherLogo ? "translate-x-5" : "translate-x-0.5"}`} />
            </button>
          </div>
          <div className="flex items-center gap-3">
            <label className="text-sm font-medium">Afficher la photo du produit</label>
            <button
              onClick={() => updateDoc({ afficherPhoto: !docSettings.afficherPhoto })}
              className={`w-11 h-6 rounded-full transition-colors ${docSettings.afficherPhoto ? "bg-accent" : "bg-border"}`}
            >
              <div className={`w-5 h-5 rounded-full bg-card transition-transform shadow-sm ${docSettings.afficherPhoto ? "translate-x-5" : "translate-x-0.5"}`} />
            </button>
          </div>
          <div className="md:col-span-2">
            <label className="form-label">Mention légale personnalisée</label>
            <textarea value={docSettings.mentionLegale} onChange={(e) => updateDoc({ mentionLegale: e.target.value })} className="form-input resize-none" rows={2} placeholder="Laisser vide pour utiliser la mention par défaut" />
          </div>
          <div className="flex items-center gap-3">
            <label className="text-sm font-medium">Zone de signature</label>
            <button
              onClick={() => updateDoc({ zoneSignature: !docSettings.zoneSignature })}
              className={`w-11 h-6 rounded-full transition-colors ${docSettings.zoneSignature ? "bg-accent" : "bg-border"}`}
            >
              <div className={`w-5 h-5 rounded-full bg-card transition-transform shadow-sm ${docSettings.zoneSignature ? "translate-x-5" : "translate-x-0.5"}`} />
            </button>
          </div>
          <div />
          <div>
            <label className="form-label">Texte signature client</label>
            <input type="text" value={docSettings.texteSignatureClient} onChange={(e) => updateDoc({ texteSignatureClient: e.target.value })} className="form-input" />
          </div>
          <div>
            <label className="form-label">Texte signature entreprise</label>
            <input type="text" value={docSettings.texteSignatureEntreprise} onChange={(e) => updateDoc({ texteSignatureEntreprise: e.target.value })} className="form-input" />
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
      <section className="luxury-card">
        <h2 className="section-title">Coefficients de vente</h2>
        <p className="text-sm text-muted-foreground mb-5">
          Le coefficient multiplie le prix d'achat pour calculer le prix de vente HT
        </p>
        <div className="overflow-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="table-header-dark rounded-t-lg">
                <th className="text-left rounded-tl-md">Catégorie</th>
                <th className="text-center w-28">Coefficient</th>
                <th className="text-right w-48">PA 1 000 € → PV HT</th>
                <th className="w-12 rounded-tr-md" />
              </tr>
            </thead>
            <tbody>
              {settings.coefficients.map((row, i) => (
                <tr key={row.id} className={`border-b border-border last:border-0 ${i % 2 === 1 ? "bg-background" : ""}`}>
                  <td className="py-3 pr-3">
                    <input
                      type="text"
                      value={row.categorie}
                      onChange={(e) => updateCoeff(row.id, { categorie: e.target.value })}
                      className="form-input"
                    />
                  </td>
                  <td className="py-3 px-2">
                    <input
                      type="number"
                      step={0.01}
                      min={0}
                      value={row.coefficient}
                      onChange={(e) => updateCoeff(row.id, { coefficient: Number(e.target.value) || 0 })}
                      className="form-input text-center font-mono"
                    />
                  </td>
                  <td className="py-3 pl-3 text-right text-muted-foreground font-mono">
                    → {formatEURCoeff(1000, row.coefficient)}
                  </td>
                  <td className="py-3 pl-1">
                    <button
                      onClick={() => update({ coefficients: settings.coefficients.filter((c) => c.id !== row.id) })}
                      className="p-1.5 text-destructive hover:bg-destructive/10 transition-colors rounded"
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
          className="mt-4 text-xs text-accent hover:text-accent-hover font-medium flex items-center gap-1 transition-colors"
        >
          <Plus size={12} /> Ajouter une catégorie
        </button>
      </section>

      {/* Section B: TVA Rates */}
      <section className="luxury-card">
        <h2 className="section-title">Taux de TVA disponibles</h2>
        <div className="space-y-3">
          {settings.tvaRates.map((tva, i) => (
            <div key={tva.rate} className="flex items-center gap-4 py-1">
              <button
                onClick={() => {
                  const newRates = [...settings.tvaRates];
                  newRates[i] = { ...newRates[i], enabled: !newRates[i].enabled };
                  update({ tvaRates: newRates });
                }}
                className={`w-11 h-6 rounded-full transition-colors ${tva.enabled ? "bg-accent" : "bg-border"}`}
              >
                <div className={`w-5 h-5 rounded-full bg-card transition-transform shadow-sm ${tva.enabled ? "translate-x-5" : "translate-x-0.5"}`} />
              </button>
              <span className="text-sm font-medium">{tva.label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Section C: Supplier Discounts */}
      <section className="luxury-card">
        <h2 className="section-title">Remises fournisseurs globales</h2>
        {settings.fournisseurRemises.length > 0 && (
          <div className="overflow-auto mb-4">
            <table className="w-full text-sm">
              <thead>
                <tr className="table-header-dark">
                  <th className="text-left rounded-tl-md">Fournisseur</th>
                  <th className="text-center w-24">Remise %</th>
                  <th className="text-left">Notes</th>
                  <th className="w-12 rounded-tr-md" />
                </tr>
              </thead>
              <tbody>
                {settings.fournisseurRemises.map((r, i) => (
                  <tr key={r.id} className={`border-b border-border last:border-0 ${i % 2 === 1 ? "bg-background" : ""}`}>
                    <td className="py-3 pr-2">
                      <input type="text" value={r.fournisseur} onChange={(e) => updateRemise(r.id, { fournisseur: e.target.value })} className="form-input" />
                    </td>
                    <td className="py-3 px-2">
                      <input type="number" min={0} max={100} value={r.remise} onChange={(e) => updateRemise(r.id, { remise: Number(e.target.value) || 0 })} className="form-input text-center font-mono" />
                    </td>
                    <td className="py-3 px-2">
                      <input type="text" value={r.notes} onChange={(e) => updateRemise(r.id, { notes: e.target.value })} className="form-input" />
                    </td>
                    <td className="py-3 pl-1">
                      <button onClick={() => update({ fournisseurRemises: settings.fournisseurRemises.filter((x) => x.id !== r.id) })} className="p-1.5 text-destructive hover:bg-destructive/10 transition-colors rounded">
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <button
          onClick={() => update({ fournisseurRemises: [...settings.fournisseurRemises, { id: uid(), fournisseur: "", remise: 0, notes: "" }] })}
          className="text-xs text-accent hover:text-accent-hover font-medium flex items-center gap-1 transition-colors"
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
            className={`px-4 py-2 text-[13px] rounded border transition-all duration-200 ${
              subTab === t
                ? "bg-accent text-accent-foreground border-accent shadow-sm"
                : "border-border text-muted-foreground hover:border-accent/50"
            }`}
          >
            {t === "produits" ? "Tarifs Produits" : "Tarifs Pose"}
          </button>
        ))}
      </div>

      {/* Import section */}
      <section className="luxury-card">
        <h2 className="section-title">Importer</h2>
        <input ref={fileRef} type="file" accept=".csv,.xls,.xlsx" className="hidden" onChange={handleFileImport} />
        <div
          onClick={() => fileRef.current?.click()}
          className="border-2 border-dashed border-border p-10 text-center cursor-pointer hover:border-accent transition-all duration-200 mb-4 rounded-lg"
        >
          <Upload size={28} className="mx-auto mb-3 text-accent/50" />
          <p className="text-sm font-medium text-muted-foreground">Glissez votre fichier ici ou cliquez pour parcourir</p>
          <p className="text-xs text-muted-foreground/70 mt-1">CSV, XLS, XLSX</p>
        </div>
        <button
          onClick={downloadTemplate}
          className="text-xs text-accent hover:text-accent-hover font-medium flex items-center gap-1 transition-colors"
        >
          <Download size={12} /> Télécharger le modèle Excel
        </button>
      </section>

      {/* Product table */}
      <section className="luxury-card">
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
              className="btn-danger text-xs px-3 py-1.5"
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
            className="form-input mb-4"
          />
        )}

        {subTab === "produits" ? (
          filteredProduits.length > 0 ? (
            <div className="overflow-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="table-header-dark">
                    <th className="text-left rounded-tl-md">Référence</th>
                    <th className="text-left">Désignation</th>
                    <th className="text-right">Prix achat HT</th>
                    <th className="text-left">Catégorie</th>
                    <th className="text-left">Fournisseur</th>
                    <th className="text-right">Prix vente HT</th>
                    <th className="w-12 rounded-tr-md" />
                  </tr>
                </thead>
                <tbody>
                  {filteredProduits.map((p, i) => (
                    <tr key={p.id} className={`border-b border-border last:border-0 ${i % 2 === 1 ? "bg-background" : ""}`}>
                      <td className="py-3 pr-2 font-mono text-xs">{p.reference}</td>
                      <td className="py-3 pr-2 font-medium">{p.designation}</td>
                      <td className="py-3 pr-2 text-right font-mono">{formatEURCoeff(p.prixAchatHT, 1)}</td>
                      <td className="py-3 pr-2 text-muted-foreground">{p.categorie}</td>
                      <td className="py-3 pr-2 text-muted-foreground">{p.fournisseur}</td>
                      <td className="py-3 pr-2 text-right font-medium font-mono text-accent">{formatEURCoeff(p.prixAchatHT, getCoeffForCategory(p.categorie))}</td>
                      <td className="py-3">
                        <button onClick={() => update({ catalogProduits: settings.catalogProduits.filter((x) => x.id !== p.id) })} className="p-1.5 text-destructive hover:bg-destructive/10 transition-colors rounded">
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-10">Aucun produit importé</p>
          )
        ) : (
          filteredPose.length > 0 ? (
            <div className="overflow-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="table-header-dark">
                    <th className="text-left rounded-tl-md">Type de pose</th>
                    <th className="text-left">Description</th>
                    <th className="text-center">Unité</th>
                    <th className="text-right">Prix unitaire HT</th>
                    <th className="text-center">Durée (h)</th>
                    <th className="w-12 rounded-tr-md" />
                  </tr>
                </thead>
                <tbody>
                  {filteredPose.map((p, i) => (
                    <tr key={p.id} className={`border-b border-border last:border-0 ${i % 2 === 1 ? "bg-background" : ""}`}>
                      <td className="py-3 pr-2 font-medium">{p.typePose}</td>
                      <td className="py-3 pr-2 text-muted-foreground">{p.description}</td>
                      <td className="py-3 text-center">{p.unite}</td>
                      <td className="py-3 text-right font-mono">{formatEURCoeff(p.prixUnitaireHT, 1)}</td>
                      <td className="py-3 text-center font-mono">{p.dureeEstimee}</td>
                      <td className="py-3">
                        <button onClick={() => update({ catalogPose: settings.catalogPose.filter((x) => x.id !== p.id) })} className="p-1.5 text-destructive hover:bg-destructive/10 transition-colors rounded">
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-10">Aucun tarif pose importé</p>
          )
        )}
      </section>
    </div>
  );
}
