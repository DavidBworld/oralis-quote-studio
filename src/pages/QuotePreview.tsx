import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Printer } from "lucide-react";
import {
  loadQuotes,
  formatEUR,
  formatDate,
  calcTotals,
  lineMontantHT,
  type Quote,
} from "@/lib/quote-data";
import { loadSettings, type AppSettings } from "@/lib/settings-data";

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

const IBAN = "SAS TOUT POUR MA TERRASSE — IBAN FR76 1695 8000 0129 8680 2762 960";

// ── Sub-components ──────────────────────────────────────────────────────────

function PageHeader({ quote, c, devisNumero, logo }: { quote: Quote; c: any; devisNumero: string; logo?: string }) {
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
          <div>Votre contact : <strong>David BOILON</strong></div>
          {quote.notes && <div>Référence : {quote.notes}</div>}
          {quote.delaiRealisation && <div>Délai : {quote.delaiRealisation}</div>}
          <div style={{ fontWeight: 600, marginTop: 4 }}>Offre valable 1 mois hors promotion</div>
        </div>
      </div>
      {/* Right: Contact + Devis num + Client */}
      <div style={{ textAlign: "right", fontSize: 11, color: "#555", lineHeight: 1.7 }}>
        <div style={{ border: "1px solid #ddd", borderRadius: 4, padding: "4px 10px", marginBottom: 8, display: "inline-block" }}>
          <strong>Contact</strong><br />
          Tél. : {c.telephone}<br />
          Email : {c.email}<br />
          Site : www.{c.siteWeb}
        </div>
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, color: "#111" }}>DEVIS N° {devisNumero}</div>
          <div>Date : {formatDate(quote.date)}</div>
        </div>
        <div style={{ marginTop: 8, textAlign: "right" }}>
          <strong style={{ fontSize: 13, color: "#111" }}>
            {quote.client.civilite} {quote.client.prenom} {quote.client.nom}
          </strong><br />
          {quote.client.societe && <span>{quote.client.societe}<br /></span>}
          {quote.client.rue && <span>{quote.client.rue}<br /></span>}
          {quote.client.codePostal} {quote.client.ville}<br />
          {quote.client.pays && <span style={{ fontWeight: 600 }}>{quote.client.pays.toUpperCase()}</span>}
        </div>
        <div style={{ marginTop: 6, fontSize: 10, color: "#888" }}>
          Devis n° {devisNumero} du {formatDate(quote.date)}
        </div>
      </div>
    </div>
  );
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

