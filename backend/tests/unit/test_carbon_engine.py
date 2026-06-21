"""
Unit Tests: Carbon Engine Service

Tests emission calculation accuracy for all four categories.
All expected values are hand-calculated from the emission factors
documented in the domain/emission_factors/ modules.

These tests are pure — no database, no network, no Firebase.
Pydantic v2 requires all model fields as keyword arguments.
"""

import pytest
from services.carbon_engine import (
    calculate_transport_daily,
    calculate_energy_daily,
    calculate_food_daily,
    calculate_shopping_daily,
    calculate_carbon_breakdown,
    generate_carbon_summary,
    GLOBAL_AVERAGE_MONTHLY_KG,
    PARIS_TARGET_MONTHLY_KG,
)
from domain.models.user_profile import (
    UserLifestyleInput,
    TransportInput,
    EnergyInput,
    FoodInput,
    ShoppingInput,
)
from domain.models.carbon import CarbonBreakdown


# ─── Shared Fixtures ─────────────────────────────────────────────────

def make_transport(
    mode="car_petrol",
    distance=15.0,
    flights=0.0,
    passengers=1,
) -> TransportInput:
    """Helper that constructs TransportInput with keyword arguments."""
    return TransportInput(
        primary_mode=mode,
        daily_distance_km=distance,
        weekly_flight_hours=flights,
        car_passengers_avg=passengers,
    )


def make_energy(
    household_size=2,
    source="grid_average",
    kwh=300.0,
    heating="electric",
) -> EnergyInput:
    """Helper that constructs EnergyInput with keyword arguments."""
    return EnergyInput(
        household_size=household_size,
        energy_source=source,
        monthly_kwh=kwh,
        heating_type=heating,
    )


def make_food(
    diet="omnivore",
    local_pct=30.0,
    waste="medium",
) -> FoodInput:
    """Helper that constructs FoodInput with keyword arguments."""
    return FoodInput(
        diet_type=diet,
        local_food_percentage=local_pct,
        food_waste_level=waste,
    )


def make_shopping(
    frequency="moderate",
    second_hand=10.0,
    electronics=2,
) -> ShoppingInput:
    """Helper that constructs ShoppingInput with keyword arguments."""
    return ShoppingInput(
        monthly_spend_category=frequency,
        second_hand_percentage=second_hand,
        electronics_yearly=electronics,
    )


def make_lifestyle(
    transport: TransportInput | None = None,
    energy: EnergyInput | None = None,
    food: FoodInput | None = None,
    shopping: ShoppingInput | None = None,
) -> UserLifestyleInput:
    """Helper that constructs a complete UserLifestyleInput."""
    return UserLifestyleInput(
        transport=transport or make_transport(),
        energy=energy or make_energy(),
        food=food or make_food(),
        shopping=shopping or make_shopping(),
    )


# ─── Transport Tests ─────────────────────────────────────────────────

class TestCalculateTransportDaily:
    """Tests for daily transport CO₂e calculation."""

    def test_petrol_car_round_trip(self):
        """
        15 km × 2 (round trip) × 0.21 kg/km × 1.0 (no carpooling) = 6.3 kg/day
        """
        result = calculate_transport_daily(
            primary_mode="car_petrol",
            daily_distance_km=15.0,
            weekly_flight_hours=0.0,
            car_passengers_avg=1,
        )
        assert abs(result - 6.3) < 0.01

    def test_carpooling_halves_emissions(self):
        """
        2 passengers halves per-person emissions.
        15 × 2 × 0.21 × 0.5 = 3.15 kg/day
        """
        single = calculate_transport_daily("car_petrol", 15.0, 0.0, 1)
        shared = calculate_transport_daily("car_petrol", 15.0, 0.0, 2)
        assert abs(shared - single / 2) < 0.01

    def test_zero_distance_zero_commute_emissions(self):
        """Remote worker with no commute and no flights should have zero emissions."""
        result = calculate_transport_daily("car_petrol", 0.0, 0.0, 1)
        assert result == 0.0

    def test_flight_contribution(self):
        """
        1 hour/week of flights: (1 × 90) / 7 ≈ 12.86 kg/day
        """
        result = calculate_transport_daily("car_petrol", 0.0, 1.0, 1)
        expected = 90.0 / 7
        assert abs(result - expected) < 0.01

    def test_public_transport_lower_than_car(self):
        """Public transport (0.089 kg/km) always lower than petrol car (0.21 kg/km)."""
        car = calculate_transport_daily("car_petrol", 15.0, 0.0, 1)
        transit = calculate_transport_daily("public_transport", 15.0, 0.0, 1)
        assert transit < car

    def test_bicycle_zero_emissions(self):
        """Bicycle has zero direct emissions regardless of distance."""
        result = calculate_transport_daily("bicycle", 50.0, 0.0, 1)
        assert result == 0.0

    def test_electric_car_lower_than_petrol(self):
        """Electric car (0.05 kg/km) significantly lower than petrol (0.21 kg/km)."""
        petrol = calculate_transport_daily("car_petrol", 20.0, 0.0, 1)
        electric = calculate_transport_daily("car_electric", 20.0, 0.0, 1)
        assert electric < petrol
        assert electric < petrol * 0.30  # at least 70% less

    def test_unknown_mode_raises_value_error(self):
        """Unknown transport mode should raise ValueError from domain layer."""
        with pytest.raises(ValueError, match="Unknown transport mode"):
            calculate_transport_daily("hovercraft", 10.0, 0.0, 1)


