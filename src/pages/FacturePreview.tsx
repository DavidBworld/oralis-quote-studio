import React, { useEffect, useState } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { ArrowLeft, Printer } from "lucide-react";
import { formatEUR, formatDate, formatClientName, calcTotals, lineMontantHT } from "@/lib/quote-data";
import { loadSettings, getLegalMention } from "@/lib/settings-data";
import { dbLoadFactures } from "@/lib/supabase-data/factures";
import { toast } from "sonner";

const IBAN = "SAS TOUT POUR MA TERRASSE — IBAN FR76 1695 8000 0129 8680 2762 960";

// ── Static Translations ──────────────────────────────────────────────────────
const TRANSLATIONS: Record<string, Record<string, string>> = {
  FR: {
    type_acompte: "FACTURE D'ACOMPTE",
    type_finale: "FACTURE FINALE",
    type_avoir: "AVOIR",
    designation: "DÉSIGNATION",
    qte: "QTÉ",
    pu_ht: "PU HT",
    total_ht: "TOTAL HT",
    tva: "TVA",
    montant_ht: "Montant HT",
    montant_tva: "Montant TVA",
    total_ttc: "TOTAL TTC",
    net_a_payer: "NET À PAYER",
    detail_tva: "Détail TVA",
    base_ht: "Base HT",
    reglement: "Règlement :",
    virement: "Virement",
    echeance: "Échéance",
    devis_lie: "Devis lié",
    mention_tva: "Mention TVA acquittée sur les débits",
    date: "Date",
    numero: "N°"
  },
  EN: {
    type_acompte: "DEPOSIT INVOICE",
    type_finale: "FINAL INVOICE",
    type_avoir: "CREDIT NOTE",
    designation: "DESCRIPTION",
    qte: "QTY",
    pu_ht: "UNIT PRICE",
    total_ht: "SUBTOTAL",
    tva: "VAT",
    montant_ht: "Net amount",
    montant_tva: "VAT amount",
    total_ttc: "TOTAL INCL. VAT",
    net_a_payer: "AMOUNT DUE",
    detail_tva: "VAT Details",
    base_ht: "Net base",
    reglement: "Payment:",
    virement: "Bank transfer",
    echeance: "Due date",
    devis_lie: "Related quote",
    mention_tva: "VAT collected on debit basis",
    date: "Date",
    numero: "N°"
  },
  DE: {
    type_acompte: "ANZAHLUNGSRECHNUNG",
    type_finale: "SCHLUSSRECHNUNG",
    type_avoir: "GUTSCHRIFT",
    designation: "BEZEICHNUNG",
    qte: "MENGE",
    pu_ht: "EINZELPREIS",
    total_ht: "NETTOBETRAG",
    tva: "MwSt.",
    montant_ht: "Nettobetrag",
    montant_tva: "MwSt.-Betrag",
    total_ttc: "GESAMTBETRAG",
    net_a_payer: "ZAHLBETRAG",
    detail_tva: "MwSt.-Details",
    base_ht: "Nettobasis",
    reglement: "Zahlung:",
    virement: "Überweisung",
    echeance: "Fälligkeit",
    devis_lie: "Zugehöriges Angebot",
    mention_tva: "Steuer auf Sollversteuerung",
    date: "Datum",
    numero: "Nr."
  },
  IT: {
    type_acompte: "FATTURA ACCONTO",
    type_finale: "FATTURA FINALE",
    type_avoir: "NOTA DI CREDITO",
    designation: "DESCRIZIONE",
    qte: "QTÀ",
    pu_ht: "PREZZO UNIT.",
    total_ht: "TOTALE NETTO",
    tva: "IVA",
    montant_ht: "Importo netto",
    montant_tva: "Importo IVA",
    total_ttc: "TOTALE IVA INCL.",
    net_a_payer: "NETTO DA PAGARE",
    detail_tva: "Dettaglio IVA",
    base_ht: "Base netta",
    reglement: "Pagamento:",
    virement: "Bonifico",
    echeance: "Scadenza",
    devis_lie: "Preventivo collegato",
    mention_tva: "IVA assolta per cassa",
    date: "Data",
    numero: "N°"
  },
  PT: {
    type_acompte: "FATURA DE ADIANTAMENTO",
    type_finale: "FATURA FINAL",
    type_avoir: "NOTA DE CRÉDITO",
    designation: "DESCRIÇÃO",
    qte: "QTD",
    pu_ht: "PREÇO UNIT.",
    total_ht: "TOTAL LÍQUIDO",
    tva: "IVA",
    montant_ht: "Valor líquido",
    montant_tva: "Valor IVA",
    total_ttc: "TOTAL C/ IVA",
    net_a_payer: "VALOR A PAGAR",
    detail_tva: "Detalhe IVA",
    base_ht: "Base líquida",
    reglement: "Pagamento:",
    virement: "Transferência",
    echeance: "Vencimento",
    devis_lie: "Orçamento relacionado",
    mention_tva: "IVA liquidada por débitos",
    date: "Data",
    numero: "N°"
  }
};

