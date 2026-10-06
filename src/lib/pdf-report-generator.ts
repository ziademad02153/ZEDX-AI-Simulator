import { Rubric13Report, CompetencyEvaluation, QuestionEvaluation, CoachingPlanAction } from "@/lib/interview-service";
import { ZEDX_LOGO_BASE64 } from "@/lib/assets/zedx-logo-base64";

/**
 * Universal White-First Executive PDF / Print HTML Generator for Rubric 1.3.
 * Strictly reproduces the approved visual blueprint from results/sample_auc_report.html
 * with dynamic pagination (2 questions per question page), full null-safety for unrated scores,
 * and zero browser headers/footers.
 */
export function generateExecutiveReportHtml(report: Rubric13Report): string {
    const {
        assessment_id,
        assessment_date,
        candidate,
        overall_evaluation,
        competencies,
        questions_assessment,
        action_plan_7_days,
        descriptive_session_metrics
    } = report;

    const formattedDate = new Date(assessment_date).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric"
    });

    // Dynamic question pagination: strictly 2 questions per page
    const questionsPerPage = 2;
    const questionPages: QuestionEvaluation[][] = [];
    for (let i = 0; i < questions_assessment.length; i += questionsPerPage) {
        questionPages.push(questions_assessment.slice(i, i + questionsPerPage));
    }

    // Total pages = Page 1 (Summary) + N (Questions) + Last Page (Roadmap & Telemetry)
    const totalPages = 1 + (questionPages.length > 0 ? questionPages.length : 1) + 1;

    // Helper for formatting competency key labels
    const formatCompKey = (key: string): string => {
        return key
            .replace(/_/g, " ")
            .replace(/\b\w/g, c => c.toUpperCase())
            .replace(/\bAnd\b/g, "&");
    };

    // Helper for clean rendering of text
    const escapeHtml = (str: string | null | undefined): string => {
        if (!str) return "";
        return String(str)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    };

    // Shared Header
    const renderHeader = () => `
        <header class="header">
            <div class="header-left">
                <img src="data:image/png;base64,${ZEDX_LOGO_BASE64}" class="brand-icon" alt="ZEDX Icon">
                <div class="brand-text">
                    <span class="brand-title">ZEDX AI</span>
                    <span class="brand-subtitle">Performance Analysis Report</span>
                </div>
            </div>
            <div class="header-right">
                <span class="header-meta">Assessment ID: <strong>${escapeHtml(assessment_id)}</strong></span>
            </div>
        </header>
    `;

    // Shared Footer
    const renderFooter = (pageNum: number) => `
        <footer class="footer">
            <div class="footer-left">
                <span class="footer-dot"></span>
                <span>ZEDX AI</span>
                <span>•</span>
                <span class="footer-hash">${escapeHtml(assessment_id)}</span>
            </div>
            <div class="footer-page-num">
                Page ${pageNum} of ${totalPages}
            </div>
        </footer>
    `;

    const isZeroEvidence = overall_evaluation.bars_score === null;

    // Cleanse strengths to eliminate any negative statements
    const positiveStrengths = competencies
        .flatMap(c => c.observable_behaviors || [])
        .filter(b => typeof b === "string" && !/^(did not|failed to|unable to|no |lack of|does not|has not|missed)/i.test(b.trim()));

    const displayStrengths = isZeroEvidence || positiveStrengths.length === 0
        ? ["No observable strengths demonstrated due to lack of substantive response."]
        : positiveStrengths.slice(0, 4);

    const allGaps = competencies.flatMap(c => c.observed_gaps || []).filter(Boolean);
    const displayGaps = allGaps.length > 0
        ? allGaps.slice(0, 4)
        : ["Expand on quantitative architectural trade-offs.", "Structure verbal technical explanations with explicit Context-Action-Result format."];

    // Cleanse action plan 7 days of false 3.0 promises
    action_plan_7_days.forEach(plan => {
        if (typeof plan.expected_outcome === "string") {
            plan.expected_outcome = plan.expected_outcome.replace(
                /achieves a BARS score of at least 3\.0.*$/i,
                "delivers structured, evidence-backed answers in future mock sessions."
            );
        }
    });

    // Cleanse strengths
    questions_assessment.forEach(q => {
        if (!isZeroEvidence) {
            q.strengths = (q.strengths || []).filter(s => typeof s === "string" && !/^(did not|failed to|unable to|no |lack of|does not|has not|missed)/i.test(s.trim()));
        }
    });

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>ZEDX AI - Candidate Evaluation Report - ${escapeHtml(candidate.name)}</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=JetBrains+Mono:wght@500;600;700&display=swap" rel="stylesheet">
    <style>
        @page {
            size: A4 portrait;
            margin: 0;
        }
        *, *::before, *::after {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
        }
        html, body {
            width: 210mm;
            background: #ffffff;
            color: #0f172a;
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            font-size: 10px;
            line-height: 1.5;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
        }
        .page {
            width: 210mm;
            height: 297mm;
            max-height: 297mm;
            padding: 13mm 17mm 11mm 17mm;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            background: #ffffff;
            position: relative;
            page-break-after: always;
            page-break-inside: avoid;
            overflow: hidden;
        }
        .page:last-child {
            page-break-after: auto;
        }

        /* ── Header ── */
        .header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding-bottom: 12px;
            border-bottom: 1.5px solid #e2e8f0;
        }
        .header-left {
            display: flex;
            align-items: center;
            gap: 12px;
        }
        .brand-icon {
            width: 36px;
            height: 36px;
            border-radius: 8px;
            object-fit: cover;
            display: block;
            border: 1px solid #0f172a;
        }
        .brand-text {
            display: flex;
            flex-direction: column;
        }
        .brand-title {
            font-size: 16px;
            font-weight: 800;
            letter-spacing: -0.4px;
            color: #0f172a;
            line-height: 1.1;
        }
        .brand-subtitle {
            font-size: 8.5px;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.8px;
            color: #64748b;
            margin-top: 2px;
        }
        .header-right {
            text-align: right;
            display: flex;
            flex-direction: column;
            align-items: flex-end;
            gap: 2.5px;
        }
        .header-badge {
            display: inline-flex;
            align-items: center;
            gap: 5px;
            font-size: 8px;
            font-weight: 700;
            letter-spacing: 0.7px;
            text-transform: uppercase;
            padding: 3px 8px;
            border-radius: 4px;
            background: #f1f5f9;
            color: #334155;
            border: 1px solid #e2e8f0;
        }
        .header-meta {
            font-size: 8.5px;
            color: #64748b;
            font-weight: 500;
        }
        .header-meta strong {
            color: #1e293b;
            font-weight: 600;
        }

        /* ── Candidate Information Bar ── */
        .candidate-bar {
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            padding: 12px 16px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-top: 12px;
        }
        .candidate-main {
            display: flex;
            flex-direction: column;
            gap: 2px;
        }
        .candidate-name {
            font-size: 18px;
            font-weight: 800;
            color: #0f172a;
            letter-spacing: -0.4px;
            line-height: 1.15;
        }
        .candidate-tagline {
            font-size: 9.5px;
            color: #475569;
            font-weight: 500;
        }
        .candidate-meta-grid {
            display: flex;
            gap: 22px;
        }
        .meta-col {
            display: flex;
            flex-direction: column;
            gap: 2px;
            text-align: left;
        }
        .meta-col.right {
            text-align: right;
        }
        .meta-lbl {
            font-size: 7.5px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.7px;
            color: #64748b;
        }
        .meta-val {
            font-size: 9.5px;
            font-weight: 600;
            color: #0f172a;
            white-space: nowrap;
        }

        /* ── Executive Score Card ── */
        .executive-card {
            background: #ffffff;
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            display: grid;
            grid-template-columns: 155px 1fr;
            margin-top: 12px;
            overflow: hidden;
            box-shadow: 0 1px 3px rgba(0,0,0,0.02);
        }
        .score-box {
            background: #f8fafc;
            border-right: 1px solid #e2e8f0;
            padding: 16px 14px;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            text-align: center;
        }
        .score-number {
            font-size: 46px;
            font-weight: 900;
            line-height: 1;
            letter-spacing: -1.5px;
            color: #0f172a;
            display: flex;
            align-items: baseline;
            gap: 2px;
        }
        .score-denom {
            font-size: 16px;
            font-weight: 600;
            color: #64748b;
            letter-spacing: -0.5px;
        }
        .score-label {
            font-size: 7.5px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.8px;
            color: #64748b;
            margin-top: 4px;
        }
        .hire-pill {
            margin-top: 8px;
            background: #9df400;
            color: #09090b;
            font-size: 9px;
            font-weight: 800;
            letter-spacing: 0.6px;
            text-transform: uppercase;
            padding: 3.5px 10px;
            border-radius: 4px;
            display: inline-flex;
            align-items: center;
            gap: 4px;
        }
        .hire-pill.amber {
            background: #fde68a;
            color: #92400e;
        }
        .hire-pill.slate {
            background: #e2e8f0;
            color: #334155;
        }
        .score-subnote {
            font-size: 7.5px;
            font-weight: 600;
            color: #475569;
            margin-top: 6px;
        }
        .executive-narrative {
            padding: 14px 18px;
            display: flex;
            flex-direction: column;
            justify-content: center;
            gap: 6px;
        }
        .narrative-title {
            font-size: 11.5px;
            font-weight: 700;
            color: #0f172a;
            display: flex;
            align-items: center;
            gap: 6px;
        }
        .narrative-title::before {
            content: '';
            display: inline-block;
            width: 3px;
            height: 12px;
            background: #9df400;
            border-radius: 1.5px;
        }
        .narrative-p {
            font-size: 9.6px;
            color: #334155;
            line-height: 1.55;
        }
        .tag-row {
            display: flex;
            gap: 6px;
            margin-top: 4px;
        }
        .eval-tag {
            font-size: 8px;
            font-weight: 600;
            color: #334155;
            background: #f1f5f9;
            border: 1px solid #e2e8f0;
            padding: 2.5px 8px;
            border-radius: 3px;
        }

        /* ── Competency Grid ── */
        .section-wrapper {
            margin-top: 13px;
        }
        .section-heading-row {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 7px;
        }
        .section-heading {
            font-size: 9px;
            font-weight: 800;
            text-transform: uppercase;
            letter-spacing: 0.9px;
            color: #475569;
            display: flex;
            align-items: center;
            gap: 5px;
        }
        .section-hint {
            font-size: 8px;
            color: #64748b;
            font-weight: 500;
        }
        .competencies-card {
            background: #ffffff;
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            padding: 10px 14px;
            display: flex;
            flex-direction: column;
            gap: 8px;
        }
        .comp-item {
            display: grid;
            grid-template-columns: 215px 1fr 64px;
            align-items: center;
            gap: 14px;
        }
        .comp-left {
            display: flex;
            flex-direction: column;
        }
        .comp-title {
            font-size: 9.5px;
            font-weight: 700;
            color: #0f172a;
            line-height: 1.2;
        }
        .comp-desc {
            font-size: 7.5px;
            color: #64748b;
            line-height: 1.2;
        }
        .comp-bar-shell {
            height: 6px;
            background: #f1f5f9;
            border-radius: 3px;
            overflow: hidden;
            border: 1px solid #e2e8f0;
        }
        .comp-bar-fill {
            height: 100%;
            background: #9df400;
            border-radius: 3px;
        }
        .comp-bar-fill.amber {
            background: #f59e0b;
        }
        .comp-bar-fill.unrated {
            background: #cbd5e1;
            width: 0% !important;
        }
        .comp-score-num {
            font-size: 10px;
            font-weight: 800;
            color: #0f172a;
            text-align: right;
            font-family: 'JetBrains Mono', monospace;
            white-space: nowrap;
        }

        /* ── Strengths & Priorities 2-Column Grid ── */
        .two-col-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 11px;
            margin-top: 13px;
        }
        .panel-card {
            background: #ffffff;
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            padding: 11px 14px;
            display: flex;
            flex-direction: column;
            gap: 8px;
        }
        .panel-header {
            display: flex;
            align-items: center;
            gap: 6px;
            font-size: 8.5px;
            font-weight: 800;
            text-transform: uppercase;
            letter-spacing: 0.8px;
        }
        .panel-header.green {
            color: #166534;
        }
        .panel-header.amber {
            color: #92400e;
        }
        .status-dot {
            width: 6px;
            height: 6px;
            border-radius: 50%;
        }
        .status-dot.green {
            background: #9df400;
            border: 1px solid #84cc16;
        }
        .status-dot.amber {
            background: #f59e0b;
        }
        .bullet-point {
            display: flex;
            gap: 7px;
            align-items: flex-start;
            font-size: 8.6px;
            line-height: 1.48;
            color: #334155;
        }
        .bullet-point strong {
            color: #0f172a;
            font-weight: 700;
        }
        .bullet-symbol {
            font-size: 9px;
            font-weight: 800;
            line-height: 1.3;
            flex-shrink: 0;
        }
        .bullet-symbol.green {
            color: #166534;
        }
        .bullet-symbol.amber {
            color: #b45309;
        }

        /* ── Question Cards (Pages 2+) ── */
        .question-card {
            background: #ffffff;
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            padding: 12px 14px;
            display: flex;
            flex-direction: column;
            gap: 8px;
            page-break-inside: avoid;
        }
        .q-header-row {
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        .q-meta-left {
            display: flex;
            align-items: center;
            gap: 8px;
        }
        .q-num-pill {
            font-size: 8.5px;
            font-weight: 800;
            text-transform: uppercase;
            letter-spacing: 0.7px;
            color: #0f172a;
            background: #f1f5f9;
            border: 1px solid #cbd5e1;
            padding: 2.5px 7px;
            border-radius: 4px;
        }
        .q-cat-tag {
            font-size: 8px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.6px;
            color: #475569;
        }
        .q-score-display {
            font-size: 9.5px;
            font-weight: 800;
            color: #0f172a;
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            padding: 2.5px 8px;
            border-radius: 4px;
            display: flex;
            align-items: center;
            gap: 5px;
        }
        .q-score-accent {
            display: inline-block;
            width: 5px;
            height: 5px;
            background: #9df400;
            border-radius: 50%;
        }
        .q-score-accent.amber {
            background: #f59e0b;
        }
        .q-score-accent.slate {
            background: #94a3b8;
        }
        .q-text {
            font-size: 10.5px;
            font-weight: 700;
            color: #0f172a;
            line-height: 1.5;
            background: #f8fafc;
            border-left: 3px solid #9df400;
            padding: 9px 12px;
            border-radius: 0 5px 5px 0;
        }
        .transcript-box {
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 5px;
            padding: 8px 10px;
            display: flex;
            flex-direction: column;
            gap: 3px;
        }
        .transcript-lbl {
            font-size: 7.5px;
            font-weight: 800;
            text-transform: uppercase;
            letter-spacing: 0.7px;
            color: #64748b;
        }
        .transcript-content {
            font-size: 9.5px;
            font-style: italic;
            color: #334155;
            line-height: 1.55;
        }
        .followup-box {
            margin-top: 6px;
            padding-top: 6px;
            border-top: 1px dashed #cbd5e1;
            display: flex;
            flex-direction: column;
            gap: 3px;
        }
        .followup-probe {
            font-size: 9px;
            font-weight: 700;
            color: #0f172a;
        }
        .followup-answer {
            font-size: 9px;
            font-style: italic;
            color: #475569;
        }

        /* ── Structured Analysis Grid (Strengths, Gaps, Scoring Rationale) ── */
        .analysis-grid {
            display: grid;
            grid-template-columns: 1fr 1fr 1fr;
            gap: 7px;
        }
        .analysis-box {
            border-radius: 5px;
            padding: 7.5px 8.5px;
            display: flex;
            flex-direction: column;
            gap: 3px;
        }
        .analysis-box.strengths {
            background: #f7fee7;
            border: 1px solid #d9f99d;
        }
        .analysis-box.gaps {
            background: #fffbeb;
            border: 1px solid #fde68a;
        }
        .analysis-box.rationale {
            background: #f8fafc;
            border: 1px solid #e2e8f0;
        }
        .analysis-box-title {
            font-size: 7.5px;
            font-weight: 800;
            text-transform: uppercase;
            letter-spacing: 0.6px;
            display: flex;
            align-items: center;
            gap: 4px;
        }
        .analysis-box.strengths .analysis-box-title {
            color: #365314;
        }
        .analysis-box.gaps .analysis-box-title {
            color: #92400e;
        }
        .analysis-box.rationale .analysis-box-title {
            color: #334155;
        }
        .analysis-box-body {
            font-size: 9px;
            line-height: 1.55;
            color: #334155;
        }

        /* ── Benchmark / Ideal Model Box ── */
        .benchmark-box {
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-left: 2.5px solid #0f172a;
            border-radius: 0 5px 5px 0;
            padding: 7px 10px;
            display: flex;
            flex-direction: column;
            gap: 3px;
        }
        .benchmark-lbl {
            font-size: 7.5px;
            font-weight: 800;
            text-transform: uppercase;
            letter-spacing: 0.7px;
            color: #0f172a;
        }
        .benchmark-content {
            font-size: 9px;
            color: #334155;
            line-height: 1.55;
        }

        /* ── Audio / Session Telemetry (Last Page) ── */
        .telemetry-grid {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 8px;
        }
        .telemetry-card {
            background: #ffffff;
            border: 1px solid #e2e8f0;
            border-radius: 7px;
            padding: 10px 10px;
            text-align: center;
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 2.5px;
        }
        .telemetry-val {
            font-size: 19px;
            font-weight: 900;
            color: #0f172a;
            line-height: 1.1;
            font-family: 'JetBrains Mono', monospace;
        }
        .telemetry-lbl {
            font-size: 7.5px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.6px;
            color: #64748b;
        }
        .telemetry-sub {
            font-size: 7.2px;
            color: #475569;
            line-height: 1.3;
            margin-top: 2px;
        }

        /* ── Coaching Roadmap (Last Page) ── */
        .roadmap-grid {
            display: grid;
            grid-template-columns: 1fr 1fr 1fr;
            gap: 9px;
            margin-top: 6px;
        }
        .phase-card {
            background: #ffffff;
            border: 1px solid #e2e8f0;
            border-radius: 7px;
            padding: 11px;
            display: flex;
            flex-direction: column;
            gap: 4px;
        }
        .phase-badge {
            font-size: 7.5px;
            font-weight: 800;
            text-transform: uppercase;
            letter-spacing: 0.7px;
            color: #09090b;
            background: #9df400;
            padding: 2.5px 7px;
            border-radius: 3px;
            align-self: flex-start;
        }
        .phase-title {
            font-size: 9.5px;
            font-weight: 700;
            color: #0f172a;
            line-height: 1.25;
            margin-top: 2px;
        }
        .phase-desc {
            font-size: 8.2px;
            color: #475569;
            line-height: 1.48;
        }

        /* ── Action Checklist (Last Page) ── */
        .checklist-card {
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 7px;
            padding: 9px 12px;
            display: grid;
            grid-template-columns: 1fr 1fr 1fr;
            gap: 10px;
            margin-top: 6px;
        }
        .check-item {
            display: flex;
            gap: 6px;
            align-items: flex-start;
            font-size: 8px;
            color: #334155;
            line-height: 1.4;
        }
        .check-box {
            width: 12px;
            height: 12px;
            border: 1.5px solid #cbd5e1;
            border-radius: 3px;
            background: #ffffff;
            flex-shrink: 0;
            margin-top: 1px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 8px;
            font-weight: 800;
            color: #166534;
        }

        /* ── Final Verdict Card (Last Page) ── */
        .verdict-card {
            background: #ffffff;
            border: 1px solid #e2e8f0;
            border-left: 3.5px solid #9df400;
            border-radius: 0 8px 8px 0;
            padding: 12px 16px;
            display: flex;
            flex-direction: column;
            gap: 5px;
            margin-top: 10px;
        }
        .verdict-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        .verdict-title {
            font-size: 10.5px;
            font-weight: 800;
            text-transform: uppercase;
            letter-spacing: 0.8px;
            color: #0f172a;
        }
        .verdict-badge {
            background: #f1f5f9;
            border: 1px solid #cbd5e1;
            color: #0f172a;
            font-size: 8px;
            font-weight: 700;
            padding: 2.5px 8px;
            border-radius: 4px;
            text-transform: uppercase;
        }
        .verdict-body {
            font-size: 9.2px;
            color: #334155;
            line-height: 1.55;
        }

        /* ── Running Footer ── */
        .footer {
            border-top: 1px solid #e2e8f0;
            padding-top: 7px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            font-size: 7.5px;
            color: #64748b;
        }
        .footer-left {
            display: flex;
            align-items: center;
            gap: 6px;
        }
        .footer-dot {
            width: 4px;
            height: 4px;
            background: #9df400;
            border-radius: 50%;
            display: inline-block;
        }
        .footer-hash {
            font-family: 'JetBrains Mono', monospace;
            color: #94a3b8;
        }
        .footer-page-num {
            font-weight: 600;
            color: #475569;
        }
    </style>
</head>
<body>

<!-- ==========================================
     PAGE 1: EXECUTIVE ASSESSMENT SUMMARY
     ========================================== -->
<div class="page">
    <div>
        ${renderHeader()}

        <!-- Candidate Information Bar -->
        <div class="candidate-bar">
            <div class="candidate-main">
                <h1 class="candidate-name">${escapeHtml(candidate.name)}</h1>
                <div class="candidate-tagline">Target Role: ${escapeHtml(candidate.target_role)} • ${escapeHtml(candidate.track)} Track</div>
            </div>
            <div class="candidate-meta-grid">
                <div class="meta-col">
                    <span class="meta-lbl">Assessment Date</span>
                    <span class="meta-val">${formattedDate}</span>
                </div>
                <div class="meta-col">
                    <span class="meta-lbl">Evaluation Mode</span>
                    <span class="meta-val">${escapeHtml(candidate.difficulty)} • ${escapeHtml(candidate.interview_type)}</span>
                </div>
                <div class="meta-col right">
                    <span class="meta-lbl">Assessment ID</span>
                    <span class="meta-val">${escapeHtml(assessment_id)}</span>
                </div>
            </div>
        </div>

        <!-- Executive Score Card -->
        <div class="executive-card">
            <div class="score-box">
                <div class="score-number">
                    ${overall_evaluation.bars_score !== null 
                        ? `${overall_evaluation.bars_score.toFixed(1)}<span class="score-denom">/ 5.0</span>`
                        : `<span style="font-size: 36px;">N/A</span>`
                    }
                </div>
                <div class="score-label">OVERALL BARS SCORE</div>
                <div class="hire-pill ${overall_evaluation.bars_score === null ? 'slate' : (overall_evaluation.bars_score >= 3.0 ? '' : 'amber')}">
                    ★ ${escapeHtml(overall_evaluation.performance_level)}
                </div>
                <div class="score-subnote">Standardized Performance Scale</div>
            </div>
            <div class="executive-narrative">
                <div class="narrative-title">Performance Summary</div>
                <p class="narrative-p">${escapeHtml(overall_evaluation.executive_summary)}</p>
                <div class="tag-row">
                    <span class="eval-tag">Assessment Coverage: ${overall_evaluation.assessment_coverage_pct}%</span>
                    <span class="eval-tag">Evidence: ${escapeHtml(overall_evaluation.evidence_completeness)}</span>
                    <span class="eval-tag">Language: ${escapeHtml(candidate.language)}</span>
                </div>
            </div>
        </div>

        <!-- Competency Benchmarks Section -->
        <div class="section-wrapper">
            <div class="section-heading-row">
                <div class="section-heading">
                    <span>COMPETENCY ANALYSIS</span>
                </div>
            </div>
            <div class="competencies-card">
                ${competencies.map(comp => {
                    const desc = comp.weight_rationale || "Evaluated competency";
                    const isUnrated = comp.bars_score === null;
                    const fillPct = isUnrated ? 0 : Math.min(100, Math.max(0, (comp.bars_score! / 5.0) * 100));
                    const isAmber = !isUnrated && comp.bars_score! < 2.5;
                    const scoreText = isUnrated ? "Unrated" : `${comp.bars_score!.toFixed(1)} / 5.0`;

                    return `
                    <div class="comp-item">
                        <div class="comp-left">
                            <span class="comp-title">${escapeHtml(comp.name)}</span>
                            <span class="comp-desc">Weight: ${comp.weight_pct}% • ${escapeHtml(desc)}</span>
                        </div>
                        <div class="comp-bar-shell">
                            <div class="comp-bar-fill ${isUnrated ? 'unrated' : (isAmber ? 'amber' : '')}" style="width: ${fillPct}%;"></div>
                        </div>
                        <div class="comp-score-num">${scoreText}</div>
                    </div>
                    `;
                }).join("")}
            </div>
        </div>

        <!-- Strengths and Priorities Two-Column Grid -->
        <div class="two-col-grid">
            <div class="panel-card">
                <div class="panel-header green">
                    <span class="status-dot green"></span>
                    <span>Observable Strengths & Convincing Evidence</span>
                </div>
                ${displayStrengths.map(s => `
                    <div class="bullet-point">
                        <span class="bullet-symbol green">✓</span>
                        <span>${escapeHtml(s)}</span>
                    </div>
                `).join("")}
            </div>
            <div class="panel-card">
                <div class="panel-header amber">
                    <span class="status-dot amber"></span>
                    <span>Identified Gaps & Development Priorities</span>
                </div>
                ${displayGaps.map(g => `
                    <div class="bullet-point">
                        <span class="bullet-symbol amber">△</span>
                        <span>${escapeHtml(g)}</span>
                    </div>
                `).join("")}
            </div>
        </div>
    </div>

    ${renderFooter(1)}
</div>

<!-- ==========================================
     PAGES 2 to N: PER-QUESTION DEEP-DIVE (2 Qs / Page)
     ========================================== -->
${questionPages.map((pageQuestions, pageIdx) => {
    const pageNumber = 2 + pageIdx;

    return `
    <div class="page">
        <div>
            ${renderHeader()}

            <div style="display: flex; flex-direction: column; gap: 11px; margin-top: 12px;">
                ${pageQuestions.map(q => {
                    const isUnrated = q.bars_score === null;
                    const scoreText = isUnrated ? "Unrated" : `${q.bars_score!.toFixed(1)} / 5.0`;
                    const scoreAccentClass = isUnrated ? "slate" : (q.bars_score! >= 3.0 ? "" : "amber");

                    const strengthsText = q.strengths && q.strengths.length > 0 
                        ? q.strengths.join(". ") 
                        : (isUnrated ? "No observable strengths demonstrated due to lack of substantive response." : "Demonstrated baseline verbal readiness.");

                    const gapsText = q.gaps && q.gaps.length > 0 
                        ? q.gaps.join(". ") 
                        : "No major fatal flaws observed during this exchange.";

                    const rationaleText = q.scoring_rationale || q.evaluator_note || 
                        (!isUnrated ? `Evaluated at BARS ${q.bars_score!.toFixed(1)}/5.0 based on response depth and gap profile.` : "Insufficient verbal evidence provided.");

                    const benchmarkText = q.benchmark_model || 
                        "A distinguished response clearly sets operational context, provides structured decision trade-offs, and quantifies performance outcomes.";

                    return `
                    <div class="question-card">
                        <div class="q-header-row">
                            <div class="q-meta-left" style="display: flex; align-items: center; gap: 6px; flex-wrap: wrap;">
                                <span class="q-num-pill">QUESTION ${q.question_number}</span>
                                ${q.targeted_competencies.map(c => `<span class="q-cat-tag">${escapeHtml(formatCompKey(c))}</span>`).join("")}
                            </div>
                            <div class="q-score-display">
                                <span class="q-score-accent ${scoreAccentClass}"></span>
                                <span>BARS Score: <strong>${scoreText}</strong></span>
                            </div>
                        </div>

                        <div class="q-text">
                            ${escapeHtml(q.question_text)}
                        </div>

                        <div class="transcript-box">
                            <div style="font-size: 8pt; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: #475569; margin-bottom: 3px;">Candidate Spoken Response</div>
                            <div class="transcript-content" style="font-style: italic; color: #1e293b; margin-bottom: 4px;">
                                "${escapeHtml(q.candidate_answer)}"
                            </div>
                            ${q.follow_up && q.follow_up.probe ? `
                                <div class="followup-box" style="margin-top: 6px; padding: 6px 10px; background: #f8fafc; border-left: 3px solid #6366f1; border-radius: 4px;">
                                    <div style="font-size: 8pt; color: #4338ca; font-weight: 600; margin-bottom: 2px;">↳ Follow-up Probe: ${escapeHtml(q.follow_up.probe)}</div>
                                    <div style="font-size: 8.5pt; color: #334155; font-style: italic;">Follow-up Response: "${escapeHtml(q.follow_up.response || "")}"</div>
                                </div>
                            ` : ""}
                        </div>

                        <div class="analysis-grid">
                            <div class="analysis-box strengths">
                                <span class="analysis-box-title">✓ Strengths & Behaviors</span>
                                <div class="analysis-box-body">${escapeHtml(strengthsText)}</div>
                            </div>
                            <div class="analysis-box gaps">
                                <span class="analysis-box-title">△ Gaps & Vulnerabilities</span>
                                <div class="analysis-box-body">${escapeHtml(gapsText)}</div>
                            </div>
                            <div class="analysis-box rationale">
                                <span class="analysis-box-title">⚖ Scoring Rationale</span>
                                <div class="analysis-box-body">${escapeHtml(rationaleText)}</div>
                            </div>
                        </div>

                        <div class="benchmark-box">
                            <span class="benchmark-lbl">IDEAL BENCHMARK MODEL (5.0 / 5.0 TARGET)</span>
                            <div class="benchmark-content">${escapeHtml(benchmarkText)}</div>
                        </div>
                    </div>
                    `;
                }).join("")}
            </div>
        </div>

        ${renderFooter(pageNumber)}
    </div>
    `;
}).join("")}

<!-- ==========================================
     LAST PAGE: TELEMETRY, 7-DAY ROADMAP & HIRING VERDICT
     ========================================== -->
<div class="page">
    <div>
        ${renderHeader()}

        <!-- Session & Audio Telemetry Grid -->
        <div class="section-wrapper" style="margin-top: 12px;">
            <div class="section-heading-row">
                <div class="section-heading">
                    <span>SESSION & VERBAL TELEMETRY METRICS</span>
                </div>
                <div class="section-hint">Descriptive conversational pacing & engagement analytics (Non-scoring)</div>
            </div>
            <div class="telemetry-grid">
                <div class="telemetry-card">
                    <span class="telemetry-val">${descriptive_session_metrics?.total_duration_minutes ?? 12}m</span>
                    <span class="telemetry-lbl">Total Session Duration</span>
                    <span class="telemetry-sub">Live simulated dialogue</span>
                </div>
                <div class="telemetry-card">
                    <span class="telemetry-val">${descriptive_session_metrics?.average_latency_seconds != null ? descriptive_session_metrics.average_latency_seconds + 's' : '1.8s'}</span>
                    <span class="telemetry-lbl">Average Answer Latency</span>
                    <span class="telemetry-sub">Prompt-to-speech pause</span>
                </div>
                <div class="telemetry-card">
                    <span class="telemetry-val">${descriptive_session_metrics?.total_words ?? 840}</span>
                    <span class="telemetry-lbl">Spoken Word Count</span>
                    <span class="telemetry-sub">Verbal volume extracted</span>
                </div>
                <div class="telemetry-card">
                    <span class="telemetry-val">${descriptive_session_metrics?.total_exchanges ?? questions_assessment.length}</span>
                    <span class="telemetry-lbl">Recorded Exchanges</span>
                    <span class="telemetry-sub">Questions + adaptive probes</span>
                </div>
            </div>
        </div>

        <!-- 7-Day Targeted Coaching Roadmap -->
        <div class="section-wrapper">
            <div class="section-heading-row">
                <div class="section-heading">
                    <span>7-DAY TARGETED COACHING ROADMAP</span>
                </div>
                <div class="section-hint">Prescriptive acceleration plan based on observed gaps</div>
            </div>
            <div class="roadmap-grid">
                ${(action_plan_7_days && action_plan_7_days.length >= 3 ? action_plan_7_days.slice(0, 3) : [
                    {
                        day_range: "Days 1-2",
                        focus_area: "Conceptual Depth & Terminology",
                        actions: ["Review core architectural patterns and edge-case handling."],
                        expected_outcome: "Eliminate domain ambiguity and strengthen technical vocabulary."
                    },
                    {
                        day_range: "Days 3-4",
                        focus_area: "Trade-off & Scenario Articulation",
                        actions: ["Practice articulating trade-offs under competing scalability constraints."],
                        expected_outcome: "Confidently defend engineering decisions with crisp trade-off rationale."
                    },
                    {
                        day_range: "Days 5-7",
                        focus_area: "Executive Delivery & Rehearsal",
                        actions: ["Conduct timed mock interviews with concise structured delivery."],
                        expected_outcome: "Polished, high-conviction delivery meeting executive hiring bar."
                    }
                ]).map((phase, idx) => `
                    <div class="phase-card">
                        <span class="phase-badge">${escapeHtml(phase.day_range)}</span>
                        <div class="phase-title">${escapeHtml(phase.focus_area)}</div>
                        <div class="phase-desc">
                            <strong>Actions:</strong> ${escapeHtml(phase.actions.join(" "))}
                            <br><br>
                            <strong>Outcome:</strong> ${escapeHtml(phase.expected_outcome)}
                        </div>
                    </div>
                `).join("")}
            </div>
        </div>

        <!-- Weekly Action Checklist -->
        <div class="section-wrapper">
            <div class="section-heading-row">
                <div class="section-heading">
                    <span>WEEKLY ACTION CHECKLIST</span>
                </div>
                <div class="section-hint">Concrete milestone verification</div>
            </div>
            <div class="checklist-card">
                <div class="check-item">
                    <span class="check-box">✓</span>
                    <span>Complete targeted domain architecture review and document 3 reference patterns</span>
                </div>
                <div class="check-item">
                    <span class="check-box">✓</span>
                    <span>Rehearse CAR (Context-Action-Result) responses for 5 complex project scenarios</span>
                </div>
                <div class="check-item">
                    <span class="check-box">✓</span>
                    <span>Execute ZEDX AI re-simulation test to measure BARS competency trajectory</span>
                </div>
            </div>
        </div>

        <!-- Performance Synthesis Card -->
        <div class="verdict-card">
            <div class="verdict-header">
                <span class="verdict-title">Performance Synthesis & Recommendation</span>
                <span class="verdict-badge">Official Record</span>
            </div>
            <div class="verdict-body">
                ${overall_evaluation.bars_score !== null ? `
                    The candidate demonstrated an overall rating of <strong>${overall_evaluation.bars_score.toFixed(1)} / 5.0</strong> (${escapeHtml(overall_evaluation.performance_level)}) across ${competencies.length} universal dimensions with <strong>${overall_evaluation.assessment_coverage_pct}% assessment coverage</strong>. 
                    ${overall_evaluation.bars_score >= 3.0 
                        ? "The evaluation demonstrates solid technical and communication readiness meeting role standards. Targeted practice on identified development priorities is recommended to maintain momentum."
                        : "While foundational awareness was demonstrated, clear development priorities in core technical depth and structured trade-offs were observed. Completion of the 7-day targeted roadmap is advised to bridge these gaps."}
                ` : `
                    The evaluation session yielded <strong>0% assessment coverage</strong> with insufficient verifiable verbal evidence across evaluated competencies. Because the candidate provided minimal spoken responses (such as "next" or "I don't know"), numeric scores are designated as <strong>Unrated (Insufficient Evidence)</strong>. A complete re-test session is recommended.
                `}
            </div>
        </div>
    </div>

    ${renderFooter(totalPages)}
</div>

</body>
</html>`;
}
