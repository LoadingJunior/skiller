
import React from 'react';
import type { SessionState } from '../types';

interface StatusIndicatorProps {
  state: SessionState;
}

const StatusIndicator: React.FC<StatusIndicatorProps> = ({ state }) => {
  const statusConfig = {
    idle: { text: 'Not Connected', color: 'bg-gray-500' },
    connecting: { text: 'Connecting...', color: 'bg-yellow-500 animate-pulse' },
    connected: { text: 'Connected', color: 'bg-green-500' },
    error: { text: 'Error', color: 'bg-red-500' },
  };

  const { text, color } = statusConfig[state];

  return (
    <div className="flex items-center gap-2">
      <div className={`w-3 h-3 rounded-full ${color}`}></div>
      <span className="text-sm text-gray-400 font-medium">{text}</span>
    </div>
  );
};

export default StatusIndicator;
