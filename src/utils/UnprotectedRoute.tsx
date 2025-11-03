import React from "react";
import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "./AuthContext";

export const UnprotectedRoute: React.FC = () => {
  const {user} = useAuth();

  if (user) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
};