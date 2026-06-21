"""
Energy Emission Factors

All values expressed in kg CO₂e (CO₂ equivalent) per kWh.

UK Government GHG Conversion Factors for electricity already
express values in CO₂e, incorporating the full fuel mix and
upstream emissions. These factors are therefore directly
comparable with CO₂e values from other emission categories.

Source: UK Government GHG Conversion Factors 2023
https://www.gov.uk/government/publications/greenhouse-gas-reporting-conversion-factors-2023

Grid intensity note:
The grid average (0.233 kg CO₂e/kWh) reflects the 2023 UK
electricity mix. This will decrease over time as renewable
penetration increases. The renewable factor (0.012 kg CO₂e/kWh)
represents lifecycle emissions from wind and solar manufacturing,
installation, and decommissioning — not zero.
"""

# ─── Electricity Source Factors (kg CO₂e/kWh) ───────────────────────

ENERGY_FACTORS_PER_KWH: dict[str, float] = {
    "grid_average": 0.233,    # UK grid average 2023 — includes full fuel mix
    "renewable": 0.012,       # Wind/solar lifecycle average (manufacturing + ops)
    "gas_heavy": 0.184,       # Natural gas boiler — direct combustion CO₂e
}

# ─── Heating System Adjustment Factors ──────────────────────────────

HEATING_FACTORS: dict[str, float] = {
    "electric": 1.0,     # Captured entirely in electricity consumption
    "gas": 1.3,          # Gas boiler adds ~30% via direct combustion emissions
    "heat_pump": 0.5,    # Heat pumps are ~2× more efficient than direct electric
    "district": 0.8,     # District heating — typically more efficient than individual
    "none": 0.7,         # Warm climate — minimal heating demand
}

# ─── Per-Person Scaling ─────────────────────────────────────────────

def get_per_person_factor(household_size: int) -> float:
    """
    Returns the per-person CO₂e scaling factor for household energy.

    Larger households share fixed energy loads (heating, hot water,
    lighting), so per-person emissions decrease with household size.
    This reflects real-world economies of shared living.

    Args:
        household_size: Number of people in the household (1-20)

    Returns:
        Per-person multiplication factor:
        - 1 person:  1.00 (full burden)
        - 2 people:  0.75 (shared fixed loads)
        - 3 people:  0.60
        - 4 people:  0.50
        - 5+ people: 0.45 (diminishing returns at larger sizes)
    """
    if household_size <= 1:
        return 1.0
    if household_size == 2:
        return 0.75
    if household_size == 3:
        return 0.60
    if household_size == 4:
        return 0.50
    return 0.45


def get_energy_factor(source: str) -> float:
    """
    Returns the CO₂e emission factor for an energy source.

    Args:
        source: Energy source key from ENERGY_FACTORS_PER_KWH

    Returns:
        kg CO₂e per kWh for the specified source

    Raises:
        ValueError: If source is not a recognized key
    """
    if source not in ENERGY_FACTORS_PER_KWH:
        raise ValueError(
            f"Unknown energy source: '{source}'. "
            f"Valid sources: {list(ENERGY_FACTORS_PER_KWH.keys())}"
        )
    return ENERGY_FACTORS_PER_KWH[source]