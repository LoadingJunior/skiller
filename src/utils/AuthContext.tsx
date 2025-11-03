import React, { createContext, useContext, useEffect, useState } from "react";

type AuthContextType = {
  user: string | null;
  setUser: (id: string | null) => void;
  login: (id: string) => void;
  loading: boolean;
  logout: () => void;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const id = localStorage.getItem("id");
    setUser(id);
    setLoading(false);
  }, []);

  const login = (id: string) => {
    localStorage.setItem("id", id);
    setUser(id);
  };

  const logout = () => {
    localStorage.removeItem("id");
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, setUser, login, loading, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};
