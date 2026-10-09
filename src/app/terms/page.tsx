import Link from "next/link";
import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Terms of Service | ZEDX AI Simulator',
    description: 'Terms for ZEDX interview practice, subscriptions, payments, and AI-generated feedback.',
};

export default function TermsOfServicePage() {
    return (
        <div className="min-h-screen bg-gray-50 dark:bg-zinc-900 py-12 px-4">
            <div className="max-w-3xl mx-auto bg-white dark:bg-zinc-800 rounded-2xl shadow-sm p-8">
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">Terms of Service</h1>
                <p className="text-gray-500 text-sm mb-8">Last updated: October 9, 2026</p>

                <div className="space-y-6 text-gray-700 dark:text-gray-300">
                    <section>
                        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">1. Acceptance of Terms</h2>
                        <p>These Terms govern your use of the ZEDX AI website and interview-practice services. By using the service, you agree to these Terms. If you do not agree, do not use the service. Our <Link href="/privacy" className="text-emerald-600 hover:underline">Privacy Policy</Link> explains how personal information is processed.</p>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">2. Description of Service</h2>
                        <p>ZEDX AI provides free and paid interview-practice features, including:</p>
                        <ul className="list-disc ml-6 mt-2 space-y-1">
                            <li>Real-time Voice-to-Voice interview simulation</li>
                            <li>Context File processing (Resumes, Job Descriptions)</li>
                            <li>AI-generated performance feedback, saved interview history, and reports</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">3. Subscriptions & Payments</h2>
                        <p>We offer Pro and Ultra paid tiers. Check the pricing page and checkout for the features, currency, price, and access period before purchasing. The current standard access periods are one month for Pro and three months for Ultra.</p>
                        <ul className="list-disc ml-6 mt-2 space-y-1">
                            <li>Gumroad purchases are handled through its checkout. Any recurring billing must be stated at checkout; use the provider&apos;s subscription controls if your purchase is recurring.</li>
                            <li>InstaPay payments are manual transfers and are not automatically charged by ZEDX. Access is activated after the payment is verified. Use the correct account email and transaction reference, and contact support if activation fails.</li>
                            <li>Paid access lasts for the purchased period unless another arrangement is expressly provided. Buying access does not guarantee a job offer or a particular interview score.</li>
                            <li>Use the service within the limits and features of your tier. Prices or terms for future purchases may change; a price change does not itself authorize an additional charge.</li>
                        </ul>
                        <h3 className="text-lg font-semibold mt-4 mb-2">Refunds and payment issues</h3>
                        <p>Email <a href="mailto:zedx.ai.support@gmail.com" className="text-emerald-600 hover:underline">zedx.ai.support@gmail.com</a> with your account email and purchase or transaction reference to request a refund. Do not send payment passwords, card numbers, or security codes.</p>
                        <ul className="list-disc ml-6 mt-2 space-y-1">
                            <li><strong>First purchase:</strong> you may request a full refund within 7 days of your first paid purchase if you have not used the paid interview features. This does not limit any withdrawal or refund rights required by applicable law.</li>
                            <li><strong>Duplicate or incorrect payments:</strong> verified duplicate payments or charges for access not purchased are eligible for correction or refund, independently of the unused-first-purchase offer.</li>
                            <li><strong>Activation or service failure:</strong> report a failure during your paid access period. We first investigate and try to restore access. If we cannot provide the purchased service, we refund the undelivered access, including a full refund where no paid service was delivered.</li>
                            <li><strong>Change of mind after use:</strong> outside the unused-first-purchase offer, a refund is not automatically granted solely because you changed your mind or disagree with a practice score. Applicable consumer rights and service-failure remedies still apply.</li>
                            <li><strong>Processing:</strong> we aim to review requests and initiate approved refunds within 5 business days after payment and eligibility are verified. The time for funds to arrive depends on the payment provider. Gumroad purchases also follow its refund process and any more favorable terms shown at checkout.</li>
                        </ul>
                        <p className="mt-2">Canceling a recurring payment does not by itself refund a previous charge. A refund or reversed payment may end the access granted by that payment. This policy applies to new purchases after its publication and does not remove rights or more favorable terms attached to earlier purchases.</p>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">4. User Responsibilities</h2>
                        <p>You agree to:</p>
                        <ul className="list-disc ml-6 mt-2 space-y-1">
                            <li>Provide accurate information during registration</li>
                            <li>Use the service strictly for legitimate interview preparation</li>
                            <li>Not abuse the AI capabilities</li>
                            <li>Keep your account credentials and context files secure</li>
                            <li>Upload only information you are entitled to share, and avoid unnecessary sensitive or confidential information</li>
                            <li>Not attempt unauthorized access, bypass subscription limits, disrupt the service, or submit unlawful content</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">5. AI Service & Context</h2>
                        <p>Questions and reports are generated with AI and can contain mistakes. Scores are practice feedback based on the available answers and interview context, not a verified measure of professional ability, a hiring decision, or a professional qualification. Transcription errors and incomplete answers can affect the assessment. Review the explanations and examples alongside the score; do not rely on output as medical, legal, financial, or other professional advice.</p>
                        <p className="mt-2">You retain your rights in content you submit. You permit ZEDX and the service providers described in the Privacy Policy to process that content as needed to provide interview practice, saved history, reports, and support. Do not submit third-party confidential information without permission.</p>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">6. Limitation of Liability</h2>
                        <p>We work to maintain the service, but cannot guarantee uninterrupted availability or error-free AI output. Availability may depend on your device, browser, internet connection, maintenance, and third-party providers. To the extent permitted by applicable law, the service is provided &quot;as is&quot; and we do not guarantee:</p>
                        <ul className="list-disc ml-6 mt-2 space-y-1">
                            <li>Interview outcomes or job offers</li>
                            <li>Complete accuracy or consistency of AI-generated responses and scores</li>
                            <li>Uninterrupted operation of third-party services</li>
                        </ul>
                        <p className="mt-2">Nothing in these Terms excludes rights, remedies, or liability that cannot lawfully be excluded. Report service or payment problems to support so we can investigate them.</p>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">7. Termination</h2>
                        <p>We may restrict or suspend access to investigate misuse, security risks, unlawful conduct, or breaches of these Terms. Contact support if you believe a restriction was made in error. Any treatment of remaining paid access or refund requests is subject to applicable law and the circumstances of the restriction; suspension does not remove consumer rights. To request account closure or deletion of personal data, follow the contact process in our Privacy Policy.</p>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">8. Changes to Terms</h2>
                        <p>We may update these Terms as the service changes and will show the revision date on this page. Review the updated terms before continuing to use the service. Where applicable law requires notice or consent for a change, that requirement still applies. Changes do not authorize undisclosed charges or remove rights relating to previous purchases.</p>
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
