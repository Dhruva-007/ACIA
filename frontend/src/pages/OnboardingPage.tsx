/**
 * OnboardingPage
 *
 * Full-screen onboarding experience for new users.
 * Displays the multi-step wizard for capturing lifestyle data.
 */

import OnboardingWizard from '../components/onboarding/OnboardingWizard'

export default function OnboardingPage() {
  return (
    <main className="min-h-screen bg-slate-50 py-8 px-4">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-primary-600 mb-2">
          Welcome to ACIA
        </h1>
        <p className="text-slate-600 max-w-md mx-auto">
          Let&apos;s understand your lifestyle to calculate your personal carbon footprint
          and create your reduction plan.
        </p>
      </div>

      {/* Wizard */}
      <OnboardingWizard />
    </main>
  )
}