/**
 * TransportStep Component
 *
 * First step of the onboarding wizard.
 * Captures transportation habits that are typically the
 * largest carbon emission source for individuals.
 *
 * All inputs are validated before proceeding.
 * Labels, placeholders, and error messages are designed
 * to be understandable by non-technical users.
 */

import { useState } from 'react'
import type { TransportInput, TransportMode } from '../../types/carbon.types'
import { TRANSPORT_MODE_LABELS } from '../../utils/constants'
import { validateDailyDistance, validateFlightHours } from '../../utils/validators'

interface TransportStepProps {
  /** Initial data if the user returns to this step. */
  initialData?: Partial<TransportInput>
  /** Called with validated data when user clicks Next. */
  onNext: (data: TransportInput) => void
}

const TRANSPORT_MODES: TransportMode[] = [
  'car_petrol',
  'car_diesel',
  'car_electric',
  'motorcycle',
  'public_transport',
  'bicycle',
  'walking',
]

export default function TransportStep({ initialData, onNext }: TransportStepProps) {
  const [primaryMode, setPrimaryMode] = useState<TransportMode>(
    initialData?.primary_mode ?? 'car_petrol'
  )
  const [dailyDistance, setDailyDistance] = useState(
    initialData?.daily_distance_km?.toString() ?? ''
  )
  const [flightHours, setFlightHours] = useState(
    initialData?.weekly_flight_hours?.toString() ?? '0'
  )
  const [passengers, setPassengers] = useState(
    initialData?.car_passengers_avg?.toString() ?? '1'
  )
  const [errors, setErrors] = useState<Record<string, string>>({})

  function validate(): boolean {
    const newErrors: Record<string, string> = {}

    const distanceError = validateDailyDistance(dailyDistance)
    if (distanceError) newErrors.dailyDistance = distanceError

    if (!dailyDistance.trim()) newErrors.dailyDistance = 'Please enter your daily commute distance'

    const flightError = validateFlightHours(flightHours)
    if (flightError) newErrors.flightHours = flightError

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  function handleNext(): void {
    if (!validate()) return

    onNext({
      primary_mode: primaryMode,
      daily_distance_km: Number(dailyDistance),
      weekly_flight_hours: Number(flightHours),
      car_passengers_avg: Number(passengers),
    })
  }

  const showCarOptions = primaryMode.startsWith('car_') || primaryMode === 'motorcycle'

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h2 className="text-xl font-semibold text-slate-900 flex items-center gap-2">
          <span aria-hidden="true">🚗</span>
          Transportation
        </h2>
        <p className="text-slate-600 mt-1">
          How do you usually get around? Transportation is often the largest source of personal emissions.
        </p>
      </div>

      {/* Primary Mode */}
      <div>
        <label htmlFor="transport-mode" className="label-base">
          Primary mode of transport
        </label>
        <select
          id="transport-mode"
          value={primaryMode}
          onChange={(e) => setPrimaryMode(e.target.value as TransportMode)}
          className="input-base"
        >
          {TRANSPORT_MODES.map((mode) => (
            <option key={mode} value={mode}>
              {TRANSPORT_MODE_LABELS[mode]}
            </option>
          ))}
        </select>
      </div>

      {/* Daily Distance */}
      <div>
        <label htmlFor="daily-distance" className="label-base">
          Daily commute distance (one way, in km)
        </label>
        <input
          id="daily-distance"
          type="number"
          min="0"
          max="2000"
          step="0.1"
          value={dailyDistance}
          onChange={(e) => {
            setDailyDistance(e.target.value)
            if (errors.dailyDistance) setErrors((prev) => ({ ...prev, dailyDistance: '' }))
          }}
          className={`input-base ${errors.dailyDistance ? 'border-red-500 ring-1 ring-red-500' : ''}`}
          placeholder="e.g., 15"
          aria-invalid={!!errors.dailyDistance}
          aria-describedby={errors.dailyDistance ? 'distance-error' : undefined}
        />
        {errors.dailyDistance && (
          <p id="distance-error" className="error-text" role="alert">
            {errors.dailyDistance}
          </p>
        )}
        <p className="text-xs text-slate-400 mt-1">
          Enter 0 if you work from home or do not commute
        </p>
      </div>

      {/* Car Passengers (only if driving) */}
      {showCarOptions && (
        <div>
          <label htmlFor="passengers" className="label-base">
            Average number of passengers (including you)
          </label>
          <select
            id="passengers"
            value={passengers}
            onChange={(e) => setPassengers(e.target.value)}
            className="input-base"
          >
            <option value="1">1 (just me)</option>
            <option value="2">2</option>
            <option value="3">3</option>
            <option value="4">4+</option>
          </select>
          <p className="text-xs text-slate-400 mt-1">
            Carpooling reduces per-person emissions
          </p>
        </div>
      )}

      {/* Flight Hours */}
      <div>
        <label htmlFor="flight-hours" className="label-base">
          Average weekly flight hours
        </label>
        <input
          id="flight-hours"
          type="number"
          min="0"
          max="168"
          step="0.5"
          value={flightHours}
          onChange={(e) => {
            setFlightHours(e.target.value)
            if (errors.flightHours) setErrors((prev) => ({ ...prev, flightHours: '' }))
          }}
          className={`input-base ${errors.flightHours ? 'border-red-500 ring-1 ring-red-500' : ''}`}
          placeholder="0"
          aria-invalid={!!errors.flightHours}
          aria-describedby={errors.flightHours ? 'flight-error' : undefined}
        />
        {errors.flightHours && (
          <p id="flight-error" className="error-text" role="alert">
            {errors.flightHours}
          </p>
        )}
        <p className="text-xs text-slate-400 mt-1">
          Enter 0 if you rarely fly. Enter a weekly average if you fly occasionally.
        </p>
      </div>

      {/* Next Button */}
      <div className="pt-4">
        <button onClick={handleNext} className="btn-primary w-full py-3">
          Next: Energy →
        </button>
      </div>
    </div>
  )
}