# ─── Energy Tests ────────────────────────────────────────────────────

class TestCalculateEnergyDaily:
    """Tests for daily energy CO₂e calculation."""

    def test_grid_average_single_person(self):
        """
        300 kWh/month, single person, grid_average (0.233 kg/kWh), electric (×1.0)
        daily_kwh = 300/30 = 10
        per_person_kwh = 10 × 1.0 = 10
        daily = 10 × 0.233 × 1.0 = 2.33 kg/day
        """
        result = calculate_energy_daily(
            household_size=1,
            energy_source="grid_average",
            monthly_kwh=300.0,
            heating_type="electric",
        )
        assert abs(result - 2.33) < 0.01

    def test_renewable_significantly_lower(self):
        """Renewable energy (0.012 kg/kWh) should be ~95% less than grid average."""
        grid = calculate_energy_daily(1, "grid_average", 300.0, "electric")
        renewable = calculate_energy_daily(1, "renewable", 300.0, "electric")
        assert renewable < grid * 0.10

    def test_larger_household_lower_per_person(self):
        """Larger households share fixed costs — per-person emissions decrease."""
        single = calculate_energy_daily(1, "grid_average", 300.0, "electric")
        family_of_4 = calculate_energy_daily(4, "grid_average", 300.0, "electric")
        assert family_of_4 < single

    def test_gas_heating_multiplier(self):
        """Gas heating applies 1.3× multiplier to energy emissions."""
        electric = calculate_energy_daily(2, "grid_average", 300.0, "electric")
        gas = calculate_energy_daily(2, "grid_average", 300.0, "gas")
        assert abs(gas / electric - 1.3) < 0.01

    def test_heat_pump_lower_than_electric(self):
        """Heat pump (0.5× factor) is more efficient than standard electric."""
        electric = calculate_energy_daily(1, "grid_average", 300.0, "electric")
        heat_pump = calculate_energy_daily(1, "grid_average", 300.0, "heat_pump")
        assert heat_pump < electric

    def test_unknown_energy_source_raises(self):
        """Unknown energy source should raise ValueError."""
        with pytest.raises(ValueError, match="Unknown energy source"):
            calculate_energy_daily(1, "nuclear", 300.0, "electric")


# ─── Food Tests ──────────────────────────────────────────────────────

class TestCalculateFoodDaily:
    """Tests for daily food CO₂e calculation."""

    def test_vegan_lowest_emissions(self):
        """Vegan diet should have the lowest daily CO₂e among all diet types."""
        vegan = calculate_food_daily("vegan", 30.0, "low")
        omnivore = calculate_food_daily("omnivore", 30.0, "low")
        high_meat = calculate_food_daily("high_meat", 30.0, "low")
        assert vegan < omnivore
        assert omnivore < high_meat

    def test_high_meat_highest_emissions(self):
        """High meat diet should produce highest daily CO₂e."""
        result = calculate_food_daily("high_meat", 30.0, "medium")
        vegan = calculate_food_daily("vegan", 30.0, "medium")
        assert result > vegan * 3

    def test_food_waste_increases_emissions(self):
        """Higher food waste level should increase total emissions."""
        low = calculate_food_daily("omnivore", 30.0, "low")
        medium = calculate_food_daily("omnivore", 30.0, "medium")
        high = calculate_food_daily("omnivore", 30.0, "high")
        assert low < medium < high

    def test_local_food_reduces_emissions(self):
        """100% local food should be lower than 0% local food."""
        all_local = calculate_food_daily("omnivore", 100.0, "medium")
        all_imported = calculate_food_daily("omnivore", 0.0, "medium")
        assert all_local < all_imported

    def test_beef_co2e_reflects_methane(self):
        """
        Omnivore diet factor (5.5 kg CO₂e/day) should be significantly
        higher confirming methane is included in the CO₂e values.
        """
        result = calculate_food_daily("omnivore", 30.0, "low")
        assert result >= 5.0

    def test_unknown_diet_raises(self):
        """Unknown diet type should raise ValueError."""
        with pytest.raises(ValueError, match="Unknown diet type"):
            calculate_food_daily("carnivore_extreme", 30.0, "low")


