"""
Transport Emission Factors

All values expressed in kg CO₂e (CO₂ equivalent) per kilometre,
unless noted otherwise.

Transport emission factors from the UK Government GHG Conversion
Factors already account for CO₂e (including upstream fuel emissions
and vehicle manufacturing amortisation where applicable). These
values are therefore directly comparable with CO₂e values from
other emission categories.

Source: UK Government GHG Conversion Factors 2023
https://www.gov.uk/government/publications/greenhouse-gas-reporting-conversion-factors-2023

Note on electric vehicles:
The EV factor (0.05 kg CO₂e/km) uses the UK grid average electricity
emission factor (0.233 kg CO₂e/kWh). In regions with higher renewable
penetration this would be lower. The value reflects 2023 UK grid mix.
"""

# ─── Per-Kilometre Factors (kg CO₂e/km) ─────────────────────────────

TRANSPORT_FACTORS_PER_KM: dict[str, float] = {
    "car_petrol": 0.21,         # Average petrol car, includes upstream fuel
    "car_diesel": 0.17,         # Average diesel car, includes upstream fuel
    "car_electric": 0.05,       # EV on UK grid average (2023)
    "motorcycle": 0.11,         # Average motorcycle
    "public_transport": 0.089,  # Average bus (UK average occupancy)
    "metro_rail": 0.041,        # Metro/subway rail (UK average)
    "bicycle": 0.0,             # Zero direct operational emissions
    "walking": 0.0,             # Zero direct operational emissions
}

# ─── Flight Factors (kg CO₂e/hour) ──────────────────────────────────

FLIGHT_FACTOR_PER_HOUR: float = 90.0
"""
Average flight CO₂e emission factor per hour of flight.

Derivation:
- Average cruise speed: ~800 km/h
- Emission factor: ~0.115 kg CO₂e/km per passenger
- Radiative forcing multiplier: ~1.9× applied to account for
  contrail and high-altitude climate effects
- Result: 800 × 0.115 × 1.9 / 2 ≈ 87.4, rounded to 90

Source: UK DEFRA GHG Conversion Factors 2023 (passenger flights)
"""

# ─── Carpooling Adjustment ──────────────────────────────────────────

def get_carpooling_factor(passengers: int) -> float:
    """
    Returns the per-person CO₂e scaling factor for carpooling.

    Vehicle total emissions are divided equally among occupants.
    Capped at 4 occupants as the marginal benefit plateaus.

    Args:
        passengers: Total number of vehicle occupants including driver

    Returns:
        Per-person multiplication factor:
        - 1 passenger (driver only): 1.0
        - 2 passengers: 0.50
        - 3 passengers: 0.33
        - 4+ passengers: 0.25
    """
    if passengers <= 1:
        return 1.0
    return 1.0 / min(passengers, 4)


def get_transport_factor(mode: str) -> float:
    """
    Returns the CO₂e emission factor for a transport mode.

    Args:
        mode: Transport mode key from TRANSPORT_FACTORS_PER_KM

    Returns:
        kg CO₂e per kilometre for the specified mode

    Raises:
        ValueError: If mode is not a recognized key
    """
    if mode not in TRANSPORT_FACTORS_PER_KM:
        raise ValueError(
            f"Unknown transport mode: '{mode}'. "
            f"Valid modes: {list(TRANSPORT_FACTORS_PER_KM.keys())}"
        )
    return TRANSPORT_FACTORS_PER_KM[mode]