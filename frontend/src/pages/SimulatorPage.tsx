/**
 * SimulatorPage
 *
 * Carbon Impact Simulator with:
 * - Single scenario mode: configure and run one simulation
 * - Scenario comparison: run multiple scenarios side by side
 * - Scenario Planner (Feature 4): combine multiple actions
 *   to see combined impact and milestone achievement dates
 *
 * All values displayed in kg CO₂e.
 *
 * Directly addresses:
 * - PREDICT: simulate future impact of changes
 * - REDUCE: evaluate actions before committing
 * - Practical usability: interactive "what if" exploration
 */

import { useState } from 'react'
import toast from 'react-hot-toast'
import { useMutation } from '@tanstack/react-query'
import { useRunSimulation } from '../hooks/useSimulator'
import { createScenarioPlan } from '../services/simulatorService'
import { Analytics } from '../services/analyticsService'
import SimulatorPanel from '../components/simulator/SimulatorPanel'
import SimulationResultComponent from '../components/simulator/SimulationResult'
import ScenarioComparison from '../components/simulator/ScenarioComparison'
import type {
  SimulationInput,
  SimulationResult,
  ScenarioPlanResult,
} from '../types/simulation.types'

type PageMode = 'simulate' | 'plan'

export default function SimulatorPage() {
  const [mode, setMode] = useState<PageMode>('simulate')
  const [currentResult, setCurrentResult] = useState<SimulationResult | null>(null)
  const [allResults, setAllResults] = useState<SimulationResult[]>([])
  const [planResult, setPlanResult] = useState<ScenarioPlanResult | null>(null)
  const [planScenarios, setPlanScenarios] = useState<SimulationInput[]>([])

  const simulation = useRunSimulation()

  const planMutation = useMutation({
    mutationFn: createScenarioPlan,
    onSuccess: (result) => {
      setPlanResult(result)
      toast.success(`Plan created! Combined saving: ${result.combined_monthly_saving_kg.toFixed(1)} kg CO₂e/month`)
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : 'Plan creation failed'
      toast.error(message)
    },
  })

  function handleSimulate(input: SimulationInput): void {
    simulation.mutate(input, {
      onSuccess: (result) => {
        setCurrentResult(result)
        setAllResults((prev) => {
          const exists = prev.find((r) => r.scenario_label === result.scenario_label)
          if (exists) {
            return prev.map((r) =>
              r.scenario_label === result.scenario_label ? result : r
            )
          }
          return [...prev, result]
        })
        Analytics.simulationRun(input.scenario_type)
        toast.success('Simulation complete!')
      },
      onError: (error) => {
        const message = error instanceof Error ? error.message : 'Simulation failed'
        toast.error(message)
      },
    })
  }

  function handleAddToPlan(input: SimulationInput): void {
    const alreadyAdded = planScenarios.some(
      (s) => s.scenario_type === input.scenario_type
    )
    if (alreadyAdded) {
      toast.error('This scenario type is already in your plan.')
      return
    }
    if (planScenarios.length >= 4) {
      toast.error('Maximum 4 scenarios per plan.')
      return
    }
    setPlanScenarios((prev) => [...prev, input])
    toast.success('Scenario added to plan.')
  }

  function handleCreatePlan(): void {
    if (planScenarios.length === 0) {
      toast.error('Add at least one scenario to create a plan.')
      return
    }
    planMutation.mutate({ scenarios: planScenarios })
  }

  function handleClearComparison(): void {
    setAllResults([])
    setCurrentResult(null)
  }

  function handleClearPlan(): void {
    setPlanScenarios([])
    setPlanResult(null)
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Carbon Simulator</h2>
          <p className="text-slate-600 mt-1">
            Explore &quot;what if&quot; scenarios before committing to changes
          </p>
        </div>

        {/* Mode Toggle */}
        <div className="inline-flex bg-slate-100 rounded-xl p-1" role="radiogroup" aria-label="Simulator mode">
          <button
            onClick={() => setMode('simulate')}
            role="radio"
            aria-checked={mode === 'simulate'}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
              mode === 'simulate'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            Simulate
          </button>
          <button
            onClick={() => setMode('plan')}
            role="radio"
            aria-checked={mode === 'plan'}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
              mode === 'plan'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            Scenario Planner
          </button>
        </div>
      </div>

      {/* Explanation Banner */}
      <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
        {mode === 'simulate' ? (
          <p className="text-sm text-blue-800">
            <span className="font-medium">💡 Simulate Mode: </span>
            Run individual scenarios to see their impact. Run multiple scenarios
            to compare them side by side. All calculations use verified CO₂e
            emission factors from UK Government GHG Conversion Factors 2023 and IPCC AR6.
          </p>
        ) : (
          <p className="text-sm text-blue-800">
            <span className="font-medium">📋 Scenario Planner: </span>
            Select multiple lifestyle changes to build a combined action plan.
            See the total impact and when you&apos;ll reach key milestones like the
            Paris Agreement target. Add up to 4 scenarios.
          </p>
        )}
      </div>

      {/* Simulate Mode */}
      {mode === 'simulate' && (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <SimulatorPanel
              onSimulate={handleSimulate}
              isSimulating={simulation.isPending}
            />
            <SimulationResultComponent
              result={currentResult}
              isLoading={simulation.isPending}
            />
          </div>

          {allResults.length >= 2 && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-lg font-semibold text-slate-900">Compare Scenarios</h3>
                <button
                  onClick={handleClearComparison}
                  className="text-xs text-slate-400 hover:text-slate-600"
                >
                  Clear all
                </button>
              </div>
              <ScenarioComparison results={allResults} />
            </div>
          )}

          {allResults.length === 1 && (
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-center">
              <p className="text-sm text-slate-500">
                Run another scenario to see a side-by-side comparison.
              </p>
            </div>
          )}
        </>
      )}

      {/* Scenario Planner Mode (Feature 4) */}
      {mode === 'plan' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Scenario Configuration */}
            <SimulatorPanel
              onSimulate={handleAddToPlan}
              isSimulating={planMutation.isPending}
              submitLabel="Add to Plan +"
            />

            {/* Plan Summary */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm font-medium text-slate-500">Your Plan</p>
                {planScenarios.length > 0 && (
                  <button
                    onClick={handleClearPlan}
                    className="text-xs text-slate-400 hover:text-slate-600"
                  >
                    Clear plan
                  </button>
                )}
              </div>

              {planScenarios.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-slate-400 text-sm">No scenarios added yet.</p>
                  <p className="text-slate-300 text-xs mt-1">
                    Configure a scenario on the left and click &quot;Add to Plan&quot;.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {planScenarios.map((s, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200"
                    >
                      <span className="text-sm text-slate-700 capitalize">
                        {s.scenario_type.replace(/_/g, ' ')}
                      </span>
                      <button
                        onClick={() => setPlanScenarios((prev) => prev.filter((_, idx) => idx !== i))}
                        className="text-xs text-red-400 hover:text-red-600"
                        aria-label={`Remove ${s.scenario_type} from plan`}
                      >
                        Remove
                      </button>
                    </div>
                  ))}

                  <button
                    onClick={handleCreatePlan}
                    disabled={planMutation.isPending}
                    className="btn-primary w-full py-3 mt-4"
                  >
                    {planMutation.isPending
                      ? 'Calculating plan...'
                      : `Calculate Combined Impact (${planScenarios.length} action${planScenarios.length !== 1 ? 's' : ''})`
                    }
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Plan Result */}
          {planResult && (
            <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-5">
              <h3 className="text-base font-semibold text-slate-900">
                Combined Plan Results
              </h3>

              {/* Combined Impact Numbers */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-green-50 border border-green-100 rounded-xl p-4 text-center">
                  <p className="text-2xl font-bold text-green-700">
                    {planResult.combined_monthly_saving_kg.toFixed(1)}
                  </p>
                  <p className="text-xs text-green-600 mt-1">kg CO₂e/month saved</p>
                </div>
                <div className="bg-green-50 border border-green-100 rounded-xl p-4 text-center">
                  <p className="text-2xl font-bold text-green-700">
                    {planResult.combined_annual_saving_kg.toFixed(0)}
                  </p>
                  <p className="text-xs text-green-600 mt-1">kg CO₂e/year saved</p>
                </div>
                <div className="bg-green-50 border border-green-100 rounded-xl p-4 text-center">
                  <p className="text-2xl font-bold text-green-700">
                    {planResult.combined_percentage_improvement.toFixed(1)}%
                  </p>
                  <p className="text-xs text-green-600 mt-1">total reduction</p>
                </div>
              </div>

              {/* Summary */}
              <div className="bg-slate-50 rounded-xl p-4">
                <p className="text-sm text-slate-700">{planResult.summary}</p>
              </div>

              {/* Milestones */}
              {planResult.milestones.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-slate-700 mb-3">
                    🎯 Milestone Projections
                  </p>
                  <div className="space-y-2">
                    {planResult.milestones.map((milestone) => (
                      <div
                        key={milestone.milestone_label}
                        className={`flex items-center justify-between p-3 rounded-xl border ${
                          milestone.achievable
                            ? 'bg-green-50 border-green-100'
                            : 'bg-slate-50 border-slate-200'
                        }`}
                      >
                        <div>
                          <p className={`text-sm font-medium ${
                            milestone.achievable ? 'text-green-800' : 'text-slate-500'
                          }`}>
                            {milestone.milestone_label}
                          </p>
                          {milestone.achievable && milestone.estimated_months !== null && (
                            <p className="text-xs text-green-600">
                              {milestone.estimated_months === 0
                                ? 'Already achieved!'
                                : `In ~${milestone.estimated_months} month${milestone.estimated_months !== 1 ? 's' : ''}`}
                            </p>
                          )}
                        </div>
                        {milestone.achievable ? (
                          <span className="text-green-600 text-lg">✓</span>
                        ) : (
                          <span className="text-slate-300 text-xs">Not achievable</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}