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
from sklearn.model_selection import KFold

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
        self._feature_means: dict[str, float] = {}
        self._cv_mae_percent: float | None = None

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

        # Compute and store feature means for Shapley decomposition
        self._feature_means = {
            name: float(features[name].mean())
            for name in self._feature_names
        }

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

    def compute_feature_means(self) -> dict[str, float]:
        """Return the stored feature means computed during fit().

        These means are used for Shapley-value decomposition on the
        TypeScript side: each feature's contribution is centered around
        its population mean.

        Returns:
            Dictionary mapping feature name to its training-set mean.

        Raises:
            RuntimeError: If the model has not been fitted.
        """
        if not self.is_fitted:
            raise RuntimeError("Model has not been fitted. Call fit() first.")

        return dict(self._feature_means)

    def cross_validate(self, df: pd.DataFrame, n_folds: int = 5) -> dict[str, float]:
        """Perform k-fold cross-validation and return error metrics.

        For each fold:
        1. Fit the model on the training split.
        2. Predict on the held-out validation split.
        3. Compute MAE% (mean absolute error as a percentage of actual price).

        Args:
            df: Full training DataFrame.
            n_folds: Number of cross-validation folds (default 5).

        Returns:
            Dictionary with:
            - mean_mae_percent: average MAE% across folds
            - std_mae_percent: standard deviation of MAE% across folds
            - fold_maes: list of per-fold MAE% values
        """
        self._validate_columns(df)

        kf = KFold(n_splits=n_folds, shuffle=True, random_state=42)
        fold_maes: list[float] = []

        for train_idx, val_idx in kf.split(df):
            train_df = df.iloc[train_idx].reset_index(drop=True)
            val_df = df.iloc[val_idx].reset_index(drop=True)

            fold_model = HedonicPriceModel()
            fold_model.fit(train_df)
            predictions = fold_model.predict(val_df)

            actual = val_df["price"].values.astype(float)
            abs_errors_pct = np.abs((actual - predictions) / actual) * 100
            fold_mae = float(np.mean(abs_errors_pct))
            fold_maes.append(fold_mae)

        mean_mae = float(np.mean(fold_maes))
        std_mae = float(np.std(fold_maes))

        self._cv_mae_percent = mean_mae

        logger.info(
            "Cross-validation: MAE%%=%.2f +/- %.2f across %d folds",
            mean_mae,
            std_mae,
            n_folds,
        )

        return {
            "mean_mae_percent": round(mean_mae, 2),
            "std_mae_percent": round(std_mae, 2),
            "fold_maes": [round(m, 2) for m in fold_maes],
        }

    def get_coefficients(self) -> dict[str, Any]:
        """Return model coefficients as a dictionary.

        Returns:
            Dictionary with intercept, coefficients, feature names,
            property types, feature means, and cross-validation MAE
            (if cross_validate has been called).
        """
        if not self.is_fitted:
            raise RuntimeError("Model has not been fitted. Call fit() first.")

        result: dict[str, Any] = {
            "intercept": float(self._model.intercept_),
            "coefficients": {
                name: float(coef)
                for name, coef in zip(self._feature_names, self._model.coef_, strict=True)
            },
            "feature_names": list(self._feature_names),
            "property_types": list(self._property_types),
            "feature_means": dict(self._feature_means),
        }

        if self._cv_mae_percent is not None:
            result["model_mae_percent"] = round(self._cv_mae_percent, 2)

        return result
