import nodemailer from "nodemailer";

export async function sendPaymentConfirmation(input: {
    email: string; tier: "pro" | "ultra"; amount: number;
    currency: string; expiresAt: string; reference: string;
}) {
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) throw new Error("EMAIL_NOT_CONFIGURED");
    const escape = (value: string) => value.replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
    const plan = input.tier === "ultra" ? "Ultra" : "Pro";
    const expiry = new Intl.DateTimeFormat("en-GB", { dateStyle: "long", timeZone: "Africa/Cairo" }).format(new Date(input.expiresAt));
    const text = `Your ZEDX ${plan} subscription is active.\nPayment received: ${input.amount} ${input.currency} via InstaPay.\nSubscription valid until: ${expiry}.\nPayment reference: ${input.reference}\nStart practicing: https://zedx-ai.tech/dashboard\nSupport: zedx.ai.support@gmail.com`;
    const transporter = nodemailer.createTransport({ service: "gmail", auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS }, connectionTimeout: 10000, socketTimeout: 15000 });
    await transporter.sendMail({
        from: { name: "ZEDX AI", address: process.env.EMAIL_USER }, to: input.email,
        replyTo: "zedx.ai.support@gmail.com", subject: `Welcome to ZEDX ${plan} — your subscription is active`, text,
        html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;background:#08120f;color:#fff;padding:32px"><h2 style="color:#b7f51b">ZEDX AI</h2><h1>Your ${plan} subscription is active</h1><p>Thank you for choosing ZEDX AI. Your InstaPay payment has been approved and your access is ready.</p><p><strong>Plan:</strong> ZEDX ${plan}<br><strong>Payment:</strong> ${input.amount} ${escape(input.currency)}<br><strong>Valid until:</strong> ${expiry}<br><strong>Reference:</strong> ${escape(input.reference)}</p><p>Practice personalized interviews and use your feedback reports to prepare for your next opportunity.</p><p><a href="https://zedx-ai.tech/dashboard" style="display:inline-block;background:#b7f51b;color:#08120f;padding:14px 24px;text-decoration:none;font-weight:bold">Start practicing</a></p><p style="color:#b9c5be">Questions? Reply to this email and our support team will help.</p></div>`
    });
}
