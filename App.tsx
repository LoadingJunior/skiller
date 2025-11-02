import React, { useState, useRef, useCallback, useEffect } from "react";
// Fix: Removed `LiveSession` and added `Blob` to the import since `LiveSession` is not an exported type.
import {
  GoogleGenAI,
  Modality,
  type LiveServerMessage,
  type Blob,
} from "@google/genai";
import { encode, decodeBase64, decodeAudioData } from "./utils/audio";
import type { TranscriptEntry, SessionState } from "./types";
import { Speaker } from "./types";
import MicrophoneIcon from "./components/MicrophoneIcon";
import StatusIndicator from "./components/StatusIndicator";
import Transcript from "./components/Transcript";

interface LiveSession {
  close: () => void;
  sendRealtimeInput: (input: { media: Blob }) => void;
}

const SYSTEM_INSTRUCTION = `
You are José Alves, a honest, professional and non-encouraging engineering manager interviewer looking to assess a junior developer behavioral skills.
You are a leader of an important development team on the company and because of that, needs to be assertive when hiring a new developer for your team. 
Start the conversation in portuguese (brazil) with a brief introduction, then, ask this question:
1) How you handle unexpected challenges and how it has shaped your approach for solving problems under pressure?
If you feel you need to, ask at most two follow-up questions to get more details from the candidate's histories. Keep your questions concise.
Listen carefully to the candidate's responses before moving on to the next question, evaluating storytelling, adequacy to the STAR framework and if the story seems interesting and belivable. 
At the end, give an honest and real feedback to the candidate accordingly to your persona and all the responsibilities it brings.
After that, on the last message, send the following string: "__END__OF__CONVERSATION__" and grade (from 0 to 10) for the following topics:
STAR Method, Storytelling, Persuasion and Clarity with the following structure: <topic>: <grade>.
`;
const INPUT_SAMPLE_RATE = 24000;
const OUTPUT_SAMPLE_RATE = 24000;

