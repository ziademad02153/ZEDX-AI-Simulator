"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Mic, Video, VideoOff, Loader2, AlertCircle, Sparkles, Trash2, LogOut, Copy, RotateCcw, Monitor, MonitorOff, Scan, CheckCircle2 } from "lucide-react";
import { createWorker } from 'tesseract.js';
import { cn } from "@/lib/utils";
import ReactMarkdown from 'react-markdown';

import { useRouter } from "next/navigation";
import { SettingsDialog } from "@/components/settings-dialog";
import { useConfirmDialog } from "@/components/confirm-dialog";
import { interviewService } from "@/lib/interview-service";
import { useInterviewStore } from "@/lib/store";
import { supabase } from "@/lib/supabase";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Lock } from "lucide-react";
import { usePostHog } from 'posthog-js/react';
// --- Types for Web Speech API ---
interface SpeechRecognitionEvent extends Event {
    results: SpeechRecognitionResultList;
    resultIndex: number;
}

interface SpeechRecognitionErrorEvent extends Event {
    error: string;
    message?: string;
}

interface SpeechRecognition extends EventTarget {
    continuous: boolean;
    interimResults: boolean;
    lang: string;
    maxAlternatives: number;
    onaudiostart: ((this: SpeechRecognition, ev: Event) => void) | null;
    onaudioend: ((this: SpeechRecognition, ev: Event) => void) | null;
    onend: ((this: SpeechRecognition, ev: Event) => void) | null;
    onerror: ((this: SpeechRecognition, ev: SpeechRecognitionErrorEvent) => void) | null;
    onnomatch: ((this: SpeechRecognition, ev: SpeechRecognitionEvent) => void) | null;
    onresult: ((this: SpeechRecognition, ev: SpeechRecognitionEvent) => void) | null;
    onsoundstart: ((this: SpeechRecognition, ev: Event) => void) | null;
    onsoundend: ((this: SpeechRecognition, ev: Event) => void) | null;
    onspeechstart: ((this: SpeechRecognition, ev: Event) => void) | null;
    onspeechend: ((this: SpeechRecognition, ev: Event) => void) | null;
    onstart: ((this: SpeechRecognition, ev: Event) => void) | null;
    start(): void;
    stop(): void;
    abort(): void;
}

