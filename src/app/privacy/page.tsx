import Link from "next/link";
import { Metadata } from "next";

export const metadata: Metadata = {
    title: "Privacy Policy | ZEDX AI Simulator",
    description: "Privacy Policy for ZEDX AI Interview Simulator. Learn how we collect, use, and protect your personal information.",
};

export default function PrivacyPolicyPage() {
    return (
        <div className="min-h-screen bg-white dark:bg-zinc-950 py-24 px-4">
            <div className="max-w-4xl mx-auto">
                <div className="mb-12">
                    <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">Privacy Policy</h1>
                    <p className="text-gray-500 dark:text-gray-400">Last Updated: October 9, 2026</p>
                </div>

                <div className="prose prose-gray dark:prose-invert max-w-none">
                    {/* Introduction */}
                    <section className="mb-10">
                        <p className="text-lg text-gray-600 dark:text-gray-300 leading-relaxed">
                            This Privacy Notice for ZEDX AI (&quot;we,&quot; &quot;us,&quot; or &quot;our&quot;), describes how and why we might access, collect, store, use, and/or share (&quot;process&quot;) your personal information when you use our services (&quot;Services&quot;), including when you:
                        </p>
                        <ul className="list-disc ml-6 mt-4 space-y-2 text-gray-600 dark:text-gray-300">
                            <li>Visit our website</li>
                            <li>Use our AI-powered interview simulation, context file analysis, and coaching platform</li>
                            <li>Subscribe to our Pro or Ultra premium tiers</li>
                            <li>Engage with us in other related ways, including any sales, marketing, or events</li>
                        </ul>
                        <p className="mt-4 text-gray-600 dark:text-gray-300">
                            <strong>Questions or concerns?</strong> Reading this Privacy Notice will help you understand your privacy rights and choices. If you do not agree with our policies and practices, please do not use our Services. If you still have any questions or concerns, please contact us at <a href="mailto:zedx.ai.support@gmail.com" className="text-emerald-600 hover:underline">zedx.ai.support@gmail.com</a>.
                        </p>
                    </section>

                    {/* Summary */}
                    <section className="mb-10 p-6 bg-gray-50 dark:bg-zinc-900 rounded-2xl">
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Summary of Key Points</h2>
                        <ul className="space-y-3 text-gray-600 dark:text-gray-300">
                            <li><strong>What personal information do we process?</strong> We process personal information depending on how you interact with us, including your profile data, uploaded context files, and interview audio transcripts.</li>
                            <li><strong>Do we process payment information?</strong> Purchases use Gumroad or InstaPay. We store subscription and payment-verification records, but do not collect your full card number or payment-account password.</li>
                            <li><strong>Do we collect any information from third parties?</strong> We may collect limited information from Google when you use social login.</li>
                            <li><strong>How do we process your information?</strong> We process your information to provide our AI simulations, manage subscriptions, and ensure security.</li>
                            <li><strong>How do we keep your information safe?</strong> We use access controls, including Supabase Row Level Security, and HTTPS. No system can guarantee absolute security.</li>
                        </ul>
                    </section>

                    {/* Table of Contents */}
                    <section className="mb-10">
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Table of Contents</h2>
                        <ol className="list-decimal ml-6 space-y-2 text-emerald-600 dark:text-emerald-400">
                            <li><a href="#section1" className="hover:underline">What information do we collect?</a></li>
                            <li><a href="#section2" className="hover:underline">How do we process your information?</a></li>
                            <li><a href="#section3" className="hover:underline">When and with whom do we share your information?</a></li>
                            <li><a href="#section4" className="hover:underline">Do we offer AI-based products?</a></li>
                            <li><a href="#section5" className="hover:underline">How do we handle payments?</a></li>
                            <li><a href="#section6" className="hover:underline">How long do we keep your information?</a></li>
                            <li><a href="#section7" className="hover:underline">What are your privacy rights?</a></li>
                            <li><a href="#section8" className="hover:underline">Cookies, browser storage, and analytics</a></li>
                            <li><a href="#section9" className="hover:underline">Security, international processing, and updates</a></li>
                        </ol>
                    </section>

                    {/* Section 1 */}
                    <section id="section1" className="mb-10">
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">1. What information do we collect?</h2>
                        <p className="text-gray-600 dark:text-gray-300 mb-2"><strong>Personal Information Provided by You:</strong></p>
                        <ul className="list-disc ml-6 space-y-1 text-gray-600 dark:text-gray-300 mb-4">
                            <li>Names and Email addresses</li>
                            <li>Context Files (Resumes, Cover Letters, Job Descriptions)</li>
                            <li>Voice audio during mock interviews (transcribed in real-time)</li>
                            <li>Interview transcripts, performance analytics, and AI responses</li>
                            <li>Subscription status, purchase identifiers, payment amounts, transaction references, and payment-verification correspondence</li>
                            <li>Support messages and technical usage information, such as page visits, browser information, and service errors</li>
                        </ul>
                        <p className="text-gray-600 dark:text-gray-300 mb-4">
                            <strong>Social Media Login Data.</strong> If you register using your Google account, we collect profile information such as your name, email, and avatar.
                        </p>
                        <p className="text-gray-600 dark:text-gray-300 mb-4">Microphone and camera access requires your browser permission. The microphone supports spoken answers; if you enable the camera, the interview screen uses it to display a preview. You can revoke these permissions in your browser settings.</p>
                    </section>

                    {/* Section 2 */}
                    <section id="section2" className="mb-10">
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">2. How do we process your information?</h2>
                        <ul className="list-disc ml-6 space-y-2 text-gray-600 dark:text-gray-300">
                            <li><strong>To provide interview practice:</strong> using your Context Files and answers to generate relevant questions and feedback.</li>
                            <li><strong>To manage Subscriptions:</strong> ensuring Pro and Ultra tier users receive their allocated premium features.</li>
                            <li><strong>To save your training history:</strong> allowing you to review past performance analytics and track improvement.</li>
                            <li><strong>To support and maintain the service:</strong> answering requests, investigating errors, verifying payments, and preventing abuse.</li>
                        </ul>
                    </section>

                    {/* Section 3 */}
                    <section id="section3" className="mb-10">
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">3. When and with whom do we share your information?</h2>
                        <ul className="list-disc ml-6 space-y-2 text-gray-600 dark:text-gray-300">
                            <li><strong>Groq:</strong> receives interview audio for transcription and relevant text, including Context Files and interview answers, for question generation and evaluation. See <a href="https://console.groq.com/docs/your-data" className="text-emerald-600 hover:underline">Groq&apos;s data documentation</a>.</li>
                            <li><strong>ElevenLabs:</strong> receives question text when generating Arabic speech. That text may contain information from your interview context. See <a href="https://elevenlabs.io/privacy-policy" className="text-emerald-600 hover:underline">ElevenLabs&apos; Privacy Policy</a>.</li>
                            <li><strong>Infrastructure providers:</strong> Supabase provides authentication and database storage; Vercel hosts the website and server requests. These services process account data, saved content, and technical request information as needed for their roles.</li>
                            <li><strong>Payments:</strong> Gumroad processes purchases made through its checkout. For InstaPay transfers, we receive the transaction reference and related verification information you submit.</li>
                            <li><strong>Optional analytics:</strong> optional PostHog analytics is currently disabled. Earlier versions may have collected usage events and technical information; contact support to request access to or deletion of those records.</li>
                            <li><strong>Support and legal requests:</strong> messages and payment-verification information may be processed through our email service. We may disclose information when required by applicable law or to investigate misuse and protect the service.</li>
                        </ul>
                    </section>

                    {/* Section 4 */}
                    <section id="section4" className="mb-10">
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">4. Do we offer AI-based products?</h2>
                        <p className="text-gray-600 dark:text-gray-300 mb-4">
                            Yes. Interview audio is sent for transcription, and relevant text is sent to AI services to generate questions and reports. AI output may contain mistakes. Avoid uploading unnecessary sensitive information or confidential information you are not permitted to share.
                        </p>
                        <p className="text-gray-600 dark:text-gray-300 mb-4">English speech using Amy is generated in your browser after voice files are downloaded. Other browser speech voices may depend on your browser or operating system and its providers. Local speech generation does not mean that interview text or transcription is processed entirely offline.</p>
                        <p className="text-gray-600 dark:text-gray-300 mb-4">External providers have their own retention and data-use rules, which may vary by service and account configuration. The linked provider policies explain these rules. Contact support if you need clarification before submitting confidential material.</p>
                    </section>

                    {/* Section 5 */}
                    <section id="section5" className="mb-10">
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">5. How do we handle payments?</h2>
                        <p className="text-gray-600 dark:text-gray-300 mb-4">
                            Gumroad handles card and billing details entered at its checkout under its own policies. InstaPay transfers are made through your payment provider. ZEDX stores records needed to verify payment and manage access, including your account identifier, transaction reference, purchased tier, amount, and approval status. Payment notifications may include your account email and transaction reference. Do not send us card numbers, PINs, passwords, or one-time security codes.
                        </p>
                    </section>

                    {/* Section 6 */}
                    <section id="section6" className="mb-10">
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">6. How long do we keep your information?</h2>
                        <p className="text-gray-600 dark:text-gray-300 mb-4">
                            Saved interview history, reports, and Context Files remain associated with your account so you can use and review them. You can delete individual saved Context Files and interviews using the controls available in your workspace. To request deletion of your account or other personal data, email zedx.ai.support@gmail.com from your account email. We may need to verify your identity before processing a request.
                        </p>
                        <p className="text-gray-600 dark:text-gray-300 mb-4">Deletion requests are reviewed according to their scope and applicable requirements. Payment, security, and support records may need to be retained for applicable obligations, resolving disputes, or preventing fraud. Deletion from active records does not necessarily immediately remove backup copies, third-party records, or copies stored in your browser.</p>
                        <ul className="list-disc ml-6 space-y-2 text-gray-600 dark:text-gray-300 mb-4">
                            <li><strong>Account and practice content:</strong> retained while your account remains open and the content has not been deleted. Account-closure requests are handled by support. We aim to complete verified deletion requests within 30 days; if a legal obligation or a complex request affects timing, we explain the reason.</li>
                            <li><strong>Routine support correspondence:</strong> normally retained for up to 12 months after the issue is closed, unless an unresolved dispute, security issue, or applicable obligation requires longer retention.</li>
                            <li><strong>Payment records:</strong> retain only the records needed for accounting obligations, payment verification, refunds, and disputes. The required period depends on applicable obligations; practice transcripts are not retained merely to preserve payment evidence.</li>
                            <li><strong>Backups and providers:</strong> residual copies may remain until the relevant backup or provider retention cycle expires. Deleted content must not be restored to routine use. Contact support about provider-held records.</li>
                            <li><strong>Browser copies:</strong> remain on your device until cleared by you or removed by the browser. Server-side deletion does not clear your browser storage.</li>
                        </ul>
                    </section>

                    {/* Section 7 */}
                    <section id="section7" className="mb-10">
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">7. What are your privacy rights?</h2>
                        <p className="text-gray-600 dark:text-gray-300 mb-4">
                            Depending on applicable law, you may have rights to access, correct, delete, or obtain a copy of your personal data, and to object to or restrict certain processing. Use available workspace controls or contact <a href="mailto:zedx.ai.support@gmail.com" className="text-emerald-600 hover:underline">zedx.ai.support@gmail.com</a> to make a request. You may also have the right to complain to your local data-protection authority. We may verify your identity and explain any information we need to retain.
                        </p>
                    </section>
                    <section id="section8" className="mb-10">
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">8. Cookies, browser storage, and analytics</h2>
                        <p className="text-gray-600 dark:text-gray-300 mb-4">We use cookies and browser storage to maintain sign-in sessions and interview settings. Your browser may also store interview context, recent results, and downloaded voice files. These copies are separate from saved server records; you can clear them through your browser settings, which may sign you out or require voice files to be downloaded again.</p>
                        <p className="text-gray-600 dark:text-gray-300 mb-4">Optional PostHog analytics is currently disabled. Essential sign-in and service storage still operates. Disabling analytics does not disable the requests needed to provide interviews, account access, payments, and support.</p>
                    </section>
                    <section id="section9" className="mb-10">
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">9. Security, international processing, and updates</h2>
                        <p className="text-gray-600 dark:text-gray-300 mb-4">We use authentication, access controls, and encrypted connections to protect information. Keep your sign-in credentials private and avoid using a shared browser for confidential interview context. Hosting and service providers may process information outside your country; provider policies describe their locations and safeguards.</p>
                        <p className="text-gray-600 dark:text-gray-300 mb-4">We may update this notice as the service changes. The date above identifies the latest revision. Contact our support email for questions about this notice or changes affecting your data.</p>
                    </section>
                </div>

                <div className="mt-12 pt-8 border-t border-gray-200 dark:border-zinc-800">
                    <Link href="/" className="text-emerald-600 hover:text-emerald-700 font-medium">
                        ← Back to Home
                    </Link>
                </div>
            </div>
        </div>
    );
}
