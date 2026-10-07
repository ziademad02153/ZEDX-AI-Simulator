import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

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
        return NextResponse.json(data);
    } catch {
        return NextResponse.json({ error: "Failed to process payment" }, { status: 500 });
    }
}
