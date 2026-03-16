import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Plus, Eye, Pencil, Copy, FileText } from "lucide-react";
import {
  loadQuotes,
  saveQuotes,
  initializeStorage,
  formatEUR,
  formatDate,
  calcTotals,
  STATUT_LABELS,
  createEmptyQuote,
  uid,
  type Quote,
} from "@/lib/quote-data";

const statusClass: Record<Quote["statut"], string> = {
  brouillon: "status-brouillon",
  envoye: "status-envoye",
  accepte: "status-accepte",
  refuse: "status-refuse",
};

export default function Dashboard() {
  const navigate = useNavigate();
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    initializeStorage();
    setQuotes(loadQuotes());
  }, []);

  const filtered = quotes.filter(
    (q) =>
      q.client.nom.toLowerCase().includes(search.toLowerCase()) ||
      q.client.prenom.toLowerCase().includes(search.toLowerCase()) ||
      q.numero.toLowerCase().includes(search.toLowerCase())
  );

  const duplicateQuote = (q: Quote) => {
    const all = loadQuotes();
    const dup: Quote = {
      ...JSON.parse(JSON.stringify(q)),
      id: uid(),
      numero: `${q.numero}-COPIE`,
      statut: "brouillon" as const,
      date: new Date().toISOString().split("T")[0],
    };
    all.push(dup);
    saveQuotes(all);
    setQuotes(all);
  };

  return (
    <div className="p-8 lg:p-10 max-w-6xl mx-auto">
      {/* Header bar */}
      <div className="flex items-center justify-between mb-10">
        <div>
          <h1 className="font-display text-[28px] font-semibold text-foreground tracking-tight">
            Tableau de bord
          </h1>
          <p className="text-[13px] text-muted-foreground mt-1 font-body">
            Gestion des devis ORALIS
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

      {/* Search */}
      <div className="relative mb-6">
        <Search
          size={16}
          className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground"
        />
        <input
          type="text"
          placeholder="Rechercher par client ou n° de devis..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="form-input pl-11 pr-4 h-11 rounded-lg shadow-card"
        />
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="luxury-card p-16 text-center">
          <FileText size={48} className="mx-auto text-muted-foreground/20 mb-4" />
          <h2 className="font-display text-xl text-foreground mb-2">
            Aucun devis trouvé
          </h2>
          <p className="text-sm text-muted-foreground mb-6">
            {search
              ? "Aucun résultat pour votre recherche."
              : "Commencez par créer votre premier devis premium."}
          </p>
          {!search && (
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
          <table className="w-full text-sm">
            <thead>
              <tr className="table-header-dark">
                <th className="text-left">N° Devis</th>
                <th className="text-left">Client</th>
                <th className="text-left">Date</th>
                <th className="text-right">Montant TTC</th>
                <th className="text-center">Statut</th>
                <th className="text-right">Actions</th>
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
                    <td className="px-4 py-3.5 font-medium font-mono text-[13px]">
                      {q.numero}
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="font-medium">{q.client.prenom} {q.client.nom}</span>
                      {q.client.societe && (
                        <span className="text-muted-foreground ml-1.5 text-xs">
                          — {q.client.societe}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3.5 text-muted-foreground">
                      {formatDate(q.date)}
                    </td>
                    <td className="px-4 py-3.5 text-right font-medium font-mono text-[13px]">
                      {formatEUR(totalTTC)}
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      <span
                        className={`inline-block px-3 py-1 text-[11px] font-semibold tracking-wide ${statusClass[q.statut]}`}
                      >
                        {STATUT_LABELS[q.statut]}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => navigate(`/devis/${q.id}`)}
                          className="p-2 rounded hover:bg-muted transition-colors"
                          title="Modifier"
                        >
                          <Pencil size={14} className="text-muted-foreground" />
                        </button>
                        <button
                          onClick={() => navigate(`/devis/${q.id}/apercu`)}
                          className="p-2 rounded hover:bg-muted transition-colors"
                          title="Aperçu"
                        >
                          <Eye size={14} className="text-muted-foreground" />
                        </button>
                        <button
                          onClick={() => duplicateQuote(q)}
                          className="p-2 rounded hover:bg-muted transition-colors"
                          title="Dupliquer"
                        >
                          <Copy size={14} className="text-muted-foreground" />
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
    </div>
  );
}
