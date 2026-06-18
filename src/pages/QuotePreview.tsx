import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Printer } from "lucide-react";
import {
  formatEUR,
  formatDate,
  formatClientName,
  calcTotals,
  lineMontantHT,
  type Quote,
} from "@/lib/quote-data";
import { loadSettings, type AppSettings } from "@/lib/settings-data";
import { dbLoadQuotes } from "@/lib/supabase-data/devis";
import { dbLoadModeles } from "@/lib/supabase-data/modeles";
import { dbLoadCommerciaux, type Commercial } from "@/lib/supabase-data/commerciaux";
import { type AnyModele } from "@/lib/configurator-data";
import { toast } from "sonner";

// ── CGV text ──────────────────────────────────────────────────────────────────
const CGV_ARTICLES = [
  {
    title: "ART. 1 OBJET ET CHAMP D'APPLICATION DES CONDITIONS GENERALES DE VENTE",
    text: `Les présentes conditions générales de vente de ORALIS, marque de la SAS TOUT POUR MA TERRASSE sont systématiquement adressées et remises à chaque acheteur pour lui permettre de passer commande. En conséquence, le fait de passer commande implique l'adhésion entière et sans réserve de l'acheteur à ces Conditions Générales de Vente à l'exclusion de tout autre document tels que prospectus, catalogues, documents internes de fabrication ou d'étude émis par le vendeur et qui n'ont qu'une valeur indicative. Aucune condition particulière ne peut sauf acceptation formelle et écrite du vendeur, prévaloir contre ces Conditions Générales de Vente. Les devis et métrés sont établis sans frais pour l'acheteur. Les devis, dessins et prises de cotes, plans, maquettes et descriptifs restent notre propriété exclusive. Leur communication à d'autres entreprises ou tiers est interdite et passible de dommages et intérêts.`,
  },
  {
    title: "ART. 2 OBLIGATIONS D'INFORMATIONS PRÉCONTRACTUELLES",
    text: `Conformément au Code de la Consommation : toute vente de biens ou services doit être précédée de la remise au client des informations suivantes de façon claire et compréhensible : 1- Dénomination sociale et coordonnées du fournisseur. 2- Adresse du lieu de conclusion du contrat. 3- Désignation précise de la nature et des caractéristiques des biens offerts. 4- Conditions d'exécution du contrat, notamment modalités et délais de livraison. 5- Prix global à payer et modalités de paiement.`,
  },
  {
    title: "ART. 3 ACCEPTATION DE LA COMMANDE",
    text: `La vente pourra être conclue au siège de la société ou au domicile du client, à défaut le client transmettra par voie postale ou électronique le bon de commande daté et signé avec bon pour accord. Le contrat sera définitivement formé après acceptation du devis par la Direction d'une part, et par le service technique d'autre part.`,
  },
  {
    title: "ART. 4 PRIX - VALIDITE",
    text: `Les produits sont fournis sur la base des tarifs en vigueur au jour de la commande. Le devis remis au client est valable dans sa totalité pendant une durée de 1 mois à compter de son établissement hors promotion en cours. Les prix sont établis sur la base des taux de TVA en vigueur à la date de remise de l'offre et toute variation ultérieure de ces taux sera répercutée sur les prix.`,
  },
  {
    title: "ART. 5 TRAVAUX SUPPLEMENTAIRES, URGENTS OU IMPREVISIBLES",
    text: `Tous travaux non prévus explicitement dans l'offre seront considérés comme travaux supplémentaires ; ils donneront lieu à la signature d'un avenant avant leur exécution.`,
  },
  {
    title: "ART. 6 DELAIS - LIVRAISON",
    text: `Le délai de livraison indiqué sur le devis ne court qu'à compter de la réalisation du dernier des événements suivants : encaissement de l'acompte prévu au contrat, validation technique par le métreur ou le technico-commercial de notre société et fourniture par le client de toutes les autorisations nécessaires. Les jours fériés ainsi que les périodes de congé ne sont pas pris en compte pour la détermination de la date de livraison. La date de livraison, bien que déterminée le plus soigneusement possible, ne saurait être opposable à notre société en cas d'inexécution par le client d'une quelconque de ses obligations ou en cas de force majeure.`,
  },
  {
    title: "ART. 7 CONDITIONS DE PAIEMENT",
    text: `Les factures émises par la SAS TOUT POUR MA TERRASSE sont payables conformément aux stipulations particulières du bon de commande. À défaut le client règlera le montant du prix suivant les modalités suivantes : 50% à la commande, 45% à la livraison des produits, 5% à la fin des travaux en cas de fourniture et pose. Aucune retenue de garantie ne s'applique au marché. Tout retard dans l'exécution du paiement entraînera, après mise en demeure par courrier recommandé, le règlement de pénalités de retard d'une fois le taux d'intérêt légal, augmenté de 5 points.`,
  },
  {
    title: "ART. 8 RETRACTATION",
    text: `Conformément aux dispositions de l'Article 3, le contrat conclu dans l'établissement de la société est ferme et définitif et la faculté de rétractation ne s'exerce pas. Dans le cas d'un contrat conclu au domicile du client, la durée du droit de rétractation est de 14 jours à partir de la date de la commande.`,
  },
  {
    title: "ART. 9 MODIFICATION OU ANNULATION DE COMMANDE",
    text: `Toute modification ou annulation partielle ou totale de la commande demandée unilatéralement par l'acheteur ne peut être prise en compte que si elle est parvenue par écrit au plus tard trois jours après la signature de la commande et sous réserve de son acceptation par la SAS TOUT POUR MA TERRASSE. Les sommes versées à titre d'acompte resteront alors acquises à la SAS TOUT POUR MA TERRASSE à titre d'indemnité.`,
  },
  {
    title: "ART. 10 MODIFICATION DE LA SITUATION DE L'ACHETEUR",
    text: `Une fois la commande définitive passée ou exécutée, en cas de modification de la situation personnelle de l'acheteur, la SAS TOUT POUR MA TERRASSE se réserve le droit, même après exécution partielle, d'exiger la poursuite des engagements jusqu'au terme de la commande.`,
  },
  {
    title: "ART. 11 GARANTIES - ETENDUES",
    text: `Le client bénéficie des garanties légales, biennales sur les moteurs et 5 ans sur les produits, ainsi que de la garantie de la SAS TOUT POUR MA TERRASSE dont la durée est spécifiée sur le bon de commande, à compter de l'encaissement de la totalité du règlement prévu entre les parties. Les garanties ne s'appliquent pas en cas d'usure ou vieillissement normal, de non-respect des règles d'entretien, d'utilisation incorrecte des produits, ou de l'intervention d'un tiers non agréé.`,
  },
  {
    title: "ART. 12 EXECUTION ET RECEPTION DES TRAVAUX",
    text: `Dans le cas de la fourniture et pose, nous sommes responsables de où celle-ci peut être effectuée. Pour l'exécution des travaux, le client s'engage à laisser le libre accès aux locaux tant à l'intérieur qu'à l'extérieur, à fournir l'eau et l'électricité gratuitement pour l'exécution des travaux. La réception générale et définitive des travaux de pose est faite par écrit par le client ou son représentant avant le départ de l'équipe de pose.`,
  },
  {
    title: "ART. 13 CONFORMITE",
    text: `Compte tenu de la spécificité des produits vendus (sur mesure), les modèles exposés, les notices, catalogues, dépliants, photos, etc. ne constituent pas d'offres fermes mais engagent simplement notre société quant aux caractéristiques générales de ceux-ci. La conformité s'apprécie aux regards des seules caractéristiques figurant dans le contrat signé par les parties.`,
  },
  {
    title: "ART. 14 CAS FORTUIT ET FORCE MAJEURE",
    text: `TOUT POUR MA TERRASSE est libérée de toutes ses obligations tant de livraison que de pose des marchandises si un cas fortuit ou de force majeure survenait, tel qu'incendie, inondation, grève partielle, lock-out immobilisant l'approvisionnement ou la production de la marchandise commandée.`,
  },
  {
    title: "ART. 15 RESERVE DE PROPRIETE AVEC UN PARTICULIER",
    text: `Les marchandises, objet du présent contrat sont vendues avec une clause subordonnant expressément le transfert de leur propriété au paiement intégral du prix en principal et accessoires. Tant le prix n'aura pas été intégralement payé, l'acheteur ne pourra disposer desdites marchandises en vue de leur revente ou de leur incorporation.`,
  },
  {
    title: "ART. 16 DROIT A L'IMAGE",
    text: `L'acheteur autorise TOUT POUR MA TERRASSE à exploiter, à photographier, reproduire, utiliser ou exploiter l'image de son bien immeuble dont il est propriétaire, composant des réalisations effectuées par TOUT POUR MA TERRASSE sous toute forme que ce soit et dans tous supports, notamment dans des documents publicitaires, catalogues, réseaux sociaux dans le monde entier et sans limitation de durée.`,
  },
  {
    title: "ART. 17. CNIL et RGPD",
    text: `Conformément à la loi informatique et liberté du 6 janvier 1978, certaines réponses du client sont obligatoires (par exemple nom, adresse, tel, mail). En cas de non réponse, TOUT POUR MA TERRASSE ne pourra traiter la demande du client. Les réponses du client sont réservées uniquement aux fichiers de notre société. Le client bénéficie d'un droit d'accès à ces informations ainsi que d'un droit de rectification en cas d'erreurs.`,
  },
];

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatFullDate(dateStr: string) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString("fr-FR", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
}

