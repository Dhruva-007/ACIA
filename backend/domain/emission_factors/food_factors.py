"""
Food Emission Factors

All values expressed in kg CO₂e (CO₂ equivalent) per meal or per day.

CO₂e accounts for all greenhouse gases using Global Warming Potential
over 100 years (GWP100) as defined by IPCC AR6:
- CO₂: GWP100 = 1
- CH₄ (methane): GWP100 = 27.9
- N₂O (nitrous oxide): GWP100 = 273

Methane from livestock (enteric fermentation and manure) is the
primary reason beef and dairy have much higher CO₂e than CO₂-only
values. Using CO₂e is the scientifically correct approach for food
emissions and aligns with IPCC, Paris Agreement, and all credible
carbon accounting standards.

Sources:
- IPCC AR6 Working Group III (2022), Chapter 7: Food, Feed, Fibre
- Poore & Nemecek (2018), Science 360(6392)
  "Reducing food's environmental impacts through producers and consumers"
- Clark et al. (2019), Science 370(6517)
  "Multiple health and environmental impacts of foods"
"""

# ─── Per-Meal Factors (kg CO₂e/meal) ────────────────────────────────

MEAL_FACTORS: dict[str, float] = {
    "beef": 6.0,          # Beef meal — includes enteric fermentation CH₄ (GWP100)
    "chicken": 0.9,       # Chicken meal — lower methane, feed-related N₂O
    "pork": 1.4,          # Pork meal — moderate methane and N₂O
    "fish": 0.5,          # Fish meal — mainly CO₂ from fuel, low methane
    "vegetarian": 0.4,    # Vegetarian meal with dairy/eggs — dairy methane included
    "vegan": 0.2,         # Fully plant-based — primarily CO₂ and N₂O from crops
}

# ─── Daily Diet Factors (kg CO₂e/day) ───────────────────────────────

DIET_DAILY_FACTORS: dict[str, float] = {
    "vegan": 1.5,           # ~3 fully plant-based meals/day
    "vegetarian": 2.5,      # ~3 vegetarian meals with dairy — dairy methane adds ~1 kg/day
    "pescatarian": 3.2,     # Mix of fish and plant-based
    "flexitarian": 4.2,     # Mostly plant-based, 3-4 meat meals/week
    "omnivore": 5.5,        # Regular mixed diet with daily meat
    "high_meat": 8.0,       # Meat at most meals — beef/lamb dominant
}

# ─── Food Waste Multiplier ──────────────────────────────────────────

FOOD_WASTE_MULTIPLIERS: dict[str, float] = {
    "low": 1.0,       # Minimal waste — well below WRAP average
    "medium": 1.15,   # ~15% of food purchased is wasted
    "high": 1.30,     # ~30% of food purchased is wasted
}

# ─── Local Food Adjustment ──────────────────────────────────────────

def get_local_food_factor(local_percentage: float) -> float:
    """
    Returns a CO₂e reduction factor based on local food sourcing.

    Transport-related food emissions are reduced when food is
    sourced locally. The adjustment is modest (max 15%) because
    transport is typically only 5-11% of total food system emissions.
    Production method (diet type) dominates food footprint.

    Args:
        local_percentage: Percentage of food sourced locally (0-100)

    Returns:
        Multiplication factor ranging from 0.90 (all local)
        to 1.05 (all imported/long-haul)

    Source:
        Poore & Nemecek (2018) — transport typically 6% of food CO₂e
    """
    return 1.05 - (local_percentage / 100) * 0.15


def get_diet_daily_factor(diet_type: str) -> float:
    """
    Returns the daily CO₂e emission factor for a diet type.

    Args:
        diet_type: One of 'vegan', 'vegetarian', 'pescatarian',
                   'flexitarian', 'omnivore', 'high_meat'

    Returns:
        kg CO₂e per day for the diet type

    Raises:
        ValueError: If diet_type is not a recognized key
    """
    if diet_type not in DIET_DAILY_FACTORS:
        raise ValueError(
            f"Unknown diet type: '{diet_type}'. "
            f"Valid types: {list(DIET_DAILY_FACTORS.keys())}"
        )
    return DIET_DAILY_FACTORS[diet_type]