import React, { useState } from "react";
import TripArchive from "../components/TripArchive";
import TripStats from "../components/TripStats";
import type { ArchivedTrip } from "../types/phase7";

// Sample archived trips data
const sampleArchivedTrips: ArchivedTrip[] = [
  {
    id: "trip_001",
    title: "Paris Getaway",
    destination: "Paris, France",
    startDate: "2024-01-15",
    endDate: "2024-01-20",
    thumbnailUrl: "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=400",
    status: "completed",
    totalCost: 2850,
    currency: "USD",
    metadata: {
      segments: 5,
      travelers: 2,
      preferences: ["Culture", "Food", "Romance"]
    }
  },
  {
    id: "trip_002",
    title: "Tokyo Adventure",
    destination: "Tokyo, Japan",
    startDate: "2023-11-10",
    endDate: "2023-11-18",
    thumbnailUrl: "https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=400",
    status: "completed",
    totalCost: 3200,
    currency: "USD",
    metadata: {
      segments: 6,
      travelers: 1,
      preferences: ["Technology", "Food", "Culture"]
    }
  },
  {
    id: "trip_003",
    title: "Barcelona Weekend",
    destination: "Barcelona, Spain",
    startDate: "2023-09-22",
    endDate: "2023-09-25",
    thumbnailUrl: "https://images.unsplash.com/photo-1562883676-8c7feb83f09b?w=400",
    status: "completed",
    totalCost: 1200,
    currency: "USD",
    metadata: {
      segments: 4,
      travelers: 2,
      preferences: ["Beaches", "Architecture", "Nightlife"]
    }
  },
  {
    id: "trip_004",
    title: "Rome Holiday",
    destination: "Rome, Italy",
    startDate: "2023-07-15",
    endDate: "2023-07-22",
    thumbnailUrl: "https://images.unsplash.com/photo-1552832230-c0197dd311b5?w=400",
    status: "cancelled",
    totalCost: 0,
    currency: "USD",
    metadata: {
      segments: 0,
      travelers: 2,
      preferences: ["History", "Food", "Culture"]
    }
  },
  {
    id: "trip_005",
    title: "Amsterdam Trip",
    destination: "Amsterdam, Netherlands",
    startDate: "2023-05-10",
    endDate: "2023-05-15",
    thumbnailUrl: "https://images.unsplash.com/photo-1534351590666-13e3e963b3b6?w=400",
    status: "archived",
    totalCost: 1800,
    currency: "USD",
    metadata: {
      segments: 5,
      travelers: 3,
      preferences: ["Canals", "Biking", "Culture"]
    }
  },
  {
    id: "trip_006",
    title: "London Explorer",
    destination: "London, UK",
    startDate: "2023-03-20",
    endDate: "2023-03-25",
    thumbnailUrl: "https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=400",
    status: "completed",
    totalCost: 2100,
    currency: "USD",
    metadata: {
      segments: 5,
      travelers: 1,
      preferences: ["History", "Theater", "Food"]
    }
  }
];

const TripArchiveDemo: React.FC = () => {
  const [showStats, setShowStats] = useState(false);

  const handleTripClick = (trip: ArchivedTrip) => {
    console.log('Trip clicked:', trip);
    // In a real app, this would navigate to trip details
  };

  if (showStats) {
    return (
      <div className="max-w-md mx-auto bg-background p-4">
        <TripStats
          trips={sampleArchivedTrips}
          onClose={() => setShowStats(false)}
        />
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto bg-background p-4 space-y-6">
      <div className="text-center mb-6">
        <h1 className="text-2xl font-bold text-foreground mb-2">Trip Archive Demo</h1>
        <p className="text-muted-foreground">Phase 7 Week 4: Archive System</p>
      </div>

      <TripArchive
        trips={sampleArchivedTrips}
        onTripClick={handleTripClick}
        onViewStats={() => setShowStats(true)}
      />

      {/* Demo Info */}
      <div className="bg-muted rounded-lg p-4">
        <h3 className="font-semibold text-foreground mb-2">Archive System Features</h3>
        <ul className="text-sm text-muted-foreground space-y-1">
          <li>• Trip cards with status indicators and key info</li>
          <li>• Search and filter by destination/status</li>
          <li>• Grid and list view modes</li>
          <li>• Trip statistics and spending analytics</li>
          <li>• Top destinations and monthly trends</li>
          <li>• Completion rates and cost insights</li>
        </ul>
      </div>
    </div>
  );
};

export default TripArchiveDemo;