import React, { useState } from "react";
import { FiSearch, FiFilter, FiGrid, FiList, FiArchive, FiBarChart2 } from "react-icons/fi";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import TripCard from "./TripCard";
import type { ArchivedTrip } from "../types/phase7";
import type { JourneyItem } from "../hooks/useAllJourneys";

/** Convert an ArchivedTrip to the JourneyItem shape that TripCard now expects. */
function archivedTripToJourneyItem(trip: ArchivedTrip): JourneyItem {
  return {
    journey_id: trip.id,
    user_id: "",
    status: trip.status === "archived" ? "completed" : trip.status,
    current_segment: "return",
    segments: [],
    context: {
      flight_status: {
        arrival_airport: trip.destination,
        price: trip.totalCost,
        currency: trip.currency,
      },
    },
    timeline: {},
    recommendations: [],
    created_at: trip.startDate,
    updated_at: trip.endDate,
  };
}

interface TripArchiveProps {
  trips: ArchivedTrip[];
  onTripClick?: (trip: ArchivedTrip) => void;
  onViewStats?: () => void;
  className?: string;
}

type ViewMode = 'grid' | 'list';
type FilterStatus = 'all' | 'completed' | 'cancelled' | 'archived';

const TripArchive: React.FC<TripArchiveProps> = ({
  trips,
  onTripClick,
  onViewStats,
  className = "",
}) => {
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredTrips = trips.filter(trip => {
    const matchesStatus = filterStatus === 'all' || trip.status === filterStatus;
    const matchesSearch = searchQuery === '' ||
      trip.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      trip.destination.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const stats = {
    total: trips.length,
    completed: trips.filter(t => t.status === 'completed').length,
    cancelled: trips.filter(t => t.status === 'cancelled').length,
    archived: trips.filter(t => t.status === 'archived').length,
    totalCost: trips
      .filter(t => t.totalCost && t.status === 'completed')
      .reduce((sum, t) => sum + (t.totalCost || 0), 0)
  };

  return (
    <div className={`my-3 ${className}`}>
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-medium text-foreground">
          <FiArchive className="h-4 w-4" />
          <span>Trip Archive</span>
          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
            {stats.total} trips
          </span>
        </div>
        {onViewStats && (
          <button
            onClick={onViewStats}
            className="flex items-center gap-1.5 rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-muted"
          >
            <FiBarChart2 className="h-3 w-3" />
            <span>Stats</span>
          </button>
        )}
      </div>

      {/* Stats Summary */}
      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {/* Completed Stat */}
        <div className="rounded-lg bg-card p-3 text-center border relative overflow-hidden flex flex-col items-center">
          <div className="h-12 w-full mb-1">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={[
                    { name: 'Completed', value: stats.completed },
                    { name: 'Other', value: Math.max(0, stats.total - stats.completed) }
                  ]}
                  innerRadius={17}
                  outerRadius={22}
                  paddingAngle={2}
                  dataKey="value"
                  stroke="none"
                >
                  <Cell fill="#10b981" />
                  <Cell fill="rgba(16, 185, 129, 0.1)" />
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="text-lg font-bold text-emerald-600 leading-none">{stats.completed}</div>
          <div className="text-[10px] text-muted-foreground mt-1 uppercase tracking-wider font-semibold">Completed</div>
        </div>

        {/* Archived Stat */}
        <div className="rounded-lg bg-card p-3 text-center border relative overflow-hidden flex flex-col items-center">
          <div className="h-12 w-full mb-1">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={[
                    { name: 'Archived', value: stats.archived },
                    { name: 'Other', value: Math.max(0, stats.total - stats.archived) }
                  ]}
                  innerRadius={17}
                  outerRadius={22}
                  paddingAngle={2}
                  dataKey="value"
                  stroke="none"
                >
                  <Cell fill="#f59e0b" />
                  <Cell fill="rgba(245, 158, 11, 0.1)" />
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="text-lg font-bold text-amber-600 leading-none">{stats.archived}</div>
          <div className="text-[10px] text-muted-foreground mt-1 uppercase tracking-wider font-semibold">Archived</div>
        </div>

        {/* Cancelled Stat */}
        <div className="rounded-lg bg-card p-3 text-center border relative overflow-hidden flex flex-col items-center">
          <div className="h-12 w-full mb-1">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={[
                    { name: 'Cancelled', value: stats.cancelled },
                    { name: 'Other', value: Math.max(0, stats.total - stats.cancelled) }
                  ]}
                  innerRadius={17}
                  outerRadius={22}
                  paddingAngle={2}
                  dataKey="value"
                  stroke="none"
                >
                  <Cell fill="#ef4444" />
                  <Cell fill="rgba(239, 68, 68, 0.1)" />
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="text-lg font-bold text-destructive leading-none">{stats.cancelled}</div>
          <div className="text-[10px] text-muted-foreground mt-1 uppercase tracking-wider font-semibold">Cancelled</div>
        </div>

        {/* Total Spent Stat */}
        <div className="rounded-lg bg-card p-3 text-center border relative overflow-hidden flex flex-col items-center">
          <div className="h-12 w-full mb-1">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={[
                    { name: 'Spent', value: 100 }
                  ]}
                  innerRadius={17}
                  outerRadius={22}
                  paddingAngle={0}
                  dataKey="value"
                  stroke="none"
                >
                  <Cell fill="#3b82f6" />
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="text-lg font-bold text-primary leading-none">
            ${stats.totalCost.toLocaleString()}
          </div>
          <div className="text-[10px] text-muted-foreground mt-1 uppercase tracking-wider font-semibold">Total Spent</div>
        </div>
      </div>

      {/* Controls */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <FiSearch className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search trips..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-lg border border-border bg-background pl-9 pr-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
        </div>

        {/* Filters & View Mode */}
        <div className="flex items-center justify-between w-full">
          {/* Status Filter */}
          <div className="flex items-center gap-1 rounded-lg border border-border bg-background p-1">
            {(['all', 'completed', 'archived', 'cancelled'] as const).map((status) => (
              <button
                key={status}
                onClick={() => setFilterStatus(status)}
                className={`rounded px-2 py-1 text-xs font-medium transition-colors ${filterStatus === status
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  }`}
              >
                {status === 'all' ? 'All' : status.charAt(0).toUpperCase() + status.slice(1)}
              </button>
            ))}
          </div>

          {/* View Mode Toggle */}
          <div className="flex items-center gap-1 rounded-lg border border-border bg-background p-1">
            <button
              onClick={() => setViewMode('grid')}
              className={`rounded p-1.5 transition-colors ${viewMode === 'grid'
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                }`}
            >
              <FiGrid className="h-3 w-3" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`rounded p-1.5 transition-colors ${viewMode === 'list'
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                }`}
            >
              <FiList className="h-3 w-3" />
            </button>
          </div>
        </div>
      </div>

      {/* Trip Grid/List */}
      {filteredTrips.length === 0 ? (
        <div className="rounded-xl border border-border bg-card p-8 text-center">
          <FiArchive className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium text-foreground mb-2">No trips found</h3>
          <p className="text-sm text-muted-foreground">
            {searchQuery || filterStatus !== 'all'
              ? 'Try adjusting your search or filters'
              : 'Your completed trips will appear here'
            }
          </p>
        </div>
      ) : (
        <div className={
          viewMode === 'grid'
            ? "grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
            : "space-y-3"
        }>
          {filteredTrips.map((trip) => (
            <TripCard
              key={trip.id}
              journey={archivedTripToJourneyItem(trip)}
              onClick={onTripClick ? () => onTripClick(trip) : undefined}
              className={viewMode === 'list' ? "flex gap-4" : ""}
            />
          ))}
        </div>
      )}

      {/* Results Summary */}
      {filteredTrips.length > 0 && (
        <div className="mt-4 text-center text-xs text-muted-foreground">
          Showing {filteredTrips.length} of {trips.length} trips
        </div>
      )}
    </div>
  );
};

export default TripArchive;