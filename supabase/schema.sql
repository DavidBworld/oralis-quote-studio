-- SQL Schema for Oralis Quote Studio (Supabase Migration)
-- Date: 2026-06-03

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==========================================================
-- TABLE: clients
-- ==========================================================
CREATE TABLE IF NOT EXISTS public.clients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users NOT NULL,
    local_id TEXT,
    code TEXT,
    type TEXT,
    statut TEXT,
    favori BOOLEAN DEFAULT false,
    prenom TEXT,
    nom TEXT,
    societe TEXT,
    email TEXT,
    telephone TEXT,
    mobile TEXT,
    adresse TEXT,
    ville TEXT,
    code_postal TEXT,
    pays TEXT,
    tva_defaut NUMERIC,
    mode_reglement TEXT,
    origine TEXT,
    profil TEXT,
    commercial TEXT,
    note_interne TEXT,
    pipeline TEXT,
    motif_perte TEXT,
    interactions JSONB DEFAULT '[]'::jsonb,
    reste_a_faire JSONB DEFAULT '[]'::jsonb,
    -- TODO: migration vers Supabase Storage pour stocker les fichiers images séparément (ex: photos.url)
    photos JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (user_id, local_id)
);

-- Enable RLS on clients
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

-- Policies for clients
CREATE POLICY "Users can perform CRUD on their own clients"
    ON public.clients
    FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);


-- ==========================================================
-- TABLE: devis
-- ==========================================================
CREATE TABLE IF NOT EXISTS public.devis (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users NOT NULL,
    local_id TEXT,
    numero TEXT,
    date TEXT,
    validite INTEGER,
    statut TEXT,
    client JSONB DEFAULT '{}'::jsonb,
    -- lignes JSONB holds QuoteLine[]
    -- Note: QuoteLine contains 'configuratorState' which is of JSONB structure
    lignes JSONB DEFAULT '[]'::jsonb,
    conditions_paiement TEXT,
    payment_condition_id TEXT,
    delai_realisation TEXT,
    delai TEXT,
    notes TEXT,
    favori BOOLEAN DEFAULT false, -- fusion de oralis_devis_favoris
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (user_id, local_id)
);

-- Enable RLS on devis
ALTER TABLE public.devis ENABLE ROW LEVEL SECURITY;

-- Policies for devis
CREATE POLICY "Users can perform CRUD on their own devis"
    ON public.devis
    FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);


-- ==========================================================
-- TABLE: commandes
-- ==========================================================
CREATE TABLE IF NOT EXISTS public.commandes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users NOT NULL,
    numero TEXT,
    devis_id TEXT,
    devis_numero TEXT,
    client JSONB DEFAULT '{}'::jsonb,
    lignes JSONB DEFAULT '[]'::jsonb,
    reference_affaire TEXT,
    date_livraison TEXT,
    date_creation TEXT,
    statut TEXT,
    total_ht NUMERIC,
    total_ttc NUMERIC,
    factures JSONB DEFAULT '[]'::jsonb,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on commandes
ALTER TABLE public.commandes ENABLE ROW LEVEL SECURITY;

-- Policies for commandes
CREATE POLICY "Users can perform CRUD on their own commandes"
    ON public.commandes
    FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);


-- ==========================================================
-- TABLE: factures
-- ==========================================================
CREATE TABLE IF NOT EXISTS public.factures (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users NOT NULL,
    local_id TEXT,
    numero TEXT,
    type TEXT,
    devis_id TEXT,
    devis_numero TEXT,
    commande_id TEXT,
    client JSONB DEFAULT '{}'::jsonb,
    lignes JSONB DEFAULT '[]'::jsonb,
    total_ht NUMERIC,
    total_ttc  NUMERIC,
    montant_acompte NUMERIC,
    montant_acompte_pct NUMERIC,
    montant_acompte2 NUMERIC,
    montant_acompte2_pct NUMERIC,
    label_acompte1 TEXT,
    label_acompte2 TEXT,
    libelle TEXT,
    date_facture TEXT,
    date_echeance TEXT,
    mode_paiement TEXT,
    mode_reglement TEXT,
    statut TEXT,
    reglements JSONB DEFAULT '[]'::jsonb,
    tva_breakdown JSONB DEFAULT '[]'::jsonb,
    reference_affaire TEXT,
    commercial TEXT,
    interlocuteur TEXT,
    delai TEXT,
    duree_validite TEXT,
    exclure_total_cmd BOOLEAN DEFAULT false,
    retenue_garantie BOOLEAN DEFAULT false,
    marche_rg TEXT,
    date_levee_rg TEXT,
    pct_rg NUMERIC,
    date_rappel1 TEXT,
    date_creation TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (user_id, local_id)
);

