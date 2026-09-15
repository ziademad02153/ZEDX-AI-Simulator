"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import {
    Mic,
    ArrowRight,
    CheckCircle2,
    Video,
    ChevronDown,
    Loader2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function HowToUsePage() {
    const router = useRouter();
    const [isElectron, setIsElectron] = useState(false);
    const [step, setStep] = useState(1); // 1: camera, 2: mic

    // Devices
    const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([]);
    const [audioDevices, setAudioDevices] = useState<MediaDeviceInfo[]>([]);
    const [selectedVideo, setSelectedVideo] = useState("");
    const [selectedAudio, setSelectedAudio] = useState("");

    // Hardware State
    const videoRef = useRef<HTMLVideoElement>(null);
    const [stream, setStream] = useState<MediaStream | null>(null);
    const [isDetecting, setIsDetecting] = useState(true);
    const [audioLevel, setAudioLevel] = useState(0);
    const [audioData, setAudioData] = useState<number[]>(new Array(20).fill(0));
    const [isTestingMic, setIsTestingMic] = useState(false);
    const [isMicTested, setIsMicTested] = useState(false);
    const [agreed, setAgreed] = useState(false);

    useEffect(() => {
        if (window.electronAPI) {
            setTimeout(() => setIsElectron(true), 0);
        }
    }, []);

    // Get Devices when step changes to 1
    useEffect(() => {
        if (step === 1 || step === 2) {
            navigator.mediaDevices.enumerateDevices().then(devices => {
                const videos = devices.filter(d => d.kind === 'videoinput');
                const audios = devices.filter(d => d.kind === 'audioinput');
                setVideoDevices(videos);
                setAudioDevices(audios);
                if (videos.length > 0 && !selectedVideo) setSelectedVideo(videos[0].deviceId);
                if (audios.length > 0 && !selectedAudio) setSelectedAudio(audios[0].deviceId);
            });
        }
    }, [step]);

    // Handle Camera Stream
    useEffect(() => {
        if (step === 1) {
            let activeStream: MediaStream | null = null;
            const startCamera = async () => {
                try {
                    const s = await navigator.mediaDevices.getUserMedia({ 
                        video: selectedVideo ? { deviceId: { exact: selectedVideo } } : true 
                    });
                    activeStream = s;
                    setStream(s);
                    if (videoRef.current) {
                        videoRef.current.srcObject = s;
                    }
                    setTimeout(() => setIsDetecting(false), 2000);
                } catch (err) {
                    console.error("Camera access error:", err);
                }
            };
            startCamera();

            return () => {
                if (activeStream) {
                    activeStream.getTracks().forEach(track => track.stop());
                }
            };
        }
    }, [step, selectedVideo]);

    // Handle Mic Stream
    useEffect(() => {
        if (step === 2 && isTestingMic) {
            let activeStream: MediaStream | null = null;
            let audioContext: AudioContext | null = null;
            let javascriptNode: ScriptProcessorNode | null = null;

            const startMic = async () => {
                try {
                    const s = await navigator.mediaDevices.getUserMedia({ 
                        audio: selectedAudio ? { deviceId: { exact: selectedAudio } } : true 
                    });
                    activeStream = s;
                    
                    audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
                    const analyser = audioContext.createAnalyser();
                    const microphone = audioContext.createMediaStreamSource(s);
                    javascriptNode = audioContext.createScriptProcessor(2048, 1, 1);
                    
                    analyser.smoothingTimeConstant = 0.8;
                    analyser.fftSize = 1024;
                    
                    microphone.connect(analyser);
                    analyser.connect(javascriptNode);
                    javascriptNode.connect(audioContext.destination);
                    
                    javascriptNode.onaudioprocess = () => {
                        const array = new Uint8Array(analyser.frequencyBinCount);
                        analyser.getByteFrequencyData(array);
                        const chunks = 10; // We will mirror these 10 chunks to make 20 bars
                        const binsPerChunk = Math.floor(120 / chunks); 
                        const halfAudioData = new Array(chunks).fill(0);
                        let totalAvg = 0;

                        for (let i = 0; i < chunks; i++) {
                            let sum = 0;
                            for (let j = 0; j < binsPerChunk; j++) {
                                sum += array[i * binsPerChunk + j];
                            }
                            const avg = sum / binsPerChunk;
                            halfAudioData[i] = avg * 0.5;
                            totalAvg += avg;
                        }
                        
                        // Create symmetrical 20-bar array: Center (index 9, 10) gets lowest frequencies (loudest)
                        const symmetricalData = new Array(20).fill(0);
                        for (let i = 0; i < 10; i++) {
                            symmetricalData[9 - i] = halfAudioData[i];
                            symmetricalData[10 + i] = halfAudioData[i];
                        }
                        
                        setAudioData(symmetricalData);
                        setAudioLevel((totalAvg / chunks) * 2.5);
                    };
                } catch (err) {
                    console.error("Mic access error:", err);
                }
            };
            startMic();

            return () => {
                if (activeStream) activeStream.getTracks().forEach(track => track.stop());
                if (javascriptNode && audioContext) {
                    javascriptNode.disconnect();
                    if (audioContext.state !== 'closed') audioContext.close();
                }
            };
        } else if (!isTestingMic) {
            setAudioLevel(0);
        }
    }, [step, isTestingMic, selectedAudio]);

    // Instructions removed as requested

    const handleStart = () => {
        router.push("/mock-interview");
    };

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-black text-gray-900 dark:text-white relative flex flex-col items-center justify-center p-4 sm:p-8 font-sans transition-colors duration-500">
            
            {/* Background elements */}
            <div className="absolute top-[-10%] right-[-5%] w-[40%] h-[40%] bg-emerald-500/10 blur-[120px] rounded-full pointer-events-none"></div>
            <div className="absolute bottom-[-10%] left-[-5%] w-[40%] h-[40%] bg-teal-500/10 blur-[120px] rounded-full pointer-events-none"></div>

            <AnimatePresence mode="wait">

                {step === 1 && (
                    <motion.div 
                        key="step1"
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        className="relative z-10 max-w-2xl w-full flex flex-col items-center"
                    >
                        <div className="text-center mb-8">
                            <h2 className="text-3xl sm:text-4xl font-bold mb-3 dark:text-white tracking-tight">Check your camera</h2>
                            <p className="text-gray-500 dark:text-gray-400 text-base sm:text-lg max-w-lg mx-auto">
                                Your camera will record the interview for assessment and proctoring. Please be ready to appear on video in a professional setting.
                            </p>
                        </div>

                        <div className="w-full bg-white dark:bg-[#111] rounded-[24px] shadow-2xl border border-gray-100 dark:border-white/10 p-4 sm:p-6 mb-8 relative overflow-hidden">
                            {/* Dropdown Header */}
                            <div className="flex items-center justify-between p-3 sm:p-4 mb-4 bg-gray-50 dark:bg-white/5 rounded-xl border border-gray-100 dark:border-white/5 w-full">
                                <div className="flex items-center gap-3 flex-1 overflow-hidden pr-4">
                                    <Video className="w-5 h-5 text-emerald-500 shrink-0" />
                                    <select 
                                        className="bg-transparent border-none outline-none text-sm sm:text-base font-medium dark:text-white cursor-pointer appearance-none w-full truncate"
                                        value={selectedVideo}
                                        onChange={(e) => setSelectedVideo(e.target.value)}
                                    >
                                        {videoDevices.length > 0 ? (
                                            videoDevices.map((d, i) => (
                                                <option key={d.deviceId} value={d.deviceId} className="dark:bg-black">
                                                    {d.label || `Camera ${i + 1}`}
                                                </option>
                                            ))
                                        ) : (
                                            <option>Default Camera</option>
                                        )}
                                    </select>
                                </div>
                                <ChevronDown className="w-4 h-4 text-gray-400 pointer-events-none" />
                            </div>

                            {/* Video Container */}
                            <div className="relative w-full aspect-[4/3] rounded-2xl overflow-hidden bg-gray-900 border border-gray-200 dark:border-white/10">
                                <video 
                                    ref={videoRef} 
                                    autoPlay 
                                    muted 
                                    playsInline 
                                    className="w-full h-full object-cover transform -scale-x-100" 
                                />
                                {isDetecting && (
                                    <div className="absolute bottom-4 left-4 right-4 bg-white/90 dark:bg-black/80 backdrop-blur-md rounded-xl p-3 flex items-center justify-center gap-3 shadow-lg border border-white/20">
                                        <Loader2 className="w-4 h-4 animate-spin text-emerald-500" />
                                        <span className="text-sm font-medium text-gray-900 dark:text-gray-200">
                                            Please wait we are detecting your face...
                                        </span>
                                    </div>
                                )}
                            </div>
                        </div>

                        <Button
                            onClick={() => setStep(2)}
                            className="h-14 sm:h-16 px-12 text-lg sm:text-xl font-bold bg-gray-500 hover:bg-gray-600 text-white rounded-full shadow-lg transition-all hover:scale-105 active:scale-95"
                        >
                            Continue
                        </Button>
                    </motion.div>
                )}

                {step === 2 && (
                    <motion.div 
                        key="step2"
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        className="relative z-10 max-w-2xl w-full flex flex-col items-center"
                    >
                        <div className="text-center mb-8">
                            <h2 className="text-3xl sm:text-4xl font-bold mb-3 dark:text-white tracking-tight">Test your mic</h2>
                            <p className="text-gray-500 dark:text-gray-400 text-base sm:text-lg max-w-lg mx-auto">
                                Let's make sure your mic is working—please follow the steps below to test it.
                            </p>
                        </div>

                        {/* Mic Test Card */}
                        <div className="w-full bg-white dark:bg-[#111] rounded-[24px] shadow-2xl border border-gray-100 dark:border-white/10 p-4 sm:p-6 mb-8">
                            {/* Dropdown Header */}
                            <div className="flex items-center justify-between p-3 sm:p-4 mb-6 bg-gray-50 dark:bg-white/5 rounded-xl border border-gray-100 dark:border-white/5 w-full">
                                <div className="flex items-center gap-3 flex-1 overflow-hidden pr-4">
                                    <Mic className="w-5 h-5 text-emerald-500 shrink-0" />
                                    <select 
                                        className="bg-transparent border-none outline-none text-sm sm:text-base font-medium dark:text-white cursor-pointer appearance-none w-full truncate"
                                        value={selectedAudio}
                                        onChange={(e) => setSelectedAudio(e.target.value)}
                                    >
                                        {audioDevices.length > 0 ? (
                                            audioDevices.map((d, i) => (
                                                <option key={d.deviceId} value={d.deviceId} className="dark:bg-black">
                                                    {d.label || `Microphone ${i + 1}`}
                                                </option>
                                            ))
                                        ) : (
                                            <option>Default Microphone</option>
                                        )}
                                    </select>
                                </div>
                                <ChevronDown className="w-4 h-4 text-gray-400 pointer-events-none" />
                            </div>

                            <div className="text-center mb-6">
                                <p className="text-gray-700 dark:text-gray-300 font-medium mb-4">
                                    Click 'Speak' button and read the line below out loud.
                                </p>
                                <div className="bg-gray-50 dark:bg-white/5 rounded-2xl p-6 sm:p-8 border border-gray-100 dark:border-white/5">
                                    <p className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-8">
                                        Testing. Do you hear me ZEDX?
                                    </p>
                                    
                                    {/* Audio Visualizer */}
                                    <div className="flex justify-center items-center gap-1.5 h-16 mb-8">
                                        {audioData.map((bandAmplitude, i) => {
                                            // Make center bars taller naturally
                                            const centerDistance = Math.abs(10 - i);
                                            const baseHeight = Math.max(12, 30 - (centerDistance * 2));
                                            const activeHeight = isTestingMic ? baseHeight + bandAmplitude : baseHeight;
                                            const isGreen = isTestingMic && bandAmplitude > 4;
                                            
                                            return (
                                                <motion.div 
                                                    key={i}
                                                    animate={{ height: Math.min(60, activeHeight) }}
                                                    transition={{ duration: 0.05, ease: "linear" }}
                                                    className={cn(
                                                        "w-1.5 sm:w-2 rounded-full transition-colors",
                                                        isGreen ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.3)]" : "bg-gray-200 dark:bg-white/10"
                                                    )}
                                                    style={{ minHeight: "8px" }}
                                                />
                                            );
                                        })}
                                    </div>

                                    <Button
                                        onClick={() => {
                                            if (isTestingMic) {
                                                setIsTestingMic(false);
                                                setIsMicTested(true);
                                            } else {
                                                setIsTestingMic(true);
                                                setIsMicTested(false);
                                            }
                                        }}
                                        className={cn(
                                            "w-full sm:w-3/4 mx-auto h-14 rounded-xl text-lg font-bold transition-all",
                                            isTestingMic 
                                                ? "bg-red-500 hover:bg-red-600 text-white" 
                                                : isMicTested ? "bg-emerald-600 hover:bg-emerald-700 text-white border-2 border-emerald-500/50" : "bg-blue-600 hover:bg-blue-700 text-white"
                                        )}
                                    >
                                        {isTestingMic ? "Stop Testing" : isMicTested ? "Test Again" : "Speak"}
                                    </Button>
                                    
                                    <AnimatePresence>
                                        {isMicTested && (
                                            <motion.div 
                                                initial={{ opacity: 0, y: 5 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                exit={{ opacity: 0, y: 5 }}
                                                className="mt-4 flex items-center justify-center gap-2 text-emerald-600 dark:text-emerald-400 font-medium"
                                            >
                                                <CheckCircle2 size={18} />
                                                <span>Mic working perfectly!</span>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>
                            </div>
                        </div>

                        <Button
                            onClick={handleStart}
                            disabled={!isMicTested}
                            className={cn(
                                "h-14 sm:h-16 px-12 text-lg sm:text-xl font-bold rounded-full shadow-lg transition-all",
                                isMicTested 
                                    ? "bg-gradient-to-r from-emerald-600 to-green-500 hover:from-emerald-500 hover:to-green-400 text-white hover:scale-105 active:scale-95" 
                                    : "bg-gray-200 dark:bg-zinc-800 text-gray-400 dark:text-gray-500 cursor-not-allowed"
                            )}
                        >
                            Start Interview
                        </Button>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
