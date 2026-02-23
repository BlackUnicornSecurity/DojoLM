"""Simple data utilities for the application."""

from datetime import datetime
from typing import List, Dict, Any


def format_timestamp(dt: datetime) -> str:
    """Format a datetime object as ISO 8601 string."""
    return dt.isoformat()


def filter_active(items: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """Filter items to only include active ones."""
    return [item for item in items if item.get('active', False)]


def calculate_average(values: List[float]) -> float:
    """Calculate the arithmetic mean of a list of values."""
    if not values:
        return 0.0
    return sum(values) / len(values)
