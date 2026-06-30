/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import api from "../api";

const UserContext = createContext(null);

export function UserProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loadingUser, setLoadingUser] = useState(true);

  const refreshUser = useCallback(async () => {
    const token = localStorage.getItem("token");
    if (!token) {
      setUser(null);
      setLoadingUser(false);
      return null;
    }

    try {
      const res = await api.get("/user/profile");
      setUser(res.data || null);
      return res.data || null;
    } catch {
      setUser(null);
      return null;
    } finally {
      setLoadingUser(false);
    }
  }, []);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  const updateCredits = useCallback((credits) => {
    if (typeof credits !== "number") return;
    setUser((prev) => {
      if (prev && prev.credits === credits) return prev;
      return prev ? { ...prev, credits } : prev;
    });
  }, []);

  const value = useMemo(
    () => ({ user, setUser, loadingUser, refreshUser, updateCredits }),
    [user, loadingUser, refreshUser, updateCredits],
  );

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
}

export function useUser() {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error("useUser must be used within UserProvider");
  }
  return context;
}
