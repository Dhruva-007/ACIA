/**
 * OnboardingWizard Component
 *
 * Orchestrates the multi-step onboarding flow.
 *
 * Supports two modes:
 * 1. Full mode (default): all 4 steps in sequence — used for new user onboarding
 * 2. Single step mode: shows only one step — used for adaptive re-onboarding
 *    when a user wants to update just one lifestyle category (Section 1)
 *
 * Data is preserved when navigating back to previous steps
 * so users never lose their inputs.
 */

import { useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import type {
  TransportInput,
  EnergyInput,
  FoodInput,
  ShoppingInput,
  UserLifestyleInput,
} from '../../types/carbon.types'
import type { OnboardingStep } from '../../types/user.types'
import { Analytics } from '../../services/analyticsService'
import apiClient from '../../services/api'
import { API_ENDPOINTS } from '../../utils/constants'
import ProgressBar from '../../components/shared/ProgressBar'
import TransportStep from './TransportStep'
import EnergyStep from './EnergyStep'
import FoodStep from './FoodStep'
import ShoppingStep from './ShoppingStep'

const STEPS: OnboardingStep[] = ['transport', 'energy', 'food', 'shopping']

const STEP_LABELS: Record<OnboardingStep, string> = {
  transport: 'Transportation',
  energy: 'Energy',
  food: 'Food & Diet',
  shopping: 'Shopping',
  complete: 'Complete',
}

interface OnboardingWizardProps {
  /**
   * When true, renders only the step matching initialStep.
   * Used for the adaptive re-onboarding monthly review flow.
   * Default: false (full four-step onboarding).
   */
  singleStepMode?: boolean

  /**
   * The step to show when singleStepMode is true.
   * Ignored when singleStepMode is false.
   */
  initialStep?: OnboardingStep

  /**
   * Existing lifestyle data to pre-populate steps.
   * Used in singleStepMode so the user sees current values.
   */
  prefillData?: Partial<UserLifestyleInput>

  /**
   * Called when a single-step update completes successfully.
   * Only used in singleStepMode.
   */
  onSingleStepComplete?: () => void
}

export default function OnboardingWizard({
  singleStepMode = false,
  initialStep = 'transport',
  prefillData,
  onSingleStepComplete,
}: OnboardingWizardProps) {
  const navigate = useNavigate()
  const [currentStep, setCurrentStep] = useState<OnboardingStep>(
    singleStepMode ? initialStep : 'transport'
  )
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [onboardingStartTime] = useState(Date.now())

  // Accumulated data from each step
  const [transportData, setTransportData] = useState<TransportInput | undefined>(
    prefillData?.transport
  )
  const [energyData, setEnergyData] = useState<EnergyInput | undefined>(
    prefillData?.energy
  )
  const [foodData, setFoodData] = useState<FoodInput | undefined>(
    prefillData?.food
  )

  // Track onboarding start
  useState(() => {
    if (!singleStepMode) {
      Analytics.onboardingStarted()
    }
  })

  const currentStepIndex = STEPS.indexOf(currentStep)
  const progressPercentage = singleStepMode
    ? 75 // Show near-complete progress for single step mode
    : (currentStepIndex / STEPS.length) * 100

  // ─── Single Step Submit ───────────────────────────────────────────────────

  async function submitQuickUpdate(
    category: OnboardingStep,
    data: TransportInput | EnergyInput | FoodInput | ShoppingInput
  ): Promise<void> {
    setIsSubmitting(true)
    try {
      await apiClient.put(API_ENDPOINTS.PROFILE_QUICK_UPDATE, {
        category,
        data,
      })
      toast.success('Profile updated successfully! 🌱')
      Analytics.profileUpdated()
      onSingleStepComplete?.()
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update profile'
      toast.error(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  // ─── Full Onboarding Handlers ─────────────────────────────────────────────

  const handleTransportNext = useCallback((data: TransportInput) => {
    setTransportData(data)
    if (singleStepMode) {
      void submitQuickUpdate('transport', data)
    } else {
      setCurrentStep('energy')
    }
  }, [singleStepMode]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleEnergyNext = useCallback((data: EnergyInput) => {
    setEnergyData(data)
    if (singleStepMode) {
      void submitQuickUpdate('energy', data)
    } else {
      setCurrentStep('food')
    }
  }, [singleStepMode]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleFoodNext = useCallback((data: FoodInput) => {
    setFoodData(data)
    if (singleStepMode) {
      void submitQuickUpdate('food', data)
    } else {
      setCurrentStep('shopping')
    }
  }, [singleStepMode]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleShoppingComplete = useCallback(
    async (shoppingData: ShoppingInput) => {
      if (singleStepMode) {
        await submitQuickUpdate('shopping', shoppingData)
        return
      }

      if (!transportData || !energyData || !foodData) {
        toast.error('Some data is missing. Please go back and complete all steps.')
        return
      }

      const lifestyleInput: UserLifestyleInput = {
        transport: transportData,
        energy: energyData,
        food: foodData,
        shopping: shoppingData,
      }

      setIsSubmitting(true)
      try {
        await apiClient.post(API_ENDPOINTS.PROFILE_SETUP, lifestyleInput)

        const timeToComplete = Math.round((Date.now() - onboardingStartTime) / 1000)
        Analytics.onboardingCompleted(timeToComplete)

        toast.success('Your carbon footprint has been calculated! 🌱')
        navigate('/dashboard', { replace: true })
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to save profile'
        toast.error(message)
      } finally {
        setIsSubmitting(false)
      }
    },
    [transportData, energyData, foodData, navigate, onboardingStartTime, singleStepMode],
  )

  const handleBack = useCallback(() => {
    const prevIndex = currentStepIndex - 1
    if (prevIndex >= 0) {
      setCurrentStep(STEPS[prevIndex])
    }
  }, [currentStepIndex])

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="max-w-lg mx-auto">
      {/* Step Indicator — hidden in single step mode */}
      {!singleStepMode && (
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            {STEPS.map((step, index) => (
              <div key={step} className="flex items-center">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors duration-200 ${
                    index <= currentStepIndex
                      ? 'bg-primary-600 text-white'
                      : 'bg-slate-200 text-slate-500'
                  }`}
                  aria-current={step === currentStep ? 'step' : undefined}
                >
                  {index + 1}
                </div>
                {index < STEPS.length - 1 && (
                  <div
                    className={`w-12 sm:w-16 h-0.5 mx-1 transition-colors duration-200 ${
                      index < currentStepIndex ? 'bg-primary-600' : 'bg-slate-200'
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
          <ProgressBar
            percentage={progressPercentage}
            label={`Step ${currentStepIndex + 1} of ${STEPS.length}: ${STEP_LABELS[currentStep]}`}
          />
        </div>
      )}

      {/* Single Step Mode Header */}
      {singleStepMode && (
        <div className="mb-4">
          <h3 className="text-base font-semibold text-slate-900">
            Update {STEP_LABELS[currentStep]}
          </h3>
          <p className="text-sm text-slate-500 mt-1">
            Review and update your current inputs. Changes will recalculate your footprint.
          </p>
        </div>
      )}

      {/* Step Content */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-sm">
        {currentStep === 'transport' && (
          <TransportStep
            initialData={transportData ?? prefillData?.transport}
            onNext={handleTransportNext}
          />
        )}
        {currentStep === 'energy' && (
          <EnergyStep
            initialData={energyData ?? prefillData?.energy}
            onNext={handleEnergyNext}
            onBack={singleStepMode ? undefined : handleBack}
          />
        )}
        {currentStep === 'food' && (
          <FoodStep
            initialData={foodData ?? prefillData?.food}
            onNext={handleFoodNext}
            onBack={singleStepMode ? undefined : handleBack}
          />
        )}
        {currentStep === 'shopping' && (
          <ShoppingStep
            initialData={prefillData?.shopping}
            onComplete={handleShoppingComplete}
            onBack={singleStepMode ? undefined : handleBack}
            isSubmitting={isSubmitting}
          />
        )}
      </div>

      {/* Footer */}
      {!singleStepMode && (
        <p className="text-center text-xs text-slate-400 mt-6">
          Your data is used only to calculate your personal carbon footprint.
          You can update these inputs at any time in Settings.
        </p>
      )}
    </div>
  )
}