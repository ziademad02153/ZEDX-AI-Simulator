"use client";

/**
 * ============================================================================
 * WEB PLATFORM MOCK INTERVIEW SIMULATOR
 * ============================================================================
 * This file is for the WEB PLATFORM ONLY (Candidate practice, camera, video,
 * and conversational AI interviewer).
 * 
 * NOTE: Changes in this file DO NOT affect the Electron Desktop Stealth Copilot.
 * The Electron Desktop Assistant is located at: `src/app/desktop-assistant/page.tsx`
 * ============================================================================
 */

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Mic, MicOff, Video, AlertCircle, Loader2, X, Camera, CameraOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import { SUPPORTED_LANGUAGES } from "@/lib/languages";
import { disposeAmySpeech, preloadAmySpeech, synthesizeAmySpeech, getEnglishSpeechPreference, setEnglishSpeechPreference, splitAmySpeechText } from "@/lib/piper-amy";
import { getAmyOpeningText } from '@/lib/piper-amy-opening';
import { markInterviewFirstAudio, observeInterviewPreview } from '@/lib/interview-startup-timing';
import { getWebInterviewMessages, getWebSpeechProvider, loadWebSpeechVoices, resolveWebInterviewLanguage, selectWebSpeechVoice } from "@/lib/web-interview-language";
import { supabase } from "@/lib/supabase";
import { interviewService, SessionExchange } from "@/lib/interview-service";
import { useInterviewStore } from "@/lib/store";
import { Lock } from "lucide-react";
import { PaywallModal } from "@/components/paywall-modal";
import { toast } from 'sonner';

const PHONETIC_EGYPTIAN_NAMES_AR: Record<string, string> = {
    // Male Names
    "ziad": "زِيَاد", "zeyad": "زِيَاد", "ahmed": "أَحْمَد", "mohamed": "مُحَمَّد", 
    "mohammed": "مُحَمَّد", "mahmoud": "مَحْمُود", "mostafa": "مُصْطَفَى", "mustafa": "مُصْطَفَى", 
    "amr": "عَمْرو", "omar": "عُمَر", "kareem": "كَرِيم", "karim": "كَرِيم", "khaled": "خَالِد", 
    "tareq": "طَارِق", "tarek": "طَارِق", "youssef": "يُوسُف", "yousef": "يُوسُف", "ali": "عَلِي", 
    "hussein": "حُسَيْن", "hassan": "حَسَن", "ibrahim": "إِبْرَاهِيم", "alaa": "عَلَاء", 
    "islam": "إِسْلَام", "eslam": "إِسْلَام", "abdullah": "عَبْدُ اللَّه", "abdelrahman": "عَبْدُ الرَّحْمَن",
    "basem": "بَاسِم", "bassem": "بَاسِم", "hazem": "حَازِم", "mina": "مِينَا", "bishoy": "بِيشُوي", 
    "kirollos": "كِيرُلُّس", "abanoub": "أَبَانُوب", "fady": "فَادِي", "hany": "هَانِي", 
    "ramy": "رَامِي", "nader": "نَادِر", "magdy": "مَجْدِي", "maged": "مَاجِد", "emad": "عِمَاد", 
    "ehab": "إِيهَاب", "ihab": "إِيهَاب", "tamer": "تَامِر", "wael": "وَائِل", "yasser": "يَاسِر", 
    "ayman": "أَيْمَن", "ashraf": "أَشْرَف", "sherif": "شَرِيف", "adel": "عَادِل", "essam": "عِصَام", 
    "hesham": "هِشَام", "bahaa": "بَهَاء", "diaa": "ضِيَاء", "gamal": "جَمَال", "kamal": "كَمَال", 
    "nabil": "نَبِيل", "sameh": "سَامِح", "safwat": "صَفْوَت", "raouf": "رَؤُوف", "farid": "فَرِيد", 
    "yassin": "يَاسِين", "hamza": "حَمْزَة", "seif": "سَيْف", "eyad": "إِيَاد", "marwan": "مَرْوَان", 
    "mazen": "مَازِن", "moaz": "مُعَاذ", "yahya": "يَحْيَى", "anas": "أَنَس", "malek": "مَالِك", 
    "younis": "يُونُس", "asser": "آسِر", "ismail": "إِسْمَاعِيل", "said": "سَعِيد", "sayed": "سَيِّد", 
    "taha": "طَهَ", "zakaria": "زَكَرِيَّا",

    // Female Names
    "mai": "مَي", "aya": "آيَة", "nada": "نَدَى", "nour": "نُور", "noura": "نُورَة", "salma": "سَلْمَى", 
    "sara": "سَارَة", "sarah": "سَارَة", "menna": "مِنَّة", "mariam": "مَرْيَم", "maryam": "مَرْيَم", 
    "fatma": "فَاطِمَة", "hala": "هَالَة", "shahd": "شَهْد", "habiba": "حَبِيبَة", "farida": "فَرِيدَة", 
    "yassmine": "يَاسْمِين", "yasmin": "يَاسْمِين", "hoda": "هُدَى", "dina": "دِينَا", "heba": "هِبَة",
    "marina": "مَارِينَا", "nermine": "نِيرْمِين", "nermin": "نِيرْمِين", "sherine": "شِيرِين", 
    "sherin": "شِيرِين", "christine": "كْرِيسْتِين", "neven": "نِيفِين", "neveen": "نِيفِين", 
    "engy": "إِنْجِي", "inas": "إِينَاس", "rania": "رَانْيَا", "reem": "رِيم", "maha": "مَهَا", 
    "mona": "مُنَى", "manal": "مَنَال", "amal": "أَمَال", "asmaa": "أَسْمَاء", "shaimaa": "شَيْمَاء", 
    "esraa": "إِسْرَاء", "omnia": "أُمْنِيَة", "radwa": "رَضْوَى", "marwa": "مَرْوَة", "amira": "أَمِيرَة", 
    "samira": "سَمِيرَة", "safaa": "صَفَاء", "noha": "نُهَى", "yumna": "يُمْنَى", "basma": "بَسْمَة", 
    "dalia": "دَالْيَا", "ghada": "غَادَة", "hadeer": "هَدِير", "hend": "هِنْد", "kholoud": "خُلُود", 
    "laila": "لَيْلَى", "merna": "مِيرْنَا", "mirna": "مِيرْنَا", "nadin": "نَادِين", "nadine": "نَادِين", 
    "nora": "نُورَة", "reham": "رِيهَام", "rawan": "رَوَان", "samar": "سَمَر", "soha": "سُهَى", 
    "yara": "يَارَا", "zeinab": "زَيْنَب", "khadija": "خَدِيجَة", "aisha": "عَائِشَة"
};

