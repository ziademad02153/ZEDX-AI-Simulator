"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Mic, MicOff, Video, AlertCircle, Loader2, X, Camera, CameraOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import { SUPPORTED_LANGUAGES } from "@/lib/languages";
import { supabase } from "@/lib/supabase";
import { interviewService } from "@/lib/interview-service";
import { useInterviewStore } from "@/lib/store";

export default function MockInterviewPage() {
    const router = useRouter();
    const [isSetup, setIsSetup] = useState(false);
    
    // Hardware State - Auto enabled since permissions were tested on setup page
    const [isMicEnabled, setIsMicEnabled] = useState(true);
    const [isCameraEnabled, setIsCameraEnabled] = useState(true);
    const [isInterviewStarted, setIsInterviewStarted] = useState(false);
    
    // Context State
    const [jd, setJd] = useState("");
    const [resume, setResume] = useState("");
    const [difficulty, setDifficulty] = useState("Intermediate");
    const [interviewType, setInterviewType] = useState("Technical");
    const [questionCount, setQuestionCount] = useState(10);
    const [language, setLanguage] = useState("en-US");
    const [model, setModel] = useState("qwen/qwen3.8-27b");

    // Interview State
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [questionsAsked, setQuestionsAsked] = useState<{ q: string, a: string }[]>([]);
    const [zedxText, setZedxText] = useState("Initializing interview...");
    const [userTranscript, setUserTranscript] = useState("");
    
    const [isSpeaking, setIsSpeaking] = useState(false); // Is ZEDX speaking?
    const [isListening, setIsListening] = useState(false); // Are we listening to user?
    const [audioLevel, setAudioLevel] = useState(0);
    
    const videoRef = useRef<HTMLVideoElement>(null);
    const recognitionRef = useRef<any>(null);
    const silenceTimerRef = useRef<NodeJS.Timeout | null>(null);
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const finalTranscriptRef = useRef("");
    const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
    const isMounted = useRef(true);
    const hasStartedRef = useRef(false);
    const dbInterviewIdRef = useRef<string | null>(null);

    // Track latest state to avoid stale closures in event listeners and timeouts
    const stateRef = useRef({
        isListening,
        questionsAsked,
        currentQuestionIndex,
        userTranscript
    });

    useEffect(() => {
        stateRef.current = {
            isListening,
            questionsAsked,
            currentQuestionIndex,
            userTranscript
        };
    }, [isListening, questionsAsked, currentQuestionIndex, userTranscript]);

    // Initialize context from Zustand (and fallback to localStorage for backwards compatibility/hard reloads if any)
    useEffect(() => {
        let _jd = "";
        let _resume = "";
        let _diff = "Intermediate";
        let _type = "Technical";
        let _count = 10;
        let _lang = "en-US";
        let _model = "qwen/qwen3.8-27b";

        try {
            const state = useInterviewStore.getState();
            _jd = state.jobDescription || localStorage.getItem("interview_context_jd") || "";
            _resume = state.resumeText || localStorage.getItem("interview_context_resume") || "";
            _diff = state.difficulty || localStorage.getItem("interview_context_difficulty") || "Intermediate";
            _type = state.interviewType || localStorage.getItem("interview_context_type") || "Technical";
            _count = parseInt(localStorage.getItem("interview_context_question_count") || "10", 10);
            _lang = state.language || localStorage.getItem("interview_context_lang") || "en-US";
            _model = localStorage.getItem("selected_ai_model") || "qwen/qwen3.8-27b";
        } catch (e) {
            console.warn("Could not read interview state", e);
        }

        if (!_jd || !_resume) {
            router.push("/dashboard/new");
            return;
        }

        setJd(_jd);
        setResume(_resume);
        setDifficulty(_diff);
        setInterviewType(_type);
        setQuestionCount(_count);
        setLanguage(_lang);
        setModel(_model);
        setIsSetup(true);
    }, [router]);

    // Setup Webcam & Speech Recognition
    useEffect(() => {
        if (!isSetup) return;

        let stream: MediaStream | null = null;
        let audioCtx: any = null;
        let jsNode: any = null;
        
        // Wait until user explicitly enables hardware to request permissions
        if (!isMicEnabled && !isCameraEnabled) return;

        // 1. Setup Webcam
        const constraints = { 
            video: isCameraEnabled, 
            audio: isMicEnabled 
        };

        if (isMicEnabled || isCameraEnabled) {
            navigator.mediaDevices.getUserMedia(constraints)
                .then(s => {
                    stream = s;
                    if (videoRef.current && isCameraEnabled) {
                        videoRef.current.srcObject = stream;
                    }
                    
                    // Setup Audio Context for Mic Level indicator only if Mic is enabled
                    if (isMicEnabled) {
                        audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
                        const analyser = audioCtx.createAnalyser();
                        const microphone = audioCtx.createMediaStreamSource(stream);
                        jsNode = audioCtx.createScriptProcessor(2048, 1, 1);
                        
                        // Mute the audio so the user doesn't hear themselves (Echo bug fix)
                        const gainNode = audioCtx.createGain();
                        gainNode.gain.value = 0;
                        
                        analyser.smoothingTimeConstant = 0.8;
                        analyser.fftSize = 1024;
                        
                        microphone.connect(analyser);
                        analyser.connect(jsNode);
                        jsNode.connect(gainNode);
                        gainNode.connect(audioCtx.destination);
                        
                        jsNode.onaudioprocess = () => {
                            const array = new Uint8Array(analyser.frequencyBinCount);
                            analyser.getByteFrequencyData(array);
                            let values = 0;
                            const length = array.length;
                            for (let i = 0; i < length; i++) {
                                values += (array[i]);
                            }
                            const average = values / length;
                            setAudioLevel(average);
                        };
                    }
                })
                .catch(err => {
                    console.error("Hardware error:", err);
                    alert("Permission denied or device not found.");
                    if (isMicEnabled) setIsMicEnabled(false);
                    if (isCameraEnabled) setIsCameraEnabled(false);
                });
        }

        // 2. Setup Speech Recognition
        const SpeechRecognitionClass = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        if (SpeechRecognitionClass) {
            const recognition = new SpeechRecognitionClass();
            recognition.continuous = true;
            recognition.interimResults = true;
            recognition.lang = language;
            
            recognition.onresult = (event: any) => {
                if (!stateRef.current.isListening) return; // Prevent trailing events after stop()

                let interimTranscript = "";
                let hasValidSpeech = false;
                
                for (let i = event.resultIndex; i < event.results.length; ++i) {
                    const result = event.results[i][0];
                    // Filter out obvious background noise (low confidence)
                    if (event.results[i].isFinal && result.confidence < 0.5) continue;
                    
                    if (event.results[i].isFinal) {
                        finalTranscriptRef.current += result.transcript;
                        hasValidSpeech = true;
                    } else {
                        interimTranscript += result.transcript;
                        if (result.transcript.trim().length > 3) hasValidSpeech = true;
                    }
                }
                
                const currentText = finalTranscriptRef.current + interimTranscript;
                setUserTranscript(currentText);

                // Reset Silence Timer
                if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
                
                // If they spoke something meaningful, start the 3 second silence countdown
                if (currentText.trim().length > 0 && hasValidSpeech) {
                    silenceTimerRef.current = setTimeout(() => {
                        handleUserFinishedSpeaking(currentText);
                    }, 3000); // 3 seconds of silence = auto submit
                } else if (currentText.trim().length > 0) {
                    // Fallback for very short noises so it doesn't hang forever if it was actually speech
                    silenceTimerRef.current = setTimeout(() => {
                        handleUserFinishedSpeaking(currentText);
                    }, 6000);
                }
            };
            
            let fatalError = false;
            recognition.onerror = (event: any) => {
                console.warn("Speech error:", event.error);
                if (event.error === 'not-allowed' || event.error === 'audio-capture') {
                    fatalError = true;
                    alert("Microphone access denied or not found. Please check permissions.");
                }
            };
            recognition.onend = () => {
                // If we are still supposed to be listening, restart it (avoiding stale closure)
                if (stateRef.current.isListening && !fatalError) {
                    try { recognition.start(); } catch (e) {}
                }
            };
            
            recognitionRef.current = recognition;
        }

        return () => {
            isMounted.current = false;
            if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
            if (recognitionRef.current) {
                recognitionRef.current.onend = null;
                try { recognitionRef.current.stop(); } catch (e) {}
            }
            if (audioRef.current) {
                audioRef.current.onended = null;
                audioRef.current.pause();
                audioRef.current.src = "";
            }
            // Stop fallback browser TTS if it's currently speaking
            if (typeof window !== 'undefined' && window.speechSynthesis) {
                window.speechSynthesis.cancel();
            }
            if (stream) {
                stream.getTracks().forEach(track => track.stop());
            }
            if (videoRef.current) {
                videoRef.current.srcObject = null;
            }
            // Clean up AudioContext to prevent browser limit crash
            if (jsNode) {
                try { jsNode.disconnect(); } catch (e) {}
            }
            if (audioCtx && audioCtx.state !== 'closed') {
                try { audioCtx.close(); } catch (e) {}
            }
        };
    }, [isSetup, isMicEnabled, isCameraEnabled]);

    // Check Start Condition
    useEffect(() => {
        if (isSetup && isMicEnabled && isCameraEnabled && !hasStartedRef.current) {
            hasStartedRef.current = true;
            setIsInterviewStarted(true);
            generateNextQuestion(0, []);
        }
    }, [isSetup, isMicEnabled, isCameraEnabled]);

    const handleUserFinishedSpeaking = async (transcript: string) => {
        const { isListening: currentIsListening, questionsAsked: currentQuestions, currentQuestionIndex: currentIndex } = stateRef.current;
        
        if (!currentIsListening) return;
        setIsListening(false);
        stateRef.current.isListening = false; // Synchronous block for trailing events
        if (recognitionRef.current) recognitionRef.current.stop();
        if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);

        const newHistory = [...currentQuestions];
        if (newHistory.length > 0) {
            newHistory[newHistory.length - 1].a = transcript;
        }
        setQuestionsAsked(newHistory);
        setUserTranscript(""); // Clear UI
        finalTranscriptRef.current = ""; // Reset stable transcript for next question

        // Auto-save progress to DB in background
        if (dbInterviewIdRef.current) {
            interviewService.updateInterview(dbInterviewIdRef.current, { analysis: { questions: newHistory } }).catch(console.error);
            localStorage.setItem("current_db_id", dbInterviewIdRef.current);
        } else {
            interviewService.saveInterview("In-Progress Interview", "", { questions: newHistory }).then(saved => {
                dbInterviewIdRef.current = saved.id;
                localStorage.setItem("current_db_id", saved.id);
            }).catch(console.error);
        }

        // Generate next question
        await generateNextQuestion(currentIndex + 1, newHistory);
    };

    const generateNextQuestion = async (index: number, history: any[]) => {
        if (index >= questionCount) {
            setZedxText("The interview is complete. Generating your report...");
            speakText("The interview is complete. Generating your report...");
            setTimeout(() => {
                localStorage.setItem("interview_results", JSON.stringify(history));
                router.push("/dashboard/report"); // We will build this later
            }, 4000);
            return;
        }

        setZedxText("Thinking...");
        setIsSpeaking(true);

        // Determine if this question should focus on JD or Resume (50/50)
        const focusArea = index % 2 === 0 ? "Job Description" : "Resume";
        
        const langObj = SUPPORTED_LANGUAGES.find(l => l.code === language) || SUPPORTED_LANGUAGES[0];
        let nextQuestionText = "";

        if (index === 0) {
            const prompt = `You are ZEDX. Write your name in a way that forces the text-to-speech engine to pronounce it as a single continuous word "Zedex" in the target language (e.g. write "زيدكس" in Arabic, or "Zedex" in English and other Latin languages). DO NOT write it in all caps like ZEDX or Z-E-D-X as it will be spelled out letter by letter.
This is the very first opening question of the mock interview.
Your task is to:
1. Extract the candidate's first name from the Resume context below.
2. Greet the candidate by their name.
3. Introduce yourself as ZEDX and state that you will be conducting their mock interview today.
4. Ask them to introduce themselves and tell you a little bit about their background and experience.
5. You MUST generate this response STRICTLY in ${langObj.name}.

Do not ask any other technical questions yet. Keep it warm, welcoming, and concise.
Resume Context: ${resume}`;
            
            try {
                const { data: { session } } = await supabase.auth.getSession();
                const token = session?.access_token;
                const res = await fetch("/api/generate", {
                    method: "POST",
                    headers: { "Content-Type": "application/json", ...(token ? { "Authorization": `Bearer ${token}` } : {}) },
                    body: JSON.stringify({ model: (typeof window !== "undefined" ? localStorage.getItem("selected_ai_model") : null) || model, promptType: 'mock_interview', promptContext: { interviewType, difficulty, language }, prompt })
                });
                const data = await res.json().catch(() => ({}));
                if (!isMounted.current) return;
                if (!res.ok) throw new Error(data.error?.message || "API request failed");
                nextQuestionText = data.content;
            } catch (err) {
                console.error("AI Generation Failed for Intro:", err);
                // Fallback to hardcoded if AI fails
                nextQuestionText = langObj.code.startsWith('ar') 
                    ? "أهلاً بيك، أنا زيدكس. هعمل معاك الانترفيو التجريبي النهاردة. ممكن تكلمني شوية عن نفسك وخبرتك؟"
                    : "Welcome, I am Zedex. I will be conducting your mock interview today. Could you please tell me a little bit about yourself?";
            }
        } else {
            const previousQ = history[index - 1].q;
            const previousA = history[index - 1].a;
            
            const askedQuestions = history.map(h => h.q).join(" | ");
            const randomAngle = ["leadership skills", "problem solving", "technical depth", "past challenges", "teamwork and communication", "adaptability"][Math.floor(Math.random() * 6)];

            const prompt = `The candidate just answered your previous question ("${previousQ}") with: "${previousA}".
First, analyze their answer. Then, craft your next question.
You are a highly intelligent, conversational interviewer. Do NOT just read off a script. 
Either ask a smart follow-up question that probes deeper into what they just said, OR smoothly transition to a new topic focusing on their ${focusArea} (framed around ${randomAngle}).
Keep it conversational and natural.
CRITICAL RULE: DO NOT ask any of these previously asked questions again: [${askedQuestions}].
IMPORTANT: DO NOT ask the candidate if they have any questions for you. Only ask questions that test the candidate's qualifications.
Job Description Context: ${jd}
Resume Context: ${resume}`;

            try {
                const { data: { session } } = await supabase.auth.getSession();
                const token = session?.access_token;
                
                const res = await fetch("/api/generate", {
                    method: "POST",
                    headers: { 
                        "Content-Type": "application/json",
                        ...(token ? { "Authorization": `Bearer ${token}` } : {})
                    },
                    body: JSON.stringify({
                        model: model,
                        promptType: 'mock_interview',
                        promptContext: { interviewType, difficulty, language },
                        prompt
                    })
                });
                const data = await res.json().catch(() => ({}));
                if (!isMounted.current) return;
                
                if (!res.ok) {
                    throw new Error(data.error?.message || "API request failed");
                }
                
                nextQuestionText = data.content;
            } catch (err) {
                console.error("AI Generation Failed:", err);
                nextQuestionText = "I apologize, but I have lost connection to my AI servers. Please check your Groq API key and rate limits.";
                // Optional: We could forcefully end the interview here
            }
        }
        
        // Save to history
        const newHistory = [...history, { q: nextQuestionText, a: "" }];
        setQuestionsAsked(newHistory);
        setCurrentQuestionIndex(index);
        
        // Play TTS
        await speakText(nextQuestionText);
    };

    const speakText = async (text: string) => {
        if (audioRef.current) {
            audioRef.current.onended = null;
            audioRef.current.pause();
            audioRef.current.src = "";
        }
        if (typeof window !== 'undefined' && window.speechSynthesis) {
            window.speechSynthesis.cancel();
        }

        setIsSpeaking(true);
        // We set text empty until audio starts playing for perfect sync
        setZedxText(""); 

        const fallbackTTS = () => {
            setZedxText(text);
            const utterance = new SpeechSynthesisUtterance(text);
            utteranceRef.current = utterance; // Prevent garbage collection
            utterance.lang = language;
            
            // Make the fallback voice faster and more lively
            utterance.rate = 1.15; // 15% faster
            utterance.pitch = 1.1; // Slightly higher pitch for energy
            
            const onEndOrError = () => {
                setIsSpeaking(false);
                setIsListening(true);
                setUserTranscript("");
                if (recognitionRef.current) {
                    try { recognitionRef.current.start(); } catch (e) {}
                }
            };
            
            utterance.onend = onEndOrError;
            utterance.onerror = onEndOrError;
            window.speechSynthesis.speak(utterance);
        };

        try {
            let audioUrl = "";
            let blob: Blob;

            if (language.startsWith('ar')) {
                // Arabic goes to our Vercel API (which uses ElevenLabs)
                const { data: { session } } = await supabase.auth.getSession();
                const token = session?.access_token || "";

                const res = await fetch("/api/tts", {
                    method: "POST",
                    headers: { 
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${token}`
                    },
                    body: JSON.stringify({ text, language })
                });

                if (!isMounted.current) return;
                if (!res.ok) throw new Error("TTS failed");

                blob = await res.blob();
                audioUrl = URL.createObjectURL(blob);
            } else {
                // Completely free, zero-latency client-side TTS using native browser voices
                // This does NOT use WebSockets, so the red WebSocket error is impossible here.
                const playPremiumNativeTTS = () => {
                    setZedxText(text);
                    const utterance = new SpeechSynthesisUtterance(text);
                    utteranceRef.current = utterance;
                    utterance.lang = language;
                    
                    // Apply speed and liveliness improvements
                    utterance.rate = 1.15; // 15% faster
                    utterance.pitch = 1.1; // Slightly higher pitch for energy
                    
                    const voices = window.speechSynthesis.getVoices();
                    const langPrefix = language.split('-')[0]; // e.g. 'en', 'es', 'fr'
                    
                    // Prioritize premium MALE voices built into the user's OS/Browser for the specific language
                    const bestMaleVoice = voices.find(v => 
                        v.lang.startsWith(langPrefix) && 
                        (v.name.includes("Google UK English Male") || v.name.includes("Daniel") || v.name.includes("Alex") || v.name.includes("David") || v.name.includes("Male"))
                    ) || voices.find(v => v.lang.startsWith(langPrefix));
                    
                    if (bestMaleVoice) utterance.voice = bestMaleVoice;

                    const onEndOrError = () => {
                        setIsSpeaking(false);
                        setIsListening(true);
                        setUserTranscript("");
                        if (recognitionRef.current) {
                            try { recognitionRef.current.start(); } catch (e) {}
                        }
                    };
                    
                    utterance.onend = onEndOrError;
                    utterance.onerror = onEndOrError;
                    
                    // Cancel any ongoing speech before starting
                    window.speechSynthesis.cancel();
                    window.speechSynthesis.speak(utterance);
                };

                // Browsers load voices asynchronously, we must ensure they are loaded before speaking
                if (window.speechSynthesis.getVoices().length === 0) {
                    window.speechSynthesis.onvoiceschanged = playPremiumNativeTTS;
                } else {
                    playPremiumNativeTTS();
                }
                return; // Exit early since audio playback is handled natively
            }

            if (!isMounted.current) return;
            
            const audio = new Audio(audioUrl);
            audioRef.current = audio;

            audio.onplay = () => {
                // Sync text with audio start
                setZedxText(text);
            };

            audio.onended = () => {
                URL.revokeObjectURL(audioUrl); // Fix memory leak
                setIsSpeaking(false);
                // Start listening to user
                setIsListening(true);
                setUserTranscript("");
                if (recognitionRef.current) {
                    try { recognitionRef.current.start(); } catch (e) {}
                }
            };

            // Catch playback errors (e.g., autoplay policies or format issues)
            audio.play().catch(err => {
                console.error("Audio playback failed:", err);
                URL.revokeObjectURL(audioUrl); // Fix memory leak on error
                fallbackTTS();
            });

        } catch (err) {
            console.error("TTS Error", err);
            fallbackTTS();
        }
    };

    const endInterview = () => {
        if (confirm("Are you sure you want to end the interview early? Your current progress will be saved.")) {
            if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
            localStorage.setItem("interview_results", JSON.stringify(stateRef.current.questionsAsked));
            router.push("/dashboard/report");
        }
    };

    if (!isSetup) return <div className="min-h-screen bg-black flex items-center justify-center"><Loader2 className="animate-spin text-emerald-500 w-12 h-12" /></div>;

    return (
        <div className="min-h-screen bg-black text-white relative overflow-hidden flex flex-col">
            {/* Top Bar */}
            <div className="w-full p-6 flex justify-between items-center z-20">
                <div className="flex items-center gap-1 -ml-4">
                    <Image
                        src="/ZEDX-NEW LOGO-2.png"
                        alt="ZEDX-AI Logo"
                        width={180}
                        height={50}
                        className="object-contain"
                    />
                    <div className="h-8 w-[1px] bg-white/20 mx-2"></div>
                    <p className="text-[#84cc16] text-sm font-semibold whitespace-nowrap mt-1">Question {currentQuestionIndex + 1} of {questionCount}</p>
                </div>
                <Button onClick={endInterview} variant="ghost" className="text-red-400 hover:text-red-300 hover:bg-red-500/10">
                    <X className="mr-2 w-4 h-4" /> End Interview
                </Button>
            </div>

            {/* Main Center (Glowing Orb) */}
            <div className="flex-1 flex flex-col md:flex-row items-center justify-center p-6 gap-12 z-10">
                
                {/* AI Orb */}
                <div className="relative w-48 h-48 sm:w-64 sm:h-64 flex-shrink-0 flex items-center justify-center">
                    <motion.div 
                        animate={{ 
                            scale: isSpeaking ? [1, 1.1, 1] : 1,
                            opacity: isSpeaking ? [0.7, 1, 0.7] : 0.5
                        }}
                        transition={{ duration: 1.5, repeat: Infinity }}
                        className="absolute inset-0 bg-[#84cc16] rounded-full blur-[80px]"
                    ></motion.div>
                    
                    <div className="relative w-32 h-32 sm:w-48 sm:h-48 rounded-full bg-black border-2 border-[#84cc16]/50 flex items-center justify-center shadow-[0_0_40px_rgba(132,204,22,0.3)] z-10 overflow-hidden">
                        {isSpeaking ? (
                            <div className="flex gap-2 items-center h-12 z-20">
                                {[1, 2, 3, 4, 5].map((i) => (
                                    <motion.div 
                                        key={i}
                                        animate={{ height: ["20%", "100%", "20%"] }}
                                        transition={{ duration: Math.random() * 0.5 + 0.5, repeat: Infinity, delay: i * 0.1 }}
                                        className="w-2 sm:w-3 bg-[#84cc16] rounded-full"
                                    ></motion.div>
                                ))}
                            </div>
                        ) : (
                            <Image src="/icon.jpg" alt="ZEDX" fill className="object-cover scale-[0.70] opacity-100" />
                        )}
                    </div>
                </div>

                {/* AI Text Bubble */}
                <AnimatePresence mode="wait">
                    {zedxText && (
                        <motion.div 
                            key={zedxText}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0 }}
                            className="max-w-xl bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 sm:p-8 shadow-2xl relative"
                        >
                            {/* Arrow removed for cleaner glassmorphism look */}
                            <p className="text-xl sm:text-2xl text-emerald-50 leading-relaxed">
                                {zedxText}
                            </p>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Bottom Section: Webcam & User Speech */}
            <div className="w-full p-6 flex items-end justify-between z-20 gap-6">
                
                {/* Hardware Controls & Webcam Box */}
                <div className="flex gap-4 items-center">
                    {/* Webcam Box */}
                    <div className="relative w-48 sm:w-64 rounded-2xl overflow-hidden border border-white/10 bg-gray-900 shadow-xl flex-shrink-0 aspect-[4/3] flex items-center justify-center">
                        {!isCameraEnabled && (
                            <div className="absolute inset-0 bg-gradient-to-br from-gray-900 to-black flex items-center justify-center flex-col gap-2 opacity-70">
                                <CameraOff className="w-8 h-8 text-white/20" />
                                <span className="text-xs text-white/40 font-medium">Camera Disabled</span>
                            </div>
                        )}
                        <video ref={videoRef} autoPlay muted playsInline className="w-full h-full object-cover transform -scale-x-100" />
                    </div>{/* end webcam box */}
                </div>{/* end hardware controls wrapper */}

                {/* User Transcript Bubble (Only shows when listening & speaking) */}
                <div className="flex-1 max-w-2xl justify-self-end">
                    <AnimatePresence>
                        {isListening && userTranscript && (
                            <motion.div 
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0 }}
                                className="bg-emerald-900/30 border border-emerald-500/30 backdrop-blur-md rounded-2xl p-4 text-emerald-100 text-lg shadow-lg"
                            >
                                {userTranscript}
                                <span className="animate-pulse ml-1">|</span>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>

            {/* Background Effects */}
            <div className="absolute inset-0 z-0 pointer-events-none">
                <div className="absolute top-[-20%] right-[-10%] w-[50%] h-[50%] bg-emerald-900/20 blur-[120px] rounded-full"></div>
                <div className="absolute bottom-[-20%] left-[-10%] w-[50%] h-[50%] bg-green-900/10 blur-[120px] rounded-full"></div>
            </div>
        </div>
    );
}
