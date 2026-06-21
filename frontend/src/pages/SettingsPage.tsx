/**
 * SettingsPage
 *
 * User settings and profile management:
 * - Profile information display
 * - Lifestyle data review and edit navigation
 * - Application preferences
 * - Account management (sign out, data info)
 *
 * Allows users to update their lifestyle inputs which
 * triggers recalculation of their carbon footprint.
 * This ensures the system stays accurate as habits change.
 *
 * Directly addresses:
 * - Practical usability: users can update inputs anytime
 * - Security: account management options visible
 */

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { useAuth } from '../hooks/useAuth'
import { useAuthStore } from '../store/authStore'
import LoadingSpinner from '../components/shared/LoadingSpinner'
import {
  TRANSPORT_MODE_LABELS,
  DIET_TYPE_LABELS,
} from '../utils/constants'
import type {
  TransportMode,
  DietType,
  EnergySource,
  ShoppingFrequency,
  FoodWasteLevel,
} from '../types/carbon.types'

// ─── Lifestyle Summary Display ──────────────────────────────────────────

interface LifestyleData {
  transport: {
    primary_mode: TransportMode
    daily_distance_km: number
    weekly_flight_hours: number
    car_passengers_avg: number
  }
  energy: {
    household_size: number
    energy_source: EnergySource
    monthly_kwh: number
    heating_type: string
  }
  food: {
    diet_type: DietType
    local_food_percentage: number
    food_waste_level: FoodWasteLevel
  }
  shopping: {
    monthly_spend_category: ShoppingFrequency
    second_hand_percentage: number
    electronics_yearly: number
  }
}

const ENERGY_SOURCE_LABELS: Record<EnergySource, string> = {
  grid_average: 'Grid Average',
  renewable: 'Renewable',
  gas_heavy: 'Gas Heavy',
}

const SHOPPING_LABELS: Record<ShoppingFrequency, string> = {
  minimal: 'Minimal',
  moderate: 'Moderate',
  frequent: 'Frequent',
}

const WASTE_LABELS: Record<FoodWasteLevel, string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
}

// Default lifestyle data for display when no profile is loaded yet
const DEFAULT_LIFESTYLE: LifestyleData = {
  transport: {
    primary_mode: 'car_petrol',
    daily_distance_km: 15,
    weekly_flight_hours: 0,
    car_passengers_avg: 1,
  },
  energy: {
    household_size: 3,
    energy_source: 'grid_average',
    monthly_kwh: 300,
    heating_type: 'electric',
  },
  food: {
    diet_type: 'omnivore',
    local_food_percentage: 30,
    food_waste_level: 'medium',
  },
  shopping: {
    monthly_spend_category: 'moderate',
    second_hand_percentage: 10,
    electronics_yearly: 2,
  },
}

// ─── Section Components ─────────────────────────────────────────────────

