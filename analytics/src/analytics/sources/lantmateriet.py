"""Lantmateriet open data client.

Provides access to Swedish land registry data. Full API access
requires registration at https://www.lantmateriet.se/oppnadata/.
"""

from __future__ import annotations

import logging

import httpx
import pandas as pd

logger = logging.getLogger(__name__)

LANTMATERIET_BASE_URL = "https://api.lantmateriet.se/open/v1"


class LantmaterietClient:
    """Client for Lantmateriet open data APIs.

    Note: Most endpoints require an API key obtained through registration.
    This client provides the interface; actual data fetching requires
    valid credentials.
    """

    def __init__(
        self,
        base_url: str = LANTMATERIET_BASE_URL,
        api_key: str | None = None,
    ) -> None:
        self._base_url = base_url.rstrip("/")
        self._api_key = api_key

    def _get_headers(self) -> dict[str, str]:
        headers: dict[str, str] = {"Accept": "application/json"}
        if self._api_key:
            headers["Authorization"] = f"Bearer {self._api_key}"
        return headers

    async def fetch_property_transfers(
        self,
        from_date: str,
        to_date: str,
    ) -> pd.DataFrame:
        """Fetch property transfer records.

        Note: This is a stub implementation. Full access to property
        transfer data requires registration and an API key from
        Lantmateriet.

        Args:
            from_date: Start date (YYYY-MM-DD).
            to_date: End date (YYYY-MM-DD).

        Returns:
            Empty DataFrame with expected schema. When API access is
            configured, returns actual transfer records.
        """
        logger.warning(
            "Lantmateriet property transfer API is not configured. "
            "Register at https://www.lantmateriet.se/oppnadata/ for access."
        )

        if self._api_key:
            url = f"{self._base_url}/property-transfers"
            params = {"from": from_date, "to": to_date}

            async with httpx.AsyncClient() as client:
                response = await client.get(
                    url,
                    params=params,
                    headers=self._get_headers(),
                    timeout=30.0,
                )
                response.raise_for_status()

            data = response.json()
            return pd.DataFrame(data.get("transfers", []))

        return pd.DataFrame(
            columns=[
                "transfer_date",
                "property_id",
                "municipality",
                "price",
                "area_sqm",
                "property_type",
            ]
        )
