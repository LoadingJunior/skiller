
import React from 'react';

interface MicrophoneIconProps {
  className?: string;
}

const MicrophoneIcon: React.FC<MicrophoneIconProps> = ({ className }) => {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      viewBox="0 0 24 24" 
      fill="currentColor" 
      className={className}
    >
      <path d="M12 2a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Zm-1 13.93A5.002 5.002 0 0 0 12 21a5 5 0 0 0 5-5.07V11h-2v3.93a3 3 0 0 1-6 0V11H7v3.93ZM19 11h-2V5a5 5 0 0 0-10 0v6H5a1 1 0 0 0 0 2h2v1.07A7.002 7.002 0 0 0 12 23a7 7 0 0 0 7-7.07V13h2a1 1 0 0 0 0-2Z" />
    </svg>
  );
};

export default MicrophoneIcon;
