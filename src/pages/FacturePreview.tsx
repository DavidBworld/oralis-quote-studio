import React, { useEffect, useState } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { ArrowLeft, Printer } from "lucide-react";
import { formatEUR, formatDate, calcTotals, lineMontantHT } from "@/lib/quote-data";
import { loadSettings, getLegalMention } from "@/lib/settings-data";

function loadFactures(): any[] {
  try { return JSON.parse(localStorage.getItem("oralis_factures") || "[]"); } catch { return []; }
}

const IBAN = "SAS TOUT POUR MA TERRASSE — IBAN FR76 1695 8000 0129 8680 2762 960";

function cropImageTransparency(img: HTMLImageElement): string {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) return img.src;

  canvas.width = img.width;
  canvas.height = img.height;
  ctx.drawImage(img, 0, 0);

  const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imgData.data;
  let minX = canvas.width, minY = canvas.height, maxX = 0, maxY = 0;

  for (let y = 0; y < canvas.height; y++) {
    for (let x = 0; x < canvas.width; x++) {
      const alpha = data[(y * canvas.width + x) * 4 + 3];
      if (alpha > 0) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }

  if (maxX < minX || maxY < minY) return img.src;

  const croppedWidth = maxX - minX + 1;
  const croppedHeight = maxY - minY + 1;

  const croppedCanvas = document.createElement("canvas");
  croppedCanvas.width = croppedWidth;
  croppedCanvas.height = croppedHeight;
  const croppedCtx = croppedCanvas.getContext("2d");
  if (!croppedCtx) return img.src;

  croppedCtx.drawImage(img, minX, minY, croppedWidth, croppedHeight, 0, 0, croppedWidth, croppedHeight);
  return croppedCanvas.toDataURL();
}

function PageFooter({ c }: { c: any }) {
  return (
    <div style={{
      position: "absolute",
      bottom: "10mm",
      left: "10mm",
      right: "10mm",
      background: "#1a1a1a",
      color: "#fff",
      padding: "8px 16px",
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      fontSize: 9,
      borderRadius: 4,
    }}>
      <div style={{ fontFamily: "Cormorant Garamond, serif", fontSize: 18, fontWeight: 700, letterSpacing: 2 }}>ORALIS</div>
      <div style={{ textAlign: "center", lineHeight: 1.5 }}>
        ORALIS "MARQUE PREMIUM DE SAS TOUT POUR MA TERRASSE "<br />
        {c.rue.toUpperCase()} {c.codePostal} {c.ville.toUpperCase()}<br />
        SIRET : {c.siret} — Code APE : 4791B<br />
        NUMÉRO DE TVA : {c.tvaIntra}
      </div>
      <div style={{ fontFamily: "Cormorant Garamond, serif", fontSize: 14, opacity: 0.7 }}>CRÉATEUR D'ESPACES EXTÉRIEURS</div>
    </div>
  );
}

function FactureHeader({ facture, c, logo, typeTitle }: { facture: any; c: any; logo?: string; typeTitle: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", gap: 16 }}>
      {/* Left: Logo or ORALIS block */}
      <div style={{ minWidth: 240 }}>
        {logo ? (
          <img src={logo} alt="ORALIS" style={{ maxHeight: 85, maxWidth: 300, objectFit: "contain", marginBottom: 6 }} />
        ) : (
          <div style={{ background: "#1a1a1a", color: "#fff", padding: "8px 14px", marginBottom: 6, borderRadius: 4, display: "inline-block" }}>
            <span style={{ fontFamily: "Cormorant Garamond, serif", fontSize: 22, fontWeight: 700, letterSpacing: 2 }}>ORALIS</span>
          </div>
        )}
        <div style={{ fontSize: 11, color: "#555", lineHeight: 1.6 }}>
          <div><strong>{c.nom}</strong></div>
          <div>{c.rue}</div>
          <div>{c.codePostal} {c.ville.toUpperCase()}</div>
          <div>Tél. : {c.telephone}</div>
          <div>Email : {c.email}</div>
          <div>Site : www.{c.siteWeb}</div>
        </div>
      </div>
      {/* Right: Contact + Devis num + Client */}
      <div style={{ textAlign: "right", fontSize: 11, color: "#555", lineHeight: 1.7 }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, color: "#111" }}>{typeTitle}</div>
          <div style={{ fontSize: 12, fontWeight: 600, color: "#333", fontFamily: "DM Mono, monospace" }}>N° {facture.numero}</div>
          <div>Date : {formatDate(facture.dateFacture)}</div>
          <div>Échéance : {formatDate(facture.dateEcheance)}</div>
          {facture.referenceAffaire && <div>Réf. affaire : {facture.referenceAffaire}</div>}
          <div>Devis lié : {facture.devisNumero}</div>
        </div>
        <div style={{ marginTop: 8, textAlign: "right" }}>
          <strong style={{ fontSize: 13, color: "#111" }}>
            {facture.client.civilite} {facture.client.prenom} {facture.client.nom}
          </strong><br />
          {facture.client.societe && <span>{facture.client.societe}<br /></span>}
          {facture.client.rue && <span>{facture.client.rue}<br /></span>}
          {facture.client.codePostal} {facture.client.ville}<br />
          {facture.client.pays && <span style={{ fontWeight: 600 }}>{facture.client.pays.toUpperCase()}</span>}
        </div>
      </div>
    </div>
  );
}

