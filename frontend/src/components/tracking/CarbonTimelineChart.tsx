/**
 * CarbonTimelineChart Component
 *
 * Area chart visualizing carbon emissions over time.
 *
 * Supports two modes:
 * 1. Total emissions line — single area showing total kg CO₂
 * 2. Stacked breakdown — four stacked areas showing category contributions
 *
 * Directly addresses the "Track emissions over time" requirement.
 *
 * Uses Recharts with:
 * - Responsive container for all screen sizes
 * - Tooltip with formatted carbon values
 * - Smooth curve interpolation
 * - Animated entry
 */

import { useState } from 'react'
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
import { CATEGORY_COLORS, CATEGORY_LABELS } from '../../utils/constants'
import { formatDateShort } from '../../utils/formatters'
import type { EmissionDataPoint, EmissionCategory } from '../../types/carbon.types'

interface CarbonTimelineChartProps {
  dataPoints: EmissionDataPoint[]
  isLoading: boolean
}

type ChartMode = 'total' | 'breakdown'

const CATEGORIES: EmissionCategory[] = ['transport', 'energy', 'food', 'shopping']

export default function CarbonTimelineChart({
  dataPoints,
  isLoading,
}: CarbonTimelineChartProps) {
  const [chartMode, setChartMode] = useState<ChartMode>('total')

  if (isLoading) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-6">
        <div className="h-72 bg-slate-50 rounded-xl animate-pulse flex items-center justify-center">
          <p className="text-slate-400 text-sm">Loading chart...</p>
        </div>
      </div>
    )
  }

  if (dataPoints.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-6">
        <div className="h-72 flex items-center justify-center">
          <div className="text-center">
            <p className="text-slate-500 text-sm">No emission data available yet.</p>
            <p className="text-slate-400 text-xs mt-1">
              Data will appear after your first carbon calculation.
            </p>
          </div>
        </div>
      </div>
    )
  }

  const chartData = dataPoints.map((point) => ({
    date: point.date,
    dateLabel: formatDateShort(point.date),
    total: Number(point.total_kg.toFixed(2)),
    transport: Number(point.breakdown.transport_kg.toFixed(2)),
    energy: Number(point.breakdown.energy_kg.toFixed(2)),
    food: Number(point.breakdown.food_kg.toFixed(2)),
    shopping: Number(point.breakdown.shopping_kg.toFixed(2)),
  }))

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6">
      {/* Chart Mode Toggle */}
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm font-medium text-slate-500">Emission Trend</p>
        <div className="inline-flex bg-slate-100 rounded-lg p-0.5">
          <button
            onClick={() => setChartMode('total')}
            className={`px-3 py-1 text-xs font-medium rounded-md transition-all duration-200 ${
              chartMode === 'total'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            Total
          </button>
          <button
            onClick={() => setChartMode('breakdown')}
            className={`px-3 py-1 text-xs font-medium rounded-md transition-all duration-200 ${
              chartMode === 'breakdown'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            By Category
          </button>
        </div>
      </div>

      {/* Chart */}
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
            <defs>
              <linearGradient id="totalGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#16a34a" stopOpacity={0.2} />
                <stop offset="95%" stopColor="#16a34a" stopOpacity={0} />
              </linearGradient>
              {CATEGORIES.map((cat) => (
                <linearGradient key={cat} id={`${cat}Gradient`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={CATEGORY_COLORS[cat]} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={CATEGORY_COLORS[cat]} stopOpacity={0} />
                </linearGradient>
              ))}
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis
              dataKey="dateLabel"
              tick={{ fontSize: 12, fill: '#94a3b8' }}
              tickLine={false}
              axisLine={{ stroke: '#e2e8f0' }}
            />
            <YAxis
              tick={{ fontSize: 12, fill: '#94a3b8' }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(value: number) => `${value}`}
              width={40}
            />
            <Tooltip
              contentStyle={{
                borderRadius: '0.75rem',
                border: '1px solid #e2e8f0',
                fontSize: '0.875rem',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
              }}
              formatter={(value: number, name: string) => {
                const label = name === 'total'
                  ? 'Total'
                  : CATEGORY_LABELS[name as EmissionCategory] ?? name
                return [`${value.toFixed(2)} kg CO₂`, label]
              }}
            />

            {chartMode === 'total' ? (
              <Area
                type="monotone"
                dataKey="total"
                stroke="#16a34a"
                strokeWidth={2}
                fill="url(#totalGradient)"
                animationDuration={800}
              />
            ) : (
              <>
                {CATEGORIES.map((cat) => (
                  <Area
                    key={cat}
                    type="monotone"
                    dataKey={cat}
                    stackId="breakdown"
                    stroke={CATEGORY_COLORS[cat]}
                    strokeWidth={1.5}
                    fill={`url(#${cat}Gradient)`}
                    animationDuration={800}
                  />
                ))}
                <Legend
                  formatter={(value: string) =>
                    CATEGORY_LABELS[value as EmissionCategory] ?? value
                  }
                  wrapperStyle={{ fontSize: '0.75rem' }}
                />
              </>
            )}
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}