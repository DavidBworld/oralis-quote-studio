import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { Mail, Lock, LogIn, UserPlus } from "lucide-react";

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  // Redirection post-login
  const from = (location.state as any)?.from?.pathname || "/";

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error("Veuillez remplir tous les champs.");
      return;
    }

    setLoading(true);
    try {
      if (isSignUp) {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
        });
        if (error) throw error;
        if (data.user && !data.session) {
          toast.success("Inscription réussie ! Un e-mail de confirmation vous a été envoyé.");
        } else if (data.session) {
          toast.success("Compte créé et connecté avec succès !");
          navigate(from, { replace: true });
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        toast.success("Connexion réussie !");
        navigate(from, { replace: true });
      }
    } catch (err: any) {
      toast.error(err.message || "Une erreur est survenue lors de l'authentification.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-sidebar via-background to-sidebar flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-card/65 backdrop-blur-md border border-border/80 p-8 shadow-elevated rounded-2xl">
        
        {/* Brand Header */}
        <div className="text-center mb-8">
          <h1 className="font-display text-3xl font-bold text-accent tracking-widest">
            ORALIS
          </h1>
          <p className="text-[12px] text-muted-foreground mt-1.5 tracking-wide font-body">
            Quote Studio — Supabase Cloud
          </p>
        </div>

        {/* Form Title & Toggle */}
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-lg font-semibold text-foreground">
            {isSignUp ? "Créer un compte" : "Se connecter"}
          </h2>
          <button
            type="button"
            onClick={() => {
              setIsSignUp(!isSignUp);
              setEmail("");
              setPassword("");
            }}
            className="text-xs text-accent hover:underline flex items-center gap-1"
          >
            {isSignUp ? "Déjà un compte ? Connexion" : "Nouveau ? Créer un compte"}
          </button>
        </div>

        {/* Input Form */}
        <form onSubmit={handleAuth} className="space-y-4">
          <div>
            <label className="form-label mb-1.5 flex items-center gap-1.5">
              <Mail size={14} className="text-muted-foreground" />
              <span>Adresse e-mail</span>
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="votre.nom@pergola-oralis.com"
              className="form-input"
              required
              disabled={loading}
            />
          </div>

          <div>
            <label className="form-label mb-1.5 flex items-center gap-1.5">
              <Lock size={14} className="text-muted-foreground" />
              <span>Mot de passe</span>
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="form-input"
              required
              disabled={loading}
            />
          </div>

          <div className="pt-4">
            <button
              type="submit"
              disabled={loading}
              className="w-full btn-gold font-semibold flex items-center justify-center gap-2 h-10"
            >
              {loading ? (
                <div className="w-5 h-5 rounded-full border-2 border-accent-foreground border-t-transparent animate-spin"></div>
              ) : isSignUp ? (
                <>
                  <UserPlus size={16} />
                  <span>S'inscrire</span>
                </>
              ) : (
                <>
                  <LogIn size={16} />
                  <span>Se connecter</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