function ProductTable({ children }: { children: React.ReactNode }) {
  return (
    <table style={{ width: "100%", fontSize: 11, borderCollapse: "collapse", marginTop: 12 }}>
      <thead>
        <tr style={{ borderBottom: "2px solid #1a1a1a", borderTop: "2px solid #1a1a1a" }}>
          <th style={{ textAlign: "left", padding: "6px 8px", width: 90, fontWeight: 600, fontSize: 10, textTransform: "uppercase", letterSpacing: 1 }}>Visuel</th>
          <th style={{ textAlign: "left", padding: "6px 8px", fontWeight: 600, fontSize: 10, textTransform: "uppercase", letterSpacing: 1 }}>Désignation</th>
          <th style={{ textAlign: "center", padding: "6px 4px", width: 40, fontWeight: 600, fontSize: 10, textTransform: "uppercase" }}>Qté</th>
          <th style={{ textAlign: "right", padding: "6px 4px", width: 80, fontWeight: 600, fontSize: 10, textTransform: "uppercase" }}>Pu HT</th>
          <th style={{ textAlign: "right", padding: "6px 4px", width: 80, fontWeight: 600, fontSize: 10, textTransform: "uppercase" }}>Total HT</th>
          <th style={{ textAlign: "center", padding: "6px 4px", width: 40, fontWeight: 600, fontSize: 10, textTransform: "uppercase" }}>TVA</th>
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

  useEffect(() => {
    const all = loadQuotes();
    const found = all.find((q) => q.id === id);
    if (found) setQuote(found);
    else navigate("/");

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

  if (!quote || !settings) return null;

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
  quote.lignes.forEach(l => {
    const ht = lineMontantHT(l);
    baseHTByRate[l.tva] = (baseHTByRate[l.tva] ?? 0) + ht;
  });

  // Payment amounts
  const acompte1 = Math.round(totals.totalTTC * 0.50 * 100) / 100;
  const acompte2 = Math.round(totals.totalTTC * 0.45 * 100) / 100;
  const solde = Math.round(totals.totalTTC * 0.05 * 100) / 100;

  // Numero for display (OR2026xxx format from devis number)
  const devisNumeroDisplay = quote.numero.replace("ORALIS-", "ORA").replace(/-/g, "");

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
        <span className="text-sm font-medium text-muted-foreground">{quote.numero} — {quote.client.prenom} {quote.client.nom}</span>
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
                  Créateur d'espaces extérieurs
                </div>
              </>
            )}
            <div style={{ fontSize: 11, color: "#444", lineHeight: 1.7 }}>
              <div><strong>ORALIS</strong></div>
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
                {quote.client.civilite} {quote.client.prenom} {quote.client.nom}
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
                St MAX, le {formatFullDate(quote.date)}
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
          <p style={{ marginBottom: 16 }}>Madame, Monsieur,</p>
          <p style={{ marginBottom: 12, textAlign: "justify" }}>
            Vous nous avez confié l'analyse de votre projet et nous vous en remercions chaleureusement. Vous
            trouverez en pièce jointe le devis correspondant. Ce document présente de manière claire et détaillée
            tous les éléments que nous avons définis ensemble. Les illustrations qu'il contient vous aideront à
            visualiser les produits que nous vous proposons, et nous sommes convaincus qu'elles vous permettront
            également de confirmer les excellents choix que vous avez faits.
          </p>
          <p style={{ marginBottom: 12, textAlign: "justify" }}>
            Pour toute information supplémentaire, qu'elle soit d'ordre technique ou commercial, n'hésitez pas à
            nous contacter par email à {c.email} ou à appeler votre conseiller au {c.telephone}.
          </p>
          <p style={{ textAlign: "justify" }}>
            Dans l'attente de notre prochain échange, veuillez recevoir, Madame, Monsieur, mes salutations les plus
            distinguées.
          </p>
        </div>

        {/* Signature */}
        <div style={{ textAlign: "right", fontSize: 12, color: "#333", marginBottom: 16 }}>
          <div style={{ fontWeight: 600 }}>David BOILON</div>
          <div style={{ color: "#777" }}>Votre conseiller commercial</div>
        </div>

        {/* Page number */}
        <div style={{ textAlign: "center", fontSize: 10, color: "#aaa", marginTop: 8 }}>
          1 sur {quote.lignes.length + 3}
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════
          PAGES PRODUITS (une ligne = un bloc auto-paginated)
      ══════════════════════════════════════════════════════ */}
      <div className="print-page bg-white mx-auto my-8 shadow-lg" style={{ maxWidth: "210mm", padding: "10mm 10mm 25mm 10mm" }}>

        <PageHeader quote={quote} c={c} devisNumero={devisNumeroDisplay} logo={logoUrl || settings.logo} />

        <ProductTable>
          {quote.lignes.map((line, i) => (
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
                      {line.options.map(opt => (
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
        </ProductTable>

        <PageFooter c={c} />
      </div>

      {/* ══════════════════════════════════════════════════════
          PAGE RÉCAPITULATIF — TOTAUX + CONDITIONS + SIGNATURE
      ══════════════════════════════════════════════════════ */}
      <div className="print-page bg-white mx-auto my-8 shadow-lg" style={{ maxWidth: "210mm", padding: "10mm 10mm 25mm 10mm" }}>

        <PageHeader quote={quote} c={c} devisNumero={devisNumeroDisplay} logo={logoUrl || settings.logo} />

        {/* ── TVA detail table ── */}
        <div style={{ marginTop: 24, display: "flex", gap: 24, alignItems: "flex-start" }}>
          {/* Left: TVA grid */}
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
                      {formatEUR(baseHTByRate[r] ?? 0)}
                    </td>
                  ))}
                </tr>
                <tr>
                  <td style={{ padding: "6px 10px", borderRight: "1px solid #ddd" }}>Montant TVA</td>
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
                Règlement : Acompte 1 de 50% à la commande — Acompte 2 de 45% à la livraison — Solde à la fin des travaux
              </div>
              <div><strong>Acompte 1 demandé : {formatEUR(acompte1)}</strong></div>
              <div>2ème acompte : {formatEUR(acompte2)}</div>
              <div>Solde prévu : {formatEUR(solde)}</div>
              <div style={{ marginTop: 6, fontSize: 10, color: "#555", display: "flex", alignItems: "center", gap: 6 }}>
                💳 {IBAN}
              </div>
            </div>

            {/* Disclaimer */}
            <div style={{ marginTop: 10, fontSize: 10, color: "#555", lineHeight: 1.5 }}>
              Nos prix sont établis sur la base des taux de TVA en vigueur à la date de la remise de l'offre.
              Toute variation ultérieure de ces taux, imposés par la loi, sera répercutée sur ces prix.
            </div>
          </div>

          {/* Right: Totals */}
          <div style={{ width: 200, flexShrink: 0 }}>
            <div style={{ border: "1px solid #ddd", overflow: "hidden", borderRadius: 4 }}>
              <div style={{ display: "flex", justifyContent: "space-between", padding: "7px 12px", borderBottom: "1px solid #eee", fontSize: 11 }}>
                <span>Total HT :</span>
                <strong style={{ fontFamily: "DM Mono, monospace" }}>{formatEUR(totals.sousTotal)}</strong>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", padding: "7px 12px", borderBottom: "1px solid #eee", fontSize: 11 }}>
                <span>Total TVA :</span>
                <strong style={{ fontFamily: "DM Mono, monospace" }}>{formatEUR(totals.totalTVA)}</strong>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 12px", background: "#1a1a1a", color: "#fff", fontSize: 14, fontWeight: 700 }}>
                <span>Total TTC :</span>
                <span style={{ fontFamily: "DM Mono, monospace" }}>{formatEUR(totals.totalTTC)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* ── Signature block ── */}
        <div style={{ marginTop: 20, border: "1px solid #ddd", padding: "12px 16px", fontSize: 11 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
            <div style={{ width: 12, height: 12, border: "1px solid #333", flexShrink: 0 }} />
            <span>Je déclare avoir pris connaissance et accepté les conditions générales de vente ci-jointes.</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 16, marginTop: 8 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, marginBottom: 20 }}>Bon pour accord</div>
              <div style={{ display: "flex", gap: 24 }}>
                <div>
                  <span>Fait à : </span>
                  <span style={{ borderBottom: "1px solid #333", display: "inline-block", width: 100 }} />
                </div>
                <div>
                  <span>le : </span>
                  <span style={{ borderBottom: "1px solid #333", display: "inline-block", width: 80 }} />
                </div>
              </div>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 10, color: "#555", marginBottom: 20 }}>
                Signature (précédée de la mention : «lu et approuvé, devis reçu avant l'exécution de la commande») :
              </div>
              <div style={{ borderBottom: "1px solid #333", height: 40 }} />
            </div>
          </div>
        </div>

        <PageFooter c={c} />
      </div>

      {/* ══════════════════════════════════════════════════════
          PAGE CGV — CONDITIONS GÉNÉRALES DE VENTE
      ══════════════════════════════════════════════════════ */}
      <div className="print-page bg-white mx-auto my-8 shadow-lg" style={{ maxWidth: "210mm", padding: "8mm 10mm 25mm 10mm" }}>

        {/* CGV Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <div style={{ fontFamily: "Cormorant Garamond, serif", fontSize: 24, fontWeight: 900, letterSpacing: 3 }}>ORALIS</div>
          <div style={{ fontSize: 11, color: "#555", textAlign: "right" }}>
            <div style={{ fontWeight: 600 }}>CRÉATEUR D'ESPACES EXTÉRIEURS</div>
            <div>{c.rue} — {c.codePostal} {c.ville.toUpperCase()}</div>
          </div>
        </div>
        <div style={{ borderTop: "2px solid #1a1a1a", marginBottom: 16 }} />

        {/* CGV content in 2 columns */}
        <div style={{ columnCount: 2, columnGap: 24, fontSize: 9, lineHeight: 1.5, color: "#333" }}>
          {CGV_ARTICLES.map((art, i) => (
            <div key={i} style={{ breakInside: "avoid", marginBottom: 10 }}>
              <div style={{ fontWeight: 700, fontSize: 9, marginBottom: 3, textTransform: "uppercase" }}>
                {art.title}
              </div>
              <div>{art.text}</div>
            </div>
          ))}
        </div>

        {/* CGV Footer */}
        <div style={{ marginTop: 20, borderTop: "1px solid #ddd", paddingTop: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ fontSize: 9, color: "#555", lineHeight: 1.6 }}>
              <div style={{ fontWeight: 700 }}>La SAS TOUT POUR MA TERRASSE est une SASU immatriculée en FRANCE</div>
              <div>TOUT POUR MA TERRASSE — {c.rue} {c.codePostal} St MAX — FRANCE</div>
              <div>ORALIS "Marque premium de SAS Tout pour ma terrasse"</div>
              <div>SIRET : {c.siret} — Code APE : 4791B — NUMÉRO DE TVA : {c.tvaIntra}</div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 16, minWidth: 140 }}>
              <div style={{ fontSize: 10, color: "#555" }}>
                DATE: <span style={{ borderBottom: "1px solid #333", display: "inline-block", width: 80 }} />
              </div>
              <div style={{ fontSize: 10, color: "#555" }}>
                SIGNATURE: <span style={{ borderBottom: "1px solid #333", display: "inline-block", width: 60 }} />
              </div>
            </div>
          </div>
          <div style={{ textAlign: "center", marginTop: 12 }}>
            <div style={{ fontFamily: "Cormorant Garamond, serif", fontSize: 30, fontWeight: 900, letterSpacing: 4, color: "#1a1a1a" }}>
              ORALIS
            </div>
            <div style={{ fontSize: 9, letterSpacing: 3, color: "#555", textTransform: "uppercase" }}>
              Créateur d'espaces extérieurs
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}