export default function FacturePreview() {
  const navigate  = useNavigate();
  const location  = useLocation();
  const { id }    = useParams();
  const [facture, setFacture]   = useState<any>(null);
  const [settings, setSettings] = useState<any>(null);
  const [logoUrl, setLogoUrl] = useState<string>("");

  useEffect(() => {
    const all = loadFactures();
    const found = all.find((f: any) => f.id === id);
    if (found) setFacture(found);
    else navigate("/factures");
    
    const loadedSettings = loadSettings();
    setSettings(loadedSettings);

    if (loadedSettings.logo) {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        try {
          const cropped = cropImageTransparency(img);
          setLogoUrl(cropped);
        } catch (e) {
          setLogoUrl(loadedSettings.logo);
        }
      };
      img.onerror = () => {
        setLogoUrl(loadedSettings.logo);
      };
      img.src = loadedSettings.logo;
    }
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

  const isAcompte = facture.type === "acompte";
  const ratio = totals.totalTTC > 0 ? (facture.montantAcompte / totals.totalTTC) : 0;
  const netAPayer = facture.montantAcompte - totalRecu;

  const typeTitle = facture.type === "acompte" ? "FACTURE D'ACOMPTE"
    : facture.type === "situation" ? "FACTURE DE SITUATION"
    : facture.type === "avoir" ? "AVOIR"
    : facture.type === "solde" ? "FACTURE DE SOLDE"
    : "FACTURE";

  // TVA Columns sorting
  const tvaColumns = Object.keys(totals.tvaMap)
    .map(Number)
    .filter(r => (totals.tvaMap[r] ?? 0) > 0)
    .sort((a, b) => b - a);

  // Base HT per TVA rate
  const baseHTByRate: Record<number, number> = {};
  facture.lignes.forEach((l: any) => {
    const ht = lineMontantHT(l);
    baseHTByRate[l.tva] = (baseHTByRate[l.tva] ?? 0) + ht;
    l.options?.forEach((o: any) => {
      baseHTByRate[o.tva] = (baseHTByRate[o.tva] ?? 0) + o.prixHT;
    });
  });

  return (
    <div className="min-h-screen bg-[#f5f5f5] print-wrapper">
      {/* Top bar */}
      <div className="no-print flex items-center gap-3 p-4 border-b border-border bg-card shadow-sm sticky top-0 z-10">
        <button onClick={() => navigate("/factures")} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft size={16} /> Retour
        </button>
        <div className="flex-1" />
        <span className="text-sm font-medium text-muted-foreground">{facture.numero} — {facture.client.prenom} {facture.client.nom}</span>
        <div className="flex-1" />
        <button onClick={() => navigate(`/factures/${facture.id}`)} className="btn-outline-gold text-xs">Modifier</button>
        <button onClick={() => window.print()} className="btn-gold flex items-center gap-2 text-xs"><Printer size={14} /> Imprimer / PDF</button>
      </div>

      {/* A4 printable page */}
      <div className="print-page bg-white mx-auto my-8 shadow-lg" style={{ maxWidth: "210mm", padding: "10mm 10mm 25mm 10mm" }}>
        
        <FactureHeader facture={facture} c={c} logo={logoUrl || settings.logo} typeTitle={typeTitle} />

        <div style={{ height: "1px", background: "#1a1a1a", margin: "14px 0 14px 0" }} />

        {isAcompte ? (
          /* Simplified table for deposits */
          <table style={{ width: "100%", fontSize: 11, borderCollapse: "collapse", marginTop: 12 }}>
            <thead>
              <tr style={{ borderBottom: "2px solid #1a1a1a", borderTop: "2px solid #1a1a1a" }}>
                <th style={{ textAlign: "left", padding: "8px 8px", fontWeight: 600, fontSize: 10, textTransform: "uppercase", letterSpacing: 1 }}>Désignation</th>
                <th style={{ textAlign: "center", padding: "8px 4px", width: 40, fontWeight: 600, fontSize: 10, textTransform: "uppercase" }}>Qté</th>
                <th style={{ textAlign: "right", padding: "8px 4px", width: 80, fontWeight: 600, fontSize: 10, textTransform: "uppercase" }}>Pu HT</th>
                <th style={{ textAlign: "right", padding: "8px 4px", width: 80, fontWeight: 600, fontSize: 10, textTransform: "uppercase" }}>Total HT</th>
                <th style={{ textAlign: "center", padding: "8px 4px", width: 40, fontWeight: 600, fontSize: 10, textTransform: "uppercase" }}>TVA</th>
              </tr>
            </thead>
            <tbody>
              {tvaColumns.map(r => {
                const lineHT = (baseHTByRate[r] ?? 0) * ratio;
                return (
                  <tr key={r} style={{ borderBottom: "1px solid #eee" }}>
                    <td style={{ padding: "12px 8px", fontSize: 11, verticalAlign: "top" }}>
                      <div style={{ fontWeight: 700 }}>
                        Acompte de {facture.montantAcomptePct}% sur commande selon le devis n° {facture.devisNumero} y faisant référence
                      </div>
                      {tvaColumns.length > 1 && (
                        <div style={{ fontSize: 9, color: "#666", marginTop: 2 }}>
                          Ventilation pour la part soumise à la TVA de {r}%
                        </div>
                      )}
                    </td>
                    <td style={{ textAlign: "center", padding: "12px 4px", fontSize: 11, verticalAlign: "top" }}>1</td>
                    <td style={{ textAlign: "right", padding: "12px 4px", fontSize: 11, fontFamily: "DM Mono, monospace", verticalAlign: "top" }}>
                      {formatEUR(lineHT)}
                    </td>
                    <td style={{ textAlign: "right", padding: "12px 4px", fontSize: 11, fontWeight: 700, fontFamily: "DM Mono, monospace", verticalAlign: "top" }}>
                      {formatEUR(lineHT)}
                    </td>
                    <td style={{ textAlign: "center", padding: "12px 4px", fontSize: 11, verticalAlign: "top" }}>{r}%</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          /* Detailed table for solde, situation, avoir */
          <table style={{ width: "100%", fontSize: 11, borderCollapse: "collapse", marginTop: 12 }}>
            <thead>
              <tr style={{ borderBottom: "2px solid #1a1a1a", borderTop: "2px solid #1a1a1a" }}>
                <th style={{ textAlign: "left", padding: "8px 8px", width: 90, fontWeight: 600, fontSize: 10, textTransform: "uppercase", letterSpacing: 1 }}>Visuel</th>
                <th style={{ textAlign: "left", padding: "8px 8px", fontWeight: 600, fontSize: 10, textTransform: "uppercase", letterSpacing: 1 }}>Désignation</th>
                <th style={{ textAlign: "center", padding: "8px 4px", width: 40, fontWeight: 600, fontSize: 10, textTransform: "uppercase" }}>Qté</th>
                <th style={{ textAlign: "right", padding: "8px 4px", width: 80, fontWeight: 600, fontSize: 10, textTransform: "uppercase" }}>Pu HT</th>
                <th style={{ textAlign: "right", padding: "8px 4px", width: 80, fontWeight: 600, fontSize: 10, textTransform: "uppercase" }}>Total HT</th>
                <th style={{ textAlign: "center", padding: "8px 4px", width: 40, fontWeight: 600, fontSize: 10, textTransform: "uppercase" }}>TVA</th>
              </tr>
            </thead>
            <tbody>
              {facture.lignes.map((line: any, i: number) => (
                <React.Fragment key={line.id}>
                  <tr style={{ pageBreakInside: "avoid", breakInside: "avoid" }}>
                    <td style={{ verticalAlign: "top", padding: "12px 8px", borderBottom: "1px solid #eee" }}>
                      {line.image ? (
                        <img
                          src={line.image}
                          alt={line.designation || "Visuel"}
                          style={{
                            width: 80,
                            height: 60,
                            objectFit: "cover",
                            borderRadius: 4,
                            border: "1px solid #eee"
                          }}
                        />
                      ) : (
                        <div style={{
                          width: 80, height: 60,
                          background: "#f9f9f9",
                          borderRadius: 4,
                          display: "flex", alignItems: "center", justifyContent: "center",
                          fontSize: 9, color: "#ccc",
                          border: "1px dashed #eee"
                        }}>
                          —
                        </div>
                      )}
                    </td>
                    <td style={{ verticalAlign: "top", padding: "12px 8px", borderBottom: "1px solid #eee" }}>
                      <div style={{ fontWeight: 700, fontSize: 12, marginBottom: 4 }}>{line.designation || "—"}</div>
                      {line.description && (
                        <div style={{ fontSize: 10, color: "#666", marginBottom: 6, lineHeight: 1.5 }}>
                          {line.description}
                        </div>
                      )}
                      {line.options && line.options.length > 0 && (
                        <ul style={{ margin: "4px 0 0 0", padding: "0 0 0 16px", fontSize: 10, color: "#444", lineHeight: 1.6 }}>
                          {line.options.map((opt: any) => (
                            <li key={opt.id}>{opt.designation} — {formatEUR(opt.prixHT)}</li>
                          ))}
                        </ul>
                      )}
                    </td>
                    <td style={{ textAlign: "center", padding: "12px 4px", borderBottom: "1px solid #eee", fontWeight: 500 }}>
                      {line.quantite}
                    </td>
                    <td style={{ textAlign: "right", padding: "12px 4px", borderBottom: "1px solid #eee", fontFamily: "DM Mono, monospace" }}>
                      {formatEUR(line.prixUnitaireHT)}
                    </td>
                    <td style={{ textAlign: "right", padding: "12px 4px", borderBottom: "1px solid #eee", fontWeight: 700, fontFamily: "DM Mono, monospace" }}>
                      {formatEUR(lineMontantHT(line))}
                    </td>
                    <td style={{ textAlign: "center", padding: "12px 4px", borderBottom: "1px solid #eee" }}>
                      {line.tva}%
                    </td>
                  </tr>
                </React.Fragment>
              ))}
            </tbody>
          </table>
        )}

        {/* Totals and details section */}
        <div style={{ marginTop: 20, display: "flex", gap: 24, alignItems: "flex-start" }}>
          {/* Left: TVA grid & Payment conditions */}
          <div style={{ flex: 1 }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11, border: "1px solid #ddd" }}>
              <thead>
                <tr style={{ background: "#f5f5f5" }}>
                  <td style={{ padding: "6px 10px", fontWeight: 700, borderRight: "1px solid #ddd", borderBottom: "1px solid #ddd" }}>
                    Détail TVA
                  </td>
                  {tvaColumns.map(r => (
                    <td key={r} style={{ padding: "6px 10px", textAlign: "center", fontWeight: 700, borderRight: "1px solid #ddd", borderBottom: "1px solid #ddd" }}>
                      {r} %
                    </td>
                  ))}
                </tr>
                <tr>
                  <td style={{ padding: "6px 10px", borderRight: "1px solid #ddd", borderBottom: "1px solid #ddd" }}>Base HT</td>
                  {tvaColumns.map(r => (
                    <td key={r} style={{ padding: "6px 10px", textAlign: "right", fontFamily: "DM Mono, monospace", borderRight: "1px solid #ddd", borderBottom: "1px solid #ddd" }}>
                      {formatEUR(isAcompte ? (baseHTByRate[r] ?? 0) * ratio : (baseHTByRate[r] ?? 0))}
                    </td>
                  ))}
                </tr>
                <tr>
                  <td style={{ padding: "6px 10px", borderRight: "1px solid #ddd" }}>Montant TVA</td>
                  {tvaColumns.map(r => (
                    <td key={r} style={{ padding: "6px 10px", textAlign: "right", fontFamily: "DM Mono, monospace", borderRight: "1px solid #ddd" }}>
                      {formatEUR(isAcompte ? (totals.tvaMap[r] ?? 0) * ratio : (totals.tvaMap[r] ?? 0))}
                    </td>
                  ))}
                </tr>
              </thead>
            </table>

            {/* Payment conditions */}
            <div style={{ marginTop: 12, border: "1px solid #ddd", padding: "10px 12px", fontSize: 11, lineHeight: 1.8 }}>
              <div style={{ fontWeight: 700, marginBottom: 4 }}>
                Règlement : {facture.modePaiement || "Virement bancaire"}
              </div>
              <div>Échéance : {formatDate(facture.dateEcheance)}</div>
              <div style={{ marginTop: 6, fontSize: 10, color: "#555", display: "flex", alignItems: "center", gap: 6 }}>
                💳 {IBAN}
              </div>
            </div>

            {/* Legal Mention */}
            <div style={{ marginTop: 10, fontSize: 10, color: "#555", lineHeight: 1.5 }}>
              Mention TVA acquittée sur les débits.
              <br />
              {getLegalMention(settings)}
            </div>
          </div>

          {/* Right: Totals */}
          <div style={{ width: 230, flexShrink: 0 }}>
            <div style={{ border: "1px solid #ddd", overflow: "hidden", borderRadius: 4 }}>
              {isAcompte ? (
                <>
                  <div style={{ display: "flex", justifyContent: "space-between", padding: "7px 12px", borderBottom: "1px solid #eee", fontSize: 11 }}>
                    <span>Montant HT :</span>
                    <strong style={{ fontFamily: "DM Mono, monospace" }}>{formatEUR(totals.sousTotal * ratio)}</strong>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", padding: "7px 12px", borderBottom: "1px solid #eee", fontSize: 11 }}>
                    <span>Montant TVA :</span>
                    <strong style={{ fontFamily: "DM Mono, monospace" }}>{formatEUR(totals.totalTVA * ratio)}</strong>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 12px", background: "#1a1a1a", color: "#fff", fontSize: 13, fontWeight: 700 }}>
                    <span>TOTAL TTC :</span>
                    <span style={{ fontFamily: "DM Mono, monospace" }}>{formatEUR(facture.montantAcompte)}</span>
                  </div>
                </>
              ) : (
                <>
                  <div style={{ display: "flex", justifyContent: "space-between", padding: "7px 12px", borderBottom: "1px solid #eee", fontSize: 11 }}>
                    <span>Total HT Devis :</span>
                    <strong style={{ fontFamily: "DM Mono, monospace" }}>{formatEUR(totals.sousTotal)}</strong>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", padding: "7px 12px", borderBottom: "1px solid #eee", fontSize: 11 }}>
                    <span>Total TVA Devis :</span>
                    <strong style={{ fontFamily: "DM Mono, monospace" }}>{formatEUR(totals.totalTVA)}</strong>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", padding: "7px 12px", borderBottom: "1px solid #eee", fontSize: 11 }}>
                    <span>TOTAL TTC Devis :</span>
                    <strong style={{ fontFamily: "DM Mono, monospace" }}>{formatEUR(totals.totalTTC)}</strong>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", padding: "7px 12px", borderBottom: "1px solid #eee", fontSize: 11, color: "red" }}>
                    <span>Déduction Acompte(s) :</span>
                    <strong style={{ fontFamily: "DM Mono, monospace" }}>-{formatEUR(totals.totalTTC - facture.montantAcompte)}</strong>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 12px", background: "#1a1a1a", color: "#fff", fontSize: 13, fontWeight: 700 }}>
                    <span>SOLDE À PAYER :</span>
                    <span style={{ fontFamily: "DM Mono, monospace" }}>{formatEUR(facture.montantAcompte)}</span>
                  </div>
                </>
              )}
              {totalRecu > 0 && (
                <div style={{ display: "flex", justifyContent: "space-between", padding: "7px 12px", borderBottom: "1px solid #eee", fontSize: 11, color: "green" }}>
                  <span>Règlements reçus :</span>
                  <strong style={{ fontFamily: "DM Mono, monospace" }}>-{formatEUR(totalRecu)}</strong>
                </div>
              )}
              <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 12px", background: "#f5f5f5", borderTop: "2px solid #ddd", fontSize: 13, fontWeight: 700 }}>
                <span>NET À PAYER :</span>
                <span style={{ fontFamily: "DM Mono, monospace", color: "hsl(var(--accent))" }}>{formatEUR(Math.max(netAPayer, 0))}</span>
              </div>
            </div>
          </div>
        </div>

        <PageFooter c={c} />
      </div>
    </div>
  );
}