function formatQuantite(q: number, unite?: string) {
  const formattedNum = q.toLocaleString("fr-FR", { minimumFractionDigits: 0, maximumFractionDigits: 2 });
  if (unite && unite !== "unité") {
    return `${formattedNum} ${unite}`;
  }
  return formattedNum;
}

const IBAN = "SAS TOUT POUR MA TERRASSE — IBAN FR76 1695 8000 0129 8680 2762 960";

// ── Sub-components ──────────────────────────────────────────────────────────

// ── Static Translations ──────────────────────────────────────────────────────
const TRANSLATIONS: Record<string, Record<string, string>> = {
  FR: {
    devis: "Devis",
    totalHT: "Total HT",
    tva: "TVA",
    totalTTC: "Total TTC",
    conditionsPaiement: "Conditions de paiement",
    delai: "Délai",
    date: "Date",
    client: "Client",
    validite: "Validité",
  },
  EN: {
    devis: "Quote",
    totalHT: "Subtotal excl. VAT",
    tva: "VAT",
    totalTTC: "Total incl. VAT",
    conditionsPaiement: "Payment terms",
    delai: "Lead time",
    date: "Date",
    client: "Client",
    validite: "Valid until",
  },
  DE: {
    devis: "Angebot",
    totalHT: "Nettobetrag",
    tva: "MwSt.",
    totalTTC: "Gesamtbetrag inkl. MwSt.",
    conditionsPaiement: "Zahlungsbedingungen",
    delai: "Lieferzeit",
    date: "Datum",
    client: "Kunde",
    validite: "Gültig bis",
  },
  IT: {
    devis: "Preventivo",
    totalHT: "Totale netto",
    tva: "IVA",
    totalTTC: "Totale IVA incl.",
    conditionsPaiement: "Condizioni di pagamento",
    delai: "Tempi di consegna",
    date: "Data",
    client: "Cliente",
    validite: "Validità",
  },
  PT: {
    devis: "Orçamento",
    totalHT: "Total líquido",
    tva: "IVA",
    totalTTC: "Total com IVA",
    conditionsPaiement: "Condições de pagamento",
    delai: "Prazo de entrega",
    date: "Data",
    client: "Cliente",
    validite: "Validade",
  },
};

// ── Sub-components ──────────────────────────────────────────────────────────

