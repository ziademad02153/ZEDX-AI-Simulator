"use client";

import React, { useEffect, useState, use } from "react";
import { interviewService, Interview, Rubric13Report } from "@/lib/interview-service";
import { enforceRubric13ReportSchema } from "@/lib/rubric-evaluator";
import { generateExecutiveReportHtml } from "@/lib/pdf-report-generator";
import { Loader2, Printer, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function PrintReportPage({ params }: { params: Promise<{ id: string }> }) {
    const unwrappedParams = use(params);
    const id = unwrappedParams.id;

    const [interview, setInterview] = useState<Interview | null>(null);
    const [rubricReport, setRubricReport] = useState<Rubric13Report | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchAndPrepare = async () => {
            try {
                const data = await interviewService.getInterviewById(id);
                setInterview(data);

                if (data.analysis?.rubric_report && data.analysis.rubric_report.rubric_version === "1.3") {
                    const rawReport = data.analysis.rubric_report;
                    const exchanges = (data.analysis as any)?.session_exchanges || [];
                    const sanitized = enforceRubric13ReportSchema(rawReport, {
                        assessmentId: rawReport.assessment_id || `ZEDX-${id.slice(0, 8).toUpperCase()}`,
                        assessmentDate: rawReport.assessment_date || data.created_at,
                        candidateName: rawReport.candidate?.name || "Candidate",
                        targetRole: rawReport.candidate?.target_role || "Software Developer",
                        track: rawReport.candidate?.track || "Role-Specific",
                        interviewType: rawReport.candidate?.interview_type || "Technical",
                        difficulty: rawReport.candidate?.difficulty || "Intermediate",
                        language: rawReport.candidate?.language || "en-US",
                        evaluatorModel: rawReport.candidate?.evaluator_model || "openai/gpt-oss-120b",
                        sessionExchanges: exchanges,
                        descriptiveMetrics: (rawReport as any).session_telemetry || rawReport.descriptive_session_metrics
                    });
                    setRubricReport(sanitized);
                } else {
                    const res = await fetch("/api/generate-report", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ interviewId: id })
                    });
                    if (res.ok) {
                        const json = await res.json();
                        if (json.rubric_report) {
                            setRubricReport(json.rubric_report);
                        }
                    }
                }
            } catch (err: any) {
                console.error("Print load error:", err);
                setError("Failed to load report for printing.");
            } finally {
                setIsLoading(false);
            }
        };

        fetchAndPrepare();
    }, [id]);

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center p-8 bg-[#0b0f19] text-white">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-black border border-white/10 flex items-center justify-center shadow-lg">
                        <img src="/apple-touch-icon.png" alt="ZEDX" className="w-8 h-8 rounded-lg object-contain" />
                    </div>
                    <Loader2 className="w-6 h-6 animate-spin text-[#9df400]" />
                    <p className="text-xs font-mono uppercase tracking-widest text-slate-400">Rendering Performance Analysis Blueprint...</p>
                </div>
            </div>
        );
    }

    if (error || !rubricReport) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center p-8 bg-[#0b0f19] text-white">
                <p className="text-rose-400 mb-4">{error || "Report not found."}</p>
                <Link href={`/dashboard/report/${id}`}>
                    <Button variant="outline" className="border-white/20 text-white hover:bg-white/10">
                        <ArrowLeft className="w-4 h-4 mr-2" /> Back to Report
                    </Button>
                </Link>
            </div>
        );
    }

    const htmlContent = generateExecutiveReportHtml(rubricReport);

    // Extract styles and body content from the generated HTML
    const matchStyle = htmlContent.match(/<style>([\s\S]*?)<\/style>/);
    const cssRules = matchStyle ? matchStyle[1] : "";
    const matchBody = htmlContent.match(/<body>([\s\S]*?)<\/body>/);
    const bodyHtml = matchBody ? matchBody[1] : htmlContent;

    return (
        <div className="print-workbench min-h-screen bg-[#0b0f19] py-6 print:py-0 print:bg-white text-slate-900 flex flex-col items-center">
            {/* Floating Action Bar */}
            <div className="no-print fixed top-4 right-4 z-50 flex items-center gap-3 bg-slate-950/90 backdrop-blur-md text-white p-2.5 rounded-2xl shadow-2xl border border-white/10">
                <Link href={`/dashboard/report/${id}`}>
                    <Button variant="ghost" size="sm" className="text-xs text-slate-300 hover:text-white hover:bg-white/10 rounded-xl">
                        <ArrowLeft className="w-3.5 h-3.5 mr-1" /> Back
                    </Button>
                </Link>
                <Button 
                    onClick={() => window.print()}
                    className="bg-[#9df400] hover:bg-[#8ee000] text-slate-950 rounded-xl text-xs flex items-center gap-1.5 shadow-lg shadow-[#9df400]/20 font-bold px-4 py-2"
                >
                    <Printer className="w-4 h-4" /> Save as PDF
                </Button>
            </div>

            {/* Injected Print Stylesheet */}
            <style dangerouslySetInnerHTML={{ __html: `
                ${cssRules}

                @media screen {
                    .print-workbench {
                        background: #0b0f19 !important;
                    }
                    .page {
                        width: 210mm !important;
                        min-width: 210mm !important;
                        max-width: 210mm !important;
                        margin: 28px auto !important;
                        box-shadow: 0 20px 45px -10px rgba(0, 0, 0, 0.6), 0 10px 20px -5px rgba(0, 0, 0, 0.4) !important;
                        border-radius: 3px !important;
                        background: #ffffff !important;
                    }
                }

                @media print {
                    .no-print {
                        display: none !important;
                    }
                    html, body, .print-workbench {
                        background: #ffffff !important;
                        margin: 0 !important;
                        padding: 0 !important;
                        width: 210mm !important;
                    }
                    .page {
                        margin: 0 !important;
                        box-shadow: none !important;
                        border-radius: 0 !important;
                        page-break-after: always !important;
                        break-after: page !important;
                    }
                }
            ` }} />

            {/* Direct DOM Render of the Document */}
            <div 
                className="print-document-container flex flex-col items-center w-full"
                dangerouslySetInnerHTML={{ __html: bodyHtml }} 
            />
        </div>
    );
}
