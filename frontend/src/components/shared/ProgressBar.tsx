/**
 * ProgressBar Component
 *
 * Visual progress indicator with percentage and step labels.
 * Used in the onboarding wizard to show completion progress.
 *
 * Accessibility:
 * - role="progressbar" for screen readers
 * - aria-valuenow, aria-valuemin, aria-valuemax for current state
 * - aria-label describes the context
 */

interface ProgressBarProps {
  /** Current progress percentage (0-100). */
  percentage: number
  /** Optional label displayed above the bar. */
  label?: string
  /** Additional CSS classes. */
  className?: string
}

export default function ProgressBar({
  percentage,
  label,
  className = '',
}: ProgressBarProps) {
  const clampedPercentage = Math.min(100, Math.max(0, percentage))

  return (
    <div className={className}>
      {label && (
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-slate-700">{label}</span>
          <span className="text-sm text-slate-500">{Math.round(clampedPercentage)}%</span>
        </div>
      )}
      <div
        className="w-full h-2 bg-slate-200 rounded-full overflow-hidden"
        role="progressbar"
        aria-valuenow={clampedPercentage}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label ?? 'Progress'}
      >
        <div
          className="h-full bg-primary-600 rounded-full transition-all duration-500 ease-out"
          style={{ width: `${clampedPercentage}%` }}
        />
      </div>
    </div>
  )
}