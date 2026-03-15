"""Coefficient serialization for model export/import.

Exports model coefficients to JSON so the Next.js frontend can consume
them without running the Python model.
"""

from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from analytics.model.hedonic import HedonicPriceModel


def export_coefficients(model: HedonicPriceModel, path: str | Path) -> dict[str, Any]:
    """Serialize model coefficients to a JSON file.

    Args:
        model: A fitted HedonicPriceModel.
        path: File path for the JSON output.

    Returns:
        The exported data structure.
    """
    if not model.is_fitted:
        raise RuntimeError("Cannot export coefficients from an unfitted model.")

    coeffs = model.get_coefficients()

    data = {
        "version": "1.0",
        "created_at": datetime.now(tz=timezone.utc).isoformat(),
        "intercept": coeffs["intercept"],
        "coefficients": coeffs["coefficients"],
        "feature_names": coeffs["feature_names"],
        "property_types": coeffs["property_types"],
    }

    output_path = Path(path)
    output_path.parent.mkdir(parents=True, exist_ok=True)

    with open(output_path, "w") as f:
        json.dump(data, f, indent=2)

    return data


def load_coefficients(path: str | Path) -> dict[str, Any]:
    """Load coefficients from a JSON file.

    Args:
        path: Path to the JSON coefficients file.

    Returns:
        Dictionary with version, created_at, intercept, coefficients,
        feature_names, and property_types.

    Raises:
        FileNotFoundError: If the file does not exist.
        ValueError: If the file is missing required fields.
    """
    input_path = Path(path)

    with open(input_path) as f:
        data = json.load(f)

    required_fields = {"version", "created_at", "intercept", "coefficients", "feature_names"}
    missing = required_fields - set(data.keys())
    if missing:
        raise ValueError(f"Coefficients file missing required fields: {sorted(missing)}")

    return data
