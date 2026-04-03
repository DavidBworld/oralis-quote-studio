import React, { useEffect, useState } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { ArrowLeft, Printer } from "lucide-react";
import { formatEUR, formatDate, calcTotals, lineMontantHT } from "@/lib/quote-data";
import { loadSettings, getLegalMention } from "@/lib/settings-data";

function loadFactures(): any[] {
  try { return JSON.parse(localStorage.getItem("oralis_factures") || "[]"); } catch { return []; }
}

export default function FacturePreview() {
  const navigate  = useNavigate();
  const location  = useLocation();
  const { id }    = useParams();
  const [facture, setFacture]   = useState<any>(null);
  const [settings, setSettings] = useState<any>(null);

  useEffect(() => {
    const all = loadFactures();
    const found = all.find((f: any) => f.id === id);
    if (found) setFacture(found);
    else navigate("/factures");
    setSettings(loadSettings());
  }, [id]);

  // Auto-print when opened via the "Imprimer" button from FactureDetail
  useEffect(() => {
    if (facture && settings && (location.state as any)?.autoPrint) {
      const t = setTimeout(() => window.print(), 600);
      return () => clearTimeout(t);
    }
  }, [facture, settings, location.state]);

  if (!facture || !settings) return null;

  const totals = calcTotals(facture.lignes);
  const c = settings.company;
  const totalRecu = facture.reglements.reduce((s: number, r: any) => s + r.montant, 0);
  const netAPayer = facture.montantAcompte - totalRecu;

  const typeTitle = facture.type === "acompte" ? "FACTURE D'ACOMPTE"
    : facture.type === "situation" ? "FACTURE DE SITUATION"
    : facture.type === "avoir" ? "AVOIR"
    : "FACTURE";

  return (
    <div className="min-h-screen bg-background print-wrapper">
      {/* Top bar */}
      <div className="no-print flex items-center gap-3 p-4 border-b border-border bg-card shadow-header">
        <button onClick={() => navigate("/factures")} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft size={16} /> Retour
        </button>
        <div className="flex-1" />
        <button onClick={() => navigate(`/factures/${facture.id}`)} className="btn-outline-gold text-xs">Modifier</button>
        <button onClick={() => window.print()} className="btn-gold flex items-center gap-2 text-xs"><Printer size={14} /> Imprimer</button>
      </div>

      {/* Print container */}
      <div className="print-container max-w-[210mm] mx-auto my-8 bg-card p-12 border border-border rounded-lg shadow-card">
        {/* Header */}
        <div className="flex justify-between items-start mb-8 page-break-avoid">
          <div className="flex items-start gap-4">
            {settings.documentFacture?.afficherLogo && settings.logo && (
              <img src={settings.logo} alt="Logo" className="w-16 h-16 object-contain" />
            )}
            <div>
              <h1 className="font-display text-[32px] font-bold text-accent tracking-wider">ORALIS</h1>
              <p className="text-xs text-muted-foreground mt-1">Pergola Bioclimatique &amp; Jardin d'Hiver Sur-Mesure</p>
            </div>
          </div>
          <div className="text-right text-xs text-muted-foreground leading-relaxed">
            <p className="font-medium text-foreground">{c.nom}</p>
            <p>{c.rue}</p>
            <p>{c.codePostal} {c.ville}, {c.pays}</p>
            <p>{c.telephone}</p>
            <p>{c.email}</p>
          </div>
        </div>

        <div className="h-0.5 bg-accent mb-8" />

        {/* Title block */}
        <div className="flex justify-between items-start mb-8 page-break-avoid">
          <div>
            <h2 className="font-display text-3xl font-semibold tracking-wide">{typeTitle}</h2>
            <p className="text-sm text-muted-foreground mt-1 font-mono">{facture.numero}</p>
          </div>
          <div className="text-right text-sm space-y-0.5">
            <p><span className="text-muted-foreground">Date : </span><span className="font-medium">{formatDate(facture.dateFacture)}</span></p>
            <p><span className="text-muted-foreground">Échéance : </span><span className="font-medium">{formatDate(facture.dateEcheance)}</span></p>
            {facture.referenceAffaire && <p><span className="text-muted-foreground">Réf. affaire : </span><span className="font-medium">{facture.referenceAffaire}</span></p>}
            <p><span className="text-muted-foreground">Devis lié : </span><span className="font-medium">{facture.devisNumero}</span></p>
          </div>
        </div>

        {/* Client block */}
        <div className="mb-8 page-break-avoid bg-background rounded-lg p-5">
          <p className="form-label mb-2">Facturé à :</p>
          <div className="text-sm leading-relaxed">
            <p className="font-semibold text-[15px]">{facture.client.prenom} {facture.client.nom}</p>
            {facture.client.societe && <p className="font-medium">{facture.client.societe}</p>}
            {facture.client.rue && <p>{facture.client.rue}</p>}
            <p>{facture.client.codePostal} {facture.client.ville}</p>
            <p>{facture.client.pays}</p>
            {facture.client.email && <p className="text-muted-foreground mt-1">{facture.client.email}</p>}
          </div>
        </div>

        {/* Products table */}
        <table className="w-full text-sm mb-8 page-break-avoid">
          <thead>
            <tr className="border-b-2 border-accent">
              <th className="text-left py-3 font-semibold text-[11px] uppercase tracking-wider font-body">Désignation</th>
              <th className="text-center py-3 font-semibold text-[11px] uppercase tracking-wider w-16 font-body">Qté</th>
              <th className="text-right py-3 font-semibold text-[11px] uppercase tracking-wider w-28 font-body">Prix U. HT</th>
              <th className="text-center py-3 font-semibold text-[11px] uppercase tracking-wider w-16 font-body">TVA</th>
              <th className="text-right py-3 font-semibold text-[11px] uppercase tracking-wider w-28 font-body">Montant HT</th>
            </tr>
          </thead>
          <tbody>
            {facture.lignes.map((line: any, i: number) => (
              <React.Fragment key={line.id}>
                <tr className={i % 2 === 1 ? "bg-background" : ""}>
                  <td className="py-3 pr-4">
                    <span className="font-medium">{line.designation}</span>
                    {line.description && <p className="text-xs text-muted-foreground italic mt-0.5">{line.description}</p>}
                  </td>
                  <td className="py-3 text-center font-mono">{line.quantite}</td>
                  <td className="py-3 text-right font-mono">{formatEUR(line.prixUnitaireHT)}</td>
                  <td className="py-3 text-center">{line.tva}%</td>
                  <td className="py-3 text-right font-medium font-mono">{formatEUR(lineMontantHT(line))}</td>
                </tr>
                {line.options?.map((opt: any) => (
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
            {Object.entries(totals.tvaMap).filter(([, v]) => (v as number) > 0).sort(([a], [b]) => Number(a) - Number(b)).map(([rate, amount]) => (
              <div key={rate} className="flex justify-between py-1.5 text-sm">
                <span className="text-muted-foreground">TVA {rate}%</span>
                <span className="font-mono">{formatEUR(amount as number)}</span>
              </div>
            ))}
            <div className="flex justify-between py-1.5 text-sm">
              <span className="text-muted-foreground">Total TVA</span>
              <span className="font-mono">{formatEUR(totals.totalTVA)}</span>
            </div>
            <div className="border-t-2 border-accent mt-3 pt-3 flex justify-between">
              <span className="font-display text-xl font-bold">TOTAL TTC</span>
              <span className="font-display text-xl font-bold text-accent">{formatEUR(totals.totalTTC)}</span>
            </div>
            <div className="flex justify-between py-1.5 text-sm mt-2">
              <span className="text-muted-foreground">Acompte demandé ({facture.montantAcomptePct}%)</span>
              <span className="font-mono font-medium">{formatEUR(facture.montantAcompte)} TTC</span>
            </div>
            {totalRecu > 0 && (
              <div className="flex justify-between py-1.5 text-sm">
                <span className="text-muted-foreground">Règlements reçus</span>
                <span className="font-mono text-[hsl(var(--success))]">- {formatEUR(totalRecu)}</span>
              </div>
            )}
            <div className="border-t border-border mt-2 pt-2 flex justify-between">
              <span className="font-display text-lg font-bold">RESTE À RÉGLER</span>
              <span className="font-display text-lg font-bold text-accent">{formatEUR(Math.max(netAPayer, 0))}</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-border pt-6 text-sm space-y-3 page-break-avoid">
          <p>
            <span className="form-label inline">Règlement : </span>
            {facture.modePaiement} — Échéance : {formatDate(facture.dateEcheance)}
          </p>
          <p className="text-[11px] text-muted-foreground">
            Mention TVA acquittée sur les débits
          </p>
          <p className="text-[11px] text-muted-foreground mt-4">
            {getLegalMention(settings)}
          </p>
        </div>
      </div>
    </div>
  );
}
