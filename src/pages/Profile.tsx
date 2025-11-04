import React, { use, useEffect } from "react";
import { FaUser } from "react-icons/fa";
import { Badge } from "../components/Badge";
import { Badge as BadgeType } from "../types";
import { useAuth } from "../utils/AuthContext";
import { HiDocumentReport } from "react-icons/hi";
import { RiSpeakAiFill } from "react-icons/ri";
import { getBadgesUser } from "../utils/api";
import { Footer } from "../components/Footer";
import { BiLogOut } from "react-icons/bi";
import { useNavigate } from "react-router-dom";

export const Profile: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [badges, setBadges] = React.useState<BadgeType[]>([]);
  useEffect(() => {
    const fetchBadges = async () => {
      if (!user?.id) return;
      const userBadges = await getBadgesUser(user?.id);
      setBadges(userBadges);
    };
    fetchBadges();
  }, [user?.id]);
  return (
    <div className="flex flex-col min-h-screen bg-gray-50 text-gray-800">
      <div className="bg-[#1E0037] h-5"></div>
      <header className="p-4">
        <h1 className="text-xl font-bold text-center text-[#111827">
          Meu Passaporte de Soft Skills
        </h1>
        <div onClick={() => {
            logout()
            navigate("/login")
        }} className="bg-[#CC0047] p-2 h-12 w-12 rounded-full justify-center items-center flex absolute top-10 right-5 cursor-pointer">
            <BiLogOut className="text-white h-10 w-10" />
        </div>
      </header>

      <main className="grow p-6 space-y-6">
        <div className="flex items-center space-x-4">
          <div className="w-20 h-20 rounded-full bg-gray-200 justify-center items-center flex text-3xl font-bold text-gray-500">
            {user?.username.charAt(0).toUpperCase()}
          </div>
          <div>
            <h2 className="text-2xl font-bold">{user?.username}</h2>
            <span className="text-gray-500">@{user?.username}</span>
          </div>
        </div>

        <div>
          <h3 className="text-lg font-semibold text-gray-700">
            Minhas Credenciais
          </h3>
          <div className="flex space-x-2 mt-2">
            <span className="px-4 py-2 bg-[#8238B3] text-white font-semibold rounded-lg text-sm">
              Praticante de CNV
            </span>
            <span className="px-4 py-2 bg-gray-300 text-gray-500 font-semibold rounded-lg text-sm">
              Entrevista (Bloq)
            </span>
          </div>
        </div>

        <div>
          <button className="w-full py-3 px-4 bg-white border border-gray-300 rounded-lg text-purple-600 font-semibold shadow-sm hover:bg-gray-50">
            Adicionar ao LinkedIn
          </button>
        </div>

        <div className="flex items-center">
          <hr className="grow border-t-2 border-purple-300" />
          <h2 className="px-4 text-2xl font-bold text-purple-800">
            Conquistas!
          </h2>
          <hr className="grow border-t-2 border-purple-300" />
        </div>

        {badges.length > 0 ? (
          <div className="grid grid-cols-2 gap-8 justify-items-center">
            {badges.map((badge) => (
              <Badge key={badge.id} title={badge.name} link={badge.image_url} />
            ))}
          </div>
        ) : (
          <div className="flex justify-center items-center h-32 text-gray-400">
            <span>
              Continue se esforçando, grandes conquistas estão a caminho!
            </span>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
};
