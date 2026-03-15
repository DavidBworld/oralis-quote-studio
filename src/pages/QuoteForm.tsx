import { useState, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Plus, Trash2, ChevronDown } from "lucide-react";
import {
  loadQuotes,
  saveQuotes,
  createEmptyQuote,
  emptyLine,
  emptyOption,
  formatEUR,
  formatDate,
  expiryDate,
  calcTotals,
  lineMontantHT,
  PRODUCT_CATALOG,
  OPTION_CATALOG,
  VALIDITE_OPTIONS,
  PAYS_OPTIONS,
  STATUT_LABELS,
  type Quote,
  type QuoteLine,
  type QuoteOption,
} from "@/lib/quote-data";
import { loadSettings, getEnabledTVARates, getLegalMention } from "@/lib/settings-data";

function AutocompleteInput({
  value,
  onChange,
  suggestions,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  suggestions: string[];
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const [filtered, setFiltered] = useState<string[]>([]);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleChange = (v: string) => {
    onChange(v);
    setFiltered(suggestions.filter((s) => s.toLowerCase().includes(v.toLowerCase())));
    setOpen(true);
  };

  return (
    <div ref={ref} className="relative">
      <input
        type="text"
        value={value}
        onChange={(e) => handleChange(e.target.value)}
        onFocus={() => {
          setFiltered(suggestions.filter((s) => s.toLowerCase().includes(value.toLowerCase())));
          setOpen(true);
        }}
        placeholder={placeholder}
        className="w-full px-3 py-2 bg-card border border-border text-sm font-body focus:outline-none focus:ring-1 focus:ring-accent"
      />
      {open && filtered.length > 0 && (
        <ul className="absolute z-20 left-0 right-0 bg-card border border-border shadow-sm max-h-48 overflow-auto mt-0.5">
          {filtered.map((s) => (
            <li
              key={s}
              className="px-3 py-2 text-sm hover:bg-muted cursor-pointer"
              onMouseDown={() => {
                onChange(s);
                setOpen(false);
              }}
            >
              {s}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function QuoteForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [quote, setQuote] = useState<Quote | null>(null);

  const settings = loadSettings();
  const TVA_RATES = getEnabledTVARates(settings);
  const catalogDesignations = settings.catalogProduits.map((p) => p.designation);
  const allProductSuggestions = [...PRODUCT_CATALOG, ...catalogDesignations.filter((d) => !PRODUCT_CATALOG.includes(d))];

  useEffect(() => {
    const all = loadQuotes();
    if (id && id !== "nouveau") {
      const found = all.find((q) => q.id === id);
      if (found) setQuote(found);
      else navigate("/");
    } else {
      setQuote(createEmptyQuote(all));
    }
  }, [id]);

  if (!quote) return null;

  const update = (patch: Partial<Quote>) => setQuote({ ...quote, ...patch });
  const updateClient = (patch: Partial<Quote["client"]>) =>
    setQuote({ ...quote, client: { ...quote.client, ...patch } });

  const updateLine = (lineId: string, patch: Partial<QuoteLine>) => {
    update({
      lignes: quote.lignes.map((l) => (l.id === lineId ? { ...l, ...patch } : l)),
    });
  };

  const updateOption = (lineId: string, optId: string, patch: Partial<QuoteOption>) => {
    update({
      lignes: quote.lignes.map((l) =>
        l.id === lineId
          ? { ...l, options: l.options.map((o) => (o.id === optId ? { ...o, ...patch } : o)) }
          : l
      ),
    });
  };

  const addLine = () => update({ lignes: [...quote.lignes, emptyLine()] });
  const removeLine = (lineId: string) =>
    update({ lignes: quote.lignes.filter((l) => l.id !== lineId) });
  const addOption = (lineId: string) =>
    updateLine(lineId, {
      options: [
        ...quote.lignes.find((l) => l.id === lineId)!.options,
        emptyOption(),
      ],
    });
  const removeOption = (lineId: string, optId: string) =>
    updateLine(lineId, {
      options: quote.lignes.find((l) => l.id === lineId)!.options.filter((o) => o.id !== optId),
    });

  const save = () => {
    const all = loadQuotes();
    const idx = all.findIndex((q) => q.id === quote.id);
    if (idx >= 0) all[idx] = quote;
    else all.push(quote);
    saveQuotes(all);
    navigate("/");
  };

  const totals = calcTotals(quote.lignes);

  const inputCls = "w-full px-3 py-2 bg-card border border-border text-sm font-body focus:outline-none focus:ring-1 focus:ring-accent";
  const labelCls = "block text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1";

  return (
    <div className="p-8 max-w-5xl mx-auto pb-32">
      <h1 className="font-display text-3xl font-semibold mb-1">
        {id === "nouveau" ? "Nouveau Devis" : `Devis ${quote.numero}`}
      </h1>
      <p className="text-sm text-muted-foreground mb-8">
        {id === "nouveau"
          ? "Créez un nouveau devis premium"
          : "Modifiez les informations du devis"}
      </p>

      {/* Section A — Header */}
      <section className="bg-card border border-border p-6 mb-4">
        <h2 className="font-display text-lg font-semibold mb-4">Informations du devis</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className={labelCls}>N° Devis</label>
            <input type="text" value={quote.numero} readOnly className={`${inputCls} bg-muted`} />
          </div>
          <div>
            <label className={labelCls}>Date</label>
            <input
              type="date"
              value={quote.date}
              onChange={(e) => update({ date: e.target.value })}
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>Validité (jours)</label>
            <select
              value={quote.validite}
              onChange={(e) => update({ validite: Number(e.target.value) })}
              className={inputCls}
            >
              {VALIDITE_OPTIONS.map((v) => (
                <option key={v} value={v}>{v} jours</option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelCls}>Expiration</label>
            <input
              type="text"
              readOnly
              value={formatDate(expiryDate(quote.date, quote.validite))}
              className={`${inputCls} bg-muted`}
            />
          </div>
        </div>
        <div className="mt-4 max-w-xs">
          <label className={labelCls}>Statut</label>
          <select
            value={quote.statut}
            onChange={(e) => update({ statut: e.target.value as Quote["statut"] })}
            className={inputCls}
          >
            {(Object.keys(STATUT_LABELS) as Quote["statut"][]).map((s) => (
              <option key={s} value={s}>{STATUT_LABELS[s]}</option>
            ))}
          </select>
        </div>
      </section>

      {/* Section B — Client */}
      <section className="bg-card border border-border p-6 mb-4">
        <h2 className="font-display text-lg font-semibold mb-4">Client</h2>
        <div className="flex gap-4 mb-4">
          {(["particulier", "professionnel"] as const).map((t) => (
            <button
              key={t}
              onClick={() => updateClient({ type: t })}
              className={`px-4 py-1.5 text-sm border transition-colors duration-150 ${
                quote.client.type === t
                  ? "bg-accent text-accent-foreground border-accent"
                  : "border-border text-muted-foreground hover:bg-muted"
              }`}
            >
              {t === "particulier" ? "Particulier" : "Professionnel"}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Prénom *</label>
            <input
              type="text"
              value={quote.client.prenom}
              onChange={(e) => updateClient({ prenom: e.target.value })}
              className={inputCls}
              required
            />
          </div>
          <div>
            <label className={labelCls}>Nom *</label>
            <input
              type="text"
              value={quote.client.nom}
              onChange={(e) => updateClient({ nom: e.target.value })}
              className={inputCls}
              required
            />
          </div>
          {quote.client.type === "professionnel" && (
            <div className="md:col-span-2">
              <label className={labelCls}>Société</label>
              <input
                type="text"
                value={quote.client.societe}
                onChange={(e) => updateClient({ societe: e.target.value })}
                className={inputCls}
              />
            </div>
          )}
          <div>
            <label className={labelCls}>Email *</label>
            <input
              type="email"
              value={quote.client.email}
              onChange={(e) => updateClient({ email: e.target.value })}
              className={inputCls}
              required
            />
          </div>
          <div>
            <label className={labelCls}>Téléphone</label>
            <input
              type="tel"
              value={quote.client.telephone}
              onChange={(e) => updateClient({ telephone: e.target.value })}
              className={inputCls}
            />
          </div>
          <div className="md:col-span-2">
            <label className={labelCls}>Adresse</label>
            <input
              type="text"
              value={quote.client.rue}
              onChange={(e) => updateClient({ rue: e.target.value })}
              className={inputCls}
              placeholder="Rue"
            />
          </div>
          <div>
            <label className={labelCls}>Ville</label>
            <input
              type="text"
              value={quote.client.ville}
              onChange={(e) => updateClient({ ville: e.target.value })}
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>Code postal</label>
            <input
              type="text"
              value={quote.client.codePostal}
              onChange={(e) => updateClient({ codePostal: e.target.value })}
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>Pays</label>
            <select
              value={quote.client.pays}
              onChange={(e) => updateClient({ pays: e.target.value })}
              className={inputCls}
            >
              {PAYS_OPTIONS.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>
        </div>
      </section>

      {/* Section C — Lines */}
      <section className="bg-card border border-border p-6 mb-4">
        <h2 className="font-display text-lg font-semibold mb-4">Lignes du devis</h2>

        {quote.lignes.map((line, li) => (
          <div key={line.id} className="mb-6 last:mb-0 page-break-avoid">
            <div className="flex items-start justify-between mb-3">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Ligne {li + 1}
              </span>
              {quote.lignes.length > 1 && (
                <button
                  onClick={() => removeLine(line.id)}
                  className="p-1 text-destructive hover:bg-destructive/10 transition-colors"
                >
                  <Trash2 size={14} />
                </button>
              )}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-12 gap-3 mb-2">
              <div className="md:col-span-5">
                <label className={labelCls}>Désignation</label>
                <AutocompleteInput
                  value={line.designation}
                  onChange={(v) => updateLine(line.id, { designation: v })}
                  suggestions={allProductSuggestions}
                  placeholder="Sélectionner ou saisir..."
                />
              </div>
              <div className="md:col-span-1">
                <label className={labelCls}>Qté</label>
                <input
                  type="number"
                  min={1}
                  value={line.quantite}
                  onChange={(e) => updateLine(line.id, { quantite: Number(e.target.value) || 1 })}
                  className={inputCls}
                />
              </div>
              <div className="md:col-span-2">
                <label className={labelCls}>Prix U. HT (€)</label>
                <input
                  type="number"
                  min={0}
                  step={0.01}
                  value={line.prixUnitaireHT || ""}
                  onChange={(e) => updateLine(line.id, { prixUnitaireHT: Number(e.target.value) || 0 })}
                  className={inputCls}
                />
              </div>
              <div className="md:col-span-2">
                <label className={labelCls}>TVA</label>
                <select
                  value={line.tva}
                  onChange={(e) => updateLine(line.id, { tva: Number(e.target.value) })}
                  className={inputCls}
                >
                  {TVA_RATES.map((r) => (
                    <option key={r} value={r}>{r}%</option>
                  ))}
                </select>
              </div>
              <div className="md:col-span-2">
                <label className={labelCls}>Montant HT</label>
                <div className="px-3 py-2 bg-muted border border-border text-sm font-medium">
                  {formatEUR(lineMontantHT(line))}
                </div>
              </div>
            </div>
            <div className="mb-3">
              <label className={labelCls}>Description</label>
              <textarea
                value={line.description}
                onChange={(e) => updateLine(line.id, { description: e.target.value })}
                className={`${inputCls} resize-none`}
                rows={2}
                placeholder="Détails optionnels..."
              />
            </div>

            {/* Options */}
            {line.options.length > 0 && (
              <div className="ml-4 border-l-2 border-accent pl-4 space-y-3 mb-3">
                {line.options.map((opt) => (
                  <div key={opt.id} className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
                    <div className="md:col-span-5">
                      <label className={labelCls}>Option</label>
                      <AutocompleteInput
                        value={opt.designation}
                        onChange={(v) => updateOption(line.id, opt.id, { designation: v })}
                        suggestions={OPTION_CATALOG}
                        placeholder="Sélectionner une option..."
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className={labelCls}>Prix HT (€)</label>
                      <input
                        type="number"
                        min={0}
                        step={0.01}
                        value={opt.prixHT || ""}
                        onChange={(e) =>
                          updateOption(line.id, opt.id, { prixHT: Number(e.target.value) || 0 })
                        }
                        className={inputCls}
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className={labelCls}>TVA</label>
                      <select
                        value={opt.tva}
                        onChange={(e) =>
                          updateOption(line.id, opt.id, { tva: Number(e.target.value) })
                        }
                        className={inputCls}
                      >
                        {TVA_RATES.map((r) => (
                          <option key={r} value={r}>{r}%</option>
                        ))}
                      </select>
                    </div>
                    <div className="md:col-span-2">
                      <label className={labelCls}>TTC</label>
                      <div className="px-3 py-2 bg-muted border border-border text-sm">
                        {formatEUR(opt.prixHT * (1 + opt.tva / 100))}
                      </div>
                    </div>
                    <div className="md:col-span-1 flex justify-end">
                      <button
                        onClick={() => removeOption(line.id, opt.id)}
                        className="p-1.5 text-destructive hover:bg-destructive/10 transition-colors"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <button
              onClick={() => addOption(line.id)}
              className="text-xs text-accent hover:underline flex items-center gap-1"
            >
              <Plus size={12} /> Ajouter une option
            </button>

            {li < quote.lignes.length - 1 && <hr className="mt-6 border-border" />}
          </div>
        ))}

        <button
          onClick={addLine}
          className="mt-4 btn-gold flex items-center gap-2 text-xs"
        >
          <Plus size={14} /> Ajouter une ligne
        </button>
      </section>

      {/* Section D — Totals (sticky) */}
      <section className="bg-card border border-border p-6 mb-4 sticky bottom-0 z-10">
        <div className="flex flex-col items-end gap-1 text-sm">
          <div className="flex justify-between w-64">
            <span className="text-muted-foreground">Sous-total HT</span>
            <span className="font-medium">{formatEUR(totals.sousTotal)}</span>
          </div>
          {Object.entries(totals.tvaMap)
            .filter(([, v]) => v > 0)
            .sort(([a], [b]) => Number(a) - Number(b))
            .map(([rate, amount]) => (
              <div key={rate} className="flex justify-between w-64">
                <span className="text-muted-foreground">TVA {rate}%</span>
                <span>{formatEUR(amount)}</span>
              </div>
            ))}
          <div className="flex justify-between w-64">
            <span className="text-muted-foreground">Total TVA</span>
            <span>{formatEUR(totals.totalTVA)}</span>
          </div>
          <div className="border-t-2 border-accent mt-1 pt-2 flex justify-between w-64">
            <span className="font-display text-lg font-semibold">TOTAL TTC</span>
            <span className="font-display text-lg font-bold text-accent">
              {formatEUR(totals.totalTTC)}
            </span>
          </div>
        </div>
      </section>

      {/* Section E — Terms */}
      <section className="bg-card border border-border p-6 mb-4">
        <h2 className="font-display text-lg font-semibold mb-4">Conditions commerciales</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className={labelCls}>Conditions de paiement</label>
            <input
              type="text"
              value={quote.conditionsPaiement}
              onChange={(e) => update({ conditionsPaiement: e.target.value })}
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>Délai de réalisation</label>
            <input
              type="text"
              value={quote.delaiRealisation}
              onChange={(e) => update({ delaiRealisation: e.target.value })}
              className={inputCls}
            />
          </div>
        </div>
        <div className="mb-4">
          <label className={labelCls}>Notes / Remarques</label>
          <textarea
            value={quote.notes}
            onChange={(e) => update({ notes: e.target.value })}
            className={`${inputCls} resize-none`}
            rows={3}
          />
        </div>
        <p className="text-[11px] text-muted-foreground leading-relaxed">
          Devis valable {quote.validite} jours. TVA selon pays du chantier. {getLegalMention(settings)}
        </p>
      </section>

      {/* Section F — Actions */}
      <div className="flex flex-wrap gap-3">
        <button onClick={save} className="btn-gold">
          Sauvegarder
        </button>
        <button
          onClick={() => {
            save();
            const all = loadQuotes();
            const saved = all.find((q) => q.id === quote.id);
            if (saved) navigate(`/devis/${saved.id}/apercu`);
          }}
          className="px-5 py-2.5 border border-border text-sm font-medium uppercase tracking-wide hover:bg-muted transition-colors duration-150"
        >
          Aperçu PDF
        </button>
        <button
          onClick={() => navigate("/")}
          className="px-5 py-2.5 text-sm text-muted-foreground hover:text-foreground transition-colors duration-150"
        >
          Retour au tableau de bord
        </button>
      </div>
    </div>
  );
}