function ProfileSection() {
  const { user } = useAuthStore()

  const displayName = user?.displayName || 'ACIA User'
  const email = user?.email || ''
  const initials = displayName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6">
      <h3 className="text-sm font-medium text-slate-500 mb-4">Profile</h3>
      <div className="flex items-center gap-4">
        <div className="w-16 h-16 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center text-xl font-bold flex-shrink-0">
          {initials}
        </div>
        <div>
          <p className="text-lg font-semibold text-slate-900">{displayName}</p>
          <p className="text-sm text-slate-500">{email}</p>
          {user?.emailVerified && (
            <span className="inline-flex items-center gap-1 text-xs text-green-600 mt-1">
              <svg width="12" height="12" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              Email verified
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

function LifestyleSection({ lifestyle }: { lifestyle: LifestyleData }) {
  const navigate = useNavigate()

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-slate-500">Lifestyle Inputs</h3>
        <button
          onClick={() => navigate('/onboarding')}
          className="text-xs text-primary-600 hover:text-primary-700 font-medium"
        >
          Update All →
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Transport */}
        <div className="bg-slate-50 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <span aria-hidden="true">🚗</span>
            <span className="text-sm font-medium text-slate-700">Transportation</span>
          </div>
          <dl className="space-y-1.5 text-xs">
            <div className="flex justify-between">
              <dt className="text-slate-400">Primary mode</dt>
              <dd className="text-slate-700 font-medium">
                {TRANSPORT_MODE_LABELS[lifestyle.transport.primary_mode]}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-400">Daily distance</dt>
              <dd className="text-slate-700 font-medium">
                {lifestyle.transport.daily_distance_km} km
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-400">Weekly flights</dt>
              <dd className="text-slate-700 font-medium">
                {lifestyle.transport.weekly_flight_hours} hrs
              </dd>
            </div>
          </dl>
        </div>

        {/* Energy */}
        <div className="bg-slate-50 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <span aria-hidden="true">⚡</span>
            <span className="text-sm font-medium text-slate-700">Energy</span>
          </div>
          <dl className="space-y-1.5 text-xs">
            <div className="flex justify-between">
              <dt className="text-slate-400">Household size</dt>
              <dd className="text-slate-700 font-medium">
                {lifestyle.energy.household_size} people
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-400">Energy source</dt>
              <dd className="text-slate-700 font-medium">
                {ENERGY_SOURCE_LABELS[lifestyle.energy.energy_source]}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-400">Monthly usage</dt>
              <dd className="text-slate-700 font-medium">
                {lifestyle.energy.monthly_kwh} kWh
              </dd>
            </div>
          </dl>
        </div>

        {/* Food */}
        <div className="bg-slate-50 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <span aria-hidden="true">🍽️</span>
            <span className="text-sm font-medium text-slate-700">Food & Diet</span>
          </div>
          <dl className="space-y-1.5 text-xs">
            <div className="flex justify-between">
              <dt className="text-slate-400">Diet type</dt>
              <dd className="text-slate-700 font-medium">
                {DIET_TYPE_LABELS[lifestyle.food.diet_type]}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-400">Local food</dt>
              <dd className="text-slate-700 font-medium">
                {lifestyle.food.local_food_percentage}%
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-400">Food waste</dt>
              <dd className="text-slate-700 font-medium">
                {WASTE_LABELS[lifestyle.food.food_waste_level]}
              </dd>
            </div>
          </dl>
        </div>

        {/* Shopping */}
        <div className="bg-slate-50 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <span aria-hidden="true">🛍️</span>
            <span className="text-sm font-medium text-slate-700">Shopping</span>
          </div>
          <dl className="space-y-1.5 text-xs">
            <div className="flex justify-between">
              <dt className="text-slate-400">Frequency</dt>
              <dd className="text-slate-700 font-medium">
                {SHOPPING_LABELS[lifestyle.shopping.monthly_spend_category]}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-400">Second-hand</dt>
              <dd className="text-slate-700 font-medium">
                {lifestyle.shopping.second_hand_percentage}%
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-400">Electronics/yr</dt>
              <dd className="text-slate-700 font-medium">
                {lifestyle.shopping.electronics_yearly}
              </dd>
            </div>
          </dl>
        </div>
      </div>

      <p className="text-xs text-slate-400 mt-4">
        These inputs determine your carbon footprint calculations.
        Update them whenever your lifestyle changes for more accurate tracking.
      </p>
    </div>
  )
}

function DataPrivacySection() {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6">
      <h3 className="text-sm font-medium text-slate-500 mb-4">Data & Privacy</h3>
      <div className="space-y-3">
        <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-xl">
          <span className="text-lg" aria-hidden="true">🔒</span>
          <div>
            <p className="text-sm font-medium text-slate-700">Your Data Is Secure</p>
            <p className="text-xs text-slate-500 mt-0.5">
              All data is stored in Google Cloud Firestore with user-level isolation.
              No other user can access your information.
            </p>
          </div>
        </div>
        <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-xl">
          <span className="text-lg" aria-hidden="true">🤖</span>
          <div>
            <p className="text-sm font-medium text-slate-700">AI Usage</p>
            <p className="text-xs text-slate-500 mt-0.5">
              The AI assistant uses your emission data and behavioral history
              to provide personalized recommendations. Your messages are not
              stored by the AI model.
            </p>
          </div>
        </div>
        <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-xl">
          <span className="text-lg" aria-hidden="true">📊</span>
          <div>
            <p className="text-sm font-medium text-slate-700">Analytics</p>
            <p className="text-xs text-slate-500 mt-0.5">
              We collect anonymous usage analytics to improve ACIA.
              No personally identifiable information is sent to analytics services.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

function EmissionFactorsSection() {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6">
      <h3 className="text-sm font-medium text-slate-500 mb-4">Emission Factor Sources</h3>
      <p className="text-xs text-slate-500 mb-3">
        ACIA uses verified emission factors from the following sources:
      </p>
      <ul className="space-y-2 text-xs text-slate-600">
        <li className="flex items-start gap-2">
          <span className="text-slate-400 flex-shrink-0">•</span>
          <span>
            <span className="font-medium">Transport:</span> UK Government GHG Conversion Factors 2023 — 
            Petrol car: 0.21 kg CO₂/km, Diesel: 0.17, Electric: 0.05, Bus: 0.089, Rail: 0.041
          </span>
        </li>
        <li className="flex items-start gap-2">
          <span className="text-slate-400 flex-shrink-0">•</span>
          <span>
            <span className="font-medium">Food:</span> IPCC AR6 data — 
            Beef meal: 2.5 kg CO₂, Chicken: 0.7, Pork: 1.1, Vegetarian: 0.3, Vegan: 0.2
          </span>
        </li>
        <li className="flex items-start gap-2">
          <span className="text-slate-400 flex-shrink-0">•</span>
          <span>
            <span className="font-medium">Energy:</span> UK Government 2023 — 
            Grid average: 0.233 kg CO₂/kWh, Gas: 0.184, Renewable: 0.012
          </span>
        </li>
        <li className="flex items-start gap-2">
          <span className="text-slate-400 flex-shrink-0">•</span>
          <span>
            <span className="font-medium">Shopping:</span> Average lifecycle estimates — 
            Electronics: ~50 kg CO₂/device, General goods: ~5 kg CO₂/item
          </span>
        </li>
      </ul>
    </div>
  )
}

// ─── Main Settings Page ─────────────────────────────────────────────────

export default function SettingsPage() {
  const { signOut } = useAuth()
  const navigate = useNavigate()
  const [signingOut, setSigningOut] = useState(false)

  async function handleSignOut(): Promise<void> {
    setSigningOut(true)
    try {
      await signOut()
      navigate('/login', { replace: true })
    } catch {
      toast.error('Failed to sign out')
      setSigningOut(false)
    }
  }

  return (
    <div className="space-y-6 animate-fade-in max-w-4xl">
      {/* Page Header */}
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Settings</h2>
        <p className="text-slate-600 mt-1">
          Manage your profile, lifestyle inputs, and preferences
        </p>
      </div>

      {/* Profile */}
      <ProfileSection />

      {/* Lifestyle Data */}
      <LifestyleSection lifestyle={DEFAULT_LIFESTYLE} />

      {/* Data & Privacy */}
      <DataPrivacySection />

      {/* Emission Factor Sources */}
      <EmissionFactorsSection />

      {/* Account Actions */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6">
        <h3 className="text-sm font-medium text-slate-500 mb-4">Account</h3>
        <div className="space-y-3">
          <button
            onClick={handleSignOut}
            disabled={signingOut}
            className="w-full flex items-center justify-between p-3 border border-slate-200 rounded-xl text-sm text-slate-700 hover:bg-slate-50 transition-colors duration-150 disabled:opacity-50"
          >
            <span className="flex items-center gap-2">
              <span aria-hidden="true">👋</span>
              Sign Out
            </span>
            {signingOut ? (
              <LoadingSpinner size={16} />
            ) : (
              <span className="text-slate-400">→</span>
            )}
          </button>
        </div>
      </div>

      {/* App Version */}
      <p className="text-xs text-slate-300 text-center pb-4">
        ACIA v1.0.0 — Adaptive Carbon Intelligence Assistant
      </p>
    </div>
  )
}