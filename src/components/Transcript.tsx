import React, { useRef, useEffect } from 'react';
import type { TranscriptEntry } from '../types';
import { Speaker } from '../types';
import { FaMicrophone } from 'react-icons/fa';

interface TranscriptProps {
  transcript: TranscriptEntry[];
  IA_name?: string;
}

const Transcript: React.FC<TranscriptProps> = ({ transcript, IA_name }) => {
  const endOfMessagesRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endOfMessagesRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [transcript]);

  return (
    <div className="grow p-4 md:p-6 space-y-6 overflow-y-auto">
      {transcript.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-full text-gray-400">
          <FaMicrophone className="w-16 h-16 mb-4" />
          <p>Clique no botão de microfone para iniciar sua sessão.</p>
        </div>
      ) : (
        transcript.map((entry) => (
          <div
            key={entry.id}
            className={`flex items-start gap-3 ${
              entry.speaker === Speaker.User ? 'justify-end' : ''
            }`}
          >
            {entry.speaker === Speaker.Model && (
              <div className="w-8 h-8 rounded-full bg-indigo-500 shrink-0 flex items-center justify-center font-bold text-sm">
                {IA_name?.charAt(0)}
              </div>
            )}
            <div
              className={`max-w-xl p-3 rounded-xl ${
                entry.speaker === Speaker.User
                  ? 'bg-blue-600 text-white rounded-br-none'
                  : 'bg-gray-700 text-gray-200 rounded-bl-none'
              } ${!entry.isFinal ? 'opacity-70' : ''}`}
            >
              <p className="whitespace-pre-wrap">{entry.text}</p>
            </div>
             {entry.speaker === Speaker.User && (
              <div className="w-8 h-8 rounded-full bg-gray-600 shrink-0 flex items-center justify-center font-bold text-sm">
                A
              </div>
            )}
          </div>
        ))
      )}
      <div ref={endOfMessagesRef} />
    </div>
  );
};

export default Transcript;
