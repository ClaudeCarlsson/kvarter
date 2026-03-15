"""Hedonic price model for Swedish housing market.

Uses log-linear regression to decompose property prices into contributions
from location, physical features, and unobserved factors.
"""

from __future__ import annotations

import logging
from typing import Any

import numpy as np
import pandas as pd
from sklearn.linear_model import LinearRegression

logger = logging.getLogger(__name__)

REQUIRED_COLUMNS = [
    "price",
    "sqm",
    "rooms",
    "floor",
    "lat",
    "lng",
    "construction_year",
    "monthly_fee",
    "property_type",
]

CONSTRUCTION_YEAR_BASE = 1800


class HedonicPriceModel:
    """Log-linear hedonic price model for residential properties.

    Estimates log(price) as a linear function of property characteristics,
    enabling price decomposition into location, feature, and residual components.
    """

    def __init__(self) -> None:
        self._model: LinearRegression | None = None
        self._feature_names: list[str] = []
        self._property_types: list[str] = []

    @property
    def is_fitted(self) -> bool:
        return self._model is not None

    def _validate_columns(self, df: pd.DataFrame) -> None:
        missing = set(REQUIRED_COLUMNS) - set(df.columns)
        if missing:
            raise ValueError(f"Missing required columns: {sorted(missing)}")

    def _prepare_features(self, df: pd.DataFrame) -> pd.DataFrame:
        """Transform raw data into model features."""
        features = pd.DataFrame(index=df.index)

        features["sqm"] = df["sqm"].astype(float)
        features["rooms"] = df["rooms"].astype(float)
        features["floor"] = df["floor"].fillna(0).astype(float)
        features["log_building_age"] = np.log(
            df["construction_year"].astype(float) - CONSTRUCTION_YEAR_BASE
        )
        features["monthly_fee"] = df["monthly_fee"].astype(float)
        features["lat"] = df["lat"].astype(float)
        features["lng"] = df["lng"].astype(float)

        if self._property_types:
            type_dummies = pd.get_dummies(df["property_type"], prefix="type")
            for pt in self._property_types:
                col = f"type_{pt}"
                features[col] = type_dummies[col].astype(float) if col in type_dummies else 0.0
        else:
            type_dummies = pd.get_dummies(df["property_type"], prefix="type")
            self._property_types = [
                col.removeprefix("type_") for col in sorted(type_dummies.columns)
            ]
            for col in sorted(type_dummies.columns):
                features[col] = type_dummies[col].astype(float)

        self._feature_names = list(features.columns)
        return features

    def fit(self, df: pd.DataFrame) -> HedonicPriceModel:
        """Fit the model to training data.

        Args:
            df: DataFrame with columns matching REQUIRED_COLUMNS.

        Returns:
            self for chaining.
        """
        self._validate_columns(df)

        self._property_types = []
        features = self._prepare_features(df)
        target = np.log(df["price"].astype(float))

        self._model = LinearRegression()
        self._model.fit(features, target)

        r_squared = self._model.score(features, target)
        logger.info("Model fitted: R^2=%.4f, n=%d, features=%d", r_squared, len(df), len(self._feature_names))

        return self

    def predict(self, df: pd.DataFrame) -> np.ndarray:
        """Predict prices for new data.

        Args:
            df: DataFrame with the same columns as training data.

        Returns:
            Array of predicted prices (not log-prices).
        """
        if not self.is_fitted:
            raise RuntimeError("Model has not been fitted. Call fit() first.")

        self._validate_columns(df)
        features = self._prepare_features(df)
        log_prices = self._model.predict(features)
        return np.exp(log_prices)

    def decompose(self, row: pd.Series | dict[str, Any]) -> dict[str, float]:
        """Decompose a single property's predicted price into components.

        Returns:
            Dictionary with location_value, feature_value, and residual.
        """
        if not self.is_fitted:
            raise RuntimeError("Model has not been fitted. Call fit() first.")

        if isinstance(row, dict):
            row = pd.Series(row)

        df = pd.DataFrame([row])
        self._validate_columns(df)
        features = self._prepare_features(df)

        coefficients = self._model.coef_
        feature_values = features.iloc[0].values
        intercept = self._model.intercept_

        contributions = coefficients * feature_values

        feature_name_array = np.array(self._feature_names)
        location_mask = np.isin(feature_name_array, ["lat", "lng"])
        location_log = float(np.sum(contributions[location_mask]))

        feature_mask = ~location_mask
        feature_log = float(np.sum(contributions[feature_mask]))

        predicted_log_price = float(intercept + np.sum(contributions))
        actual_log_price = float(np.log(row["price"]))
        residual_log = actual_log_price - predicted_log_price

        total_log = intercept + location_log + feature_log
        predicted_price = np.exp(total_log)
        location_share = np.exp(intercept + location_log) / np.exp(intercept)
        feature_share = np.exp(intercept + feature_log) / np.exp(intercept)

        base = float(np.exp(intercept))
        location_value = float(base * location_share - base)
        feature_value = float(base * feature_share - base)
        residual = float(np.exp(actual_log_price) - predicted_price)

        return {
            "location_value": round(location_value, 2),
            "feature_value": round(feature_value, 2),
            "residual": round(residual, 2),
            "predicted_price": round(float(predicted_price), 2),
            "actual_price": round(float(row["price"]), 2),
        }

    def get_coefficients(self) -> dict[str, Any]:
        """Return model coefficients as a dictionary.

        Returns:
            Dictionary with intercept, coefficients, and feature names.
        """
        if not self.is_fitted:
            raise RuntimeError("Model has not been fitted. Call fit() first.")

        return {
            "intercept": float(self._model.intercept_),
            "coefficients": {
                name: float(coef)
                for name, coef in zip(self._feature_names, self._model.coef_, strict=True)
            },
            "feature_names": list(self._feature_names),
            "property_types": list(self._property_types),
        }
