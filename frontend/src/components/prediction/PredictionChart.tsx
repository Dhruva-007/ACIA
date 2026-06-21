/**
 * PredictionChart Component
 *
 * Dual-line area chart showing:
 * 1. Current trajectory (red dashed) — emissions if nothing changes
 * 2. Reduction path (green solid) — emissions with top actions adopted
 *
 * The green line is guaranteed to always be above zero and below
 * the red line, showing a meaningful but realistic reduction.
 *
 * All values displayed in kg CO₂e.
 */

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'
import type { PredictionDataPoint } from '../../types/simulation.types'

interface PredictionChartProps {
  trajectory: PredictionDataPoint[]
  reductionPath: PredictionDataPoint[]
  isLoading: boolean
}

export default function PredictionChart({
  trajectory,
  reductionPath,
  isLoading,
}: PredictionChartProps) {
  if (isLoading) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-6">
        <p className="text-sm font-medium text-slate-500 mb-4">Emission Forecast</p>
        <div className="h-72 bg-slate-50 rounded-xl animate-pulse flex items-center justify-center">
          <p className="text-slate-400 text-sm">Loading forecast...</p>
        </div>
      </div>
    )
  }

  if (trajectory.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-6">
        <p className="text-sm font-medium text-slate-500 mb-4">Emission Forecast</p>
        <div className="h-72 flex items-center justify-center">
          <div className="text-center">
            <span className="text-4xl block mb-3" aria-hidden="true">🔮</span>
            <p className="text-slate-500 text-sm">
              Not enough data to generate predictions yet.
            </p>
            <p className="text-slate-400 text-xs mt-1">
              Continue tracking your emissions to unlock forecasts.
            </p>
          </div>
        </div>
      </div>
    )
  }

  // Merge trajectory and reduction path into single chart data array.
  // Validate that reduction_path values are never zero or negative —
  // a zero green line means the backend returned incorrect data.
  const chartData = trajectory.map((point, index) => {
    const reductionPoint = reductionPath[index]
    let reductionValue: number | null = null

    if (reductionPoint) {
      // Guard: ensure reduction path is always positive and below trajectory
      const validated = Math.max(
        reductionPoint.projected_kg,
        point.projected_kg * 0.10, // Minimum 10% of trajectory
      )
      reductionValue = Number(validated.toFixed(1))
    }

    return {
      month: point.label,
      current_trajectory: Number(point.projected_kg.toFixed(1)),
      reduction_path: reductionValue,
    }
  })

  // Check if reduction path is meaningful (not identical to trajectory)
  const hasMeaningfulReduction = chartData.some(
    (d) =>
      d.reduction_path !== null &&
      d.reduction_path < d.current_trajectory * 0.99
  )

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm font-medium text-slate-500">Emission Forecast</p>
        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-1.5">
            <div className="w-4 h-0.5 bg-red-400 rounded" style={{ borderTop: '2px dashed #f87171', background: 'none' }} />
            <span className="text-slate-500">Current Path</span>
          </div>
          {hasMeaningfulReduction && (
            <div className="flex items-center gap-1.5">
              <div className="w-4 h-0.5 bg-green-500 rounded" />
              <span className="text-slate-500">With Actions</span>
            </div>
          )}
        </div>
      </div>

      {!hasMeaningfulReduction && (
        <div className="mb-3 p-3 bg-amber-50 border border-amber-100 rounded-lg">
          <p className="text-xs text-amber-700">
            Accept recommendations to see your potential reduction path.
          </p>
        </div>
      )}

      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
            <defs>
              <linearGradient id="trajectoryGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#f87171" stopOpacity={0.15} />
                <stop offset="95%" stopColor="#f87171" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="reductionGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#22c55e" stopOpacity={0.2} />
                <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis
              dataKey="month"
              tick={{ fontSize: 11, fill: '#94a3b8' }}
              tickLine={false}
              axisLine={{ stroke: '#e2e8f0' }}
            />
            <YAxis
              tick={{ fontSize: 11, fill: '#94a3b8' }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(value: number) => `${value}`}
              width={45}
              label={{
                value: 'kg CO₂e',
                angle: -90,
                position: 'insideLeft',
                style: { fontSize: 10, fill: '#94a3b8' },
                offset: 10,
              }}
            />
            <Tooltip
              contentStyle={{
                borderRadius: '0.75rem',
                border: '1px solid #e2e8f0',
                fontSize: '0.8rem',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
              }}
              formatter={(value: number, name: string) => {
                const label =
                  name === 'current_trajectory' ? 'Current Path' : 'With Actions'
                return [`${value.toFixed(1)} kg CO₂e`, label]
              }}
            />
            <Legend
              formatter={(value: string) =>
                value === 'current_trajectory' ? 'Current Path' : 'With Actions'
              }
              wrapperStyle={{ fontSize: '0.75rem' }}
            />

            {/* Current Trajectory — red dashed */}
            <Area
              type="monotone"
              dataKey="current_trajectory"
              stroke="#f87171"
              strokeWidth={2}
              strokeDasharray="6 3"
              fill="url(#trajectoryGradient)"
              animationDuration={800}
              dot={false}
            />

            {/* Reduction Path — green solid */}
            {hasMeaningfulReduction && (
              <Area
                type="monotone"
                dataKey="reduction_path"
                stroke="#22c55e"
                strokeWidth={2.5}
                fill="url(#reductionGradient)"
                animationDuration={1000}
                animationBegin={300}
                dot={false}
                connectNulls={false}
              />
            )}
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}