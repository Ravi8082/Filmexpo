export type EngagementSubmission = {
  type: 'registration' | 'newsletter'
  email: string
  marketingConsent: boolean
}

export function parseEngagementInput(value: unknown): EngagementSubmission | null
