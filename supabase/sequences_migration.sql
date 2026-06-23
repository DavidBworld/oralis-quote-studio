-- 1. Création de la table de séquence
CREATE TABLE IF NOT EXISTS public.sequences_numerotation (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users NOT NULL,
    type TEXT NOT NULL, -- 'devis' ou 'facture'
    annee INTEGER NOT NULL,
    dernier_numero INTEGER NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (user_id, type, annee)
);

ALTER TABLE public.sequences_numerotation ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their sequences" 
    ON public.sequences_numerotation 
    FOR ALL 
    USING (auth.uid() = user_id) 
    WITH CHECK (auth.uid() = user_id);

-- 2. Fonction RPC Atomique : Incrémentation automatique
CREATE OR REPLACE FUNCTION public.increment_sequence(p_type TEXT, p_annee INTEGER)
RETURNS INTEGER AS $$
DECLARE
    v_new_num INTEGER;
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Non authentifié';
    END IF;

    INSERT INTO public.sequences_numerotation (user_id, type, annee, dernier_numero)
    VALUES (auth.uid(), p_type, p_annee, 250)
    ON CONFLICT (user_id, type, annee)
    DO UPDATE SET 
        dernier_numero = public.sequences_numerotation.dernier_numero + 1, 
        updated_at = NOW()
    RETURNING dernier_numero INTO v_new_num;
    
    RETURN v_new_num;
END;
$$ LANGUAGE plpgsql SECURITY INVOKER;

-- 3. Fonction RPC Atomique : Resynchronisation
CREATE OR REPLACE FUNCTION public.resync_sequence(p_type TEXT, p_annee INTEGER, p_nouvelle_valeur INTEGER)
RETURNS VOID AS $$
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Non authentifié';
    END IF;

    INSERT INTO public.sequences_numerotation (user_id, type, annee, dernier_numero)
    VALUES (auth.uid(), p_type, p_annee, GREATEST(250, p_nouvelle_valeur))
    ON CONFLICT (user_id, type, annee)
    DO UPDATE SET 
        dernier_numero = GREATEST(public.sequences_numerotation.dernier_numero, EXCLUDED.dernier_numero), 
        updated_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY INVOKER;

-- 4. Initialisation (Seed)
INSERT INTO public.sequences_numerotation (user_id, type, annee, dernier_numero)
VALUES 
    ('86fe8f7c-af34-4532-83ba-884d01b8b1d0', 'devis', 2026, 260),
    ('86fe8f7c-af34-4532-83ba-884d01b8b1d0', 'facture', 2026, 255)
ON CONFLICT (user_id, type, annee) 
DO UPDATE SET dernier_numero = GREATEST(public.sequences_numerotation.dernier_numero, EXCLUDED.dernier_numero);
