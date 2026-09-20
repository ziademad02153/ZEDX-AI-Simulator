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
        <footer className="bg-[#09090b] pt-12 pb-8">
            <div className="relative z-10 max-w-7xl mx-auto px-6 lg:px-8">
                {/* Top Section */}
                <div className="grid grid-cols-2 lg:grid-cols-5 gap-8 lg:gap-12 items-start">

                    {/* Brand Column */}
                    <div className="col-span-2 lg:col-span-2 flex flex-col gap-4">
                        <Link href="/" className="inline-block">
                            <Image
                                src="/zedx-logo.png"
                                alt="ZEDX AI Logo"
                                width={144}
                                height={48}
                                className="object-contain"
                            />
                        </Link>
                        <p className="text-[13px] text-gray-500 leading-relaxed max-w-xs">
                            Master Your Next Interview Before It Happens.
                        </p>

                        {/* Social Icons */}
                        <div className="mt-6 flex items-center gap-5">
                            {/* Instagram */}
                            <a href="https://www.instagram.com/zedx.ai.assistant" target="_blank" rel="noopener noreferrer" className="text-gray-500 hover:text-emerald-400 transition-colors duration-300" aria-label="Instagram">
                                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
                                </svg>
                            </a>
                            {/* TikTok */}
                            <a href="https://www.tiktok.com/@zedx.ai.interview?_r=1&_t=ZS-99tEyN5cXsz" target="_blank" rel="noopener noreferrer" className="text-gray-500 hover:text-emerald-400 transition-colors duration-300" aria-label="TikTok">
                                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93v7.2c0 1.63-.4 3.32-1.35 4.67-1.39 1.96-3.77 3.05-6.19 2.87-2.12-.15-4.14-1.28-5.32-3.03-1.09-1.63-1.44-3.73-.91-5.6.5-1.74 1.71-3.23 3.31-4.04 1.58-.8 3.44-1.04 5.16-.62v4.06c-1.38-.52-3.02-.38-4.06.67-.71.72-.94 1.8-.75 2.8.23 1.25 1.22 2.3 2.45 2.53 1.23.23 2.57-.03 3.49-.83.84-.73 1.22-1.87 1.15-2.98V.02z" />
                                </svg>
                            </a>
                            {/* Facebook */}
                            <a href="https://www.facebook.com/share/1dQDsJktQZ/" target="_blank" rel="noopener noreferrer" className="text-gray-500 hover:text-emerald-400 transition-colors duration-300" aria-label="Facebook">
                                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.469h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.469h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                                </svg>
                            </a>
                            {/* YouTube */}
                            <a href="https://www.youtube.com/@ZEDX-AI" target="_blank" rel="noopener noreferrer" className="text-gray-500 hover:text-emerald-400 transition-colors duration-300" aria-label="YouTube">
                                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.5 12 3.5 12 3.5s-7.505 0-9.377.55a3.016 3.016 0 0 0-2.122 2.136C0 8.07 0 12 0 12s0 3.93.498 5.814a3.016 3.016 0 0 0 2.122 2.136C4.495 20.5 12 20.5 12 20.5s7.505 0 9.377-.55a3.016 3.016 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
                                </svg>
                            </a>
                            {/* LinkedIn */}
                            <a href="https://www.linkedin.com/company/zedx-ai" target="_blank" rel="noopener noreferrer" className="text-gray-500 hover:text-emerald-400 transition-colors duration-300" aria-label="LinkedIn">
                                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                                </svg>
                            </a>
                            {/* X (Twitter) */}
                            <a href="https://x.com/ZEDX_AI_" target="_blank" rel="noopener noreferrer" className="text-gray-500 hover:text-emerald-400 transition-colors duration-300" aria-label="X">
                                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                                </svg>
                            </a>
                            {/* Product Hunt */}
                            <a href="https://www.producthunt.com/posts/zedx-ai" target="_blank" rel="noopener noreferrer" className="text-gray-500 hover:text-emerald-400 transition-colors duration-300" aria-label="Product Hunt">
                                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M13.604 8.4h-3.405V12h3.405c.995 0 1.801-.806 1.801-1.801 0-.993-.805-1.799-1.801-1.799zM12 0C5.372 0 0 5.372 0 12s5.372 12 12 12 12-5.372 12-12S18.628 0 12 0zm1.604 14.4h-3.405V18H7.801V6h5.804c2.319 0 4.2 1.88 4.2 4.199 0 2.321-1.881 4.201-4.201 4.201z" />
                                </svg>
                            </a>
                        </div>
                    </div>

                    {/* Column 1: Platform */}
                    <div className="col-span-1">
                        <h4 className="text-[15px] font-semibold text-white mb-5">Platform</h4>
                        <ul className="space-y-4">
                            <li><Link href="/about" className="text-[13px] font-medium text-gray-500 hover:text-emerald-400 transition-colors duration-300 ease-in-out">About ZEDX</Link></li>
                            <li><Link href="/how-it-works" className="text-[13px] font-medium text-gray-500 hover:text-emerald-400 transition-colors duration-300 ease-in-out">How it Works</Link></li>
                            <li><Link href="/pricing" className="text-[13px] font-medium text-gray-500 hover:text-emerald-400 transition-colors duration-300 ease-in-out">Pricing</Link></li>
                            <li><Link href="/desktop-app" className="text-[13px] font-medium text-gray-500 hover:text-emerald-400 transition-colors duration-300 ease-in-out">Desktop App</Link></li>
                        </ul>
                    </div>

                    {/* Column 2: Workspace */}
                    <div className="col-span-1">
                        <h4 className="text-[15px] font-semibold text-white mb-5">Workspace</h4>
                        <ul className="space-y-4">
                            <li><Link href="/dashboard" className="text-[13px] font-medium text-gray-500 hover:text-emerald-400 transition-colors duration-300 ease-in-out">Dashboard</Link></li>
                            <li><Link href="/simulation" className="text-[13px] font-medium text-gray-500 hover:text-emerald-400 transition-colors duration-300 ease-in-out">New Simulation</Link></li>
                            <li><Link href="/dashboard/context-files" className="text-[13px] font-medium text-gray-500 hover:text-emerald-400 transition-colors duration-300 ease-in-out">My Context Files</Link></li>
                            <li><Link href="/dashboard/interviews" className="text-[13px] font-medium text-gray-500 hover:text-emerald-400 transition-colors duration-300 ease-in-out">Training History</Link></li>
                        </ul>
                    </div>

                    {/* Column 3: Support & Legal */}
                    <div className="col-span-1">
                        <h4 className="text-[15px] font-semibold text-white mb-5">Support & Legal</h4>
                        <ul className="space-y-4">
                            <li><Link href="/help" className="text-[13px] font-medium text-gray-500 hover:text-emerald-400 transition-colors duration-300 ease-in-out">Help Center</Link></li>
                            <li><Link href="/suggestion" className="text-[13px] font-medium text-gray-500 hover:text-emerald-400 transition-colors duration-300 ease-in-out">Suggestion</Link></li>
                            <li><Link href="/privacy" className="text-[13px] font-medium text-gray-500 hover:text-emerald-400 transition-colors duration-300 ease-in-out">Privacy Policy</Link></li>
                            <li><Link href="/terms" className="text-[13px] font-medium text-gray-500 hover:text-emerald-400 transition-colors duration-300 ease-in-out">Terms of Service</Link></li>
                        </ul>
                    </div>

                </div>

                {/* Bottom Bar */}
                <div className="mt-16 pt-8 border-t border-white/10 flex flex-col md:flex-row justify-between items-center gap-4">
                    <p className="text-sm text-gray-500">
                        © 2026 ZEDX AI. All rights reserved.
                    </p>
                    <div className="flex items-center gap-2 text-gray-500 text-xs tracking-widest uppercase">
                        <LockIcon className="w-4 h-4" />
                        <span>100% Secure Payments</span>
                    </div>
                </div>
            </div>
        </footer>
    );
}
