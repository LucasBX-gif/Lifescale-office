import { useEffect, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";

export function useAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // onAuthStateChange fires for both existing sessions AND new sessions
    // from the OAuth URL hash — so we use it as the single source of truth.
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      setLoading(false);
    });

    // Kick off session detection (processes URL hash for implicit flow)
    supabase.auth.getSession();

    return () => subscription.unsubscribe();
  }, []);

  return {
    session,
    user: session?.user ?? null,
    loading,
  } as {
    session: Session | null;
    user: User | null;
    loading: boolean;
  };
}