# ─── Shopping Tests ──────────────────────────────────────────────────

class TestCalculateShoppingDaily:
    """Tests for daily shopping CO₂e calculation."""

    def test_frequent_higher_than_minimal(self):
        """Frequent shopper should have higher emissions than minimal shopper."""
        minimal = calculate_shopping_daily("minimal", 10.0, 1)
        frequent = calculate_shopping_daily("frequent", 10.0, 1)
        assert frequent > minimal

    def test_second_hand_reduces_emissions(self):
        """100% second-hand purchasing should significantly reduce shopping emissions."""
        all_new = calculate_shopping_daily("moderate", 0.0, 2)
        all_second_hand = calculate_shopping_daily("moderate", 100.0, 2)
        assert all_second_hand < all_new * 0.5

    def test_electronics_add_to_emissions(self):
        """More electronics per year should increase total shopping emissions."""
        no_electronics = calculate_shopping_daily("minimal", 10.0, 0)
        many_electronics = calculate_shopping_daily("minimal", 10.0, 10)
        assert many_electronics > no_electronics

    def test_unknown_frequency_raises(self):
        """Unknown shopping frequency should raise ValueError."""
        with pytest.raises(ValueError, match="Unknown shopping frequency"):
            calculate_shopping_daily("extreme", 10.0, 1)


# ─── Full Breakdown Tests ─────────────────────────────────────────────

class TestCalculateCarbonBreakdown:
    """Tests for the complete carbon breakdown calculation."""

    @pytest.fixture
    def standard_lifestyle(self) -> UserLifestyleInput:
        """Standard test lifestyle using keyword argument helpers."""
        return make_lifestyle()

    def test_returns_carbon_breakdown_model(self, standard_lifestyle):
        """Result should be a CarbonBreakdown model instance."""
        result = calculate_carbon_breakdown(standard_lifestyle)
        assert isinstance(result, CarbonBreakdown)

    def test_total_equals_sum_of_categories(self, standard_lifestyle):
        """Total monthly kg should equal sum of all category monthly values."""
        result = calculate_carbon_breakdown(standard_lifestyle)
        category_sum = (
            result.breakdown.transport_kg
            + result.breakdown.energy_kg
            + result.breakdown.food_kg
            + result.breakdown.shopping_kg
        )
        assert abs(result.total_kg - category_sum) < 0.05

    def test_percentages_sum_to_100(self, standard_lifestyle):
        """Category percentages should sum to exactly 100%."""
        result = calculate_carbon_breakdown(standard_lifestyle)
        pct = result.breakdown_percentage
        total_pct = pct.transport + pct.energy + pct.food + pct.shopping
        assert abs(total_pct - 100.0) < 0.1

    def test_all_values_positive(self, standard_lifestyle):
        """All calculated emission values should be positive."""
        result = calculate_carbon_breakdown(standard_lifestyle)
        assert result.total_kg > 0
        assert result.daily_kg > 0
        assert result.breakdown.transport_kg > 0
        assert result.breakdown.energy_kg > 0
        assert result.breakdown.food_kg > 0
        assert result.breakdown.shopping_kg > 0

    def test_primary_contributor_is_valid_category(self, standard_lifestyle):
        """Primary contributor should be one of the four valid categories."""
        result = calculate_carbon_breakdown(standard_lifestyle)
        valid_categories = {"transport", "energy", "food", "shopping"}
        assert result.primary_contributor in valid_categories

    def test_primary_contributor_is_highest_category(self, standard_lifestyle):
        """Primary contributor should be the category with highest emissions."""
        result = calculate_carbon_breakdown(standard_lifestyle)
        breakdown = result.breakdown
        category_values = {
            "transport": breakdown.transport_kg,
            "energy": breakdown.energy_kg,
            "food": breakdown.food_kg,
            "shopping": breakdown.shopping_kg,
        }
        expected_primary = max(category_values, key=category_values.get)  # type: ignore
        assert result.primary_contributor == expected_primary

    def test_daily_kg_times_30_equals_total(self, standard_lifestyle):
        """Daily kg × 30 should approximately equal monthly total."""
        result = calculate_carbon_breakdown(standard_lifestyle)
        assert abs(result.daily_kg * 30 - result.total_kg) < 0.1

    def test_vegan_lower_than_high_meat(self):
        """Vegan lifestyle should produce lower total emissions than high meat."""
        vegan_lifestyle = make_lifestyle(
            food=make_food(diet="vegan", local_pct=50.0, waste="low"),
            shopping=make_shopping(frequency="minimal", second_hand=50.0, electronics=1),
        )
        high_meat_lifestyle = make_lifestyle(
            food=make_food(diet="high_meat", local_pct=0.0, waste="high"),
            shopping=make_shopping(frequency="frequent", second_hand=0.0, electronics=5),
        )
        vegan_result = calculate_carbon_breakdown(vegan_lifestyle)
        high_meat_result = calculate_carbon_breakdown(high_meat_lifestyle)
        assert vegan_result.total_kg < high_meat_result.total_kg

    def test_renewable_energy_reduces_total(self):
        """Switching to renewable energy should reduce total emissions significantly."""
        grid_lifestyle = make_lifestyle(energy=make_energy(source="grid_average"))
        renewable_lifestyle = make_lifestyle(energy=make_energy(source="renewable"))

        grid_result = calculate_carbon_breakdown(grid_lifestyle)
        renewable_result = calculate_carbon_breakdown(renewable_lifestyle)
        assert renewable_result.total_kg < grid_result.total_kg


