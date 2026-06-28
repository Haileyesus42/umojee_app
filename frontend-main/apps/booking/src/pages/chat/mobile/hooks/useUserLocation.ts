import { useEffect, useRef, useState } from "react";

export function useUserLocation() {
    const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const fetchedRef = useRef(false);

    useEffect(() => {
        if (fetchedRef.current) return;

        if (!navigator.geolocation) {
            setError("Geolocation not supported");
            return;
        }

        setLoading(true);
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const { latitude, longitude } = position.coords;
                setUserLocation({ lat: latitude, lng: longitude });
                fetchedRef.current = true;
                setLoading(false);
            },
            () => {
                setError("Location access denied");
                setLoading(false);
            },
            { enableHighAccuracy: true, timeout: 10000 }
        );
    }, []);

    return { userLocation, loading, error };
}