-- Enable RLS on factures
ALTER TABLE public.factures ENABLE ROW LEVEL SECURITY;

-- Policies for factures
CREATE POLICY "Users can perform CRUD on their own factures"
    ON public.factures
    FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);


-- ==========================================================
-- TABLE: fournisseurs
-- ==========================================================
CREATE TABLE IF NOT EXISTS public.fournisseurs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users NOT NULL,
    local_id TEXT,
    nom TEXT,
    societe TEXT,
    email TEXT,
    telephone TEXT,
    adresse TEXT,
    categorie TEXT,
    notes TEXT,
    -- TODO: migration vers Supabase Storage pour stocker produits.image (Base64)
    produits JSONB DEFAULT '[]'::jsonb,
    date_creation TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (user_id, local_id)
);

-- Enable RLS on fournisseurs
ALTER TABLE public.fournisseurs ENABLE ROW LEVEL SECURITY;

-- Policies for fournisseurs
CREATE POLICY "Users can perform CRUD on their own fournisseurs"
    ON public.fournisseurs
    FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);


-- ==========================================================
-- TABLE: modeles (Modèles configurateur)
-- ==========================================================
CREATE TABLE IF NOT EXISTS public.modeles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users NOT NULL,
    local_id TEXT,
    -- data contient l'objet AnyModele complet
    -- TODO: migration vers Supabase Storage pour data.image (Base64)
    data JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (user_id, local_id)
);

-- Enable RLS on modeles
ALTER TABLE public.modeles ENABLE ROW LEVEL SECURITY;

-- Policies for modeles
CREATE POLICY "Users can perform CRUD on their own modeles"
    ON public.modeles
    FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);


-- ==========================================================
-- TABLE: settings
-- ==========================================================
CREATE TABLE IF NOT EXISTS public.settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users NOT NULL,
    key TEXT NOT NULL,
    -- TODO: migration vers Supabase Storage pour stocker settings.logo (Base64)
    value JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (user_id, key)
);

-- Enable RLS on settings
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

-- Policies for settings
CREATE POLICY "Users can perform CRUD on their own settings"
    ON public.settings
    FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);


-- ==========================================================
-- TRIGGER: updated_at auto update
-- ==========================================================
CREATE OR REPLACE FUNCTION public.update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER update_clients_updated_at BEFORE UPDATE ON public.clients FOR EACH ROW EXECUTE FUNCTION update_modified_column();
CREATE OR REPLACE TRIGGER update_devis_updated_at BEFORE UPDATE ON public.devis FOR EACH ROW EXECUTE FUNCTION update_modified_column();
CREATE OR REPLACE TRIGGER update_commandes_updated_at BEFORE UPDATE ON public.commandes FOR EACH ROW EXECUTE FUNCTION update_modified_column();
CREATE OR REPLACE TRIGGER update_factures_updated_at BEFORE UPDATE ON public.factures FOR EACH ROW EXECUTE FUNCTION update_modified_column();
CREATE OR REPLACE TRIGGER update_fournisseurs_updated_at BEFORE UPDATE ON public.fournisseurs FOR EACH ROW EXECUTE FUNCTION update_modified_column();
CREATE OR REPLACE TRIGGER update_modeles_updated_at BEFORE UPDATE ON public.modeles FOR EACH ROW EXECUTE FUNCTION update_modified_column();
CREATE OR REPLACE TRIGGER update_settings_updated_at BEFORE UPDATE ON public.settings FOR EACH ROW EXECUTE FUNCTION update_modified_column();
