"""Base protocol for data sources."""

from __future__ import annotations

from typing import Protocol

import pandas as pd


class DataSource(Protocol):
    """Protocol that all data source clients must satisfy."""

    async def fetch_transactions(
        self,
        municipality: str,
        from_date: str,
        to_date: str,
    ) -> pd.DataFrame:
        """Fetch property transaction records.

        Args:
            municipality: Municipality code or name.
            from_date: Start date (YYYY-MM-DD).
            to_date: End date (YYYY-MM-DD).

        Returns:
            DataFrame with transaction records.
        """
        ...

    async def fetch_price_index(self, region: str) -> pd.DataFrame:
        """Fetch price index time series for a region.

        Args:
            region: Region identifier.

        Returns:
            DataFrame with date and index columns.
        """
        ...