const App: React.FC = () => {
  const [sessionState, setSessionState] = useState<SessionState>("idle");
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const sessionPromise = useRef<Promise<LiveSession> | null>(null);
  const stream = useRef<MediaStream | null>(null);
  const audioContexts = useRef<{
    input: AudioContext | null;
    output: AudioContext | null;
  }>({ input: null, output: null });
  const scriptProcessor = useRef<ScriptProcessorNode | null>(null);
  const transcriptionRefs = useRef({ userInput: "", modelOutput: "" });
  const audioQueue = useRef({
    nextStartTime: 0,
    sources: new Set<AudioBufferSourceNode>(),
  });

  const stopSession = useCallback(async () => {
    if (sessionPromise.current) {
      const session = await sessionPromise.current;
      session.close();
      sessionPromise.current = null;
    }

    stream.current?.getTracks().forEach((track) => track.stop());
    stream.current = null;

    scriptProcessor.current?.disconnect();
    scriptProcessor.current = null;

    audioContexts.current.input?.close();
    audioContexts.current.output?.close();
    audioContexts.current = { input: null, output: null };

    audioQueue.current.sources.forEach((source) => source.stop());
    audioQueue.current = { nextStartTime: 0, sources: new Set() };

    setSessionState("idle");
  }, []);

  const startSession = useCallback(async () => {
    setSessionState("connecting");
    setErrorMessage(null);
    setTranscript([]);

    try {
      if (!process.env.API_KEY) {
        throw new Error("API_KEY environment variable not set.");
      }
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

      stream.current = await navigator.mediaDevices.getUserMedia({
        audio: true,
      });

      // Cast window to `any` to support `webkitAudioContext` for older browsers without TypeScript errors.
      audioContexts.current.input = new (window.AudioContext ||
        (window as any).webkitAudioContext)({ sampleRate: INPUT_SAMPLE_RATE });
      audioContexts.current.output = new (window.AudioContext ||
        (window as any).webkitAudioContext)({ sampleRate: OUTPUT_SAMPLE_RATE });

      sessionPromise.current = ai.live.connect({
        model: "gemini-2.5-flash-native-audio-preview-09-2025",
        config: {
          responseModalities: [Modality.AUDIO],
          inputAudioTranscription: {},
          outputAudioTranscription: {},
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: "Enceladus" } },
            languageCode: "pt-BR",
          },
          systemInstruction: SYSTEM_INSTRUCTION,
        },
        callbacks: {
          onopen: () => {
            setSessionState("connected");
            if (stream.current && audioContexts.current.input) {
              const source =
                audioContexts.current.input.createMediaStreamSource(
                  stream.current
                );
              scriptProcessor.current =
                audioContexts.current.input.createScriptProcessor(4096, 1, 1);

              scriptProcessor.current.onaudioprocess = (
                audioProcessingEvent
              ) => {
                const inputData =
                  audioProcessingEvent.inputBuffer.getChannelData(0);
                const l = inputData.length;
                const int16 = new Int16Array(l);
                for (let i = 0; i < l; i++) {
                  int16[i] = inputData[i] * 32768;
                }
                const pcmBlob: Blob = {
                  data: encode(new Uint8Array(int16.buffer)),
                  mimeType: `audio/pcm;rate=${INPUT_SAMPLE_RATE}`,
                };

                sessionPromise.current?.then((session) => {
                  session.sendRealtimeInput({ media: pcmBlob });
                });
              };

              source.connect(scriptProcessor.current);
              scriptProcessor.current.connect(
                audioContexts.current.input.destination
              );
            }
          },
          onmessage: async (message: LiveServerMessage) => {
            handleTranscription(message);
            await handleAudio(message);
          },
          onerror: (e: ErrorEvent) => {
            console.error("Session error:", e);
            setErrorMessage(
              "An error occurred during the session. Please try again."
            );
            setSessionState("error");
            stopSession();
          },
          onclose: (e: CloseEvent) => {
            stopSession();
          },
        },
      });
    } catch (error) {
      console.error("Failed to start session:", error);
      setErrorMessage(
        error instanceof Error ? error.message : "An unknown error occurred."
      );
      setSessionState("error");
      await stopSession();
    }
  }, [stopSession]);

  /**
   * Placeholder function to persist a conversational turn to a backend server.
   * You would replace the fetch call with a request to your actual API endpoint.
   * @param turn An object containing the user's input and the model's response for the turn.
   */
  const persistTurn = async (turn: { user: string; model: string }) => {
    console.log("Persisting turn to backend:", turn);
    try {
      console.log(turn);
      /*const response = await fetch('https://your-backend-api.com/transcripts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: 'some-user-id', // Replace with an actual user identifier
          sessionTimestamp: new Date().toISOString(),
          turn,
        }),
      });

      if (!response.ok) {
        throw new Error(`API call failed with status: ${response.status}`);
      }

      const result = await response.json();
      console.log('Successfully persisted turn:', result);
    */
    } catch (error) {
      console.error("Failed to persist transcript:", error);
      // Optionally, you could add this error to the UI state to notify the user.
    }
  };

  const handleTranscription = (message: LiveServerMessage) => {
    let newTranscriptEntry = false;
    let speaker: Speaker | null = null;
    let text = "";

    if (message.serverContent?.inputTranscription) {
      speaker = Speaker.User;
      text = message.serverContent.inputTranscription.text;
      transcriptionRefs.current.userInput += text;
    } else if (message.serverContent?.outputTranscription) {
      speaker = Speaker.Model;
      text = message.serverContent.outputTranscription.text;
      transcriptionRefs.current.modelOutput += text;
    }

    if (speaker && text) {
      setTranscript((prev) => {
        const lastEntry = prev[prev.length - 1];
        if (lastEntry && lastEntry.speaker === speaker && !lastEntry.isFinal) {
          const updatedTranscript = [...prev];
          updatedTranscript[prev.length - 1] = {
            ...lastEntry,
            text:
              speaker === Speaker.User
                ? transcriptionRefs.current.userInput
                : transcriptionRefs.current.modelOutput,
          };
          return updatedTranscript;
        } else {
          newTranscriptEntry = true;
          return [
            ...prev,
            {
              id: Date.now(),
              speaker,
              text:
                speaker === Speaker.User
                  ? transcriptionRefs.current.userInput
                  : transcriptionRefs.current.modelOutput,
              isFinal: false,
            },
          ];
        }
      });
    }

    if (message.serverContent?.turnComplete) {
      // A "turn" is complete, meaning the user has finished speaking and the model has responded.
      // This is the ideal place to persist the conversation.
      const userInputText = transcriptionRefs.current.userInput;
      const modelOutputText = transcriptionRefs.current.modelOutput;

      // =================================================================
      // HEY! THIS IS WHERE YOU CAN SAVE THE CONVERSATION
      // =================================================================
      // You can call a function here to send the data to your backend.
      // The `userInputText` and `modelOutputText` variables contain the
      // full, final text for this completed conversational turn.
      if (userInputText.trim() || modelOutputText.trim()) {
        // Uncomment the line below to use the example persistence function:
        persistTurn({ user: userInputText, model: modelOutputText });
      }
      // =================================================================

      setTranscript((prev) =>
        prev.map((entry) => ({ ...entry, isFinal: true }))
      );
      transcriptionRefs.current = { userInput: "", modelOutput: "" };
    }
  };

  const handleAudio = async (message: LiveServerMessage) => {
    const base64Audio =
      message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
    if (base64Audio && audioContexts.current.output) {
      const outputContext = audioContexts.current.output;
      audioQueue.current.nextStartTime = Math.max(
        audioQueue.current.nextStartTime,
        outputContext.currentTime
      );

      const audioBuffer = await decodeAudioData(
        decodeBase64(base64Audio),
        outputContext,
        OUTPUT_SAMPLE_RATE,
        1
      );

      const source = outputContext.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(outputContext.destination);

      source.addEventListener("ended", () => {
        audioQueue.current.sources.delete(source);
      });

      source.start(audioQueue.current.nextStartTime);
      audioQueue.current.nextStartTime += audioBuffer.duration;
      audioQueue.current.sources.add(source);
    }

    if (message.serverContent?.interrupted) {
      audioQueue.current.sources.forEach((source) => source.stop());
      audioQueue.current.sources.clear();
      audioQueue.current.nextStartTime = 0;
    }
  };

  useEffect(() => {
    return () => {
      stopSession();
    };
  }, [stopSession]);

  const handleToggleSession = () => {
    if (sessionState === "connected" || sessionState === "connecting") {
      stopSession();
    } else {
      startSession();
    }
  };

  const getButtonState = () => {
    switch (sessionState) {
      case "connecting":
        return {
          text: "Connecting",
          disabled: true,
          bg: "bg-yellow-500",
          pulse: true,
        };
      case "connected":
        return {
          text: "Stop Interview",
          disabled: false,
          bg: "bg-red-600 hover:bg-red-700",
          pulse: true,
        };
      case "error":
        return {
          text: "Try Again",
          disabled: false,
          bg: "bg-blue-600 hover:bg-blue-700",
          pulse: false,
        };
      case "idle":
      default:
        return {
          text: "Start Interview",
          disabled: false,
          bg: "bg-blue-600 hover:bg-blue-700",
          pulse: false,
        };
    }
  };

  const { text, disabled, bg, pulse } = getButtonState();

  return (
    <div className="flex flex-col h-screen bg-gray-800 text-gray-100 font-sans">
      <header className="flex items-center justify-between p-4 border-b border-gray-700 bg-gray-900 shadow-md">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gradient-to-tr from-indigo-500 to-blue-500 rounded-md"></div>
          <h1 className="text-xl font-bold">AI Technical Interviewer</h1>
        </div>
        <StatusIndicator state={sessionState} />
      </header>

      <main className="flex-grow flex flex-col overflow-hidden">
        {errorMessage && (
          <div className="p-4 bg-red-800 text-white text-center">
            <p>{errorMessage}</p>
          </div>
        )}
        <Transcript transcript={transcript} />
      </main>

      <footer className="p-4 bg-gray-900/80 backdrop-blur-sm border-t border-gray-700">
        <div className="flex justify-center items-center">
          <button
            onClick={handleToggleSession}
            disabled={disabled}
            className={`flex items-center justify-center gap-3 px-8 py-4 rounded-full text-lg font-semibold transition-all duration-200 ease-in-out shadow-lg focus:outline-none focus:ring-4 focus:ring-blue-400/50 ${bg} ${
              disabled ? "opacity-50 cursor-not-allowed" : ""
            }`}
          >
            <div className={`relative w-6 h-6 ${pulse ? "animate-pulse" : ""}`}>
              <MicrophoneIcon className="w-6 h-6" />
            </div>
            <span>{text}</span>
          </button>
        </div>
      </footer>
    </div>
  );
};

export default App;
