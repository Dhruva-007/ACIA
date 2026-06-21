/**
 * FoodStep Component
 *
 * Third step of the onboarding wizard.
 * Captures dietary habits that influence food-related emissions.
 */

import { useState } from 'react'
import type { FoodInput, DietType, FoodWasteLevel } from '../../types/carbon.types'
import { DIET_TYPE_LABELS } from '../../utils/constants'

interface FoodStepProps {
  initialData?: Partial<FoodInput>
  onNext: (data: FoodInput) => void
  onBack?: () => void
}

const DIET_TYPES: DietType[] = [
  'vegan',
  'vegetarian',
  'pescatarian',
  'flexitarian',
  'omnivore',
  'high_meat',
]

const DIET_DESCRIPTIONS: Record<DietType, string> = {
  vegan: 'No animal products',
  vegetarian: 'No meat or fish, includes dairy and eggs',
  pescatarian: 'Fish but no meat',
  flexitarian: 'Mostly plant-based with occasional meat',
  omnivore: 'Regular mixed diet',
  high_meat: 'Meat in most meals',
}

const WASTE_LEVELS: { value: FoodWasteLevel; label: string; description: string }[] = [
  { value: 'low', label: 'Low', description: 'I rarely throw away food' },
  { value: 'medium', label: 'Medium', description: 'I throw away some food weekly' },
  { value: 'high', label: 'High', description: 'I frequently throw away food' },
]

export default function FoodStep({ initialData, onNext, onBack }: FoodStepProps) {
  const [dietType, setDietType] = useState<DietType>(
    initialData?.diet_type ?? 'omnivore'
  )
  const [localFoodPercentage, setLocalFoodPercentage] = useState(
    initialData?.local_food_percentage?.toString() ?? '30'
  )
  const [foodWasteLevel, setFoodWasteLevel] = useState<FoodWasteLevel>(
    initialData?.food_waste_level ?? 'medium'
  )

  function handleNext(): void {
    onNext({
      diet_type: dietType,
      local_food_percentage: Number(localFoodPercentage),
      food_waste_level: foodWasteLevel,
    })
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h2 className="text-xl font-semibold text-slate-900 flex items-center gap-2">
          <span aria-hidden="true">🍽️</span>
          Food & Diet
        </h2>
        <p className="text-slate-600 mt-1">
          Your dietary choices have a significant impact on your carbon footprint. Food production accounts for about 26% of global emissions.
        </p>
      </div>

      {/* Diet Type */}
      <div>
        <fieldset>
          <legend className="label-base">What best describes your diet?</legend>
          <div className="grid gap-2 mt-2">
            {DIET_TYPES.map((type) => (
              <label
                key={type}
                className={`flex items-center gap-3 p-3 border rounded-xl cursor-pointer transition-colors duration-200 ${
                  dietType === type
                    ? 'border-primary-500 bg-primary-50'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <input
                  type="radio"
                  name="diet-type"
                  value={type}
                  checked={dietType === type}
                  onChange={(e) => setDietType(e.target.value as DietType)}
                  className="text-primary-600 focus:ring-primary-500"
                />
                <div>
                  <span className="text-sm font-medium text-slate-900">
                    {DIET_TYPE_LABELS[type]}
                  </span>
                  <p className="text-xs text-slate-500">{DIET_DESCRIPTIONS[type]}</p>
                </div>
              </label>
            ))}
          </div>
        </fieldset>
      </div>

      {/* Local Food Percentage */}
      <div>
        <label htmlFor="local-food" className="label-base">
          How much of your food is locally sourced? ({localFoodPercentage}%)
        </label>
        <input
          id="local-food"
          type="range"
          min="0"
          max="100"
          step="5"
          value={localFoodPercentage}
          onChange={(e) => setLocalFoodPercentage(e.target.value)}
          className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-primary-600"
        />
        <div className="flex justify-between text-xs text-slate-400 mt-1">
          <span>0% (all imported)</span>
          <span>100% (all local)</span>
        </div>
      </div>

      {/* Food Waste Level */}
      <div>
        <fieldset>
          <legend className="label-base">How much food do you typically waste?</legend>
          <div className="grid gap-3 mt-2">
            {WASTE_LEVELS.map((level) => (
              <label
                key={level.value}
                className={`flex items-center gap-3 p-3 border rounded-xl cursor-pointer transition-colors duration-200 ${
                  foodWasteLevel === level.value
                    ? 'border-primary-500 bg-primary-50'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <input
                  type="radio"
                  name="food-waste"
                  value={level.value}
                  checked={foodWasteLevel === level.value}
                  onChange={(e) => setFoodWasteLevel(e.target.value as FoodWasteLevel)}
                  className="text-primary-600 focus:ring-primary-500"
                />
                <div>
                  <span className="text-sm font-medium text-slate-900">{level.label}</span>
                  <p className="text-xs text-slate-500">{level.description}</p>
                </div>
              </label>
            ))}
          </div>
        </fieldset>
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
          {onBack ? 'Next: Shopping →' : 'Save Changes'}
        </button>
      </div>
    </div>
  )
}