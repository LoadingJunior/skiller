import React, { useState, useRef, useCallback, useEffect, use } from "react";
import {
  GoogleGenAI,
  Modality,
  type LiveServerMessage,
  type Blob,
} from "@google/genai";
import { encode, decodeBase64, decodeAudioData } from "../utils/audio";
import type { TranscriptEntry, SessionState } from "../types";
import { Speaker } from "../types";
import MicrophoneIcon from "../components/MicrophoneIcon";
import StatusIndicator from "../components/StatusIndicator";
import Transcript from "../components/Transcript";
import { supabase } from "../lib/supabase";
import { FaMicrophone } from "react-icons/fa";
import { IoIosArrowBack } from "react-icons/io";
import { useNavigate } from "react-router-dom";

interface LiveSession {
  close: () => void;
  sendRealtimeInput: (input: { media: Blob }) => void;
}

const MVP_USER_ID = "d9b24999-4a64-452b-b382-563ee13eebce";
const MVP_SCENARIO_ID = "3ae13d78-c10f-4993-8b89-83257031590e";
const MVP_BADGE_ID = "6a0174ba-4475-4974-8116-1ca09571b6e5";

const INPUT_SAMPLE_RATE = 24000;
const OUTPUT_SAMPLE_RATE = 24000;

export const Session: React.FC = () => {
  const [sessionState, setSessionState] = useState<SessionState>("idle");
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [systemInstruction, setSystemInstruction] = useState<string | null>(
    null
  );
  const [isLoadingPrompt, setIsLoadingPrompt] = useState<boolean>(true);
  const navigate = useNavigate();

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

  useEffect(() => {
    const fetchPrompt = async () => {
      setIsLoadingPrompt(true);
      try {
        const { data, error } = await supabase
          .from("scenarios")
          .select("ia_context_prompt")
          .eq("id", MVP_SCENARIO_ID)
          .single();

        if (error) throw error;

        if (data && data.ia_context_prompt) {
          setSystemInstruction(data.ia_context_prompt);
        } else {
          throw new Error(
            "Cenário não encontrado ou prompt vazio no Supabase."
          );
        }
      } catch (error) {
        const dbError = error as { message: string };
        console.error("Falha ao carregar prompt do Supabase:", error);
        setErrorMessage(
          `Erro fatal: Não foi possível carregar o cenário. ${dbError.message}`
        );
        setSessionState("error");
      } finally {
        setIsLoadingPrompt(false);
      }
    };

    fetchPrompt();
  }, []);

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
    setCurrentSessionId(null);
  }, []);

  const parseFeedback = (modelText: string) => {
    const summary =
      modelText.split("STAR Method:")[0]?.trim() || "Feedback não capturado.";

    const scores = {
      structure: 0,
      impact: 0,
      persuasion: 0,
      clarity: 0,
    };

    const starMatch = modelText.match(/STAR Method: (\d+)/);
    if (starMatch) scores.structure = parseInt(starMatch[1], 10);

    const storyMatch = modelText.match(/Storytelling: (\d+)/);
    if (storyMatch) scores.impact = parseInt(storyMatch[1], 10);

    const persMatch = modelText.match(/Persuasion: (\d+)/);
    if (persMatch) scores.persuasion = parseInt(persMatch[1], 10);

    const clarityMatch = modelText.match(/Clarity: (\d+)/);
    if (clarityMatch) scores.clarity = parseInt(clarityMatch[1], 10);

    return { summary, scores };
  };

  const saveFinalFeedback = async (
    sessionId: string,
    scores: any,
    summary: string
  ) => {
    if (!sessionId) return;

    const { error: feedbackError } = await supabase
      .from("session_feedback")
      .insert({
        session_id: sessionId,
        score_structure: scores.structure,
        score_impact: scores.impact,
        score_persuasion: scores.persuasion,
        score_clarity: scores.clarity,
        ia_summary: summary,
      });
    if (feedbackError) console.error("Erro ao salvar feedback:", feedbackError);

    const { error: badgeError } = await supabase.from("user_badges").insert({
      user_id: MVP_USER_ID,
      badge_id: MVP_BADGE_ID,
    });
    if (badgeError && badgeError.code !== "23505") {
      console.warn("Erro ao conceder medalha:", badgeError);
    }
  };

  const startSession = useCallback(async () => {
    if (isLoadingPrompt || !systemInstruction) {
      setErrorMessage("Aguarde, carregando cenário...");
      return;
    }

    setSessionState("connecting");
    setErrorMessage(null);
    setTranscript([]);

    let sessionId: string | null = null;

    try {
      const { data: sessionData, error: sessionError } = await supabase
        .from("simulation_sessions")
        .insert({
          user_id: MVP_USER_ID,
          scenario_id: MVP_SCENARIO_ID,
        })
        .select("id")
        .single();

      if (sessionError) throw sessionError;

      sessionId = sessionData.id;
      setCurrentSessionId(sessionId);
    } catch (error) {
      console.error("Falha ao criar sessão no Supabase:", error);
      const dbError = error as { message: string };
      setErrorMessage(`Erro de BD: ${dbError.message}. Tente novamente.`);
      setSessionState("error");
      return;
    }

    try {
      if (!process.env.API_KEY) {
        throw new Error("API_KEY environment variable not set.");
      }
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

      stream.current = await navigator.mediaDevices.getUserMedia({
        audio: true,
      });

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
          systemInstruction: systemInstruction,
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
            handleTranscription(message, sessionId);
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
  }, [stopSession, systemInstruction, isLoadingPrompt]);

  const persistTurn = async (
    sessionId: string,
    role: "user" | "ia",
    content: string
  ) => {
    if (!sessionId || !content.trim()) return;

    const { error } = await supabase.from("messages").insert({
      session_id: sessionId,
      role: role,
      content: content,
    });

    if (error) {
      console.warn("Falha ao salvar mensagem:", error.message);
    }
  };

  const handleTranscription = (
    message: LiveServerMessage,
    sessionId: string | null
  ) => {
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

    if (message.serverContent?.turnComplete && sessionId) {
      const userInputText = transcriptionRefs.current.userInput;
      const modelOutputText = transcriptionRefs.current.modelOutput;

      persistTurn(sessionId, "user", userInputText);
      persistTurn(sessionId, "ia", modelOutputText);

      if (modelOutputText.includes("STAR Method:")) {
        const { summary, scores } = parseFeedback(modelOutputText);

        saveFinalFeedback(sessionId, scores, summary);

        stopSession();
      }

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
    if (isLoadingPrompt) {
      return {
        text: "Carregando Cenário...",
        disabled: true,
        bg: "bg-gray-500",
        pulse: true,
      };
    }

    switch (sessionState) {
      case "connecting":
        return {
          text: "Conectando...",
          disabled: true,
          bg: "bg-yellow-500",
          pulse: true,
        };
      case "connected":
        return {
          text: "Parar",
          disabled: false,
          bg: "bg-red-600 hover:bg-red-700",
          pulse: true,
        };
      case "error":
        return {
          text: "Tente Novamente",
          disabled: false,
          bg: "bg-blue-600 hover:bg-blue-700",
          pulse: false,
        };
      case "idle":
      default:
        return {
          text: "Iniciar",
          disabled: !!errorMessage,
          bg: "bg-purple-600 hover:bg-purple-700",
          pulse: false,
        };
    }
  };

  const { text, disabled, bg, pulse } = getButtonState();

  return (
    <div className="flex flex-col h-screen text-gray-100 font-sans">
      <header className=" border-gray-700">
        <div className="bg-[#1E0037] h-5"></div>
        <div className="flex justify-between items-center w-full mt-4 px-6 pb-4">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate(-1)} className="flex items-center justify-center w-12 h-12 rounded-full bg-[#1E0037]">
              <IoIosArrowBack className="text-white h-10 w-10" />
            </button>
          </div>
          <StatusIndicator state={sessionState} />
        </div>
      </header>

      <main className="grow flex flex-col overflow-hidden">
        {errorMessage && (
          <div className="p-4 bg-red-800 text-white text-center">
            <p>{errorMessage}</p>
          </div>
        )}
        <Transcript transcript={transcript} IA_name={"Ricardo Vasconcelos"} />
      </main>

      <footer className="backdrop-blur-sm">
        <div className="flex justify-center items-center">
          <button
            onClick={handleToggleSession}
            disabled={disabled}
            className={`flex items-center justify-center gap-3 px-8 py-4 rounded-full text-lg font-semibold transition-all duration-200 ease-in-out shadow-lg focus:outline-none focus:ring-4 focus:ring-blue-400/50 ${bg} ${
              disabled ? "opacity-50 cursor-not-allowed" : ""
            }`}
          >
            <div className={`relative w-6 h-6 ${pulse ? "animate-pulse" : ""}`}>
              <FaMicrophone className="w-6 h-6" />
            </div>
            <span>{text}</span>
          </button>
        </div>
        <div className="bg-[#1E0037] h-5 mt-4"></div>
      </footer>
    </div>
  );
};

