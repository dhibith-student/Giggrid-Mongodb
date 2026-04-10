import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;

    const loadProfile = async (userId) => {
      try {
        const { data, error } = await supabase
          .from("users")
          .select("*")
          .eq("id", userId)
          .maybeSingle();

        if (error) {
          throw error;
        }

        if (mounted) {
          setProfile(data || null);
          setError(data ? "" : "Profile not found for the authenticated user.");
        }
      } catch (error) {
        console.error("Failed to load user profile:", error);
        if (mounted) {
          setProfile(null);
          setError(error?.message || "Failed to load user profile.");
        }
      }
    };

    const syncSessionState = async (nextSession) => {
      try {
        if (mounted) {
          setLoading(true);
          setError("");
        }

        if (!mounted) return;
        setSession(nextSession);

        if (nextSession?.user) {
          await loadProfile(nextSession.user.id);
        } else {
          setProfile(null);
          setError("");
        }
      } catch (error) {
        console.error("Failed to sync auth session:", error);
        if (mounted) {
          setSession(null);
          setProfile(null);
          setError(error?.message || "Failed to sync auth session.");
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    const loadSession = async () => {
      try {
        if (mounted) {
          setLoading(true);
          setError("");
        }

        const { data, error } = await supabase.auth.getSession();
        if (error) {
          throw error;
        }

        await syncSessionState(data.session);
      } catch (error) {
        console.error("Failed to load auth session:", error);
        if (mounted) {
          setSession(null);
          setProfile(null);
          setError(error?.message || "Failed to load auth session.");
          setLoading(false);
        }
      }
    };

    loadSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (mounted) {
        setLoading(true);
        setError("");
      }

      // Supabase warns against awaiting other Supabase calls inside this callback,
      // because it can deadlock the client after a successful auth event.
      window.setTimeout(() => {
        void syncSessionState(nextSession);
      }, 0);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const value = useMemo(
    () => ({
      session,
      user: session?.user ?? null,
      profile,
      loading,
      error,
      refreshProfile: async () => {
        if (!session?.user?.id) return;
        const { data, error } = await supabase
          .from("users")
          .select("*")
          .eq("id", session.user.id)
          .maybeSingle();

        if (error) {
          console.error("Failed to refresh profile:", error);
          return;
        }

        setProfile(data || null);
      },
    }),
    [error, loading, profile, session],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
