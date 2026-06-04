import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Plus, Eye, Pencil, Copy, FileText, ArrowRightCircle, Trash2 } from "lucide-react";
import {
  formatEUR,
  formatDate,
  calcTotals,
  STATUT_LABELS,
  uid,
  type Quote,
} from "@/lib/quote-data";
import { dbLoadQuotes, dbSaveQuote, dbDeleteQuote } from "@/lib/supabase-data/devis";
import { dbLoadCommandes, dbSaveCommande } from "@/lib/supabase-data/commandes";
import { useCallback } from "react";
import {
  createCommandeFromDevis,
} from "@/lib/commande-data";
import { toast } from "sonner";
import { ConfirmModal } from "@/components/ConfirmModal";

const statusClass: Record<Quote["statut"], string> = {
  brouillon: "status-brouillon",
  envoye: "status-envoye",
  accepte: "status-accepte",
  refuse: "status-refuse",
};

const TABS: { label: string; value: Quote["statut"] | "tous" }[] = [
  { label: "Tous", value: "tous" },
  { label: "Brouillon", value: "brouillon" },
  { label: "Envoyé", value: "envoye" },
  { label: "Accepté", value: "accepte" },
  { label: "Refusé", value: "refuse" },
];

export default function QuotesList() {
  const navigate = useNavigate();
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [commandes, setCommandes] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<Quote["statut"] | "tous">("tous");
  const [convertModal, setConvertModal] = useState<Quote | null>(null);
  const [convertRef, setConvertRef] = useState("");
  const [loading, setLoading] = useState(true);
  const [confirmDelete, setConfirmDelete] = useState<{
    isOpen: boolean;
    message: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    message: "",
    onConfirm: () => {},
  });

  const hasCmdForQuote = (qId: string) => commandes.some((c: any) => c.devisId === qId);

  const fetchQuotes = useCallback(async () => {
    try {
      const [list, cmds] = await Promise.all([dbLoadQuotes(), dbLoadCommandes()]);
      setQuotes(list);
      setCommandes(cmds);
    } catch (err) {
      toast.error("Erreur lors du chargement des devis.");
    } finally {
      setLoading(false);
    }
  }, []);

  const handleConvert = async () => {
    if (!convertModal) return;
    try {
      const updatedQuote = { ...convertModal, statut: "accepte" as const };
      await dbSaveQuote(updatedQuote);
      
      const cmds = await dbLoadCommandes();
      const cmd = createCommandeFromDevis(convertModal, convertRef, "", cmds);
      await dbSaveCommande(cmd);
      
      toast.success(`Commande ${cmd.numero} créée ✓`);
      setConvertModal(null);
      setConvertRef("");
      navigate(`/commandes/${cmd.id}`);
    } catch (err) {
      toast.error("Erreur lors de la conversion en commande.");
    }
  };

  useEffect(() => {
    fetchQuotes();
  }, [fetchQuotes]);

  const filtered = quotes
    .filter(
      (q) =>
        q.client.nom.toLowerCase().includes(search.toLowerCase()) ||
        q.client.prenom.toLowerCase().includes(search.toLowerCase()) ||
        q.numero.toLowerCase().includes(search.toLowerCase())
    )
    .filter((q) => activeTab === "tous" || q.statut === activeTab);

  const duplicateQuote = async (q: Quote) => {
    try {
      const dup: Quote = {
        ...JSON.parse(JSON.stringify(q)),
        id: uid(),
        numero: `${q.numero}-COPIE`,
        statut: "brouillon" as const,
        date: new Date().toISOString().split("T")[0],
      };
      await dbSaveQuote(dup);
      toast.success("Devis dupliqué !");
      await fetchQuotes();
    } catch (err) {
      toast.error("Erreur lors de la duplication du devis.");
    }
  };

  const deleteQuote = (q: Quote) => {
    setConfirmDelete({
      isOpen: true,
      message: "Êtes-vous sûr de vouloir supprimer ce devis ?",
      onConfirm: async () => {
        try {
          await dbDeleteQuote(q.id);
          toast.success("Devis supprimé ✓");
          await fetchQuotes();
        } catch (err) {
          toast.error("Erreur lors de la suppression du devis.");
        }
      },
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-full border-4 border-accent border-t-transparent animate-spin"></div>
          <p className="text-xs text-muted-foreground font-body">Chargement des devis...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 w-full">
      <div className="flex items-center justify-between mb-10">
        <div>
          <h1 className="font-display text-[32px] font-semibold text-foreground tracking-tight">
            Liste des Devis
          </h1>
          <p className="text-[13px] text-muted-foreground mt-1 font-body">
            Tous vos devis ORALIS
          </p>
        </div>
        <button
          onClick={() => navigate("/devis/nouveau")}
          className="btn-gold flex items-center gap-2"
        >
          <Plus size={16} />
          Nouveau Devis
        </button>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-0 mb-6 border-b border-border">
        {TABS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setActiveTab(tab.value)}
            className={`px-6 py-3 text-[15px] font-medium transition-colors duration-150 border-b-2 -mb-px ${
              activeTab === tab.value
                ? "border-accent text-accent"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
            style={{ fontFamily: "var(--font-body)" }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <Search
          size={18}
          className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground"
        />
        <input
          type="text"
          placeholder="Rechercher par client ou n° de devis..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="form-input pl-12 pr-4 h-12 text-[15px] rounded-lg shadow-card"
        />
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="luxury-card p-16 text-center">
          <FileText size={48} className="mx-auto text-muted-foreground/20 mb-4" />
          <h2 className="font-display text-xl text-foreground mb-2">
            Aucun devis trouvé
          </h2>
          <p className="text-[14px] text-muted-foreground mb-6">
            {search || activeTab !== "tous"
              ? "Aucun résultat pour votre recherche."
              : "Commencez par créer votre premier devis premium."}
          </p>
          {!search && activeTab === "tous" && (
            <button
              onClick={() => navigate("/devis/nouveau")}
              className="btn-gold inline-flex items-center gap-2"
            >
              <Plus size={16} />
              Créer un devis
            </button>
          )}
        </div>
      ) : (
        <div className="bg-card border border-border rounded-lg overflow-hidden shadow-card">
          <table className="w-full text-[15px]">
            <thead>
              <tr className="table-header-dark">
                <th className="text-left px-6 py-4">N° Devis</th>
                <th className="text-left px-6 py-4">Client</th>
                <th className="text-left px-6 py-4">Date</th>
                <th className="text-right px-6 py-4">Montant TTC</th>
                <th className="text-center px-6 py-4">Statut</th>
                <th className="text-right px-6 py-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((q, i) => {
                const { totalTTC } = calcTotals(q.lignes);
                return (
                  <tr
                    key={q.id}
                    className={`border-b border-border last:border-0 transition-colors duration-150 hover:bg-accent/5 ${
                      i % 2 === 1 ? "bg-background" : "bg-card"
                    }`}
                  >
                    <td className="px-6 py-4 font-medium font-mono text-[15px]">
                      {q.numero}
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-semibold text-[15px]">{q.client.prenom} {q.client.nom}</span>
                      {q.client.societe && (
                        <span className="text-muted-foreground ml-1.5 text-[13px]">
                          — {q.client.societe}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-muted-foreground text-[14px]">
                      {formatDate(q.date)}
                    </td>
                    <td className="px-6 py-4 text-right font-semibold font-mono text-[15px]">
                      {formatEUR(totalTTC)}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span
                        className={`inline-block px-3 py-1 text-[12px] font-semibold tracking-wide ${statusClass[q.statut]}`}
                      >
                        {STATUT_LABELS[q.statut]}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => navigate(`/devis/${q.id}`)}
                          className="p-2 rounded hover:bg-muted transition-colors"
                          title="Modifier"
                        >
                          <Pencil size={16} className="text-muted-foreground" />
                        </button>
                        <button
                          onClick={() => navigate(`/devis/${q.id}/apercu`)}
                          className="p-2 rounded hover:bg-muted transition-colors"
                          title="Aperçu"
                        >
                          <Eye size={16} className="text-muted-foreground" />
                        </button>
                        {q.statut === "accepte" && !hasCmdForQuote(q.id) && (
                          <button
                            onClick={() => { setConvertRef(""); setConvertModal(q); }}
                            className="px-3 py-1.5 rounded text-[12px] font-semibold bg-accent text-accent-foreground hover:opacity-90 transition-opacity flex items-center gap-1"
                            title="Convertir en commande"
                          >
                            <span>🔁</span> Commande
                          </button>
                        )}
                        <button
                          onClick={() => duplicateQuote(q)}
                          className="p-2 rounded hover:bg-muted transition-colors"
                          title="Dupliquer"
                        >
                          <Copy size={16} className="text-muted-foreground" />
                        </button>
                        <button
                          onClick={() => deleteQuote(q)}
                          className="p-2 rounded hover:bg-destructive/10 text-destructive transition-colors"
                          title="Supprimer"
                        >
                          <Trash2 size={16} />
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

      {/* Modal de conversion en commande */}
      {convertModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-card border border-border rounded-xl shadow-2xl w-full max-w-md p-6">
            <h2 className="font-display text-xl font-semibold mb-1">Convertir le devis en commande</h2>
            <p className="text-[14px] text-muted-foreground mb-4">
              {convertModal.numero} — {convertModal.client.prenom} {convertModal.client.nom}
            </p>
            <div className="bg-accent/10 border border-accent/20 rounded-lg px-4 py-3 mb-4 text-[14px] text-foreground">
              <p className="font-medium">Conditions de paiement appliquées :</p>
              <p className="text-muted-foreground mt-1">50% à la commande · 45% à la livraison · 5% fin de travaux</p>
            </div>
            <div className="mb-5">
              <label className="form-label">Référence affaire (optionnel)</label>
              <input
                type="text"
                className="form-input mt-1"
                placeholder="Ex: Pergola BOILON - Saint Max"
                value={convertRef}
                onChange={(e) => setConvertRef(e.target.value)}
              />
            </div>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setConvertModal(null)} className="btn-outline-gold">Annuler</button>
              <button onClick={handleConvert} className="btn-gold">Convertir en commande</button>
            </div>
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
