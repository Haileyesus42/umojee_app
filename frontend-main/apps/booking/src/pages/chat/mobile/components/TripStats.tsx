import React from "react";
import { FiTrendingUp, FiMapPin, FiDollarSign, FiCalendar, FiUsers, FiStar } from "react-icons/fi";
import type { ArchivedTrip } from "../types/phase7";

interface TripStatsProps {
  trips: ArchivedTrip[];
  onClose?: () => void;
  className?: string;
}

const TripStats: React.FC<TripStatsProps> = ({ trips, onClose, className = "" }) => {
  const completedTrips = trips.filter(t => t.status === 'completed');

  const stats = {
    totalTrips: trips.length,
    completedTrips: completedTrips.length,
    completionRate: trips.length > 0 ? (completedTrips.length / trips.length) * 100 : 0,
    totalSpent: completedTrips.reduce((sum, t) => sum + (t.totalCost || 0), 0),
    averageCost: completedTrips.length > 0
      ? completedTrips.reduce((sum, t) => sum + (t.totalCost || 0), 0) / completedTrips.length
      : 0,
    destinations: Array.from(new Set(completedTrips.map(t => t.destination))).length,
    totalTravelers: completedTrips.reduce((sum, t) => sum + t.metadata.travelers, 0),
    averageTravelers: completedTrips.length > 0
      ? completedTrips.reduce((sum, t) => sum + t.metadata.travelers, 0) / completedTrips.length
      : 0,
  };

  const topDestinations = completedTrips.reduce((acc, trip) => {
    acc[trip.destination] = (acc[trip.destination] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const sortedDestinations = Object.entries(topDestinations)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 5);

  const monthlySpending = completedTrips.reduce((acc, trip) => {
    if (trip.totalCost) {
      const month = new Date(trip.startDate).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
      acc[month] = (acc[month] || 0) + trip.totalCost;
    }
    return acc;
  }, {} as Record<string, number>);

  const sortedMonths = Object.entries(monthlySpending)
    .sort(([a], [b]) => new Date(a).getTime() - new Date(b).getTime())
    .slice(-6); // Last 6 months

  return (
    <div className={`my-3 ${className}`}>
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-medium text-foreground">
          <FiTrendingUp className="h-4 w-4" />
          <span>Trip Statistics</span>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="flex items-center gap-1.5 rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-muted"
          >
            <span>Close</span>
          </button>
        )}
      </div>

      {/* Key Metrics */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-lg bg-card p-4 text-center border">
          <FiMapPin className="mx-auto h-6 w-6 text-primary mb-2" />
          <div className="text-2xl font-bold text-primary">{stats.destinations}</div>
          <div className="text-xs text-muted-foreground">Destinations</div>
        </div>

        <div className="rounded-lg bg-card p-4 text-center border">
          <FiDollarSign className="mx-auto h-6 w-6 text-emerald-600 mb-2" />
          <div className="text-2xl font-bold text-emerald-600">
            ${stats.totalSpent.toLocaleString()}
          </div>
          <div className="text-xs text-muted-foreground">Total Spent</div>
        </div>

        <div className="rounded-lg bg-card p-4 text-center border">
          <FiCalendar className="mx-auto h-6 w-6 text-blue-600 mb-2" />
          <div className="text-2xl font-bold text-blue-600">{stats.completedTrips}</div>
          <div className="text-xs text-muted-foreground">Trips Completed</div>
        </div>

        <div className="rounded-lg bg-card p-4 text-center border">
          <FiUsers className="mx-auto h-6 w-6 text-amber-600 mb-2" />
          <div className="text-2xl font-bold text-amber-600">{stats.totalTravelers}</div>
          <div className="text-xs text-muted-foreground">Travelers</div>
        </div>
      </div>

      {/* Detailed Stats */}
      <div className="grid gap-4 sm:grid-cols-2">
        {/* Completion Rate */}
        <div className="rounded-lg bg-card p-4 border">
          <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
            <FiStar className="h-4 w-4" />
            Trip Completion
          </h3>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Completion Rate</span>
              <span className="font-medium">{stats.completionRate.toFixed(1)}%</span>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-primary transition-all duration-300"
                style={{ width: `${stats.completionRate}%` }}
              />
            </div>
            <div className="text-xs text-muted-foreground">
              {stats.completedTrips} of {stats.totalTrips} trips completed
            </div>
          </div>
        </div>

        {/* Average Cost */}
        <div className="rounded-lg bg-card p-4 border">
          <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
            <FiDollarSign className="h-4 w-4" />
            Spending Insights
          </h3>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Average per Trip</span>
              <span className="font-medium">${stats.averageCost.toFixed(0)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Avg Travelers</span>
              <span className="font-medium">{stats.averageTravelers.toFixed(1)}</span>
            </div>
            <div className="text-xs text-muted-foreground">
              Cost per person: ${(stats.averageCost / stats.averageTravelers).toFixed(0)}
            </div>
          </div>
        </div>
      </div>

      {/* Top Destinations */}
      <div className="mt-4 rounded-lg bg-card p-4 border">
        <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
          <FiMapPin className="h-4 w-4" />
          Top Destinations
        </h3>
        <div className="space-y-2">
          {sortedDestinations.map(([destination, count], index) => (
            <div key={destination} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-muted-foreground w-4">
                  {index + 1}.
                </span>
                <span className="text-sm font-medium">{destination}</span>
              </div>
              <span className="text-sm text-muted-foreground">{count} trip{count !== 1 ? 's' : ''}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Monthly Spending Trend */}
      {sortedMonths.length > 0 && (
        <div className="mt-4 rounded-lg bg-card p-4 border">
          <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
            <FiTrendingUp className="h-4 w-4" />
            Monthly Spending
          </h3>
          <div className="space-y-2">
            {sortedMonths.map(([month, amount]) => (
              <div key={month} className="flex items-center justify-between">
                <span className="text-sm font-medium">{month}</span>
                <span className="text-sm font-medium text-emerald-600">${amount.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default TripStats;