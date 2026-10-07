"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { CheckCircle, XCircle, Clock, Loader2, AlertCircle } from "lucide-react";
import { supabase } from "@/lib/supabase";

type PendingApproval = {
    id: string;
    user_id: string;
    transaction_id: string;
    payment_method: string;
    status: 'pending' | 'approved' | 'rejected';
    created_at: string;
    amount?: number;
    currency?: string;
    profiles?: { email?: string }; // if we join with profiles
};

export default function AdminPaymentsPage() {
    const [approvals, setApprovals] = useState<PendingApproval[]>([]);
    const [reviews, setReviews] = useState<{ provider: string; external_id: string; user_id: string; product: string }[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [adminKey, setAdminKey] = useState("");
    const [isAuthenticated, setIsAuthenticated] = useState(false);

    // Fetch approvals via API to bypass RLS, passing the admin key
    const fetchApprovals = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const res = await fetch("/api/admin/payments", {
                headers: { "x-admin-key": adminKey }
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Failed to fetch");
            setApprovals(data.approvals || []);
            setReviews(data.reviews || []);
            setIsAuthenticated(true);
        } catch (err: any) {
            setError(err.message);
            setIsAuthenticated(false);
        } finally {
            setIsLoading(false);
        }
    };

    const handleAction = async (id: string, action: 'approve' | 'reject') => {
        setActionLoading(id);
        try {
            const res = await fetch("/api/admin/payments/action", {
                method: "POST",
                headers: { 
                    "Content-Type": "application/json",
                    "x-admin-key": adminKey
                },
                body: JSON.stringify({ id, action })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Action failed");
            
            // Refresh list
            fetchApprovals();
        } catch (err: any) {
            alert("Error: " + err.message);
        } finally {
            setActionLoading(null);
        }
    };

    if (!isAuthenticated) {
        return (
            <div className="min-h-screen bg-zinc-950 text-white flex items-center justify-center p-4">
                <div className="bg-zinc-900 border border-zinc-800 p-8 rounded-2xl max-w-md w-full shadow-2xl">
                    <h1 className="text-2xl font-bold mb-2">Admin Login</h1>
                    <p className="text-zinc-400 text-sm mb-6">Enter the Admin Key to access payment approvals.</p>
                    
                    {error && (
                        <div className="bg-red-500/10 border border-red-500/50 text-red-500 p-3 rounded-lg mb-4 text-sm flex items-center gap-2">
                            <AlertCircle size={16} /> {error}
                        </div>
                    )}

                    <input 
                        type="password" 
                        value={adminKey}
                        onChange={(e) => setAdminKey(e.target.value)}
                        placeholder="Admin Key"
                        className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white mb-4 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                        onKeyDown={(e) => e.key === 'Enter' && fetchApprovals()}
                    />
                    <Button 
                        onClick={fetchApprovals}
                        disabled={isLoading || !adminKey}
                        className="w-full bg-emerald-600 hover:bg-emerald-500"
                    >
                        {isLoading ? <Loader2 className="animate-spin" /> : "Access Dashboard"}
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-zinc-950 text-white p-6 sm:p-12">
            <div className="max-w-5xl mx-auto">
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-3xl font-bold mb-2 text-emerald-400">Payment Approvals</h1>
                        <p className="text-zinc-400">Manage Instapay and local wallet payment requests.</p>
                    </div>
                    <Button 
                        variant="ghost" 
                        onClick={fetchApprovals} 
                        disabled={isLoading}
                        className="border border-zinc-800 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white transition-colors"
                    >
                        {isLoading ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : null}
                        Refresh
                    </Button>
                </div>

                {reviews.length > 0 && (
                    <div className="mb-6 rounded-xl border border-amber-500/40 bg-amber-500/10 p-4">
                        <h2 className="font-semibold text-amber-400">Gumroad payments requiring manual review</h2>
                        <p className="mt-2 text-sm text-zinc-300">Review these sales in Gumroad before adjusting access: a refund overlaps another purchase, a Pro purchase conflicts with active Ultra, or the account has permanent paid access.</p>
                        {reviews.map(review => (
                            <p key={`${review.provider}:${review.external_id}`} className="mt-2 break-all text-sm text-zinc-300">
                                Sale: {review.external_id} · Product: {review.product} · User: {review.user_id}
                            </p>
                        ))}
                    </div>
                )}
                <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden shadow-xl">
                    {approvals.length === 0 ? (
                        <div className="p-12 text-center text-zinc-500">
                            <Clock className="w-12 h-12 mx-auto mb-4 opacity-50" />
                            <p>No pending approvals at the moment.</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-zinc-800/50 border-b border-zinc-800">
                                        <th className="p-4 font-semibold text-zinc-300">Date</th>
                                        <th className="p-4 font-semibold text-zinc-300">User Email</th>
                                        <th className="p-4 font-semibold text-zinc-300">Transaction Info</th>
                                        <th className="p-4 font-semibold text-zinc-300">Status</th>
                                        <th className="p-4 font-semibold text-zinc-300 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {approvals.map((app) => (
                                        <tr key={app.id} className="border-b border-zinc-800/50 hover:bg-zinc-800/30 transition-colors">
                                            <td className="p-4 text-sm text-zinc-400">
                                                {new Date(app.created_at).toLocaleString()}
                                            </td>
                                            <td className="p-4 text-sm text-zinc-300 font-medium">
                                                {app.profiles?.email || 'N/A'}
                                            </td>
                                            <td className="p-4">
                                                <div className="font-mono text-emerald-400 font-medium">
                                                    {app.transaction_id}
                                                </div>
                                                <div className="text-xs text-zinc-500 uppercase tracking-wider mt-1">
                                                    {app.payment_method} - {app.amount ? `${app.amount} ${app.currency}` : '300 EGP'}
                                                </div>
                                            </td>
                                            <td className="p-4">
                                                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium uppercase tracking-wider
                                                    ${app.status === 'pending' ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20' : 
                                                      app.status === 'approved' ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' : 
                                                      'bg-red-500/10 text-red-500 border border-red-500/20'}`}
                                                >
                                                    {app.status === 'pending' && <Clock size={12} />}
                                                    {app.status === 'approved' && <CheckCircle size={12} />}
                                                    {app.status === 'rejected' && <XCircle size={12} />}
                                                    {app.status}
                                                </span>
                                            </td>
                                            <td className="p-4 text-right space-x-2">
                                                {app.status === 'pending' && (
                                                    <>
                                                        <Button 
                                                            size="sm" 
                                                            variant="outline" 
                                                            className="border-red-500/30 text-red-500 hover:bg-red-500/10"
                                                            onClick={() => handleAction(app.id, 'reject')}
                                                            disabled={actionLoading === app.id}
                                                        >
                                                            Reject
                                                        </Button>
                                                        <Button 
                                                            size="sm" 
                                                            className="bg-emerald-600 hover:bg-emerald-500 text-white"
                                                            onClick={() => handleAction(app.id, 'approve')}
                                                            disabled={actionLoading === app.id}
                                                        >
                                                            {actionLoading === app.id ? <Loader2 className="animate-spin w-4 h-4" /> : "Approve"}
                                                        </Button>
                                                    </>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
