import { NextRequest, NextResponse } from "next/server";
import { interviewService, Rubric13Report, QuestionEvaluation } from "@/lib/interview-service";
import { generateExecutiveReportHtml } from "@/lib/pdf-report-generator";
import { enforceRubric13ReportSchema } from "@/lib/rubric-evaluator";
import fs from "fs";
import path from "path";
import os from "os";
import { execFile } from "child_process";
import { promisify } from "util";
import { SERVER_SESSION_COOKIE } from '@/lib/server-session';
import { addBrowserPrintControls } from '@/lib/browser-print-document';
import { getReportLabels } from '@/lib/report-labels';

const execFileAsync = promisify(execFile);

// Known Edge and Chrome paths on Windows and Linux
const BROWSER_PATHS = [
    "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
    "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
    "/usr/bin/google-chrome",
    "/usr/bin/chromium-browser",
    "/usr/bin/microsoft-edge"
];

function findBrowserBinary(): string | null {
    for (const p of BROWSER_PATHS) {
        if (fs.existsSync(p)) return p;
    }
    return null;
}

import { createClient } from "@supabase/supabase-js";

export async function GET(
    request: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    const { id } = await context.params;

    try {
        // Credentials belong in a header or HttpOnly cookie, never a shareable URL.
        const token = request.headers.get('authorization')?.match(/^Bearer (.+)$/)?.[1] || request.cookies.get(SERVER_SESSION_COOKIE)?.value;
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
        const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
        
        const { data: { user } } = token ? await supabaseAdmin.auth.getUser(token) : { data: { user: null } };
        
        if (!user) {
            return NextResponse.json({ error: "User not authenticated" }, { status: 401 });
        }

        const { data: interview, error } = await supabaseAdmin
            .from('interviews')
            .select('*')
            .eq('id', id)
            .eq('user_id', user.id)
            .single();

        if (error || !interview) {
            return NextResponse.json({ error: "Interview not found" }, { status: 404 });
        }

        let rawReport = interview.analysis?.rubric_report;
        if (!rawReport || rawReport.rubric_version !== "1.3") {
            return NextResponse.json({ error: "Rubric 1.3 report not yet generated." }, { status: 400 });
        }

        const exchanges = (interview.analysis as any)?.session_exchanges || [];
        const rubricReport = enforceRubric13ReportSchema(rawReport, {
            assessmentId: rawReport.assessment_id || `ZEDX-${id.slice(0, 8).toUpperCase()}`,
            assessmentDate: rawReport.assessment_date || interview.created_at,
            candidateName: rawReport.candidate?.name || "Candidate",
            targetRole: interview.title || rawReport.candidate?.target_role || "Software Developer",
            track: interview.analysis?.interview_type || rawReport.candidate?.track || "Role-Specific",
            interviewType: interview.analysis?.interview_type || rawReport.candidate?.interview_type || "Technical",
            difficulty: interview.analysis?.difficulty || rawReport.candidate?.difficulty || "Intermediate",
            language: interview.analysis?.language || rawReport.candidate?.language || "en-US",
            strictLanguage: interview.analysis?.session_mode === 'mock_interview',
            evaluatorModel: rawReport.candidate?.evaluator_model || "openai/gpt-oss-120b",
            sessionExchanges: exchanges,
            descriptiveMetrics: (rawReport as any).session_telemetry || rawReport.descriptive_session_metrics
        });

        const htmlContent = generateExecutiveReportHtml(rubricReport, interview.analysis?.session_mode === 'mock_interview');
        const printFallback = addBrowserPrintControls(htmlContent, getReportLabels(rubricReport.candidate.language, interview.analysis?.session_mode === 'mock_interview').pdf);

        const browserPath = findBrowserBinary();
        if (!browserPath) {
            // Fallback: Return HTML if headless browser is unavailable on this host
            return new NextResponse(printFallback, {
                headers: {
                    "Content-Type": "text/html; charset=utf-8", "Cache-Control": "private, no-store", "Referrer-Policy": "no-referrer"
                }
            });
        }

        // Use temporary files for headless PDF compilation
        const tempDir = os.tmpdir();
        const tempHtmlPath = path.join(tempDir, `zedx_report_${id}_${Date.now()}.html`);
        const tempPdfPath = path.join(tempDir, `zedx_report_${id}_${Date.now()}.pdf`);

        await fs.promises.writeFile(tempHtmlPath, htmlContent, "utf-8");

        const args = [
            "--headless=new",
            "--disable-gpu",
            "--no-pdf-header-footer",
            `--print-to-pdf=${tempPdfPath}`,
            `file:///${tempHtmlPath.replace(/\\/g, "/")}`
        ];

        try {
            await execFileAsync(browserPath, args, { timeout: 30000 });
            
            if (fs.existsSync(tempPdfPath)) {
                const pdfBuffer = await fs.promises.readFile(tempPdfPath);

                // Cleanup temp files asynchronously
                fs.promises.unlink(tempHtmlPath).catch(() => {});
                fs.promises.unlink(tempPdfPath).catch(() => {});

                const filename = `ZEDX_Interview_Report_${rubricReport.candidate.name.replace(/\s+/g, "_")}_${rubricReport.assessment_id}.pdf`;

                return new NextResponse(pdfBuffer, {
                    headers: {
                        "Content-Type": "application/pdf",
                        "Cache-Control": "private, no-store",
                        "Referrer-Policy": "no-referrer",
                        "Content-Disposition": `attachment; filename="${filename}"`
                    }
                });
            } else {
                throw new Error("PDF file was not created by browser");
            }
        } catch (execErr) {
            console.error("[PDF Route] Browser headless execution error:", execErr);
            // Fallback to serving raw HTML
            fs.promises.unlink(tempHtmlPath).catch(() => {});
            return new NextResponse(printFallback, {
                headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "private, no-store", "Referrer-Policy": "no-referrer" }
            });
        }
    } catch (err: any) {
        console.error("[PDF Route] Server error:", err);
        return NextResponse.json({ error: err.message || "Failed to generate PDF" }, { status: 500 });
    }
}
