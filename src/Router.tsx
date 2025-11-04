import React from "react";
import { createBrowserRouter, redirect, RouterProvider } from "react-router-dom";

import { ProtectedRoute } from "./utils/ProtectedRoute";
import { UnprotectedRoute } from "./utils/UnprotectedRoute";
import Login from "./pages/login";
import { Profile } from "./pages/Profile";
import { Session } from "./pages/Session";

const router = createBrowserRouter([
  {
    element: <UnprotectedRoute />, 
    children: [
      {
        path: "/login",
        element: <Login />,
      },
    ],
  },
  {
    element: <ProtectedRoute />, 
    children: [
      {
        path: "/",
        element: <Profile />, 
      },
      {
        path: "/session",
        element: <Session />,
      }
    ], 
  },
  {
    path: "*",
    loader: () => redirect("/"),
  }
]);

export const AppRouter: React.FC = () => {
  return <RouterProvider router={router} />;
};