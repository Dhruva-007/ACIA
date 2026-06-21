"""
Unit Tests: Carbon Impact Simulator Engine

Tests all four simulation scenarios with verified calculation results.
Uses mocked Firestore to avoid database dependency.
"""

import pytest
from unittest.mock import MagicMock, patch
from services.simulator_engine import (
    _simulate_replace_car_trips,
    _simulate_reduce_meat,
    _simulate_remote_work,
    _simulate_switch_energy,
)
from domain.emission_factors.transport_factors import TRANSPORT_FACTORS_PER_KM
from domain.emission_factors.food_factors import MEAL_FACTORS
from domain.emission_factors.energy_factors import ENERGY_FACTORS_PER_KWH


class TestSimulateReplaceCarTrips:
    """Tests for car trip replacement simulation."""

    def test_petrol_to_transit_saves_emissions(self):
        """Replacing petrol car trips with public transit should save emissions."""
        params = {
            "trips_per_week": 2,
            "one_way_distance_km": 15.0,
            "current_vehicle": "car_petrol",
        }
        mock_breakdown = MagicMock()
        result = _simulate_replace_car_trips(params, mock_breakdown)
        assert result["monthly_saving_kg"] > 0

    def test_petrol_vs_transit_factor_ratio(self):
        """
        Petrol (0.21 kg/km) vs transit (0.089 kg/km).
        2 trips, 15 km, round trip.
        weekly_current = 2 × 2 × 15 × 0.21 = 12.6
        weekly_transit = 2 × 2 × 15 × 0.089 = 5.34
        weekly_saving = 7.26
        monthly_saving = 7.26 × 4.33 ≈ 31.4
        """
        params = {
            "trips_per_week": 2,
            "one_way_distance_km": 15.0,
            "current_vehicle": "car_petrol",
        }
        mock_breakdown = MagicMock()
        result = _simulate_replace_car_trips(params, mock_breakdown)
        expected = 7.26 * 4.33
        assert abs(result["monthly_saving_kg"] - expected) < 0.5

    def test_electric_car_saves_less_than_petrol(self):
        """
        Electric car has lower starting emissions,
        so switching saves less than from petrol.
        """
        petrol_params = {"trips_per_week": 2, "one_way_distance_km": 15.0, "current_vehicle": "car_petrol"}
        electric_params = {"trips_per_week": 2, "one_way_distance_km": 15.0, "current_vehicle": "car_electric"}
        mock_breakdown = MagicMock()

        petrol_saving = _simulate_replace_car_trips(petrol_params, mock_breakdown)["monthly_saving_kg"]
        electric_saving = _simulate_replace_car_trips(electric_params, mock_breakdown)["monthly_saving_kg"]

        assert petrol_saving > electric_saving

    def test_more_trips_more_savings(self):
        """More trips replaced means more monthly savings."""
        params_few = {"trips_per_week": 1, "one_way_distance_km": 10.0, "current_vehicle": "car_petrol"}
        params_many = {"trips_per_week": 5, "one_way_distance_km": 10.0, "current_vehicle": "car_petrol"}
        mock_breakdown = MagicMock()

        few_saving = _simulate_replace_car_trips(params_few, mock_breakdown)["monthly_saving_kg"]
        many_saving = _simulate_replace_car_trips(params_many, mock_breakdown)["monthly_saving_kg"]

        assert many_saving > few_saving

    def test_result_contains_description(self):
        """Result should include a description string."""
        params = {"trips_per_week": 2, "one_way_distance_km": 15.0, "current_vehicle": "car_petrol"}
        result = _simulate_replace_car_trips(params, MagicMock())
        assert "description" in result
        assert len(result["description"]) > 0


class TestSimulateReduceMeat:
    """Tests for meat reduction simulation."""

    def test_beef_to_vegan_saves_most(self):
        """Beef to vegan is the highest possible reduction."""
        beef_to_vegan = _simulate_reduce_meat(
            {"meals_changed_per_week": 3, "from_type": "beef", "to_type": "vegan"},
            MagicMock()
        )
        chicken_to_vegetarian = _simulate_reduce_meat(
            {"meals_changed_per_week": 3, "from_type": "chicken", "to_type": "vegetarian"},
            MagicMock()
        )
        assert beef_to_vegan["monthly_saving_kg"] > chicken_to_vegetarian["monthly_saving_kg"]

    def test_beef_to_vegetarian_calculation(self):
        """
        3 meals/week, beef (6.0 CO₂e) to vegetarian (0.4 CO₂e).
        weekly_saving = 3 × (6.0 - 0.4) = 16.8
        monthly_saving = 16.8 × 4.33 ≈ 72.7
        """
        params = {
            "meals_changed_per_week": 3,
            "from_type": "beef",
            "to_type": "vegetarian",
        }
        result = _simulate_reduce_meat(params, MagicMock())
        expected = 3 * (MEAL_FACTORS["beef"] - MEAL_FACTORS["vegetarian"]) * 4.33
        assert abs(result["monthly_saving_kg"] - expected) < 0.5

    def test_more_meals_more_savings(self):
        """Changing more meals per week should save more."""
        few = _simulate_reduce_meat({"meals_changed_per_week": 1, "from_type": "beef", "to_type": "vegan"}, MagicMock())
        many = _simulate_reduce_meat({"meals_changed_per_week": 5, "from_type": "beef", "to_type": "vegan"}, MagicMock())
        assert many["monthly_saving_kg"] > few["monthly_saving_kg"]

    def test_result_positive_saving(self):
        """All valid meat reduction scenarios should produce positive savings."""
        params = {"meals_changed_per_week": 3, "from_type": "pork", "to_type": "fish"}
        result = _simulate_reduce_meat(params, MagicMock())
        assert result["monthly_saving_kg"] > 0


