"""Tests for coefficient export and import."""

from __future__ import annotations

import json
from pathlib import Path

import numpy as np
import pandas as pd
import pytest

from analytics.model.coefficients import export_coefficients, load_coefficients
from analytics.model.hedonic import HedonicPriceModel


@pytest.fixture
def training_data() -> pd.DataFrame:
    """Minimal synthetic training data."""
    rng = np.random.default_rng(42)
    n = 100
    return pd.DataFrame({
        "price": rng.uniform(1_000_000, 5_000_000, n),
        "sqm": rng.uniform(30, 120, n),
        "rooms": rng.integers(1, 5, n).astype(float),
        "floor": rng.integers(0, 8, n).astype(float),
        "lat": rng.uniform(59.3, 59.4, n),
        "lng": rng.uniform(18.0, 18.1, n),
        "construction_year": rng.integers(1900, 2020, n).astype(float),
        "monthly_fee": rng.uniform(2000, 5000, n),
        "property_type": rng.choice(["apartment", "house"], n),
    })


@pytest.fixture
def fitted_model(training_data: pd.DataFrame) -> HedonicPriceModel:
    model = HedonicPriceModel()
    model.fit(training_data)
    return model


class TestExportCoefficients:
    def test_export_creates_file(self, fitted_model: HedonicPriceModel, tmp_path: Path) -> None:
        output = tmp_path / "coefficients.json"
        export_coefficients(fitted_model, output)
        assert output.exists()

    def test_export_returns_data(self, fitted_model: HedonicPriceModel, tmp_path: Path) -> None:
        output = tmp_path / "coefficients.json"
        data = export_coefficients(fitted_model, output)

        assert "version" in data
        assert "created_at" in data
        assert "intercept" in data
        assert "coefficients" in data
        assert "feature_names" in data
        assert "property_types" in data

    def test_export_json_is_valid(self, fitted_model: HedonicPriceModel, tmp_path: Path) -> None:
        output = tmp_path / "coefficients.json"
        export_coefficients(fitted_model, output)

        with open(output) as f:
            data = json.load(f)

        assert isinstance(data["intercept"], float)
        assert isinstance(data["coefficients"], dict)
        assert data["version"] == "1.0"

    def test_export_creates_parent_dirs(
        self, fitted_model: HedonicPriceModel, tmp_path: Path
    ) -> None:
        output = tmp_path / "nested" / "dir" / "coefficients.json"
        export_coefficients(fitted_model, output)
        assert output.exists()

    def test_export_raises_for_unfitted_model(self, tmp_path: Path) -> None:
        model = HedonicPriceModel()
        with pytest.raises(RuntimeError, match="unfitted model"):
            export_coefficients(model, tmp_path / "out.json")


class TestLoadCoefficients:
    def test_roundtrip(self, fitted_model: HedonicPriceModel, tmp_path: Path) -> None:
        output = tmp_path / "coefficients.json"
        exported = export_coefficients(fitted_model, output)
        loaded = load_coefficients(output)

        assert loaded["version"] == exported["version"]
        assert loaded["intercept"] == exported["intercept"]
        assert loaded["coefficients"] == exported["coefficients"]
        assert loaded["feature_names"] == exported["feature_names"]

    def test_load_nonexistent_file(self, tmp_path: Path) -> None:
        with pytest.raises(FileNotFoundError):
            load_coefficients(tmp_path / "nonexistent.json")

    def test_load_invalid_json(self, tmp_path: Path) -> None:
        bad_file = tmp_path / "bad.json"
        bad_file.write_text("{}")
        with pytest.raises(ValueError, match="missing required fields"):
            load_coefficients(bad_file)

    def test_load_preserves_all_coefficient_values(
        self, fitted_model: HedonicPriceModel, tmp_path: Path
    ) -> None:
        output = tmp_path / "coefficients.json"
        export_coefficients(fitted_model, output)
        loaded = load_coefficients(output)

        original_coeffs = fitted_model.get_coefficients()
        for name in original_coeffs["feature_names"]:
            assert name in loaded["coefficients"]
            assert loaded["coefficients"][name] == pytest.approx(
                original_coeffs["coefficients"][name]
            )

    def test_load_with_string_path(
        self, fitted_model: HedonicPriceModel, tmp_path: Path
    ) -> None:
        output = tmp_path / "coefficients.json"
        export_coefficients(fitted_model, output)
        loaded = load_coefficients(str(output))
        assert "intercept" in loaded
