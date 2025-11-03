import React from "react";
import { createBrowserRouter, redirect, RouterProvider } from "react-router-dom";

import App from "./App";
import Login from "./pages/login";
import { ProtectedRoute } from "./utils/ProtectedRoute";
import { UnprotectedRoute } from "./utils/UnprotectedRoute";

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
        element: <App />, 
      },
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