import { NextResponse } from "next/server";

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { firstName, lastName, email, organization, features, volume, message } = body;

        if (!firstName || !lastName || !email || !organization || !volume || !message) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        const nodemailer = require("nodemailer");
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
                    <p><strong>Name:</strong> ${firstName} ${lastName}</p>
                    <p><strong>Work Email:</strong> <a href="mailto:${email}">${email}</a></p>
                    <p><strong>Organization:</strong> ${organization}</p>
                    
                    <h3 style="color: #555; margin-top: 20px;">Usage & Interests</h3>
                    <p><strong>Expected Volume:</strong> ${volume}</p>
                    <p><strong>Interested Features:</strong></p>
                    <ul>
                        ${features.length > 0 ? features.map((f: string) => `<li>${f}</li>`).join('') : '<li>None selected</li>'}
                    </ul>
                    
                    <h3 style="color: #555; margin-top: 20px;">Message / Specific Needs</h3>
                    <div style="background-color: #f9fafb; padding: 15px; border-radius: 6px; border: 1px solid #e5e7eb; white-space: pre-wrap;">
                        ${message}
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
