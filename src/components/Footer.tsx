import { FaUser } from "react-icons/fa"
import { HiDocumentReport } from "react-icons/hi"
import { RiSpeakAiFill } from "react-icons/ri"

export const Footer : React.FC = () => {

  return (
    <footer className="sticky bottom-0 bg-[#1E0037] shadow-inner p-4">
      <nav className="flex justify-around items-center">
        <a href="/" className="text-purple-800 p-2" aria-label="Perfil">
            <FaUser size={28} />
          </a>
          <a
            href="/session"
            className="hover:text-purple-800 text-white p-2"
            aria-label="Speech"
          >
            <RiSpeakAiFill size={28} />
          </a>
          <a
            href="/conquistas"
            className="text-white hover:text-purple-800 p-2"
            aria-label="Report"
          >
            <HiDocumentReport size={28} />
          </a>
        </nav>
      </footer>
    );
};
