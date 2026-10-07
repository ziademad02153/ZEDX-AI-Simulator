import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(request: Request) {
    const secret = new URL(request.url).searchParams.get("secret");
    if (!process.env.GUMROAD_WEBHOOK_SECRET || secret !== process.env.GUMROAD_WEBHOOK_SECRET) {
        return NextResponse.json({ error: "Unauthorized access" }, { status: 401 });
    }
    try {
        const form = await request.formData();
        const email = form.get("email");
        const saleId = form.get("sale_id");
        let product = form.get("permalink") ?? form.get("product_permalink");
        if (form.get("test") === "true") {
            return NextResponse.json({ success: true, ignored: true });
        }
        if (typeof product === "string" && product.startsWith("https://")) {
            const productUrl = new URL(product);
            if (productUrl.hostname === "gumroad.com" || productUrl.hostname.endsWith(".gumroad.com")
                || productUrl.hostname === "gum.co") product = productUrl.pathname.split("/").filter(Boolean).pop() ?? "";
        }
        if (product !== "hkfdfv" && product !== "molojy") {
            return NextResponse.json({ success: true, ignored: true });
        }
        if (typeof email !== "string" || !email.trim() || email.length > 320
            || typeof saleId !== "string" || !saleId.trim() || saleId.length > 200) {
            return NextResponse.json({ error: "Missing or invalid email/sale_id" }, { status: 400 });
        }
        if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
            return NextResponse.json({ error: "Server Configuration Error" }, { status: 500 });
        }
        const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY, {
            auth: { autoRefreshToken: false, persistSession: false }
        });
        const { data, error } = await admin.rpc("process_gumroad_payment", {
            p_sale_id: saleId.trim(), p_email: email.trim(), p_product: product,
            p_refunded: (form.get("refunded") === "true" && form.get("partially_refunded") !== "true")
                || form.get("chargebacked") === "true" || form.get("chargedback") === "true"
        });
        if (error) {
            console.error("Gumroad processing failed:", error.code);
            return NextResponse.json({ error: "Payment could not be processed" }, { status: 500 });
        }
        return NextResponse.json(data);
    } catch {
        return NextResponse.json({ error: "Invalid webhook payload" }, { status: 400 });
    }
}