class TestSimulateRemoteWork:
    """Tests for remote work simulation."""

    def test_more_remote_days_more_savings(self):
        """More remote days per week means more saved commute emissions."""
        one_day = _simulate_remote_work(
            {"remote_days_per_week": 1, "commute_distance_km": 15.0, "vehicle_type": "car_petrol"},
            MagicMock()
        )
        five_days = _simulate_remote_work(
            {"remote_days_per_week": 5, "commute_distance_km": 15.0, "vehicle_type": "car_petrol"},
            MagicMock()
        )
        assert five_days["monthly_saving_kg"] > one_day["monthly_saving_kg"]

    def test_remote_work_calculation(self):
        """
        2 days/week, 15 km commute, petrol car.
        daily = 15 × 2 × 0.21 = 6.3 kg
        weekly_saving = 2 × 6.3 = 12.6
        monthly_saving = 12.6 × 4.33 ≈ 54.6
        """
        params = {
            "remote_days_per_week": 2,
            "commute_distance_km": 15.0,
            "vehicle_type": "car_petrol",
        }
        result = _simulate_remote_work(params, MagicMock())
        expected = 2 * (15.0 * 2 * TRANSPORT_FACTORS_PER_KM["car_petrol"]) * 4.33
        assert abs(result["monthly_saving_kg"] - expected) < 0.5

    def test_longer_commute_more_savings(self):
        """Longer commute distance means more savings from remote work."""
        short = _simulate_remote_work({"remote_days_per_week": 2, "commute_distance_km": 5.0, "vehicle_type": "car_petrol"}, MagicMock())
        long = _simulate_remote_work({"remote_days_per_week": 2, "commute_distance_km": 50.0, "vehicle_type": "car_petrol"}, MagicMock())
        assert long["monthly_saving_kg"] > short["monthly_saving_kg"]


class TestSimulateSwitchEnergy:
    """Tests for energy source switching simulation."""

    def test_grid_to_renewable_saves_significantly(self):
        """Switching from grid to renewable should save very significant CO₂e."""
        params = {
            "current_source": "grid_average",
            "monthly_kwh": 300.0,
        }
        result = _simulate_switch_energy(params, MagicMock())
        assert result["monthly_saving_kg"] > 50  # significant saving

    def test_energy_switch_calculation(self):
        """
        300 kWh × (0.233 - 0.012) = 300 × 0.221 = 66.3 kg/month saving
        """
        params = {
            "current_source": "grid_average",
            "monthly_kwh": 300.0,
        }
        result = _simulate_switch_energy(params, MagicMock())
        expected = 300.0 * (ENERGY_FACTORS_PER_KWH["grid_average"] - ENERGY_FACTORS_PER_KWH["renewable"])
        assert abs(result["monthly_saving_kg"] - expected) < 0.5

    def test_higher_consumption_more_savings(self):
        """Higher monthly kWh means more savings from switching."""
        low = _simulate_switch_energy({"current_source": "grid_average", "monthly_kwh": 100.0}, MagicMock())
        high = _simulate_switch_energy({"current_source": "grid_average", "monthly_kwh": 500.0}, MagicMock())
        assert high["monthly_saving_kg"] > low["monthly_saving_kg"]

    def test_gas_heavy_saves_less_than_grid(self):
        """
        Gas heavy (0.184 kg/kWh) is lower than grid average (0.233 kg/kWh),
        so switching from gas_heavy saves less than switching from grid_average.
        """
        grid = _simulate_switch_energy({"current_source": "grid_average", "monthly_kwh": 300.0}, MagicMock())
        gas = _simulate_switch_energy({"current_source": "gas_heavy", "monthly_kwh": 300.0}, MagicMock())
        assert grid["monthly_saving_kg"] > gas["monthly_saving_kg"]