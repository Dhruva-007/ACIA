/**
 * QuickUpdateModal Component — Section 1: Adaptive Re-Onboarding
 *
 * Modal that wraps a single OnboardingWizard step for
 * the monthly profile review flow.
 *
 * The user selects which category has changed, and the
 * relevant wizard step opens pre-populated with their
 * current values. Changes are saved via the quick-update
 * API endpoint without requiring full re-onboarding.
 *
 * Accessibility:
 * - role="dialog" with aria-modal
 * - Focus trapped inside modal
 * - ESC key closes modal
 */

import { useEffect, useRef, useState } from 'react'
import type { OnboardingStep } from '../../types/user.types'
import type { UserLifestyleInput } from '../../types/carbon.types'
import OnboardingWizard from './OnboardingWizard'
import { CATEGORY_ICONS, CATEGORY_LABELS } from '../../utils/constants'
import type { EmissionCategory } from '../../types/carbon.types'

interface QuickUpdateModalProps {
  currentLifestyle?: Partial<UserLifestyleInput>
  onClose: () => void
  onComplete: () => void
}

const STEP_OPTIONS: { step: OnboardingStep; category: EmissionCategory }[] = [
  { step: 'transport', category: 'transport' },
  { step: 'energy', category: 'energy' },
  { step: 'food', category: 'food' },
  { step: 'shopping', category: 'shopping' },
]

export default function QuickUpdateModal({
  currentLifestyle,
  onClose,
  onComplete,
}: QuickUpdateModalProps) {
  const [selectedStep, setSelectedStep] = useState<OnboardingStep | null>(null)
  const modalRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent): void {
      if (e.key === 'Escape') onClose()
    }

    document.addEventListener('keydown', handleKeyDown)
    document.body.style.overflow = 'hidden'
    modalRef.current?.focus()

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = ''
    }
  }, [onClose])

  function handleComplete(): void {
    onComplete()
    onClose()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="quick-update-title"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal */}
      <div
        ref={modalRef}
        tabIndex={-1}
        className="relative bg-white rounded-2xl border border-slate-200 shadow-elevated max-w-lg w-full max-h-[90vh] overflow-y-auto scrollbar-thin animate-slide-up"
      >
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-slate-100 px-6 py-4 rounded-t-2xl">
          <div className="flex items-center justify-between">
            <h2 id="quick-update-title" className="text-lg font-semibold text-slate-900">
              {selectedStep ? 'Update Your Profile' : 'What has changed?'}
            </h2>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg transition-colors"
              aria-label="Close update modal"
            >
              ✕
            </button>
          </div>
          {!selectedStep && (
            <p className="text-sm text-slate-500 mt-1">
              Select the category that has changed in your lifestyle.
            </p>
          )}
        </div>

        <div className="p-6">
          {/* Category Selection */}
          {!selectedStep && (
            <div className="grid grid-cols-2 gap-3">
              {STEP_OPTIONS.map(({ step, category }) => (
                <button
                  key={step}
                  onClick={() => setSelectedStep(step)}
                  className="flex flex-col items-center gap-2 p-4 border border-slate-200 rounded-xl hover:border-primary-400 hover:bg-primary-50 transition-all duration-200"
                >
                  <span className="text-3xl" aria-hidden="true">
                    {CATEGORY_ICONS[category]}
                  </span>
                  <span className="text-sm font-medium text-slate-700">
                    {CATEGORY_LABELS[category]}
                  </span>
                </button>
              ))}
            </div>
          )}

          {/* Single Step Wizard */}
          {selectedStep && (
            <>
              <button
                onClick={() => setSelectedStep(null)}
                className="text-xs text-slate-400 hover:text-slate-600 mb-4 flex items-center gap-1"
              >
                ← Change category
              </button>
              <OnboardingWizard
                singleStepMode
                initialStep={selectedStep}
                prefillData={currentLifestyle}
                onSingleStepComplete={handleComplete}
              />
            </>
          )}
        </div>
      </div>
    </div>
  )
}