function formatQuantite(q: number, unite?: string) {
  const formattedNum = q.toLocaleString("fr-FR", { minimumFractionDigits: 0, maximumFractionDigits: 2 });
  if (unite && unite !== "unité") {
    return `${formattedNum} ${unite}`;
  }
  return formattedNum;
}

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

function PageFooter({ c, translateText }: { c: any; translateText: (str: string | undefined) => string }) {
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
      <div style={{ fontFamily: "Cormorant Garamond, serif", fontSize: 14, opacity: 0.7 }}>{translateText("CRÉATEUR D'ESPACES EXTÉRIEURS")}</div>
    </div>
  );
}

function FactureHeader({
  facture,
  c,
  logo,
  typeTitle,
  t,
  translateText
}: {
  facture: any;
  c: any;
  logo?: string;
  typeTitle: string;
  t: (key: keyof typeof TRANSLATIONS["FR"]) => string;
  translateText: (str: string | undefined) => string;
}) {
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
          <div>{translateText("Tél. :")} {c.telephone}</div>
          <div>{translateText("Email :")} {c.email}</div>
          <div>{translateText("Site :")} www.{c.siteWeb}</div>
        </div>
      </div>
      {/* Right: Contact + Devis num + Client */}
      <div style={{ textAlign: "right", fontSize: 11, color: "#555", lineHeight: 1.7 }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, color: "#111" }}>{typeTitle}</div>
          <div style={{ fontSize: 12, fontWeight: 600, color: "#333", fontFamily: "DM Mono, monospace" }}>{t("numero")} {facture.numero}</div>
          <div>{t("date")} : {formatDate(facture.dateFacture)}</div>
          <div>{t("echeance")} : {formatDate(facture.dateEcheance)}</div>
          {facture.referenceAffaire && <div>{translateText("Réf. affaire :")} {translateText(facture.referenceAffaire)}</div>}
          <div>{t("devis_lie")} : {facture.devisNumero}</div>
        </div>
        <div style={{ marginTop: 8, textAlign: "right" }}>
          <strong style={{ fontSize: 13, color: "#111" }}>
            {formatClientName(facture.client)}
          </strong><br />
          {facture.client.societe && <span>{facture.client.societe}<br /></span>}
          {facture.client.rue && <span>{facture.client.rue}<br /></span>}
          {facture.client.codePostal} {facture.client.ville}<br />
          {facture.client.pays && <span style={{ fontWeight: 600 }}>{translateText(facture.client.pays).toUpperCase()}</span>}
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
  const [loading, setLoading] = useState(true);

  // States for translation
  const [currentLang, setCurrentLang] = useState<"FR" | "EN" | "DE" | "IT" | "PT">("FR");
  const [translating, setTranslating] = useState(false);
  const [translationsCache, setTranslationsCache] = useState<Record<string, Record<string, string>>>({});

  const translateText = (str: string | undefined): string => {
    if (!str) return "";
    if (currentLang === "FR") return str;
    const cache = translationsCache[currentLang];
    if (cache && cache[str] !== undefined) {
      return cache[str];
    }
    return str;
  };

  const t = (key: keyof typeof TRANSLATIONS["FR"]) => {
    return TRANSLATIONS[currentLang]?.[key] || TRANSLATIONS["FR"][key];
  };

  const handleLangChange = async (lang: "FR" | "EN" | "DE" | "IT" | "PT") => {
    if (lang === "FR") {
      setCurrentLang("FR");
      return;
    }

    if (translationsCache[lang]) {
      setCurrentLang(lang);
      return;
    }

    setTranslating(true);
    try {
      const textsToTranslate = new Set<string>();

      // Collect lines to translate
      if (facture.type === "acompte") {
        textsToTranslate.add(`Acompte de ${facture.montantAcomptePct}% sur commande selon le devis n° ${facture.devisNumero} y faisant référence`);
        textsToTranslate.add("Ventilation pour la part soumise à la TVA de");
      } else {
        facture.lignes.forEach((l: any) => {
          if (l.designation) {
            textsToTranslate.add(l.designation);
          }
          if (l.description) {
            textsToTranslate.add(l.description);
          }
          l.options?.forEach((o: any) => {
            if (o.designation) {
              textsToTranslate.add(o.designation);
            }
          });
        });
      }

      // Add dynamic fields
      if (facture.referenceAffaire) {
        textsToTranslate.add(facture.referenceAffaire);
      }
      if (facture.modePaiement) {
        textsToTranslate.add(facture.modePaiement);
      }
      if (facture.client?.pays) {
        textsToTranslate.add(facture.client.pays);
      }
      
      const legalMention = getLegalMention(settings);
      if (legalMention) {
        textsToTranslate.add(legalMention);
      }

      // Collect UI texts
      textsToTranslate.add("Visuel");
      textsToTranslate.add("Total HT Devis");
      textsToTranslate.add("Total TVA Devis");
      textsToTranslate.add("TOTAL TTC Devis");
      textsToTranslate.add("Déduction Acompte(s)");
      textsToTranslate.add("SOLDE À PAYER");
      textsToTranslate.add("Règlements reçus");
      textsToTranslate.add("CRÉATEUR D'ESPACES EXTÉRIEURS");
      textsToTranslate.add("Tél. :");
      textsToTranslate.add("Email :");
      textsToTranslate.add("Site :");
      textsToTranslate.add("Virement bancaire");

      const textsList = Array.from(textsToTranslate);

      let response = await fetch("/api/translate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          texts: textsList,
          targetLang: lang,
        }),
      });

      // Fallback for local development if serverless function is not hosted
      if (response.status === 404) {
        const apiKey = import.meta.env.VITE_DEEPL_API_KEY;
        if (apiKey) {
          response = await fetch("https://api-free.deepl.com/v2/translate", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `DeepL-Auth-Key ${apiKey}`,
            },
            body: JSON.stringify({
              text: textsList,
              target_lang: lang,
            }),
          });
        }
      }

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Erreur API DeepL: ${response.status} ${errText}`);
      }

      const data = await response.json();
      const translatedTexts = (data.translations || []).map((t: any) => t.text);

      if (translatedTexts.length !== textsList.length) {
        throw new Error("Nombre de traductions retournées incorrect.");
      }

      const translations: Record<string, string> = {};
      textsList.forEach((original, idx) => {
        translations[original] = translatedTexts[idx];
      });

      setTranslationsCache((prev) => ({
        ...prev,
        [lang]: translations,
      }));
      setCurrentLang(lang);
      toast.success(`Facture traduite en ${lang} !`);
    } catch (err: any) {
      console.error(err);
      toast.error(`Erreur lors de la traduction : ${err.message || "Erreur inconnue"}`);
      setCurrentLang("FR");
    } finally {
      setTranslating(false);
    }
  };

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const all = await dbLoadFactures();
        const found = all.find((f: any) => f.id === id);
        if (found) {
          setFacture(found);
        } else {
          toast.error("Facture introuvable.");
          navigate("/factures");
          return;
        }
        
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
      } catch (err) {
        console.error("Erreur chargement facture :", err);
        toast.error("Erreur de chargement de la facture.");
        navigate("/factures");
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [id, navigate]);

  // Auto-print when opened via the "Imprimer" button from FactureDetail
  useEffect(() => {
    if (facture && settings && (location.state as any)?.autoPrint) {
      const t = setTimeout(() => window.print(), 600);
      return () => clearTimeout(t);
    }
  }, [facture, settings, location.state]);

  if (loading || !facture || !settings) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-full border-4 border-accent border-t-transparent animate-spin"></div>
          <p className="text-xs text-muted-foreground font-body">Chargement de l'aperçu...</p>
        </div>
      </div>
    );
  }

  const totals = calcTotals(facture.lignes);
  const c = settings.company;
  const totalRecu = facture.reglements.reduce((s: number, r: any) => s + r.montant, 0);

  const isAcompte = facture.type === "acompte";
  const ratio = totals.totalTTC > 0 ? (facture.montantAcompte / totals.totalTTC) : 0;
  const netAPayer = facture.montantAcompte - totalRecu;

  const typeTitle = facture.type === "acompte" ? t("type_acompte")
    : facture.type === "avoir" ? t("type_avoir")
    : t("type_finale");

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
        <span className="text-sm font-medium text-muted-foreground">{facture.numero} — {formatClientName(facture.client)}</span>
        <div className="flex-1" />

        {/* Language Selector */}
        <div className="flex items-center gap-1 bg-muted/60 p-1 rounded border border-border/80 mr-2">
          {(["FR", "EN", "DE", "IT", "PT"] as const).map((lang) => {
            const flag = lang === "FR" ? "🇫🇷" : lang === "EN" ? "🇬🇧" : lang === "DE" ? "🇩🇪" : lang === "IT" ? "🇮🇹" : "🇵🇹";
            return (
              <button
                key={lang}
                onClick={() => handleLangChange(lang)}
                className={`px-2 py-1 text-xs rounded transition-all font-semibold ${
                  currentLang === lang
                    ? "bg-accent text-accent-foreground shadow-sm font-bold"
                    : "hover:bg-muted text-muted-foreground hover:text-foreground"
                }`}
                disabled={translating}
              >
                {flag} {lang}
              </button>
            );
          })}
        </div>

        {translating && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground animate-pulse mr-4">
            <div className="w-3.5 h-3.5 rounded-full border-2 border-accent border-t-transparent animate-spin"></div>
            <span>Traduction...</span>
          </div>
        )}

        <button onClick={() => navigate(`/factures/${facture.id}`)} className="btn-outline-gold text-xs">Modifier</button>
        <button onClick={() => window.print()} className="btn-gold flex items-center gap-2 text-xs"><Printer size={14} /> Imprimer / PDF</button>
      </div>

      {/* A4 printable page */}
      <div className="print-page bg-white mx-auto my-8 shadow-lg" style={{ maxWidth: "210mm", padding: "10mm 10mm 25mm 10mm" }}>
        
        <FactureHeader facture={facture} c={c} logo={logoUrl || settings.logo} typeTitle={typeTitle} t={t} translateText={translateText} />

        <div style={{ height: "1px", background: "#1a1a1a", margin: "14px 0 14px 0" }} />

        {isAcompte ? (
          /* Simplified table for deposits */
          <table style={{ width: "100%", fontSize: 11, borderCollapse: "collapse", marginTop: 12 }}>
            <thead>
              <tr style={{ borderBottom: "2px solid #1a1a1a", borderTop: "2px solid #1a1a1a" }}>
                <th style={{ textAlign: "left", padding: "8px 8px", fontWeight: 600, fontSize: 10, textTransform: "uppercase", letterSpacing: 1 }}>{t("designation")}</th>
                <th style={{ textAlign: "center", padding: "8px 4px", width: 40, fontWeight: 600, fontSize: 10, textTransform: "uppercase" }}>{t("qte")}</th>
                <th style={{ textAlign: "right", padding: "8px 4px", width: 80, fontWeight: 600, fontSize: 10, textTransform: "uppercase" }}>{t("pu_ht")}</th>
                <th style={{ textAlign: "right", padding: "8px 4px", width: 80, fontWeight: 600, fontSize: 10, textTransform: "uppercase" }}>{t("total_ht")}</th>
                <th style={{ textAlign: "center", padding: "8px 4px", width: 40, fontWeight: 600, fontSize: 10, textTransform: "uppercase" }}>{t("tva")}</th>
              </tr>
            </thead>
            <tbody>
              {tvaColumns.map(r => {
                const lineHT = (baseHTByRate[r] ?? 0) * ratio;
                return (
                  <tr key={r} style={{ borderBottom: "1px solid #eee" }}>
                    <td style={{ padding: "12px 8px", fontSize: 11, verticalAlign: "top" }}>
                      <div style={{ fontWeight: 700 }}>
                        {translateText(`Acompte de ${facture.montantAcomptePct}% sur commande selon le devis n° ${facture.devisNumero} y faisant référence`)}
                      </div>
                      {tvaColumns.length > 1 && (
                        <div style={{ fontSize: 9, color: "#666", marginTop: 2 }}>
                          {translateText("Ventilation pour la part soumise à la TVA de")} {r}%
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
                <th style={{ textAlign: "left", padding: "8px 8px", width: 90, fontWeight: 600, fontSize: 10, textTransform: "uppercase", letterSpacing: 1 }}>{translateText("Visuel")}</th>
                <th style={{ textAlign: "left", padding: "8px 8px", fontWeight: 600, fontSize: 10, textTransform: "uppercase", letterSpacing: 1 }}>{t("designation")}</th>
                <th style={{ textAlign: "center", padding: "8px 4px", width: 40, fontWeight: 600, fontSize: 10, textTransform: "uppercase" }}>{t("qte")}</th>
                <th style={{ textAlign: "right", padding: "8px 4px", width: 80, fontWeight: 600, fontSize: 10, textTransform: "uppercase" }}>{t("pu_ht")}</th>
                <th style={{ textAlign: "right", padding: "8px 4px", width: 80, fontWeight: 600, fontSize: 10, textTransform: "uppercase" }}>{t("total_ht")}</th>
                <th style={{ textAlign: "center", padding: "8px 4px", width: 40, fontWeight: 600, fontSize: 10, textTransform: "uppercase" }}>{t("tva")}</th>
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
                          alt={translateText(line.designation) || "Visuel"}
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
                      <div style={{ fontWeight: 700, fontSize: 12, marginBottom: 4 }}>{translateText(line.designation) || "—"}</div>
                      {line.description && (
                        <div style={{ fontSize: 10, color: "#666", marginBottom: 6, lineHeight: 1.5, whiteSpace: "pre-line" }}>
                          {translateText(line.description)}
                        </div>
                      )}
                      {line.options && line.options.length > 0 && (
                        <ul style={{ margin: "4px 0 0 0", padding: "0 0 0 16px", fontSize: 10, color: "#444", lineHeight: 1.6 }}>
                          {line.options.map((opt: any) => (
                            <li key={opt.id}>{translateText(opt.designation)} — {formatEUR(opt.prixHT)}</li>
                          ))}
                        </ul>
                      )}
                    </td>
                     <td style={{ textAlign: "center", padding: "12px 4px", borderBottom: "1px solid #eee", fontWeight: 500, whiteSpace: "nowrap" }}>
                       {formatQuantite(line.quantite, line.unite)}
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
                    {t("detail_tva")}
                  </td>
                  {tvaColumns.map(r => (
                    <td key={r} style={{ padding: "6px 10px", textAlign: "center", fontWeight: 700, borderRight: "1px solid #ddd", borderBottom: "1px solid #ddd" }}>
                      {r} %
                    </td>
                  ))}
                </tr>
                <tr>
                  <td style={{ padding: "6px 10px", borderRight: "1px solid #ddd", borderBottom: "1px solid #ddd" }}>{t("base_ht")}</td>
                  {tvaColumns.map(r => (
                    <td key={r} style={{ padding: "6px 10px", textAlign: "right", fontFamily: "DM Mono, monospace", borderRight: "1px solid #ddd", borderBottom: "1px solid #ddd" }}>
                      {formatEUR(isAcompte ? (baseHTByRate[r] ?? 0) * ratio : (baseHTByRate[r] ?? 0))}
                    </td>
                  ))}
                </tr>
                <tr>
                  <td style={{ padding: "6px 10px", borderRight: "1px solid #ddd" }}>{t("montant_tva")}</td>
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
                {t("reglement")} {facture.modePaiement === "Virement" || facture.modePaiement === "Virement bancaire" ? t("virement") : translateText(facture.modePaiement || "Virement")}
              </div>
              <div>{t("echeance")} : {formatDate(facture.dateEcheance)}</div>
              <div style={{ marginTop: 6, fontSize: 10, color: "#555", display: "flex", alignItems: "center", gap: 6 }}>
                💳 {IBAN}
              </div>
            </div>

            {/* Legal Mention */}
            <div style={{ marginTop: 10, fontSize: 10, color: "#555", lineHeight: 1.5 }}>
              {t("mention_tva")}.
              <br />
              {translateText(getLegalMention(settings))}
            </div>
          </div>

          {/* Right: Totals */}
          <div style={{ width: 230, flexShrink: 0 }}>
            <div style={{ border: "1px solid #ddd", overflow: "hidden", borderRadius: 4 }}>
              {isAcompte ? (
                <>
                  <div style={{ display: "flex", justifyContent: "space-between", padding: "7px 12px", borderBottom: "1px solid #eee", fontSize: 11 }}>
                    <span>{t("montant_ht")} :</span>
                    <strong style={{ fontFamily: "DM Mono, monospace" }}>{formatEUR(totals.sousTotal * ratio)}</strong>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", padding: "7px 12px", borderBottom: "1px solid #eee", fontSize: 11 }}>
                    <span>{t("montant_tva")} :</span>
                    <strong style={{ fontFamily: "DM Mono, monospace" }}>{formatEUR(totals.totalTVA * ratio)}</strong>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 12px", background: "#1a1a1a", color: "#fff", fontSize: 13, fontWeight: 700 }}>
                    <span>{t("total_ttc")} :</span>
                    <span style={{ fontFamily: "DM Mono, monospace" }}>{formatEUR(facture.montantAcompte)}</span>
                  </div>
                </>
              ) : (
                <>
                  <div style={{ display: "flex", justifyContent: "space-between", padding: "7px 12px", borderBottom: "1px solid #eee", fontSize: 11 }}>
                    <span>{translateText("Total HT Devis")} :</span>
                    <strong style={{ fontFamily: "DM Mono, monospace" }}>{formatEUR(totals.sousTotal)}</strong>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", padding: "7px 12px", borderBottom: "1px solid #eee", fontSize: 11 }}>
                    <span>{translateText("Total TVA Devis")} :</span>
                    <strong style={{ fontFamily: "DM Mono, monospace" }}>{formatEUR(totals.totalTVA)}</strong>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", padding: "7px 12px", borderBottom: "1px solid #eee", fontSize: 11 }}>
                    <span>{translateText("TOTAL TTC Devis")} :</span>
                    <strong style={{ fontFamily: "DM Mono, monospace" }}>{formatEUR(totals.totalTTC)}</strong>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", padding: "7px 12px", borderBottom: "1px solid #eee", fontSize: 11, color: "red" }}>
                    <span>{translateText("Déduction Acompte(s)")} :</span>
                    <strong style={{ fontFamily: "DM Mono, monospace" }}>-{formatEUR(totals.totalTTC - facture.montantAcompte)}</strong>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 12px", background: "#1a1a1a", color: "#fff", fontSize: 13, fontWeight: 700 }}>
                    <span>{translateText("SOLDE À PAYER")} :</span>
                    <span style={{ fontFamily: "DM Mono, monospace" }}>{formatEUR(facture.montantAcompte)}</span>
                  </div>
                </>
              )}
              {totalRecu > 0 && (
                <div style={{ display: "flex", justifyContent: "space-between", padding: "7px 12px", borderBottom: "1px solid #eee", fontSize: 11, color: "green" }}>
                  <span>{translateText("Règlements reçus")} :</span>
                  <strong style={{ fontFamily: "DM Mono, monospace" }}>-{formatEUR(totalRecu)}</strong>
                </div>
              )}
              <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 12px", background: "#f5f5f5", borderTop: "2px solid #ddd", fontSize: 13, fontWeight: 700 }}>
                <span>{t("net_a_payer")} :</span>
                <span style={{ fontFamily: "DM Mono, monospace", color: "hsl(var(--accent))" }}>{formatEUR(Math.max(netAPayer, 0))}</span>
              </div>
            </div>
          </div>
        </div>

        <PageFooter c={c} translateText={translateText} />
      </div>
    </div>
  );
}
