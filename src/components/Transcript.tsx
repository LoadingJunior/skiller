import React, { useRef, useEffect } from 'react';
import type { TranscriptEntry } from '../types';
import { Speaker } from '../types';

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
          <svg xmlns="http://www.w3.org/2000/svg" className="w-16 h-16 mb-4" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Zm-1 13.93A5.002 5.002 0 0 0 12 21a5 5 0 0 0 5-5.07V11h-2v3.93a3 3 0 0 1-6 0V11H7v3.93ZM19 11h-2V5a5 5 0 0 0-10 0v6H5a1 1 0 0 0 0 2h2v1.07A7.002 7.002 0 0 0 12 23a7 7 0 0 0 7-7.07V13h2a1 1 0 0 0 0-2Z" /></svg>
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
