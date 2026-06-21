/**
 * EmissionLogForm Component
 *
 * Allows users to manually log specific activities that
 * contribute to their carbon footprint. Each log updates
 * the daily emission record.
 *
 * Activity types:
 * - Drive (distance in km)
 * - Flight (hours)
 * - Meal type
 * - Purchase
 *
 * Practical usability: Users can refine their footprint
 * beyond the onboarding estimates.
 */

import { useState } from 'react'
import toast from 'react-hot-toast'
import type { EmissionCategory } from '../../types/carbon.types'
import { CATEGORY_ICONS, CATEGORY_LABELS } from '../../utils/constants'

interface EmissionLogFormProps {
  onLog: (category: EmissionCategory, description: string, estimatedKg: number) => void
  isSubmitting: boolean
}

interface LogEntry {
  category: EmissionCategory
  type: string
  label: string
  unit: string
  factorKgPerUnit: number
  placeholder: string
}

const LOG_ENTRIES: LogEntry[] = [
  {
    category: 'transport',
    type: 'car_trip',
    label: 'Car trip',
    unit: 'km',
    factorKgPerUnit: 0.21,
    placeholder: 'Distance in km',
  },
  {
    category: 'transport',
    type: 'bus_trip',
    label: 'Bus trip',
    unit: 'km',
    factorKgPerUnit: 0.089,
    placeholder: 'Distance in km',
  },
  {
    category: 'transport',
    type: 'flight',
    label: 'Flight',
    unit: 'hours',
    factorKgPerUnit: 90,
    placeholder: 'Duration in hours',
  },
  {
    category: 'food',
    type: 'beef_meal',
    label: 'Beef meal',
    unit: 'meals',
    factorKgPerUnit: 2.5,
    placeholder: 'Number of meals',
  },
  {
    category: 'food',
    type: 'vegetarian_meal',
    label: 'Vegetarian meal',
    unit: 'meals',
    factorKgPerUnit: 0.3,
    placeholder: 'Number of meals',
  },
  {
    category: 'shopping',
    type: 'online_purchase',
    label: 'Online purchase',
    unit: 'items',
    factorKgPerUnit: 5,
    placeholder: 'Number of items',
  },
]

export default function EmissionLogForm({ onLog, isSubmitting }: EmissionLogFormProps) {
  const [selectedEntry, setSelectedEntry] = useState<LogEntry>(LOG_ENTRIES[0])
  const [amount, setAmount] = useState('')

  function handleSubmit(): void {
    const numAmount = Number(amount)
    if (isNaN(numAmount) || numAmount <= 0) {
      toast.error('Please enter a valid positive number')
      return
    }

    const estimatedKg = numAmount * selectedEntry.factorKgPerUnit
    const description = `${selectedEntry.label}: ${numAmount} ${selectedEntry.unit}`

    onLog(selectedEntry.category, description, estimatedKg)
    setAmount('')
    toast.success(`Logged ${estimatedKg.toFixed(2)} kg CO₂ for ${selectedEntry.label}`)
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6">
      <p className="text-sm font-medium text-slate-500 mb-4">Log Activity</p>

      <div className="space-y-4">
        {/* Activity Type Selector */}
        <div>
          <label htmlFor="activity-type" className="label-base">
            Activity type
          </label>
          <select
            id="activity-type"
            value={`${selectedEntry.category}-${selectedEntry.type}`}
            onChange={(e) => {
              const found = LOG_ENTRIES.find(
                (entry) => `${entry.category}-${entry.type}` === e.target.value
              )
              if (found) setSelectedEntry(found)
            }}
            className="input-base"
          >
            {LOG_ENTRIES.map((entry) => (
              <option
                key={`${entry.category}-${entry.type}`}
                value={`${entry.category}-${entry.type}`}
              >
                {CATEGORY_ICONS[entry.category]} {entry.label} ({entry.unit})
              </option>
            ))}
          </select>
        </div>

        {/* Amount Input */}
        <div>
          <label htmlFor="activity-amount" className="label-base">
            Amount ({selectedEntry.unit})
          </label>
          <input
            id="activity-amount"
            type="number"
            min="0"
            step="0.1"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="input-base"
            placeholder={selectedEntry.placeholder}
          />
          {amount && Number(amount) > 0 && (
            <p className="text-xs text-slate-400 mt-1">
              Estimated: {(Number(amount) * selectedEntry.factorKgPerUnit).toFixed(2)} kg CO₂
              <span className="text-slate-300 ml-1">
                (Factor: {selectedEntry.factorKgPerUnit} kg CO₂/{selectedEntry.unit})
              </span>
            </p>
          )}
        </div>

        {/* Category Badge */}
        <div className="flex items-center gap-2">
          <span className="text-sm" aria-hidden="true">
            {CATEGORY_ICONS[selectedEntry.category]}
          </span>
          <span className="text-xs text-slate-500">
            {CATEGORY_LABELS[selectedEntry.category]}
          </span>
        </div>

        {/* Submit */}
        <button
          onClick={handleSubmit}
          disabled={isSubmitting || !amount || Number(amount) <= 0}
          className="btn-primary w-full py-2.5"
        >
          {isSubmitting ? 'Logging...' : 'Log Activity'}
        </button>
      </div>
    </div>
  )
}