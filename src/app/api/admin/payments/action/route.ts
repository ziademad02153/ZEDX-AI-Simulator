import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { sendPaymentConfirmation } from "@/lib/payment-confirmation";

export async function POST(req: Request) {
    if (!process.env.ADMIN_SECRET_KEY || req.headers.get("x-admin-key") !== process.env.ADMIN_SECRET_KEY) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const body = await req.json().catch(() => null);
    if (!body || typeof body.id !== "string" || !/^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(body.id)
        || !["approve", "reject"].includes(body.action)) {
        return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
        return NextResponse.json({ error: "Server Configuration Error" }, { status: 500 });
    }
    try {
        const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY, {
            auth: { autoRefreshToken: false, persistSession: false }
        });
        const { data, error } = await admin.rpc("process_instapay_payment", {
            p_approval_id: body.id, p_action: body.action
        });
        if (error) {
            if (error.code === "P0002") return NextResponse.json({ error: "Payment or profile not found" }, { status: 404 });
            if (error.code === "P0001" || error.code === "23505") {
                const message = error.message === "ACTIVE_HIGHER_TIER"
                    ? "This user has active Ultra access. A Pro payment requires manual review."
                    : error.message === "PERMANENT_GRANT_REQUIRES_REVIEW"
                    ? "This user has permanent paid access. Review this payment before changing their grant."
                    : "This payment has already been processed or requires manual review.";
                return NextResponse.json({ error: message }, { status: 409 });
            }
            console.error("Payment processing failed:", error.code);
            return NextResponse.json({ error: "Failed to process payment" }, { status: 500 });
        }
        let confirmationEmail = "not_applicable";
        if (body.action === "approve" && !data?.already_processed && data?.success) {
            confirmationEmail = "failed";
            try {
                const { data: payment, error: paymentError } = await admin.from("pending_approvals")
                    .select("user_id,amount,currency,transaction_id").eq("id", body.id).single();
                if (paymentError || !payment) throw new Error("PAYMENT_LOOKUP_FAILED");
                const { data: account, error: accountError } = await admin.auth.admin.getUserById(payment.user_id);
                const { data: receipt, error: receiptError } = await admin.from("payment_receipts")
                    .select("applied_tier,applied_expires_at").eq("approval_id", body.id).eq("provider", "instapay").single();
                if (accountError || !account.user?.email || receiptError || !receipt?.applied_expires_at
                    || !["pro", "ultra"].includes(receipt.applied_tier)) throw new Error("CONFIRMATION_DETAILS_MISSING");
                await sendPaymentConfirmation({ email: account.user.email, tier: receipt.applied_tier,
                    amount: payment.amount, currency: payment.currency, expiresAt: receipt.applied_expires_at,
                    reference: payment.transaction_id });
                confirmationEmail = "sent";
            } catch {
                console.error("Payment approved, but confirmation email failed", body.id);
            }
        } else if (body.action === "approve" && data?.already_processed) {
            confirmationEmail = "already_processed";
        }
        return NextResponse.json({ ...data, confirmation_email: confirmationEmail });
    } catch {
        return NextResponse.json({ error: "Failed to process payment" }, { status: 500 });
    }
}
