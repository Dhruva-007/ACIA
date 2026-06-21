/**
 * EmissionBreakdownChart Component
 *
 * Donut/pie chart visualizing the category-wise carbon
 * emission breakdown. This is the primary visualization
 * for the Carbon Understanding Engine.
 *
 * Features:
 * - Visual donut chart with category colors
 * - Category labels with CO₂e percentages
 * - Primary contributor highlighted
 * - Primary contributor explanation
 * - Clickable segments for Explainer Mode (Feature 7)
 *
 * All values displayed in kg CO₂e.
 */

import { useState } from 'react'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'
import { CATEGORY_LABELS, CATEGORY_COLORS, CATEGORY_ICONS } from '../../utils/constants'
import type {
  EmissionBreakdownPercentage,
  EmissionBreakdown,
  EmissionCategory,
} from '../../types/carbon.types'

interface EmissionBreakdownChartProps {
  breakdown: EmissionBreakdown | null
  breakdownPercentage: EmissionBreakdownPercentage | null
  primaryContributor: EmissionCategory | null
  explanation: string | null
  isLoading: boolean
}

interface ChartDataItem {
  name: string
  value: number
  percentage: number
  color: string
  icon: string
  category: EmissionCategory
}

export default function EmissionBreakdownChart({
  breakdown,
  breakdownPercentage,
  primaryContributor,
  explanation,
  isLoading,
}: EmissionBreakdownChartProps) {
  const [selectedCategory, setSelectedCategory] = useState<EmissionCategory | null>(null)

  if (isLoading || !breakdown || !breakdownPercentage) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-6 animate-pulse">
        <p className="text-sm font-medium text-slate-500 mb-4">Emission Breakdown</p>
        <div className="flex items-center justify-center h-64">
          <div className="w-48 h-48 rounded-full bg-slate-100" />
        </div>
      </div>
    )
  }

  const categories: EmissionCategory[] = ['transport', 'energy', 'food', 'shopping']

  const chartData: ChartDataItem[] = categories.map((category) => ({
    name: CATEGORY_LABELS[category],
    value: breakdown[`${category}_kg` as keyof EmissionBreakdown],
    percentage: breakdownPercentage[category],
    color: CATEGORY_COLORS[category],
    icon: CATEGORY_ICONS[category],
    category,
  }))

  function handleCategoryClick(category: EmissionCategory): void {
    setSelectedCategory((prev) => (prev === category ? null : category))
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm font-medium text-slate-500">Emission Breakdown</p>
        <p className="text-xs text-slate-400">Click a category for details</p>
      </div>

      <div className="flex flex-col lg:flex-row items-center gap-6">
        {/* Donut Chart */}
        <div className="w-full lg:w-1/2 h-64">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={90}
                dataKey="value"
                stroke="none"
                animationDuration={800}
                animationBegin={100}
                onClick={(entry: ChartDataItem) => handleCategoryClick(entry.category)}
                style={{ cursor: 'pointer' }}
              >
                {chartData.map((entry) => (
                  <Cell
                    key={entry.category}
                    fill={entry.color}
                    opacity={
                      selectedCategory === null || selectedCategory === entry.category
                        ? 1
                        : 0.4
                    }
                  />
                ))}
              </Pie>
              <Tooltip
                formatter={(value: number) => [`${value.toFixed(2)} kg CO₂e`, '']}
                contentStyle={{
                  borderRadius: '0.75rem',
                  border: '1px solid #e2e8f0',
                  fontSize: '0.875rem',
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Legend with click targets */}
        <div className="w-full lg:w-1/2 space-y-2">
          {chartData
            .slice()
            .sort((a, b) => b.percentage - a.percentage)
            .map((item) => {
              const isSelected = selectedCategory === item.category
              const isPrimary = item.category === primaryContributor

              return (
                <button
                  key={item.category}
                  onClick={() => handleCategoryClick(item.category)}
                  className={`w-full flex items-center gap-3 p-3 rounded-xl border text-left transition-all duration-200 ${
                    isSelected
                      ? 'border-slate-400 bg-slate-50 ring-1 ring-slate-300'
                      : isPrimary
                      ? 'border-slate-200 bg-slate-50'
                      : 'border-transparent hover:bg-slate-50 hover:border-slate-200'
                  }`}
                  aria-pressed={isSelected}
                  aria-label={`${item.name}: ${item.percentage.toFixed(0)}% of emissions. Click to see details.`}
                >
                  <div
                    className="w-3 h-3 rounded-full flex-shrink-0"
                    style={{ backgroundColor: item.color }}
                    aria-hidden="true"
                  />
                  <span className="text-lg" aria-hidden="true">{item.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-slate-700">
                        {item.name}
                      </span>
                      <span className="text-sm font-bold text-slate-900">
                        {item.percentage.toFixed(0)}%
                      </span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-100 rounded-full mt-1">
                      <div
                        className="h-full rounded-full transition-all duration-700 ease-out"
                        style={{
                          width: `${item.percentage}%`,
                          backgroundColor: item.color,
                        }}
                      />
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {item.value.toFixed(1)} kg CO₂e/month
                    </p>
                  </div>
                </button>
              )
            })}
        </div>
      </div>

      {/* Selected Category Detail (Feature 7 placeholder) */}
      {selectedCategory && (
        <div
          className="mt-4 p-4 rounded-xl border border-blue-100 bg-blue-50 animate-fade-in"
          role="region"
          aria-label={`Details for ${CATEGORY_LABELS[selectedCategory]}`}
        >
          <p className="text-sm font-medium text-blue-800 mb-1">
            {CATEGORY_ICONS[selectedCategory]} {CATEGORY_LABELS[selectedCategory]}
          </p>
          <p className="text-xs text-blue-700">
            {breakdown[`${selectedCategory}_kg` as keyof EmissionBreakdown].toFixed(1)} kg CO₂e/month
            ({breakdownPercentage[selectedCategory].toFixed(1)}% of your footprint)
          </p>
          <p className="text-xs text-blue-600 mt-2">
            💡 Visit the AI Assistant to ask specific questions about this category.
          </p>
        </div>
      )}

      {/* Primary Contributor Explanation */}
      {explanation && !selectedCategory && (
        <div className="mt-6 p-4 bg-blue-50 border border-blue-100 rounded-xl">
          <p className="text-sm text-blue-800">
            <span className="font-medium">💡 Insight: </span>
            {explanation}
          </p>
        </div>
      )}
    </div>
  )
}