export default function InterviewPage() {
    const router = useRouter();
    const posthog = usePostHog();
    const { showToast } = useConfirmDialog();
    const videoRef = useRef<HTMLVideoElement>(null);
    const recognitionRef = useRef<SpeechRecognition | null>(null);
    const silenceTimerRef = useRef<NodeJS.Timeout | null>(null);
    const isAiSpeakingRef = useRef(false);
    const isRecognitionActiveRef = useRef(false);

    // API Key no longer needed - using server-side Groq
    const [showSettings, setShowSettings] = useState(false);
    const [isRecording, setIsRecording] = useState(false);
    const [transcript, setTranscript] = useState("");
    const [interimTranscript, setInterimTranscript] = useState("");
    const [showPaywall, setShowPaywall] = useState(false);
    const [aiResponse, setAiResponse] = useState("## Ready to Assist\n\nI am your Mock Assessor. I will listen to your session and provide real-time feedback.\n\n**Instructions:**\n1. Click the microphone to start listening.\n2. Speak your question or discussion point.\n3. When you need feedback, click **Get Feedback**.");
    const [isCameraOn, setIsCameraOn] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isCameraVisible, setIsCameraVisible] = useState(false);
    const [systemStatus, setSystemStatus] = useState({ browser: true, camera: false, mic: false });
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const _ignoreStatus = systemStatus;
    const [interviewContext, setInterviewContext] = useState({ type: "", jd: "", resume: "", lang: "en-US", difficulty: "Intermediate" });
    const [isAutoMode, setIsAutoMode] = useState(true); // Auto Answer ON by default
    const [lastTranscript, setLastTranscript] = useState<string>(""); // For retry functionality
    const [allQAPairs, setAllQAPairs] = useState<{ question: string, answer: string }[]>([]); // Track Q&A pairs
    const [isSaving, setIsSaving] = useState(false);
    const [interviewStartTime] = useState<Date>(new Date()); // Track when interview started
    const [manualQuestion, setManualQuestion] = useState(""); // Manual input for coding questions
    const [isScreenAudioActive, setIsScreenAudioActive] = useState(false);
    const screenStreamRef = useRef<MediaStream | null>(null);
    const audioContextRef = useRef<AudioContext | null>(null);
    const analyserRef = useRef<AnalyserNode | null>(null);
    const micSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
    const screenSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
    const [isScannerActive, setIsScannerActive] = useState(false);
    const [hasMounted, setHasMounted] = useState(false);
    const tesseractWorkerRef = useRef<any>(null);

    // Independent Mode State
    const [isIndependentModeActive, setIsIndependentModeActive] = useState(false);
    const [independentEvaluation, setIndependentEvaluation] = useState<string | null>(null);

    // Constants
    const MAX_TRANSCRIPT_LENGTH = 4000; // Limit transcript to prevent API issues

    // --- DESK_TOP STT ---

    // Load Settings
    useEffect(() => {
        // Listen for changes from SettingsDialog
        const handleSettingsChange = () => {
            // Placeholder for responsive UI if needed
        };
        window.addEventListener("settingsChanged", handleSettingsChange);
        window.addEventListener("themeChanged", handleSettingsChange);

        return () => {
            window.removeEventListener("settingsChanged", handleSettingsChange);
            window.removeEventListener("themeChanged", handleSettingsChange);
        };
    }, []);

    // Pre-load Tesseract when scanner is activated and cleanup on unmount
    useEffect(() => {
        if (isScannerActive && !tesseractWorkerRef.current) {
            console.log("[Scanner] Pre-loading Tesseract worker...");
            createWorker('eng', 1, {
                logger: m => console.log("[Scanner] Init Progress:", m.status, Math.round(m.progress * 100) + "%"),
            }).then(async worker => {
                await worker.setParameters({
                    tessedit_pageseg_mode: '3',
                    preserve_interword_spaces: '1',
                } as unknown as Record<string, string>);
                tesseractWorkerRef.current = worker;
                console.log("[Scanner] Tesseract worker pre-loaded and ready!");
            }).catch(err => console.error("[Scanner] Pre-load failed:", err));
        } else if (!isScannerActive && tesseractWorkerRef.current) {
            console.log("[Scanner] Terminating Tesseract worker to free memory...");
            tesseractWorkerRef.current.terminate();
            tesseractWorkerRef.current = null;
        }
    }, [isScannerActive]);

    useEffect(() => {
        return () => {
            if (tesseractWorkerRef.current) {
                tesseractWorkerRef.current.terminate();
                tesseractWorkerRef.current = null;
            }
        };
    }, []);

    // Prevent accidental reload during an active interview
    useEffect(() => {
        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
            // Only warn if they haven't explicitly ended the interview (isSaving = true means they clicked End)
            if (!isSaving && (transcript.length > 5 || allQAPairs.length > 0)) {
                e.preventDefault();
                e.returnValue = '';
            }
        };
        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, [isSaving, transcript, allQAPairs]);

    useEffect(() => {
        setHasMounted(true);
        try {
            const state = useInterviewStore.getState();
            // Fallback to localStorage just in case it's a hard refresh and Zustand is empty, 
            // though Zustand is the primary source of truth now.
            const savedType = state.interviewType || localStorage.getItem("interview_context_type") || "General";
            const savedJD = state.jobDescription || localStorage.getItem("interview_context_jd") || "";
            const savedResume = state.resumeText || localStorage.getItem("interview_context_resume") || "";
            const savedLang = state.language || localStorage.getItem("interview_context_lang") || "en-US";
            const savedDifficulty = state.difficulty || localStorage.getItem("interview_context_difficulty") || "Intermediate";
            setInterviewContext({ type: savedType, jd: savedJD, resume: savedResume, lang: savedLang, difficulty: savedDifficulty });
        } catch {
            // localStorage unavailable (private mode)
            setInterviewContext({ type: "General", jd: "", resume: "", lang: "en-US", difficulty: "Intermediate" });
        }

        // v18.0: Listen for scanner state changes (Atomic Sync)
        if (typeof window !== 'undefined' && window.electronAPI?.onScannerStateChange) {
            const cleanup = window.electronAPI.onScannerStateChange((active: boolean) => {
                console.log('[Sync] Scanner state changed:', active);
                setIsScannerActive(active);
            });
            return cleanup;
        }
    }, []);

    // Initialize Camera
    useEffect(() => {
        let currentStream: MediaStream | null = null;
        let isCancelled = false; // Prevents race condition if unmounted during permission prompt

        const startCamera = async () => {
            try {
                if (!navigator.mediaDevices?.getUserMedia) {
                    throw new Error("Camera API not supported in this browser.");
                }
                const stream = await navigator.mediaDevices.getUserMedia({ video: true });
                
                if (isCancelled) {
                    // Stop tracks immediately if component unmounted while waiting for camera
                    stream.getTracks().forEach(track => track.stop());
                    return;
                }

                currentStream = stream;
                if (videoRef.current) {
                    videoRef.current.srcObject = currentStream;
                }
                setSystemStatus(prev => ({ ...prev, camera: true }));
                setError(null);
            } catch (err) {
                if (isCancelled) return;
                console.error("Error accessing camera:", err);
                setSystemStatus(prev => ({ ...prev, camera: false }));
            }
        };

        if (isCameraOn && isCameraVisible) {
            startCamera();
        } else {
            setSystemStatus(prev => ({ ...prev, camera: false }));
        }

        const videoElem = videoRef.current;
        return () => {
            isCancelled = true;
            if (currentStream) {
                currentStream.getTracks().forEach(track => track.stop());
            }
            if (videoElem) {
                videoElem.srcObject = null;
            }
        };
    }, [isCameraOn, isCameraVisible]);
    const getAiAnswer = useCallback(async (retryTranscript?: string) => {
        const transcriptToUse = retryTranscript || transcript;

        // No API key check needed - server has Groq configuration
        if (!transcriptToUse.trim()) {
            if (!isAutoMode) setError("No transcript to analyze. Please speak first.");
            return;
        }

        // Limit transcript length
        const currentTranscript = transcriptToUse.slice(0, MAX_TRANSCRIPT_LENGTH);
        setLastTranscript(currentTranscript); // Save for retry
        setTranscript("");
        setInterimTranscript(""); // Clear interim too

        setIsLoading(true);
        setError(null);

        // Stop listening while thinking/speaking to prevent picking up self
        if (isRecording) {
            recognitionRef.current?.stop();
            isAiSpeakingRef.current = true;
        }

        try {
            // Get user's selected model
            let selectedModel = "qwen/qwen3.8-27b";
            try {
                selectedModel = localStorage.getItem("selected_ai_model") || "qwen/qwen3.8-27b";
            } catch { /* localStorage unavailable */ }

            // Construct the prompt (Unified for all providers)
            const { data: { session } } = await supabase.auth.getSession();
            const token = session?.access_token;

            // Call Server-Side API (Groq powered - no API key needed)
            const response = await fetch("/api/generate", {
                method: "POST",
                headers: { 
                    "Content-Type": "application/json",
                    ...(token ? { "Authorization": `Bearer ${token}` } : {})
                },
                body: JSON.stringify({
                    model: selectedModel,
                    promptType: 'candidate_answer',
                    promptContext: { interviewContext },
                    messages: [
                        { role: "user", content: currentTranscript }
                    ]
                })
            });

            const data = await response.json();

            if (!response.ok) {
                if (data.error?.code === "PAYWALL_LIMIT_REACHED" || data.error?.message === "PAYWALL_LIMIT_REACHED") {
                    setShowPaywall(true);
                    setTranscript(currentTranscript);
                    isAiSpeakingRef.current = false;
                    setIsLoading(false);
                    return;
                }
                throw new Error(data.error?.message || `API Error: ${response.status}`);
            }

            const text = data.content;
            if (!text) throw new Error("Empty response from AI.");

            setAiResponse(text);
            // Broadcast to Electron Overlay
            if (window.electronAPI?.sendAnswer) {
                window.electronAPI.sendAnswer(text);
            }
            // Track Q&A pairs for saving to history - save question and answer together
            setAllQAPairs(prev => [...prev, { question: currentTranscript.trim(), answer: text }]);
            // Text-to-speech disabled - text only mode
            isAiSpeakingRef.current = false;

            // Restart speech recognition after AI finishes
            if (isRecording && recognitionRef.current) {
                setTimeout(() => {
                    try {
                        recognitionRef.current?.start();
                        console.log("[Speech] Restarted after AI response");
                    } catch (e) {
                        console.log("[Speech] Could not restart:", e);
                    }
                }, 300);
            }

        } catch (error: unknown) {
            const err = error as Error;
            console.error("Error generating AI response:", err);
            let errorMessage = "Could not generate response.";
            if (err.message.includes("429")) {
                errorMessage = "AI is busy (Rate Limit). Please try again.";
            } else if (err.message.includes("configuration missing")) {
                errorMessage = "Server AI configuration error. Please contact support.";
            } else {
                errorMessage = err.message;
            }
            setAiResponse(`**Error:** ${errorMessage}`);
            setError(errorMessage);
            setTranscript(currentTranscript); // Restore transcript to allow retry
            isAiSpeakingRef.current = false;
            if (isRecording) recognitionRef.current?.start();
        } finally {
            setIsLoading(false);
        }
    }, [interviewContext, transcript, isAutoMode, isRecording, recognitionRef]);

    const handleManualSubmit = () => {
        if (!manualQuestion.trim()) return;
        getAiAnswer(manualQuestion);
    };

    const handleIndependentSubmit = async () => {
        if (!transcript.trim() || !lastTranscript) return;
        
        const independentTranscript = transcript.slice(0, MAX_TRANSCRIPT_LENGTH);
        setIsLoading(true);
        setError(null);
        setIsIndependentModeActive(false);

        try {
            let selectedModel = "qwen/qwen3.8-27b";
            try { selectedModel = localStorage.getItem("selected_ai_model") || "qwen/qwen3.8-27b"; } catch {}

            const { data: { session } } = await supabase.auth.getSession();
            const token = session?.access_token;

            const response = await fetch("/api/generate", {
                method: "POST",
                headers: { 
                    "Content-Type": "application/json",
                    ...(token ? { "Authorization": `Bearer ${token}` } : {})
                },
                body: JSON.stringify({
                    model: selectedModel,
                    promptType: 'evaluate_independent_answer',
                    promptContext: { lastTranscript, independentTranscript },
                    messages: [{ role: "user", content: "Evaluate my independent answer." }]
                })
            });

            const data = await response.json();
            
            if (!response.ok) {
                if (data.error?.code === "PAYWALL_LIMIT_REACHED" || data.error?.message === "PAYWALL_LIMIT_REACHED") {
                    setShowPaywall(true);
                    return;
                }
                throw new Error(data.error?.message || "Failed to evaluate");
            }
            
            setIndependentEvaluation(data.content);
            setTranscript("");
            
        } catch (err: unknown) {
            const error = err as Error;
            console.error(error);
            setError("Failed to generate independent evaluation.");
            setIsIndependentModeActive(true); // Allow retry
        } finally {
            setIsLoading(false);
        }
    };

    // Silence Detection for Auto-Answer
    useEffect(() => {
        if (!isAutoMode || !isRecording || isLoading || !transcript.trim()) return;

        if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);

        silenceTimerRef.current = setTimeout(() => {
            console.log("Auto-answering due to silence...");
            getAiAnswer();
        }, 800);

        return () => {
            if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
        };
    }, [transcript, isAutoMode, isLoading, isRecording, getAiAnswer]);

    // Detect if running in Electron (Desktop App)
    const isElectron = hasMounted && typeof window !== 'undefined' && (window as unknown as { electronAPI?: { isElectron: boolean } }).electronAPI?.isElectron;

    // --- APPLY TRANSPARENT BODY IN DESKTOP MODE ---
    useEffect(() => {
        if (isElectron) {
            document.body.style.background = 'transparent';
            document.documentElement.style.background = 'transparent';
            
            // Hide scrollbars globally in electron
            const style = document.createElement('style');
            style.id = 'electron-scrollbar-hide';
            style.innerHTML = '::-webkit-scrollbar { display: none !important; } * { -ms-overflow-style: none !important; scrollbar-width: none !important; }';
            document.head.appendChild(style);
        } else {
            document.body.style.background = '';
            document.documentElement.style.background = '';
            
            const style = document.getElementById('electron-scrollbar-hide');
            if (style) style.remove();
        }
        
        return () => {
            const style = document.getElementById('electron-scrollbar-hide');
            if (style) style.remove();
        };
    }, [isElectron]);

    // --- SCREEN AUDIO CAPTURE (ELECTRON ONLY) ---
    const stopScreenAudio = useCallback(() => {
        if (screenStreamRef.current) {
            screenStreamRef.current.getTracks().forEach(t => t.stop());
            screenStreamRef.current = null;
        }
        if (screenSourceRef.current) {
            screenSourceRef.current.disconnect();
            screenSourceRef.current = null;
        }
        setIsScreenAudioActive(false);
        console.log("[Screen Audio] Stopped");
    }, []);

    const toggleScreenAudio = async () => {
        if (!isElectron) return;

        if (isScreenAudioActive) {
            stopScreenAudio();
            window.electronAPI?.stopSystemAudioCapture();
        } else {
            console.log("[Screen Audio] Requesting capture...");
            const result = await window.electronAPI?.startSystemAudioCapture();
            console.log("[Screen Audio] Capture request result:", result);
            if (result && !result.success) {
                console.error("[Screen Audio] Capture request failed:", result.error);
                setError(result.error || "Failed to start screen capture.");
            }
        }
    };

    useEffect(() => {
        if (!isElectron) return;

        const cleanup = window.electronAPI?.onAudioSourceReady(async (sourceId: string) => {
            console.log("[Screen Audio] Source ID received:", sourceId);
            try {
                if (!navigator.mediaDevices?.getUserMedia) {
                    throw new Error("Internal audio routing not supported.");
                }
                const stream = await navigator.mediaDevices.getUserMedia({
                    audio: {
                        echoCancellation: false,
                        noiseSuppression: false,
                        autoGainControl: false,
                        // @ts-expect-error: mandatory is non-standard but required for Electron desktop capture
                        mandatory: {
                            chromeMediaSource: 'desktop',
                            chromeMediaSourceId: sourceId
                        }
                    },
                    video: {
                        // @ts-expect-error: mandatory is non-standard but required for Electron desktop capture
                        mandatory: {
                            chromeMediaSource: 'desktop',
                            chromeMediaSourceId: sourceId,
                            maxWidth: 1,
                            maxHeight: 1,
                            maxFrameRate: 1
                        }
                    }
                });

                screenStreamRef.current = stream;
                setIsScreenAudioActive(true);

                // If recording is already active, connect this new stream to existing context
                if (isRecording && audioContextRef.current && analyserRef.current) {
                    try {
                        const screenSource = audioContextRef.current.createMediaStreamSource(stream);
                        screenSource.connect(analyserRef.current);
                        screenSourceRef.current = screenSource;
                        console.log("[Screen Audio] Stream mixed into active recording");
                    } catch (e: unknown) {
                        console.error("[Screen Audio] Failed to mix stream:", e as Error);
                    }
                }

                // Monitor for capture stop (user clicks "Stop Sharing" in OS)
                stream.getVideoTracks()[0].onended = () => {
                    console.log("[Screen Audio] Capture stopped by OS");
                    stopScreenAudio();
                };

            } catch (err: unknown) {
                console.error("[Screen Audio] Failed to get stream:", err as Error);
                setIsScreenAudioActive(false);
                setError("Internal audio routing failed (Permission or selection issue).");
            }
        });

        return () => {
            // onAudioSourceReady doesn't return a cleanup in some versions, check if it does
            if (typeof cleanup === 'function') (cleanup as () => void)();
        };
    }, [isElectron, isRecording, stopScreenAudio]);

    // --- DESKTOP STT (Groq Whisper with Silence Detection) ---
    const activeStreamsRef = useRef<MediaStream[]>([]);
    const lastGroqTranscriptRef = useRef<string>("");

    // BANNED_PHRASES - Only filter CLEAR hallucinations (YouTube artifacts, never real speech)
    const BANNED_PHRASES = [
        "please subscribe", "like and subscribe", "subscribe to",
        "thanks for watching", "thank you for watching", "thanks for watching",
        "thank you very much", "i hope you enjoyed", "bye bye",
        "thank you", "thanks", "thank you.",
        "copyright", "subtitles by", "captioned by",
        "[music]", "[applause]", "(music)", "(applause)"
    ];

    const processGroqAudio = async (audioBlob: Blob) => {
        try {
            // Groq is picky about types. Ensure it's marked as webm.
            if (audioBlob.size < 2000) {
                return;
            }

            const formData = new FormData();
            formData.append('file', audioBlob, 'audio.webm');
            formData.append('model', 'whisper-large-v3-turbo');

            // Get selected language
            const langCode = interviewContext.lang.split('-')[0];
            formData.append('language', langCode);

            // Add prompt to help Whisper understand the expected language
            if (langCode === 'en') {
                formData.append('prompt', 'This is an English professional meeting conversation.');
            } else if (langCode === 'ar') {
                formData.append('prompt', 'هذه محادثة اجتماع عمل باللغة العربية.');
            }

            console.log(`[Desktop STT] Sending audio with language: ${langCode}`);

            // Get auth token
            const { data: { session } } = await supabase.auth.getSession();
            const token = session?.access_token;

            let response;
            let retries = 2; // Try up to 2 extra times
            let delay = 1000;

            while (retries >= 0) {
                response = await fetch('/api/transcribe', {
                    method: 'POST',
                    headers: {
                        ...(token ? { "Authorization": `Bearer ${token}` } : {})
                    },
                    body: formData,
                });

                if (response.ok) break;

                if (response.status === 503 || response.status === 429) {
                    console.warn(`[Desktop STT] Retrying due to ${response.status}... (${retries} left)`);
                    await new Promise(r => setTimeout(r, delay));
                    retries--;
                    delay *= 2;
                } else {
                    break;
                }
            }

            if (!response || !response.ok) {
                console.error(`[Desktop STT] API Error: ${response?.status}`);
                return;
            }

            const data = await response.json();
            console.log(`[Desktop STT] Groq returned: "${data.text || '(empty)'}"`);

            if (data.text && data.text.trim()) {
                const newText = data.text.trim();
                const clean = newText.toLowerCase().replace(/[.,!?]/g, '').trim();
                const wordCount = clean.split(/\s+/).length;

                // Filter: too short (Speed Mode)
                if (wordCount < 1) {
                    return;
                }

                // Filter: banned phrases (Case-insensitive)
                if (BANNED_PHRASES.some(b => clean.includes(b))) {
                    console.log(`[Desktop STT] Filtered: banned phrase: "${newText}"`);
                    return;
                }

                // Extra safety: Filter single word "Thank you" even if slightly different
                if (clean === "thank you" || clean === "thanks") {
                    console.log(`[Desktop STT] Filtered: single word hallucination`);
                    return;
                }

                // Filter: duplicate
                if (lastGroqTranscriptRef.current === clean) {
                    console.log(`[Desktop STT] Filtered: duplicate`);
                    return;
                }

                // Filter: unexpected languages
                const unexpectedCharsRegex = /[\u4e00-\u9fff\u3040-\u309f\u30a0-\u30ff\uac00-\ud7af]/;
                if (unexpectedCharsRegex.test(newText)) {
                    console.log(`[Desktop STT] Filtered: unexpected language: "${newText}"`);
                    return;
                }

                lastGroqTranscriptRef.current = clean;
                console.log(`[Desktop STT] Heard (${langCode}): "${newText}"`);

                setTranscript(prev => {
                    const prevTrimmed = prev.trim();


                    // Simple check: if the last few words of the transcript match the start of the new text, skip the overlap
                    // This is more basic than the onresult deduplication because Groq text is usually 
                    // more complete and we want to preserve its accuracy.

                    // But if the entire newText is already at the end of the transcript, skip it.
                    if (prevTrimmed.endsWith(newText)) return prev;

                    const finalTranscript = (prev + " " + newText).trim();
                    return finalTranscript.slice(-MAX_TRANSCRIPT_LENGTH);
                });

                if ((window as unknown as { electronAPI?: { sendTranscript: (t: string) => void } }).electronAPI?.sendTranscript) {
                    (window as unknown as { electronAPI: { sendTranscript: (t: string) => void } }).electronAPI.sendTranscript(newText);
                }
            } else {
                console.log("[Desktop STT] Groq returned empty response");
            }
        } catch (error) {
            console.error("[Desktop STT] Error:", error);
        }
    };

    const startDesktopSTT = async () => {
        try {
            console.log("[Desktop STT] Starting Smart VAD...");

            // 1. Get Microphone stream
            const micStream = await navigator.mediaDevices.getUserMedia({
                audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true }
            });
            activeStreamsRef.current = [micStream];

            // 2. Initialize Audio Context & Analyser (Saved to Refs for mixing)
            const audioContext = new AudioContext();
            const analyser = audioContext.createAnalyser();
            analyser.fftSize = 512;

            audioContextRef.current = audioContext;
            analyserRef.current = analyser;

            // 3. Connect Microphone
            const micSource = audioContext.createMediaStreamSource(micStream);
            micSource.connect(analyser);
            micSourceRef.current = micSource;

            // 4. Connect Screen Audio (if already active)
            if (isScreenAudioActive && screenStreamRef.current) {
                try {
                    const screenSource = audioContext.createMediaStreamSource(screenStreamRef.current);
                    screenSource.connect(analyser);
                    screenSourceRef.current = screenSource;
                    console.log("[Desktop STT] Screen audio mixed at start");
                } catch (e) {
                    console.warn("[Desktop STT] Failed to mix screen audio at start:", e);
                }
            }

            const dataArray = new Uint8Array(analyser.frequencyBinCount);

            // VAD Parameters (Ultra-Low Latency Mode)
            const SPEECH_THRESHOLD = 12;        // Increased sensitivity for internal audio
            const SILENCE_DURATION = 800;       // 0.8s silence = End of sentence (Fast & snappy)
            const MIN_SPEECH_DURATION = 500;    // Allow short sentences
            const MAX_RECORDING_TIME = 15000;   // Force send after 15s

            let mediaRecorder: MediaRecorder | null = null;
            let audioChunks: Blob[] = [];
            let isSpeaking = false;
            let silenceStart = 0;
            let speechStart = 0;
            let lastLogTime = 0;

            const checkAudioLevel = () => {
                if (!activeStreamsRef.current.length && !screenStreamRef.current) return;

                analyser.getByteFrequencyData(dataArray);
                const average = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;

                // Log every 2.5s to reduce console noise
                if (Date.now() - lastLogTime > 2500) {
                    console.log(`[VAD] Avg: ${average.toFixed(1)} | Mic: ${!!micStream} | Screen: ${isScreenAudioActive}`);
                    lastLogTime = Date.now();
                }

                if (average > SPEECH_THRESHOLD) {
                    // SPEECH DETECTED
                    silenceStart = 0;
                    if (!isSpeaking) {
                        isSpeaking = true;
                        speechStart = Date.now();
                        audioChunks = [];
                        console.log("[VAD] Speech detected!");

                        // Create a mixed stream for the MediaRecorder
                        const dest = audioContext.createMediaStreamDestination();
                        micSource.connect(dest);
                        if (screenSourceRef.current) {
                            screenSourceRef.current.connect(dest);
                        }

                        // Use standard webm to avoid header issues with Whisper
                        const mimeType = 'audio/webm';
                        mediaRecorder = new MediaRecorder(dest.stream, { mimeType });
                        mediaRecorder.ondataavailable = (e) => {
                            if (e.data.size > 0) audioChunks.push(e.data);
                        };

                        // IMPORTANT: Start without timeslice to get a single valid blob at onstop
                        // This produces a much more stable WebM file for Groq
                        mediaRecorder.start();
                    } else {
                        // Check Max Duration
                        if (Date.now() - speechStart > MAX_RECORDING_TIME) {
                            console.log("[VAD] Max duration reached, forcing stop.");
                            stopAndProcess();
                        }
                    }
                } else {
                    // SILENCE
                    if (isSpeaking) {
                        if (silenceStart === 0) {
                            silenceStart = Date.now();
                        } else if (Date.now() - silenceStart > SILENCE_DURATION) {
                            console.log("[VAD] End of sentence (Silence detected).");
                            stopAndProcess();
                        }
                    }
                }
                requestAnimationFrame(checkAudioLevel);
            };

            const stopAndProcess = () => {
                isSpeaking = false;
                silenceStart = 0;

                if (mediaRecorder && mediaRecorder.state === 'recording') {
                    mediaRecorder.stop();
                    mediaRecorder.onstop = async () => {
                        const duration = Date.now() - speechStart;
                        if (duration < MIN_SPEECH_DURATION) {
                            console.log(`[VAD] Skipping: Too short (${duration}ms)`);
                            audioChunks = [];
                            return;
                        }

                        if (audioChunks.length > 0) {
                            const fullAudio = new Blob(audioChunks, { type: 'audio/webm' });
                            console.log(`[VAD] Sending ${(fullAudio.size / 1024).toFixed(1)}KB...`);
                            await processGroqAudio(fullAudio);
                        }
                        audioChunks = [];
                    };
                }
            };

            checkAudioLevel();
            setIsRecording(true);
            console.log("[Desktop STT] VAD Engine Started");

        } catch (err: unknown) {
            const error = err as Error;
            console.error("Desktop STT Error:", error);
            setError(error.message || "Recording failed.");
        }
    };

    const stopDesktopSTT = useCallback(() => {
        if (screenSourceRef.current) {
            screenSourceRef.current.disconnect();
            screenSourceRef.current = null;
        }

        if (micSourceRef.current) {
            micSourceRef.current.disconnect();
            micSourceRef.current = null;
        }

        const audioContext = audioContextRef.current;
        if (audioContext) {
            audioContext.close();
            audioContextRef.current = null;
        }

        activeStreamsRef.current.forEach(stream => {
            stream.getTracks().forEach(track => track.stop());
        });
        activeStreamsRef.current = [];
        console.log("[Desktop STT] Stopped");
    }, []);

    // --- GLOBAL CLEANUP ON UNMOUNT ---
    useEffect(() => {
        return () => {
            console.log("[Interview] Unmounting, cleaning up resources...");
            stopDesktopSTT();
            stopScreenAudio();
            if (recognitionRef.current) {
                try { recognitionRef.current.abort(); } catch { }
            }
        };
    }, [stopDesktopSTT, stopScreenAudio]);

    // --- TOGGLE RECORDING (UNIFIED) ---
    const toggleRecording = async () => {
        if (isRecording) {
            // STOP
            setIsRecording(false);
            setIsAutoMode(false);

            // 1. Stop Browser Recognition
            if (recognitionRef.current) {
                try { recognitionRef.current.stop(); } catch { }
            }

            // 2. Stop Desktop VAD (if running)
            if (isElectron) {
                stopDesktopSTT();
            }

            if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
            console.log("[Interview] Recording stopped");
            return;
        }

        // START
        setError(null);
        setTranscript("");
        setInterimTranscript("");

        try {
            // STEP 1: Always start Fast Live Transcript (Web Speech API)
            // This provides the immediate visual feedback the user wants
            if (recognitionRef.current) {
                try {
                    if (!isRecognitionActiveRef.current) {
                        recognitionRef.current.start();
                        isRecognitionActiveRef.current = true;
                        console.log("[Speech] Fast Live Engine started successfully");
                    }
                } catch (e: unknown) {
                    const err = e as Error;
                    if (err.name === 'InvalidStateError') {
                        isRecognitionActiveRef.current = true; // Sync state
                    } else {
                        console.error("[Speech] Failed to start Web Speech API:", err);
                        if (!isElectron) {
                            setError("Microphone access is already in use or failed.");
                        }
                    }
                }
            } else {
                console.warn("[Speech] Web Speech API not initialized.");
                if (!isElectron) {
                    setError("Your browser does not support Live Speech. Use Chrome or Edge.");
                }
            }

            // STEP 2: Desktop Only - Start High-Quality mixed audio STT
            if (isElectron) {
                await startDesktopSTT();
            }

            setIsRecording(true);
            setIsAutoMode(true);
            console.log("[Interview] Recording started (Dual-Engine Mode)");
        } catch (err: unknown) {
            const error = err as Error;
            console.error("Failed to start recording:", error);
            setError("Could not access microphone.");
        }
    };

    // Initialize Speech Recognition (WEBSITE ONLY - not in Electron)
    useEffect(() => {
        // Skip Web Speech API in Electron - it doesn't work there and causes network errors
        // The new toggleRecording handles Web Speech API for both desktop and web.

        const win = typeof window !== 'undefined' ? window as unknown as {
            webkitSpeechRecognition?: new () => SpeechRecognition;
            SpeechRecognition?: new () => SpeechRecognition;
        } : null;

        if (!win) return;

        const SpeechRecognitionClass = win.webkitSpeechRecognition || win.SpeechRecognition;
        if (SpeechRecognitionClass) {
            try {
                recognitionRef.current = new SpeechRecognitionClass();
            } catch (e) {
                console.error("[Speech] Failed to create instances:", e);
                return;
            }
            const rec = recognitionRef.current;
            if (rec) {
                rec.continuous = true;
                rec.interimResults = true;
                rec.lang = interviewContext.lang.startsWith('ar') ? 'ar-EG' : interviewContext.lang;
                rec.maxAlternatives = 3;
            }
        }

        if (recognitionRef.current) {
            recognitionRef.current.onstart = () => {
                isRecognitionActiveRef.current = true;
                setSystemStatus(prev => ({ ...prev, mic: true }));
                setError(null);
                console.log("[Speech] Recognition started");
            };
        }

        if (recognitionRef.current) {
            recognitionRef.current.onend = () => {
                isRecognitionActiveRef.current = false;
                console.log("[Speech] Recognition ended, isRecording:", isRecording, "isAiSpeaking:", isAiSpeakingRef.current);
                // Auto-restart ONLY if we are supposed to be recording AND AI is NOT speaking
                if (isRecording && !isAiSpeakingRef.current) {
                    console.log("[Speech] Auto-restarting...");
                    // Use a small delay to prevent rapid restart loops
                    setTimeout(() => {
                        if (recognitionRef.current && isRecording && !isAiSpeakingRef.current && !isRecognitionActiveRef.current) {
                            try {
                                recognitionRef.current.start();
                                isRecognitionActiveRef.current = true;
                            } catch (err: unknown) {
                                const error = err as Error;
                                if (error.name !== 'InvalidStateError') {
                                    console.error("[Speech] Failed to restart:", error);
                                } else {
                                    isRecognitionActiveRef.current = true;
                                }
                            }
                        }
                    }, 300); // Slightly longer delay for stability
                }
            };
        }

        if (recognitionRef.current) {
            recognitionRef.current.onresult = (event: SpeechRecognitionEvent) => {
                let interim = '';
                let finalText = '';

                // Process only new results
                for (let i = event.resultIndex; i < event.results.length; ++i) {
                    const result = event.results[i];
                    const transcript = result[0].transcript;

                    if (result.isFinal) {
                        finalText += transcript;
                    } else {
                        interim = transcript; // Only keep the latest interim
                    }
                }

                // Add final text to transcript
                if (finalText) {
                    const cleanedFinal = finalText.trim();
                    if (cleanedFinal) {
                        setTranscript(prev => {
                            // Enhanced deduplication: check if the new text overlaps with the end of existing transcript
                            const prevTrimmed = prev.trim();

                            // Check if this text is a repeat of what we just added
                            if (prevTrimmed.endsWith(cleanedFinal)) {
                                return prev; // Skip complete duplicate
                            }

                            // Check for partial overlap (last N words match first N words of new text)
                            const prevWords = prevTrimmed.split(' ').slice(-10); // Last 10 words
                            const newWords = cleanedFinal.split(' ');

                            // Find overlap: check if end of prev matches start of new
                            let overlapLength = 0;
                            for (let len = Math.min(prevWords.length, newWords.length); len > 0; len--) {
                                const prevEnd = prevWords.slice(-len).join(' ').toLowerCase();
                                const newStart = newWords.slice(0, len).join(' ').toLowerCase();
                                if (prevEnd === newStart) {
                                    overlapLength = len;
                                    break;
                                }
                            }

                            // Remove overlapping words from new text
                            const textToAdd = overlapLength > 0
                                ? newWords.slice(overlapLength).join(' ')
                                : cleanedFinal;

                            if (!textToAdd.trim()) {
                                return prev; // Nothing new to add
                            }

                            const newTranscript = prev + (prev ? ' ' : '') + textToAdd;

                            // Broadcast to Electron Overlay
                            if (window.electronAPI?.sendTranscript) {
                                window.electronAPI.sendTranscript(textToAdd);
                            }

                            // Limit transcript length
                            if (newTranscript.length > MAX_TRANSCRIPT_LENGTH) {
                                return newTranscript.slice(-MAX_TRANSCRIPT_LENGTH); // Keep last 4000 chars
                            }
                            return newTranscript;
                        });
                    }
                    setInterimTranscript('');
                } else if (interim) {
                    setInterimTranscript(interim);
                    // Also broadcast interim if possible for smoother UI
                    if (window.electronAPI?.sendTranscript) {
                        window.electronAPI.sendTranscript(interim);
                    }
                }
            };

            recognitionRef.current.onerror = (event: { error: string; }) => {
                console.log("[Speech] Error:", event.error);
                if (event.error === 'not-allowed') {
                    setError("Microphone access blocked.");
                }
                // Sync state on abort/end
                if (event.error === 'aborted' || event.error === 'audio-capture') {
                    isRecognitionActiveRef.current = false;
                }

                // Still try to restart after minor errors if recording is active
                if ((event.error === 'no-speech' || event.error === 'aborted') && isRecording && !isAiSpeakingRef.current) {
                    setTimeout(() => {
                        if (recognitionRef.current && isRecording && !isRecognitionActiveRef.current) {
                            try {
                                recognitionRef.current.start();
                                isRecognitionActiveRef.current = true;
                            } catch { /* ignore */ }
                        }
                    }, 400);
                }

                // Handle network errors with auto-retry
                if (event.error === 'network') {
                    console.log("[Speech] Network error, will retry...");
                    setTimeout(() => {
                        if (recognitionRef.current && isRecording) {
                            try {
                                recognitionRef.current.start();
                            } catch { /* ignore */ }
                        }
                    }, 1000);
                    return;
                }

                // v21.1: Silence transient errors that are already handled by the retry logic
                if (event.error === 'aborted' || event.error === 'no-speech') {
                    return;
                }

                console.error("[Speech] Recognition error:", event.error);
                if (event.error === 'not-allowed') {
                    setIsRecording(false);
                    setError("Microphone access denied. Please allow microphone permissions.");
                    setSystemStatus(prev => ({ ...prev, mic: false }));
                }
            };
        }
    }, [interviewContext.lang, isRecording]);


    useEffect(() => {
        if (!window.electronAPI) return;

        const cleanup = window.electronAPI.onProcessOcr(async (data) => {
            console.log("[Scanner] Received OCR request:", data);

            try {
                const stream = await navigator.mediaDevices.getUserMedia({
                    audio: false,
                    video: {
                        // @ts-expect-error: mandatory is a non-standard Chrome property for desktop capture
                        mandatory: {
                            chromeMediaSource: 'desktop',
                            chromeMediaSourceId: data.sourceId
                        }
                    }
                });

                const video = document.createElement('video');
                video.srcObject = stream;

                // Wait for video to be ready
                await new Promise((resolve) => {
                    video.onloadedmetadata = () => {
                        video.play().then(resolve);
                    };
                });

                const canvas = document.createElement('canvas');
                const scale = data.scaleFactor || 1;

                // Set capture resolution higher for better OCR accuracy
                canvas.width = data.bounds.width * scale;
                canvas.height = data.bounds.height * scale;

                const ctx = canvas.getContext('2d');

                if (ctx) {
                    // CRITICAL: Millimeter precision filters
                    ctx.filter = 'grayscale(100%) contrast(150%) brightness(110%)';
                    ctx.imageSmoothingEnabled = false;

                    ctx.drawImage(video,
                        data.bounds.x * scale, data.bounds.y * scale, data.bounds.width * scale, data.bounds.height * scale,
                        0, 0, canvas.width, canvas.height
                    );

                    const imageData = canvas.toDataURL('image/png', 1.0);

                    // Stop the stream
                    stream.getTracks().forEach(track => track.stop());
                    video.srcObject = null;

                    // Reuse pre-loaded Tesseract worker for zero-lag OCR
                    let worker = tesseractWorkerRef.current;
                    if (!worker) {
                        console.log("[Scanner] Worker not ready, initializing now...");
                        showToast("Initializing AI Scanner...", "info");
                        worker = await createWorker('eng', 1, {
                            logger: m => console.log("[Scanner] Progress:", m.status, Math.round(m.progress * 100) + "%"),
                        });
                        await worker.setParameters({
                            tessedit_pageseg_mode: '3',
                            preserve_interword_spaces: '1',
                        } as unknown as Record<string, string>);
                        tesseractWorkerRef.current = worker;
                    }

                    const ret = await worker.recognize(imageData);
                    const text = ret.data.text.trim();
                    // DO NOT terminate worker to reuse it for next scans

                    if (text) {
                        console.log("[Scanner] Extracted text:", text);
                        setManualQuestion(prev => {
                            const combined = prev ? prev + '\n\n' + text : text;
                            return combined.length > 3000 ? "... " + combined.slice(-3000) : combined;
                        });
                        showToast("Text captured from screen!", "success");
                    } else {
                        showToast("No text detected in the area.", "info");
                    }
                }
            } catch (err) {
                console.error("[Scanner] OCR processing failed:", err);
                showToast("Failed to process screen capture.", "error");
            }
        });

        return cleanup;
    }, [showToast]);

    // Handle End Interview - Save to history and navigate
    const handleEndInterview = async () => {
        // Cleanup ALL streams immediately to prevent memory leak and turn off hardware lights
        try {
            if (videoRef.current && videoRef.current.srcObject) {
                const stream = videoRef.current.srcObject as MediaStream;
                stream.getTracks().forEach(track => track.stop());
                videoRef.current.srcObject = null;
            }
            if (screenStreamRef.current) {
                screenStreamRef.current.getTracks().forEach(track => track.stop());
                screenStreamRef.current = null;
            }
            if (activeStreamsRef.current) {
                activeStreamsRef.current.forEach(stream => {
                    stream.getTracks().forEach(track => track.stop());
                });
                activeStreamsRef.current = [];
            }
            if (recognitionRef.current) {
                recognitionRef.current.stop();
            }
        } catch (e) {
            console.error("[Cleanup] Error stopping streams:", e);
        }

        // Only save if there's meaningful content
        if (transcript.length < 10 && allQAPairs.length === 0) {
            router.push("/dashboard");
            return;
        }

        setIsSaving(true);
        try {
            const title = interviewContext.type
                ? `${interviewContext.type} Meeting`
                : "Meeting Session";

            // Calculate interview duration in minutes
            const durationMinutes = Math.round((new Date().getTime() - interviewStartTime.getTime()) / 60000);

            posthog.capture('interview_completed', {
                duration_minutes: durationMinutes,
                questions_answered: allQAPairs.length,
                language: interviewContext.lang,
                mode: interviewContext.type,
                difficulty: interviewContext.difficulty
            });

            // Format transcript with Q&A pairs for better history display
            const formattedTranscript = allQAPairs.length > 0
                ? allQAPairs.map((qa, idx) => `Q${idx + 1}: ${qa.question}\n\nA${idx + 1}: ${qa.answer}`).join('\n\n---\n\n')
                : transcript;

            // Add a timeout to the save operation to prevent silent freeze
            const savePromise = interviewService.saveInterview(
                title,
                formattedTranscript,
                {
                    job_description: interviewContext.jd,
                    interview_type: interviewContext.type,
                    language: interviewContext.lang,
                    ai_responses: allQAPairs.map(qa => qa.answer),
                    duration_minutes: durationMinutes,
                    questions: allQAPairs.map(qa => qa.question)
                }
            );

            // 15 seconds timeout
            const timeoutPromise = new Promise((_, reject) => 
                setTimeout(() => reject(new Error("Save operation timed out")), 15000)
            );

            const savedInterview = await Promise.race([savePromise, timeoutPromise]) as any;

            showToast("Meeting saved to history", "success");
            router.push(`/dashboard/report/${savedInterview.id}`);
        } catch (error: any) {
            console.error("Failed to save interview:", error);
            showToast(error.message === "Save operation timed out" 
                ? "Connection is slow. Please try saving again." 
                : "Failed to save meeting. Please check your connection and try again.", "error");
            // Do NOT navigate away, let the user retry so data isn't lost!
        } finally {
            setIsSaving(false);
        }
    };
    // Include the Paywall Dialog
    const paywallDialog = (
        <Dialog open={showPaywall} onOpenChange={setShowPaywall}>
            <DialogContent className="sm:max-w-md bg-white/95 dark:bg-black/95 backdrop-blur-xl border-gray-200 dark:border-white/10 rounded-2xl shadow-2xl">
                <DialogHeader className="text-center sm:text-center space-y-4 pt-4">
                    <div className="mx-auto w-12 h-12 bg-amber-100 dark:bg-amber-500/20 rounded-full flex items-center justify-center mb-2">
                        <Lock className="w-6 h-6 text-amber-600 dark:text-amber-400" />
                    </div>
                    <DialogTitle className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-400">
                        Free Limit Reached
                    </DialogTitle>
                    <DialogDescription className="text-gray-600 dark:text-gray-300 text-base">
                        You've reached your free 3-question limit. To continue testing AI models and ace your interviews, upgrade to ZEDX Pro.
                    </DialogDescription>
                </DialogHeader>
                <div className="flex flex-col gap-3 py-6">
                    <div className="flex items-center gap-3 text-sm text-gray-700 dark:text-gray-300">
                        <Sparkles className="w-4 h-4 text-emerald-500" /> Unlimited AI model testing
                    </div>
                    <div className="flex items-center gap-3 text-sm text-gray-700 dark:text-gray-300">
                        <Sparkles className="w-4 h-4 text-emerald-500" /> Advanced technical deep-dives
                    </div>
                    <div className="flex items-center gap-3 text-sm text-gray-700 dark:text-gray-300">
                        <Sparkles className="w-4 h-4 text-emerald-500" /> Full interview analytics & PDFs
                    </div>
                </div>
                <DialogFooter className="sm:justify-center">
                    <Button 
                        onClick={() => router.push('/pricing')}
                        className="w-full sm:w-auto bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-medium rounded-xl px-8 py-6 h-auto shadow-lg shadow-emerald-500/20 transition-all hover:scale-105"
                    >
                        Upgrade to Pro
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );

    return (
        <div className={cn("min-h-screen flex flex-col lg:flex-row gap-4 p-2 sm:p-4 pt-20 transition-colors duration-300 overflow-auto", !isElectron && "bg-gray-50 dark:bg-zinc-950")}>
            {paywallDialog}
            {/* Drag Handle for Electron */}
            {isElectron && (
                <div 
                    style={{ WebkitAppRegion: "drag" } as React.CSSProperties} 
                    className="fixed top-0 left-0 right-0 h-6 z-[9999] flex items-center justify-center bg-black/40 backdrop-blur-md border-b border-white/10 text-[10px] uppercase font-mono tracking-widest text-emerald-400 cursor-move"
                >
                    ZEDX AI - Drag to Move
                </div>
            )}

            {/* Error Banner */}
            {error && (
                <div className="fixed top-24 left-1/2 transform -translate-x-1/2 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded z-50 flex items-center gap-2 shadow-lg">
                    <AlertCircle size={20} />
                    <span>{error}</span>
                    <Button variant="ghost" size="sm" onClick={() => setError(null)} className="ml-2 h-6 w-6 p-0 rounded-full hover:bg-red-200">
                        X
                    </Button>
                </div>
            )}

            {/* Settings Modal */}
            <SettingsDialog open={showSettings} onOpenChange={setShowSettings} />

            {/* Left Panel: Video & Transcript */}
            <div className={cn("flex flex-col gap-4 transition-all duration-300 w-full", isCameraVisible ? "lg:w-1/2" : "lg:w-1/3")}>
                {/* Video Feed */}
                {isCameraVisible && (
                    <div className="flex-1 bg-black rounded-2xl overflow-hidden relative shadow-lg min-h-[300px]">
                        {isCameraOn ? (
                            <video ref={videoRef} autoPlay muted playsInline className="w-full h-full object-cover transform scale-x-[-1]" />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-500 bg-gray-900">
                                <VideoOff size={48} />
                            </div>
                        )}

                        <div className="absolute top-4 right-4 flex gap-2">
                            <Button
                                variant="ghost"
                                size="icon"
                                className="text-white hover:bg-white/20"
                                onClick={() => setIsCameraVisible(!isCameraVisible)}
                                title={isCameraVisible ? "Hide Camera" : "Show Camera"}
                            >
                                {isCameraVisible ? <VideoOff size={20} /> : <Video size={20} />}
                            </Button>
                        </div>

                        <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 flex items-center justify-center gap-6">
                            {/* Microphone Button */}
                            <button
                                onClick={toggleRecording}
                                className={cn(
                                    "w-14 h-14 rounded-full flex items-center justify-center transition-all duration-300 shadow-lg backdrop-blur-sm",
                                    isRecording
                                        ? "bg-[#00D95A] text-white scale-110 shadow-green-500/40"
                                        : "bg-black/40 text-white hover:bg-black/60 border border-white/10"
                                )}
                                title={isRecording ? "Stop Recording" : "Start Recording"}
                            >
                                <Mic size={26} strokeWidth={isRecording ? 2.5 : 2} />
                            </button>

                            {/* Camera Toggle Button (Web Only) */}
                            {!isElectron && (
                                <button
                                    onClick={() => setIsCameraOn(!isCameraOn)}
                                    className={cn(
                                        "w-14 h-14 rounded-full flex items-center justify-center transition-all duration-300 shadow-lg backdrop-blur-sm",
                                        isCameraOn
                                            ? "bg-[#00D95A] text-white scale-110 shadow-green-500/40"
                                            : "bg-black/40 text-white hover:bg-black/60 border border-white/10"
                                    )}
                                    title={isCameraOn ? "Turn Camera Off" : "Turn Camera On"}
                                >
                                    {isCameraOn ? <Video size={26} strokeWidth={2.5} /> : <VideoOff size={26} strokeWidth={2} />}
                                </button>
                            )}

                            {/* Screen Audio Toggle Button (Electron Only) */}
                            {isElectron && (
                                <button
                                    onClick={toggleScreenAudio}
                                    className={cn(
                                        "w-14 h-14 rounded-full flex items-center justify-center transition-all duration-300 shadow-lg backdrop-blur-sm",
                                        isScreenAudioActive
                                            ? "bg-blue-500 text-white scale-110 shadow-blue-500/40"
                                            : "bg-black/40 text-white hover:bg-black/60 border border-white/10"
                                    )}
                                    title={isScreenAudioActive ? "Stop Internal Audio" : "Start Internal Audio Routing"}
                                >
                                    {isScreenAudioActive ? <Monitor size={26} strokeWidth={2.5} /> : <MonitorOff size={26} strokeWidth={2} />}
                                </button>
                            )}

                            {/* End Interview Button - Far Right */}
                            <button
                                onClick={handleEndInterview}
                                disabled={isSaving}
                                className="w-14 h-14 rounded-full flex items-center justify-center transition-all duration-300 shadow-lg backdrop-blur-sm bg-red-500 hover:bg-red-600 text-white disabled:opacity-50"
                                title="End Meeting"
                            >
                                {isSaving ? <Loader2 size={26} className="animate-spin" /> : <LogOut size={26} strokeWidth={2} />}
                            </button>
                        </div>
                    </div>
                )}

                {/* Hidden Camera State Controls */}
                {!isCameraVisible && (
                    <div className="flex justify-center gap-6 my-6 flex-wrap">
                        {/* Microphone Icon Button */}
                        <button
                            onClick={toggleRecording}
                            className={cn(
                                "w-14 h-14 sm:w-16 sm:h-16 rounded-full flex items-center justify-center transition-all duration-300 shadow-md",
                                isRecording
                                    ? "bg-[#00D95A] text-white scale-110 shadow-green-500/30 ring-4 ring-green-100 dark:ring-green-900/30"
                                    : "bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
                            )}
                            title={isRecording ? "Stop Recording" : "Start Recording"}
                        >
                            <Mic size={26} strokeWidth={isRecording ? 2.5 : 2} />
                        </button>

                        {/* Camera Icon Button (Web Only) */}
                        {!isElectron && (
                            <button
                                onClick={() => setIsCameraVisible(true)}
                                className={cn(
                                    "w-14 h-14 sm:w-16 sm:h-16 rounded-full flex items-center justify-center transition-all duration-300 shadow-md",
                                    isCameraOn
                                        ? "bg-[#00D95A] text-white scale-110 shadow-green-500/30 ring-4 ring-green-100 dark:ring-green-900/30"
                                        : "bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
                                )}
                                title={isCameraOn ? "Camera On - Show" : "Camera Off - Show"}
                            >
                                {isCameraOn ? <Video size={26} strokeWidth={2.5} /> : <VideoOff size={26} strokeWidth={2} />}
                            </button>
                        )}

                        {/* Screen Audio Toggle Button (Electron Only) */}
                        {isElectron && (
                            <button
                                onClick={toggleScreenAudio}
                                className={cn(
                                    "w-14 h-14 sm:w-16 sm:h-16 rounded-full flex items-center justify-center transition-all duration-300 shadow-md",
                                    isScreenAudioActive
                                        ? "bg-blue-500 text-white scale-110 shadow-blue-500/30 ring-4 ring-blue-100 dark:ring-blue-900/30"
                                        : "bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
                                )}
                                title={isScreenAudioActive ? "Stop Internal Audio" : "Start Internal Audio Routing"}
                            >
                                {isScreenAudioActive ? <Monitor size={26} strokeWidth={2.5} /> : <MonitorOff size={26} strokeWidth={2} />}
                            </button>
                        )}

                        {/* End Interview Button - Far Right */}
                        <button
                            onClick={handleEndInterview}
                            disabled={isSaving}
                            className="w-14 h-14 sm:w-16 sm:h-16 rounded-full flex items-center justify-center transition-all duration-300 shadow-md bg-red-500 hover:bg-red-600 text-white disabled:opacity-50"
                            title="End Meeting"
                        >
                            {isSaving ? <Loader2 size={26} className="animate-spin" /> : <LogOut size={26} strokeWidth={2} />}
                        </button>
                    </div>
                )}

                {/* Transcript Area */}
                <div className={cn("h-1/3 p-4 rounded-2xl shadow-sm border flex flex-col transition-colors", isElectron ? "bg-black/60 backdrop-blur-md border-white/10 shadow-[0_0_15px_rgba(0,0,0,0.5)]" : "bg-white dark:bg-gray-900 border-gray-100 dark:border-gray-800")}>
                    <div className="flex items-center justify-between mb-2">
                        <h3 className={cn("font-bold flex items-center gap-2", isElectron ? "text-emerald-400" : "text-gray-900 dark:text-white")}>
                            <span className={cn("w-2 h-2 rounded-full", isRecording ? "bg-red-500 animate-pulse" : "bg-gray-300")}></span>
                            Live Transcript
                        </h3>
                        <Button variant="ghost" size="sm" onClick={() => setTranscript("")} className="text-gray-400 hover:text-red-500">
                            <Trash2 size={16} />
                        </Button>
                    </div>
                    <div className={cn("flex-1 rounded-xl p-4 overflow-y-auto text-base font-sans leading-loose transition-colors", isElectron ? "bg-black/40 text-gray-200" : "bg-gray-50 dark:bg-gray-800 text-gray-800 dark:text-gray-200")}>
                        {transcript}
                        {interimTranscript && (
                            <span className="text-gray-500 dark:text-gray-400 italic">
                                {interimTranscript}
                                <span className="animate-pulse">|</span>
                            </span>
                        )}
                        {!transcript && !interimTranscript && "Click the microphone to start listening..."}
                    </div>
                </div>
            </div>

            {/* Right Panel: AI Response */}
            <div className="w-full lg:w-1/2 flex flex-col gap-4">
                <div className={cn("p-6 rounded-2xl shadow-sm border flex-1 flex flex-col transition-colors", isElectron ? "bg-black/60 backdrop-blur-md border-white/10 shadow-[0_0_15px_rgba(0,0,0,0.5)]" : "bg-white dark:bg-gray-900 border-gray-100 dark:border-gray-800")}>
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
                        <h3 className={cn("font-bold flex items-center gap-2 text-lg", isElectron ? "text-emerald-400" : "text-gray-900 dark:text-white")}>
                            <span className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></span>
                            Example of a Strong Answer
                        </h3>
                        <div className="flex flex-wrap gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setIsAutoMode(!isAutoMode)}
                                className={cn(
                                    "gap-2 text-xs sm:text-sm transition-all duration-300",
                                    isAutoMode
                                        ? "bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-500 shadow-lg shadow-emerald-500/20"
                                        : "bg-white dark:bg-zinc-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-zinc-700"
                                )}
                            >
                                <Sparkles size={14} />
                                <span className="hidden sm:inline">{isAutoMode ? "Coaching Suggestions ON" : "Coaching Suggestions OFF"}</span>
                                <span className="sm:hidden">{isAutoMode ? "Suggestions ON" : "Suggestions OFF"}</span>
                            </Button>

                            <Button
                                onClick={async () => {
                                    if (window.electronAPI) {
                                        const res = await window.electronAPI.toggleScannerFrame();
                                        setIsScannerActive(res.active);
                                    }
                                }}
                                variant={isScannerActive ? "default" : "outline"}
                                size="sm"
                                className={cn(
                                    "gap-2 text-xs sm:text-sm transition-all duration-300",
                                    isScannerActive
                                        ? "bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-red-500/20"
                                        : "bg-white dark:bg-zinc-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-zinc-700"
                                )}
                            >
                                <Scan size={14} />
                                <span className="hidden sm:inline">{isScannerActive ? "Close Scanner" : "Screen Capture"}</span>
                                <span className="sm:hidden">{isScannerActive ? "Close" : "Scanner"}</span>
                            </Button>
                        </div>
                    </div>

                    {/* Manual Input for Coding Questions */}
                    <div className="mb-4">
                        <div className="flex items-center justify-between mb-2">
                            <label className={cn("text-xs font-bold uppercase tracking-wider", isElectron ? "text-emerald-400" : "text-gray-500 dark:text-gray-400")}>
                                Manual Question / Code
                            </label>
                            {manualQuestion && (
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setManualQuestion("")}
                                    className="h-6 px-2 text-gray-400 hover:text-red-500 text-[10px] gap-1"
                                >
                                    <Trash2 size={12} /> Clear
                                </Button>
                            )}
                        </div>
                        <div className="relative">
                            <textarea
                                value={manualQuestion}
                                onChange={(e) => setManualQuestion(e.target.value)}
                                placeholder="Paste coding question or type here... (Press Enter to ask)"
                                className={cn("w-full p-4 pr-12 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500/50 resize-y min-h-[120px] shadow-sm", isElectron ? "bg-black/40 border border-white/10 text-gray-200" : "border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-800 dark:text-gray-200")}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && !e.shiftKey) {
                                        e.preventDefault();
                                        handleManualSubmit();
                                    }
                                }}
                            />
                            <Button
                                size="icon"
                                onClick={handleManualSubmit}
                                disabled={isLoading || !manualQuestion.trim()}
                                className="absolute bottom-3 right-3 h-9 w-9 bg-green-600 hover:bg-green-700 text-white rounded-lg shadow-md disabled:opacity-50 transition-all hover:scale-105"
                                title="Get Answer"
                            >
                                <Sparkles size={18} />
                            </Button>
                        </div>
                    </div>

                    <div className={cn("flex-1 rounded-xl p-6 overflow-y-auto prose prose-lg max-w-none transition-colors relative", isElectron ? "bg-black/40 text-gray-200 prose-invert" : "bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100")}>
                        <div className="absolute top-2 right-2 flex gap-1">
                            {/* Retry Button - always shows when lastTranscript exists */}
                            {lastTranscript && (
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-blue-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                                    onClick={() => getAiAnswer(lastTranscript)}
                                    disabled={isLoading}
                                    title="Retry last question"
                                >
                                    <RotateCcw size={16} />
                                </Button>
                            )}
                            {/* Copy Button */}
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                                onClick={() => {
                                    navigator.clipboard.writeText(aiResponse.replace(/\*\*/g, '').replace(/\*/g, ''));
                                    showToast("Copied to clipboard!", "success");
                                }}
                                title="Copy to clipboard"
                            >
                                <Copy size={16} />
                            </Button>
                        </div>
                        <div className="leading-loose text-lg">
                            <ReactMarkdown>{aiResponse}</ReactMarkdown>
                        </div>
                        
                        {/* Independent Mode Trigger */}
                        {lastTranscript && aiResponse && !aiResponse.includes("Ready to Assist") && !isIndependentModeActive && !independentEvaluation && (
                            <div className="mt-8 border-t border-gray-200 dark:border-gray-700 pt-6 animate-fade-in-up">
                                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4 border border-blue-100 dark:border-blue-800/50">
                                    <div className="flex-1">
                                        <h4 className="font-bold text-blue-800 dark:text-blue-400 mb-1">Independent Practice</h4>
                                        <p className="text-sm text-blue-700/80 dark:text-blue-300/80">You've learned this question. Now try answering it again without AI assistance to measure your improvement.</p>
                                    </div>
                                    <Button 
                                        onClick={() => {
                                            setIsIndependentModeActive(true);
                                            setTranscript(""); // Clear transcript to let them speak
                                        }}
                                        className="bg-blue-600 hover:bg-blue-700 text-white shrink-0 shadow-md transition-all hover:scale-105"
                                    >
                                        Try Independently
                                    </Button>
                                </div>
                            </div>
                        )}
                        
                        {/* Independent Mode Active State */}
                        {isIndependentModeActive && (
                            <div className="mt-8 border-t border-gray-200 dark:border-gray-700 pt-6 animate-fade-in-up">
                                <div className="bg-indigo-50 dark:bg-indigo-900/20 rounded-xl p-5 border border-indigo-200 dark:border-indigo-800/50">
                                    <div className="flex items-center gap-3 mb-4">
                                        <span className="relative flex h-3 w-3">
                                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                                            <span className="relative inline-flex rounded-full h-3 w-3 bg-indigo-500"></span>
                                        </span>
                                        <h4 className="font-bold text-indigo-900 dark:text-indigo-300">Independent Mode Active</h4>
                                    </div>
                                    <p className="text-sm text-indigo-700/80 dark:text-indigo-300/80 mb-4">
                                        Speak your answer now. When finished, submit to receive your performance score.
                                    </p>
                                    <div className="flex justify-end gap-3">
                                        <Button variant="ghost" size="sm" onClick={() => setIsIndependentModeActive(false)} className="text-gray-500">Cancel</Button>
                                        <Button 
                                            size="sm"
                                            onClick={handleIndependentSubmit}
                                            disabled={isLoading || !transcript.trim()}
                                            className="bg-indigo-600 hover:bg-indigo-700 text-white"
                                        >
                                            Submit for Evaluation
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Independent Mode Evaluation Result */}
                        {independentEvaluation && (
                            <div className="mt-8 border-t border-gray-200 dark:border-gray-700 pt-6 animate-fade-in-up">
                                <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-xl p-6 border border-emerald-200 dark:border-emerald-800/50">
                                    <h4 className="font-bold text-emerald-800 dark:text-emerald-400 mb-4 flex items-center gap-2">
                                        <CheckCircle2 size={18} />
                                        Performance Analysis
                                    </h4>
                                    <div className="prose prose-sm dark:prose-invert max-w-none prose-emerald">
                                        <ReactMarkdown>{independentEvaluation}</ReactMarkdown>
                                    </div>
                                    <div className="mt-6 flex justify-end">
                                        <Button 
                                            size="sm" 
                                            variant="outline" 
                                            onClick={() => setIndependentEvaluation(null)}
                                            className="border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/40"
                                        >
                                            Dismiss
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Debug Info */}
                    <div className="mt-4 text-xs text-center text-gray-400">
                        {isAutoMode ? "AI will answer automatically after you stop speaking." : "Press Space to generate answer"}
                    </div>
                    {/* Debug Info */}
                    <div className="mt-2 text-[10px] text-gray-300 text-center">
                        Context Loaded: User File ({interviewContext.resume.length} chars) | Agenda ({interviewContext.jd.length} chars)
                    </div>

                </div>
            </div>

        </div>
    );
}
