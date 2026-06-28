import React, { useEffect } from "react";
import FeaturedFlight from "../../components/FeaturedFlight";
import MainHero from "../../components/MainHero";
import DefaultLayout from "../../layout/DefaultLayout";
import BookingPage from "../booking/BookingPage";
import HomeImage from "./HomeImage";
import MoreThanFlight from "./MoreThanFlight";

const HomePage = () => {
  // Trigger geolocation popup on every page load until user allows.
  useEffect(() => {
    const already = localStorage.getItem('user_location');
    if (already) return; // we already have permission + cached coords

    if (!('geolocation' in navigator)) return;

    const backend = (process.env.REACT_APP_BACKEND_URL as string) || 'http://localhost:4001';

    const reverseGeocode = async (lat: number, lon: number): Promise<string | null> => {
      try {
        const res = await fetch(`${backend}/api/location/reverse?lat=${lat}&lon=${lon}`, {
          headers: { 'Accept': 'application/json' },
        });
        if (!res.ok) return null;
        const data = await res.json();
        return data?.city || null;
      } catch {
        return null;
      }
    };

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const lat = pos.coords.latitude;
          const lon = pos.coords.longitude;
          const city = await reverseGeocode(lat, lon);
          localStorage.setItem('user_location', JSON.stringify({ lat, lon, city: city || null, ts: Date.now() }));
          // If user is logged in, try to persist a hint to preferences
          try {
            const userRaw = localStorage.getItem('user');
            const user = userRaw ? JSON.parse(userRaw) : null;
            const userId = user?._id || user?.id;
            if (userId && city) {
              await fetch(`${backend.replace(/\/$/, '')}/api/ai/user/preferences/update/${userId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ destinations: [city] }),
              });
            }
          } catch {}
        } catch {}
      },
      () => {
        // Denied or error. On next reload we will prompt again.
      },
      { enableHighAccuracy: false, maximumAge: 60000, timeout: 15000 }
    );
  }, []);

  return (
    <DefaultLayout>
      <MainHero />
      <div >
        <div id="search-flight" className="max-w-screen-2xl mx-auto px-2 md:px-4 scroll-m-[350px]">
          <BookingPage />
          <FeaturedFlight />
        </div>
        <HomeImage />
        <div className="max-w-screen-2xl mx-auto px-2 md:px-4">
          <MoreThanFlight />
        </div>
      </div>
    </DefaultLayout>
  );
};

export default HomePage;