const PHONETIC_EGYPTIAN_NAMES_EN: Record<string, string> = {
    // Male Names
    "ziad": "Zee-yad", "zeyad": "Zee-yad", "ahmed": "Ah-med", "mohamed": "Mo-ham-ed", 
    "mohammed": "Mo-ham-ed", "mahmoud": "Mah-mood", "mostafa": "Moos-tafa", "mustafa": "Moos-tafa", 
    "amr": "Ummr", "omar": "O-mar", "kareem": "Ka-reem", "karim": "Ka-reem", "khaled": "Kha-led", 
    "tareq": "Taa-rek", "tarek": "Taa-rek", "youssef": "Yoo-sef", "yousef": "Yoo-sef", "ali": "Ah-lee", 
    "hussein": "Hoo-sane", "hassan": "Hass-an", "ibrahim": "Ee-bra-heem", "alaa": "A-laa", 
    "islam": "Is-laam", "eslam": "Is-laam", "abdullah": "Ab-dool-ah", "abdelrahman": "Ab-del-rah-man",
    "basem": "Baa-sem", "bassem": "Baa-sem", "hazem": "Haa-zem", "mina": "Mee-na", "bishoy": "Bee-shoy", 
    "kirollos": "Kee-ro-los", "abanoub": "A-ba-noob", "fady": "Faa-dee", "hany": "Haa-nee", 
    "ramy": "Raa-mee", "nader": "Naa-der", "magdy": "Mag-dee", "maged": "Maa-ged", "emad": "Eh-maad", 
    "ehab": "Ee-haab", "ihab": "Ee-haab", "tamer": "Taa-mer", "wael": "Waa-el", "yasser": "Yass-er", 
    "ayman": "Eye-man", "ashraf": "Ash-raf", "sherif": "She-reef", "adel": "Aa-del", "essam": "Es-saam", 
    "hesham": "He-shaam", "bahaa": "Ba-haa", "diaa": "Dee-yaa", "gamal": "Ga-maal", "kamal": "Ka-maal", 
    "nabil": "Na-beel", "sameh": "Saa-meh", "safwat": "Saf-wat", "raouf": "Ra-oof", "farid": "Fa-reed", 
    "yassin": "Yass-een", "hamza": "Ham-za", "seif": "Safe", "eyad": "Ee-yaad", "marwan": "Mar-waan", 
    "mazen": "Maa-zen", "moaz": "Mo-aaz", "yahya": "Yah-ya", "anas": "A-nas", "malek": "Maa-lek", 
    "younis": "Yoo-nis", "asser": "As-ser", "ismail": "Is-ma-eel", "said": "Sa-eed", "sayed": "Say-yed", 
    "taha": "Ta-ha", "zakaria": "Za-ka-ree-ya",

    // Female Names
    "mai": "My", "aya": "A-ya", "nada": "Na-da", "nour": "Noor", "noura": "Noo-ra", "salma": "Sal-ma", 
    "sara": "Sah-ra", "sarah": "Sah-ra", "menna": "Men-na", "mariam": "Mar-yam", "maryam": "Mar-yam", 
    "fatma": "Fat-ma", "hala": "Haa-la", "shahd": "Shahd", "habiba": "Ha-bee-ba", "farida": "Fa-ree-da", 
    "yassmine": "Yas-meen", "yasmin": "Yas-meen", "hoda": "Ho-da", "dina": "Dee-na", "heba": "He-ba",
    "marina": "Ma-ree-na", "nermine": "Ner-meen", "nermin": "Ner-meen", "sherine": "She-reen", 
    "sherin": "She-reen", "christine": "Chris-teen", "neven": "Ne-veen", "neveen": "Ne-veen", 
    "engy": "En-gee", "inas": "Ee-naas", "rania": "Raan-ya", "reem": "Reem", "maha": "Ma-ha", 
    "mona": "Mo-na", "manal": "Ma-naal", "amal": "A-maal", "asmaa": "As-maa", "shaimaa": "Shy-maa", 
    "esraa": "Es-raa", "omnia": "Om-nee-ya", "radwa": "Rad-wa", "marwa": "Mar-wa", "amira": "A-mee-ra", 
    "samira": "Sa-mee-ra", "safaa": "Sa-faa", "noha": "No-ha", "yumna": "Yoom-na", "basma": "Bas-ma", 
    "dalia": "Daal-ya", "ghada": "Ghaa-da", "hadeer": "Ha-deer", "hend": "Hend", "kholoud": "Kho-lood", 
    "laila": "Lay-la", "merna": "Mer-na", "mirna": "Mer-na", "nadin": "Na-deen", "nadine": "Na-deen", 
    "nora": "Noo-ra", "reham": "Re-haam", "rawan": "Ra-waan", "samar": "Sa-mar", "soha": "So-ha", 
    "yara": "Yaa-ra", "zeinab": "Zay-nab", "khadija": "Kha-dee-ja", "aisha": "Eye-sha"
};

