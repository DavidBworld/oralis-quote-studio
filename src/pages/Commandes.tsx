import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Search, Eye, Package, ChevronDown, X, Receipt, FileText,
  Plus, Trash2, Printer
} from "lucide-react";
import { toast } from "sonner";
import {
  formatEUR, formatDate, calcTotals, uid, type Quote
} from "@/lib/quote-data";
import {
  COMMANDE_STATUT_LABELS, COMMANDE_STATUT_CLASS,
  ECHEANCIER_DEFAUT,
  getCommandeTotalFacture, getCommandeResteAFacturer, getProchainEcheancier,
  createFactureFromCommande,
  nextFactureNumberOR,
  type Commande, type CommandeFacture,
} from "@/lib/commande-data";
import { dbLoadCommandes, dbSaveCommande } from "@/lib/supabase-data/commandes";
import { dbSaveFacture, dbLoadFactures } from "@/lib/supabase-data/factures";

// ── localStorage helpers (Bypassed for Supabase) ──
function loadFactures(): any[] { return []; }
function saveFactures(f: any[]) {}

// ── Créer Facture Modal ──
function CreerFactureModal({ commande, onClose, onDone }: {
  commande: Commande;
  onClose: () => void;
  onDone: () => void;
}) {
  const prochaine = getProchainEcheancier(commande);
  const totalFacture = getCommandeTotalFacture(commande);
  const resteAFacturer = getCommandeResteAFacturer(commande);

  const isIntermediaire = !prochaine;
  const defaultPct = prochaine ? prochaine.pct : 0;
  const defaultLabel = prochaine ? prochaine.label : "Facture intermédiaire";
  const defaultType = prochaine ? prochaine.type : "intermediaire" as const;

  const [label, setLabel] = useState(defaultLabel);
  const [type] = useState(defaultType);
  const [pct, setPct] = useState(() => {
    if (defaultType === "solde" && commande.totalTTC > 0) {
      return Math.round((resteAFacturer / commande.totalTTC) * 100 * 100) / 100;
    }
    return defaultPct;
  });
  const [montant, setMontant] = useState(() => {
    if (defaultType === "solde") {
      return resteAFacturer;
    }
    return Math.round(commande.totalTTC * defaultPct / 100 * 100) / 100;
  });
  const [dateFacture, setDateFacture] = useState(new Date().toISOString().split("T")[0]);
  const [dateEcheance, setDateEcheance] = useState(() => {
    const d = new Date(); d.setDate(d.getDate() + 30); return d.toISOString().split("T")[0];
  });
  const [factureNumero, setFactureNumero] = useState("");
  const [modePaiement, setModePaiement] = useState("Virement");

  useEffect(() => {
    async function fetchNextNum() {
      try {
        const list = await dbLoadFactures();
        setFactureNumero(nextFactureNumberOR(list));
      } catch (err) {
        console.error("Erreur lors de la génération du numéro de facture:", err);
      }
    }
    fetchNextNum();
  }, []);

  const montantFinal = montant;

  const handleCreate = async () => {
    if (montantFinal <= 0) {
      toast.error("Le montant doit être supérieur à 0");
      return;
    }
    if (montantFinal > resteAFacturer + 0.005) {
      toast.error(`Le montant dépasse le reste à facturer (${formatEUR(resteAFacturer)})`);
      return;
    }

    try {
      const result = createFactureFromCommande(
        commande, type, label, pct, montantFinal, dateFacture, dateEcheance, modePaiement, factureNumero
      );

      // 1. Sauvegarder la facture dans Supabase
      await dbSaveFacture(result.facture);

      // 2. Mettre à jour la commande dans Supabase
      const updatedCommandes = await dbLoadCommandes();
      const foundIdx = updatedCommandes.findIndex((c) => c.id === commande.id);
      if (foundIdx >= 0) {
        const cmdToUpdate = updatedCommandes[foundIdx];
        cmdToUpdate.factures.push(result.commandeFacture);
        // Auto-update statut si tout est facturé
        const newTotalFacture = cmdToUpdate.factures.reduce((s, f) => s + f.montantTTC, 0);
        if (newTotalFacture >= commande.totalTTC - 0.01) {
          cmdToUpdate.statut = "terminee";
        }
        await dbSaveCommande(cmdToUpdate);
      } else {
        const updatedCmd = { ...commande };
        updatedCmd.factures.push(result.commandeFacture);
        const newTotalFacture = updatedCmd.factures.reduce((s, f) => s + f.montantTTC, 0);
        if (newTotalFacture >= commande.totalTTC - 0.01) {
          updatedCmd.statut = "terminee" as const;
        }
        await dbSaveCommande(updatedCmd);
      }

      toast.success(`Facture ${result.facture.numero} créée ✓`);
      onDone();
      onClose();
    } catch (err) {
      toast.error("Erreur lors de la création de la facture.");
    }
  };

  const factureIndex = commande.factures.length + 1;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={onClose}>
      <div className="bg-card border border-border rounded-lg w-full max-w-lg p-6 shadow-[var(--shadow-elevated)] max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-display text-xl font-semibold">
            Créer la facture n°{factureIndex}
          </h2>
          <button onClick={onClose} className="p-1 hover:bg-muted rounded"><X size={16} /></button>
        </div>

        {/* Résumé commande */}
        <div className="bg-muted/50 rounded-lg p-4 mb-5 space-y-1.5">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Commande</span>
            <span className="font-mono font-medium">{commande.numero}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Total TTC commande</span>
            <span className="font-mono font-medium">{formatEUR(commande.totalTTC)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Déjà facturé</span>
            <span className="font-mono">{formatEUR(totalFacture)}</span>
          </div>
          <div className="flex justify-between text-sm font-semibold pt-1.5 border-t border-border">
            <span>Reste à facturer</span>
            <span className="font-mono text-accent">{formatEUR(resteAFacturer)}</span>
          </div>
        </div>

        {/* Échéancier visuel */}
        <div className="mb-5">
          <p className="form-label mb-2">Échéancier</p>
          <div className="flex gap-1">
            {ECHEANCIER_DEFAUT.map((e, i) => {
              const done = i < commande.factures.length;
              const current = i === commande.factures.length;
              return (
                <div
                  key={i}
                  className={`flex-1 rounded px-2 py-1.5 text-center text-[10px] font-semibold border transition-all ${
                    done
                      ? "bg-[hsl(150_40%_96%)] border-[hsl(var(--success))] text-[hsl(var(--success))]"
                      : current
                      ? "bg-accent/10 border-accent text-accent"
                      : "bg-muted/30 border-border text-muted-foreground"
                  }`}
                >
                  <div>{e.pct}%</div>
                  <div className="text-[9px] font-normal mt-0.5">{e.label.replace("Acompte à la ", "").replace("Solde fin de ", "")}</div>
                  {done && <div className="text-[9px] mt-0.5">✓ {formatEUR(commande.factures[i].montantTTC)}</div>}
                </div>
              );
            })}
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="form-label">N° Facture</label>
            <input className="form-input" value={factureNumero} onChange={(e) => setFactureNumero(e.target.value)} />
          </div>
          <div>
            <label className="form-label">Libellé de la facture</label>
            <input className="form-input" value={label} onChange={(e) => setLabel(e.target.value)} />
          </div>

          <div>
            <label className="form-label">Montant TTC</label>
            <div className="flex gap-3 items-center">
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  className="form-input w-24"
                  value={pct}
                  onChange={(e) => {
                    const p = Number(e.target.value);
                    setPct(p);
                    setMontant(Math.round(commande.totalTTC * p / 100 * 100) / 100);
                  }}
                  min={0}
                  max={100}
                  step={0.01}
                />
                <span className="text-sm text-muted-foreground">%</span>
              </div>
              
              <span className="text-muted-foreground text-xs font-medium">ou</span>

              <div className="flex items-center gap-1">
                <input
                  type="number"
                  className="form-input w-32 font-mono"
                  value={montant}
                  onChange={(e) => {
                    const m = Number(e.target.value);
                    setMontant(m);
                    if (commande.totalTTC > 0) {
                      setPct(Math.round((m / commande.totalTTC) * 100 * 100) / 100);
                    }
                  }}
                  step={0.01}
                  min={0}
                />
                <span className="text-sm text-muted-foreground">€ TTC</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="form-label">Date de facturation</label>
              <input type="date" className="form-input" value={dateFacture} onChange={(e) => setDateFacture(e.target.value)} />
            </div>
            <div>
              <label className="form-label">Date d'échéance</label>
              <input type="date" className="form-input" value={dateEcheance} onChange={(e) => setDateEcheance(e.target.value)} />
            </div>
          </div>

          <div>
            <label className="form-label">Mode de paiement</label>
            <select className="form-input" value={modePaiement} onChange={(e) => setModePaiement(e.target.value)}>
              {["Virement", "Chèque", "CB", "Espèces"].map((m) => <option key={m}>{m}</option>)}
            </select>
          </div>

          {isIntermediaire && (
            <div className="bg-accent/5 border border-accent/20 rounded-lg p-3 text-sm text-accent">
              Facture intermédiaire — l'échéancier standard est complet, vous éditez une facture supplémentaire.
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <button onClick={onClose} className="btn-ghost">Annuler</button>
          <button onClick={handleCreate} className="btn-gold flex items-center gap-2">
            <Receipt size={14} /> Créer la facture
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Commande Detail ──
function CommandeDetail({ commande, onBack, onReload }: {
  commande: Commande;
  onBack: () => void;
  onReload: () => void;
}) {
  const navigate = useNavigate();
  const [factureModal, setFactureModal] = useState(false);
  const totalFacture = getCommandeTotalFacture(commande);
  const resteAFacturer = getCommandeResteAFacturer(commande);
  const pctFacture = commande.totalTTC > 0 ? Math.round((totalFacture / commande.totalTTC) * 100) : 0;

  return (
    <div className="p-6 lg:p-8 w-full">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 hover:bg-muted rounded transition-colors"><X size={18} /></button>
          <div>
            <h1 className="font-display text-[32px] font-semibold text-foreground tracking-tight">
              {commande.numero}
            </h1>
            <p className="text-[13px] text-muted-foreground mt-0.5 font-body">
              {commande.client.prenom} {commande.client.nom}
              {commande.referenceAffaire && <> — {commande.referenceAffaire}</>}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className={`inline-flex items-center px-3 py-1.5 text-[11px] font-semibold tracking-wide ${COMMANDE_STATUT_CLASS[commande.statut]}`}>
            {COMMANDE_STATUT_LABELS[commande.statut]}
          </span>
          {resteAFacturer > 0.01 && (
            <button onClick={() => setFactureModal(true)} className="btn-gold flex items-center gap-2 text-xs">
              <Receipt size={14} /> Créer une facture
            </button>
          )}
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-8">
        <div className="luxury-card !p-4 border-l-[3px] border-l-accent">
          <span className="text-[11px] uppercase tracking-wide text-muted-foreground font-body">Total TTC</span>
          <p className="font-display text-xl text-foreground mt-1">{formatEUR(commande.totalTTC)}</p>
        </div>
        <div className="luxury-card !p-4 border-l-[3px] border-l-[hsl(220_75%_45%)]">
          <span className="text-[11px] uppercase tracking-wide text-muted-foreground font-body">Facturé</span>
          <p className="font-display text-xl text-foreground mt-1">{formatEUR(totalFacture)}</p>
        </div>
        <div className="luxury-card !p-4 border-l-[3px] border-l-accent">
          <span className="text-[11px] uppercase tracking-wide text-muted-foreground font-body">Reste à facturer</span>
          <p className="font-display text-xl text-accent mt-1">{formatEUR(resteAFacturer)}</p>
        </div>
        <div className="luxury-card !p-4 border-l-[3px] border-l-[hsl(var(--success))]">
          <span className="text-[11px] uppercase tracking-wide text-muted-foreground font-body">Avancement</span>
          <div className="flex items-end gap-2 mt-1">
            <p className="font-display text-xl text-foreground">{pctFacture}%</p>
            <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden mb-1">
              <div className="h-full bg-[hsl(var(--success))] rounded-full transition-all" style={{ width: `${pctFacture}%` }} />
            </div>
          </div>
        </div>
      </div>

      {/* Échéancier */}
      <div className="luxury-card mb-6">
        <h3 className="section-title">Échéancier de facturation</h3>
        <div className="flex gap-2 mb-4">
          {ECHEANCIER_DEFAUT.map((e, i) => {
            const done = i < commande.factures.length;
            const current = i === commande.factures.length;
            const fact = commande.factures[i];
            return (
              <div
                key={i}
                className={`flex-1 rounded-lg p-3 border-2 transition-all ${
                  done
                    ? "bg-[hsl(150_40%_96%)] border-[hsl(var(--success))]"
                    : current
                    ? "bg-accent/5 border-accent border-dashed"
                    : "bg-muted/20 border-border border-dashed"
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className={`text-[11px] font-semibold ${done ? "text-[hsl(var(--success))]" : current ? "text-accent" : "text-muted-foreground"}`}>
                    {e.pct}%
                  </span>
                  {done && <span className="text-[10px] text-[hsl(var(--success))] font-semibold">✓</span>}
                </div>
                <p className="text-[11px] font-medium">{e.label}</p>
                <p className="text-[11px] text-muted-foreground font-mono mt-1">
                  {done ? formatEUR(fact.montantTTC) : formatEUR(commande.totalTTC * e.pct / 100)}
                </p>
                {done && fact && (
                  <button
                    onClick={() => navigate(`/factures/${fact.factureId}/apercu`)}
                    className="text-[10px] text-accent hover:underline mt-1 flex items-center gap-1"
                  >
                    <Eye size={10} /> {fact.numero}
                  </button>
                )}
                {current && resteAFacturer > 0.01 && (
                  <button
                    onClick={() => setFactureModal(true)}
                    className="text-[10px] text-accent hover:underline mt-1 flex items-center gap-1"
                  >
                    <Plus size={10} /> Créer
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {/* Factures intermédiaires */}
        {commande.factures.length > ECHEANCIER_DEFAUT.length && (
          <div className="border-t border-border pt-3 mt-3">
            <p className="form-label mb-2">Factures intermédiaires</p>
            {commande.factures.slice(ECHEANCIER_DEFAUT.length).map((f) => (
              <div key={f.factureId} className="flex items-center justify-between py-1.5 text-sm">
                <span className="font-mono text-[13px]">{f.numero}</span>
                <span className="text-muted-foreground">{f.label}</span>
                <span className="font-mono">{formatEUR(f.montantTTC)}</span>
                <button onClick={() => navigate(`/factures/${f.factureId}/apercu`)} className="text-accent text-[11px] hover:underline">
                  <Eye size={12} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Détails commande */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="luxury-card">
          <h3 className="section-title">Client</h3>
          <div className="text-sm space-y-1">
            <p className="font-semibold">{commande.client.prenom} {commande.client.nom}</p>
            {commande.client.societe && <p>{commande.client.societe}</p>}
            <p>{commande.client.rue}</p>
            <p>{commande.client.codePostal} {commande.client.ville}, {commande.client.pays}</p>
            <p className="text-muted-foreground">{commande.client.email}</p>
            <p className="text-muted-foreground">{commande.client.telephone}</p>
          </div>
        </div>
        <div className="luxury-card">
          <h3 className="section-title">Informations</h3>
          <div className="text-sm space-y-2">
            <div className="flex justify-between"><span className="text-muted-foreground">Devis d'origine</span><span className="font-mono">{commande.devisNumero}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Date création</span><span>{formatDate(commande.dateCreation)}</span></div>
            {commande.dateLivraison && <div className="flex justify-between"><span className="text-muted-foreground">Livraison prévue</span><span>{formatDate(commande.dateLivraison)}</span></div>}
            {commande.referenceAffaire && <div className="flex justify-between"><span className="text-muted-foreground">Réf. affaire</span><span>{commande.referenceAffaire}</span></div>}
          </div>
        </div>
      </div>

      {/* Lignes */}
      <div className="luxury-card mb-6">
        <h3 className="section-title">Produits & prestations</h3>
        <table className="w-full text-sm">
          <thead>
            <tr className="table-header-dark">
              <th className="text-left">Désignation</th>
              <th className="text-center w-16">Qté</th>
              <th className="text-right w-28">Prix U. HT</th>
              <th className="text-center w-16">TVA</th>
              <th className="text-right w-28">Total HT</th>
            </tr>
          </thead>
          <tbody>
            {commande.lignes.map((l, i) => (
              <tr key={l.id} className={`border-b border-border ${i % 2 === 1 ? "bg-background" : ""}`}>
                <td className="py-3 px-4">
                  <span className="font-medium">{l.designation}</span>
                  {l.description && <p className="text-xs text-muted-foreground italic whitespace-pre-line">{l.description}</p>}
                  {l.options.map((o) => (
                    <p key={o.id} className="text-xs text-muted-foreground ml-4 mt-0.5">↳ {o.designation} — {formatEUR(o.prixHT)}</p>
                  ))}
                </td>
                <td className="py-3 text-center font-mono">{l.quantite}</td>
                <td className="py-3 text-right font-mono">{formatEUR(l.prixUnitaireHT)}</td>
                <td className="py-3 text-center">{l.tva}%</td>
                <td className="py-3 text-right font-mono font-medium">{formatEUR(l.quantite * l.prixUnitaireHT)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Historique factures */}
      {commande.factures.length > 0 && (
        <div className="luxury-card">
          <h3 className="section-title">Historique des factures</h3>
          <table className="w-full text-sm">
            <thead>
              <tr className="table-header-dark">
                <th className="text-left">N° Facture</th>
                <th className="text-left">Libellé</th>
                <th className="text-center">Date</th>
                <th className="text-right">Montant TTC</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {commande.factures.map((f, i) => (
                <tr key={f.factureId} className={`border-b border-border ${i % 2 === 1 ? "bg-background" : ""}`}>
                  <td className="px-4 py-2 font-mono text-[13px] font-medium">{f.numero}</td>
                  <td className="px-4 py-2">{f.label}</td>
                  <td className="px-4 py-2 text-center text-muted-foreground">{formatDate(f.dateCreation)}</td>
                  <td className="px-4 py-2 text-right font-mono font-medium">{formatEUR(f.montantTTC)}</td>
                  <td className="px-4 py-2 text-right">
                    <button
                      onClick={() => navigate(`/factures/${f.factureId}/apercu`)}
                      className="p-2 rounded hover:bg-muted transition-colors"
                      title="Aperçu PDF"
                    >
                      <Eye size={14} className="text-muted-foreground" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal */}
      {factureModal && (
        <CreerFactureModal
          commande={commande}
          onClose={() => setFactureModal(false)}
          onDone={onReload}
        />
      )}
    </div>
  );
}

// ════════════════════════════════════════
// MAIN COMMANDES PAGE
// ════════════════════════════════════════
export default function Commandes() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [commandes, setCommandes] = useState<Commande[]>([]);
  const [search, setSearch] = useState("");
  const [factureModalCmd, setFactureModalCmd] = useState<Commande | null>(null);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    try {
      setLoading(true);
      const list = await dbLoadCommandes();
      setCommandes(list);
    } catch (err) {
      toast.error("Erreur lors du chargement des commandes.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  const filtered = commandes.filter(
    (c) =>
      c.client.nom.toLowerCase().includes(search.toLowerCase()) ||
      c.client.prenom.toLowerCase().includes(search.toLowerCase()) ||
      c.numero.toLowerCase().includes(search.toLowerCase()) ||
      (c.referenceAffaire || "").toLowerCase().includes(search.toLowerCase())
  );

  const selectedCommande = id ? commandes.find((c) => c.id === id) : null;

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-full border-4 border-accent border-t-transparent animate-spin"></div>
          <p className="text-xs text-muted-foreground font-body">Chargement des commandes...</p>
        </div>
      </div>
    );
  }

  if (selectedCommande) {
    return (
      <CommandeDetail
        commande={selectedCommande}
        onBack={() => { reload(); navigate("/commandes"); }}
        onReload={reload}
      />
    );
  }

  const deleteCommande = async (c: Commande) => {
    if (c.factures.length > 0) {
      toast.error("Impossible de supprimer une commande avec des factures");
      return;
    }
    try {
      await dbDeleteCommande(c.id);
      await reload();
      toast.success("Commande supprimée ✓");
    } catch (err) {
      toast.error("Erreur lors de la suppression de la commande.");
    }
  };

  return (
    <div className="p-6 lg:p-8 w-full">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-display text-[32px] font-semibold text-foreground tracking-tight">
            Commandes Clients
          </h1>
          <p className="text-[13px] text-muted-foreground mt-1 font-body">
            Suivi des commandes et échéancier de facturation
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          placeholder="Rechercher par client, n° commande ou réf. affaire..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="form-input pl-11 pr-4 h-11 rounded-lg shadow-[var(--shadow-card)]"
        />
      </div>

      {filtered.length === 0 ? (
        <div className="luxury-card p-16 text-center">
          <Package size={48} className="mx-auto text-muted-foreground/20 mb-4" />
          <h2 className="font-display text-xl text-foreground mb-2">
            Aucune commande
          </h2>
          <p className="text-sm text-muted-foreground mb-6">
            Les commandes sont créées automatiquement lorsqu'un devis est accepté et converti.
          </p>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-lg overflow-hidden shadow-[var(--shadow-card)]">
          <table className="w-full text-sm">
            <thead>
              <tr className="table-header-dark">
                <th className="text-left">N° Commande</th>
                <th className="text-left">Client</th>
                <th className="text-left">Date</th>
                <th className="text-right">Total TTC</th>
                <th className="text-right">Facturé</th>
                <th className="text-center">Avancement</th>
                <th className="text-center">Statut</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c, i) => {
                const totalFact = getCommandeTotalFacture(c);
                const reste = getCommandeResteAFacturer(c);
                const pctFact = c.totalTTC > 0 ? Math.round((totalFact / c.totalTTC) * 100) : 0;
                return (
                  <tr
                    key={c.id}
                    className={`border-b border-border last:border-0 transition-colors duration-150 hover:bg-accent/5 cursor-pointer ${
                      i % 2 === 1 ? "bg-background" : "bg-card"
                    }`}
                    onClick={() => navigate(`/commandes/${c.id}`)}
                  >
                    <td className="px-4 py-3 font-mono text-[13px] font-medium">{c.numero}</td>
                    <td className="px-4 py-3">
                      <span className="font-medium">{c.client.prenom} {c.client.nom}</span>
                      {c.referenceAffaire && <span className="text-muted-foreground ml-1.5 text-xs">— {c.referenceAffaire}</span>}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{formatDate(c.dateCreation)}</td>
                    <td className="px-4 py-3 text-right font-mono font-medium">{formatEUR(c.totalTTC)}</td>
                    <td className="px-4 py-3 text-right font-mono text-[13px]">{formatEUR(totalFact)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2 justify-center">
                        <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-accent rounded-full transition-all"
                            style={{ width: `${pctFact}%` }}
                          />
                        </div>
                        <span className="text-[11px] font-mono text-muted-foreground">{pctFact}%</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex items-center px-3 py-1 text-[11px] font-semibold tracking-wide ${COMMANDE_STATUT_CLASS[c.statut]}`}>
                        {COMMANDE_STATUT_LABELS[c.statut]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                        {reste > 0.01 && (
                          <button
                            onClick={() => setFactureModalCmd(c)}
                            className="p-2 rounded hover:bg-muted transition-colors"
                            title="Créer une facture"
                          >
                            <Receipt size={14} className="text-accent" />
                          </button>
                        )}
                        <button
                          onClick={() => navigate(`/commandes/${c.id}`)}
                          className="p-2 rounded hover:bg-muted transition-colors"
                          title="Voir le détail"
                        >
                          <Eye size={14} className="text-muted-foreground" />
                        </button>
                        <button
                          onClick={() => deleteCommande(c)}
                          className="p-2 rounded hover:bg-muted transition-colors"
                          title="Supprimer"
                        >
                          <Trash2 size={14} className="text-muted-foreground" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Facture modal depuis la liste */}
      {factureModalCmd && (
        <CreerFactureModal
          commande={factureModalCmd}
          onClose={() => setFactureModalCmd(null)}
          onDone={reload}
        />
      )}
    </div>
  );
}
