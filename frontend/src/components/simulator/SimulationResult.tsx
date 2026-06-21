/**
 * SimulationResult Component
 *
 * Displays the output of a carbon impact simulation:
 * - Monthly carbon reduction in kg CO₂
 * - Annual carbon reduction in kg CO₂
 * - Percentage improvement
 * - Current vs projected monthly emissions
 * - Descriptive explanation
 *
 * Directly addresses the "predict" success condition.
 */

import type { SimulationResult as SimulationResultType } from '../../types/simulation.types'

interface SimulationResultProps {
  result: SimulationResultType | null
  isLoading: boolean
}

export default function SimulationResult({ result, isLoading }: SimulationResultProps) {
  if (isLoading) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-6">
        <h3 className="text-sm font-medium text-slate-500 mb-4">Simulation Result</h3>
        <div className="space-y-4 animate-pulse">
          <div className="h-20 bg-slate-100 rounded-xl" />
          <div className="h-16 bg-slate-100 rounded-xl" />
          <div className="h-12 bg-slate-100 rounded-xl" />
        </div>
      </div>
    )
  }

  if (!result) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-6">
        <h3 className="text-sm font-medium text-slate-500 mb-4">Simulation Result</h3>
        <div className="text-center py-12">
          <span className="text-4xl mb-3 block" aria-hidden="true">🔬</span>
          <p className="text-slate-500 text-sm">
            Configure a scenario and click &quot;Run Simulation&quot; to see the impact.
          </p>
          <p className="text-slate-400 text-xs mt-2">
            Try simulating what happens if you replace some car trips with public transport.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6">
      <h3 className="text-sm font-medium text-slate-500 mb-4">Simulation Result</h3>

      {/* Scenario Label */}
      <div className="mb-5">
        <h4 className="text-base font-semibold text-slate-900">
          {result.scenario_label}
        </h4>
        <p className="text-sm text-slate-600 mt-1">{result.description}</p>
      </div>

      {/* Impact Numbers */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        <div className="bg-green-50 border border-green-100 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-green-700">
            {result.monthly_saving_kg.toFixed(1)}
          </p>
          <p className="text-xs text-green-600 mt-1">kg CO₂ / month</p>
        </div>
        <div className="bg-green-50 border border-green-100 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-green-700">
            {result.annual_saving_kg.toFixed(0)}
          </p>
          <p className="text-xs text-green-600 mt-1">kg CO₂ / year</p>
        </div>
        <div className="bg-green-50 border border-green-100 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-green-700">
            {result.percentage_improvement.toFixed(1)}%
          </p>
          <p className="text-xs text-green-600 mt-1">reduction</p>
        </div>
      </div>

      {/* Before/After Comparison */}
      <div className="bg-slate-50 rounded-xl p-4">
        <p className="text-xs text-slate-400 mb-3 font-medium">Monthly Emissions Comparison</p>
        <div className="space-y-3">
          {/* Current */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-slate-500">Current</span>
              <span className="text-sm font-medium text-slate-700">
                {result.current_monthly_kg.toFixed(1)} kg CO₂
              </span>
            </div>
            <div className="w-full h-3 bg-slate-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-red-400 rounded-full"
                style={{ width: '100%' }}
              />
            </div>
          </div>

          {/* Projected */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-slate-500">After Change</span>
              <span className="text-sm font-medium text-green-600">
                {result.projected_monthly_kg.toFixed(1)} kg CO₂
              </span>
            </div>
            <div className="w-full h-3 bg-slate-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-green-400 rounded-full transition-all duration-700"
                style={{
                  width: `${(result.projected_monthly_kg / result.current_monthly_kg) * 100}%`,
                }}
              />
            </div>
          </div>
        </div>

        {/* Saving Highlight */}
        <div className="mt-3 pt-3 border-t border-slate-200">
          <p className="text-sm text-slate-700">
            <span className="font-semibold text-green-600">
              You would save {result.monthly_saving_kg.toFixed(1)} kg CO₂ per month
            </span>
            {' '}— equivalent to {result.annual_saving_kg.toFixed(0)} kg CO₂ per year.
          </p>
        </div>
      </div>
    </div>
  )
}