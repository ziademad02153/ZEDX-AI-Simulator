import Link from "next/link";
import Image from "next/image";

const LockIcon = ({ className = "" }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
        <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
    </svg>
);

export function Footer() {
    return (
        <footer className="bg-white dark:bg-[#09090b] pt-16 pb-12 border-t border-zinc-200 dark:border-white/5">
            <div className="relative z-10 max-w-[1400px] mx-auto px-6 md:px-10">

                <div className="flex flex-col lg:flex-row items-stretch">

                    <div className="flex flex-col lg:w-[30%] lg:border-r border-dotted border-zinc-300 dark:border-zinc-800 pr-8 pb-12 lg:pb-0">
                        <div className="flex flex-col gap-0">
                            <Link href="/" className="inline-block -mt-16 -mb-10 -ml-[39px] sm:-ml-[44px]">
                                <Image
                                    src="/zedx-logo.png"
                                    alt="ZEDX AI Logo"
                                    width={400}
                                    height={133}
                                    className="object-contain object-left w-56 sm:w-64 h-auto drop-shadow-[0_1px_3px_rgba(0,0,0,0.4)] dark:drop-shadow-none"
                                />
                            </Link>
                            <p className="text-[13px] text-zinc-500 font-medium">
                                © 2026 ZEDX AI.
                            </p>
                        </div>
                    </div>

                    {/* Right Columns: Links */}
                    <div className="flex-1 grid grid-cols-2 sm:grid-cols-4 gap-8 lg:pl-12">
                        {/* Column 1: Platform */}
                        <div className="flex flex-col">
                            <h4 className="text-[14px] font-semibold text-zinc-900 dark:text-white mb-5">Platform</h4>
                            <ul className="space-y-4">
                                <li><Link href="/about" className="text-[13px] font-medium text-zinc-600 dark:text-gray-400 hover:text-black dark:hover:text-emerald-400 transition-colors">About ZEDX</Link></li>
                                <li><Link href="/how-it-works" className="text-[13px] font-medium text-zinc-600 dark:text-gray-400 hover:text-black dark:hover:text-emerald-400 transition-colors">How it Works</Link></li>
                                <li><Link href="/pricing" className="text-[13px] font-medium text-zinc-600 dark:text-gray-400 hover:text-black dark:hover:text-emerald-400 transition-colors">Pricing</Link></li>
                                <li><Link href="/desktop-app" className="text-[13px] font-medium text-zinc-600 dark:text-gray-400 hover:text-black dark:hover:text-emerald-400 transition-colors">Desktop App</Link></li>
                            </ul>
                        </div>

                        {/* Column 2: Workspace */}
                        <div className="flex flex-col">
                            <h4 className="text-[14px] font-semibold text-zinc-900 dark:text-white mb-5">Workspace</h4>
                            <ul className="space-y-4">
                                <li><Link href="/dashboard" className="text-[13px] font-medium text-zinc-600 dark:text-gray-400 hover:text-black dark:hover:text-emerald-400 transition-colors">Dashboard</Link></li>
                                <li><Link href="/simulation" className="text-[13px] font-medium text-zinc-600 dark:text-gray-400 hover:text-black dark:hover:text-emerald-400 transition-colors">New Interview</Link></li>
                                <li><Link href="/dashboard/context-files" className="text-[13px] font-medium text-zinc-600 dark:text-gray-400 hover:text-black dark:hover:text-emerald-400 transition-colors">My Context Files</Link></li>
                                <li><Link href="/dashboard/interviews" className="text-[13px] font-medium text-zinc-600 dark:text-gray-400 hover:text-black dark:hover:text-emerald-400 transition-colors">Training History</Link></li>
                            </ul>
                        </div>

                        {/* Column 3: Support & Legal */}
                        <div className="flex flex-col">
                            <h4 className="text-[14px] font-semibold text-zinc-900 dark:text-white mb-5">Support & Legal</h4>
                            <ul className="space-y-4">
                                <li><Link href="/help" className="text-[13px] font-medium text-zinc-600 dark:text-gray-400 hover:text-black dark:hover:text-emerald-400 transition-colors">Help Center</Link></li>
                                <li><Link href="/suggestion" className="text-[13px] font-medium text-zinc-600 dark:text-gray-400 hover:text-black dark:hover:text-emerald-400 transition-colors">Suggestion</Link></li>
                                <li><Link href="/privacy" className="text-[13px] font-medium text-zinc-600 dark:text-gray-400 hover:text-black dark:hover:text-emerald-400 transition-colors">Privacy Policy</Link></li>
                                <li><Link href="/terms" className="text-[13px] font-medium text-zinc-600 dark:text-gray-400 hover:text-black dark:hover:text-emerald-400 transition-colors">Terms of Service</Link></li>
                            </ul>
                        </div>

                        {/* Column 4: Social */}
                        <div className="flex flex-col">
                            <h4 className="text-[14px] font-semibold text-zinc-900 dark:text-white mb-5">Social</h4>
                            <div className="flex flex-col gap-4 mt-2">
                                <div className="flex items-center gap-5">
                                    <Link href="https://x.com/ZEDX_AI_" target="_blank" className="text-zinc-400 hover:text-black dark:hover:text-emerald-400 transition-colors">
                                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                                            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                                        </svg>
                                    </Link>
                                    <Link href="https://www.linkedin.com/company/zedx-ai" target="_blank" className="text-zinc-400 hover:text-black dark:hover:text-emerald-400 transition-colors">
                                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                                            <path fillRule="evenodd" d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" clipRule="evenodd" />
                                        </svg>
                                    </Link>
                                    <Link href="https://www.youtube.com/@ZEDX-AI" target="_blank" className="text-zinc-400 hover:text-black dark:hover:text-emerald-400 transition-colors">
                                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                                            <path fillRule="evenodd" d="M19.615 3.184c-3.604-.246-11.631-.245-15.23 0-3.897.266-4.356 2.62-4.385 8.816.029 6.185.484 8.549 4.385 8.816 3.6.245 11.626.246 15.23 0 3.897-.266 4.356-2.62 4.385-8.816-.029-6.185-.484-8.549-4.385-8.816zm-10.615 12.816v-8l8 3.993-8 4.007z" clipRule="evenodd" />
                                        </svg>
                                    </Link>
                                    <Link href="https://www.instagram.com/zedx.ai.assistant" target="_blank" className="text-zinc-400 hover:text-black dark:hover:text-emerald-400 transition-colors">
                                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                                            <path fillRule="evenodd" d="M12.315 2c2.43 0 2.784.013 3.808.06 1.064.049 1.791.218 2.427.465a4.902 4.902 0 011.772 1.153 4.902 4.902 0 011.153 1.772c.247.636.416 1.363.465 2.427.048 1.067.06 1.407.06 4.123v.08c0 2.643-.012 2.987-.06 4.043-.049 1.064-.218 1.791-.465 2.427a4.902 4.902 0 01-1.153 1.772 4.902 4.902 0 01-1.772 1.153c-.636.247-1.363.416-2.427.465-1.067.048-1.407.06-4.123.06h-.08c-2.643 0-2.987-.012-4.043-.06-1.064-.049-1.791-.218-2.427-.465a4.902 4.902 0 01-1.772-1.153 4.902 4.902 0 01-1.153-1.772c-.247-.636-.416-1.363-.465-2.427-.047-1.024-.06-1.379-.06-3.808v-.63c0-2.43.013-2.784.06-3.808.049-1.064.218-1.791.465-2.427a4.902 4.902 0 011.153-1.772A4.902 4.902 0 015.45 2.525c.636-.247 1.363-.416 2.427-.465C8.901 2.013 9.256 2 11.685 2h.63zm-.081 1.802h-.468c-2.456 0-2.784.011-3.807.058-.975.045-1.504.207-1.857.344-.467.182-.8.398-1.15.748-.35.35-.566.683-.748 1.15-.137.353-.3.882-.344 1.857-.047 1.023-.058 1.351-.058 3.807v.468c0 2.456.011 2.784.058 3.807.045.975.207 1.504.344 1.857.182.466.399.8.748 1.15.35.35.683.566 1.15.748.353.137.882.3 1.857.344 1.054.048 1.37.058 4.041.058h.08c2.597 0 2.917-.01 3.96-.058.976-.045 1.505-.207 1.858-.344.466-.182.8-.398 1.15-.748.35-.35.566-.683.748-1.15.137-.353.3-.882.344-1.857.048-1.055.058-1.37.058-4.041v-.08c0-2.597-.01-2.917-.058-3.96-.045-.976-.207-1.505-.344-1.858a3.097 3.097 0 00-.748-1.15 3.098 3.098 0 00-1.15-.748c-.353-.137-.882-.3-1.857-.344-1.023-.047-1.351-.058-3.807-.058zM12 6.865a5.135 5.135 0 110 10.27 5.135 5.135 0 010-10.27zm0 1.802a3.333 3.333 0 100 6.666 3.333 3.333 0 000-6.666zm5.338-3.205a1.2 1.2 0 110 2.4 1.2 1.2 0 010-2.4z" clipRule="evenodd" />
                                        </svg>
                                    </Link>
                                </div>
                                <div className="flex items-center gap-5">
                                    <Link href="https://www.tiktok.com/@zedx.ai.interview" target="_blank" className="text-zinc-400 hover:text-black dark:hover:text-emerald-400 transition-colors">
                                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                                            <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-5.2 1.74 2.89 2.89 0 012.31-4.64 2.93 2.93 0 01.88.13V9.4a6.84 6.84 0 00-1-.05A6.33 6.33 0 005 20.1a6.34 6.34 0 0010.86-4.43v-7a8.16 8.16 0 004.77 1.52v-3.4a4.85 4.85 0 01-1.04-.1z" />
                                        </svg>
                                    </Link>
                                    <Link href="https://www.facebook.com/share/1dQDsJktQZ/" target="_blank" className="text-zinc-400 hover:text-black dark:hover:text-emerald-400 transition-colors">
                                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                                            <path fillRule="evenodd" d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z" clipRule="evenodd" />
                                        </svg>
                                    </Link>
                                    <Link href="https://www.producthunt.com/posts/zedx-ai-interviewer" target="_blank" className="text-zinc-400 hover:text-black dark:hover:text-emerald-400 transition-colors">
                                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                                            <path fillRule="evenodd" clipRule="evenodd" d="M12 24c6.627 0 12-5.373 12-12S18.627 0 12 0 0 5.373 0 12s5.373 12 12 12zm1.5-16.5h-4.8v9h1.8v-3.6h3a3.3 3.3 0 000-6.6zm0 4.8h-3v-3h3a1.5 1.5 0 010 3z" />
                                        </svg>
                                    </Link>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </footer>
    );
}
