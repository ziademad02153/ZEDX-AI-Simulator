'use client'

import posthog from 'posthog-js'
import { PostHogProvider as CSPostHogProvider } from 'posthog-js/react'

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  // Optional analytics remain uninitialized until an explicit consent flow is implemented.
  // Retain the context for existing usePostHog callers without sending analytics requests.
  return <CSPostHogProvider client={posthog}>{children}</CSPostHogProvider>
}
