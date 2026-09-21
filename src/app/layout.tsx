import type { Metadata } from "next";
import { headers } from "next/headers";
import { Inter } from "next/font/google";
import "./globals.css";
import ErrorBoundary from "@/components/error-boundary";
import { ConfirmDialogProvider } from "@/components/confirm-dialog";
import { DesktopNavBar } from "@/components/desktop-nav";
import { Toaster } from "sonner";
import { PostHogProvider } from "@/components/posthog-provider";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://zedx-ai.tech"),
  applicationName: "ZEDX",
  appleWebApp: {
    title: "ZEDX AI Interview Simulator",
    statusBarStyle: "default",
    capable: true,
  },
  title: {
    default: "ZEDX – AI Interview Simulator",
    template: "%s | ZEDX"
  },
  icons: {
    icon: [
      { url: '/favicon.ico?v=3', sizes: 'any' },
      { url: '/icon.jpg?v=3', type: 'image/jpeg' },
    ],
    apple: [
      { url: '/apple-touch-icon.png?v=3', sizes: '180x180', type: 'image/png' },
    ],
  },
  description: "ZEDX AI Interview Simulator is a real-time AI coach that dynamically adapts to your CV and Job Description. Master your next interview in any profession: Software Engineering, Medicine, Sales, Finance, HR, and more.",
  keywords: [
    "ZEDX", "ZEDX AI", "ZEDX AI Simulator", "Mock Interview Coach", "Real-Time Transcription",
    "Interview Simulation", "Software Engineer Interview Simulator", "Medical Mock Interview", "Sales Interview Coach",
    "Accounting AI Interview", "HR Interview Prep", "Job Seeker Coach", "Universal Interview Prep",
    "interview simulator", "real-time transcription", "interview training", "artificial intelligence", "personal coach",
    "زياد عماد", "Ziad Emad", "محاكي انترفيو", "انترفيو مهندسين", "انترفيو دكاترة", "انترفيو مبيعات",
    "AI Interviewer", "AI Mock Interviewer", "Best AI Interview Prep", "ZEDX Interview"
  ],
  authors: [{ name: "ZEDX AI Team", url: "https://zedx-ai.tech" }],
  creator: "ZEDX AI",
  publisher: "ZEDX AI",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    alternateLocale: ["en_GB", "en_AU", "ar_EG", "ar_SA", "ar_AE", "de_DE"],
    url: "https://zedx-ai.tech",
    siteName: "ZEDX AI Interview Simulator",
    title: "ZEDX AI Interview Simulator",
    description: "Your real-time interview simulation and training coach.",
    images: [
      {
        url: "/backgr.png",
        width: 1200,
        height: 630,
        alt: "ZEDX AI Interview Simulator",
      },
      {
        url: "/zedx-logo.png",
        width: 512,
        height: 512,
        alt: "ZEDX AI Simulator Logo",
      }
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "ZEDX AI Interview Simulator",
    description: "Real-time AI interview simulation and verification insights.",
    images: ["/backgr.png"],
    creator: "@zedx_ai",
  },
  verification: {
    google: "googleac3039da11f6677e",
  },
  category: "Technology",
  manifest: "/site.webmanifest",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const headersList = await headers();
  const xUrl = headersList.get("x-url") || "";

  // Robust detection: check for headers or URL patterns (fallback for dev mode issues)
  const isScanner = headersList.get("x-is-scanner") === "true" || xUrl.toLowerCase().includes("scanner-frame");
  const isOverlay = xUrl.toLowerCase().includes("isoverlay=true") || xUrl.toLowerCase().includes("overlay");
  const isHideNav = isScanner || isOverlay;

  return (
    <html lang="en" suppressHydrationWarning className={isScanner ? "bg-transparent" : ""}>
      <head>
        <meta name="name" content="ZEDX AI Interview Simulator" />
        <meta name="author" content="Ziad Emad" />
        <meta property="og:site_name" content="ZEDX AI Interview Simulator" />
        <meta name="apple-mobile-web-app-title" content="ZEDX AI Interview Simulator" />
        <meta name="msvalidate.01" content="410978477B68DFFC4D1109011EAF121F" />
        <script
          key="theme-script"
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var theme = localStorage.getItem("theme");
                  if (theme === "dark" || (!theme && window.matchMedia("(prefers-color-scheme: dark)").matches)) {
                    document.documentElement.classList.add("dark");
                  } else {
                    document.documentElement.classList.remove("dark");
                  }
                } catch (e) {}
              })();
            `,
          }}
        />
        {/* JSON-LD Structured Data for SEO - Site Identity */}
        <script
          key="schema-site-identity"
          type="application/ld+json"
          suppressHydrationWarning
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebSite",
              "name": "ZEDX AI Interview Simulator",
              "alternateName": ["ZEDX", "ZEDX AI Simulator", "ZedX AI Coach", "زيدكس", "زيدكس AI"],
              "url": "https://zedx-ai.tech",
              "logo": "https://zedx-ai.tech/zedx-logo.png",
              "image": "https://zedx-ai.tech/zedx-logo.png",
              "potentialAction": {
                "@type": "SearchAction",
                "target": "https://zedx-ai.tech/dashboard?q={search_term_string}",
                "query-input": "required name=search_term_string"
              }
            })
          }}
        />
        {/* Organization Schema for Logo recognition */}
        <script
          key="schema-org-logo"
          type="application/ld+json"
          suppressHydrationWarning
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "Organization",
              "name": "ZEDX AI Interview Simulator",
              "url": "https://zedx-ai.tech",
              "logo": "https://zedx-ai.tech/zedx-logo.png",
              "sameAs": [
                "https://github.com/ziademad02153/ZEDX-AI-Assistant"
              ]
            })
          }}
        />
        <script
          key="schema-webapp"
          type="application/ld+json"
          suppressHydrationWarning
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebApplication",
              "name": "ZEDX AI Interview Simulator",
              "alternateName": ["ZEDX AI Simulator", "ZEDX", "زيدكس", "زيدكس AI"],
              "url": "https://zedx-ai.tech",
              "description": "ZEDX AI Interview Simulator is a real-time AI interview simulation coach providing real-time transcriptions and answer verification.",
              "applicationCategory": "BusinessApplication",
              "operatingSystem": "Web Browser",
              "offers": {
                "@type": "Offer",
                "price": "0",
                "priceCurrency": "USD"
              },
              "aggregateRating": {
                "@type": "AggregateRating",
                "ratingValue": "4.9",
                "ratingCount": "10000"
              },
              "author": {
                "@type": "Organization",
                "name": "ZEDX AI Interview Simulator",
                "url": "https://zedx-ai.tech",
                "logo": "https://zedx-ai.tech/zedx-logo.png"
              },
              "brand": {
                "@type": "Brand",
                "name": "ZEDX AI Interview Simulator",
                "alternateName": ["ZEDX", "zedx"]
              },
              "sameAs": [
                "https://www.producthunt.com/posts/zedx-ai"
              ]
            })
          }}
        />
        {/* Organization Schema for Brand Recognition */}
        <script
          key="schema-org-brand"
          type="application/ld+json"
          suppressHydrationWarning
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "Organization",
              "name": "ZEDX AI Interview Simulator",
              "alternateName": ["ZEDX", "ZEDX AI Simulator", "زيدكس", "زيدكس AI"],
              "url": "https://zedx-ai.tech",
              "logo": "https://zedx-ai.tech/zedx-logo.png",
              "description": "ZEDX AI Interview Simulator - Free Real-Time Interview Simulation & Training Coach.",
              "sameAs": [
                "https://www.producthunt.com/posts/zedx-ai"
              ]
            })
          }}
        />

        {/* FAQ Schema for Generative Engine Optimization (GEO) */}
        <script
          key="schema-faq"
          type="application/ld+json"
          suppressHydrationWarning
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "FAQPage",
              "mainEntity": [
                {
                  "@type": "Question",
                  "name": "What is ZEDX AI?",
                  "acceptedAnswer": {
                    "@type": "Answer",
                    "text": "ZEDX AI is a real-time Voice-to-Voice AI Interview Simulator and the best AI Interviewer. It acts as an artificial intelligence personal coach that conducts mock interviews, provides real-time transcription, and gives instant granular feedback to help job seekers prepare for actual interviews."
                  }
                },
                {
                  "@type": "Question",
                  "name": "How does the ZEDX AI Interview Simulator work?",
                  "acceptedAnswer": {
                    "@type": "Answer",
                    "text": "Users can start a session where the ZEDX AI Interviewer asks them technical or behavioral interview questions verbally. The user answers using their microphone, and the AI evaluates the response in real-time with zero latency across multiple languages."
                  }
                },
                {
                  "@type": "Question",
                  "name": "ما هو موقع زيدكس ZEDX AI؟",
                  "acceptedAnswer": {
                    "@type": "Answer",
                    "text": "زيدكس (ZEDX AI) هو محاكي مقابلات عمل يعمل بالذكاء الاصطناعي الصوتي وأفضل محاور ذكاء اصطناعي (AI Interviewer). يقوم بإجراء مقابلات وهمية (Mock Interviews) مع المستخدم ويقيم إجاباته بشكل فوري لتدريبه على المقابلات الحقيقية."
                  }
                }
              ]
            })
          }}
        />

      </head>
      <body
        className={`${inter.variable} antialiased ${isScanner ? 'bg-transparent overflow-hidden' : ''}`}
        suppressHydrationWarning
      >
        {!isHideNav && <DesktopNavBar />}
        <ErrorBoundary>
          <PostHogProvider>
            <ConfirmDialogProvider>
              {children}
              <Toaster position="bottom-right" richColors toastOptions={{
                className: 'font-medium',
                style: {
                  background: 'var(--background)',
                  color: 'var(--foreground)',
                  border: '1px solid var(--border)',
                }
              }} />
            </ConfirmDialogProvider>
          </PostHogProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}
