import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Search, Plus, Eye, Pencil, Trash2, Download, Star, FileText,
  Phone, PhoneIncoming, PhoneOutgoing, MapPin, Mail, MessageSquare,
  Calendar, Clock, AlertTriangle, Camera, ChevronRight, X, Upload
} from "lucide-react";
import {
  type Client, type Interaction, type OpportuniteItem, type PhotoItem,
  loadClients, saveClients, initializeClients, emptyClient, nextClientCode,
  PIPELINE_STAGES, INTERACTION_TYPES, PHOTO_CATEGORIES,
  PROFIL_LABELS, STATUT_CLIENT_LABELS,
} from "@/lib/client-data";
import { loadQuotes, formatEUR, formatDate, calcTotals, STATUT_LABELS, uid } from "@/lib/quote-data";
import { ConfirmModal } from "@/components/ConfirmModal";

const statusClassMap: Record<Client["statut"], string> = {
  prospect: "status-envoye",
  client: "status-accepte",
  inactif: "status-brouillon",
};

const ORIGINES = ["Google Ads", "Recommandation", "Site web", "Foire", "Téléphone", "Autre"];
const MODES_REGLEMENT = ["Virement", "Chèque", "CB", "Espèces"];
const PAYS_LIST = ["France", "Luxembourg", "Belgique", "Allemagne", "Autre"];
const TVA_OPTIONS: (0 | 3 | 10 | 17 | 20)[] = [0, 3, 10, 17, 20];

type FilterTab = "tous" | "prospect" | "client" | "favori" | "inactif";

const interactionBorderColor: Record<Interaction["type"], string> = {
  appel_entrant: "border-l-blue-500",
  appel_sortant: "border-l-blue-400",
  visite: "border-l-green-500",
  email: "border-l-purple-500",
  sms: "border-l-yellow-500",
  reunion: "border-l-teal-500",
  note: "border-l-gray-400",
};

const interactionIcon: Record<Interaction["type"], typeof Phone> = {
  appel_entrant: PhoneIncoming,
  appel_sortant: PhoneOutgoing,
  visite: MapPin,
  email: Mail,
  sms: MessageSquare,
  reunion: Calendar,
  note: FileText,
};

