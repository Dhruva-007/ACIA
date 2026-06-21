/**
 * EnergyStep Component
 *
 * Second step of the onboarding wizard.
 * Captures household energy consumption data.
 *
 * onBack is optional — it is undefined in single-step mode.
 */

import { useState } from 'react'
import type { EnergyInput, EnergySource } from '../../types/carbon.types'
import { validateMonthlyKwh, validateHouseholdSize } from '../../utils/validators'

interface EnergyStepProps {
  initialData?: Partial<EnergyInput>
  onNext: (data: EnergyInput) => void
  /** Optional — undefined in single-step mode */
  onBack?: () => void
}

const ENERGY_SOURCES: { value: EnergySource; label: string; description: string }[] = [
  {
    value: 'grid_average',
    label: 'Grid Average',
    description: 'Standard electricity from the grid',
  },
  {
    value: 'renewable',
    label: 'Renewable',
    description: 'Solar, wind, or other renewable sources',
  },
  {
    value: 'gas_heavy',
    label: 'Gas Heavy',
    description: 'Primarily natural gas heating',
  },
]

const HEATING_TYPES = [
  { value: 'electric', label: 'Electric heating' },
  { value: 'gas', label: 'Gas boiler' },
  { value: 'heat_pump', label: 'Heat pump' },
  { value: 'district', label: 'District heating' },
  { value: 'none', label: 'No heating needed' },
]

export default function EnergyStep({ initialData, onNext, onBack }: EnergyStepProps) {
  const [householdSize, setHouseholdSize] = useState(
    initialData?.household_size?.toString() ?? ''
  )
  const [energySource, setEnergySource] = useState<EnergySource>(
    initialData?.energy_source ?? 'grid_average'
  )
  const [monthlyKwh, setMonthlyKwh] = useState(
    initialData?.monthly_kwh?.toString() ?? ''
  )
  const [heatingType, setHeatingType] = useState(
    initialData?.heating_type ?? 'electric'
  )
  const [errors, setErrors] = useState<Record<string, string>>({})

  function validate(): boolean {
    const newErrors: Record<string, string> = {}

    if (!householdSize.trim()) {
      newErrors.householdSize = 'Please enter your household size'
    } else {
      const sizeError = validateHouseholdSize(householdSize)
      if (sizeError) newErrors.householdSize = sizeError
    }

    if (!monthlyKwh.trim()) {
      newErrors.monthlyKwh = 'Please enter your monthly electricity consumption'
    } else {
      const kwhError = validateMonthlyKwh(monthlyKwh)
      if (kwhError) newErrors.monthlyKwh = kwhError
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  function handleNext(): void {
    if (!validate()) return

    onNext({
      household_size: Number(householdSize),
      energy_source: energySource,
      monthly_kwh: Number(monthlyKwh),
      heating_type: heatingType,
    })
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h2 className="text-xl font-semibold text-slate-900 flex items-center gap-2">
          <span aria-hidden="true">⚡</span>
          Energy Consumption
        </h2>
        <p className="text-slate-600 mt-1">
          Tell us about your home energy usage. This includes electricity and heating.
        </p>
      </div>

      {/* Household Size */}
      <div>
        <label htmlFor="household-size" className="label-base">
          Household size (number of people)
        </label>
        <input
          id="household-size"
          type="number"
          min="1"
          max="20"
          step="1"
          value={householdSize}
          onChange={(e) => {
            setHouseholdSize(e.target.value)
            if (errors.householdSize) setErrors((prev) => ({ ...prev, householdSize: '' }))
          }}
          className={`input-base ${errors.householdSize ? 'border-red-500 ring-1 ring-red-500' : ''}`}
          placeholder="e.g., 3"
          aria-invalid={!!errors.householdSize}
          aria-describedby={errors.householdSize ? 'household-error' : undefined}
        />
        {errors.householdSize && (
          <p id="household-error" className="error-text" role="alert">
            {errors.householdSize}
          </p>
        )}
      </div>

      {/* Energy Source */}
      <div>
        <fieldset>
          <legend className="label-base">Primary energy source</legend>
          <div className="grid gap-3 mt-2">
            {ENERGY_SOURCES.map((source) => (
              <label
                key={source.value}
                className={`flex items-start gap-3 p-3 border rounded-xl cursor-pointer transition-colors duration-200 ${
                  energySource === source.value
                    ? 'border-primary-500 bg-primary-50'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <input
                  type="radio"
                  name="energy-source"
                  value={source.value}
                  checked={energySource === source.value}
                  onChange={(e) => setEnergySource(e.target.value as EnergySource)}
                  className="mt-0.5 text-primary-600 focus:ring-primary-500"
                />
                <div>
                  <span className="text-sm font-medium text-slate-900">{source.label}</span>
                  <p className="text-xs text-slate-500">{source.description}</p>
                </div>
              </label>
            ))}
          </div>
        </fieldset>
      </div>

      {/* Monthly kWh */}
      <div>
        <label htmlFor="monthly-kwh" className="label-base">
          Monthly electricity consumption (kWh)
        </label>
        <input
          id="monthly-kwh"
          type="number"
          min="0"
          max="99999"
          step="1"
          value={monthlyKwh}
          onChange={(e) => {
            setMonthlyKwh(e.target.value)
            if (errors.monthlyKwh) setErrors((prev) => ({ ...prev, monthlyKwh: '' }))
          }}
          className={`input-base ${errors.monthlyKwh ? 'border-red-500 ring-1 ring-red-500' : ''}`}
          placeholder="e.g., 300"
          aria-invalid={!!errors.monthlyKwh}
          aria-describedby={errors.monthlyKwh ? 'kwh-error' : 'kwh-help'}
        />
        {errors.monthlyKwh ? (
          <p id="kwh-error" className="error-text" role="alert">
            {errors.monthlyKwh}
          </p>
        ) : (
          <p id="kwh-help" className="text-xs text-slate-400 mt-1">
            Check your electricity bill. Average household uses 250–400 kWh/month.
          </p>
        )}
      </div>

      {/* Heating Type */}
      <div>
        <label htmlFor="heating-type" className="label-base">
          Heating type
        </label>
        <select
          id="heating-type"
          value={heatingType}
          onChange={(e) => setHeatingType(e.target.value)}
          className="input-base"
        >
          {HEATING_TYPES.map((type) => (
            <option key={type.value} value={type.value}>
              {type.label}
            </option>
          ))}
        </select>
      </div>

      {/* Navigation Buttons */}
      <div className="flex gap-3 pt-4">
        {onBack && (
          <button onClick={onBack} className="btn-secondary flex-1 py-3">
            ← Back
          </button>
        )}
        <button
          onClick={handleNext}
          className={`btn-primary py-3 ${onBack ? 'flex-1' : 'w-full'}`}
        >
          {onBack ? 'Next: Food →' : 'Save Changes'}
        </button>
      </div>
    </div>
  )
}