function PageHeader({
  quote,
  c,
  devisNumero,
  logo,
  commercial,
  translateText,
  t
}: {
  quote: Quote;
  c: any;
  devisNumero: string;
  logo?: string;
  commercial?: Commercial | null;
  translateText: (str: string | undefined) => string;
  t: (key: keyof typeof TRANSLATIONS["FR"]) => string;
}) {
  return (
    <div className="flex justify-between items-start mb-0 gap-4">
      {/* Left: Logo or ORALIS block */}
      <div style={{ minWidth: 240 }}>
        {logo ? (
          <img src={logo} alt="ORALIS" style={{ maxHeight: 85, maxWidth: 300, objectFit: "contain", marginBottom: 6 }} />
        ) : (
          <div style={{ background: "#1a1a1a", color: "#fff", padding: "8px 14px", marginBottom: 6, borderRadius: 4 }}>
            <span style={{ fontFamily: "Cormorant Garamond, serif", fontSize: 22, fontWeight: 700, letterSpacing: 2 }}>ORALIS</span>
          </div>
        )}
        <div style={{ fontSize: 11, color: "#555", lineHeight: 1.6 }}>
          <div>{translateText("Votre contact :")} <strong>{commercial ? `${commercial.prenom} ${commercial.nom}` : "David BOILON"}</strong></div>
          {quote.notes && <div>{translateText("Référence :")} {translateText(quote.notes)}</div>}
          {(quote.delai || quote.delaiRealisation) && <div>{t("delai")} : {translateText(quote.delai || quote.delaiRealisation)}</div>}
          <div style={{ fontWeight: 600, marginTop: 4 }}>{translateText("Offre valable 1 mois hors promotion")}</div>
        </div>
      </div>
      {/* Right: Contact + Devis num + Client */}
      <div style={{ textAlign: "right", fontSize: 11, color: "#555", lineHeight: 1.7 }}>
        <div style={{ border: "1px solid #ddd", borderRadius: 4, padding: "4px 10px", marginBottom: 8, display: "inline-block" }}>
          <strong>{translateText("Contact")}</strong><br />
          Tél. : {commercial?.telephone || c.telephone}<br />
          Email : {commercial?.email || c.email}<br />
          Site : www.{c.siteWeb}
        </div>
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, color: "#111" }}>{t("devis").toUpperCase()} N° {devisNumero}</div>
          <div>{t("date")} : {formatDate(quote.date)}</div>
        </div>
        <div style={{ marginTop: 8, textAlign: "right" }}>
          <strong style={{ fontSize: 13, color: "#111" }}>
            {formatClientName(quote.client)}
          </strong><br />
          {quote.client.societe && <span>{quote.client.societe}<br /></span>}
          {quote.client.rue && <span>{quote.client.rue}<br /></span>}
          {quote.client.codePostal} {quote.client.ville}<br />
          {quote.client.pays && <span style={{ fontWeight: 600 }}>{quote.client.pays.toUpperCase()}</span>}
        </div>
        <div style={{ marginTop: 6, fontSize: 10, color: "#888" }}>
          {t("devis")} n° {devisNumero} {translateText("du")} {formatDate(quote.date)}
        </div>
      </div>
    </div>
  );
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

