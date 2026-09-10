# backend/app/services/geo.py
from math import radians, sin, cos, sqrt, atan2


def haversine_distance_meters(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """
    Great-circle distance between two lat/lng points, in metres.
    Standard Haversine formula — accurate enough for the short distances
    involved here (comparing a merchant's location to an employee's),
    doesn't need anything more sophisticated than Earth-as-a-sphere.
    """
    R = 6371000  # Earth's mean radius in metres
    phi1, phi2 = radians(lat1), radians(lat2)
    d_phi = radians(lat2 - lat1)
    d_lambda = radians(lon2 - lon1)

    a = sin(d_phi / 2) ** 2 + cos(phi1) * cos(phi2) * sin(d_lambda / 2) ** 2
    c = 2 * atan2(sqrt(a), sqrt(1 - a))
    return R * c
