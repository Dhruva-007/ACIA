"""
Shopping Emission Factors

All values expressed in kg CO₂e (CO₂ equivalent) based on
average product lifecycle carbon footprints.

Lifecycle CO₂e includes: raw material extraction, manufacturing,
transport, retail, and end-of-life disposal. It does not include
consumer use phase (which is captured in energy category).

Sources:
- Berners-Lee, M. (2020). "How Bad Are Bananas?" (2nd ed.)
- Carbon Trust Product Lifecycle Analysis averages
- WRAP (Waste & Resources Action Programme) — UK clothing data
- IDC/Gartner — electronics lifecycle estimates

Note on electronics:
The CO₂e per device varies enormously (smartphone ~70 kg,
laptop ~300-400 kg, large TV ~600 kg). The weighted average
of 70 kg CO₂e reflects a mix of typical consumer electronics.
"""

# ─── Monthly Shopping Factors (kg CO₂e/month) ───────────────────────

SHOPPING_MONTHLY_FACTORS: dict[str, float] = {
    "minimal": 15.0,     # Rarely buys non-essential items — essentials only
    "moderate": 35.0,    # Occasional shopping for clothing, household goods
    "frequent": 70.0,    # Regular discretionary shopping — fast fashion included
}

# ─── Electronics Lifecycle Factor (kg CO₂e/device) ──────────────────

ELECTRONICS_FACTOR_PER_DEVICE: float = 70.0
"""
Weighted average lifecycle CO₂e per electronic device purchased.

Device estimates (manufacturing + distribution + disposal):
- Smartphone:     ~70 kg CO₂e
- Laptop/tablet:  ~300-400 kg CO₂e
- Smart TV:       ~500-700 kg CO₂e
- Small devices:  ~15-30 kg CO₂e

Using 70 kg as a weighted average reflecting a consumer mix
skewed toward smartphones and small electronics.

Source: Greenpeace Guide to Greener Electronics (2022),
        Carbon Trust Electronics LCA data
"""

# ─── Second-Hand Purchase Adjustment ────────────────────────────────

def get_second_hand_factor(second_hand_percentage: float) -> float:
    """
    Returns a CO₂e reduction factor based on second-hand purchasing.

    Second-hand purchases avoid the manufacturing phase of the product
    lifecycle, which accounts for approximately 70% of a product's
    total CO₂e. The remaining 30% (logistics, retail) still applies.

    Args:
        second_hand_percentage: Percentage of purchases that are
                                second-hand or pre-owned (0-100)

    Returns:
        Multiplication factor ranging from 0.30 (all second-hand)
        to 1.0 (all new purchases)

    Example:
        50% second-hand → factor = 1.0 - (50/100 × 0.70) = 0.65
        → 35% reduction in shopping emissions
    """
    return 1.0 - (second_hand_percentage / 100) * 0.70


def get_shopping_monthly_factor(frequency: str) -> float:
    """
    Returns the monthly CO₂e factor for a shopping frequency level.

    Args:
        frequency: One of 'minimal', 'moderate', 'frequent'

    Returns:
        kg CO₂e per month for the specified shopping frequency

    Raises:
        ValueError: If frequency is not a recognized key
    """
    if frequency not in SHOPPING_MONTHLY_FACTORS:
        raise ValueError(
            f"Unknown shopping frequency: '{frequency}'. "
            f"Valid frequencies: {list(SHOPPING_MONTHLY_FACTORS.keys())}"
        )
    return SHOPPING_MONTHLY_FACTORS[frequency]