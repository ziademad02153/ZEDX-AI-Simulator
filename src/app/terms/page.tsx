import Link from "next/link";

export default function TermsOfServicePage() {
    return (
        <div className="min-h-screen bg-gray-50 dark:bg-zinc-900 py-12 px-4">
            <div className="max-w-3xl mx-auto bg-white dark:bg-zinc-800 rounded-2xl shadow-sm p-8">
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">Terms of Service</h1>
                <p className="text-gray-500 text-sm mb-8">Last updated: August 19, 2026</p>

                <div className="space-y-6 text-gray-700 dark:text-gray-300">
                    <section>
                        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">1. Acceptance of Terms</h2>
                        <p>By accessing and using the ZEDX AI Platform, you accept and agree to be bound by the terms and conditions of this agreement.</p>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">2. Description of Service</h2>
                        <p>ZEDX AI is a premium AI-powered interview preparation platform that provides:</p>
                        <ul className="list-disc ml-6 mt-2 space-y-1">
                            <li>Real-time Voice-to-Voice interview simulation</li>
                            <li>Context File processing (Resumes, Job Descriptions)</li>
                            <li>Deep Performance Analytics and transcript storage</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">3. Subscriptions & Payments</h2>
                        <p>We offer premium subscription tiers (Pro and Ultra). By subscribing, you agree to:</p>
                        <ul className="list-disc ml-6 mt-2 space-y-1">
                            <li>Provide valid billing information via our secure processors (Stripe/Gumroad).</li>
                            <li>Acknowledge that subscriptions are billed automatically unless canceled before the renewal date.</li>
                            <li>Adhere to the usage limits specified by your selected tier.</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">4. User Responsibilities</h2>
                        <p>You agree to:</p>
                        <ul className="list-disc ml-6 mt-2 space-y-1">
                            <li>Provide accurate information during registration</li>
                            <li>Use the service strictly for legitimate interview preparation</li>
                            <li>Not abuse the AI capabilities</li>
                            <li>Keep your account credentials and context files secure</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">5. AI Service & Context</h2>
                        <p>ZEDX AI uses enterprise-grade server-side AI processing. While we strive for absolute realism, you acknowledge that AI-generated responses are simulated and should be used strictly for practice and benchmark learning.</p>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">6. Limitation of Liability</h2>
                        <p>ZEDX AI Simulator is provided &quot;as is&quot; without warranties of any kind. We are not responsible for:</p>
                        <ul className="list-disc ml-6 mt-2 space-y-1">
                            <li>Interview outcomes or job offers</li>
                            <li>Absolute accuracy of AI-generated responses</li>
                            <li>Third-party API service interruptions</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">7. Termination</h2>
                        <p>We reserve the right to terminate or suspend access to our service, including active subscriptions without refund, for conduct that we believe violates these Terms of Service.</p>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">8. Changes to Terms</h2>
                        <p>We may modify these terms at any time. Continued use of the platform after changes constitutes acceptance of the modified terms.</p>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">9. Contact</h2>
                        <p>For questions about these Terms, contact us at: <a href="mailto:zedx.ai.support@gmail.com" className="text-emerald-600 hover:underline">zedx.ai.support@gmail.com</a></p>
                    </section>
                </div>

                <div className="mt-8 pt-6 border-t">
                    <Link href="/" className="text-teal-600 hover:text-teal-700">
                        ← Back to Home
                    </Link>
                </div>
            </div>
        </div>
    );
}
