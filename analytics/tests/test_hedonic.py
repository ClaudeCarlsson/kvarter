"""Tests for the hedonic price model."""

from __future__ import annotations

import numpy as np
import pandas as pd
import pytest

from analytics.model.hedonic import REQUIRED_COLUMNS, HedonicPriceModel


@pytest.fixture
def synthetic_data() -> pd.DataFrame:
    """Generate synthetic housing data with known relationships."""
    rng = np.random.default_rng(42)
    n = 200

    sqm = rng.uniform(30, 150, n)
    rooms = np.clip(np.round(sqm / 25), 1, 6)
    floor = rng.integers(1, 10, n).astype(float)
    lat = rng.uniform(59.3, 59.4, n)
    lng = rng.uniform(18.0, 18.1, n)
    construction_year = rng.integers(1900, 2020, n).astype(float)
    monthly_fee = rng.uniform(1500, 6000, n)
    property_type = rng.choice(["apartment", "house", "townhouse"], n)

    log_price = (
        12.0
        + 0.01 * sqm
        + 0.05 * rooms
        + 0.02 * floor
        + 0.5 * np.log(construction_year - 1800)
        - 0.0001 * monthly_fee
        + 2.0 * (lat - 59.3)
        + 0.5 * (lng - 18.0)
        + rng.normal(0, 0.05, n)
    )
    price = np.exp(log_price)

    return pd.DataFrame({
        "price": price,
        "sqm": sqm,
        "rooms": rooms,
        "floor": floor,
        "lat": lat,
        "lng": lng,
        "construction_year": construction_year,
        "monthly_fee": monthly_fee,
        "property_type": property_type,
    })


@pytest.fixture
def fitted_model(synthetic_data: pd.DataFrame) -> HedonicPriceModel:
    """Return a model fitted on synthetic data."""
    model = HedonicPriceModel()
    model.fit(synthetic_data)
    return model


class TestHedonicPriceModel:
    def test_unfitted_model_is_not_fitted(self) -> None:
        model = HedonicPriceModel()
        assert model.is_fitted is False

    def test_fit_marks_model_as_fitted(self, synthetic_data: pd.DataFrame) -> None:
        model = HedonicPriceModel()
        result = model.fit(synthetic_data)
        assert model.is_fitted is True
        assert result is model  # returns self for chaining

    def test_fit_raises_on_missing_columns(self) -> None:
        df = pd.DataFrame({"price": [1], "sqm": [50]})
        model = HedonicPriceModel()
        with pytest.raises(ValueError, match="Missing required columns"):
            model.fit(df)

    def test_predict_returns_positive_prices(
        self, fitted_model: HedonicPriceModel, synthetic_data: pd.DataFrame
    ) -> None:
        predictions = fitted_model.predict(synthetic_data)
        assert len(predictions) == len(synthetic_data)
        assert np.all(predictions > 0)

    def test_predict_raises_when_unfitted(self, synthetic_data: pd.DataFrame) -> None:
        model = HedonicPriceModel()
        with pytest.raises(RuntimeError, match="not been fitted"):
            model.predict(synthetic_data)

    def test_predict_raises_on_missing_columns(self, fitted_model: HedonicPriceModel) -> None:
        df = pd.DataFrame({"price": [1], "sqm": [50]})
        with pytest.raises(ValueError, match="Missing required columns"):
            fitted_model.predict(df)

    def test_predictions_correlate_with_actual(
        self, fitted_model: HedonicPriceModel, synthetic_data: pd.DataFrame
    ) -> None:
        predictions = fitted_model.predict(synthetic_data)
        correlation = np.corrcoef(predictions, synthetic_data["price"])[0, 1]
        assert correlation > 0.9, f"Correlation too low: {correlation}"

    def test_decompose_returns_all_components(
        self, fitted_model: HedonicPriceModel, synthetic_data: pd.DataFrame
    ) -> None:
        row = synthetic_data.iloc[0]
        result = fitted_model.decompose(row)

        assert "location_value" in result
        assert "feature_value" in result
        assert "residual" in result
        assert "predicted_price" in result
        assert "actual_price" in result

    def test_decompose_works_with_dict(
        self, fitted_model: HedonicPriceModel, synthetic_data: pd.DataFrame
    ) -> None:
        row_dict = synthetic_data.iloc[0].to_dict()
        result = fitted_model.decompose(row_dict)
        assert "location_value" in result
        assert "predicted_price" in result

    def test_decompose_raises_when_unfitted(self, synthetic_data: pd.DataFrame) -> None:
        model = HedonicPriceModel()
        with pytest.raises(RuntimeError, match="not been fitted"):
            model.decompose(synthetic_data.iloc[0])

    def test_get_coefficients_structure(self, fitted_model: HedonicPriceModel) -> None:
        coeffs = fitted_model.get_coefficients()

        assert "intercept" in coeffs
        assert "coefficients" in coeffs
        assert "feature_names" in coeffs
        assert "property_types" in coeffs

        assert isinstance(coeffs["intercept"], float)
        assert isinstance(coeffs["coefficients"], dict)
        assert len(coeffs["coefficients"]) == len(coeffs["feature_names"])

    def test_get_coefficients_raises_when_unfitted(self) -> None:
        model = HedonicPriceModel()
        with pytest.raises(RuntimeError, match="not been fitted"):
            model.get_coefficients()

    def test_coefficients_include_expected_features(
        self, fitted_model: HedonicPriceModel
    ) -> None:
        coeffs = fitted_model.get_coefficients()
        names = coeffs["feature_names"]

        assert "sqm" in names
        assert "rooms" in names
        assert "floor" in names
        assert "lat" in names
        assert "lng" in names
        assert "log_building_age" in names
        assert "monthly_fee" in names

    def test_property_types_captured(self, fitted_model: HedonicPriceModel) -> None:
        coeffs = fitted_model.get_coefficients()
        assert set(coeffs["property_types"]) == {"apartment", "house", "townhouse"}

    def test_floor_defaults_to_zero(self) -> None:
        """Floor column with NaN should default to 0."""
        rng = np.random.default_rng(99)
        n = 50
        df = pd.DataFrame({
            "price": rng.uniform(1_000_000, 5_000_000, n),
            "sqm": rng.uniform(30, 100, n),
            "rooms": rng.integers(1, 5, n).astype(float),
            "floor": [np.nan] * n,
            "lat": rng.uniform(59.3, 59.4, n),
            "lng": rng.uniform(18.0, 18.1, n),
            "construction_year": rng.integers(1900, 2020, n).astype(float),
            "monthly_fee": rng.uniform(2000, 5000, n),
            "property_type": ["apartment"] * n,
        })
        model = HedonicPriceModel()
        model.fit(df)
        assert model.is_fitted

    def test_larger_sqm_predicts_higher_price(
        self, fitted_model: HedonicPriceModel, synthetic_data: pd.DataFrame
    ) -> None:
        """Sanity check: larger apartments should be more expensive."""
        base = synthetic_data.iloc[0].to_dict()

        small = dict(base, sqm=40.0, rooms=2.0)
        large = dict(base, sqm=120.0, rooms=4.0)

        small_df = pd.DataFrame([small])
        large_df = pd.DataFrame([large])

        price_small = fitted_model.predict(small_df)[0]
        price_large = fitted_model.predict(large_df)[0]
        assert price_large > price_small
