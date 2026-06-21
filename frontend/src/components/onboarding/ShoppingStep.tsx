/**
 * ShoppingStep Component
 *
 * Fourth and final step of the onboarding wizard.
 * Captures shopping habits including frequency, second-hand
 * preference, and electronics purchases.
 */

import { useState } from 'react'
import type { ShoppingInput, ShoppingFrequency } from '../../types/carbon.types'
import { validateElectronicsYearly, validatePercentage } from '../../utils/validators'

interface ShoppingStepProps {
  initialData?: Partial<ShoppingInput>
  onComplete: (data: ShoppingInput) => void
  onBack?: () => void
  isSubmitting: boolean
}

const SPENDING_CATEGORIES: { value: ShoppingFrequency; label: string; description: string }[] = [
  { value: 'minimal', label: 'Minimal', description: 'I rarely buy non-essential items' },
  { value: 'moderate', label: 'Moderate', description: 'I shop occasionally for things I need' },
  { value: 'frequent', label: 'Frequent', description: 'I shop regularly and enjoy it' },
]

export default function ShoppingStep({
  initialData,
  onComplete,
  onBack,
  isSubmitting,
}: ShoppingStepProps) {
  const [spendCategory, setSpendCategory] = useState<ShoppingFrequency>(
    initialData?.monthly_spend_category ?? 'moderate'
  )
  const [secondHandPercentage, setSecondHandPercentage] = useState(
    initialData?.second_hand_percentage?.toString() ?? '10'
  )
  const [electronicsYearly, setElectronicsYearly] = useState(
    initialData?.electronics_yearly?.toString() ?? '2'
  )
  const [errors, setErrors] = useState<Record<string, string>>({})

  function validate(): boolean {
    const newErrors: Record<string, string> = {}

    const percentageError = validatePercentage(secondHandPercentage, 'Second-hand percentage')
    if (percentageError) newErrors.secondHandPercentage = percentageError

    const electronicsError = validateElectronicsYearly(electronicsYearly)
    if (electronicsError) newErrors.electronicsYearly = electronicsError

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  function handleComplete(): void {
    if (!validate()) return

    onComplete({
      monthly_spend_category: spendCategory,
      second_hand_percentage: Number(secondHandPercentage),
      electronics_yearly: Number(electronicsYearly),
    })
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h2 className="text-xl font-semibold text-slate-900 flex items-center gap-2">
          <span aria-hidden="true">🛍️</span>
          Shopping Habits
        </h2>
        <p className="text-slate-600 mt-1">
          Every product has a carbon footprint from manufacturing and shipping. Let&apos;s understand your shopping patterns.
        </p>
      </div>

      {/* Spending Category */}
      <div>
        <fieldset>
          <legend className="label-base">How would you describe your shopping habits?</legend>
          <div className="grid gap-3 mt-2">
            {SPENDING_CATEGORIES.map((cat) => (
              <label
                key={cat.value}
                className={`flex items-center gap-3 p-3 border rounded-xl cursor-pointer transition-colors duration-200 ${
                  spendCategory === cat.value
                    ? 'border-primary-500 bg-primary-50'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <input
                  type="radio"
                  name="spend-category"
                  value={cat.value}
                  checked={spendCategory === cat.value}
                  onChange={(e) => setSpendCategory(e.target.value as ShoppingFrequency)}
                  className="text-primary-600 focus:ring-primary-500"
                />
                <div>
                  <span className="text-sm font-medium text-slate-900">{cat.label}</span>
                  <p className="text-xs text-slate-500">{cat.description}</p>
                </div>
              </label>
            ))}
          </div>
        </fieldset>
      </div>

      {/* Second-hand Percentage */}
      <div>
        <label htmlFor="second-hand" className="label-base">
          What percentage of your purchases are second-hand? ({secondHandPercentage}%)
        </label>
        <input
          id="second-hand"
          type="range"
          min="0"
          max="100"
          step="5"
          value={secondHandPercentage}
          onChange={(e) => setSecondHandPercentage(e.target.value)}
          className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-primary-600"
        />
        <div className="flex justify-between text-xs text-slate-400 mt-1">
          <span>0% (all new)</span>
          <span>100% (all second-hand)</span>
        </div>
      </div>

      {/* Electronics Yearly */}
      <div>
        <label htmlFor="electronics" className="label-base">
          How many electronics devices do you buy per year?
        </label>
        <input
          id="electronics"
          type="number"
          min="0"
          max="100"
          step="1"
          value={electronicsYearly}
          onChange={(e) => {
            setElectronicsYearly(e.target.value)
            if (errors.electronicsYearly) setErrors((prev) => ({ ...prev, electronicsYearly: '' }))
          }}
          className={`input-base ${errors.electronicsYearly ? 'border-red-500 ring-1 ring-red-500' : ''}`}
          placeholder="e.g., 2"
          aria-invalid={!!errors.electronicsYearly}
          aria-describedby={errors.electronicsYearly ? 'electronics-error' : 'electronics-help'}
        />
        {errors.electronicsYearly ? (
          <p id="electronics-error" className="error-text" role="alert">
            {errors.electronicsYearly}
          </p>
        ) : (
          <p id="electronics-help" className="text-xs text-slate-400 mt-1">
            Includes phones, laptops, tablets, TVs, etc.
          </p>
        )}
      </div>

      {/* Navigation Buttons */}
      <div className="flex gap-3 pt-4">
        {onBack && (
          <button onClick={onBack} className="btn-secondary flex-1 py-3" disabled={isSubmitting}>
            ← Back
          </button>
        )}
        <button
          onClick={handleComplete}
          className={`btn-primary py-3 ${onBack ? 'flex-1' : 'w-full'}`}
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Calculating...' : onBack ? 'Calculate My Footprint 🌱' : 'Save Changes'}
        </button>
      </div>
    </div>
  )
}