import { useState, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Plus, Trash2, ChevronDown, Upload, Camera } from "lucide-react";

function processImageFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const maxDim = 300;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxDim) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          }
        } else {
          if (height > maxDim) {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.fillStyle = "#ffffff";
          ctx.fillRect(0, 0, width, height);
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL("image/jpeg", 0.7));
        } else {
          resolve(e.target?.result as string);
        }
      };
      img.onerror = () => reject(new Error("Image loading error"));
      img.src = e.target?.result as string;
    };
    reader.onerror = () => reject(new Error("File reading error"));
    reader.readAsDataURL(file);
  });
}
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
        className="form-input"
      />
      {open && filtered.length > 0 && (
        <ul className="absolute z-20 left-0 right-0 bg-card border border-border shadow-elevated max-h-48 overflow-auto mt-0.5 rounded-md">
          {filtered.map((s) => (
            <li
              key={s}
              className="px-3 py-2.5 text-sm hover:bg-accent/5 cursor-pointer transition-colors"
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
      const newQuote = createEmptyQuote(all);
      newQuote.conditionsPaiement = settings.company.conditionsPaiement || newQuote.conditionsPaiement;
      newQuote.delaiRealisation = settings.company.delaiRealisation || newQuote.delaiRealisation;
      setQuote(newQuote);
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

  return (
    <div className="p-6 lg:p-8 w-full pb-32">
      <h1 className="font-display text-[28px] font-semibold mb-1 tracking-tight">
        {id === "nouveau" ? "Nouveau Devis" : `Devis ${quote.numero}`}
      </h1>
      <p className="text-[13px] text-muted-foreground mb-8 font-body">
        {id === "nouveau"
          ? "Créez un nouveau devis premium"
          : "Modifiez les informations du devis"}
      </p>

      {/* Section A — Header */}
      <section className="luxury-card mb-5">
        <h2 className="section-title">Informations du devis</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="form-label">N° Devis</label>
            <input type="text" value={quote.numero} readOnly className="form-input bg-muted" />
          </div>
          <div>
            <label className="form-label">Date</label>
            <input
              type="date"
              value={quote.date}
              onChange={(e) => update({ date: e.target.value })}
              className="form-input"
            />
          </div>
          <div>
            <label className="form-label">Validité (jours)</label>
            <select
              value={quote.validite}
              onChange={(e) => update({ validite: Number(e.target.value) })}
              className="form-input"
            >
              {VALIDITE_OPTIONS.map((v) => (
                <option key={v} value={v}>{v} jours</option>
              ))}
            </select>
          </div>
          <div>
            <label className="form-label">Expiration</label>
            <input
              type="text"
              readOnly
              value={formatDate(expiryDate(quote.date, quote.validite))}
              className="form-input bg-muted"
            />
          </div>
        </div>
        <div className="mt-4 max-w-xs">
          <label className="form-label">Statut</label>
          <select
            value={quote.statut}
            onChange={(e) => update({ statut: e.target.value as Quote["statut"] })}
            className="form-input"
          >
            {(Object.keys(STATUT_LABELS) as Quote["statut"][]).map((s) => (
              <option key={s} value={s}>{STATUT_LABELS[s]}</option>
            ))}
          </select>
        </div>
      </section>

      {/* Section B — Client */}
      <section className="luxury-card mb-5">
        <h2 className="section-title">Client</h2>
        <div className="flex gap-3 mb-5">
          {(["particulier", "professionnel"] as const).map((t) => (
            <button
              key={t}
              onClick={() => updateClient({ type: t })}
              className={`px-4 py-2 text-[13px] rounded border transition-all duration-200 ${
                quote.client.type === t
                  ? "bg-accent text-accent-foreground border-accent shadow-sm"
                  : "border-border text-muted-foreground hover:border-accent/50 hover:text-foreground"
              }`}
            >
              {t === "particulier" ? "Particulier" : "Professionnel"}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="form-label">Prénom *</label>
            <input
              type="text"
              value={quote.client.prenom}
              onChange={(e) => updateClient({ prenom: e.target.value })}
              className="form-input"
              required
            />
          </div>
          <div>
            <label className="form-label">Nom *</label>
            <input
              type="text"
              value={quote.client.nom}
              onChange={(e) => updateClient({ nom: e.target.value })}
              className="form-input"
              required
            />
          </div>
          {quote.client.type === "professionnel" && (
            <div className="md:col-span-2">
              <label className="form-label">Société</label>
              <input
                type="text"
                value={quote.client.societe}
                onChange={(e) => updateClient({ societe: e.target.value })}
                className="form-input"
              />
            </div>
          )}
          <div>
            <label className="form-label">Email *</label>
            <input
              type="email"
              value={quote.client.email}
              onChange={(e) => updateClient({ email: e.target.value })}
              className="form-input"
              required
            />
          </div>
          <div>
            <label className="form-label">Téléphone</label>
            <input
              type="tel"
              value={quote.client.telephone}
              onChange={(e) => updateClient({ telephone: e.target.value })}
              className="form-input"
            />
          </div>
          <div className="md:col-span-2">
            <label className="form-label">Adresse</label>
            <input
              type="text"
              value={quote.client.rue}
              onChange={(e) => updateClient({ rue: e.target.value })}
              className="form-input"
              placeholder="Rue"
            />
          </div>
          <div>
            <label className="form-label">Ville</label>
            <input
              type="text"
              value={quote.client.ville}
              onChange={(e) => updateClient({ ville: e.target.value })}
              className="form-input"
            />
          </div>
          <div>
            <label className="form-label">Code postal</label>
            <input
              type="text"
              value={quote.client.codePostal}
              onChange={(e) => updateClient({ codePostal: e.target.value })}
              className="form-input"
            />
          </div>
          <div>
            <label className="form-label">Pays</label>
            <select
              value={quote.client.pays}
              onChange={(e) => updateClient({ pays: e.target.value })}
              className="form-input"
            >
              {PAYS_OPTIONS.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>
        </div>
      </section>

      {/* Section C — Lines */}
      <section className="luxury-card mb-5">
        <h2 className="section-title">Lignes du devis</h2>

        {quote.lignes.map((line, li) => (
          <div key={line.id} className="mb-6 last:mb-0 page-break-avoid">
            <div className="flex items-start justify-between mb-3">
              <span className="form-label !mb-0">
                Ligne {li + 1}
              </span>
              {quote.lignes.length > 1 && (
                <button
                  onClick={() => removeLine(line.id)}
                  className="p-1.5 text-destructive hover:bg-destructive/10 transition-colors rounded"
                >
                  <Trash2 size={14} />
                </button>
              )}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-12 gap-3 mb-3">
              <div className="md:col-span-2">
                <label className="form-label">Image</label>
                <div className="relative group flex items-center justify-center border border-border rounded h-10 bg-muted/30 overflow-hidden hover:border-accent/50 transition-colors">
                  {line.image ? (
                    <>
                      <img
                        src={line.image}
                        alt={line.designation || "Ligne"}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center gap-2 transition-opacity">
                        <label className="p-1 text-white hover:text-accent rounded cursor-pointer transition-colors" title="Changer l'image">
                          <Upload size={14} />
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={async (e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                try {
                                  const compressed = await processImageFile(file);
                                  updateLine(line.id, { image: compressed });
                                } catch (err) {
                                  console.error(err);
                                }
                              }
                            }}
                          />
                        </label>
                        <button
                          type="button"
                          onClick={() => updateLine(line.id, { image: "" })}
                          className="p-1 text-white hover:text-destructive rounded transition-colors"
                          title="Supprimer l'image"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </>
                  ) : (
                    <label className="flex items-center justify-center gap-1.5 w-full h-full cursor-pointer text-xs font-semibold text-muted-foreground hover:text-accent transition-colors">
                      <Camera size={14} />
                      <span>Ajouter</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            try {
                              const compressed = await processImageFile(file);
                              updateLine(line.id, { image: compressed });
                            } catch (err) {
                              console.error(err);
                            }
                          }
                        }}
                      />
                    </label>
                  )}
                </div>
              </div>
              <div className="md:col-span-3">
                <label className="form-label">Désignation</label>
                <AutocompleteInput
                  value={line.designation}
                  onChange={(v) => updateLine(line.id, { designation: v })}
                  suggestions={allProductSuggestions}
                  placeholder="Sélectionner ou saisir..."
                />
              </div>
              <div className="md:col-span-1">
                <label className="form-label">Qté</label>
                <input
                  type="number"
                  min={1}
                  value={line.quantite}
                  onChange={(e) => updateLine(line.id, { quantite: Number(e.target.value) || 1 })}
                  className="form-input text-center font-mono"
                />
              </div>
              <div className="md:col-span-2">
                <label className="form-label">Prix U. HT (€)</label>
                <input
                  type="number"
                  min={0}
                  step={0.01}
                  value={line.prixUnitaireHT || ""}
                  onChange={(e) => updateLine(line.id, { prixUnitaireHT: Number(e.target.value) || 0 })}
                  className="form-input font-mono"
                />
              </div>
              <div className="md:col-span-2">
                <label className="form-label">TVA</label>
                <select
                  value={line.tva}
                  onChange={(e) => updateLine(line.id, { tva: Number(e.target.value) })}
                  className="form-input"
                >
                  {TVA_RATES.map((r) => (
                    <option key={r} value={r}>{r}%</option>
                  ))}
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="form-label">Montant HT</label>
                <div className="h-10 px-3 py-2 bg-muted border border-border text-sm font-medium font-mono rounded flex items-center justify-end">
                  {formatEUR(lineMontantHT(line))}
                </div>
              </div>
            </div>
            <div className="mb-3">
              <label className="form-label">Description</label>
              <textarea
                value={line.description}
                onChange={(e) => updateLine(line.id, { description: e.target.value })}
                className="form-input resize-none"
                rows={2}
                placeholder="Détails optionnels..."
              />
            </div>

            {/* Options */}
            {line.options.length > 0 && (
              <div className="ml-6 border-l-2 border-dashed border-accent pl-5 space-y-3 mb-3">
                {line.options.map((opt) => (
                  <div key={opt.id} className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
                    <div className="md:col-span-5">
                      <label className="form-label">Option</label>
                      <AutocompleteInput
                        value={opt.designation}
                        onChange={(v) => updateOption(line.id, opt.id, { designation: v })}
                        suggestions={OPTION_CATALOG}
                        placeholder="Sélectionner une option..."
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="form-label">Prix HT (€)</label>
                      <input
                        type="number"
                        min={0}
                        step={0.01}
                        value={opt.prixHT || ""}
                        onChange={(e) =>
                          updateOption(line.id, opt.id, { prixHT: Number(e.target.value) || 0 })
                        }
                        className="form-input font-mono"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="form-label">TVA</label>
                      <select
                        value={opt.tva}
                        onChange={(e) =>
                          updateOption(line.id, opt.id, { tva: Number(e.target.value) })
                        }
                        className="form-input"
                      >
                        {TVA_RATES.map((r) => (
                          <option key={r} value={r}>{r}%</option>
                        ))}
                      </select>
                    </div>
                    <div className="md:col-span-2">
                      <label className="form-label">TTC</label>
                      <div className="h-10 px-3 py-2 bg-muted border border-border text-sm font-mono rounded flex items-center justify-end">
                        {formatEUR(opt.prixHT * (1 + opt.tva / 100))}
                      </div>
                    </div>
                    <div className="md:col-span-1 flex justify-end">
                      <button
                        onClick={() => removeOption(line.id, opt.id)}
                        className="p-1.5 text-destructive hover:bg-destructive/10 transition-colors rounded"
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
              className="text-xs text-accent hover:text-accent-hover font-medium flex items-center gap-1 transition-colors"
            >
              <Plus size={12} /> Ajouter une option
            </button>

            {li < quote.lignes.length - 1 && <hr className="mt-6 border-border" />}
          </div>
        ))}

        <button
          onClick={addLine}
          className="mt-5 btn-outline-gold flex items-center gap-2 text-xs"
        >
          <Plus size={14} /> Ajouter une ligne
        </button>
      </section>

      {/* Section D — Totals (sticky) */}
      <section className="bg-primary text-primary-foreground border border-sidebar-border p-6 mb-5 sticky bottom-0 z-10 rounded-lg shadow-elevated">
        <div className="flex flex-col items-end gap-1 text-sm">
          <div className="flex justify-between w-72">
            <span className="text-primary-foreground/60">Sous-total HT</span>
            <span className="font-mono">{formatEUR(totals.sousTotal)}</span>
          </div>
          {Object.entries(totals.tvaMap)
            .filter(([, v]) => v > 0)
            .sort(([a], [b]) => Number(a) - Number(b))
            .map(([rate, amount]) => (
              <div key={rate} className="flex justify-between w-72">
                <span className="text-primary-foreground/60">TVA {rate}%</span>
                <span className="font-mono">{formatEUR(amount)}</span>
              </div>
            ))}
          <div className="flex justify-between w-72">
            <span className="text-primary-foreground/60">Total TVA</span>
            <span className="font-mono">{formatEUR(totals.totalTVA)}</span>
          </div>
          <div className="border-t-2 border-accent mt-2 pt-3 flex justify-between w-72">
            <span className="font-display text-xl font-bold">TOTAL TTC</span>
            <span className="font-display text-xl font-bold text-accent">
              {formatEUR(totals.totalTTC)}
            </span>
          </div>
        </div>
      </section>

      {/* Section E — Terms */}
      <section className="luxury-card mb-5">
        <h2 className="section-title">Conditions commerciales</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="form-label">Conditions de paiement</label>
            <input
              type="text"
              value={quote.conditionsPaiement}
              onChange={(e) => update({ conditionsPaiement: e.target.value })}
              className="form-input"
            />
          </div>
          <div>
            <label className="form-label">Délai de réalisation</label>
            <input
              type="text"
              value={quote.delaiRealisation}
              onChange={(e) => update({ delaiRealisation: e.target.value })}
              className="form-input"
            />
          </div>
        </div>
        <div className="mb-4">
          <label className="form-label">Notes / Remarques</label>
          <textarea
            value={quote.notes}
            onChange={(e) => update({ notes: e.target.value })}
            className="form-input resize-none"
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
          className="btn-outline-gold"
        >
          Aperçu PDF
        </button>
        <button
          onClick={() => navigate("/")}
          className="btn-ghost"
        >
          Retour au tableau de bord
        </button>
      </div>
    </div>
  );
}
