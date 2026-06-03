import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import {
  detectLocalStorageData,
  getLocalStorageCounts,
  getSupabaseCounts,
  migrateLocalStorageToSupabase,
  MigrationCounts,
} from "@/lib/safe-migration";
import { toast } from "sonner";
import { CloudLightning, Database, RefreshCw, AlertTriangle, CheckCircle2 } from "lucide-react";

export function MigrationModal() {
  const [showModal, setShowModal] = useState(false);
  const [localCounts, setLocalCounts] = useState<MigrationCounts | null>(null);
  const [dbCounts, setDbCounts] = useState<MigrationCounts | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [syncCompleted, setSyncCompleted] = useState(false);

  useEffect(() => {
    // Only fetch counts and show modal if local storage data is detected
    if (detectLocalStorageData()) {
      const locals = getLocalStorageCounts();
      setLocalCounts(locals);

      getSupabaseCounts()
        .then((dbVal) => {
          setDbCounts(dbVal);
          setShowModal(true);
        })
        .catch((err) => {
          console.error("Error fetching Supabase counts for migration:", err);
        });
    }
  }, []);

  const handleSync = async () => {
    setSyncing(true);
    try {
      const result = await migrateLocalStorageToSupabase();
      if (result.success) {
        setSyncCompleted(true);
        toast.success("Synchronisation terminée avec succès !");
        
        // Refresh counts to show final status
        const updatedDbs = await getSupabaseCounts();
        setDbCounts(updatedDbs);
        
        // Close modal after showing success screen for a brief moment
        setTimeout(() => {
          setShowModal(false);
          // Reload page to force application state reload from Supabase
          window.location.reload();
        }, 2000);
      } else {
        toast.error("Certaines erreurs sont survenues lors de la synchronisation.");
        console.error("Migration errors:", result.errors);
      }
    } catch (err: any) {
      toast.error(err.message || "La migration a échoué.");
    } finally {
      setSyncing(false);
    }
  };

  const handleSkip = () => {
    localStorage.setItem("oralis_migration_status", "skipped");
    setShowModal(false);
    toast.info("Synchronisation ignorée. Vous pouvez toujours vider vos données locales dans les paramètres.");
  };

  if (!showModal) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg bg-card border border-border/80 p-6 shadow-elevated rounded-xl flex flex-col gap-4">
        
        {/* Header */}
        <div className="flex items-start gap-4">
          <div className="p-3 rounded-full bg-accent/15 text-accent shrink-0">
            {syncCompleted ? (
              <CheckCircle2 size={28} className="text-emerald-500" />
            ) : syncing ? (
              <RefreshCw size={28} className="animate-spin text-accent" />
            ) : (
              <CloudLightning size={28} />
            )}
          </div>
          <div>
            <h2 className="font-display text-xl font-bold text-foreground">
              {syncCompleted ? "Synchronisation réussie !" : "Synchroniser avec le Cloud Supabase ?"}
            </h2>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed font-body">
              {syncCompleted
                ? "Vos données locales ont été transférées en toute sécurité vers votre compte Supabase Cloud."
                : "Des données locales ont été détectées sur cet appareil. Souhaitez-vous les copier vers votre base de données Supabase Cloud sécurisée ?"}
            </p>
          </div>
        </div>

        {/* Table comparison */}
        {localCounts && dbCounts && (
          <div className="border border-border/50 rounded-lg overflow-hidden my-2">
            <table className="w-full text-left text-xs font-body">
              <thead className="bg-sidebar-accent/30 text-muted-foreground uppercase text-[10px] tracking-wider border-b border-border/50">
                <tr>
                  <th className="py-2 px-3">Module</th>
                  <th className="py-2 px-3 text-center">Données locales</th>
                  <th className="py-2 px-3 text-center">Dans le Cloud</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/30 text-foreground/80">
                <tr>
                  <td className="py-2.5 px-3 font-medium">Clients</td>
                  <td className="py-2.5 px-3 text-center font-mono">{localCounts.clients}</td>
                  <td className="py-2.5 px-3 text-center font-mono text-muted-foreground">{dbCounts.clients}</td>
                </tr>
                <tr>
                  <td className="py-2.5 px-3 font-medium">Devis</td>
                  <td className="py-2.5 px-3 text-center font-mono">{localCounts.devis}</td>
                  <td className="py-2.5 px-3 text-center font-mono text-muted-foreground">{dbCounts.devis}</td>
                </tr>
                <tr>
                  <td className="py-2.5 px-3 font-medium">Commandes</td>
                  <td className="py-2.5 px-3 text-center font-mono">{localCounts.commandes}</td>
                  <td className="py-2.5 px-3 text-center font-mono text-muted-foreground">{dbCounts.commandes}</td>
                </tr>
                <tr>
                  <td className="py-2.5 px-3 font-medium">Factures</td>
                  <td className="py-2.5 px-3 text-center font-mono">{localCounts.factures}</td>
                  <td className="py-2.5 px-3 text-center font-mono text-muted-foreground">{dbCounts.factures}</td>
                </tr>
                <tr>
                  <td className="py-2.5 px-3 font-medium">Fournisseurs</td>
                  <td className="py-2.5 px-3 text-center font-mono">{localCounts.fournisseurs}</td>
                  <td className="py-2.5 px-3 text-center font-mono text-muted-foreground">{dbCounts.fournisseurs}</td>
                </tr>
                <tr>
                  <td className="py-2.5 px-3 font-medium">Modèles</td>
                  <td className="py-2.5 px-3 text-center font-mono">{localCounts.modeles}</td>
                  <td className="py-2.5 px-3 text-center font-mono text-muted-foreground">{dbCounts.modeles}</td>
                </tr>
                <tr>
                  <td className="py-2.5 px-3 font-medium">Paramètres (clés)</td>
                  <td className="py-2.5 px-3 text-center font-mono">{localCounts.settings}</td>
                  <td className="py-2.5 px-3 text-center font-mono text-muted-foreground">{dbCounts.settings}</td>
                </tr>
              </tbody>
            </table>
          </div>
        )}

        {/* Warning notice */}
        {!syncCompleted && (
          <div className="flex items-start gap-2.5 bg-amber-500/10 border border-amber-500/30 p-3 rounded-lg text-amber-500 text-xs font-body leading-normal">
            <AlertTriangle size={16} className="shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-amber-600 dark:text-amber-400">Important : Sécurité des données</p>
              <p className="mt-0.5 opacity-90">
                Vos données locales ne seront **pas effacées** de cet appareil. Elles seront fusionnées ou mises à jour
                dans le cloud. Vous pourrez vider manuellement votre espace de stockage local dans l'onglet Paramètres plus tard.
              </p>
            </div>
          </div>
        )}

        {/* Footer Actions */}
        {!syncCompleted && (
          <div className="flex gap-2.5 justify-end mt-2">
            <button
              onClick={handleSkip}
              disabled={syncing}
              className="btn-ghost border border-border text-xs px-4 h-9 font-semibold"
            >
              Ignorer
            </button>
            <button
              onClick={handleSync}
              disabled={syncing}
              className="btn-gold text-xs px-5 h-9 font-semibold flex items-center gap-2"
            >
              {syncing ? (
                <>
                  <RefreshCw size={14} className="animate-spin" />
                  <span>Synchronisation...</span>
                </>
              ) : (
                <>
                  <Database size={14} />
                  <span>Synchroniser</span>
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
