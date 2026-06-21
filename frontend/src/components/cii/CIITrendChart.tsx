/**
 * CIITrendChart Component
 *
 * Line chart showing the Carbon Improvement Index score
 * progression over time (past months).
 *
 * This visualizes the user's sustainability journey,
 * showing whether their CII is improving, stable, or
 * declining over time.
 *
 * Uses Recharts line chart with reference line at the
 * "Good" threshold (60) for context.
 */

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts'
import { formatMonth } from '../../utils/formatters'
import type { CIIScore } from '../../types/api.types'

interface CIITrendChartProps {
  history: CIIScore[]
  isLoading: boolean
}

export default function CIITrendChart({ history, isLoading }: CIITrendChartProps) {
  if (isLoading) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-6">
        <p className="text-sm font-medium text-slate-500 mb-4">CII Trend</p>
        <div className="h-64 bg-slate-50 rounded-xl animate-pulse flex items-center justify-center">
          <p className="text-slate-400 text-sm">Loading trend...</p>
        </div>
      </div>
    )
  }

  if (history.length < 2) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-6">
        <p className="text-sm font-medium text-slate-500 mb-4">CII Trend</p>
        <div className="h-64 flex items-center justify-center">
          <div className="text-center">
            <span className="text-4xl block mb-3" aria-hidden="true">📈</span>
            <p className="text-slate-500 text-sm">
              Your CII trend will appear here over time.
            </p>
            <p className="text-slate-400 text-xs mt-1">
              Keep using ACIA to build your sustainability history.
            </p>
          </div>
        </div>
      </div>
    )
  }

  const chartData = history
    .slice()
    .sort((a, b) => a.month.localeCompare(b.month))
    .map((score) => ({
      month: formatMonth(score.month).split(' ')[0].slice(0, 3),
      fullMonth: formatMonth(score.month),
      score: Math.round(score.composite_score),
    }))

  // Calculate trend direction
  const firstScore = chartData[0].score
  const lastScore = chartData[chartData.length - 1].score
  const trendDirection = lastScore > firstScore ? 'improving' : lastScore < firstScore ? 'declining' : 'stable'
  const trendChange = lastScore - firstScore

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm font-medium text-slate-500">CII Trend</p>
        <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${
          trendDirection === 'improving'
            ? 'bg-green-100 text-green-700'
            : trendDirection === 'declining'
            ? 'bg-red-100 text-red-700'
            : 'bg-slate-100 text-slate-600'
        }`}>
          {trendDirection === 'improving' && `↑ +${trendChange} points`}
          {trendDirection === 'declining' && `↓ ${trendChange} points`}
          {trendDirection === 'stable' && '→ Stable'}
        </span>
      </div>

      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis
              dataKey="month"
              tick={{ fontSize: 12, fill: '#94a3b8' }}
              tickLine={false}
              axisLine={{ stroke: '#e2e8f0' }}
            />
            <YAxis
              domain={[0, 100]}
              tick={{ fontSize: 12, fill: '#94a3b8' }}
              tickLine={false}
              axisLine={false}
              width={35}
            />
            <Tooltip
              contentStyle={{
                borderRadius: '0.75rem',
                border: '1px solid #e2e8f0',
                fontSize: '0.875rem',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
              }}
              formatter={(value: number) => [`${value}/100`, 'CII Score']}
              labelFormatter={(_, payload) => {
                if (payload && payload.length > 0) {
                  return payload[0].payload.fullMonth
                }
                return ''
              }}
            />
            {/* Reference line at "Good" threshold */}
            <ReferenceLine
              y={60}
              stroke="#cbd5e1"
              strokeDasharray="4 4"
              label={{
                value: 'Good (60)',
                position: 'right',
                fontSize: 10,
                fill: '#94a3b8',
              }}
            />
            <Line
              type="monotone"
              dataKey="score"
              stroke="#16a34a"
              strokeWidth={2.5}
              dot={{ fill: '#16a34a', r: 4 }}
              activeDot={{ r: 6 }}
              animationDuration={1000}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}