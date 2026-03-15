"""SCB (Statistics Sweden) API client.

Fetches statistical data from SCB's open API for real estate prices
and population statistics.
"""

from __future__ import annotations

import logging

import httpx
import pandas as pd

logger = logging.getLogger(__name__)

SCB_BASE_URL = "https://api.scb.se/OV0104/v1/doris/sv/ssd/"


class SCBClient:
    """Async client for the SCB statistical database API."""

    def __init__(self, base_url: str = SCB_BASE_URL) -> None:
        self._base_url = base_url.rstrip("/")

    async def fetch_real_estate_prices(self, region_code: str) -> pd.DataFrame:
        """Fetch real estate price index data from SCB.

        Queries the BO/BO0501/BO0501A/FastpijKvworAr table for
        property price indices by region.

        Args:
            region_code: SCB region code (e.g., "01" for Stockholm county).

        Returns:
            DataFrame with columns: year, region, price_index.
        """
        table_path = "BO/BO0501/BO0501A/FastpijKvworAr"
        url = f"{self._base_url}/{table_path}"

        query = {
            "query": [
                {
                    "code": "Region",
                    "selection": {"filter": "item", "values": [region_code]},
                },
            ],
            "response": {"format": "json"},
        }

        async with httpx.AsyncClient() as client:
            response = await client.post(url, json=query, timeout=30.0)
            response.raise_for_status()

        raw = response.json()
        rows = []
        for entry in raw.get("data", []):
            key_values = entry.get("key", [])
            data_values = entry.get("values", [])
            if len(key_values) >= 2 and data_values:
                rows.append({
                    "region": key_values[0],
                    "year": int(key_values[1]),
                    "price_index": float(data_values[0]) if data_values[0] != ".." else None,
                })

        df = pd.DataFrame(rows)
        logger.info("Fetched %d price index records for region %s", len(df), region_code)
        return df

    async def fetch_population(self, municipality_code: str) -> pd.DataFrame:
        """Fetch population statistics for a municipality.

        Args:
            municipality_code: SCB municipality code (e.g., "0180" for Stockholm).

        Returns:
            DataFrame with columns: year, municipality, population.
        """
        table_path = "BE/BE0101/BE0101A/FolsijTotManworKworAr"
        url = f"{self._base_url}/{table_path}"

        query = {
            "query": [
                {
                    "code": "Region",
                    "selection": {"filter": "item", "values": [municipality_code]},
                },
            ],
            "response": {"format": "json"},
        }

        async with httpx.AsyncClient() as client:
            response = await client.post(url, json=query, timeout=30.0)
            response.raise_for_status()

        raw = response.json()
        rows = []
        for entry in raw.get("data", []):
            key_values = entry.get("key", [])
            data_values = entry.get("values", [])
            if len(key_values) >= 2 and data_values:
                rows.append({
                    "municipality": key_values[0],
                    "year": int(key_values[1]),
                    "population": int(data_values[0]) if data_values[0] != ".." else None,
                })

        df = pd.DataFrame(rows)
        logger.info("Fetched %d population records for municipality %s", len(df), municipality_code)
        return df