export default function Clients() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [clients, setClients] = useState<Client[]>([]);
  const [search, setSearch] = useState("");
  const [filterTab, setFilterTab] = useState<FilterTab>("tous");
  const [profilFilter, setProfilFilter] = useState("tous");
  const [statutFilter, setStatutFilter] = useState("tous");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [origineFilter, setOrigineFilter] = useState("tous");
  const [paysFilter, setPaysFilter] = useState("tous");
  const [tvaFilter, setTvaFilter] = useState("tous");
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; client: Client } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<{
    isOpen: boolean;
    message: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    message: "",
    onConfirm: () => {},
  });

  useEffect(() => {
    initializeClients();
    setClients(loadClients());
  }, []);

  // Close context menu on click outside
  useEffect(() => {
    const handler = () => setContextMenu(null);
    window.addEventListener("click", handler);
    return () => window.removeEventListener("click", handler);
  }, []);

  const selectedClient = id ? clients.find((c) => c.id === id) : null;

  const filtered = clients
    .filter((c) => {
      const s = search.toLowerCase();
      return (
        c.nom.toLowerCase().includes(s) ||
        c.prenom.toLowerCase().includes(s) ||
        (c.societe || "").toLowerCase().includes(s) ||
        c.email.toLowerCase().includes(s) ||
        c.code.toLowerCase().includes(s)
      );
    })
    .filter((c) => {
      if (filterTab === "tous") return true;
      if (filterTab === "favori") return c.favori;
      return c.statut === filterTab;
    })
    .filter((c) => profilFilter === "tous" || c.profil === profilFilter)
    .filter((c) => statutFilter === "tous" || c.statut === statutFilter)
    .filter((c) => !showAdvanced || origineFilter === "tous" || c.origine === origineFilter)
    .filter((c) => !showAdvanced || paysFilter === "tous" || c.pays === paysFilter)
    .filter((c) => !showAdvanced || tvaFilter === "tous" || c.tvaDefaut === Number(tvaFilter));

  const updateClient = (updated: Client) => {
    const all = loadClients().map((c) => (c.id === updated.id ? updated : c));
    saveClients(all);
    setClients(all);
  };

  const deleteClient = (clientId: string) => {
    setConfirmDelete({
      isOpen: true,
      message: "Voulez-vous vraiment supprimer ce client ?",
      onConfirm: () => {
        const all = loadClients().filter((c) => c.id !== clientId);
        saveClients(all);
        setClients(all);
        if (id === clientId) navigate("/clients");
      },
    });
  };

  const toggleFavori = (clientId: string) => {
    const all = loadClients().map((c) =>
      c.id === clientId ? { ...c, favori: !c.favori } : c
    );
    saveClients(all);
    setClients(all);
  };

  const addNewClient = () => {
    const all = loadClients();
    const newC = emptyClient(all);
    all.push(newC);
    saveClients(all);
    setClients(all);
    navigate(`/clients/${newC.id}`);
  };

  const handleContextMenu = (e: React.MouseEvent, client: Client) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, client });
  };

  if (selectedClient) {
    return (
      <>
        <ClientDetail
          client={selectedClient}
          onUpdate={updateClient}
          onDelete={deleteClient}
          onBack={() => navigate("/clients")}
        />
        <ConfirmModal
          isOpen={confirmDelete.isOpen}
          message={confirmDelete.message}
          onConfirm={() => {
            setConfirmDelete({ isOpen: false, message: "", onConfirm: () => {} });
            confirmDelete.onConfirm();
          }}
          onCancel={() => setConfirmDelete({ isOpen: false, message: "", onConfirm: () => {} })}
        />
      </>
    );
  }

  return (
    <div className="p-6 lg:p-8 w-full">
      <div className="flex items-center justify-between mb-10">
        <div>
          <h1 className="font-display text-[32px] font-semibold text-foreground tracking-tight">
            Clients & Prospects
          </h1>
          <p className="text-[13px] text-muted-foreground mt-1 font-body">
            Gestion de votre portefeuille client
          </p>
        </div>
        <button onClick={addNewClient} className="btn-gold flex items-center gap-2">
          <Plus size={16} />
          Nouveau client
        </button>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-0 mb-4 border-b border-border">
        {([
          { value: "tous" as FilterTab, label: "Tous" },
          { value: "prospect" as FilterTab, label: "Prospects" },
          { value: "client" as FilterTab, label: "Clients" },
          { value: "favori" as FilterTab, label: "⭐ Favoris" },
          { value: "inactif" as FilterTab, label: "Inactifs" },
        ]).map((tab) => (
          <button
            key={tab.value}
            onClick={() => setFilterTab(tab.value)}
            className={`px-5 py-2.5 text-[13px] font-medium transition-colors duration-150 border-b-2 -mb-px ${
              filterTab === tab.value
                ? "border-accent text-accent"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
            style={{ fontFamily: "var(--font-body)" }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-1 mb-4">
        <button onClick={addNewClient} className="p-2 rounded hover:bg-muted transition-colors" title="Nouveau">
          <Plus size={16} className="text-muted-foreground" />
        </button>
        <button className="p-2 rounded hover:bg-muted transition-colors" title="Exporter">
          <Download size={16} className="text-muted-foreground" />
        </button>
      </div>

      {/* Double search bar */}
      <div className="grid grid-cols-2 gap-3 mb-2">
        <div className="relative">
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Rechercher nom, société, email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="form-input pl-11 pr-4 h-10"
          />
        </div>
        <select
          value={profilFilter}
          onChange={(e) => setProfilFilter(e.target.value)}
          className="form-input h-10"
        >
          <option value="tous">Tous les profils</option>
          <option value="standard">Standard</option>
          <option value="vip">VIP</option>
          <option value="grand_compte">Grand compte</option>
        </select>
      </div>
      <div className="grid grid-cols-2 gap-3 mb-2">
        <input
          type="text"
          placeholder="Commercial..."
          className="form-input h-10"
          disabled
        />
        <select
          value={statutFilter}
          onChange={(e) => setStatutFilter(e.target.value)}
          className="form-input h-10"
        >
          <option value="tous">Tous les statuts</option>
          <option value="prospect">Prospect</option>
          <option value="client">Client</option>
          <option value="inactif">Inactif</option>
        </select>
      </div>

      <button
        onClick={() => setShowAdvanced(!showAdvanced)}
        className="text-accent text-xs mb-4 hover:underline"
        style={{ fontFamily: "var(--font-body)" }}
      >
        {showAdvanced ? "− Masquer les critères avancés" : "+ Critères avancés"}
      </button>

      {showAdvanced && (
        <div className="grid grid-cols-3 gap-3 mb-4">
          <select value={origineFilter} onChange={(e) => setOrigineFilter(e.target.value)} className="form-input h-10">
            <option value="tous">Toutes les origines</option>
            {ORIGINES.map((o) => <option key={o} value={o}>{o}</option>)}
          </select>
          <select value={paysFilter} onChange={(e) => setPaysFilter(e.target.value)} className="form-input h-10">
            <option value="tous">Tous les pays</option>
            {PAYS_LIST.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
          <select value={tvaFilter} onChange={(e) => setTvaFilter(e.target.value)} className="form-input h-10">
            <option value="tous">Toutes les TVA</option>
            {TVA_OPTIONS.map((t) => <option key={t} value={t}>{t}%</option>)}
          </select>
        </div>
      )}

      {/* Table */}
      <div className="bg-card border border-border rounded-lg overflow-hidden shadow-card">
        <table className="w-full text-[13px]">
          <thead>
            <tr className="table-header-dark">
              <th className="text-center w-10">★</th>
              <th className="text-left">Code</th>
              <th className="text-left">Nom client</th>
              <th className="text-left">C.P</th>
              <th className="text-left">Ville</th>
              <th className="text-center">Profil</th>
              <th className="text-left">Téléphone</th>
              <th className="text-left">Origine</th>
              <th className="text-center">Statut</th>
              <th className="text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((c, i) => (
              <tr
                key={c.id}
                onContextMenu={(e) => handleContextMenu(e, c)}
                className={`border-b border-border last:border-0 transition-colors duration-150 hover:bg-accent/5 cursor-pointer ${
                  c.favori ? "bg-[hsl(45,80%,96%)]" : i % 2 === 1 ? "bg-background" : "bg-card"
                }`}
              >
                <td className="px-3 py-2 text-center">
                  <button onClick={() => toggleFavori(c.id)} className="text-accent hover:scale-110 transition-transform">
                    {c.favori ? "★" : "☆"}
                  </button>
                </td>
                <td className="px-4 py-2 font-mono text-[12px] font-medium">{c.code}</td>
                <td className="px-4 py-2">
                  <span className="font-medium">{c.prenom} {c.nom}</span>
                  {c.societe && <span className="text-muted-foreground ml-1.5 text-xs">— {c.societe}</span>}
                </td>
                <td className="px-4 py-2 text-muted-foreground">{c.codePostal}</td>
                <td className="px-4 py-2 text-muted-foreground">{c.ville}</td>
                <td className="px-4 py-2 text-center">
                  <span className="text-[11px] font-medium">{PROFIL_LABELS[c.profil]}</span>
                </td>
                <td className="px-4 py-2 text-muted-foreground text-[12px]">{c.telephone}</td>
                <td className="px-4 py-2 text-muted-foreground text-[12px]">{c.origine}</td>
                <td className="px-4 py-2 text-center">
                  <span className={`inline-block px-3 py-1 text-[11px] font-semibold tracking-wide ${statusClassMap[c.statut]}`}>
                    {STATUT_CLIENT_LABELS[c.statut]}
                  </span>
                </td>
                <td className="px-4 py-2 text-right">
                  <div className="flex items-center justify-end gap-1">
                    <button onClick={() => navigate(`/clients/${c.id}`)} className="p-1.5 rounded hover:bg-muted transition-colors" title="Voir">
                      <Eye size={14} className="text-muted-foreground" />
                    </button>
                    <button onClick={() => navigate(`/clients/${c.id}`)} className="p-1.5 rounded hover:bg-muted transition-colors" title="Modifier">
                      <Pencil size={14} className="text-muted-foreground" />
                    </button>
                    <button onClick={() => navigate(`/devis/nouveau?clientId=${c.id}`)} className="p-1.5 rounded hover:bg-muted transition-colors" title="Nouveau devis">
                      <FileText size={14} className="text-muted-foreground" />
                    </button>
                    <button onClick={() => deleteClient(c.id)} className="p-1.5 rounded hover:bg-muted transition-colors" title="Supprimer">
                      <Trash2 size={14} className="text-muted-foreground" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={10} className="px-4 py-12 text-center text-muted-foreground">
                  Aucun client trouvé.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Context menu */}
      {contextMenu && (
        <div
          className="fixed z-50 bg-card border border-border rounded-lg shadow-elevated py-1 min-w-[200px]"
          style={{ left: contextMenu.x, top: contextMenu.y }}
          onClick={(e) => e.stopPropagation()}
        >
          <button onClick={() => { navigate(`/clients/${contextMenu.client.id}`); setContextMenu(null); }} className="w-full text-left px-4 py-2 text-[13px] hover:bg-muted flex items-center gap-2">
            <Pencil size={14} /> Modifier
          </button>
          <button onClick={() => { navigate(`/devis/nouveau?clientId=${contextMenu.client.id}`); setContextMenu(null); }} className="w-full text-left px-4 py-2 text-[13px] hover:bg-muted flex items-center gap-2">
            <FileText size={14} /> Nouveau devis
          </button>
          <div className="relative group">
            <button className="w-full text-left px-4 py-2 text-[13px] hover:bg-muted flex items-center gap-2 justify-between">
              <span className="flex items-center gap-2"><MessageSquare size={14} /> Communiquer</span>
              <ChevronRight size={12} />
            </button>
            <div className="hidden group-hover:block absolute left-full top-0 bg-card border border-border rounded-lg shadow-elevated py-1 min-w-[180px]">
              <button className="w-full text-left px-4 py-2 text-[13px] hover:bg-muted">Envoyer un SMS</button>
              <button className="w-full text-left px-4 py-2 text-[13px] hover:bg-muted">Envoyer un e-mailing</button>
            </div>
          </div>
          <button onClick={() => { toggleFavori(contextMenu.client.id); setContextMenu(null); }} className="w-full text-left px-4 py-2 text-[13px] hover:bg-muted flex items-center gap-2">
            <Star size={14} /> {contextMenu.client.favori ? "Retirer des favoris" : "Ajouter aux favoris"}
          </button>
          <div className="border-t border-border my-1" />
          <button onClick={() => { deleteClient(contextMenu.client.id); setContextMenu(null); }} className="w-full text-left px-4 py-2 text-[13px] hover:bg-muted flex items-center gap-2 text-destructive">
            <Trash2 size={14} /> Supprimer
          </button>
        </div>
      )}
      <ConfirmModal
        isOpen={confirmDelete.isOpen}
        message={confirmDelete.message}
        onConfirm={() => {
          setConfirmDelete({ isOpen: false, message: "", onConfirm: () => {} });
          confirmDelete.onConfirm();
        }}
        onCancel={() => setConfirmDelete({ isOpen: false, message: "", onConfirm: () => {} })}
      />
    </div>
  );
}

// ═══════════════════════════════════════
// CLIENT DETAIL VIEW
// ═══════════════════════════════════════

function ClientDetail({
  client,
  onUpdate,
  onDelete,
  onBack,
}: {
  client: Client;
  onUpdate: (c: Client) => void;
  onDelete: (id: string) => void;
  onBack: () => void;
}) {
  const navigate = useNavigate();
  const [tab, setTab] = useState<"coordonnees" | "suivi" | "historique" | "documents" | "chantier">("coordonnees");
  const [form, setForm] = useState<Client>({ ...client });
  const [showInteractionModal, setShowInteractionModal] = useState(false);

  useEffect(() => {
    setForm({ ...client });
  }, [client]);

  const save = () => onUpdate(form);

  const DETAIL_TABS = [
    { value: "coordonnees" as const, label: "Coordonnées" },
    { value: "suivi" as const, label: "Suivi Commercial" },
    { value: "historique" as const, label: "Historique" },
    { value: "documents" as const, label: "Documents" },
    { value: "chantier" as const, label: "Chantier & Photos" },
  ];

  return (
    <div className="p-6 lg:p-8 w-full">
      <div className="flex items-center justify-between mb-6">
        <div>
          <button onClick={onBack} className="text-accent text-sm hover:underline mb-2 block" style={{ fontFamily: "var(--font-body)" }}>
            ← Retour à la liste
          </button>
          <h1 className="font-display text-[32px] font-semibold text-foreground tracking-tight">
            {form.prenom} {form.nom}
          </h1>
          <p className="text-[13px] text-muted-foreground mt-1 font-body">
            {form.code} — {STATUT_CLIENT_LABELS[form.statut]}
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => navigate(`/devis/nouveau?clientId=${client.id}`)} className="btn-outline-gold flex items-center gap-2">
            <FileText size={14} />
            Nouveau devis
          </button>
          <button onClick={() => onDelete(client.id)} className="btn-danger flex items-center gap-2">
            <Trash2 size={14} />
            Supprimer
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-0 mb-6 border-b border-border">
        {DETAIL_TABS.map((t) => (
          <button
            key={t.value}
            onClick={() => setTab(t.value)}
            className={`px-5 py-2.5 text-[13px] font-medium transition-colors duration-150 border-b-2 -mb-px ${
              tab === t.value
                ? "border-accent text-accent"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
            style={{ fontFamily: "var(--font-body)" }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "coordonnees" && (
        <TabCoordonnees form={form} setForm={setForm} onSave={save} onBack={onBack} />
      )}
      {tab === "suivi" && (
        <TabSuivi form={form} setForm={setForm} onSave={save} />
      )}
      {tab === "historique" && (
        <TabHistorique
          form={form}
          setForm={setForm}
          onSave={save}
          showModal={showInteractionModal}
          setShowModal={setShowInteractionModal}
        />
      )}
      {tab === "documents" && (
        <TabDocuments client={client} />
      )}
      {tab === "chantier" && (
        <TabChantier form={form} setForm={setForm} onSave={save} />
      )}
    </div>
  );
}

// ═══════════════════════════════════════
// TAB 1: COORDONNÉES
// ═══════════════════════════════════════

function TabCoordonnees({ form, setForm, onSave, onBack }: { form: Client; setForm: (f: Client) => void; onSave: () => void; onBack: () => void }) {
  const set = (key: keyof Client, val: any) => setForm({ ...form, [key]: val });

  return (
    <div>
      <div className="grid grid-cols-2 gap-8 mb-6">
        {/* Left */}
        <div className="space-y-4">
          <div>
            <label className="form-label">Type</label>
            <div className="flex gap-2">
              <button onClick={() => set("type", "particulier")} className={form.type === "particulier" ? "btn-gold text-[12px] py-2 px-4" : "btn-outline-gold text-[12px] py-2 px-4"}>
                Particulier
              </button>
              <button onClick={() => set("type", "professionnel")} className={form.type === "professionnel" ? "btn-gold text-[12px] py-2 px-4" : "btn-outline-gold text-[12px] py-2 px-4"}>
                Professionnel
              </button>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="form-label">Prénom *</label>
              <input value={form.prenom} onChange={(e) => set("prenom", e.target.value)} className="form-input" />
            </div>
            <div>
              <label className="form-label">Nom *</label>
              <input value={form.nom} onChange={(e) => set("nom", e.target.value)} className="form-input" />
            </div>
          </div>
          {form.type === "professionnel" && (
            <div>
              <label className="form-label">Société</label>
              <input value={form.societe || ""} onChange={(e) => set("societe", e.target.value)} className="form-input" />
            </div>
          )}
          <div>
            <label className="form-label">Email *</label>
            <input value={form.email} onChange={(e) => set("email", e.target.value)} className="form-input" type="email" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="form-label">Téléphone</label>
              <input value={form.telephone} onChange={(e) => set("telephone", e.target.value)} className="form-input" />
            </div>
            <div>
              <label className="form-label">Mobile</label>
              <input value={form.mobile || ""} onChange={(e) => set("mobile", e.target.value)} className="form-input" />
            </div>
          </div>
          <div>
            <label className="form-label">Statut</label>
            <div className="flex gap-3">
              {(["prospect", "client", "inactif"] as const).map((s) => (
                <label key={s} className="flex items-center gap-2 text-sm cursor-pointer">
                  <input type="radio" name="statut" checked={form.statut === s} onChange={() => set("statut", s)} className="accent-accent" />
                  {STATUT_CLIENT_LABELS[s]}
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* Right */}
        <div className="space-y-4">
          <div>
            <label className="form-label">Adresse</label>
            <input value={form.adresse} onChange={(e) => set("adresse", e.target.value)} className="form-input" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="form-label">Ville</label>
              <input value={form.ville} onChange={(e) => set("ville", e.target.value)} className="form-input" />
            </div>
            <div>
              <label className="form-label">Code postal</label>
              <input value={form.codePostal} onChange={(e) => set("codePostal", e.target.value)} className="form-input" />
            </div>
          </div>
          <div>
            <label className="form-label">Pays</label>
            <select value={form.pays} onChange={(e) => set("pays", e.target.value)} className="form-input">
              {PAYS_LIST.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <div>
            <label className="form-label">TVA par défaut</label>
            <select value={form.tvaDefaut} onChange={(e) => set("tvaDefaut", Number(e.target.value))} className="form-input">
              {TVA_OPTIONS.map((t) => <option key={t} value={t}>{t}%</option>)}
            </select>
          </div>
          <div>
            <label className="form-label">Mode de règlement</label>
            <select value={form.modeReglement} onChange={(e) => set("modeReglement", e.target.value)} className="form-input">
              {MODES_REGLEMENT.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          <div>
            <label className="form-label">Origine</label>
            <select value={form.origine} onChange={(e) => set("origine", e.target.value)} className="form-input">
              <option value="">—</option>
              {ORIGINES.map((o) => <option key={o} value={o}>{o}</option>)}
            </select>
          </div>
          <div>
            <label className="form-label">Profil</label>
            <select value={form.profil} onChange={(e) => set("profil", e.target.value as Client["profil"])} className="form-input">
              {(Object.keys(PROFIL_LABELS) as Client["profil"][]).map((p) => (
                <option key={p} value={p}>{PROFIL_LABELS[p]}</option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <label className="form-label mb-0">⭐ Favori</label>
            <button
              onClick={() => setForm({ ...form, favori: !form.favori })}
              className={`px-3 py-1 text-[12px] rounded ${form.favori ? "bg-accent text-accent-foreground" : "bg-muted text-muted-foreground"}`}
            >
              {form.favori ? "Oui" : "Non"}
            </button>
          </div>
        </div>
      </div>

      <div className="mb-6">
        <label className="form-label">Note interne</label>
        <textarea
          value={form.noteInterne || ""}
          onChange={(e) => setForm({ ...form, noteInterne: e.target.value })}
          className="form-input h-24 resize-none"
          rows={3}
        />
      </div>

      <div className="flex gap-3">
        <button onClick={onSave} className="btn-gold">Enregistrer</button>
        <button onClick={onBack} className="btn-ghost border border-border">Annuler</button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════
// TAB 2: SUIVI COMMERCIAL
// ═══════════════════════════════════════

function TabSuivi({ form, setForm, onSave }: { form: Client; setForm: (f: Client) => void; onSave: () => void }) {
  const setPipeline = (stage: Client["pipeline"]) => {
    setForm({ ...form, pipeline: stage });
  };

  const stageIndex = PIPELINE_STAGES.findIndex((s) => s.value === form.pipeline);

  const addOpportunite = () => {
    const item: OpportuniteItem = {
      id: uid(),
      categorie: "",
      designation: "",
      quantite: 1,
      potentielHT: 0,
      datePrevue: "",
      observation: "",
    };
    setForm({ ...form, resteAFaire: [...form.resteAFaire, item] });
  };

  const updateOpp = (id: string, key: keyof OpportuniteItem, val: any) => {
    setForm({
      ...form,
      resteAFaire: form.resteAFaire.map((o) => (o.id === id ? { ...o, [key]: val } : o)),
    });
  };

  const [confirmDelete, setConfirmDelete] = useState<{
    isOpen: boolean;
    message: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    message: "",
    onConfirm: () => {},
  });

  const deleteOpp = (id: string) => {
    setConfirmDelete({
      isOpen: true,
      message: "Voulez-vous vraiment supprimer cette opportunité ?",
      onConfirm: () => {
        setForm({ ...form, resteAFaire: form.resteAFaire.filter((o) => o.id !== id) });
      },
    });
  };

  return (
    <div>
      {/* Pipeline */}
      <h3 className="section-title">Pipeline commercial</h3>
      <div className="flex gap-2 mb-6">
        {PIPELINE_STAGES.map((stage, i) => (
          <button
            key={stage.value}
            onClick={() => setPipeline(stage.value)}
            className={`flex-1 px-4 py-3 rounded text-[13px] font-medium border transition-all ${
              form.pipeline === stage.value
                ? "bg-accent text-accent-foreground border-accent"
                : i < stageIndex
                ? "bg-muted text-muted-foreground border-border"
                : "bg-card text-foreground border-border hover:bg-muted/50"
            }`}
            style={{ fontFamily: "var(--font-body)" }}
          >
            {stage.label}
          </button>
        ))}
      </div>

      {form.pipeline === "perdu" && (
        <div className="mb-6">
          <label className="form-label">Motif de perte</label>
          <select value={form.motifPerte || ""} onChange={(e) => setForm({ ...form, motifPerte: e.target.value })} className="form-input">
            <option value="">—</option>
            <option value="Prix trop élevé">Prix trop élevé</option>
            <option value="Concurrent choisi">Concurrent choisi</option>
            <option value="Projet abandonné">Projet abandonné</option>
            <option value="Délai trop long">Délai trop long</option>
            <option value="Autre">Autre</option>
          </select>
        </div>
      )}

      {/* Reste à faire */}
      <h3 className="section-title">Reste à faire</h3>
      <div className="luxury-card mb-6">
        {form.resteAFaire.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucune opportunité enregistrée.</p>
        ) : (
          <table className="w-full text-[13px] mb-4">
            <thead>
              <tr className="table-header-dark">
                <th className="text-left">Catégorie</th>
                <th className="text-left">Désignation</th>
                <th className="text-right">Qté</th>
                <th className="text-right">Potentiel HT</th>
                <th className="text-left">Date prévue</th>
                <th className="text-left">Observation</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {form.resteAFaire.map((opp) => (
                <tr key={opp.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-2">
                    <input value={opp.categorie} onChange={(e) => updateOpp(opp.id, "categorie", e.target.value)} className="form-input h-8 text-[12px]" />
                  </td>
                  <td className="px-4 py-2">
                    <input value={opp.designation} onChange={(e) => updateOpp(opp.id, "designation", e.target.value)} className="form-input h-8 text-[12px]" />
                  </td>
                  <td className="px-4 py-2">
                    <input type="number" value={opp.quantite} onChange={(e) => updateOpp(opp.id, "quantite", Number(e.target.value))} className="form-input h-8 text-[12px] w-16 text-right" />
                  </td>
                  <td className="px-4 py-2">
                    <input type="number" value={opp.potentielHT} onChange={(e) => updateOpp(opp.id, "potentielHT", Number(e.target.value))} className="form-input h-8 text-[12px] w-28 text-right" />
                  </td>
                  <td className="px-4 py-2">
                    <input type="date" value={opp.datePrevue || ""} onChange={(e) => updateOpp(opp.id, "datePrevue", e.target.value)} className="form-input h-8 text-[12px]" />
                  </td>
                  <td className="px-4 py-2">
                    <input value={opp.observation || ""} onChange={(e) => updateOpp(opp.id, "observation", e.target.value)} className="form-input h-8 text-[12px]" />
                  </td>
                  <td className="px-4 py-2 text-right">
                    <div className="flex gap-1 justify-end">
                      <button onClick={() => {/* TODO: create devis */}} className="p-1.5 rounded hover:bg-muted transition-colors" title="Créer un devis">
                        <FileText size={13} className="text-accent" />
                      </button>
                      <button onClick={() => deleteOpp(opp.id)} className="p-1.5 rounded hover:bg-muted transition-colors" title="Supprimer">
                        <Trash2 size={13} className="text-destructive" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <button onClick={addOpportunite} className="text-accent text-[13px] hover:underline font-medium">
          + Ajouter une opportunité
        </button>
      </div>

      <button onClick={onSave} className="btn-gold">Enregistrer</button>
      <ConfirmModal
        isOpen={confirmDelete.isOpen}
        message={confirmDelete.message}
        onConfirm={() => {
          setConfirmDelete({ isOpen: false, message: "", onConfirm: () => {} });
          confirmDelete.onConfirm();
        }}
        onCancel={() => setConfirmDelete({ isOpen: false, message: "", onConfirm: () => {} })}
      />
    </div>
  );
}

// ═══════════════════════════════════════
// TAB 3: HISTORIQUE
// ═══════════════════════════════════════

function TabHistorique({
  form, setForm, onSave, showModal, setShowModal,
}: {
  form: Client; setForm: (f: Client) => void; onSave: () => void;
  showModal: boolean; setShowModal: (v: boolean) => void;
}) {
  const [newInteraction, setNewInteraction] = useState<Partial<Interaction>>({
    type: "appel_sortant",
    date: new Date().toISOString().slice(0, 10),
    urgent: false,
    resultat: "",
    auteur: "David Boilon",
  });

  const addInteraction = () => {
    const item: Interaction = {
      id: uid(),
      type: (newInteraction.type || "note") as Interaction["type"],
      date: newInteraction.date || new Date().toISOString(),
      duree: newInteraction.duree,
      urgent: newInteraction.urgent || false,
      resultat: newInteraction.resultat || "",
      prochaineAction: newInteraction.prochaineAction,
      prochaineActionDate: newInteraction.prochaineActionDate,
      auteur: newInteraction.auteur || "David Boilon",
    };
    setForm({ ...form, interactions: [item, ...form.interactions] });
    setShowModal(false);
    setNewInteraction({
      type: "appel_sortant",
      date: new Date().toISOString().slice(0, 10),
      urgent: false,
      resultat: "",
      auteur: "David Boilon",
    });
    setTimeout(onSave, 100);
  };

  const sorted = [...form.interactions].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h3 className="section-title mb-0 pb-0 border-b-0">Historique des interactions</h3>
        <button onClick={() => setShowModal(true)} className="btn-gold text-[12px] flex items-center gap-2">
          <Plus size={14} />
          Ajouter une interaction
        </button>
      </div>

      {sorted.length === 0 ? (
        <div className="luxury-card p-8 text-center">
          <p className="text-sm text-muted-foreground">Aucune interaction enregistrée.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {sorted.map((inter) => {
            const Icon = interactionIcon[inter.type] || FileText;
            const typeLabel = INTERACTION_TYPES.find((t) => t.value === inter.type)?.label || inter.type;
            return (
              <div
                key={inter.id}
                className={`luxury-card border-l-4 ${inter.urgent ? "border-l-destructive" : interactionBorderColor[inter.type]}`}
              >
                <div className="flex items-center gap-3 mb-2">
                  <Icon size={16} className="text-muted-foreground" />
                  <span className="text-[13px] font-medium">{typeLabel}</span>
                  <span className="text-[12px] text-muted-foreground">{formatDate(inter.date)}</span>
                  {inter.duree && <span className="text-[12px] text-muted-foreground">• {inter.duree} min</span>}
                  {inter.urgent && (
                    <span className="text-[11px] px-2 py-0.5 bg-destructive/10 text-destructive rounded-full font-semibold flex items-center gap-1">
                      <AlertTriangle size={11} /> Urgent
                    </span>
                  )}
                </div>
                <p className="text-sm">{inter.resultat}</p>
                {inter.prochaineAction && (
                  <p className="text-[12px] text-muted-foreground italic mt-2">
                    Prochaine action: {inter.prochaineAction}
                    {inter.prochaineActionDate && ` — ${formatDate(inter.prochaineActionDate)}`}
                  </p>
                )}
                <p className="text-[11px] text-muted-foreground mt-1">Par {inter.auteur}</p>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 backdrop-blur-sm">
          <div className="bg-card border border-border p-8 w-full max-w-lg shadow-elevated rounded-lg">
            <div className="flex justify-between items-center mb-4">
              <h2 className="font-display text-xl font-semibold">Nouvelle interaction</h2>
              <button onClick={() => setShowModal(false)} className="p-1 rounded hover:bg-muted"><X size={18} /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="form-label">Type</label>
                <select
                  value={newInteraction.type}
                  onChange={(e) => setNewInteraction({ ...newInteraction, type: e.target.value as Interaction["type"] })}
                  className="form-input"
                >
                  {INTERACTION_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="form-label">Date</label>
                  <input type="date" value={newInteraction.date || ""} onChange={(e) => setNewInteraction({ ...newInteraction, date: e.target.value })} className="form-input" />
                </div>
                <div>
                  <label className="form-label">Durée (min)</label>
                  <input type="number" value={newInteraction.duree || ""} onChange={(e) => setNewInteraction({ ...newInteraction, duree: Number(e.target.value) })} className="form-input" />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <label className="form-label mb-0">⚠️ Urgent</label>
                <button
                  onClick={() => setNewInteraction({ ...newInteraction, urgent: !newInteraction.urgent })}
                  className={`px-3 py-1 text-[12px] rounded ${newInteraction.urgent ? "bg-destructive text-destructive-foreground" : "bg-muted text-muted-foreground"}`}
                >
                  {newInteraction.urgent ? "Oui" : "Non"}
                </button>
              </div>
              <div>
                <label className="form-label">Résultat</label>
                <textarea
                  value={newInteraction.resultat || ""}
                  onChange={(e) => setNewInteraction({ ...newInteraction, resultat: e.target.value })}
                  className="form-input h-20 resize-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="form-label">Prochaine action</label>
                  <input value={newInteraction.prochaineAction || ""} onChange={(e) => setNewInteraction({ ...newInteraction, prochaineAction: e.target.value })} className="form-input" />
                </div>
                <div>
                  <label className="form-label">Date prochaine action</label>
                  <input type="date" value={newInteraction.prochaineActionDate || ""} onChange={(e) => setNewInteraction({ ...newInteraction, prochaineActionDate: e.target.value })} className="form-input" />
                </div>
              </div>
            </div>
            <div className="flex gap-2 mt-6">
              <button onClick={addInteraction} className="btn-gold flex-1">Ajouter</button>
              <button onClick={() => setShowModal(false)} className="btn-ghost flex-1 border border-border">Annuler</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════
// TAB 4: DOCUMENTS
// ═══════════════════════════════════════

function TabDocuments({ client }: { client: Client }) {
  const navigate = useNavigate();
  const [subTab, setSubTab] = useState<"devis" | "factures" | "tous">("devis");
  const quotes = loadQuotes().filter(
    (q) => q.client.nom.toLowerCase() === client.nom.toLowerCase() && q.client.prenom.toLowerCase() === client.prenom.toLowerCase()
  );

  const statusClass: Record<string, string> = {
    brouillon: "status-brouillon",
    envoye: "status-envoye",
    accepte: "status-accepte",
    refuse: "status-refuse",
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex gap-0 border-b border-border">
          {(["devis", "factures", "tous"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setSubTab(t)}
              className={`px-5 py-2.5 text-[13px] font-medium transition-colors duration-150 border-b-2 -mb-px capitalize ${
                subTab === t ? "border-accent text-accent" : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
              style={{ fontFamily: "var(--font-body)" }}
            >
              {t}
            </button>
          ))}
        </div>
        <button onClick={() => navigate(`/devis/nouveau?clientId=${client.id}`)} className="btn-gold text-[12px] flex items-center gap-2">
          <FileText size={14} />
          Nouveau devis pour ce client
        </button>
      </div>

      {quotes.length === 0 ? (
        <div className="luxury-card p-8 text-center">
          <p className="text-sm text-muted-foreground">Aucun document lié à ce client.</p>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-lg overflow-hidden shadow-card">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="table-header-dark">
                <th className="text-left">N° Devis</th>
                <th className="text-left">Date</th>
                <th className="text-right">Montant TTC</th>
                <th className="text-center">Statut</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {quotes.map((q, i) => {
                const { totalTTC } = calcTotals(q.lignes);
                return (
                  <tr key={q.id} className={`border-b border-border last:border-0 hover:bg-accent/5 ${i % 2 === 1 ? "bg-background" : "bg-card"}`}>
                    <td className="px-4 py-2 font-mono font-medium">{q.numero}</td>
                    <td className="px-4 py-2 text-muted-foreground">{formatDate(q.date)}</td>
                    <td className="px-4 py-2 text-right font-mono font-medium">{formatEUR(totalTTC)}</td>
                    <td className="px-4 py-2 text-center">
                      <span className={`inline-block px-3 py-1 text-[11px] font-semibold tracking-wide ${statusClass[q.statut]}`}>
                        {STATUT_LABELS[q.statut]}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-right">
                      <div className="flex gap-1 justify-end">
                        <button onClick={() => navigate(`/devis/${q.id}`)} className="p-1.5 rounded hover:bg-muted"><Pencil size={14} className="text-muted-foreground" /></button>
                        <button onClick={() => navigate(`/devis/${q.id}/apercu`)} className="p-1.5 rounded hover:bg-muted"><Eye size={14} className="text-muted-foreground" /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════
// TAB 5: CHANTIER & PHOTOS
// ═══════════════════════════════════════

function TabChantier({ form, setForm, onSave }: { form: Client; setForm: (f: Client) => void; onSave: () => void }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  const addPhoto = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const photo: PhotoItem = {
        id: uid(),
        url: e.target?.result as string,
        caption: file.name.replace(/\.[^.]+$/, ""),
        categorie: "avant",
      };
      const updated = { ...form, photos: [...form.photos, photo] };
      setForm(updated);
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const files = Array.from(e.dataTransfer.files).filter((f) => f.type.startsWith("image/"));
    files.forEach(addPhoto);
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    files.forEach(addPhoto);
  };

  const updatePhoto = (id: string, key: keyof PhotoItem, val: string) => {
    setForm({
      ...form,
      photos: form.photos.map((p) => (p.id === id ? { ...p, [key]: val } : p)),
    });
  };

  const [confirmDelete, setConfirmDelete] = useState<{
    isOpen: boolean;
    message: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    message: "",
    onConfirm: () => {},
  });

  const deletePhoto = (id: string) => {
    setConfirmDelete({
      isOpen: true,
      message: "Voulez-vous vraiment supprimer cette photo ?",
      onConfirm: () => {
        setForm({ ...form, photos: form.photos.filter((p) => p.id !== id) });
      },
    });
  };

  return (
    <div>
      <h3 className="section-title">Chantier & Photos</h3>

      {/* Upload zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => fileRef.current?.click()}
        className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors mb-6 ${
          dragOver ? "border-accent bg-accent/5" : "border-accent/30 hover:border-accent/50"
        }`}
      >
        <Upload size={32} className="mx-auto text-muted-foreground mb-3" />
        <p className="text-sm text-muted-foreground">Glissez vos photos ici ou cliquez pour sélectionner</p>
        <p className="text-xs text-muted-foreground mt-1">PNG, JPG acceptés</p>
        <input ref={fileRef} type="file" accept="image/png,image/jpeg" multiple className="hidden" onChange={handleFileInput} />
      </div>

      {/* Photos grid */}
      {form.photos.length > 0 && (
        <div className="grid grid-cols-3 gap-3 mb-6">
          {form.photos.map((photo) => (
            <div key={photo.id} className="bg-card border border-border rounded-lg overflow-hidden">
              <div className="aspect-video bg-muted relative">
                <img src={photo.url} alt={photo.caption} className="w-full h-full object-cover" />
                <button
                  onClick={() => deletePhoto(photo.id)}
                  className="absolute top-2 right-2 p-1 bg-foreground/60 text-background rounded hover:bg-foreground/80"
                >
                  <X size={14} />
                </button>
              </div>
              <div className="p-3 space-y-2">
                <input
                  value={photo.caption}
                  onChange={(e) => updatePhoto(photo.id, "caption", e.target.value)}
                  className="form-input h-8 text-[12px]"
                  placeholder="Légende..."
                />
                <select
                  value={photo.categorie}
                  onChange={(e) => updatePhoto(photo.id, "categorie", e.target.value)}
                  className="form-input h-8 text-[12px]"
                >
                  {PHOTO_CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
              </div>
            </div>
          ))}
        </div>
      )}

      <button onClick={onSave} className="btn-gold">Enregistrer</button>
      <ConfirmModal
        isOpen={confirmDelete.isOpen}
        message={confirmDelete.message}
        onConfirm={() => {
          setConfirmDelete({ isOpen: false, message: "", onConfirm: () => {} });
          confirmDelete.onConfirm();
        }}
        onCancel={() => setConfirmDelete({ isOpen: false, message: "", onConfirm: () => {} })}
      />
    </div>
  );
}
