import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User, Session } from "@supabase/supabase-js";
import type { AppRole, UserRole, Profile } from "@/lib/types";

interface AuthState {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  roles: AppRole[];
  loading: boolean;
  isAuthenticated: boolean;
}

export function useAuth() {
  const [state, setState] = useState<AuthState>({
    user: null,
    session: null,
    profile: null,
    roles: [],
    loading: true,
    isAuthenticated: false,
  });

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setState(prev => ({
          ...prev,
          user: session?.user ?? null,
          session,
          isAuthenticated: !!session?.user,
        }));

        if (session?.user) {
          // Fetch profile and roles
          setTimeout(async () => {
            const [profileRes, rolesRes] = await Promise.all([
              supabase
                .from("profiles")
                .select("*")
                .eq("user_id", session.user.id)
                .maybeSingle(),
              supabase
                .from("user_roles")
                .select("role")
                .eq("user_id", session.user.id),
            ]);

            setState(prev => ({
              ...prev,
              profile: profileRes.data as Profile | null,
              roles: (rolesRes.data?.map((r: { role: AppRole }) => r.role) ?? []) as AppRole[],
              loading: false,
            }));
          }, 0);
        } else {
          setState(prev => ({
            ...prev,
            profile: null,
            roles: [],
            loading: false,
          }));
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        setState(prev => ({ ...prev, loading: false }));
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const hasRole = (role: AppRole) => state.roles.includes(role);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return {
    ...state,
    hasRole,
    signOut,
  };
}
