"""Tests for the pipeline runner."""

from __future__ import annotations

import subprocess
import sys
from pathlib import Path
from unittest.mock import AsyncMock, patch

import numpy as np
import pandas as pd
import pytest

from analytics.pipeline.runner import PipelineRunner
from analytics.sources.scb import SCBClient


@pytest.fixture
def training_data() -> pd.DataFrame:
    """Synthetic training data for pipeline tests."""
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
def mock_scb_client() -> SCBClient:
    """SCB client with mocked async methods."""
    client = SCBClient()
    return client


@pytest.fixture
def pipeline(mock_scb_client: SCBClient, tmp_path: Path) -> PipelineRunner:
    return PipelineRunner(
        scb_client=mock_scb_client,
        coefficients_path=tmp_path / "coefficients.json",
    )


class TestPipelineRunner:
    def test_initial_state(self, pipeline: PipelineRunner) -> None:
        assert pipeline.model is None

    def test_run_training_pipeline(
        self, pipeline: PipelineRunner, training_data: pd.DataFrame, tmp_path: Path
    ) -> None:
        result = pipeline.run_training_pipeline(training_data)

        assert pipeline.model is not None
        assert pipeline.model.is_fitted
        assert "version" in result
        assert "intercept" in result
        assert "coefficients" in result
        assert (tmp_path / "coefficients.json").exists()

    def test_training_pipeline_exports_valid_json(
        self, pipeline: PipelineRunner, training_data: pd.DataFrame, tmp_path: Path
    ) -> None:
        import json

        pipeline.run_training_pipeline(training_data)

        with open(tmp_path / "coefficients.json") as f:
            data = json.load(f)

        assert data["version"] == "1.0"
        assert isinstance(data["intercept"], float)
        assert len(data["coefficients"]) > 0

    @pytest.mark.asyncio
    async def test_run_data_refresh(self, pipeline: PipelineRunner) -> None:
        mock_df = pd.DataFrame({
            "region": ["01", "01"],
            "year": [2020, 2021],
            "price_index": [325.0, 350.0],
        })

        with patch.object(
            pipeline._scb_client,
            "fetch_real_estate_prices",
            new_callable=AsyncMock,
            return_value=mock_df,
        ):
            result = await pipeline.run_data_refresh()

        assert len(result) == 2
        assert "price_index" in result.columns

    @pytest.mark.asyncio
    async def test_run_data_refresh_calls_scb(self, pipeline: PipelineRunner) -> None:
        mock_df = pd.DataFrame(columns=["region", "year", "price_index"])

        with patch.object(
            pipeline._scb_client,
            "fetch_real_estate_prices",
            new_callable=AsyncMock,
            return_value=mock_df,
        ) as mock_fetch:
            await pipeline.run_data_refresh()
            mock_fetch.assert_called_once_with("01")

    def test_default_constructor(self) -> None:
        runner = PipelineRunner()
        assert runner.model is None
        assert runner._scb_client is not None

    def test_training_pipeline_with_small_data(self, tmp_path: Path) -> None:
        """Pipeline works with minimal valid data."""
        rng = np.random.default_rng(7)
        n = 20
        small_data = pd.DataFrame({
            "price": rng.uniform(1_000_000, 3_000_000, n),
            "sqm": rng.uniform(30, 80, n),
            "rooms": rng.integers(1, 4, n).astype(float),
            "floor": rng.integers(0, 5, n).astype(float),
            "lat": rng.uniform(59.3, 59.35, n),
            "lng": rng.uniform(18.0, 18.05, n),
            "construction_year": rng.integers(1920, 2010, n).astype(float),
            "monthly_fee": rng.uniform(2000, 4000, n),
            "property_type": ["apartment"] * n,
        })

        runner = PipelineRunner(coefficients_path=tmp_path / "small.json")
        result = runner.run_training_pipeline(small_data)
        assert runner.model.is_fitted
        assert (tmp_path / "small.json").exists()
        assert result["version"] == "1.0"

    def test_main_block_runs(self) -> None:
        """The __main__ block should execute without error."""
        result = subprocess.run(
            [sys.executable, "-m", "analytics.pipeline.runner"],
            capture_output=True,
            text=True,
            timeout=10,
        )
        assert result.returncode == 0
        assert "pipeline runner started" in result.stderr.lower()
