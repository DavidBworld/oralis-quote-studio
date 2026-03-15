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
      <div className="no-print flex items-center gap-3 p-4 border-b border-border bg-card">
        <button
          onClick={() => navigate("/")}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft size={16} /> Retour
        </button>
        <div className="flex-1" />
        <button
          onClick={() => navigate(`/devis/${quote.id}`)}
          className="px-4 py-2 text-sm border border-border hover:bg-muted transition-colors"
        >
          Modifier
        </button>
        <button
          onClick={() => window.print()}
          className="btn-gold flex items-center gap-2"
        >
          <Printer size={14} /> Imprimer
        </button>
      </div>

      {/* Print container */}
      <div className="print-container max-w-[210mm] mx-auto my-8 bg-card p-12 border border-border no-print:shadow-none">
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
              <h1 className="font-display text-4xl font-bold text-accent tracking-wider">ORALIS</h1>
              <p className="text-xs text-muted-foreground mt-1">
                Pergola Bioclimatique &amp; Jardin d'Hiver Sur-Mesure
              </p>
            </div>
          </div>
          <div className="text-right text-xs text-muted-foreground leading-relaxed">
            <p>{c.nom}</p>
            <p>{c.rue}</p>
            <p>{c.codePostal} {c.ville}, {c.pays}</p>
            <p>{c.telephone}</p>
            <p>{c.email}</p>
            <p>{c.siteWeb}</p>
          </div>
        </div>

        {/* Gold divider */}
        <div className="h-px bg-accent mb-8" />

        {/* Title block */}
        <div className="flex justify-between items-start mb-8 page-break-avoid">
          <div>
            <h2 className="font-display text-3xl font-semibold tracking-wide">DEVIS</h2>
            <p className="text-sm text-muted-foreground mt-1">{quote.numero}</p>
          </div>
          <div className="text-right text-sm">
            <p>
              <span className="text-muted-foreground">Date : </span>
              {formatDate(quote.date)}
            </p>
            <p>
              <span className="text-muted-foreground">Validité : </span>
              {quote.validite} jours
            </p>
            <p>
              <span className="text-muted-foreground">Expire le : </span>
              {formatDate(expiryDate(quote.date, quote.validite))}
            </p>
          </div>
        </div>

        {/* Client block */}
        <div className="mb-8 page-break-avoid">
          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">
            Établi pour :
          </p>
          <div className="text-sm leading-relaxed">
            <p className="font-medium">
              {quote.client.prenom} {quote.client.nom}
            </p>
            {quote.client.societe && <p>{quote.client.societe}</p>}
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
            <tr className="border-b-2 border-foreground/20">
              <th className="text-left py-2 font-medium text-xs uppercase tracking-wider">
                Désignation
              </th>
              <th className="text-center py-2 font-medium text-xs uppercase tracking-wider w-16">
                Qté
              </th>
              <th className="text-right py-2 font-medium text-xs uppercase tracking-wider w-28">
                Prix U. HT
              </th>
              <th className="text-center py-2 font-medium text-xs uppercase tracking-wider w-16">
                TVA
              </th>
              <th className="text-right py-2 font-medium text-xs uppercase tracking-wider w-28">
                Montant HT
              </th>
            </tr>
          </thead>
          <tbody>
            {quote.lignes.map((line, i) => (
              <React.Fragment key={line.id}>
                <tr className={i % 2 === 1 ? "bg-muted/30" : ""}>
                  <td className="py-2.5 pr-4">
                    <span className="font-medium">{line.designation}</span>
                    {line.description && (
                      <p className="text-xs text-muted-foreground italic mt-0.5">
                        {line.description}
                      </p>
                    )}
                  </td>
                  <td className="py-2.5 text-center">{line.quantite}</td>
                  <td className="py-2.5 text-right">{formatEUR(line.prixUnitaireHT)}</td>
                  <td className="py-2.5 text-center">{line.tva}%</td>
                  <td className="py-2.5 text-right font-medium">
                    {formatEUR(lineMontantHT(line))}
                  </td>
                </tr>
                {line.options.map((opt) => (
                  <tr key={opt.id} className={i % 2 === 1 ? "bg-muted/30" : ""}>
                    <td className="py-1.5 pr-4 pl-4">
                      <span className="inline-flex items-center gap-1.5 text-xs">
                        <span className="w-0.5 h-4 bg-accent inline-block shrink-0" />
                        <span className="text-muted-foreground">↳</span>
                        {opt.designation}
                      </span>
                    </td>
                    <td className="py-1.5 text-center text-xs">1</td>
                    <td className="py-1.5 text-right text-xs">{formatEUR(opt.prixHT)}</td>
                    <td className="py-1.5 text-center text-xs">{opt.tva}%</td>
                    <td className="py-1.5 text-right text-xs">{formatEUR(opt.prixHT)}</td>
                  </tr>
                ))}
              </React.Fragment>
            ))}
          </tbody>
        </table>

        {/* Totals */}
        <div className="flex justify-end mb-8 page-break-avoid">
          <div className="w-72">
            <div className="flex justify-between py-1 text-sm">
              <span className="text-muted-foreground">Sous-total HT</span>
              <span>{formatEUR(totals.sousTotal)}</span>
            </div>
            {Object.entries(totals.tvaMap)
              .filter(([, v]) => v > 0)
              .sort(([a], [b]) => Number(a) - Number(b))
              .map(([rate, amount]) => (
                <div key={rate} className="flex justify-between py-1 text-sm">
                  <span className="text-muted-foreground">TVA {rate}%</span>
                  <span>{formatEUR(amount)}</span>
                </div>
              ))}
            <div className="flex justify-between py-1 text-sm">
              <span className="text-muted-foreground">Total TVA</span>
              <span>{formatEUR(totals.totalTVA)}</span>
            </div>
            <div className="border-t-2 border-accent mt-2 pt-2 flex justify-between">
              <span className="font-display text-xl font-bold">TOTAL TTC</span>
              <span className="font-display text-xl font-bold text-accent">
                {formatEUR(totals.totalTTC)}
              </span>
            </div>
            {acomptePct && (
              <div className="flex justify-between py-1 text-sm mt-1">
                <span className="text-muted-foreground">
                  Acompte ({acomptePct}%)
                </span>
                <span>{formatEUR(totals.totalTTC * acomptePct / 100)}</span>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-border pt-6 text-sm space-y-3 page-break-avoid">
          {quote.conditionsPaiement && (
            <div>
              <span className="text-xs text-muted-foreground uppercase tracking-wider">
                Conditions de paiement
              </span>
              <p className="mt-0.5">{quote.conditionsPaiement}</p>
            </div>
          )}
          {quote.delaiRealisation && (
            <div>
              <span className="text-xs text-muted-foreground uppercase tracking-wider">
                Délai de réalisation
              </span>
              <p className="mt-0.5">{quote.delaiRealisation}</p>
            </div>
          )}
          {quote.notes && (
            <div>
              <span className="text-xs text-muted-foreground uppercase tracking-wider">
                Notes
              </span>
              <p className="mt-0.5">{quote.notes}</p>
            </div>
          )}

          <p className="text-[11px] text-muted-foreground mt-6">
            Devis valable {quote.validite} jours. TVA selon pays du chantier. {getLegalMention(settings)}
          </p>

          {docS.zoneSignature && (
            <div className="mt-8 pt-4 border-t border-border">
              <div className="flex justify-between">
                <div>
                  <p className="text-xs text-muted-foreground mb-8">
                    {docS.texteSignatureClient} — Date et signature :
                  </p>
                  <div className="border-b border-dotted border-foreground/30 w-64 h-12" />
                </div>
                {docS.texteSignatureEntreprise && (
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground mb-8">
                      {docS.texteSignatureEntreprise}
                    </p>
                    <div className="border-b border-dotted border-foreground/30 w-48 h-12 ml-auto" />
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
