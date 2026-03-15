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
    <div className="p-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-display text-3xl font-semibold text-foreground">
            Tableau de bord
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
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
          className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
        />
        <input
          type="text"
          placeholder="Rechercher par client ou n° de devis..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 bg-card border border-border text-sm font-body placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-accent"
        />
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="bg-card border border-border p-16 text-center">
          <FileText size={48} className="mx-auto text-muted-foreground/30 mb-4" />
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
        <div className="bg-card border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="text-left px-4 py-3 font-medium text-muted-foreground text-xs uppercase tracking-wider">
                  N° Devis
                </th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground text-xs uppercase tracking-wider">
                  Client
                </th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground text-xs uppercase tracking-wider">
                  Date
                </th>
                <th className="text-right px-4 py-3 font-medium text-muted-foreground text-xs uppercase tracking-wider">
                  Montant TTC
                </th>
                <th className="text-center px-4 py-3 font-medium text-muted-foreground text-xs uppercase tracking-wider">
                  Statut
                </th>
                <th className="text-right px-4 py-3 font-medium text-muted-foreground text-xs uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((q) => {
                const { totalTTC } = calcTotals(q.lignes);
                return (
                  <tr
                    key={q.id}
                    className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors duration-150"
                  >
                    <td className="px-4 py-3 font-medium font-body">
                      {q.numero}
                    </td>
                    <td className="px-4 py-3">
                      {q.client.prenom} {q.client.nom}
                      {q.client.societe && (
                        <span className="text-muted-foreground ml-1">
                          — {q.client.societe}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {formatDate(q.date)}
                    </td>
                    <td className="px-4 py-3 text-right font-medium">
                      {formatEUR(totalTTC)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`inline-block px-2.5 py-0.5 text-xs font-medium tracking-wide ${statusClass[q.statut]}`}
                      >
                        {STATUT_LABELS[q.statut]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => navigate(`/devis/${q.id}`)}
                          className="p-1.5 hover:bg-muted transition-colors"
                          title="Modifier"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          onClick={() => navigate(`/devis/${q.id}/apercu`)}
                          className="p-1.5 hover:bg-muted transition-colors"
                          title="Aperçu"
                        >
                          <Eye size={14} />
                        </button>
                        <button
                          onClick={() => duplicateQuote(q)}
                          className="p-1.5 hover:bg-muted transition-colors"
                          title="Dupliquer"
                        >
                          <Copy size={14} />
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
