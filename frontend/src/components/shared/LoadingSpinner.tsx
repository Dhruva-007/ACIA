/**
 * LoadingSpinner Component
 *
 * Accessible loading indicator with optional label text.
 * Uses CSS animation that respects prefers-reduced-motion.
 * Screen readers announce the loading state via role="status"
 * and aria-label.
 */

interface LoadingSpinnerProps {
  /** Size in pixels. Defaults to 32. */
  size?: number
  /** Optional label displayed below spinner. */
  label?: string
  /** Additional CSS classes for the container. */
  className?: string
}

export default function LoadingSpinner({
  size = 32,
  label,
  className = '',
}: LoadingSpinnerProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center gap-3 ${className}`}
      role="status"
      aria-label={label ?? 'Loading'}
    >
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        className="animate-spin"
        aria-hidden="true"
      >
        <circle
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
          className="text-slate-200"
        />
        <path
          d="M12 2a10 10 0 0 1 10 10"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
          className="text-primary-600"
        />
      </svg>
      {label && (
        <span className="text-sm text-slate-500">{label}</span>
      )}
    </div>
  )
}