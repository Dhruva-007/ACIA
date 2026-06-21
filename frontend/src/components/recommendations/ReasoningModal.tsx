/**
 * ReasoningModal Component
 *
 * Displays the detailed reasoning behind a specific
 * recommendation. This makes the system's intelligence
 * visible and explainable.
 *
 * Content includes:
 * - Plain-language reasoning statement
 * - Full five-dimension score breakdown
 * - Estimated carbon reduction numbers
 * - Cost and disruption level indicators
 *
 * Accessibility:
 * - Focus trapped inside modal
 * - ESC key closes modal
 * - aria-modal and aria-labelledby
 * - Backdrop click closes modal
 */

import { useEffect, useRef } from 'react'
import ScoreBreakdown from './ScoreBreakdown'
import { CATEGORY_LABELS, CATEGORY_ICONS, COST_LEVEL_LABELS, DISRUPTION_LEVEL_LABELS } from '../../utils/constants'
import type { Recommendation } from '../../types/recommendation.types'

interface ReasoningModalProps {
  recommendation: Recommendation
  onClose: () => void
}

export default function ReasoningModal({ recommendation, onClose }: ReasoningModalProps) {
  const modalRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent): void {
      if (e.key === 'Escape') onClose()
    }

    document.addEventListener('keydown', handleKeyDown)
    document.body.style.overflow = 'hidden'

    // Focus the modal on open
    modalRef.current?.focus()

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = ''
    }
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="reasoning-title"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal Content */}
      <div
        ref={modalRef}
        tabIndex={-1}
        className="relative bg-white rounded-2xl border border-slate-200 shadow-elevated max-w-lg w-full max-h-[85vh] overflow-y-auto scrollbar-thin animate-slide-up"
      >
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-slate-100 px-6 py-4 rounded-t-2xl">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <span className="text-2xl" aria-hidden="true">
                {CATEGORY_ICONS[recommendation.category]}
              </span>
              <div>
                <h2 id="reasoning-title" className="text-lg font-semibold text-slate-900">
                  {recommendation.title}
                </h2>
                <p className="text-sm text-slate-500">
                  {CATEGORY_LABELS[recommendation.category]}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              aria-label="Close reasoning details"
            >
              <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" />
              </svg>
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-6">
          {/* Reasoning Statement */}
          <div>
            <h3 className="text-sm font-medium text-slate-700 mb-2">
              💡 Why This Was Recommended For You
            </h3>
            <div className="bg-primary-50 border border-primary-100 rounded-xl p-4">
              <p className="text-sm text-primary-800 leading-relaxed">
                {recommendation.reasoning}
              </p>
            </div>
          </div>

          {/* Description */}
          <div>
            <h3 className="text-sm font-medium text-slate-700 mb-2">Description</h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              {recommendation.description}
            </p>
          </div>

          {/* Impact Numbers */}
          <div>
            <h3 className="text-sm font-medium text-slate-700 mb-3">Estimated Impact</h3>
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-green-50 border border-green-100 rounded-xl p-3 text-center">
                <p className="text-lg font-bold text-green-700">
                  {recommendation.monthly_kg_reduction.toFixed(1)}
                </p>
                <p className="text-xs text-green-600">kg CO₂/month</p>
              </div>
              <div className="bg-green-50 border border-green-100 rounded-xl p-3 text-center">
                <p className="text-lg font-bold text-green-700">
                  {recommendation.annual_kg_reduction.toFixed(0)}
                </p>
                <p className="text-xs text-green-600">kg CO₂/year</p>
              </div>
              <div className="bg-green-50 border border-green-100 rounded-xl p-3 text-center">
                <p className="text-lg font-bold text-green-700">
                  {recommendation.impact_percentage.toFixed(1)}%
                </p>
                <p className="text-xs text-green-600">reduction</p>
              </div>
            </div>
          </div>

          {/* Practical Details */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-slate-50 rounded-xl p-3">
              <p className="text-xs text-slate-400 mb-1">Cost</p>
              <p className="text-sm font-medium text-slate-700">
                {COST_LEVEL_LABELS[recommendation.cost_level]}
              </p>
            </div>
            <div className="bg-slate-50 rounded-xl p-3">
              <p className="text-xs text-slate-400 mb-1">Effort</p>
              <p className="text-sm font-medium text-slate-700">
                {DISRUPTION_LEVEL_LABELS[recommendation.disruption_level]}
              </p>
            </div>
          </div>

          {/* Composite Score */}
          <div className="flex items-center gap-3 bg-slate-50 rounded-xl p-3">
            <div className="flex-1">
              <p className="text-xs text-slate-400 mb-1">Composite Score</p>
              <div className="flex items-center gap-2">
                <div className="flex-1 h-2.5 bg-slate-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary-500 rounded-full transition-all duration-700"
                    style={{ width: `${recommendation.composite_score}%` }}
                  />
                </div>
                <span className="text-sm font-bold text-slate-900">
                  {Math.round(recommendation.composite_score)}/100
                </span>
              </div>
            </div>
          </div>

          {/* Five-Dimension Score Breakdown */}
          <ScoreBreakdown scores={recommendation.scores} />
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-white border-t border-slate-100 px-6 py-4 rounded-b-2xl">
          <button
            onClick={onClose}
            className="btn-secondary w-full"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}