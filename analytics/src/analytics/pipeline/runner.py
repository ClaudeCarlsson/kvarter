"""Pipeline orchestration for analytics batch jobs.

Coordinates data fetching, model training, and coefficient export
as a single runnable pipeline.
"""

from __future__ import annotations

import logging
from pathlib import Path

import pandas as pd

from analytics.model.coefficients import export_coefficients
from analytics.model.hedonic import HedonicPriceModel
from analytics.sources.scb import SCBClient

logger = logging.getLogger(__name__)

DEFAULT_COEFFICIENTS_PATH = Path("data/coefficients.json")

STOCKHOLM_REGION_CODE = "01"


class PipelineRunner:
    """Orchestrates the analytics pipeline.

    Coordinates data fetching from external sources, model training,
    and coefficient export for consumption by the Next.js frontend.
    """

    def __init__(
        self,
        scb_client: SCBClient | None = None,
        coefficients_path: Path = DEFAULT_COEFFICIENTS_PATH,
    ) -> None:
        self._scb_client = scb_client or SCBClient()
        self._coefficients_path = coefficients_path
        self._model: HedonicPriceModel | None = None

    @property
    def model(self) -> HedonicPriceModel | None:
        return self._model

    async def run_data_refresh(self) -> pd.DataFrame:
        """Fetch fresh data from external sources.

        Returns:
            DataFrame with price index data.
        """
        logger.info("Starting data refresh...")

        price_data = await self._scb_client.fetch_real_estate_prices(STOCKHOLM_REGION_CODE)
        logger.info("Fetched %d price index records", len(price_data))

        return price_data

    def run_training_pipeline(self, training_data: pd.DataFrame) -> dict:
        """Run the full training pipeline.

        Args:
            training_data: DataFrame with property transaction data
                matching the hedonic model's required columns.

        Returns:
            Dictionary with exported coefficient data.
        """
        logger.info("Starting training pipeline with %d records...", len(training_data))

        self._model = HedonicPriceModel()
        self._model.fit(training_data)

        coefficients = self._model.get_coefficients()
        logger.info(
            "Model trained: intercept=%.4f, %d features",
            coefficients["intercept"],
            len(coefficients["feature_names"]),
        )

        exported = export_coefficients(self._model, self._coefficients_path)
        logger.info("Coefficients exported to %s", self._coefficients_path)

        return exported


if __name__ == "__main__":
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s [%(name)s] %(levelname)s: %(message)s",
    )
    logger.info("Analytics pipeline runner started. Use run_training_pipeline() with data.")