# ─── Summary Generation Tests ─────────────────────────────────────────

class TestGenerateCarbonSummary:
    """Tests for summary generation with trend and benchmark data."""

    @pytest.fixture
    def sample_breakdown(self) -> CarbonBreakdown:
        """Provides a standard CarbonBreakdown for summary tests."""
        return calculate_carbon_breakdown(make_lifestyle())

    def test_new_user_trend_with_few_records(self, sample_breakdown):
        """Users with fewer than 7 records should get 'new_user' trend."""
        recent_emissions = [{"total_kg": 10.0}] * 3
        result = generate_carbon_summary(sample_breakdown, recent_emissions)
        assert result["trend"] == "new_user"
        assert result["trend_percentage"] is None

    def test_stable_trend_with_flat_data(self, sample_breakdown):
        """Constant emissions should produce 'stable' trend."""
        recent_emissions = [{"total_kg": 10.0}] * 14
        result = generate_carbon_summary(sample_breakdown, recent_emissions)
        assert result["trend"] == "stable"

    def test_decreasing_trend_detected(self, sample_breakdown):
        """Significantly lower recent emissions should produce 'decreasing' trend."""
        previous_7 = [{"total_kg": 15.0}] * 7
        recent_7 = [{"total_kg": 10.0}] * 7  # 33% decrease
        recent_emissions = previous_7 + recent_7
        result = generate_carbon_summary(sample_breakdown, recent_emissions)
        assert result["trend"] == "decreasing"
        assert result["trend_percentage"] is not None
        assert result["trend_percentage"] < 0

    def test_increasing_trend_detected(self, sample_breakdown):
        """Significantly higher recent emissions should produce 'increasing' trend."""
        previous_7 = [{"total_kg": 10.0}] * 7
        recent_7 = [{"total_kg": 15.0}] * 7  # 50% increase
        recent_emissions = previous_7 + recent_7
        result = generate_carbon_summary(sample_breakdown, recent_emissions)
        assert result["trend"] == "increasing"
        assert result["trend_percentage"] is not None
        assert result["trend_percentage"] > 0

    def test_benchmark_fields_present(self, sample_breakdown):
        """Summary must include global average and Paris target benchmarks."""
        result = generate_carbon_summary(sample_breakdown, [])
        assert "vs_global_average_percentage" in result
        assert "global_average_kg" in result
        assert "paris_target_kg" in result
        assert result["global_average_kg"] == GLOBAL_AVERAGE_MONTHLY_KG
        assert result["paris_target_kg"] == PARIS_TARGET_MONTHLY_KG

    def test_trend_message_present(self, sample_breakdown):
        """Trend message should always be a non-empty string."""
        result = generate_carbon_summary(sample_breakdown, [])
        assert isinstance(result["trend_message"], str)
        assert len(result["trend_message"]) > 0

    def test_today_week_month_year_present(self, sample_breakdown):
        """All time period estimates must be present and positive."""
        result = generate_carbon_summary(sample_breakdown, [])
        assert result["today_kg"] > 0
        assert result["this_week_kg"] > 0
        assert result["this_month_kg"] > 0
        assert result["this_year_kg"] > 0
        assert result["this_week_kg"] > result["today_kg"]
        assert result["this_month_kg"] > result["this_week_kg"]
        assert result["this_year_kg"] > result["this_month_kg"]