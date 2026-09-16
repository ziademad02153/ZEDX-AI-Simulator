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
                    <p className="text-gray-500 dark:text-gray-400">Last Updated: August 19, 2026</p>
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
                            <li><strong>Do we process payment information?</strong> We use secure third-party payment processors (like Stripe and Gumroad). We do not store your full credit card details on our servers.</li>
                            <li><strong>Do we collect any information from third parties?</strong> We may collect limited information from Google when you use social login.</li>
                            <li><strong>How do we process your information?</strong> We process your information to provide our AI simulations, manage subscriptions, and ensure security.</li>
                            <li><strong>How do we keep your information safe?</strong> We use enterprise-grade security, including Supabase Row Level Security and HTTPS encryption.</li>
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
                        </ul>
                        <p className="text-gray-600 dark:text-gray-300 mb-4">
                            <strong>Social Media Login Data.</strong> If you register using your Google account, we collect profile information such as your name, email, and avatar.
                        </p>
                    </section>

                    {/* Section 2 */}
                    <section id="section2" className="mb-10">
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">2. How do we process your information?</h2>
                        <ul className="list-disc ml-6 space-y-2 text-gray-600 dark:text-gray-300">
                            <li><strong>To provide AI-powered simulations:</strong> using your Context Files to generate ultra-realistic benchmark questions and feedback.</li>
                            <li><strong>To manage Subscriptions:</strong> ensuring Pro and Ultra tier users receive their allocated premium features.</li>
                            <li><strong>To save your training history:</strong> allowing you to review past performance analytics and track improvement.</li>
                        </ul>
                    </section>

                    {/* Section 3 */}
                    <section id="section3" className="mb-10">
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">3. When and with whom do we share your information?</h2>
                        <ul className="list-disc ml-6 space-y-2 text-gray-600 dark:text-gray-300">
                            <li><strong>AI Service Providers:</strong> Your input (Context Files, interview transcripts) is processed by enterprise AI providers (like Groq/OpenAI) strictly to generate coaching responses.</li>
                            <li><strong>Infrastructure Providers:</strong> We use Supabase for secure database storage and authentication.</li>
                            <li><strong>Payment Processors:</strong> Billing information is shared securely with processors like Stripe or Gumroad.</li>
                        </ul>
                    </section>

                    {/* Section 4 */}
                    <section id="section4" className="mb-10">
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">4. Do we offer AI-based products?</h2>
                        <p className="text-gray-600 dark:text-gray-300 mb-4">
                            Yes. Our core platform revolves around AI Voice-to-Voice simulation. Your voice is transcribed locally or securely server-side, and the text is processed by AI to generate real-time feedback. Our AI does not use your personal data to train public models.
                        </p>
                    </section>

                    {/* Section 5 */}
                    <section id="section5" className="mb-10">
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">5. How do we handle payments?</h2>
                        <p className="text-gray-600 dark:text-gray-300 mb-4">
                            For users upgrading to Pro or Ultra tiers, we use third-party payment processors (Stripe, Gumroad, Instapay). We do not store your raw credit card numbers. Your billing data is handled entirely by these compliant providers according to their strict privacy standards.
                        </p>
                    </section>

                    {/* Section 6 */}
                    <section id="section6" className="mb-10">
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">6. How long do we keep your information?</h2>
                        <p className="text-gray-600 dark:text-gray-300 mb-4">
                            We store your interview history and Context Files as long as your account is active. You may delete individual Context Files or your entire account at any time through the Dashboard, which will permanently wipe your data from our active servers within 30 days.
                        </p>
                    </section>

                    {/* Section 7 */}
                    <section id="section7" className="mb-10">
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">7. What are your privacy rights?</h2>
                        <p className="text-gray-600 dark:text-gray-300 mb-4">
                            You have the right to request access, rectification, or erasure of your personal data. You can manage and delete your data directly in your Account Settings. For further assistance, contact us at <a href="mailto:zedx.ai.support@gmail.com" className="text-emerald-600 hover:underline">zedx.ai.support@gmail.com</a>.
                        </p>
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
