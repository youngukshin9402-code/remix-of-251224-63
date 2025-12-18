import React, { createContext, useContext, useEffect, useState } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

type UserType = "user" | "guardian" | "coach" | "admin";

interface Profile {
  id: string;
  nickname: string | null;
  phone: string | null;
  user_type: UserType;
  subscription_tier: "basic" | "premium";
  current_points: number;
  assigned_coach_id: string | null;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const isUserType = (v: unknown): v is UserType =>
  v === "user" || v === "guardian" || v === "coach" || v === "admin";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async (userId: string) => {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .maybeSingle();

    if (error) {
      console.error("Error fetching profile:", error);
      return null;
    }
    return data as Profile | null;
  };

  const ensureProfile = async (authUser: User) => {
    const existing = await fetchProfile(authUser.id);
    if (existing) return existing;

    const meta = (authUser.user_metadata || {}) as Record<string, unknown>;
    const nickname =
      typeof meta.nickname === "string"
        ? meta.nickname
        : authUser.email
          ? authUser.email.split("@")[0]
          : null;

    const user_type: UserType = isUserType(meta.user_type) ? meta.user_type : "user";

    const { data, error } = await supabase
      .from("profiles")
      .upsert(
        {
          id: authUser.id,
          nickname,
          phone: null,
          user_type,
          subscription_tier: "basic",
          current_points: 0,
          assigned_coach_id: null,
        },
        { onConflict: "id" }
      )
      .select("*")
      .single();

    if (error) {
      console.error("Error creating profile:", error);
      return null;
    }

    return data as Profile;
  };

  const refreshProfile = async () => {
    if (!user) return;
    const newProfile = await fetchProfile(user.id);
    setProfile(newProfile);
  };

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, nextSession) => {
      setSession(nextSession);
      setUser(nextSession?.user ?? null);

      if (!nextSession?.user) {
        setProfile(null);
        setLoading(false);
        return;
      }

      // Avoid potential deadlock by deferring profile work
      setTimeout(() => {
        ensureProfile(nextSession.user)
          .then(setProfile)
          .finally(() => setLoading(false));
      }, 0);
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) {
        ensureProfile(session.user)
          .then(setProfile)
          .finally(() => setLoading(false));
      } else {
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setProfile(null);
  };

  return (
    <AuthContext.Provider value={{ user, session, profile, loading, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
