import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: Request) {
    try {
        const adminKey = req.headers.get("x-admin-key");
        const EXPECTED_KEY = process.env.ADMIN_SECRET_KEY;
        
        if (!EXPECTED_KEY || !adminKey || adminKey !== EXPECTED_KEY) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        const { id, action } = body;

        if (!id || !action || (action !== 'approve' && action !== 'reject')) {
            return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
        }

        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
        
        if (!supabaseServiceKey) {
            return NextResponse.json({ error: "Server Configuration Error" }, { status: 500 });
        }

        const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
            auth: { autoRefreshToken: false, persistSession: false }
        });

        if (action === 'reject') {
            const { error } = await supabaseAdmin
                .from("pending_approvals")
                .update({ status: 'rejected' })
                .eq("id", id);
            
            if (error) throw error;
            return NextResponse.json({ success: true, message: "Rejected" });
        }

        if (action === 'approve') {
            // 1. Get the user_id for this approval
            const { data: approval, error: fetchError } = await supabaseAdmin
                .from("pending_approvals")
                .select("user_id, amount")
                .eq("id", id)
                .single();
            
            if (fetchError || !approval) {
                return NextResponse.json({ error: "Approval not found" }, { status: 404 });
            }

            // 2. Fetch the current user's profile to get existing expiration date
            const { data: profile, error: profileError } = await supabaseAdmin
                .from("profiles")
                .select("subscription_expires_at")
                .eq("id", approval.user_id)
                .single();
                
            if (profileError) throw profileError;

            const targetTier = (approval.amount && approval.amount >= 600) ? 'ultra' : 'pro';
            const monthsToAdd = targetTier === 'ultra' ? 3 : 1;
            
            // Calculate expiration date properly by accumulating time
            let baseDate = new Date();
            if (profile?.subscription_expires_at) {
                const currentExp = new Date(profile.subscription_expires_at);
                if (currentExp > baseDate) {
                    baseDate = currentExp;
                }
            }
            
            baseDate.setMonth(baseDate.getMonth() + monthsToAdd);

            const { error: updateProfileError } = await supabaseAdmin
                .from("profiles")
                .update({ 
                    tier: targetTier,
                    subscription_expires_at: baseDate.toISOString()
                })
                .eq("id", approval.user_id);
            
            if (updateProfileError) throw updateProfileError;

            // 3. ONLY if the profile update succeeds, mark the transaction as approved
            const { error: updateApprovalError } = await supabaseAdmin
                .from("pending_approvals")
                .update({ status: 'approved' })
                .eq("id", id);
            
            if (updateApprovalError) throw updateApprovalError;

            return NextResponse.json({ success: true, message: `Approved and upgraded to ${targetTier}` });
        }

    } catch (error: any) {
        console.error("Admin Action Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
