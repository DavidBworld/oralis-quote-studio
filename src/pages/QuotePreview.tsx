import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Printer } from "lucide-react";
import {
  loadQuotes,
  formatEUR,
  formatDate,
  expiryDate,
  calcTotals,
  lineMontantHT,
  type Quote,
} from "@/lib/quote-data";
import { loadSettings, getLegalMention, type AppSettings } from "@/lib/settings-data";

export default function QuotePreview() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [quote, setQuote] = useState<Quote | null>(null);
  const [settings, setSettings] = useState<AppSettings | null>(null);

  useEffect(() => {
    const all = loadQuotes();
    const found = all.find((q) => q.id === id);
    if (found) setQuote(found);
    else navigate("/");
    setSettings(loadSettings());
  }, [id]);

  if (!quote || !settings) return null;

  const totals = calcTotals(quote.lignes);
  const c = settings.company;
  const docS = settings.documentDevis;

  // Extract acompte percentage from conditions
  const acompteMatch = quote.conditionsPaiement.match(/(\d+)%/);
  const acomptePct = acompteMatch ? parseInt(acompteMatch[1]) : null;

  return (
    <div className="min-h-screen bg-background">
      {/* Top bar */}
      <div className="no-print flex items-center gap-3 p-4 border-b border-border bg-card shadow-header">
        <button
          onClick={() => navigate("/")}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft size={16} /> Retour
        </button>
        <div className="flex-1" />
        <button
          onClick={() => navigate(`/devis/${quote.id}`)}
          className="btn-outline-gold text-xs"
        >
          Modifier
        </button>
        <button
          onClick={() => window.print()}
          className="btn-gold flex items-center gap-2 text-xs"
        >
          <Printer size={14} /> Imprimer
        </button>
      </div>

      {/* Print container */}
      <div className="print-container max-w-[210mm] mx-auto my-8 bg-card p-12 border border-border rounded-lg shadow-card">
        {/* Custom header text */}
        {docS.enTete && (
          <p className="text-sm text-muted-foreground mb-4 whitespace-pre-line">{docS.enTete}</p>
        )}

        {/* Header */}
        <div className="flex justify-between items-start mb-8 page-break-avoid">
          <div className="flex items-start gap-4">
            {docS.afficherLogo && settings.logo && (
              <img src={settings.logo} alt="Logo" className="w-16 h-16 object-contain" />
            )}
            <div>
              <h1 className="font-display text-[32px] font-bold text-accent tracking-wider">ORALIS</h1>
              <p className="text-xs text-muted-foreground mt-1">
                Pergola Bioclimatique &amp; Jardin d'Hiver Sur-Mesure
              </p>
            </div>
          </div>
          <div className="text-right text-xs text-muted-foreground leading-relaxed">
            <p className="font-medium text-foreground">{c.nom}</p>
            <p>{c.rue}</p>
            <p>{c.codePostal} {c.ville}, {c.pays}</p>
            <p>{c.telephone}</p>
            <p>{c.email}</p>
            <p>{c.siteWeb}</p>
          </div>
        </div>

        {/* Gold divider */}
        <div className="h-0.5 bg-accent mb-8" />

        {/* Title block */}
        <div className="flex justify-between items-start mb-8 page-break-avoid">
          <div>
            <h2 className="font-display text-3xl font-semibold tracking-wide">DEVIS</h2>
            <p className="text-sm text-muted-foreground mt-1 font-mono">{quote.numero}</p>
          </div>
          <div className="text-right text-sm space-y-0.5">
            <p>
              <span className="text-muted-foreground">Date : </span>
              <span className="font-medium">{formatDate(quote.date)}</span>
            </p>
            <p>
              <span className="text-muted-foreground">Validité : </span>
              <span className="font-medium">{quote.validite} jours</span>
            </p>
            <p>
              <span className="text-muted-foreground">Expire le : </span>
              <span className="font-medium">{formatDate(expiryDate(quote.date, quote.validite))}</span>
            </p>
          </div>
        </div>

        {/* Client block */}
        <div className="mb-8 page-break-avoid bg-background rounded-lg p-5">
          <p className="form-label mb-2">
            Établi pour :
          </p>
          <div className="text-sm leading-relaxed">
            <p className="font-semibold text-[15px]">
              {quote.client.prenom} {quote.client.nom}
            </p>
            {quote.client.societe && <p className="font-medium">{quote.client.societe}</p>}
            {quote.client.rue && <p>{quote.client.rue}</p>}
            <p>
              {quote.client.codePostal} {quote.client.ville}
            </p>
            <p>{quote.client.pays}</p>
            {quote.client.email && (
              <p className="text-muted-foreground mt-1">{quote.client.email}</p>
            )}
          </div>
        </div>

        {/* Products table */}
        <table className="w-full text-sm mb-8 page-break-avoid">
          <thead>
            <tr className="border-b-2 border-accent">
              <th className="text-left py-3 font-semibold text-[11px] uppercase tracking-wider font-body">
                Désignation
              </th>
              <th className="text-center py-3 font-semibold text-[11px] uppercase tracking-wider w-16 font-body">
                Qté
              </th>
              <th className="text-right py-3 font-semibold text-[11px] uppercase tracking-wider w-28 font-body">
                Prix U. HT
              </th>
              <th className="text-center py-3 font-semibold text-[11px] uppercase tracking-wider w-16 font-body">
                TVA
              </th>
              <th className="text-right py-3 font-semibold text-[11px] uppercase tracking-wider w-28 font-body">
                Montant HT
              </th>
            </tr>
          </thead>
          <tbody>
            {quote.lignes.map((line, i) => (
              <React.Fragment key={line.id}>
                <tr className={i % 2 === 1 ? "bg-background" : ""}>
                  <td className="py-3 pr-4">
                    <span className="font-medium">{line.designation}</span>
                    {line.description && (
                      <p className="text-xs text-muted-foreground italic mt-0.5">
                        {line.description}
                      </p>
                    )}
                  </td>
                  <td className="py-3 text-center font-mono">{line.quantite}</td>
                  <td className="py-3 text-right font-mono">{formatEUR(line.prixUnitaireHT)}</td>
                  <td className="py-3 text-center">{line.tva}%</td>
                  <td className="py-3 text-right font-medium font-mono">
                    {formatEUR(lineMontantHT(line))}
                  </td>
                </tr>
                {line.options.map((opt) => (
                  <tr key={opt.id} className={i % 2 === 1 ? "bg-background" : ""}>
                    <td className="py-2 pr-4 pl-5">
                      <span className="inline-flex items-center gap-2 text-xs">
                        <span className="w-0.5 h-4 bg-accent inline-block shrink-0 rounded-full" />
                        <span className="text-muted-foreground">↳</span>
                        <span>{opt.designation}</span>
                      </span>
                    </td>
                    <td className="py-2 text-center text-xs font-mono">1</td>
                    <td className="py-2 text-right text-xs font-mono">{formatEUR(opt.prixHT)}</td>
                    <td className="py-2 text-center text-xs">{opt.tva}%</td>
                    <td className="py-2 text-right text-xs font-mono">{formatEUR(opt.prixHT)}</td>
                  </tr>
                ))}
              </React.Fragment>
            ))}
          </tbody>
        </table>

        {/* Totals */}
        <div className="flex justify-end mb-8 page-break-avoid">
          <div className="w-80">
            <div className="flex justify-between py-1.5 text-sm">
              <span className="text-muted-foreground">Sous-total HT</span>
              <span className="font-mono">{formatEUR(totals.sousTotal)}</span>
            </div>
            {Object.entries(totals.tvaMap)
              .filter(([, v]) => v > 0)
              .sort(([a], [b]) => Number(a) - Number(b))
              .map(([rate, amount]) => (
                <div key={rate} className="flex justify-between py-1.5 text-sm">
                  <span className="text-muted-foreground">TVA {rate}%</span>
                  <span className="font-mono">{formatEUR(amount)}</span>
                </div>
              ))}
            <div className="flex justify-between py-1.5 text-sm">
              <span className="text-muted-foreground">Total TVA</span>
              <span className="font-mono">{formatEUR(totals.totalTVA)}</span>
            </div>
            <div className="border-t-2 border-accent mt-3 pt-3 flex justify-between">
              <span className="font-display text-xl font-bold">TOTAL TTC</span>
              <span className="font-display text-xl font-bold text-accent">
                {formatEUR(totals.totalTTC)}
              </span>
            </div>
            {acomptePct && (
              <div className="flex justify-between py-1.5 text-sm mt-2">
                <span className="text-muted-foreground">
                  Acompte ({acomptePct}%)
                </span>
                <span className="font-mono">{formatEUR(totals.totalTTC * acomptePct / 100)}</span>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-border pt-6 text-sm space-y-4 page-break-avoid">
          {quote.conditionsPaiement && (
            <div>
              <span className="form-label">
                Conditions de paiement
              </span>
              <p className="mt-1">{quote.conditionsPaiement}</p>
            </div>
          )}
          {quote.delaiRealisation && (
            <div>
              <span className="form-label">
                Délai de réalisation
              </span>
              <p className="mt-1">{quote.delaiRealisation}</p>
            </div>
          )}
          {quote.notes && (
            <div>
              <span className="form-label">
                Notes
              </span>
              <p className="mt-1">{quote.notes}</p>
            </div>
          )}

          <p className="text-[11px] text-muted-foreground mt-6">
            Devis valable {quote.validite} jours. TVA selon pays du chantier. {getLegalMention(settings)}
          </p>

          {docS.zoneSignature && (
            <div className="mt-8 pt-6 border-t border-border">
              <div className="flex justify-between">
                <div>
                  <p className="text-xs text-muted-foreground mb-8 font-medium">
                    {docS.texteSignatureClient} — Date et signature :
                  </p>
                  <div className="border-b-2 border-dotted border-accent/40 w-64 h-12" />
                </div>
                {docS.texteSignatureEntreprise && (
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground mb-8 font-medium">
                      {docS.texteSignatureEntreprise}
                    </p>
                    <div className="border-b-2 border-dotted border-accent/40 w-48 h-12 ml-auto" />
                  </div>
                )}
              </div>
            </div>
          )}

          {docS.piedDePage && (
            <p className="text-[11px] text-muted-foreground mt-4 whitespace-pre-line">{docS.piedDePage}</p>
          )}
        </div>
      </div>
    </div>
  );
}
