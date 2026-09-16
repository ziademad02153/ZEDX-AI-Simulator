import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(request: Request) {
    try {
        // 1. Security Check: Verify Webhook Secret
        const url = new URL(request.url);
        const secret = url.searchParams.get('secret');
        const expectedSecret = process.env.GUMROAD_WEBHOOK_SECRET;

        if (!expectedSecret || secret !== expectedSecret) {
            return NextResponse.json({ error: "Unauthorized access" }, { status: 401 });
        }

        // Gumroad sends data as application/x-www-form-urlencoded
        const formData = await request.formData();
        
        const email = formData.get('email') as string;
        const permalink = formData.get('permalink') as string;
        
        if (!email) {
            return NextResponse.json({ error: "Missing email" }, { status: 400 });
        }

        const refunded = formData.get('refunded');
        const chargebacked = formData.get('chargebacked');
        const isRefunded = refunded === 'true' || chargebacked === 'true';

        // Determine tier based on Gumroad product permalink
        let targetTier: 'free' | 'pro' | 'ultra' = 'free';
        let monthsToAdd = 0;

        if (isRefunded) {
            // 70X SECURITY FIX: Refund Fraud Prevention
            // If the user refunded or charged back, immediately revoke their access
            targetTier = 'free';
            monthsToAdd = -120; // Set expiration date to the past
        } else if (permalink === 'hkfdfv') {
            targetTier = 'pro';
            monthsToAdd = 1;
        } else if (permalink === 'molojy') {
            targetTier = 'ultra';
            monthsToAdd = 3;
        } else {
            // Unknown product, ignore
            return NextResponse.json({ message: "Ignored unknown product" }, { status: 200 });
        }

        const supabaseAdmin = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        );

        // Calculate expiration date
        const expirationDate = new Date();
        expirationDate.setMonth(expirationDate.getMonth() + monthsToAdd);

        // Update the user in Supabase by email
        const { error } = await supabaseAdmin
            .from("profiles")
            .update({
                tier: targetTier,
                subscription_expires_at: expirationDate.toISOString()
            })
            .ilike("email", email);

        if (error) {
            console.error("Gumroad Webhook DB Error:", error);
            return NextResponse.json({ error: "Failed to update user profile" }, { status: 500 });
        }

        return NextResponse.json({ success: true, message: `Upgraded ${email} to ${targetTier}` }, { status: 200 });

    } catch (error: any) {
        console.error("Gumroad Webhook Parse Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
