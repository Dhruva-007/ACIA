/**
 * SimulatorPanel Component
 *
 * Interactive scenario configuration for the Carbon Impact Simulator.
 * Supports four scenario types:
 * 1. Replace car trips with public transport
 * 2. Reduce meat consumption
 * 3. Work remotely
 * 4. Switch energy source
 *
 * The submitLabel prop allows the parent to customize the
 * button text — used by the Scenario Planner to say "Add to Plan +"
 * instead of "Run Simulation 🔬".
 *
 * All emission calculations use CO₂e factors.
 */

import { useState } from 'react'
import { SIMULATION_SCENARIO_LABELS } from '../../utils/constants'
import type { SimulationScenarioType, SimulationInput } from '../../types/simulation.types'

interface SimulatorPanelProps {
  onSimulate: (input: SimulationInput) => void
  isSimulating: boolean
  /** Optional button label override. Defaults to "Run Simulation 🔬". */
  submitLabel?: string
}

const SCENARIO_TYPES: { value: SimulationScenarioType; icon: string }[] = [
  { value: 'replace_car_trips', icon: '🚌' },
  { value: 'reduce_meat', icon: '🥗' },
  { value: 'remote_work', icon: '🏠' },
  { value: 'switch_energy_source', icon: '☀️' },
]

