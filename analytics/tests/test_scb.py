"""Tests for the SCB API client."""

from __future__ import annotations

from unittest.mock import AsyncMock, patch

import httpx
import pandas as pd
import pytest

from analytics.sources.scb import SCB_BASE_URL, SCBClient


@pytest.fixture
def scb_client() -> SCBClient:
    return SCBClient()


@pytest.fixture
def price_index_response() -> dict:
    """Mock SCB price index API response."""
    return {
        "data": [
            {"key": ["01", "2020"], "values": ["325"]},
            {"key": ["01", "2021"], "values": ["350"]},
            {"key": ["01", "2022"], "values": ["340"]},
            {"key": ["01", "2023"], "values": [".."]},
        ]
    }


@pytest.fixture
def population_response() -> dict:
    """Mock SCB population API response."""
    return {
        "data": [
            {"key": ["0180", "2020"], "values": ["975000"]},
            {"key": ["0180", "2021"], "values": ["984000"]},
            {"key": ["0180", "2022"], "values": ["990000"]},
        ]
    }


def _make_mock_response(data: dict, status_code: int = 200) -> httpx.Response:
    """Create a mock httpx.Response."""
    response = httpx.Response(
        status_code=status_code,
        json=data,
        request=httpx.Request("POST", "https://api.scb.se/test"),
    )
    return response


