/**
 * MetricCard Component
 *
 * Displays a single metric with label, value, unit, and optional
 * trend indicator. Used throughout the dashboard and analytics pages.
 */

interface MetricCardProps {
  /** Descriptive label for the metric. */
  label: string
  /** Primary display value. */
  value: string
  /** Unit suffix displayed next to value. */
  unit?: string
  /** Optional trend text (e.g., "+5.2% ↑"). */
  trend?: string
  /** Tailwind color class for trend text. */
  trendColor?: string
  /** Optional icon or emoji displayed above the value. */
  icon?: string
  /** Additional CSS classes. */
  className?: string
}

export default function MetricCard({
  label,
  value,
  unit,
  trend,
  trendColor = 'text-slate-500',
  icon,
  className = '',
}: MetricCardProps) {
  return (
    <div className={`bg-white rounded-2xl border border-slate-200 p-6 ${className}`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-slate-500 mb-1">{label}</p>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-bold text-slate-900">{value}</span>
            {unit && (
              <span className="text-sm text-slate-500">{unit}</span>
            )}
          </div>
          {trend && (
            <p className={`text-sm mt-1 ${trendColor}`}>{trend}</p>
          )}
        </div>
        {icon && (
          <span className="text-2xl" aria-hidden="true">{icon}</span>
        )}
      </div>
    </div>
  )
}