import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Trash2, Upload, Download, X } from "lucide-react";
import { toast } from "sonner";
import {
  loadSettings,
  saveSettings,
  formatEURCoeff,
  defaultComptabilite,
  defaultSettings,
  type AppSettings,
  type CoefficientRow,
  type FournisseurRemise,
  type CatalogProduct,
  type CatalogPose,
} from "@/lib/settings-data";
import { uid } from "@/lib/quote-data";
import { ConfirmModal } from "@/components/ConfirmModal";
import { dbLoadSettings, dbSaveSettings } from "@/lib/supabase-data/settings";
import { dbLoadCommerciaux, dbSaveCommercial, dbDeleteCommercial, type Commercial } from "@/lib/supabase-data/commerciaux";

export default function Settings() {
  const navigate = useNavigate();

  useEffect(() => {
    if (sessionStorage.getItem("oralis_supervisor_unlocked") !== "true") {
      navigate("/");
      toast.error("Veuillez saisir le mot de passe superviseur pour accéder à cette page.");
    }
  }, [navigate]);

  const [settings, setSettings] = useState<AppSettings>(defaultSettings);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"entreprise" | "comptabilite" | "tarifs" | "bibliotheque" | "equipe" | "sauvegarde">("entreprise");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [confirmDelete, setConfirmDelete] = useState<{
    isOpen: boolean;
    message: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    message: "",
    onConfirm: () => {},
  });

  useEffect(() => {
    async function fetchSettings() {
      try {
        const data = await dbLoadSettings();
        setSettings(data);
        saveSettings(data);
      } catch (err) {
        toast.error("Erreur lors du chargement des paramètres.");
      } finally {
        setLoading(false);
      }
    }
    fetchSettings();
  }, []);

  const update = (patch: Partial<AppSettings>) => setSettings((s) => ({ ...s, ...patch }));
  const updateCompany = (patch: Partial<AppSettings["company"]>) =>
    update({ company: { ...settings.company, ...patch } });

  const handleSave = async () => {
    try {
      await dbSaveSettings(settings);
      saveSettings(settings);
      toast.success("Paramètres enregistrés");
    } catch (err) {
      toast.error("Erreur lors de l'enregistrement des paramètres.");
    }
  };

  const tabs = [
    { key: "entreprise" as const, label: "Entreprise" },
    { key: "comptabilite" as const, label: "Comptabilité" },
    { key: "tarifs" as const, label: "Tarifs" },
    { key: "bibliotheque" as const, label: "Bibliothèque" },
    { key: "equipe" as const, label: "Équipe" },
    { key: "sauvegarde" as const, label: "Sauvegarde & Restauration" },
  ];

  const handleExportData = () => {
    const keys = [
      "oralis_quotes",
      "oralis_clients",
      "oralis_settings",
      "oralis_fournisseurs",
      "oralis_modeles_pergola",
      "oralis_commandes",
      "oralis_factures",
      "oralis_devis_favoris"
    ];
    const data: Record<string, any> = {};
    keys.forEach((k) => {
      const val = localStorage.getItem(k);
      data[k] = val ? JSON.parse(val) : null;
    });
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(data, null, 2));
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", dataStr);
    const dateStr = new Date().toISOString().slice(0, 10);
    downloadAnchor.setAttribute("download", `oralis_sauvegarde_${dateStr}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    toast.success("Sauvegarde téléchargée avec succès");
  };

  const handleImportData = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        const keys = [
          "oralis_quotes",
          "oralis_clients",
          "oralis_settings",
          "oralis_fournisseurs",
          "oralis_modeles_pergola",
          "oralis_commandes",
          "oralis_factures",
          "oralis_devis_favoris"
        ];
        const hasKeys = keys.some((k) => parsed.hasOwnProperty(k));
        if (!hasKeys) {
          toast.error("Le fichier sélectionné ne semble pas être une sauvegarde ORALIS valide.");
          return;
        }

        setConfirmDelete({
          isOpen: true,
          message: "Attention : cette action va écraser TOUTES vos données actuelles (devis, clients, modèles, configurations, etc.) avec celles du fichier de sauvegarde. Cette action est irréversible. Voulez-vous continuer ?",
          onConfirm: () => {
            keys.forEach((k) => {
              if (parsed[k] !== undefined && parsed[k] !== null) {
                localStorage.setItem(k, JSON.stringify(parsed[k]));
              }
            });
            toast.success("Restauration réussie ! Rechargement de la page...");
            setTimeout(() => {
              window.location.reload();
            }, 1500);
          },
        });
      } catch (err) {
        toast.error("Format de fichier invalide.");
      }
    };
    reader.readAsText(file);
  };

  const handleResetTestData = () => {
    setConfirmDelete({
      isOpen: true,
      message: "Attention : cette action va supprimer DEFINITIVEMENT tous vos devis, clients, commandes et factures de l'application (les tarifs fournisseurs et les paramètres d'entreprise seront conservés). Cette action est irréversible. Voulez-vous continuer ?",
      onConfirm: () => {
        const keysToClear = [
          "oralis_quotes",
          "oralis_clients",
          "oralis_commandes",
          "oralis_factures",
          "oralis_devis_favoris"
        ];
        keysToClear.forEach((k) => localStorage.setItem(k, "[]"));
        toast.success("Données de test supprimées avec succès ! Rechargement...");
        setTimeout(() => {
          window.location.reload();
        }, 1500);
      },
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-full border-4 border-accent border-t-transparent animate-spin"></div>
          <p className="text-xs text-muted-foreground font-body">Chargement des paramètres...</p>
        </div>
      </div>
    );
  }

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

      {activeTab === "entreprise" && (
        <EntrepriseTab
          settings={settings}
          update={update}
          updateCompany={updateCompany}
          fileInputRef={fileInputRef}
          setConfirmDelete={setConfirmDelete}
        />
      )}
      {activeTab === "comptabilite" && (
        <ComptabiliteTab
          settings={settings}
          update={update}
        />
      )}
      {activeTab === "tarifs" && (
        <TarifsTab
          settings={settings}
          update={update}
          setConfirmDelete={setConfirmDelete}
        />
      )}
      {activeTab === "bibliotheque" && (
        <BibliothequeTab
          settings={settings}
          update={update}
          setConfirmDelete={setConfirmDelete}
        />
      )}
      {activeTab === "equipe" && (
        <EquipeTab
          setConfirmDelete={setConfirmDelete}
        />
      )}
      {activeTab === "sauvegarde" && (
        <SauvegardeTab
          handleExport={handleExportData}
          handleImport={handleImportData}
          handleReset={handleResetTestData}
        />
      )}

      {/* Save */}
      {activeTab !== "sauvegarde" && (
        <div className="mt-8">
          <button onClick={handleSave} className="btn-gold">
            Enregistrer les paramètres
          </button>
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

// ══════════════════════════════════════════════
// TAB 1 — ENTREPRISE
// ══════════════════════════════════════════════

function EntrepriseTab({
  settings,
  update,
  updateCompany,
  fileInputRef,
  setConfirmDelete,
}: {
  settings: AppSettings;
  update: (p: Partial<AppSettings>) => void;
  updateCompany: (p: Partial<AppSettings["company"]>) => void;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  setConfirmDelete: React.Dispatch<React.SetStateAction<{ isOpen: boolean; message: string; onConfirm: () => void }>>;
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
            <label className="form-label">Conditions de paiement par défaut</label>
            <input type="text" value={c.conditionsPaiement} onChange={(e) => updateCompany({ conditionsPaiement: e.target.value })} className="form-input" placeholder="Ex: 50% à la commande, 45% à la livraison, 5% à la réception" />
          </div>
          <div className="md:col-span-2">
            <label className="form-label">Délai de réalisation par défaut</label>
            <input type="text" value={c.delaiRealisation} onChange={(e) => updateCompany({ delaiRealisation: e.target.value })} className="form-input" placeholder="Ex: 6 à 8 semaines" />
          </div>
          <div className="md:col-span-2">
            <label className="form-label">Mot de passe superviseur</label>
            <input type="password" value={c.motDePasse} onChange={(e) => updateCompany({ motDePasse: e.target.value })} className="form-input" />
          </div>
        </div>
      </section>

      {/* Section A2: Conditions de paiement configurables */}
      <section className="luxury-card">
        <h2 className="section-title">Conditions de paiement personnalisées</h2>
        <p className="text-xs text-muted-foreground mb-4 font-body">
          Définissez les formules de règlement (acomptes et solde) utilisables pour vos devis. La somme des pourcentages de chaque formule doit être égale à 100%.
        </p>

        <div className="space-y-6">
          {(settings.paymentConditionsList || []).map((cond) => {
            const totalPct = cond.steps.reduce((sum, s) => sum + (s.pct || 0), 0);
            return (
              <div key={cond.id} className="border border-border/80 rounded-lg p-4 bg-muted/10 space-y-4 font-body">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex-1">
                    <label className="form-label">Nom de la formule</label>
                    <input
                      type="text"
                      value={cond.nom}
                      onChange={(e) => {
                        const updatedList = settings.paymentConditionsList.map((x) =>
                          x.id === cond.id ? { ...x, nom: e.target.value } : x
                        );
                        update({ paymentConditionsList: updatedList });
                      }}
                      placeholder="Ex: Standard (50 / 45 / 5)"
                      className="form-input font-medium"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setConfirmDelete({
                        isOpen: true,
                        message: "Voulez-vous vraiment supprimer cette formule de règlement ?",
                        onConfirm: () => {
                          const updatedList = settings.paymentConditionsList.filter((x) => x.id !== cond.id);
                          update({ paymentConditionsList: updatedList });
                          toast.success("Formule de règlement supprimée");
                        },
                      });
                    }}
                    className="p-2 text-destructive hover:bg-destructive/10 transition-colors rounded self-end"
                    title="Supprimer cette condition"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>

                {/* Steps list */}
                <div className="space-y-2">
                  <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Étapes du règlement</div>
                  {cond.steps.map((step, idx) => (
                    <div key={step.id} className="flex flex-wrap items-center gap-2 bg-background border border-border/40 p-2 rounded">
                      <span className="text-xs font-semibold text-muted-foreground w-16">Étape {idx + 1}</span>
                      
                      <div className="w-28">
                        <select
                          value={step.type}
                          onChange={(e) => {
                            const updatedSteps = cond.steps.map((s) =>
                              s.id === step.id ? { ...s, type: e.target.value as any } : s
                            );
                            const updatedList = settings.paymentConditionsList.map((x) =>
                              x.id === cond.id ? { ...x, steps: updatedSteps } : x
                            );
                            update({ paymentConditionsList: updatedList });
                          }}
                          className="form-input text-xs py-1"
                        >
                          <option value="acompte">Acompte</option>
                          <option value="solde">Solde</option>
                        </select>
                      </div>

                      <div className="w-24 flex items-center gap-1">
                        <input
                          type="number"
                          value={step.pct || 0}
                          min={0}
                          max={100}
                          onChange={(e) => {
                            const val = Number(e.target.value) || 0;
                            const updatedSteps = cond.steps.map((s) =>
                              s.id === step.id ? { ...s, pct: val } : s
                            );
                            const updatedList = settings.paymentConditionsList.map((x) =>
                              x.id === cond.id ? { ...x, steps: updatedSteps } : x
                            );
                            update({ paymentConditionsList: updatedList });
                          }}
                          className="form-input text-xs text-center font-mono py-1"
                          placeholder="%"
                        />
                        <span className="text-xs text-muted-foreground font-semibold">%</span>
                      </div>

                      <div className="flex-1 min-w-[150px]">
                        <input
                          type="text"
                          value={step.label}
                          onChange={(e) => {
                            const updatedSteps = cond.steps.map((s) =>
                              s.id === step.id ? { ...s, label: e.target.value } : s
                            );
                            const updatedList = settings.paymentConditionsList.map((x) =>
                              x.id === cond.id ? { ...x, steps: updatedSteps } : x
                            );
                            update({ paymentConditionsList: updatedList });
                          }}
                          className="form-input text-xs py-1"
                          placeholder="Ex: à la commande, à la livraison, etc."
                        />
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          const updatedSteps = cond.steps.filter((s) => s.id !== step.id);
                          const updatedList = settings.paymentConditionsList.map((x) =>
                            x.id === cond.id ? { ...x, steps: updatedSteps } : x
                          );
                          update({ paymentConditionsList: updatedList });
                        }}
                        className="p-1 text-destructive hover:bg-destructive/10 transition-colors rounded"
                        title="Supprimer cette étape"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  ))}
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      const newStep = { id: uid(), type: "acompte" as const, label: "", pct: 0 };
                      const updatedSteps = [...cond.steps, newStep];
                      const updatedList = settings.paymentConditionsList.map((x) =>
                        x.id === cond.id ? { ...x, steps: updatedSteps } : x
                      );
                      update({ paymentConditionsList: updatedList });
                    }}
                    className="text-xs text-accent hover:text-accent-hover font-semibold flex items-center gap-1 transition-colors"
                  >
                    <Plus size={13} /> Ajouter une étape
                  </button>

                  <div className={`text-xs font-semibold ${totalPct === 100 ? "text-emerald-600" : "text-amber-600"}`}>
                    Total : {totalPct}% {totalPct !== 100 && `(doit être égal à 100%)`}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <button
          type="button"
          onClick={() => {
            const newCond = {
              id: uid(),
              nom: "",
              steps: [
                { id: uid(), type: "acompte" as const, label: "à la commande", pct: 50 },
                { id: uid(), type: "solde" as const, label: "à la fin des travaux", pct: 50 }
              ]
            };
            update({ paymentConditionsList: [...(settings.paymentConditionsList || []), newCond] });
          }}
          className="mt-4 btn-outline-gold flex items-center gap-1.5 text-xs py-1.5"
        >
          <Plus size={13} /> Créer une condition de paiement
        </button>
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
  setConfirmDelete,
}: {
  settings: AppSettings;
  update: (p: Partial<AppSettings>) => void;
  setConfirmDelete: React.Dispatch<React.SetStateAction<{ isOpen: boolean; message: string; onConfirm: () => void }>>;
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
                      type="button"
                      onClick={() => {
                        setConfirmDelete({
                          isOpen: true,
                          message: `Voulez-vous vraiment supprimer la catégorie de coefficient "${row.categorie || "Sans nom"}" ?`,
                          onConfirm: () => {
                            update({ coefficients: settings.coefficients.filter((c) => c.id !== row.id) });
                            toast.success("Catégorie supprimée");
                          },
                        });
                      }}
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
                      <button
                        type="button"
                        onClick={() => {
                          setConfirmDelete({
                            isOpen: true,
                            message: `Voulez-vous vraiment supprimer la remise pour le fournisseur "${r.fournisseur || "Sans nom"}" ?`,
                            onConfirm: () => {
                              update({ fournisseurRemises: settings.fournisseurRemises.filter((x) => x.id !== r.id) });
                              toast.success("Remise supprimée");
                            },
                          });
                        }}
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
  setConfirmDelete,
}: {
  settings: AppSettings;
  update: (p: Partial<AppSettings>) => void;
  setConfirmDelete: React.Dispatch<React.SetStateAction<{ isOpen: boolean; message: string; onConfirm: () => void }>>;
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
                setConfirmDelete({
                  isOpen: true,
                  message: subTab === "produits" 
                    ? "Voulez-vous vraiment supprimer TOUS les produits de la bibliothèque ?"
                    : "Voulez-vous vraiment supprimer TOUS les tarifs de pose de la bibliothèque ?",
                  onConfirm: () => {
                    if (subTab === "produits") {
                      update({ catalogProduits: [] });
                      toast.success("Tous les produits ont été supprimés");
                    } else {
                      update({ catalogPose: [] });
                      toast.success("Tous les tarifs de pose ont été supprimés");
                    }
                  },
                });
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
                        <button
                          type="button"
                          onClick={() => {
                            setConfirmDelete({
                              isOpen: true,
                              message: `Voulez-vous vraiment supprimer le produit "${p.designation}" de la bibliothèque ?`,
                              onConfirm: () => {
                                update({ catalogProduits: settings.catalogProduits.filter((x) => x.id !== p.id) });
                                toast.success("Produit supprimé de la bibliothèque");
                              },
                            });
                          }}
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
                        <button
                          type="button"
                          onClick={() => {
                            setConfirmDelete({
                              isOpen: true,
                              message: `Voulez-vous vraiment supprimer le tarif de pose "${p.typePose}" de la bibliothèque ?`,
                              onConfirm: () => {
                                update({ catalogPose: settings.catalogPose.filter((x) => x.id !== p.id) });
                                toast.success("Tarif de pose supprimé de la bibliothèque");
                              },
                            });
                          }}
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
          ) : (
            <p className="text-sm text-muted-foreground text-center py-10">Aucun tarif pose importé</p>
          )
        )}
      </section>
    </div>
  );
}

// ══════════════════════════════════════════════
// TAB 4 — SAUVEGARDE & RESTAURATION
// ══════════════════════════════════════════════

function SauvegardeTab({
  handleExport,
  handleImport,
  handleReset,
}: {
  handleExport: () => void;
  handleImport: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleReset: () => void;
}) {
  return (
    <div className="space-y-6">
      <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
        <h3 className="font-semibold text-lg mb-2 text-foreground">Sauvegarde & Restauration des données</h3>
        <p className="text-sm text-muted-foreground mb-6 leading-relaxed font-body">
          L'application ORALIS fonctionne localement dans votre navigateur web. Pour transférer vos données 
          (devis, clients, factures, grilles de tarifs et modèles de pergolas) vers un autre ordinateur ou une autre session, 
          vous pouvez exporter un fichier de sauvegarde, puis l'importer sur votre nouvel appareil.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6 border-t border-border">
          {/* Section Exporter */}
          <div className="space-y-3 flex flex-col justify-between">
            <div>
              <h4 className="font-semibold text-sm text-foreground flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-accent/15 text-accent flex items-center justify-center text-xs font-mono font-bold">1</span>
                Exporter vos données
              </h4>
              <p className="text-xs text-muted-foreground mt-2 leading-relaxed font-body">
                Générez et téléchargez un fichier de sauvegarde contenant l'ensemble de votre travail actuel. 
                Conservez précieusement ce fichier pour pouvoir le restaurer.
              </p>
            </div>
            <div className="pt-4">
              <button
                type="button"
                onClick={handleExport}
                className="flex items-center gap-2 px-4 py-2.5 bg-accent hover:bg-accent/90 text-accent-foreground font-semibold text-[13px] rounded transition-colors"
              >
                <Download size={14} /> Exporter la sauvegarde
              </button>
            </div>
          </div>

          {/* Section Importer */}
          <div className="space-y-3 border-t md:border-t-0 md:border-l border-border pt-6 md:pt-0 md:pl-6 flex flex-col justify-between">
            <div>
              <h4 className="font-semibold text-sm text-foreground flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-destructive/15 text-destructive flex items-center justify-center text-xs font-mono font-bold">2</span>
                Importer une sauvegarde
              </h4>
              <p className="text-xs text-muted-foreground mt-2 leading-relaxed font-body">
                Sélectionnez un fichier de sauvegarde précédemment exporté pour restaurer l'intégralité de vos données. 
                <span className="text-destructive font-semibold"> Attention : cette action écrasera irréversiblement toutes vos données actuelles.</span>
              </p>
            </div>
            <div className="pt-4">
              <label className="inline-flex items-center gap-2 px-4 py-2.5 bg-muted hover:bg-muted-hover border border-border text-foreground font-semibold text-[13px] rounded cursor-pointer transition-colors">
                <Upload size={14} />
                <span>Choisir un fichier de sauvegarde</span>
                <input
                  type="file"
                  accept=".json"
                  onChange={handleImport}
                  className="hidden"
                />
              </label>
            </div>
          </div>
        </div>
      </div>

      {/* Zone de danger */}
      <div className="bg-card border border-destructive/20 rounded-xl p-6 shadow-sm">
        <h3 className="font-semibold text-lg mb-2 text-destructive">Zone de danger</h3>
        <p className="text-sm text-muted-foreground mb-6 leading-relaxed font-body">
          Si vous avez terminé vos tests et souhaitez démarrer l'utilisation réelle de l'application, 
          vous pouvez supprimer toutes les données de test en une seule fois.
        </p>
        <div className="pt-4 border-t border-border flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <h4 className="font-semibold text-sm text-foreground">Remise à zéro des données opérationnelles</h4>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed font-body">
              Supprime définitivement tous les devis, clients, commandes et factures (les tarifs fournisseurs et les paramètres sont conservés).
            </p>
          </div>
          <button
            type="button"
            onClick={handleReset}
            className="flex items-center gap-2 px-4 py-2.5 bg-destructive hover:bg-destructive/90 text-destructive-foreground font-semibold text-[13px] rounded transition-colors"
          >
            <Trash2 size={14} /> Supprimer les données de test
          </button>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════
// TAB 1.5 — COMPTABILITÉ
// ══════════════════════════════════════════════

function ComptabiliteTab({
  settings,
  update,
}: {
  settings: AppSettings;
  update: (p: Partial<AppSettings>) => void;
}) {
  const c = settings.comptabilite || defaultComptabilite();
  const updateCompta = (patch: Partial<AppSettings["comptabilite"]>) => {
    update({ comptabilite: { ...c, ...patch } });
  };

  return (
    <div className="space-y-6">
      <section className="luxury-card">
        <h2 className="section-title">Coordonnées comptables & bancaires</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 font-body">
          <div className="md:col-span-2">
            <label className="form-label">Nom de l'entreprise (Comptabilité)</label>
            <input type="text" value={c.nomEntreprise} onChange={(e) => updateCompta({ nomEntreprise: e.target.value })} className="form-input" />
          </div>
          <div className="md:col-span-2">
            <label className="form-label">Adresse (Comptabilité)</label>
            <input type="text" value={c.adresseEntreprise} onChange={(e) => updateCompta({ adresseEntreprise: e.target.value })} className="form-input" />
          </div>
          <div>
            <label className="form-label">Code Postal & Ville</label>
            <input type="text" value={c.cpVilleEntreprise} onChange={(e) => updateCompta({ cpVilleEntreprise: e.target.value })} className="form-input" />
          </div>
          <div>
            <label className="form-label">Téléphone</label>
            <input type="tel" value={c.telephone} onChange={(e) => updateCompta({ telephone: e.target.value })} className="form-input" />
          </div>
          <div>
            <label className="form-label">Email Service Comptabilité</label>
            <input type="email" value={c.emailComptabilite} onChange={(e) => updateCompta({ emailComptabilite: e.target.value })} className="form-input" />
          </div>
          <div>
            <label className="form-label">SIRET</label>
            <input type="text" value={c.siret} onChange={(e) => updateCompta({ siret: e.target.value })} className="form-input" />
          </div>
          <div className="md:col-span-2">
            <label className="form-label">IBAN</label>
            <input type="text" value={c.iban} onChange={(e) => updateCompta({ iban: e.target.value })} className="form-input font-mono" />
          </div>
          <div className="md:col-span-2">
            <label className="form-label">BIC</label>
            <input type="text" value={c.bic} onChange={(e) => updateCompta({ bic: e.target.value })} className="form-input font-mono" />
          </div>
        </div>
      </section>
    </div>
  );
}

// ══════════════════════════════════════════════
// TAB 5 — ÉQUIPE
// ══════════════════════════════════════════════

function EquipeTab({
  setConfirmDelete,
}: {
  setConfirmDelete: React.Dispatch<React.SetStateAction<{ isOpen: boolean; message: string; onConfirm: () => void }>>;
}) {
  const [commerciaux, setCommerciaux] = useState<Commercial[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const data = await dbLoadCommerciaux();
      setCommerciaux(data);
    } catch (err) {
      toast.error("Erreur lors du chargement de l'équipe.");
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = () => {
    const newMember: Commercial = {
      id: uid(),
      prenom: "",
      nom: "",
      email: "",
      telephone: "",
      role: "commercial",
      pays: "France",
      actif: true,
    };
    setCommerciaux([newMember, ...commerciaux]);
  };

  const handleChange = (id: string, patch: Partial<Commercial>) => {
    setCommerciaux((prev) => prev.map(c => c.id === id ? { ...c, ...patch } : c));
  };

  const handleSave = async (c: Commercial) => {
    try {
      if (!c.prenom || !c.nom) {
        toast.error("Le prénom et le nom sont obligatoires.");
        return;
      }
      await dbSaveCommercial(c);
      toast.success("Membre enregistré avec succès.");
      fetchData(); // reload
    } catch (err) {
      toast.error("Erreur lors de l'enregistrement.");
    }
  };

  const handleDelete = (c: Commercial) => {
    setConfirmDelete({
      isOpen: true,
      message: `Voulez-vous vraiment supprimer ${c.prenom} ${c.nom} de l'équipe ?`,
      onConfirm: async () => {
        try {
          await dbDeleteCommercial(c.id);
          toast.success("Membre supprimé.");
          setCommerciaux((prev) => prev.filter(x => x.id !== c.id));
        } catch (err) {
          toast.error("Erreur lors de la suppression.");
        }
      }
    });
  };

  if (loading) return <p className="text-sm text-muted-foreground font-body">Chargement de l'équipe...</p>;

  return (
    <div className="space-y-6">
      <section className="luxury-card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="section-title mb-0">Gestion de l'équipe</h2>
          <button onClick={handleAdd} className="text-xs text-accent hover:text-accent-hover font-medium flex items-center gap-1 transition-colors">
            <Plus size={12} /> Ajouter un membre
          </button>
        </div>
        <p className="text-sm text-muted-foreground mb-6 font-body">
          Gérez les membres de votre équipe (commerciaux, comptables, managers). Ces profils pourront être assignés aux devis et factures.
        </p>

        <div className="space-y-4">
          {commerciaux.map((c) => (
            <div key={c.id} className="border border-border/80 rounded-lg p-4 bg-muted/10 font-body relative">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <label className="form-label">Prénom</label>
                  <input type="text" value={c.prenom} onChange={(e) => handleChange(c.id, { prenom: e.target.value })} className="form-input" />
                </div>
                <div>
                  <label className="form-label">Nom</label>
                  <input type="text" value={c.nom} onChange={(e) => handleChange(c.id, { nom: e.target.value })} className="form-input" />
                </div>
                <div>
                  <label className="form-label">Rôle</label>
                  <select value={c.role} onChange={(e) => handleChange(c.id, { role: e.target.value as any })} className="form-input">
                    <option value="manager">Manager</option>
                    <option value="commercial">Commercial</option>
                    <option value="comptable">Comptable</option>
                    <option value="acheteur">Acheteur</option>
                  </select>
                </div>
                <div>
                  <label className="form-label">Email</label>
                  <input type="email" value={c.email || ""} onChange={(e) => handleChange(c.id, { email: e.target.value })} className="form-input" />
                </div>
                <div>
                  <label className="form-label">Téléphone</label>
                  <input type="tel" value={c.telephone || ""} onChange={(e) => handleChange(c.id, { telephone: e.target.value })} className="form-input" />
                </div>
                <div>
                  <label className="form-label">Pays</label>
                  <input type="text" value={c.pays || ""} onChange={(e) => handleChange(c.id, { pays: e.target.value })} className="form-input" />
                </div>
                <div className="flex items-center gap-3 mt-2 lg:mt-0">
                  <label className="text-sm font-medium">Actif</label>
                  <button
                    onClick={() => handleChange(c.id, { actif: !c.actif })}
                    className={`w-11 h-6 rounded-full transition-colors ${c.actif ? "bg-accent" : "bg-border"}`}
                  >
                    <div className={`w-5 h-5 rounded-full bg-card transition-transform shadow-sm ${c.actif ? "translate-x-5" : "translate-x-0.5"}`} />
                  </button>
                </div>
              </div>
              <div className="mt-4 flex justify-end gap-2">
                <button onClick={() => handleDelete(c)} className="px-3 py-1.5 text-xs text-destructive hover:bg-destructive/10 rounded transition-colors flex items-center gap-1">
                  <Trash2 size={14} /> Supprimer
                </button>
                <button onClick={() => handleSave(c)} className="btn-gold px-4 py-1.5 text-xs">
                  Enregistrer
                </button>
              </div>
            </div>
          ))}
          {commerciaux.length === 0 && (
            <p className="text-center text-muted-foreground text-sm py-8 font-body">Aucun membre dans l'équipe pour le moment.</p>
          )}
        </div>
      </section>
    </div>
  );
}
