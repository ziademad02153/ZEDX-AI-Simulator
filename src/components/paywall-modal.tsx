import { useRouter } from "next/navigation";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Lock, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PaywallModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    title?: string;
    description?: string;
}

export function PaywallModal({ 
    open, 
    onOpenChange, 
    title = "Free Limit Reached", 
    description = "You've reached your free limit. Upgrade to ZEDX Pro to continue conducting interviews."
}: PaywallModalProps) {
    const router = useRouter();

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md bg-white/95 dark:bg-black/95 backdrop-blur-xl border-gray-200 dark:border-white/10 rounded-2xl shadow-2xl">
                <DialogHeader className="text-center sm:text-center space-y-4 pt-4">
                    <div className="mx-auto w-12 h-12 bg-amber-100 dark:bg-amber-500/20 rounded-full flex items-center justify-center mb-2">
                        <Lock className="w-6 h-6 text-amber-600 dark:text-amber-400" />
                    </div>
                    <DialogTitle className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-400">
                        {title}
                    </DialogTitle>
                    <DialogDescription className="text-gray-600 dark:text-gray-300 text-base">
                        {description}
                    </DialogDescription>
                </DialogHeader>
                <div className="flex flex-col gap-3 py-6">
                    <div className="flex items-center gap-3 text-sm text-gray-700 dark:text-gray-300">
                        <Sparkles className="w-4 h-4 text-emerald-500" /> Unlimited AI interviews
                    </div>
                    <div className="flex items-center gap-3 text-sm text-gray-700 dark:text-gray-300">
                        <Sparkles className="w-4 h-4 text-emerald-500" /> Full technical deep-dives
                    </div>
                </div>
                <DialogFooter className="sm:justify-center">
                    <Button 
                        onClick={() => router.push('/pricing')}
                        className="w-full sm:w-auto bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-medium rounded-xl px-8 py-6 h-auto shadow-lg shadow-emerald-500/20 transition-all hover:scale-105"
                    >
                        Upgrade to Pro
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
