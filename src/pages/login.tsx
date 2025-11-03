import React, { useState } from "react";
import { supabase } from "../lib/supabase";
import { redirect, useNavigate } from "react-router-dom";
import { useAuth } from "../utils/AuthContext";

const Login: React.FC = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { data: user, error: userError } = await supabase
        .from("users")
        .select("*")
        .eq("username", username)
        .single();

        
        if (!user) {
          await supabase.from("users").insert([{ username }]);
          const { data: user, error: userError } = await supabase
          .from("users")
          .select("*")
          .eq("username", username)
          .single();
          if (user) {
            login(user.id);
          }
        } else {
        login(user.id);
      }
      navigate('/')
    } catch (error) {
      const authError = error as { message: string };
      setError(authError.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col justify-center items-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8">
        <div>
          <h1 className="text-5xl font-bold text-purple-700 text-left">
            <img
              src="/logo_name.svg"
              alt="Skiller Text"
              className="inline-block w-28"
            />
          </h1>

          <p className="mt-4 text-xl text-gray-600 text-left">
            O campo de treino para o seu principal diferencial no mercado
            pós-IA.
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleLogin}>
          <div>
            <label
              htmlFor="username"
              className="block text-sm font-medium text-gray-700"
            >
              Nome de Usuário
            </label>
            <div className="mt-1">
              <input
                id="username"
                name="username"
                type="text"
                autoComplete="username"
                required
                placeholder="Seu nome de usuário"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="block w-full px-4 py-3 border border-gray-300 rounded-lg text-black shadow-sm focus:outline-none focus:ring-purple-500 focus:border-purple-500 sm:text-sm"
              />
            </div>
          </div>

          {/* <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-gray-700"
            >
              Email
            </label>
            <div className="mt-1">
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                placeholder="seu@exemplo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="block w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-purple-500 focus:border-purple-500 sm:text-sm"
              />
            </div>
          </div> */}

          {/* <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-gray-700"
            >
              Senha
            </label>
            <div className="mt-1">
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="block w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-purple-500 focus:border-purple-500 sm:text-sm"
              />
            </div>
          </div> */}

          {error && (
            <div className="text-center text-sm text-red-600">{error}</div>
          )}

          <div>
            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-lg font-medium text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:opacity-50"
            >
              {loading ? "Entrando..." : "Entrar"}
            </button>
          </div>
        </form>

        {/* Link de Cadastro */}
        <p className="mt-6 text-center text-sm text-gray-600">
          Ainda não tem conta?{" "}
          <a
            href="#"
            className="font-medium text-purple-600 hover:text-purple-500"
          >
            Cadastre-se
          </a>
        </p>
      </div>
    </div>
  );
};

export default Login;
