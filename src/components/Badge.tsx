export const Badge: React.FC<{
  title: string;
  link?: string;
}> = ({ title, link }) => {
  return (
    <div>
      <span className="text-center font-semibold text-sm transform -rotate-12">
        <img src={link} alt={title} className="w-40 h-40 mb-2" />
      </span>
    </div>
  );
};
