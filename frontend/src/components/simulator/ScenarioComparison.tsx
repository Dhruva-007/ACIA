/**
 * ScenarioComparison Component
 *
 * Compares multiple simulation scenarios side by side
 * with a visual bar chart. Highlights the scenario
 * with the highest carbon reduction.
 *
 * Users can see which lifestyle change would have
 * the most impact before committing to any action.
 */

import type { SimulationResult } from '../../types/simulation.types'

interface ScenarioComparisonProps {
  results: SimulationResult[]
}

export default function ScenarioComparison({ results }: ScenarioComparisonProps) {
  if (results.length < 2) {
    return null
  }

  const maxSaving = Math.max(...results.map((r) => r.monthly_saving_kg))

  // Sort by impact, highest first
  const sorted = [...results].sort((a, b) => b.monthly_saving_kg - a.monthly_saving_kg)
  const bestScenario = sorted[0]

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6">
      <h3 className="text-sm font-medium text-slate-500 mb-4">Scenario Comparison</h3>

      {/* Best Scenario Highlight */}
      <div className="bg-green-50 border border-green-100 rounded-xl p-4 mb-5">
        <p className="text-sm text-green-800">
          <span className="font-semibold">🏆 Best scenario: </span>
          {bestScenario.scenario_label} — saves {bestScenario.monthly_saving_kg.toFixed(1)} kg CO₂/month
          ({bestScenario.percentage_improvement.toFixed(1)}% reduction)
        </p>
      </div>

      {/* Comparison Bars */}
      <div className="space-y-4">
        {sorted.map((result, index) => {
          const barWidth = maxSaving > 0
            ? (result.monthly_saving_kg / maxSaving) * 100
            : 0
          const isBest = index === 0

          return (
            <div key={result.scenario_label}>
              <div className="flex items-center justify-between mb-1">
                <span className={`text-sm ${isBest ? 'font-semibold text-slate-900' : 'text-slate-600'}`}>
                  {isBest && '🏆 '}
                  {result.scenario_label}
                </span>
                <span className="text-sm font-medium text-green-600">
                  -{result.monthly_saving_kg.toFixed(1)} kg/month
                </span>
              </div>
              <div className="w-full h-4 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-700 ease-out ${
                    isBest ? 'bg-green-500' : 'bg-green-300'
                  }`}
                  style={{ width: `${barWidth}%` }}
                />
              </div>
              <div className="flex items-center justify-between mt-0.5">
                <span className="text-xs text-slate-400">
                  {result.percentage_improvement.toFixed(1)}% reduction
                </span>
                <span className="text-xs text-slate-400">
                  {result.annual_saving_kg.toFixed(0)} kg/year
                </span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}