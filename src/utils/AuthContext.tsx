import React, { createContext, useContext, useEffect, useState } from "react";
import { User } from "../types";
import { supabase } from "../lib/supabase";

type AuthContextType = {
  user: User | null;
  setUser: (user: User | null) => void;
  login: (id: string) => void;
  loading: boolean;
  logout: () => void;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  async function getUser(id: string): Promise<User | null> {
    const { data, error } = await supabase.from("users").select("*").eq("id", id).single();
    if (error) {
      console.error("Error fetching user:", error);
      return null;
    }
    return data as User;
  }

  useEffect(() => {
    const id = localStorage.getItem("id");
    if(id){
      getUser(id).then((userData) => {
        setUser(userData);
      });
    }
    setLoading(false);
  }, []);

  const login = async (id: string) => {
    localStorage.setItem("id", id);
    setUser(await getUser(id));
  };

  const logout = () => {
    localStorage.removeItem("id");
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, setUser, login, loading, logout }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};