export default function SimulatorPanel({
  onSimulate,
  isSimulating,
  submitLabel = 'Run Simulation 🔬',
}: SimulatorPanelProps) {
  const [scenarioType, setScenarioType] = useState<SimulationScenarioType>('replace_car_trips')

  // Replace car trips parameters
  const [tripsPerWeek, setTripsPerWeek] = useState('2')
  const [tripDistance, setTripDistance] = useState('15')
  const [currentVehicle, setCurrentVehicle] = useState('car_petrol')

  // Reduce meat parameters
  const [mealsChanged, setMealsChanged] = useState('3')
  const [fromMeatType, setFromMeatType] = useState('beef')
  const [toMealType, setToMealType] = useState('vegetarian')

  // Remote work parameters
  const [remoteDays, setRemoteDays] = useState('2')
  const [commuteDistance, setCommuteDistance] = useState('15')
  const [commuteVehicle, setCommuteVehicle] = useState('car_petrol')

  // Switch energy parameters
  const [currentSource, setCurrentSource] = useState('grid_average')
  const [monthlyKwh, setMonthlyKwh] = useState('300')

  function buildSimulationInput(): SimulationInput {
    switch (scenarioType) {
      case 'replace_car_trips':
        return {
          scenario_type: 'replace_car_trips',
          parameters: {
            trips_per_week: Number(tripsPerWeek),
            one_way_distance_km: Number(tripDistance),
            current_vehicle: currentVehicle,
          },
        }
      case 'reduce_meat':
        return {
          scenario_type: 'reduce_meat',
          parameters: {
            meals_changed_per_week: Number(mealsChanged),
            from_type: fromMeatType as 'beef' | 'chicken' | 'pork',
            to_type: toMealType as 'vegetarian' | 'vegan' | 'fish',
          },
        }
      case 'remote_work':
        return {
          scenario_type: 'remote_work',
          parameters: {
            remote_days_per_week: Number(remoteDays),
            commute_distance_km: Number(commuteDistance),
            vehicle_type: commuteVehicle,
          },
        }
      case 'switch_energy_source':
        return {
          scenario_type: 'switch_energy_source',
          parameters: {
            current_source: currentSource as 'grid_average' | 'gas_heavy',
            target_source: 'renewable' as const,
            monthly_kwh: Number(monthlyKwh),
          },
        }
    }
  }

  function handleSimulate(): void {
    const input = buildSimulationInput()
    onSimulate(input)
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6">
      <h3 className="text-sm font-medium text-slate-500 mb-4">Configure Scenario</h3>

      {/* Scenario Type Selector */}
      <div className="grid grid-cols-2 gap-2 mb-6">
        {SCENARIO_TYPES.map((scenario) => (
          <button
            key={scenario.value}
            onClick={() => setScenarioType(scenario.value)}
            className={`flex items-center gap-2 p-3 rounded-xl border text-left text-sm transition-all duration-200 ${
              scenarioType === scenario.value
                ? 'border-primary-500 bg-primary-50 text-primary-700 font-medium'
                : 'border-slate-200 text-slate-600 hover:border-slate-300'
            }`}
          >
            <span className="text-lg" aria-hidden="true">{scenario.icon}</span>
            <span className="text-xs leading-tight">
              {SIMULATION_SCENARIO_LABELS[scenario.value]}
            </span>
          </button>
        ))}
      </div>

      {/* Scenario-specific Parameters */}
      <div className="space-y-4 mb-6">
        {scenarioType === 'replace_car_trips' && (
          <>
            <div>
              <label htmlFor="sim-trips" className="label-base">
                Car trips to replace per week
              </label>
              <input
                id="sim-trips"
                type="number"
                min="1"
                max="14"
                value={tripsPerWeek}
                onChange={(e) => setTripsPerWeek(e.target.value)}
                className="input-base"
              />
            </div>
            <div>
              <label htmlFor="sim-distance" className="label-base">
                One-way distance per trip (km)
              </label>
              <input
                id="sim-distance"
                type="number"
                min="1"
                max="200"
                value={tripDistance}
                onChange={(e) => setTripDistance(e.target.value)}
                className="input-base"
              />
            </div>
            <div>
              <label htmlFor="sim-vehicle" className="label-base">
                Current vehicle type
              </label>
              <select
                id="sim-vehicle"
                value={currentVehicle}
                onChange={(e) => setCurrentVehicle(e.target.value)}
                className="input-base"
              >
                <option value="car_petrol">Petrol Car</option>
                <option value="car_diesel">Diesel Car</option>
                <option value="car_electric">Electric Car</option>
              </select>
            </div>
          </>
        )}

        {scenarioType === 'reduce_meat' && (
          <>
            <div>
              <label htmlFor="sim-meals" className="label-base">
                Meals to change per week
              </label>
              <input
                id="sim-meals"
                type="number"
                min="1"
                max="21"
                value={mealsChanged}
                onChange={(e) => setMealsChanged(e.target.value)}
                className="input-base"
              />
            </div>
            <div>
              <label htmlFor="sim-from-meat" className="label-base">
                Currently eating
              </label>
              <select
                id="sim-from-meat"
                value={fromMeatType}
                onChange={(e) => setFromMeatType(e.target.value)}
                className="input-base"
              >
                <option value="beef">Beef</option>
                <option value="chicken">Chicken</option>
                <option value="pork">Pork</option>
              </select>
            </div>
            <div>
              <label htmlFor="sim-to-meal" className="label-base">
                Switching to
              </label>
              <select
                id="sim-to-meal"
                value={toMealType}
                onChange={(e) => setToMealType(e.target.value)}
                className="input-base"
              >
                <option value="vegetarian">Vegetarian</option>
                <option value="vegan">Vegan</option>
                <option value="fish">Fish</option>
              </select>
            </div>
          </>
        )}

        {scenarioType === 'remote_work' && (
          <>
            <div>
              <label htmlFor="sim-remote-days" className="label-base">
                Remote work days per week
              </label>
              <input
                id="sim-remote-days"
                type="number"
                min="1"
                max="5"
                value={remoteDays}
                onChange={(e) => setRemoteDays(e.target.value)}
                className="input-base"
              />
            </div>
            <div>
              <label htmlFor="sim-commute-dist" className="label-base">
                Commute distance one-way (km)
              </label>
              <input
                id="sim-commute-dist"
                type="number"
                min="1"
                max="200"
                value={commuteDistance}
                onChange={(e) => setCommuteDistance(e.target.value)}
                className="input-base"
              />
            </div>
            <div>
              <label htmlFor="sim-commute-vehicle" className="label-base">
                Commute vehicle
              </label>
              <select
                id="sim-commute-vehicle"
                value={commuteVehicle}
                onChange={(e) => setCommuteVehicle(e.target.value)}
                className="input-base"
              >
                <option value="car_petrol">Petrol Car</option>
                <option value="car_diesel">Diesel Car</option>
                <option value="car_electric">Electric Car</option>
                <option value="motorcycle">Motorcycle</option>
              </select>
            </div>
          </>
        )}

        {scenarioType === 'switch_energy_source' && (
          <>
            <div>
              <label htmlFor="sim-current-source" className="label-base">
                Current energy source
              </label>
              <select
                id="sim-current-source"
                value={currentSource}
                onChange={(e) => setCurrentSource(e.target.value)}
                className="input-base"
              >
                <option value="grid_average">Grid Average</option>
                <option value="gas_heavy">Gas Heavy</option>
              </select>
            </div>
            <div>
              <label htmlFor="sim-kwh" className="label-base">
                Monthly electricity consumption (kWh)
              </label>
              <input
                id="sim-kwh"
                type="number"
                min="1"
                max="99999"
                value={monthlyKwh}
                onChange={(e) => setMonthlyKwh(e.target.value)}
                className="input-base"
              />
            </div>
            <div className="bg-green-50 border border-green-100 rounded-lg p-3">
              <p className="text-xs text-green-700">
                Target: Switching to 100% renewable energy
              </p>
            </div>
          </>
        )}
      </div>

      {/* Submit Button */}
      <button
        onClick={handleSimulate}
        disabled={isSimulating}
        className="btn-primary w-full py-3"
      >
        {isSimulating ? 'Calculating...' : submitLabel}
      </button>
    </div>
  )
}