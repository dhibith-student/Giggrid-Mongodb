import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { getCurrentUser, isAuthenticated, logout as apiLogout } from "../lib/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;

    const loadUser = async () => {
      try {
        if (mounted) {
          setLoading(true);
          setError("");
        }

        if (!isAuthenticated()) {
          if (mounted) {
            setProfile(null);
            setLoading(false);
          }
          return;
        }

        const user = await getCurrentUser();
        if (mounted) {
          setProfile(user || null);
          setError(user ? "" : "Profile not found for the authenticated user.");
        }
      } catch (loadError) {
        console.error("Failed to load auth session:", loadError);
        apiLogout();
        if (mounted) {
          setProfile(null);
          setError(loadError?.message || "Failed to load auth session.");
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    loadUser();

    const onStorage = (event) => {
      if (event.key === "giggrid_token") {
        if (!mounted) return;
        if (event.newValue) {
          void loadUser();
        } else {
          setProfile(null);
          setError("");
          setLoading(false);
        }
      }
    };
    window.addEventListener("storage", onStorage);

    return () => {
      mounted = false;
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  const value = useMemo(
    () => ({
      session: profile ? { user: profile } : null,
      user: profile,
      profile,
      loading,
      error,
      logout: () => {
        apiLogout();
        setProfile(null);
      },
      refreshProfile: async () => {
        if (!isAuthenticated()) {
          setProfile(null);
          return;
        }

        try {
          const user = await getCurrentUser();
          setProfile(user || null);
        } catch (refreshError) {
          console.error("Failed to refresh profile:", refreshError);
        }
      },
    }),
    [error, loading, profile],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
