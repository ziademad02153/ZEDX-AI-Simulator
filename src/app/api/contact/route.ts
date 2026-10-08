import { NextResponse } from "next/server";
import { createClient } from '@supabase/supabase-js';
import { createHmac } from 'node:crypto';
import nodemailer from 'nodemailer';

const escapeHtml = (value: string) => value.replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]!));

export async function POST(req: Request) {
    try {
        const origin = req.headers.get('origin');
        if (origin && origin !== new URL(req.url).origin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        const raw = await req.text();
        if (Buffer.byteLength(raw) > 16000) return NextResponse.json({ error: 'Request is too large' }, { status: 413 });
        let body;
        try { body = JSON.parse(raw); } catch { return NextResponse.json({ error: 'Invalid request' }, { status: 400 }); }
        if (body?.website) return NextResponse.json({ success: true });
        const { firstName, lastName, email, organization, volume, message } = body || {};
        const features = body?.features || [];

        if (![firstName, lastName, email, organization, volume, message].every(value => typeof value === 'string' && value.trim())
            || firstName.length > 100 || lastName.length > 100 || organization.length > 200 || volume.length > 100 || message.length > 5000
            || email.length > 254 || !/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(email) || /[\r\n]/.test(email + firstName + lastName + organization)
            || !Array.isArray(features) || features.length > 10 || !features.every(value => typeof value === 'string' && value.length <= 500)) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }
        const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
        if (!serviceKey) return NextResponse.json({ error: 'Service unavailable' }, { status: 503 });
        const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
        // Vercel overwrites this header; do not trust caller-supplied IP headers on other hosts.
        const ip = process.env.VERCEL ? req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown' : 'local';
        for (const [key, limit] of [[`ip:${ip}`, 5], [`email:${email.trim().toLowerCase()}`, 3], ['global', 100]] as const) {
            const hash = createHmac('sha256', serviceKey).update(key).digest('hex');
            const { data: allowed, error } = await admin.rpc('consume_contact_limit', { p_key: hash, p_limit: limit, p_window_seconds: 3600 });
            if (error || allowed == null) return NextResponse.json({ error: 'Service unavailable. Please retry later.' }, { status: 503 });
            if (!allowed) return NextResponse.json({ error: 'Too many messages. Please try again later.' }, { status: 429 });
        }
        const safe = { firstName: escapeHtml(firstName), lastName: escapeHtml(lastName), email: escapeHtml(email), organization: escapeHtml(organization), volume: escapeHtml(volume), message: escapeHtml(message), features: features.map(escapeHtml) };

        const transporter = nodemailer.createTransport({
            service: "gmail",
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS,
            },
        });

        // HTML Email Template
        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: "zedx.ai.support@gmail.com",
            replyTo: email, // This allows the admin to hit "Reply" and email the client directly
            subject: `🏢 New Enterprise Inquiry from ${organization} (${firstName} ${lastName})`,
            html: `
                <div style="font-family: Arial, sans-serif; padding: 20px; color: #333; max-width: 600px; line-height: 1.6;">
                    <h2 style="color: #10b981; border-bottom: 2px solid #eee; padding-bottom: 10px;">New ZEDX Enterprise Inquiry</h2>
                    
                    <h3 style="color: #555; margin-top: 20px;">Contact Details</h3>
                    <p><strong>Name:</strong> ${safe.firstName} ${safe.lastName}</p>
                    <p><strong>Work Email:</strong> <a href="mailto:${safe.email}">${safe.email}</a></p>
                    <p><strong>Organization:</strong> ${safe.organization}</p>
                    
                    <h3 style="color: #555; margin-top: 20px;">Usage & Interests</h3>
                    <p><strong>Expected Volume:</strong> ${safe.volume}</p>
                    <p><strong>Interested Features:</strong></p>
                    <ul>
                        ${safe.features.length > 0 ? safe.features.map((f: string) => `<li>${f}</li>`).join('') : '<li>None selected</li>'}
                    </ul>
                    
                    <h3 style="color: #555; margin-top: 20px;">Message / Specific Needs</h3>
                    <div style="background-color: #f9fafb; padding: 15px; border-radius: 6px; border: 1px solid #e5e7eb; white-space: pre-wrap;">
                        ${safe.message}
                    </div>

                    <p style="margin-top: 30px; font-size: 12px; color: #999;">
                        Reply to this email to contact the prospective client directly.
                    </p>
                </div>
            `,
        };

        await transporter.sendMail(mailOptions);

        return NextResponse.json({ success: true });

    } catch (error) {
        console.error("Contact form submission error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