function ProductTable({ children, translateText }: { children: React.ReactNode; translateText: (str: string | undefined) => string }) {
  return (
    <table style={{ width: "100%", fontSize: 11, borderCollapse: "collapse", marginTop: 12 }}>
      <thead>
        <tr style={{ borderBottom: "2px solid #1a1a1a", borderTop: "2px solid #1a1a1a" }}>
          <th style={{ textAlign: "left", padding: "6px 8px", width: 90, fontWeight: 600, fontSize: 10, textTransform: "uppercase", letterSpacing: 1 }}>{translateText("Visuel")}</th>
          <th style={{ textAlign: "left", padding: "6px 8px", fontWeight: 600, fontSize: 10, textTransform: "uppercase", letterSpacing: 1 }}>{translateText("Désignation")}</th>
          <th style={{ textAlign: "center", padding: "6px 4px", width: 40, fontWeight: 600, fontSize: 10, textTransform: "uppercase" }}>{translateText("Qté")}</th>
          <th style={{ textAlign: "right", padding: "6px 4px", width: 80, fontWeight: 600, fontSize: 10, textTransform: "uppercase" }}>{translateText("Pu HT")}</th>
          <th style={{ textAlign: "right", padding: "6px 4px", width: 80, fontWeight: 600, fontSize: 10, textTransform: "uppercase" }}>{translateText("Total HT")}</th>
          <th style={{ textAlign: "center", padding: "6px 4px", width: 40, fontWeight: 600, fontSize: 10, textTransform: "uppercase" }}>{translateText("TVA")}</th>
        </tr>
      </thead>
      <tbody>{children}</tbody>
    </table>
  );
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

// ── Main component ────────────────────────────────────────────────────────────

export default function QuotePreview() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [quote, setQuote] = useState<Quote | null>(null);
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [logoUrl, setLogoUrl] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [modeles, setModeles] = useState<AnyModele[]>([]);
  const [commercial, setCommercial] = useState<Commercial | null>(null);

  // States for translation
  const [currentLang, setCurrentLang] = useState<"FR" | "EN" | "DE" | "IT" | "PT">("FR");
  const [translating, setTranslating] = useState(false);
  const [translationsCache, setTranslationsCache] = useState<Record<string, { letterBody: string[]; translations: Record<string, string> }>>({});

  const translateText = (str: string | undefined): string => {
    if (!str) return "";
    if (currentLang === "FR") return str;
    const cache = translationsCache[currentLang];
    if (cache && cache.translations[str] !== undefined) {
      return cache.translations[str];
    }
    return str;
  };

  const t = (key: keyof typeof TRANSLATIONS["FR"]) => {
    return TRANSLATIONS[currentLang]?.[key] || TRANSLATIONS["FR"][key];
  };


  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        let found: Quote | undefined;
        const temp = localStorage.getItem("oralis_preview_quote");
        if (temp) {
          try {
            const parsed = JSON.parse(temp);
            if (parsed.id === id) {
              found = parsed;
            }
          } catch (e) {
            console.error("Error parsing preview quote from localStorage", e);
          }
        }
        const [allQuotes, loadedModeles, loadedComms] = await Promise.all([
          found ? Promise.resolve([]) : dbLoadQuotes(),
          dbLoadModeles(),
          dbLoadCommerciaux(),
        ]);
        setModeles(loadedModeles);

        if (!found) {
          found = allQuotes.find((q) => q.id === id);
        }

        if (found) {
          setQuote(found);
          if (found.commercialId) {
            const comm = loadedComms.find(c => c.id === found?.commercialId);
            if (comm) setCommercial(comm);
          }
        } else {
          toast.error("Devis introuvable.");
          navigate("/");
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
        console.error("Erreur de chargement du devis:", err);
        toast.error("Erreur de chargement du devis.");
        navigate("/");
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [id, navigate]);

  if (loading || !quote || !settings) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-full border-4 border-accent border-t-transparent animate-spin"></div>
          <p className="text-xs text-muted-foreground font-body">Chargement de l'aperçu...</p>
        </div>
      </div>
    );
  }

  const totals = calcTotals(quote.lignes);
  const c = settings.company;

  // TVA detail: get unique rates
  const tvaRates = [17, 20, 10, 5.5, 3, 0].filter(r => (totals.tvaMap[r] ?? 0) > 0);
  // Display columns: always show the rates present in the quote
  const tvaColumns = Object.keys(totals.tvaMap)
    .map(Number)
    .filter(r => (totals.tvaMap[r] ?? 0) > 0)
    .sort((a, b) => b - a);

  // Base HT per TVA rate
  const baseHTByRate: Record<number, number> = {};
  
  let lastModelKey = "";
  const linesWithGroupFlags = (quote?.lignes || []).map((line) => {
    const model = line.configuratorState?.modeleId 
      ? modeles.find(m => m.id === line.configuratorState.modeleId) 
      : undefined;
    
    let modelKey = "";
    let descriptionGenerale = "";
    
    if (model) {
      modelKey = `${model.fournisseurId}_${model.nom}`;
      descriptionGenerale = (model as any).descriptionGenerale || "";
    }
    
    const showGroupDescription = descriptionGenerale && (modelKey !== lastModelKey);
    if (modelKey) {
      lastModelKey = modelKey;
    } else {
      lastModelKey = "";
    }
    
    return {
      ...line,
      _showGroupDescription: !!showGroupDescription,
      _descriptionGenerale: descriptionGenerale,
    };
  });

  linesWithGroupFlags.forEach(l => {
    const ht = lineMontantHT(l);
    baseHTByRate[l.tva] = (baseHTByRate[l.tva] ?? 0) + ht;
  });

  // Find selected payment condition or fall back to standard 50/45/5
  const selectedCond = settings?.paymentConditionsList?.find(c => c.id === quote.paymentConditionId);
  const defaultSteps = [
    { id: "step-1", type: "acompte" as const, label: "à la commande", pct: 50 },
    { id: "step-2", type: "acompte" as const, label: "à la livraison", pct: 45 },
    { id: "step-3", type: "solde" as const, label: "à la fin des travaux", pct: 5 }
  ];
  const steps = selectedCond?.steps && selectedCond.steps.length > 0 ? selectedCond.steps : defaultSteps;
  const calculatedPayments = ((quote.montantsPaiement || []).length > 0)
    ? (quote.montantsPaiement || []).map((m) => ({
        label: m.label,
        pct: m.pourcentage,
        amount: m.montant
      }))
    : steps.map((step) => {
        const amount = Math.round(totals.totalTTC * (step.pct / 100) * 100) / 100;
        return { ...step, amount };
      });

  // Numero for display (OR2026xxx format from devis number)
  const devisNumeroDisplay = quote.numero.replace("ORALIS-", "ORA").replace(/-/g, "");

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
      const letterParagraphs = [
        "Madame, Monsieur,",
        "Vous nous avez confié l'analyse de votre projet et nous vous en remercions chaleureusement. Vous trouverez en pièce jointe le devis correspondant. Ce document présente de manière claire et détaillée tous les éléments que nous avons définis ensemble. Les illustrations qu'il contient vous aideront à visualiser les produits que nous vous proposons, et nous sommes convaincus qu'elles vous permettront également de confirmer les excellents choix que vous avez faits.",
        `Pour toute information supplémentaire, qu'elle soit d'ordre technique ou commercial, n'hésitez pas à nous contacter par email à ${c.email} ou à appeler votre conseiller au ${c.telephone}.`,
        "Dans l'attente de notre prochain échange, veuillez recevoir, Madame, Monsieur, mes salutations les plus distinguées."
      ];

      const textsToTranslate = new Set<string>();

      // Add general descriptions and line details
      linesWithGroupFlags.forEach((l) => {
        if (l._descriptionGenerale) {
          textsToTranslate.add(l._descriptionGenerale);
        }
        if (l.designation) {
          textsToTranslate.add(l.designation);
        }
        if (l.description) {
          textsToTranslate.add(l.description);
        }
        l.options.forEach((o) => {
          if (o.designation) {
            textsToTranslate.add(o.designation);
          }
        });
      });

      // Add payment terms steps
      steps.forEach((s) => {
        if (s.label) {
          textsToTranslate.add(s.label);
        }
      });

      // Add payment condition text if present
      if (quote.conditionsPaiement) {
        textsToTranslate.add(quote.conditionsPaiement);
      }

      // Add delay
      const delaiVal = quote.delai || quote.delaiRealisation;
      if (delaiVal) {
        textsToTranslate.add(delaiVal);
      }

      // Add notes (Reference)
      if (quote.notes) {
        textsToTranslate.add(quote.notes);
      }

      // Standard static/UI texts to translate via DeepL to keep PDF coherent
      textsToTranslate.add("Votre contact :");
      textsToTranslate.add("Offre valable 1 mois hors promotion");
      textsToTranslate.add("Votre expert conseil");
      textsToTranslate.add("Bon pour accord");
      textsToTranslate.add("Je déclare avoir pris connaissance et accepté les conditions générales de vente ci-jointes.");
      textsToTranslate.add("Fait à : ");
      textsToTranslate.add("le : ");
      textsToTranslate.add("Signature (précédée de la mention : «lu et approuvé, devis reçu avant l'exécution de la commande») :");
      textsToTranslate.add("Contact");
      textsToTranslate.add("Détail TVA");
      textsToTranslate.add("Base HT");
      textsToTranslate.add("Montant TVA");
      textsToTranslate.add("Règlement :");
      textsToTranslate.add("Acompte");
      textsToTranslate.add("Solde");
      textsToTranslate.add("Visuel");
      textsToTranslate.add("Désignation");
      textsToTranslate.add("Qté");
      textsToTranslate.add("Pu HT");
      textsToTranslate.add("Total TVA");
      textsToTranslate.add("Nos prix sont établis sur la base des taux de TVA en vigueur à la date de la remise de l'offre. Toute variation ultérieure de ces taux, imposés par la loi, sera répercutée sur ces prix.");
      textsToTranslate.add("du");
      textsToTranslate.add("CRÉATEUR D'ESPACES EXTÉRIEURS");
      textsToTranslate.add("sur");
      textsToTranslate.add("Référence :");
      textsToTranslate.add("Descriptif général :");
      textsToTranslate.add("Créateur d'espaces extérieurs");

      const dynamicTextsArray = Array.from(textsToTranslate);
      const textsList = [...letterParagraphs, ...dynamicTextsArray];

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

      // Fallback for local development if serverless function is not hosted (e.g. running via vite directly)
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

      const letterBody = translatedTexts.slice(0, letterParagraphs.length);
      const translations: Record<string, string> = {};
      dynamicTextsArray.forEach((original, idx) => {
        translations[original] = translatedTexts[letterParagraphs.length + idx];
      });

      setTranslationsCache((prev) => ({
        ...prev,
        [lang]: { letterBody, translations },
      }));
      setCurrentLang(lang);
      toast.success(`Devis traduit en ${lang} !`);
    } catch (err: any) {
      console.error(err);
      toast.error(`Erreur lors de la traduction : ${err.message || "Erreur inconnue"}`);
      setCurrentLang("FR");
    } finally {
      setTranslating(false);
    }
  };

  const getLetterParagraphs = () => {
    const defaultParagraphs = [
      "Madame, Monsieur,",
      "Vous nous avez confié l'analyse de votre projet et nous vous en remercions chaleureusement. Vous trouverez en pièce jointe le devis correspondant. Ce document présente de manière claire et détaillée tous les éléments que nous avons définis ensemble. Les illustrations qu'il contient vous aideront à visualiser les produits que nous vous proposons, et nous sommes convaincus qu'elles vous permettront également de confirmer les excellents choix que vous avez faits.",
      `Pour toute information supplémentaire, qu'elle soit d'ordre technique ou commercial, n'hésitez pas à nous contacter par email à ${commercial?.email || c.email} ou à appeler votre conseiller au ${commercial?.telephone || c.telephone}.`,
      "Dans l'attente de notre prochain échange, veuillez recevoir, Madame, Monsieur, mes salutations les plus distinguées."
    ];
    if (currentLang === "FR") {
      return defaultParagraphs;
    }
    const cache = translationsCache[currentLang];
    if (cache && cache.letterBody && cache.letterBody.length === 4) {
      return cache.letterBody;
    }
    return defaultParagraphs;
  };

  // Estimations précises des dimensions de la page A4 (hauteur 297mm ≈ 1122px, top padding 10mm ≈ 38px)
  // et du positionnement du bas de page avec la marge de sécurité pour éviter le chevauchement du footer.
  function estimerHauteurHeader(): number {
    let leftHeight = settings?.logo ? 85 : 45;
    leftHeight += 6; // margin-bottom
    
    let leftLines = 1; // Votre contact
    if (quote.notes) leftLines += 1;
    if (quote.delai || quote.delaiRealisation) leftLines += 1;
    leftLines += 1; // Offre valable 1 mois...
    leftHeight += leftLines * 18; // fontSize 11, lineHeight 1.6 => 18px par ligne
    
    let rightHeight = 75; // Bloc contact + margin
    rightHeight += 38; // Devis N° + Date
    
    let clientLines = 1; // Nom du client
    if (quote.client?.societe) clientLines += 1;
    if (quote.client?.rue) clientLines += 1;
    clientLines += 1; // CP + Ville
    if (quote.client?.pays) clientLines += 1;
    rightHeight += 8 + clientLines * 19; // marginTop: 8, fontSize 13, lineHeight 1.7 => 19px par ligne
    rightHeight += 17; // Devis n° X du Y
    
    return Math.max(leftHeight, rightHeight);
  }

  // Fonction d'estimation de la hauteur d'une ligne de produit pour la pagination
  function estimerHauteurLigne(line: any): number {
    // 1. Ligne de description de groupe (Row A)
    let rowAHeight = 0;
    if (line._showGroupDescription && line._descriptionGenerale) {
      const desc = line._descriptionGenerale || "";
      // Remplissage horizontal sur la largeur du tableau (~115 caractères par ligne)
      const lines = desc.split("\n").reduce((acc: number, part: string) => {
        return acc + Math.max(1, Math.ceil(part.length / 115));
      }, 0);
      rowAHeight = 20 + 20 + lines * 17; // padding + titre + lignes de texte (lineHeight 1.5 * 11px)
    }

    // 2. Ligne produit principale (Row B)
    const paddingRowB = 24; // padding vertical 12px haut + 12px bas
    const minImageHeight = line.image ? 60 : 0;
    
    // Hauteur de la désignation (fontSize 12px, lineHeight standard ~18px)
    const des = line.designation || "";
    const designationLines = Math.max(1, Math.ceil(des.length / 55));
    const designationHeight = designationLines * 18 + 4; // lignes + margin-bottom

    // Hauteur de la description (fontSize 10px, lineHeight 1.5 => 15px)
    let descriptionHeight = 0;
    if (line.description) {
      const lines = line.description.split("\n").reduce((acc: number, part: string) => {
        return acc + Math.max(1, Math.ceil(part.length / 65));
      }, 0);
      descriptionHeight = lines * 15 + 6; // lignes + margin-bottom
    }

    // Hauteur des options (fontSize 10px, lineHeight 1.6 => 16px)
    let optionsHeight = 0;
    if (line.options && line.options.length > 0) {
      const lines = line.options.reduce((acc: number, opt: any) => {
        const optStr = `${opt.designation || ""} — ${formatEUR(opt.prixHT)}`;
        return acc + Math.max(1, Math.ceil(optStr.length / 65));
      }, 0);
      optionsHeight = lines * 16 + 4; // lignes + margin-top
    }

    const textColumnHeight = designationHeight + descriptionHeight + optionsHeight;
    const rowBHeight = paddingRowB + Math.max(minImageHeight, textColumnHeight);

    return rowAHeight + rowBHeight;
  }

  // Calcul du MAX_PAGE_HEIGHT disponible pour les lignes de produit :
  // Page A4 = 1122.5px. Footer absolute top = ~108px du bas. 
  // Marge de sécurité de 18mm (≈ 68px) avant le footer pour éviter tout débordement.
  const footerTopFromPageBottom = 108;
  const safetyMargin = 68; // 18mm en pixels
  const maxTableBottom = 1122.5 - footerTopFromPageBottom - safetyMargin; // 946.5px
  
  const headerHeight = estimerHauteurHeader();
  const tableHeaderHeight = 44; // marginTop 12px + thead height ~32px
  const MAX_PAGE_HEIGHT = maxTableBottom - 38 - headerHeight - tableHeaderHeight; // ~38px de top padding

  const pagesProduits: any[][] = [];
  let currentPage: any[] = [];
  let currentHeight = 0;

  linesWithGroupFlags.forEach((line) => {
    const lineHt = estimerHauteurLigne(line);
    if (currentPage.length > 0 && currentHeight + lineHt > MAX_PAGE_HEIGHT) {
      pagesProduits.push(currentPage);
      currentPage = [line];
      currentHeight = lineHt;
    } else {
      currentPage.push(line);
      currentHeight += lineHt;
    }
  });
  if (currentPage.length > 0) {
    pagesProduits.push(currentPage);
  }
  if (pagesProduits.length === 0) {
    pagesProduits.push([]);
  }

  const totalPages = 3 + pagesProduits.length;

  return (
    <div className="min-h-screen bg-[#f5f5f5] print-wrapper">

      {/* ── Top bar (no-print) ── */}
      <div className="no-print flex items-center gap-3 p-4 border-b border-border bg-card shadow-sm sticky top-0 z-10">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft size={16} /> Retour
        </button>
        <div className="flex-1" />
        <span className="text-sm font-medium text-muted-foreground">{quote.numero} — {formatClientName(quote.client)}</span>
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
          <Printer size={14} /> Imprimer / PDF
        </button>
      </div>

      {/* ══════════════════════════════════════════════════════
          PAGE 1 — LETTRE DE PRÉSENTATION
      ══════════════════════════════════════════════════════ */}
      <div className="print-page bg-white mx-auto my-8 shadow-lg" style={{ maxWidth: "210mm", padding: "12mm 10mm 25mm 10mm" }}>

        {/* Header page 1 */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 }}>
          {/* Left: Logo + Company */}
          <div>
            {settings.logo ? (
              <img src={logoUrl || settings.logo} alt="ORALIS" style={{ maxHeight: 180, maxWidth: 280, objectFit: "contain", marginBottom: 10 }} />
            ) : (
              <>
                <div style={{ fontFamily: "Cormorant Garamond, serif", fontSize: 42, fontWeight: 900, letterSpacing: 3, lineHeight: 1, color: "#111" }}>
                  ORALIS
                </div>
                <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: 2, color: "#555", textTransform: "uppercase", marginBottom: 12 }}>
                  {translateText("CRÉATEUR D'ESPACES EXTÉRIEURS")}
                </div>
              </>
            )}
            <div style={{ fontSize: 11, color: "#444", lineHeight: 1.7 }}>
              <div><strong>{c.nom}</strong></div>
              <div>{c.rue}</div>
              <div>{c.codePostal} {c.ville.toUpperCase()}</div>
              <div>E-mail : {c.email}</div>
              <div>Siret : {c.siret}</div>
              <div>Code APE : 4791B</div>
              <div>Numéro de TVA : {c.tvaIntra}</div>
            </div>
          </div>
          {/* Right: website pill + client info */}
          <div style={{ textAlign: "right" }}>
            <div style={{
              border: "2px solid #ddd", borderRadius: 20, padding: "4px 14px",
              display: "inline-flex", alignItems: "center", gap: 8,
              fontSize: 11, fontWeight: 600, color: "#555", marginBottom: 16
            }}>
              www.{c.siteWeb} 🔍
            </div>
            <div style={{ fontSize: 12, lineHeight: 1.8, textAlign: "right" }}>
              <div style={{ fontWeight: 700, fontSize: 14, color: "#111" }}>
                {formatClientName(quote.client)}
              </div>
              {quote.client.societe && <div style={{ fontWeight: 600 }}>{quote.client.societe}</div>}
              <div style={{ fontWeight: 700 }}>{quote.client.rue}</div>
              {quote.client.codePostal && (
                <div style={{ fontWeight: 700 }}>
                  {quote.client.pays?.startsWith("L") ? "L-" : ""}{quote.client.codePostal} {quote.client.ville?.toUpperCase()}
                </div>
              )}
              {quote.client.telephone && (
                <div><strong>Mobile : </strong>{quote.client.telephone}</div>
              )}
              {quote.client.email && (
                <div><strong>E-Mail : </strong><span style={{ textDecoration: "underline" }}>{quote.client.email}</span></div>
              )}
              <div style={{ marginTop: 8 }}>
                St MAX, {translateText("le")} {formatFullDate(quote.date)}
              </div>
            </div>
          </div>
        </div>

        {/* Image produit / ambiance */}
        <div style={{
          width: "100%", height: 260,
          borderRadius: 4, marginBottom: 24,
          overflow: "hidden"
        }}>
          <img
            src="/devis-cover.jpg"
            alt="Ambiance"
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover"
            }}
          />
        </div>

        {/* Letter body */}
        <div style={{ fontSize: 12, lineHeight: 1.9, color: "#222", marginBottom: 24 }}>
          {getLetterParagraphs().map((p, idx) => (
            <p key={idx} style={{ marginBottom: idx === 0 ? 16 : idx === 3 ? 0 : 12, textAlign: idx === 0 || idx === 3 ? "left" : "justify" }}>
              {p}
            </p>
          ))}
        </div>

        {/* Signature */}
        <div style={{ textAlign: "right", fontSize: 12, color: "#333", marginBottom: 16 }}>
          <div style={{ fontWeight: 600 }}>{commercial ? `${commercial.prenom} ${commercial.nom}` : "David BOILON"}</div>
          <div style={{ color: "#777" }}>{translateText("Votre expert conseil")}</div>
        </div>

        {/* Page number */}
        <div style={{ position: "absolute", bottom: "4mm", left: 0, right: 0, textAlign: "center", fontSize: 10, color: "#aaa" }}>
          1 {translateText("sur")} {totalPages}
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════
          PAGES PRODUITS (une ligne = un bloc auto-paginated)
      ══════════════════════════════════════════════════════ */}
      {pagesProduits.map((lignesPage, pIdx) => (
        <div key={pIdx} className="print-page bg-white mx-auto my-8 shadow-lg" style={{ maxWidth: "210mm", padding: "10mm 10mm 25mm 10mm" }}>

          <PageHeader quote={quote} c={c} devisNumero={devisNumeroDisplay} logo={logoUrl || settings.logo} commercial={commercial} translateText={translateText} t={t} />

          <ProductTable translateText={translateText}>
            {lignesPage.map((line) => (
              <React.Fragment key={line.id}>
                {line._showGroupDescription && line._descriptionGenerale && (
                  <tr style={{ pageBreakInside: "avoid", breakInside: "avoid" }}>
                    <td colSpan={6} style={{ padding: "10px 8px", borderBottom: "1px solid #eee", fontSize: 11, color: "#333", backgroundColor: "#f9f9f9" }}>
                      <div className="font-semibold text-accent mb-1">{translateText("Descriptif général :")}</div>
                      <div style={{ whiteSpace: "pre-line", lineHeight: 1.5 }}>{translateText(line._descriptionGenerale)}</div>
                    </td>
                  </tr>
                )}
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
                    <div style={{ fontWeight: 700, fontSize: 12, marginBottom: 4 }}>{translateText(line.designation) || "—"}</div>
                    {line.description && (
                      <div style={{ fontSize: 10, color: "#666", marginBottom: 6, lineHeight: 1.5, whiteSpace: "pre-line" }}>
                        {translateText(line.description)}
                      </div>
                    )}
                    {line.options && line.options.length > 0 && (
                      <ul style={{ margin: "4px 0 0 0", padding: "0 0 0 16px", fontSize: 10, color: "#444", lineHeight: 1.6 }}>
                        {line.options.map(opt => (
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
          </ProductTable>

          <PageFooter c={c} translateText={translateText} />
          <div style={{ position: "absolute", bottom: "4mm", left: 0, right: 0, textAlign: "center", fontSize: 10, color: "#aaa" }}>
            {2 + pIdx} {translateText("sur")} {totalPages}
          </div>
        </div>
      ))}

      {/* ══════════════════════════════════════════════════════
          PAGE RÉCAPITULATIF — TOTAUX + CONDITIONS + SIGNATURE
      ══════════════════════════════════════════════════════ */}
      <div className="print-page bg-white mx-auto my-8 shadow-lg" style={{ maxWidth: "210mm", padding: "10mm 10mm 25mm 10mm" }}>

        <PageHeader quote={quote} c={c} devisNumero={devisNumeroDisplay} logo={logoUrl || settings.logo} commercial={commercial} translateText={translateText} t={t} />

        {/* ── TVA detail table ── */}
        <div style={{ marginTop: 24, display: "flex", gap: 24, alignItems: "flex-start" }}>
          {/* Left: TVA grid */}
          <div style={{ flex: 1 }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11, border: "1px solid #ddd" }}>
              <thead>
                <tr style={{ background: "#f5f5f5" }}>
                  <td style={{ padding: "6px 10px", fontWeight: 700, borderRight: "1px solid #ddd", borderBottom: "1px solid #ddd" }}>
                    {translateText("Détail TVA")}
                  </td>
                  {tvaColumns.map(r => (
                    <td key={r} style={{ padding: "6px 10px", textAlign: "center", fontWeight: 700, borderRight: "1px solid #ddd", borderBottom: "1px solid #ddd" }}>
                      {r} %
                    </td>
                  ))}
                </tr>
                <tr>
                  <td style={{ padding: "6px 10px", borderRight: "1px solid #ddd", borderBottom: "1px solid #ddd" }}>{translateText("Base HT")}</td>
                  {tvaColumns.map(r => (
                    <td key={r} style={{ padding: "6px 10px", textAlign: "right", fontFamily: "DM Mono, monospace", borderRight: "1px solid #ddd", borderBottom: "1px solid #ddd" }}>
                      {formatEUR(baseHTByRate[r] ?? 0)}
                    </td>
                  ))}
                </tr>
                <tr>
                  <td style={{ padding: "6px 10px", borderRight: "1px solid #ddd" }}>{translateText("Montant TVA")}</td>
                  {tvaColumns.map(r => (
                    <td key={r} style={{ padding: "6px 10px", textAlign: "right", fontFamily: "DM Mono, monospace", borderRight: "1px solid #ddd" }}>
                      {formatEUR(totals.tvaMap[r] ?? 0)}
                    </td>
                  ))}
                </tr>
              </thead>
            </table>

            {/* Payment conditions */}
            <div style={{ marginTop: 12, border: "1px solid #ddd", padding: "10px 12px", fontSize: 11, lineHeight: 1.8 }}>
              <div style={{ fontWeight: 700, marginBottom: 4 }}>
                {translateText("Règlement :")} {translateText(quote.conditionsPaiement) || steps.map(s => `${s.pct}% ${translateText(s.label)}`).join(", ")}
              </div>
              {calculatedPayments.map((p, idx) => {
                const isSolde = idx === calculatedPayments.length - 1;
                const label = isSolde 
                  ? `${translateText("Solde")} (${p.pct}%) ${p.label ? translateText(p.label) : ""}` 
                  : `${translateText("Acompte")} (${p.pct}%) ${p.label ? translateText(p.label) : ""}`;
                return (
                  <div key={idx}>
                    {idx === 0 ? (
                      <strong>{label} : {formatEUR(p.amount)}</strong>
                    ) : (
                      <span>{label} : {formatEUR(p.amount)}</span>
                    )}
                  </div>
                );
              })}
              <div style={{ marginTop: 6, fontSize: 10, color: "#555", display: "flex", alignItems: "center", gap: 6 }}>
                💳 {IBAN}
              </div>
            </div>

            {/* Disclaimer */}
            <div style={{ marginTop: 10, fontSize: 10, color: "#555", lineHeight: 1.5 }}>
              {translateText("Nos prix sont établis sur la base des taux de TVA en vigueur à la date de la remise de l'offre. Toute variation ultérieure de ces taux, imposés par la loi, sera répercutée sur ces prix.")}
            </div>
          </div>

          {/* Right: Totals */}
          <div style={{ width: 200, flexShrink: 0 }}>
            <div style={{ border: "1px solid #ddd", overflow: "hidden", borderRadius: 4 }}>
              <div style={{ display: "flex", justifyContent: "space-between", padding: "7px 12px", borderBottom: "1px solid #eee", fontSize: 11 }}>
                <span>{t("totalHT")} :</span>
                <strong style={{ fontFamily: "DM Mono, monospace" }}>{formatEUR(totals.sousTotal)}</strong>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", padding: "7px 12px", borderBottom: "1px solid #eee", fontSize: 11 }}>
                <span>Total {t("tva")} :</span>
                <strong style={{ fontFamily: "DM Mono, monospace" }}>{formatEUR(totals.totalTVA)}</strong>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 12px", background: "#1a1a1a", color: "#fff", fontSize: 14, fontWeight: 700 }}>
                <span>{t("totalTTC")} :</span>
                <span style={{ fontFamily: "DM Mono, monospace" }}>{formatEUR(totals.totalTTC)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* ── Signature block ── */}
        <div style={{ marginTop: 20, border: "1px solid #ddd", padding: "12px 16px", fontSize: 11 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
            <div style={{ width: 12, height: 12, border: "1px solid #333", flexShrink: 0 }} />
            <span>{translateText("Je déclare avoir pris connaissance et accepté les conditions générales de vente ci-jointes.")}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 16, marginTop: 8 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, marginBottom: 20 }}>{translateText("Bon pour accord")}</div>
              <div style={{ display: "flex", gap: 24 }}>
                <div>
                  <span>{translateText("Fait à : ")}</span>
                  <span style={{ borderBottom: "1px solid #333", display: "inline-block", width: 100 }} />
                </div>
                <div>
                  <span>{translateText("le : ")}</span>
                  <span style={{ borderBottom: "1px solid #333", display: "inline-block", width: 80 }} />
                </div>
              </div>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 10, color: "#555", marginBottom: 20 }}>
                {translateText("Signature (précédée de la mention : «lu et approuvé, devis reçu avant l'exécution de la commande») :")}
              </div>
              <div style={{ borderBottom: "1px solid #333", height: 40 }} />
            </div>
          </div>
        </div>

        <PageFooter c={c} translateText={translateText} />
        <div style={{ position: "absolute", bottom: "4mm", left: 0, right: 0, textAlign: "center", fontSize: 10, color: "#aaa" }}>
          {2 + pagesProduits.length} {translateText("sur")} {totalPages}
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════
          PAGE CGV — CONDITIONS GÉNÉRALES DE VENTE
      ══════════════════════════════════════════════════════ */}
      <div className="print-page bg-white mx-auto my-8 shadow-lg" style={{ maxWidth: "210mm", padding: "4mm 10mm 15mm 10mm" }}>

        {/* CGV Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
          <div style={{ fontFamily: "Cormorant Garamond, serif", fontSize: 20, fontWeight: 900, letterSpacing: 3 }}>ORALIS</div>
          <div style={{ fontSize: 10, color: "#555", textAlign: "right" }}>
            <div style={{ fontWeight: 600 }}>{translateText("CRÉATEUR D'ESPACES EXTÉRIEURS")}</div>
            <div>{c.rue} — {c.codePostal} {c.ville.toUpperCase()}</div>
          </div>
        </div>
        <div style={{ borderTop: "1.5px solid #1a1a1a", marginBottom: 8 }} />

        {/* CGV content in 2 columns */}
        <div style={{ columnCount: 2, columnGap: 24, fontSize: "7.5pt", lineHeight: "1.25", color: "#333" }}>
          {CGV_ARTICLES.map((art, i) => (
            <div key={i} style={{ breakInside: "avoid", marginBottom: 5 }}>
              <div style={{ fontWeight: 700, fontSize: "7.8pt", marginBottom: 1, textTransform: "uppercase" }}>
                {art.title}
              </div>
              <div>{art.text}</div>
            </div>
          ))}
        </div>

        {/* CGV Footer */}
        <div style={{ marginTop: 8, borderTop: "1px solid #ddd", paddingTop: 6 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ fontSize: "7.5pt", color: "#555", lineHeight: 1.3 }}>
              <div style={{ fontWeight: 700 }}>La SAS TOUT POUR MA TERRASSE est une SASU immatriculée en FRANCE</div>
              <div>TOUT POUR MA TERRASSE — {c.rue} {c.codePostal} St MAX — FRANCE</div>
              <div>ORALIS "Marque premium de SAS Tout pour ma terrasse"</div>
              <div>SIRET : {c.siret} — Code APE : 4791B — NUMÉRO DE TVA : {c.tvaIntra}</div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8, minWidth: 140 }}>
              <div style={{ fontSize: "8pt", color: "#555" }}>
                DATE: <span style={{ borderBottom: "1px solid #333", display: "inline-block", width: 80 }} />
              </div>
              <div style={{ fontSize: "8pt", color: "#555" }}>
                SIGNATURE: <span style={{ borderBottom: "1px solid #333", display: "inline-block", width: 60 }} />
              </div>
            </div>
          </div>
          <div style={{ textAlign: "center", marginTop: 6 }}>
            <div style={{ fontFamily: "Cormorant Garamond, serif", fontSize: 20, fontWeight: 900, letterSpacing: 4, color: "#1a1a1a", lineHeight: 1 }}>
              ORALIS
            </div>
            <div style={{ fontSize: "7pt", letterSpacing: 2, color: "#555", textTransform: "uppercase", marginTop: 1 }}>
              {translateText("Créateur d'espaces extérieurs")}
            </div>
          </div>
        </div>
        <div style={{ position: "absolute", bottom: "4mm", left: 0, right: 0, textAlign: "center", fontSize: 10, color: "#aaa" }}>
          {3 + pagesProduits.length} {translateText("sur")} {totalPages}
        </div>
      </div>

    </div>
  );
}