class TestSCBClient:
    def test_default_base_url(self) -> None:
        client = SCBClient()
        assert client._base_url == SCB_BASE_URL.rstrip("/")

    def test_custom_base_url(self) -> None:
        client = SCBClient(base_url="https://custom.api/")
        assert client._base_url == "https://custom.api"

    @pytest.mark.asyncio
    async def test_fetch_real_estate_prices(
        self, scb_client: SCBClient, price_index_response: dict
    ) -> None:
        mock_response = _make_mock_response(price_index_response)

        with patch("analytics.sources.scb.httpx.AsyncClient") as mock_client_cls:
            mock_client = AsyncMock()
            mock_client.post.return_value = mock_response
            mock_client.__aenter__ = AsyncMock(return_value=mock_client)
            mock_client.__aexit__ = AsyncMock(return_value=False)
            mock_client_cls.return_value = mock_client

            df = await scb_client.fetch_real_estate_prices("01")

        assert len(df) == 4
        assert list(df.columns) == ["region", "year", "price_index"]
        assert df["year"].tolist() == [2020, 2021, 2022, 2023]
        assert df.loc[df["year"] == 2020, "price_index"].iloc[0] == 325.0
        assert pd.isna(df.loc[df["year"] == 2023, "price_index"].iloc[0])

    @pytest.mark.asyncio
    async def test_fetch_real_estate_prices_empty(self, scb_client: SCBClient) -> None:
        mock_response = _make_mock_response({"data": []})

        with patch("analytics.sources.scb.httpx.AsyncClient") as mock_client_cls:
            mock_client = AsyncMock()
            mock_client.post.return_value = mock_response
            mock_client.__aenter__ = AsyncMock(return_value=mock_client)
            mock_client.__aexit__ = AsyncMock(return_value=False)
            mock_client_cls.return_value = mock_client

            df = await scb_client.fetch_real_estate_prices("99")

        assert len(df) == 0

    @pytest.mark.asyncio
    async def test_fetch_population(
        self, scb_client: SCBClient, population_response: dict
    ) -> None:
        mock_response = _make_mock_response(population_response)

        with patch("analytics.sources.scb.httpx.AsyncClient") as mock_client_cls:
            mock_client = AsyncMock()
            mock_client.post.return_value = mock_response
            mock_client.__aenter__ = AsyncMock(return_value=mock_client)
            mock_client.__aexit__ = AsyncMock(return_value=False)
            mock_client_cls.return_value = mock_client

            df = await scb_client.fetch_population("0180")

        assert len(df) == 3
        assert list(df.columns) == ["municipality", "year", "population"]
        assert df.loc[df["year"] == 2020, "population"].iloc[0] == 975000

    @pytest.mark.asyncio
    async def test_fetch_population_empty(self, scb_client: SCBClient) -> None:
        mock_response = _make_mock_response({"data": []})

        with patch("analytics.sources.scb.httpx.AsyncClient") as mock_client_cls:
            mock_client = AsyncMock()
            mock_client.post.return_value = mock_response
            mock_client.__aenter__ = AsyncMock(return_value=mock_client)
            mock_client.__aexit__ = AsyncMock(return_value=False)
            mock_client_cls.return_value = mock_client

            df = await scb_client.fetch_population("9999")

        assert len(df) == 0

    @pytest.mark.asyncio
    async def test_fetch_prices_sends_correct_query(self, scb_client: SCBClient) -> None:
        mock_response = _make_mock_response({"data": []})

        with patch("analytics.sources.scb.httpx.AsyncClient") as mock_client_cls:
            mock_client = AsyncMock()
            mock_client.post.return_value = mock_response
            mock_client.__aenter__ = AsyncMock(return_value=mock_client)
            mock_client.__aexit__ = AsyncMock(return_value=False)
            mock_client_cls.return_value = mock_client

            await scb_client.fetch_real_estate_prices("01")

            call_args = mock_client.post.call_args
            url = call_args[0][0]
            json_body = call_args[1]["json"]

            assert "BO/BO0501/BO0501A/FastpijKvworAr" in url
            assert json_body["query"][0]["code"] == "Region"
            assert json_body["query"][0]["selection"]["values"] == ["01"]

    @pytest.mark.asyncio
    async def test_fetch_population_sends_correct_query(self, scb_client: SCBClient) -> None:
        mock_response = _make_mock_response({"data": []})

        with patch("analytics.sources.scb.httpx.AsyncClient") as mock_client_cls:
            mock_client = AsyncMock()
            mock_client.post.return_value = mock_response
            mock_client.__aenter__ = AsyncMock(return_value=mock_client)
            mock_client.__aexit__ = AsyncMock(return_value=False)
            mock_client_cls.return_value = mock_client

            await scb_client.fetch_population("0180")

            call_args = mock_client.post.call_args
            url = call_args[0][0]
            json_body = call_args[1]["json"]

            assert "BE/BE0101/BE0101A/FolsijTotManworKworAr" in url
            assert json_body["query"][0]["selection"]["values"] == ["0180"]

    @pytest.mark.asyncio
    async def test_fetch_prices_skips_malformed_entries(self, scb_client: SCBClient) -> None:
        """Entries with fewer than 2 key values should be skipped."""
        malformed_response = {
            "data": [
                {"key": ["01"], "values": ["100"]},
                {"key": ["01", "2020"], "values": ["325"]},
                {"key": [], "values": []},
            ]
        }
        mock_response = _make_mock_response(malformed_response)

        with patch("analytics.sources.scb.httpx.AsyncClient") as mock_client_cls:
            mock_client = AsyncMock()
            mock_client.post.return_value = mock_response
            mock_client.__aenter__ = AsyncMock(return_value=mock_client)
            mock_client.__aexit__ = AsyncMock(return_value=False)
            mock_client_cls.return_value = mock_client

            df = await scb_client.fetch_real_estate_prices("01")

        assert len(df) == 1
        assert df["year"].iloc[0] == 2020

    @pytest.mark.asyncio
    async def test_fetch_population_skips_malformed_entries(self, scb_client: SCBClient) -> None:
        """Population entries with fewer than 2 key values should be skipped."""
        malformed_response = {
            "data": [
                {"key": ["0180"], "values": ["100"]},
                {"key": ["0180", "2021"], "values": ["984000"]},
            ]
        }
        mock_response = _make_mock_response(malformed_response)

        with patch("analytics.sources.scb.httpx.AsyncClient") as mock_client_cls:
            mock_client = AsyncMock()
            mock_client.post.return_value = mock_response
            mock_client.__aenter__ = AsyncMock(return_value=mock_client)
            mock_client.__aexit__ = AsyncMock(return_value=False)
            mock_client_cls.return_value = mock_client

            df = await scb_client.fetch_population("0180")

        assert len(df) == 1
        assert df["population"].iloc[0] == 984000