const getPhoneticText = (text: string, lang: string = 'en-US') => {
    // 1. Strip markdown and symbols that cause TTS to stutter
    let spokenText = text
        .replace(/\*\*/g, '') // Remove bold
        .replace(/\*/g, '')   // Remove italic
        .replace(/#/g, '')    // Remove hashtags
        .replace(/-/g, ' ')   // Replace dashes with spaces
        .replace(/`/g, '')    // Remove backticks
        .replace(/\[|\]/g, '') // Remove brackets
        .replace(/\(|\)/g, ''); // Remove parentheses

    // 2. Replace ZEDX phonetic
    spokenText = spokenText.replace(/ZEDX/gi, 'Zeddex');
    
    // 3. Replace phonetic Egyptian names based on language
    const dict = lang.startsWith('ar') ? PHONETIC_EGYPTIAN_NAMES_AR : PHONETIC_EGYPTIAN_NAMES_EN;
    Object.keys(dict).forEach(name => {
        const regex = new RegExp(`\\b${name}\\b`, 'gi');
        spokenText = spokenText.replace(regex, dict[name]);
    });
    return spokenText;
};

export default function MockInterviewPage() {
    const router = useRouter();
    const [isSetup, setIsSetup] = useState(false);
    
    // Hardware State - Auto enabled since permissions were tested on setup page
    const [isMicEnabled, setIsMicEnabled] = useState(true);
    const [isCameraEnabled, setIsCameraEnabled] = useState(true);
    const [isInterviewStarted, setIsInterviewStarted] = useState(false);
    
    // Context State
    const [targetRole, setTargetRole] = useState("");
    const [jd, setJd] = useState("");
    const [resume, setResume] = useState("");
    const [difficulty, setDifficulty] = useState("Intermediate");
    const [interviewType, setInterviewType] = useState("Technical");
    const [questionCount, setQuestionCount] = useState(10);
    const [language, setLanguage] = useState("en-US");
    const [model, setModel] = useState("qwen/qwen3.8-27b");

    // Interview State
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [currentQuestionType, setCurrentQuestionType] = useState<"main" | "followup">("main");
    const [questionsAsked, setQuestionsAsked] = useState<({ q: string, a: string, type?: "main" | "followup", mainQuestionIndex?: number })[]>([]);
    const [zedxText, setZedxText] = useState("Initializing interview...");
    const [userTranscript, setUserTranscript] = useState("");
    
    const [isSpeaking, setIsSpeaking] = useState(false); // Is ZEDX speaking?
    const [amyFailedQuestion, setAmyFailedQuestion] = useState<string | null>(null);
    const [isListening, setIsListening] = useState(false); // Are we listening to user?
    const [audioLevel, setAudioLevel] = useState(0);
    const [isMobile, setIsMobile] = useState(false);
    const [showPaywall, setShowPaywall] = useState(false);
    
    useEffect(() => {
        setIsMobile(/Mobi|Android|iPhone/i.test(navigator.userAgent) || window.innerWidth < 768);
    }, []);
    
    const videoRef = useRef<HTMLVideoElement>(null);
    const recognitionRef = useRef<any>(null);
    const silenceTimerRef = useRef<NodeJS.Timeout | null>(null);
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const amyPlaybackCancelRef = useRef<(() => void) | null>(null);
    const finalTranscriptRef = useRef("");
    const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
    const isMounted = useRef(true);
    const speechCleanupTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const hasStartedRef = useRef(false);
    const dbInterviewIdRef = useRef<string | null>(null);
    const pendingSaveRef = useRef<Promise<void>>(Promise.resolve());
    const isCompletingRef = useRef(false);
    const speechRequestRef = useRef(0);
    const sessionStartTimeRef = useRef<number>(Date.now());
    const questionEndedAtRef = useRef<number | null>(null);
    const speechStartedAtRef = useRef<number | null>(null);
    const sessionExchangesRef = useRef<SessionExchange[]>([]);
    const mainQuestionIndexRef = useRef<number>(0);
    const currentQuestionTypeRef = useRef<"main" | "followup">("main");
    const hasFollowedUpCurrentRef = useRef<boolean>(false);

    // Track latest state to avoid stale closures in event listeners and timeouts
    const stateRef = useRef({
        isListening,
        questionsAsked,
        currentQuestionIndex,
        currentQuestionType,
        hasFollowedUpCurrent: false,
        userTranscript
    });

    useEffect(() => {
        stateRef.current = {
            isListening,
            questionsAsked,
            currentQuestionIndex,
            currentQuestionType,
            hasFollowedUpCurrent: hasFollowedUpCurrentRef.current,
            userTranscript
        };
    }, [isListening, questionsAsked, currentQuestionIndex, currentQuestionType, userTranscript]);

    useEffect(() => {
        if (speechCleanupTimer.current) clearTimeout(speechCleanupTimer.current);
        isMounted.current = true;
        return () => {
            isMounted.current = false;
            speechRequestRef.current++;
            amyPlaybackCancelRef.current?.();
            if (audioRef.current) { audioRef.current.pause(); audioRef.current.src = ''; }
            if (typeof window !== 'undefined') window.speechSynthesis?.cancel();
            // React development mode replays effects. Preserve setup's warm worker
            // across that replay, but release it when the page actually unmounts.
            speechCleanupTimer.current = setTimeout(disposeAmySpeech, 0);
        };
    }, []);

    // Initialize context from Zustand (and fallback to localStorage for backwards compatibility/hard reloads if any)
    useEffect(() => {
        let _targetRole = "";
        let _jd = "";
        let _resume = "";
        let _diff = "Intermediate";
        let _type = "Technical";
        let _count = 10;
        let _lang = "en-US";
        let _model = "qwen/qwen3.8-27b";

        try {
            const state = useInterviewStore.getState();
            const savedTargetRole = localStorage.getItem("interview_context_target_role");
            _targetRole = state.targetRole || savedTargetRole || "";
            const savedLang = localStorage.getItem("interview_context_lang");
            _lang = resolveWebInterviewLanguage(state.language, savedLang, Boolean(state.jobDescription && state.resumeText));
            if (!SUPPORTED_LANGUAGES.some(l => l.code === _lang)) {
                console.warn(`[Mock Interview] Unsupported language code "${_lang}". Falling back to "en-US".`);
                _lang = "en-US";
            }
            if (_lang === 'en-US' && getEnglishSpeechPreference() === 'amy') {
                void preloadAmySpeech().catch(() => { /* Browser English voice remains available. */ });
            }
            try {
                localStorage.setItem("interview_context_lang", _lang);
                useInterviewStore.getState().setInterviewContext({ language: _lang });
            } catch {}
            const savedJd = localStorage.getItem("interview_context_jd");
            _jd = state.jobDescription || savedJd || "";
            const savedResume = localStorage.getItem("interview_context_resume");
            _resume = state.resumeText || savedResume || "";
            const savedDiff = localStorage.getItem("interview_context_difficulty");
            _diff = (state.difficulty && state.difficulty !== "Intermediate") ? state.difficulty : (savedDiff || state.difficulty || "Intermediate");
            const savedType = localStorage.getItem("interview_context_type");
            _type = (state.interviewType && state.interviewType !== "General") ? state.interviewType : (savedType || state.interviewType || "Technical");
            _count = parseInt(localStorage.getItem("interview_context_question_count") || "10", 10);
            _model = localStorage.getItem("selected_ai_model") || "qwen/qwen3.8-27b";
        } catch (e) {
            console.warn("Could not read interview state", e);
        }

        if (!_jd || !_resume) {
            router.push("/dashboard/new");
            return;
        }

        dbInterviewIdRef.current = null;
        try { localStorage.removeItem("current_db_id"); } catch {}

        setTargetRole(_targetRole);
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
        let lastLevelUpdate = 0;
        let hardwareDisposed = false;
        let stopPreviewObservation = () => {};
        
        // Wait until user explicitly enables hardware to request permissions
        if (!isMicEnabled && !isCameraEnabled) return;

        // 1. Setup Webcam
        const constraints = { 
            video: isCameraEnabled ? { width: { ideal: 640 }, height: { ideal: 360 }, frameRate: { ideal: 24, max: 30 } } : false,
            audio: isMicEnabled 
        };

        if (isMicEnabled || isCameraEnabled) {
            navigator.mediaDevices.getUserMedia(constraints)
                .then(s => {
                    if (hardwareDisposed) { s.getTracks().forEach(track => track.stop()); return; }
                    stream = s;
                    if (videoRef.current && isCameraEnabled) {
                        videoRef.current.srcObject = stream;
                        stopPreviewObservation = observeInterviewPreview(videoRef.current);
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
                            const now = performance.now();
                            if (now - lastLevelUpdate < 100) return;
                            lastLevelUpdate = now;
                            const array = new Uint8Array(analyser.frequencyBinCount);
                            analyser.getByteFrequencyData(array);
                            let values = 0;
                            const length = array.length;
                            for (let i = 0; i < length; i++) {
                                values += (array[i]);
                            }
                            const average = values / length;
                            setAudioLevel((previous: number) => Math.abs(previous - average) >= 2 ? average : previous);
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
                    // Do not silently remove recognized words from an answer based on
                    // an engine-specific confidence estimate; the evaluator receives the transcript.
                    
                    if (event.results[i].isFinal) {
                        finalTranscriptRef.current = [finalTranscriptRef.current.trim(), result.transcript.trim()].filter(Boolean).join(' ');
                        hasValidSpeech = true;
                    } else {
                        interimTranscript += result.transcript;
                        if (result.transcript.trim().length > 3) hasValidSpeech = true;
                    }
                }
                
                const currentText = [finalTranscriptRef.current.trim(), interimTranscript.trim()].filter(Boolean).join(' ');
                setUserTranscript(currentText);

                // Record candidate speech start time on first valid utterance
                if (hasValidSpeech && speechStartedAtRef.current === null) {
                    speechStartedAtRef.current = Date.now();
                }

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
                // BUT ONLY IF NOT MOBILE! Mobile blocks auto-restarts and throws a beep loop
                if (stateRef.current.isListening && !fatalError && !/Mobi|Android|iPhone/i.test(navigator.userAgent)) {
                    try { recognition.start(); } catch (e) {}
                }
            };
            
            recognitionRef.current = recognition;
        }

        return () => {
            stopPreviewObservation();
            if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
            if (recognitionRef.current) {
                recognitionRef.current.onend = null;
                try { recognitionRef.current.stop(); } catch (e) {}
            }
            hardwareDisposed = true;
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
            generateNextStep({ forceNextMain: false, targetMainIndex: 0, history: [] });
        }
    }, [isSetup, isMicEnabled, isCameraEnabled]);

    const completeInterview = async (finalHistory: any[]) => {
        if (isCompletingRef.current) return;
        isCompletingRef.current = true;
        const completedAt = new Date().toISOString();
        const totalDurationMinutes = Math.max(1, Math.round((Date.now() - sessionStartTimeRef.current) / 60000));

        const completionMessage = getWebInterviewMessages(language).completed;
        setZedxText(completionMessage);
        speakText(completionMessage);

        localStorage.setItem("interview_results", JSON.stringify(finalHistory));
        localStorage.setItem("interview_completed_at", completedAt);
        localStorage.setItem("session_exchanges", JSON.stringify(sessionExchangesRef.current));

        try {
            // Flush queued saves before saving the final language and generating its report.
            await pendingSaveRef.current.catch(() => {});
            const analysis = {
                target_role: targetRole || undefined,
                job_description: jd,
                resume_name: resume ? resume.substring(0, 80).replace(/\n/g, ' ') : "Uploaded Resume",
                resume_text: resume || undefined,
                interview_type: interviewType,
                difficulty,
                language,
                session_mode: 'mock_interview' as const,
                model,
                question_count: questionCount,
                started_at: new Date(sessionStartTimeRef.current).toISOString(),
                completed_at: completedAt,
                duration_minutes: totalDurationMinutes,
                questions: finalHistory,
                session_exchanges: sessionExchangesRef.current
            };
            if (dbInterviewIdRef.current) {
                await interviewService.updateInterview(dbInterviewIdRef.current, { analysis });
            } else {
                const saved = await interviewService.saveInterview(`Interview - ${targetRole || interviewType} (${difficulty})`, "", analysis);
                dbInterviewIdRef.current = saved.id;
            }
            localStorage.setItem("current_db_id", dbInterviewIdRef.current);
            setTimeout(() => {
                if (isMounted.current) router.push(`/dashboard/report/${dbInterviewIdRef.current}`);
            }, 4000);
        } catch (error) {
            console.error("Failed to save completed interview", error);
            setZedxText(getWebInterviewMessages(language).connectionError);
            isCompletingRef.current = false;
        }
    };

    const handleUserFinishedSpeaking = async (transcript: string) => {
        const { isListening: currentIsListening, questionsAsked: currentQuestions } = stateRef.current;
        const currentType = currentQuestionTypeRef.current;
        const currentMainIndex = mainQuestionIndexRef.current;

        if (!currentIsListening) return;
        setIsListening(false);
        stateRef.current.isListening = false; // Synchronous block for trailing events
        if (recognitionRef.current) recognitionRef.current.stop();
        if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);

        // Calculate speech timing and word metrics
        const speechEndedAt = Date.now();
        const speechStartedAt = speechStartedAtRef.current || speechEndedAt;
        const questionEndedAt = questionEndedAtRef.current;
        const durationSeconds = Math.max(0, Math.round(((speechEndedAt - speechStartedAt) / 1000) * 10) / 10);
        const latencySeconds = (questionEndedAt && speechStartedAt >= questionEndedAt)
            ? Math.max(0, Math.round(((speechStartedAt - questionEndedAt) / 1000) * 10) / 10)
            : null;
        const wordCount = transcript.trim().split(/\s+/).filter(Boolean).length;

        const currentQText = currentQuestions.length > 0 ? currentQuestions[currentQuestions.length - 1].q : "";
        const exchange: SessionExchange = {
            index: sessionExchangesRef.current.length,
            mainQuestionIndex: currentMainIndex,
            type: currentType,
            question: currentQText,
            answer: transcript,
            timing: {
                questionEndedAt,
                speechStartedAt,
                speechEndedAt,
                durationSeconds,
                latencySeconds
            },
            wordCount
        };
        sessionExchangesRef.current.push(exchange);

        const newHistory = [...currentQuestions];
        if (newHistory.length > 0) {
            newHistory[newHistory.length - 1] = {
                ...newHistory[newHistory.length - 1],
                a: transcript,
                type: currentType,
                mainQuestionIndex: currentMainIndex,
                ...(exchange.timing ? { timing: exchange.timing } : {}),
                wordCount
            } as any;
        }
        setQuestionsAsked(newHistory);
        setUserTranscript(""); // Clear UI
        finalTranscriptRef.current = ""; // Reset stable transcript for next question
        speechStartedAtRef.current = null;
        questionEndedAtRef.current = null;

        // Auto-save progress to DB in background with full session data
        const sessionPayload = {
            target_role: targetRole || undefined,
            job_description: jd,
            resume_name: resume ? resume.substring(0, 80).replace(/\n/g, ' ') : "Uploaded Resume",
            resume_text: resume || undefined,
            interview_type: interviewType,
            difficulty,
            language,
            session_mode: 'mock_interview' as const,
            model,
            question_count: questionCount,
            started_at: new Date(sessionStartTimeRef.current).toISOString(),
            questions: newHistory,
            session_exchanges: sessionExchangesRef.current
        };

        pendingSaveRef.current = pendingSaveRef.current.catch(() => {}).then(async () => {
            if (dbInterviewIdRef.current) {
                await interviewService.updateInterview(dbInterviewIdRef.current, { analysis: sessionPayload });
            } else {
                const interviewTitle = `Interview - ${targetRole || interviewType} (${difficulty})`;
                const saved = await interviewService.saveInterview(interviewTitle, "", sessionPayload);
                dbInterviewIdRef.current = saved.id;
            }
            localStorage.setItem("current_db_id", dbInterviewIdRef.current);
        });
        pendingSaveRef.current.catch(console.error);

        // Determine next transition step
        if (currentType === "followup") {
            // Candidate answered a follow-up probe!
            // Max 1 follow-up for this topic is complete. Next step MUST be the next main question.
            const nextMain = currentMainIndex + 1;
            if (nextMain >= questionCount) {
                completeInterview(newHistory);
                return;
            }
            await generateNextStep({
                forceNextMain: true,
                targetMainIndex: nextMain,
                history: newHistory
            });
        } else {
            // Candidate answered a main question!
            // Ask AI to evaluate if a contextual follow-up is warranted OR to advance to the next main topic.
            await generateNextStep({
                forceNextMain: false,
                targetMainIndex: currentMainIndex,
                history: newHistory
            });
        }
    };

    const generateNextStep = async (options: {
        forceNextMain: boolean;
        targetMainIndex: number;
        history: any[];
    }) => {
        const { forceNextMain, targetMainIndex, history } = options;

        if (targetMainIndex >= questionCount) {
            completeInterview(history);
            return;
        }

        setZedxText("Thinking...");
        setIsSpeaking(true);
        setAmyFailedQuestion(null);

        const focusArea = (targetMainIndex + 1) % 2 === 0 ? "Job Description" : "Resume";
        const langObj = SUPPORTED_LANGUAGES.find(l => l.code === language) || SUPPORTED_LANGUAGES[0];
        let nextQuestionText = "";
        let isFollowUp = false;

        if (targetMainIndex === 0 && history.length === 0) {
            // ZERO-LATENCY GREETING for Main Question 1
            let candidateName = useInterviewStore.getState().candidateName || "";
            try {
                if (langObj.code !== 'en-US' || !candidateName || getEnglishSpeechPreference() === 'browser') {
                const { data: { session } } = await supabase.auth.getSession();
                if (session?.user?.user_metadata?.full_name) {
                    candidateName = session.user.user_metadata.full_name.split(' ')[0];
                } else if (session?.user?.user_metadata?.name) {
                    candidateName = session.user.user_metadata.name.split(' ')[0];
                }
                }
            } catch (e) {}

            const lowerName = candidateName.toLowerCase();
            const arName = PHONETIC_EGYPTIAN_NAMES_AR[lowerName] || candidateName;
            const nameAr = candidateName ? ` يا ${arName}` : "";

            if (langObj.code === 'ar-EG') {
                nextQuestionText = `أهلاً بك${nameAr}، أنا زيدكس، وهعمل معاك الانترفيو النهارده. ياريت تبدأ وتعرفني بنفسك وتكلمني شوية عن خبراتك؟`;
            } else if (langObj.code.startsWith('ar')) {
                nextQuestionText = `أهلاً بك${nameAr}، أنا زيدكس، وسأكون مسؤولاً عن الانترفيو الخاص بك اليوم. هل يمكن أن تبدأ بتعريف نفسك والتحدث قليلاً عن خبراتك؟`;
            } else if (langObj.code === 'en-US') {
                nextQuestionText = getAmyOpeningText(candidateName);
                useInterviewStore.getState().setInterviewContext({ candidateName });
            } else if (langObj.code === 'es-ES') {
                nextQuestionText = `¡Bienvenido${candidateName ? ` ${candidateName}` : ""}! Soy ZED-X y hoy realizaré tu entrevista de práctica. Para comenzar, ¿podrías presentarte y contarme un poco sobre ti y tu experiencia profesional?`;
            } else if (langObj.code === 'fr-FR') {
                nextQuestionText = `Bonjour${candidateName ? ` ${candidateName}` : ""} et bienvenue ! Je suis ZED-X et je vais mener votre entretien aujourd'hui. Pourriez-vous commencer par vous présenter et me parler un peu de votre parcours ?`;
            } else if (langObj.code === 'de-DE') {
                nextQuestionText = `Hallo${candidateName ? ` ${candidateName}` : ""}, herzlich willkommen! Ich bin ZED-X und werde heute Ihr Interview führen. Könnten Sie sich bitte kurz vorstellen und etwas über Ihren Werdegang erzählen?`;
            } else {
                // Extract introductory greeting from q1 (everything before the closing "are you ready?" question)
                const q1Sentences = (langObj.q1 || "").split(/(?<=[.!?。！？])\s+/);
                const greetingPart = q1Sentences.length > 1 ? q1Sentences.slice(0, -1).join(" ") : (langObj.q1 || "");
                nextQuestionText = `${greetingPart}${candidateName ? ` ${candidateName}` : ""}. ${langObj.q2 || ""}`;
            }

            isFollowUp = false;
            mainQuestionIndexRef.current = 0;
            currentQuestionTypeRef.current = "main";
            hasFollowedUpCurrentRef.current = false;
            setCurrentQuestionIndex(0);
            setCurrentQuestionType("main");
        } else {
            const previousQ = history[history.length - 1].q;
            const previousA = history[history.length - 1].a;
            const askedQuestions = history.map(h => h.q).join(" | ");
            const randomAngle = ["leadership skills", "problem solving", "technical depth", "past challenges", "teamwork and communication", "adaptability"][Math.floor(Math.random() * 6)];

            let prompt = "";
            if (forceNextMain) {
                prompt = `The candidate just answered your follow-up probe with: "${previousA}".
You have finished probing this topic. You MUST now smoothly transition to Main Question ${targetMainIndex + 1} of ${questionCount}.
Focus area: ${focusArea} (framed around ${randomAngle}).
CRITICAL RULES:
1. Start with a brief, natural 1-sentence reaction to their answer, then ask the new main question.
2. Prefix your response strictly with "[NEXT_MAIN]: " followed by the spoken text.
3. DO NOT ask a follow-up.
4. DO NOT ask any previously asked questions: [${askedQuestions}].
5. DO NOT ask the candidate if they have questions for you.
6. MANDATORY LANGUAGE: You MUST formulate your entire reaction and new question strictly in ${langObj.name} (${langObj.native}) [${langObj.code}]. NEVER speak in English unless the session language is English ("en-US").
Job Description Context: ${jd}
Resume Context: ${resume}`;
            } else {
                prompt = `The candidate just answered your main question ("${previousQ}") with: "${previousA}".
This was Main Question ${targetMainIndex + 1} of ${questionCount}. No follow-up probe has been asked for this topic yet.
Analyze the candidate's answer carefully:
- If the answer was INCOMPLETE, VAGUE, SURFACE-LEVEL, or lacks essential depth: Ask ONE concise, focused follow-up probe (1-2 sentences) to deepen the evidence on this same topic. Prefix your response strictly with "[FOLLOW_UP]: ".
- If the answer was CLEAR, REASONABLY DETAILED, or SUFFICIENT: Acknowledge it with a brief reaction and smoothly transition to Main Question ${targetMainIndex + 2} of ${questionCount} focusing on ${focusArea} (${randomAngle}). Prefix your response strictly with "[NEXT_MAIN]: ".
CRITICAL RULES:
1. Maximum 1 follow-up allowed per main question.
2. Reply strictly with the prefix ([FOLLOW_UP]: or [NEXT_MAIN]:) followed by the spoken text.
3. Spoken text only. No markdown, no thinking tags.
4. DO NOT ask any previously asked questions: [${askedQuestions}].
5. DO NOT ask the candidate if they have questions for you.
6. MANDATORY LANGUAGE: You MUST formulate your entire reaction and question strictly in ${langObj.name} (${langObj.native}) [${langObj.code}]. NEVER speak in English unless the session language is English ("en-US").
Job Description Context: ${jd}
Resume Context: ${resume}`;
            }

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
                    if (data.error?.code === "PAYWALL_LIMIT_REACHED" || data.error?.message === "PAYWALL_LIMIT_REACHED") {
                        setShowPaywall(true);
                        setIsSpeaking(false);
                        setZedxText("Free limit reached. Please upgrade to Pro.");
                        return;
                    }
                    throw new Error(data.error?.message || "API request failed");
                }

                const rawText = data.content || "";
                let cleanQuestionText = rawText;

                if (forceNextMain) {
                    isFollowUp = false;
                    cleanQuestionText = rawText.replace(/\[(NEXT_MAIN|FOLLOW_UP)\]:?\s*/gi, "").trim();
                } else if (rawText.startsWith("[FOLLOW_UP]:") || rawText.includes("[FOLLOW_UP]")) {
                    isFollowUp = true;
                    cleanQuestionText = rawText.replace(/\[FOLLOW_UP\]:?\s*/gi, "").trim();
                } else if (rawText.startsWith("[NEXT_MAIN]:") || rawText.includes("[NEXT_MAIN]")) {
                    isFollowUp = false;
                    cleanQuestionText = rawText.replace(/\[NEXT_MAIN\]:?\s*/gi, "").trim();
                } else {
                    isFollowUp = false;
                    cleanQuestionText = rawText.trim();
                }
                nextQuestionText = cleanQuestionText;
            } catch (err) {
                console.error("AI Generation Failed:", err);
                const message = getWebInterviewMessages(language).connectionError;
                setZedxText(message);
                await speakText(message);
                return; // A failed request must not advance the interview or enter the report as a question.
            }

            // Apply state updates based on isFollowUp
            if (isFollowUp) {
                currentQuestionTypeRef.current = "followup";
                hasFollowedUpCurrentRef.current = true;
                setCurrentQuestionType("followup");
            } else if (!forceNextMain) {
                // AI transitioned from targetMainIndex to the next main question!
                const nextMainIndex = targetMainIndex + 1;
                if (nextMainIndex >= questionCount) {
                    completeInterview(history);
                    return;
                }
                mainQuestionIndexRef.current = nextMainIndex;
                currentQuestionTypeRef.current = "main";
                hasFollowedUpCurrentRef.current = false;
                setCurrentQuestionIndex(nextMainIndex);
                setCurrentQuestionType("main");
            } else {
                // forceNextMain was true (advancing to targetMainIndex)
                mainQuestionIndexRef.current = targetMainIndex;
                currentQuestionTypeRef.current = "main";
                hasFollowedUpCurrentRef.current = false;
                setCurrentQuestionIndex(targetMainIndex);
                setCurrentQuestionType("main");
            }
        }

        // Save to history
        const newHistory = [
            ...history, 
            { 
                q: nextQuestionText, 
                a: "", 
                type: currentQuestionTypeRef.current, 
                mainQuestionIndex: mainQuestionIndexRef.current 
            }
        ];
        setQuestionsAsked(newHistory);

        // Play TTS
        await speakText(nextQuestionText);
    };

    const speakText = async (text: string) => {
        const speechRequest = ++speechRequestRef.current;
        amyPlaybackCancelRef.current?.();
        amyPlaybackCancelRef.current = null;
        if (audioRef.current) {
            audioRef.current.onended = null;
            audioRef.current.onerror = null;
            audioRef.current.pause();
            if (audioRef.current.src.startsWith('blob:')) URL.revokeObjectURL(audioRef.current.src);
            audioRef.current.src = "";
        }
        if (typeof window !== 'undefined' && window.speechSynthesis) {
            if (utteranceRef.current) {
                utteranceRef.current.onend = null;
                utteranceRef.current.onerror = null;
            }
            window.speechSynthesis.cancel();
        }

        setIsSpeaking(true);
        setIsListening(false); // Fix: Ensure we are NOT listening while ZEDX starts speaking
        // Reveal the question when playback starts, keeping text and voice in sync.
        setZedxText("");

        const resumeListening = () => {
            if (!isMounted.current || speechRequest !== speechRequestRef.current) return;
            setIsSpeaking(false);
            if (isCompletingRef.current) return;
            setIsListening(true);
            setUserTranscript("");
            questionEndedAtRef.current = Date.now();
            speechStartedAtRef.current = null;
            if (recognitionRef.current && !/Mobi|Android|iPhone/i.test(navigator.userAgent)) {
                try { recognitionRef.current.start(); } catch {}
            }
        };

        const playNativeTTS = async () => {
            if (!window.speechSynthesis) throw new Error("Web Speech is unavailable");
            const voices = await loadWebSpeechVoices(window.speechSynthesis);
            if (!isMounted.current || speechRequest !== speechRequestRef.current) return;
            const voice = selectWebSpeechVoice(voices, language);
            if (!voice) throw new Error(`No browser voice is available for ${language}`);
            setZedxText(text);
            const utterance = new SpeechSynthesisUtterance(getPhoneticText(text, language));
            utteranceRef.current = utterance; // Prevent garbage collection
            utterance.lang = language;
            utterance.voice = voice;
            
            utterance.rate = /Mobi|Android|iPhone/i.test(navigator.userAgent) ? 1.05 : 1.10;
            utterance.pitch = 1.1; // Slightly higher pitch for energy
            
            utterance.onend = resumeListening;
            utterance.onerror = () => { notifyAudioError(); resumeListening(); };
            window.speechSynthesis.speak(utterance);
        };

        const notifyAudioError = () => toast.error(language.startsWith('ar')
            ? 'تعذر تشغيل صوت المقابلة. يمكنك قراءة السؤال الظاهر والمتابعة.'
            : `Interview audio is unavailable in ${SUPPORTED_LANGUAGES.find(item => item.code === language)?.native || language}. You can read the question and continue.`);

        try {
            let audioUrl = "";
            let blob: Blob;

            if (language === 'en-US' && getEnglishSpeechPreference() === 'amy') {
                try {
                    const chunks = text === getAmyOpeningText(useInterviewStore.getState().candidateName || '') ? [text] : splitAmySpeechText(text);
                    const prepare = (chunk: string) => synthesizeAmySpeech(chunk).then(
                        audio => ({ audio, error: null }),
                        error => ({ audio: null, error })
                    );
                    let nextAudio = prepare(chunks[0]);
                    for (let index = 0; index < chunks.length; index++) {
                        const result = await nextAudio;
                        if (!isMounted.current || speechRequest !== speechRequestRef.current) return;
                        if (result.error || !result.audio) throw result.error || new Error('Amy returned no audio');
                        // Generate the next sentence while this one plays.
                        if (index + 1 < chunks.length) nextAudio = prepare(chunks[index + 1]);
                        const url = URL.createObjectURL(result.audio);
                        const audio = new Audio(url);
                        audioRef.current = audio;
                        let cancelPlayback: (() => void) | null = null;
                        try {
                            await new Promise<void>((resolve, reject) => {
                                cancelPlayback = resolve;
                                amyPlaybackCancelRef.current = resolve;
                                audio.onplay = () => {
                                    if (isMounted.current && speechRequest === speechRequestRef.current) setZedxText(text);
                                };
                                audio.onplaying = () => markInterviewFirstAudio('Amy');
                                audio.onended = () => resolve();
                                audio.onerror = () => reject(new Error('Amy audio playback failed'));
                                void audio.play().catch(reject);
                            });
                        } finally {
                            if (amyPlaybackCancelRef.current === cancelPlayback) amyPlaybackCancelRef.current = null;
                            audio.onplay = null;
                            audio.onplaying = null;
                            audio.onended = null;
                            audio.onerror = null;
                            audio.pause();
                            URL.revokeObjectURL(url);
                        }
                        if (!isMounted.current || speechRequest !== speechRequestRef.current) return;
                    }
                    resumeListening();
                    return;
                } catch (error) {
                    if (!isMounted.current || speechRequest !== speechRequestRef.current) return;
                    console.error('[Amy interview audio]', error);
                    setIsSpeaking(false);
                    setAmyFailedQuestion(text);
                    return;
                }
            } else if (getWebSpeechProvider(language) === 'elevenlabs') {
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

                if (!isMounted.current || speechRequest !== speechRequestRef.current) return;
                if (!res.ok) throw new Error("TTS failed");

                blob = await res.blob();
                audioUrl = URL.createObjectURL(blob);
            } else {
                await playNativeTTS();
                return; // Exit early since audio playback is handled natively
            }

            if (!isMounted.current || speechRequest !== speechRequestRef.current) {
                URL.revokeObjectURL(audioUrl);
                return;
            }
            
            const audio = new Audio(audioUrl);
            audioRef.current = audio;

            audio.onplay = () => {
                // Sync text with audio start
                setZedxText(text);
            };

            audio.onended = () => {
                URL.revokeObjectURL(audioUrl); // Fix memory leak
                resumeListening();
            };

            // Catch playback errors (e.g., autoplay policies or format issues)
            let playbackFailed = false;
            const handlePlaybackFailure = async () => {
                if (playbackFailed || !isMounted.current || speechRequest !== speechRequestRef.current) return;
                playbackFailed = true;
                audio.onended = null;
                audio.onerror = null;
                audio.pause();
                URL.revokeObjectURL(audioUrl); // Fix memory leak on error
                setZedxText(text);
                if (language === 'en-US') {
                    try { await playNativeTTS(); return; } catch { /* Report failure only when both providers fail. */ }
                }
                notifyAudioError();
                resumeListening();
            };
            audio.onerror = () => { void handlePlaybackFailure(); };
            void audio.play().catch(handlePlaybackFailure);

        } catch (err) {
            if (!isMounted.current || speechRequest !== speechRequestRef.current) return;
            console.error("TTS Error", err);
            notifyAudioError();
            setZedxText(text);
            resumeListening();
        }
    };

    const endInterview = () => {
        if (confirm("Are you sure you want to end the interview early?")) {
            speechRequestRef.current++;
            amyPlaybackCancelRef.current?.();
            disposeAmySpeech();
            if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
            if (audioRef.current) {
                audioRef.current.pause();
                audioRef.current.src = "";
            }
            if (typeof window !== 'undefined' && window.speechSynthesis) {
                window.speechSynthesis.cancel();
            }

            // Check if any answers were actually given in this session
            const hasAnswers = questionsAsked.some(q => q.a && q.a.trim().length > 0);
            if (!hasAnswers) {
                // Exited early without answering - return directly to dashboard
                router.push("/dashboard");
                return;
            }

            // If candidate provided at least one answer, complete and save this session
            completeInterview(questionsAsked);
        }
    };

    if (!isSetup) return <div className="min-h-screen bg-black flex items-center justify-center"><Loader2 className="animate-spin text-emerald-500 w-12 h-12" /></div>;

    return (
        <div className="min-h-[100dvh] w-full bg-black text-white relative overflow-x-hidden flex flex-col">
            <PaywallModal 
                open={showPaywall} 
                onOpenChange={setShowPaywall}
                title="Free Limit Reached"
                description="You've reached your free limit. Upgrade to ZEDX Pro to continue this interview."
            />
            {/* Top Bar */}
            <div className="w-full p-4 sm:p-6 flex justify-between items-center z-20">
                <div className="flex items-center gap-1 sm:gap-2 -ml-1 sm:-ml-4">
                    <Image
                        src="/zedx-logo.png"
                        alt="ZEDX-AI Logo"
                        width={140}
                        height={45}
                        className="object-contain object-left w-28 sm:w-[140px]"
                    />
                    <div className="h-5 sm:h-8 w-[1px] bg-white/20 mx-1 sm:mx-2"></div>
                    <p className="text-[#84cc16] text-xs sm:text-sm font-semibold whitespace-nowrap mt-0.5 sm:mt-1 flex items-center">
                        <span className="hidden sm:inline">Question </span>
                        <span className="sm:hidden">Q</span>
                        {currentQuestionIndex + 1} / {questionCount}
                        {currentQuestionType === "followup" && (
                            <span className="ml-2 text-[10px] sm:text-xs font-medium px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                                Follow-up
                            </span>
                        )}
                    </p>
                </div>
                <Button onClick={endInterview} variant="ghost" size="sm" className="text-red-400 hover:text-red-300 hover:bg-red-500/10 px-2 sm:px-4 shrink-0">
                    <X className="w-4 h-4 sm:mr-2" />
                    <span className="hidden sm:inline">End Interview</span>
                    <span className="sm:hidden text-xs ml-1">End</span>
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
                        className="absolute -inset-20 rounded-full bg-[radial-gradient(circle,rgba(132,204,22,0.4)_0%,rgba(132,204,22,0.1)_45%,transparent_70%)]"
                    ></motion.div>
                    
                    <div className="relative w-32 h-32 sm:w-48 sm:h-48 rounded-full bg-black border-2 border-[#84cc16]/50 flex items-center justify-center shadow-[0_0_40px_rgba(132,204,22,0.3)] z-10 overflow-hidden">
                        {isSpeaking ? (
                            <div className="flex gap-2 items-center h-12 z-20">
                                {[1, 2, 3, 4, 5].map((i) => (
                                    <motion.div 
                                        key={i}
                                        animate={{ scaleY: [0.2, 1, 0.2] }}
                                        transition={{ duration: 0.55 + i * 0.08, repeat: Infinity, delay: i * 0.1 }}
                                        className="h-full w-2 sm:w-3 bg-[#84cc16] rounded-full"
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
                            className="max-w-xl bg-white/5 border border-white/10 rounded-3xl p-6 sm:p-8 shadow-2xl relative"
                        >
                            {/* Arrow removed for cleaner glassmorphism look */}
                            <p className="text-xl sm:text-2xl text-emerald-50 leading-relaxed">
                                {zedxText}
                            </p>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {amyFailedQuestion && (
                <div role="alert" className="relative z-30 mx-auto mb-4 max-w-lg rounded-xl border border-amber-500/40 bg-zinc-900 p-4 text-center">
                    <p className="text-sm text-amber-200">Amy could not play this question. Your interview is paused.</p>
                    <div className="mt-3 flex justify-center gap-3">
                        <Button onClick={() => { void speakText(amyFailedQuestion); }}>Retry Amy</Button>
                        <Button variant="outline" onClick={() => {
                            setEnglishSpeechPreference('browser');
                            void speakText(amyFailedQuestion);
                        }}>Use browser voice</Button>
                    </div>
                </div>
            )}

            {/* Bottom Section: Webcam & User Speech */}
            <div className="w-full p-4 sm:p-6 flex flex-col md:flex-row items-center md:items-end justify-between z-20 gap-4 sm:gap-6">
                
                {/* Hardware Controls & Webcam Box */}
                <div className="flex flex-col sm:flex-row gap-4 items-center w-full md:w-auto">
                    {/* Webcam Box */}
                    <div className="relative w-full max-w-[12rem] sm:max-w-none sm:w-64 rounded-2xl overflow-hidden border border-white/10 bg-gray-900 shadow-xl flex-shrink-0 aspect-[4/3] flex items-center justify-center">
                        {!isCameraEnabled && (
                            <div className="absolute inset-0 bg-gradient-to-br from-gray-900 to-black flex items-center justify-center flex-col gap-2 opacity-70">
                                <CameraOff className="w-8 h-8 text-white/20" />
                                <span className="text-xs text-white/40 font-medium">Camera Disabled</span>
                            </div>
                        )}
                        <video ref={videoRef} autoPlay muted playsInline className="w-full h-full object-cover transform -scale-x-100" />
                    </div>{/* end webcam box */}

                    {/* Mobile Tap-to-Speak Button */}
                    {isMobile && isListening && (
                        <div className="flex flex-col gap-2 w-full sm:w-auto">
                            {userTranscript.length > 0 ? (
                                <Button 
                                    onClick={() => handleUserFinishedSpeaking(userTranscript)}
                                    className="bg-blue-600 hover:bg-blue-500 text-white rounded-xl py-6 px-4 shadow-lg border border-blue-500/50 w-full"
                                >
                                    <span className="font-bold text-lg">Send Answer</span>
                                </Button>
                            ) : (
                                <Button 
                                    onClick={() => {
                                        if (recognitionRef.current) {
                                            try { recognitionRef.current.start(); } catch (e) {}
                                        }
                                    }}
                                    className="bg-[#84cc16] hover:bg-[#65a30d] text-white rounded-xl py-6 px-4 shadow-[0_0_15px_rgba(132,204,22,0.4)] border border-[#84cc16]/50 w-full"
                                >
                                    <Mic className="w-6 h-6 mr-2" />
                                    <span className="font-bold text-lg">Start Speaking</span>
                                </Button>
                            )}
                        </div>
                    )}
                </div>{/* end hardware controls wrapper */}

                {/* User Transcript Bubble (Only shows when listening & speaking) */}
                <div className="flex-1 w-full max-w-2xl md:justify-self-end mt-4 md:mt-0">
                    <AnimatePresence>
                        {isListening && userTranscript && (
                            <motion.div 
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0 }}
                                className="bg-emerald-900/30 border border-emerald-500/30 rounded-2xl p-4 text-emerald-100 text-lg shadow-lg"
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
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(6,78,59,0.2),transparent_65%)]"></div>
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,rgba(20,83,45,0.1),transparent_65%)]"></div>
            </div>
        </div>
    );
}
