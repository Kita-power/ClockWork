"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type UserRole = "consultant" | "manager" | "finance" | "admin";

type UserState = {
  id: string;
  email: string;
  fullName: string;
  role: UserRole | null;
  isActive: boolean;
  isLoading: boolean;
  error: string | null;
};


const EMPTY_STATE: UserState = {
  id: "",
  email: "",
  fullName: "",
  role: null,
  isActive: false,
  isLoading: true,
  error: null,
};

export function useUser() {
  
  const [state, setState] = useState<UserState>(EMPTY_STATE);

  useEffect(() => {
    let isMounted = true;
    const supabase = createClient();

    async function loadUser() {
      const { data: authData, error: authError } = await supabase.auth.getUser();

      if (!isMounted) return;
      if (authError || !authData.user) {
        setState((prev) => ({
          ...prev,
          isLoading: false,
          error: authError?.message ?? "No authenticated user",
        }));
        return;
      }

      const authUser = authData.user;
      const { data: profile, error: profileError } = await supabase
        .from("users")
        .select("id, email, full_name, role, is_active")
        .eq("id", authUser.id)
        .single();

      if (!isMounted) return;
      if (profileError || !profile) {
        setState({
          id: authUser.id,
          email: authUser.email ?? "",
          fullName:
            (authUser.user_metadata?.full_name as string | undefined) ?? "",
          role: null,
          isActive: false,
          isLoading: false,
          error: profileError?.message ?? "User profile not found",
        });
        return;
      }

      setState({
        id: profile.id,
        email: profile.email,
        fullName: profile.full_name,
        role: profile.role as UserRole,
        isActive: profile.is_active,
        isLoading: false,
        error: null,
      });
    }

    loadUser();

    
    const { data: authListener } = supabase.auth.onAuthStateChange((event) => {
      if (!isMounted) return;

      if (event === "SIGNED_OUT") {
        setState({ ...EMPTY_STATE, isLoading: false, error: null });
        return;
      }
      loadUser();
    });

    return () => {
      isMounted = false;
      authListener?.subscription.unsubscribe();
    };
  }, []);

  return useMemo(
    () => ({
      ...state,
      isAuthenticated: Boolean(state.id),
      isAdmin: state.role === "admin" && state.isActive,
    }),
    [state],
  );
}