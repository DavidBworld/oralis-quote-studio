import { uid } from "@/lib/quote-data";

export interface Interaction {
  id: string;
  type: "appel_entrant" | "appel_sortant" | "visite" | "email" | "sms" | "reunion" | "note";
  date: string;
  duree?: number;
  urgent: boolean;
  resultat: string;
  prochaineAction?: string;
  prochaineActionDate?: string;
  auteur: string;
}

export interface OpportuniteItem {
  id: string;
  categorie: string;
  designation: string;
  quantite: number;
  potentielHT: number;
  datePrevue?: string;
  observation?: string;
}

export interface PhotoItem {
  id: string;
  url: string;
  caption: string;
  categorie: "avant" | "pendant" | "apres" | "produit";
}

export interface Client {
  id: string;
  code: string;
  type: "particulier" | "professionnel";
  statut: "prospect" | "client" | "inactif";
  favori: boolean;
  prenom: string;
  nom: string;
  societe?: string;
  email: string;
  telephone: string;
  mobile?: string;
  adresse: string;
  ville: string;
  codePostal: string;
  pays: string;
  tvaDefaut: 0 | 3 | 10 | 17 | 20;
  modeReglement: string;
  origine: string;
  profil: "standard" | "vip" | "grand_compte";
  commercial?: string;
  noteInterne?: string;
  pipeline: "nouveau_lead" | "contacte" | "devis_envoye" | "negociation" | "gagne" | "perdu";
  motifPerte?: string;
  interactions: Interaction[];
  resteAFaire: OpportuniteItem[];
  photos: PhotoItem[];
  createdAt: string;
}

const STORAGE_KEY = "oralis_clients";

export function loadClients(): Client[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveClients(clients: Client[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(clients));
}

export function nextClientCode(clients: Client[]): string {
  const nums = clients
    .map((c) => {
      const m = c.code.match(/CLI-(\d+)/);
      return m ? parseInt(m[1]) : 0;
    })
    .filter(Boolean);
  const next = nums.length > 0 ? Math.max(...nums) + 1 : 1;
  return `CLI-${String(next).padStart(3, "0")}`;
}

export function emptyClient(clients: Client[]): Client {
  return {
    id: uid(),
    code: nextClientCode(clients),
    type: "particulier",
    statut: "prospect",
    favori: false,
    prenom: "",
    nom: "",
    societe: "",
    email: "",
    telephone: "",
    mobile: "",
    adresse: "",
    ville: "",
    codePostal: "",
    pays: "France",
    tvaDefaut: 20,
    modeReglement: "Virement",
    origine: "",
    profil: "standard",
    commercial: "",
    noteInterne: "",
    pipeline: "nouveau_lead",
    motifPerte: "",
    interactions: [],
    resteAFaire: [],
    photos: [],
    createdAt: new Date().toISOString(),
  };
}

export const PIPELINE_STAGES: { value: Client["pipeline"]; label: string }[] = [
  { value: "nouveau_lead", label: "Nouveau lead" },
  { value: "contacte", label: "Contacté" },
  { value: "devis_envoye", label: "Devis envoyé" },
  { value: "negociation", label: "Négociation" },
  { value: "gagne", label: "Gagné ✓" },
  { value: "perdu", label: "Perdu ✗" },
];

export const INTERACTION_TYPES: { value: Interaction["type"]; label: string }[] = [
  { value: "appel_entrant", label: "Appel entrant" },
  { value: "appel_sortant", label: "Appel sortant" },
  { value: "visite", label: "Visite" },
  { value: "email", label: "E-mail" },
  { value: "sms", label: "SMS" },
  { value: "reunion", label: "Réunion" },
  { value: "note", label: "Note" },
];

export const PHOTO_CATEGORIES: { value: PhotoItem["categorie"]; label: string }[] = [
  { value: "avant", label: "Avant" },
  { value: "pendant", label: "Pendant" },
  { value: "apres", label: "Après" },
  { value: "produit", label: "Produit" },
];

export const PROFIL_LABELS: Record<Client["profil"], string> = {
  standard: "Standard",
  vip: "VIP",
  grand_compte: "Grand compte",
};

export const STATUT_CLIENT_LABELS: Record<Client["statut"], string> = {
  prospect: "Prospect",
  client: "Client",
  inactif: "Inactif",
};

export function initializeClients() {
  const existing = loadClients();
  if (existing.length === 0) {
    saveClients(getSampleClients());
  }
}

function getSampleClients(): Client[] {
  return [
    {
      id: "cli-sample-1",
      code: "CLI-001",
      type: "particulier",
      statut: "prospect",
      favori: false,
      prenom: "Jean-Pierre",
      nom: "Müller",
      email: "jp.muller@email.lu",
      telephone: "+352 621 123 456",
      mobile: "",
      adresse: "12 Rue de la Gare",
      ville: "Luxembourg",
      codePostal: "1616",
      pays: "Luxembourg",
      tvaDefaut: 17,
      modeReglement: "Virement",
      origine: "Site web",
      profil: "standard",
      commercial: "David Boilon",
      noteInterne: "Intéressé par pergola bioclimatique pour sa terrasse.",
      pipeline: "devis_envoye",
      motifPerte: "",
      interactions: [
        {
          id: "int-1",
          type: "appel_entrant",
          date: "2026-03-05T10:00:00",
          duree: 15,
          urgent: false,
          resultat: "Demande de renseignements sur pergola bioclimatique 6x4m.",
          prochaineAction: "Envoyer devis",
          prochaineActionDate: "2026-03-10",
          auteur: "David Boilon",
        },
      ],
      resteAFaire: [
        {
          id: "opp-1",
          categorie: "Pergolas bioclimatiques",
          designation: "Pergola Bioclimatique à Lames Orientables 6x4m",
          quantite: 1,
          potentielHT: 18500,
          datePrevue: "2026-04-15",
          observation: "Avec motorisation Somfy et LED",
        },
      ],
      photos: [],
      createdAt: "2026-03-01T09:00:00",
    },
    {
      id: "cli-sample-2",
      code: "CLI-002",
      type: "particulier",
      statut: "client",
      favori: true,
      prenom: "Marie",
      nom: "Laurent",
      email: "marie.laurent@gmail.com",
      telephone: "+33 6 12 34 56 78",
      mobile: "+33 6 12 34 56 78",
      adresse: "45 Avenue Foch",
      ville: "Nancy",
      codePostal: "54000",
      pays: "France",
      tvaDefaut: 20,
      modeReglement: "Chèque",
      origine: "Recommandation",
      profil: "vip",
      commercial: "David Boilon",
      noteInterne: "Cliente fidèle, projet jardin d'hiver en cours.",
      pipeline: "negociation",
      motifPerte: "",
      interactions: [
        {
          id: "int-2",
          type: "visite",
          date: "2026-02-20T14:00:00",
          duree: 60,
          urgent: false,
          resultat: "Visite chantier, prise de mesures pour jardin d'hiver.",
          prochaineAction: "Finaliser devis",
          prochaineActionDate: "2026-03-01",
          auteur: "David Boilon",
        },
      ],
      resteAFaire: [
        {
          id: "opp-2",
          categorie: "Jardins d'hiver",
          designation: "Jardin d'Hiver & Parois Vitrées 5x3m",
          quantite: 1,
          potentielHT: 24000,
          datePrevue: "2026-05-01",
          observation: "Avec chauffage infrarouge",
        },
      ],
      photos: [],
      createdAt: "2026-02-15T11:00:00",
    },
  ];
}
