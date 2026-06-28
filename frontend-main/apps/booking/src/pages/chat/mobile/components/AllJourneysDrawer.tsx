import React, { useEffect, useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Plane,
  ChevronLeft,
  ChevronRight,
  Trash2,
} from "lucide-react";
import { FiSearch, FiGrid, FiList } from "react-icons/fi";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import type { JourneyItem } from "../hooks/useAllJourneys";
import TripCard from "./TripCard";

const ITEMS_PER_PAGE = 10;

type ViewMode = "grid" | "list";
type FilterStatus = "all" | "active" | "planning" | "in_progress" | "completed" | "cancelled";

interface AllJourneysDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  journeys: JourneyItem[];
  isLoading: boolean;
  activeJourneyId?: string | null;
  initialFilter?: FilterStatus;
  onSelectJourney: (journey: JourneyItem) => void;
  onArchiveJourney?: (journeyId: string) => void;
  onCancelJourney?: (journeyId: string) => void;
  onDeleteJourney?: (journeyId: string) => void;
  onDeleteAll?: () => void;
}

// ─── Helpers for search matching ────────────────────────────────────────────

function getSearchableText(journey: JourneyItem): string {
  const fs = journey.context?.flight_status;
  const parts = [
    fs?.departure_airport,
    fs?.arrival_airport,
    fs?.airline,
    fs?.flight_number,
    fs?.booking_reference,
    journey.context?.airport_code,
    journey.context?.location?.city,
    journey.context?.location?.country,
    // Inspiration segment fields
    journey.context?.departure_city,
    journey.context?.planned_destination,
  ];
  for (const seg of journey.segments || []) {
    parts.push(
      seg.context?.destination_airport,
      seg.context?.arrival_airport,
      seg.context?.origin_airport,
      seg.context?.departure_airport
    );
  }
  return parts.filter(Boolean).join(" ").toLowerCase();
}

const AllJourneysDrawer: React.FC<AllJourneysDrawerProps> = ({
  isOpen,
  onClose,
  journeys,
  isLoading,
  activeJourneyId,
  initialFilter,
  onSelectJourney,
  onArchiveJourney,
  onCancelJourney,
  onDeleteJourney,
  onDeleteAll,
}) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [filterStatus, setFilterStatus] = useState<FilterStatus>("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Apply initial filter when drawer opens
  useEffect(() => {
    if (isOpen && initialFilter) {
      setFilterStatus(initialFilter);
      setCurrentPage(1);
    }
  }, [isOpen, initialFilter]);

  // ─── Stats ──────────────────────────────────────────────────────────────────

  const stats = useMemo(() => {
    const planning = journeys.filter((j) => j.status === "planning").length;
    const inProgress = journeys.filter((j) => j.status === "in_progress").length;
    const completed = journeys.filter((j) => j.status === "completed").length;
    const cancelled = journeys.filter((j) => j.status === "cancelled").length;
    const totalSpent = journeys.reduce((sum, j) => {
      const price = j.context?.flight_status?.price;
      const numericPrice = typeof price === 'number' ? price : 0;
      return sum + numericPrice;
    }, 0);
    return { planning, inProgress, completed, cancelled, total: journeys.length, totalSpent };
  }, [journeys]);

  // ─── Filtered + paginated ───────────────────────────────────────────────────

  const filteredJourneys = useMemo(() => {
    const filtered = journeys.filter((j) => {
      const matchesStatus =
        filterStatus === "all"
          ? true
          : filterStatus === "active"
            ? j.journey_id === activeJourneyId
            : j.status === filterStatus;
      const matchesSearch =
        searchQuery === "" || getSearchableText(j).includes(searchQuery.toLowerCase());
      return matchesStatus && matchesSearch;
    });
    // Active journey always first
    if (activeJourneyId) {
      filtered.sort((a, b) =>
        a.journey_id === activeJourneyId ? -1 : b.journey_id === activeJourneyId ? 1 : 0
      );
    }
    return filtered;
  }, [journeys, filterStatus, searchQuery, activeJourneyId]);

  const totalPages = Math.max(1, Math.ceil(filteredJourneys.length / ITEMS_PER_PAGE));

  const paginatedJourneys = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredJourneys.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredJourneys, currentPage]);

  const handlePrevPage = () => setCurrentPage((p) => Math.max(1, p - 1));
  const handleNextPage = () => setCurrentPage((p) => Math.min(totalPages, p + 1));

  // Reset page when filters change
  const handleFilterChange = (status: FilterStatus) => {
    setFilterStatus(status);
    setCurrentPage(1);
  };
  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    setCurrentPage(1);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50"
            onClick={onClose}
          />

          {/* Drawer */}
          <motion.div
            key="drawer"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="fixed inset-x-0 bottom-0 z-50 max-h-[90vh] rounded-t-2xl bg-background border-t border-border shadow-2xl flex flex-col"
          >
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-border">
              <div>
                <h2 className="text-base font-semibold text-foreground">All Journeys</h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {journeys.length} journey{journeys.length !== 1 ? "s" : ""} total
                </p>
              </div>
              <button
                onClick={onClose}
                className="p-2 rounded-lg hover:bg-muted/50 transition-colors"
              >
                <X className="h-5 w-5 text-muted-foreground" />
              </button>
            </div>

            {/* Scrollable content */}
            <div className="flex-1 overflow-y-auto px-5 py-4">
              {isLoading ? (
                <div className="flex flex-col items-center justify-center py-12 gap-3">
                  <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                  <p className="text-sm text-muted-foreground">Loading journeys...</p>
                </div>
              ) : journeys.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 gap-3">
                  <Plane className="h-10 w-10 text-muted-foreground/40" />
                  <p className="text-sm text-muted-foreground">No journeys yet</p>
                  <p className="text-xs text-muted-foreground/70">
                    Book a flight to start your first journey
                  </p>
                </div>
              ) : (
                <>
                  {/* Stats Summary — matches TripArchive layout */}
                  <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                    {/* Completed Stat */}
                    <div className="rounded-lg bg-card p-3 text-center border relative overflow-hidden flex flex-col items-center">
                      <div className="h-12 w-full mb-1">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={[
                                { name: "Completed", value: stats.completed },
                                { name: "Other", value: Math.max(0, stats.total - stats.completed) },
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

                    {/* In Progress Stat */}
                    <div className="rounded-lg bg-card p-3 text-center border relative overflow-hidden flex flex-col items-center">
                      <div className="h-12 w-full mb-1">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={[
                                { name: "In Progress", value: stats.inProgress },
                                { name: "Other", value: Math.max(0, stats.total - stats.inProgress) },
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
                      <div className="text-lg font-bold text-amber-600 leading-none">{stats.inProgress}</div>
                      <div className="text-[10px] text-muted-foreground mt-1 uppercase tracking-wider font-semibold">In Progress</div>
                    </div>

                    {/* Archived Stat */}
                    <div className="rounded-lg bg-card p-3 text-center border relative overflow-hidden flex flex-col items-center">
                      <div className="h-12 w-full mb-1">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={[
                                { name: "Cancelled", value: stats.cancelled },
                                { name: "Other", value: Math.max(0, stats.total - stats.cancelled) },
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
                      <div className="text-[10px] text-muted-foreground mt-1 uppercase tracking-wider font-semibold">Archived</div>
                    </div>

                    {/* Total Spent Stat */}
                    <div className="rounded-lg bg-card p-3 text-center border relative overflow-hidden flex flex-col items-center">
                      <div className="h-12 w-full mb-1">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={[{ name: "Spent", value: 100 }]}
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
                        ${stats.totalSpent.toLocaleString()}
                      </div>
                      <div className="text-[10px] text-muted-foreground mt-1 uppercase tracking-wider font-semibold">Total Spent</div>
                    </div>
                  </div>

                  {/* Controls: Search + Filters + View Toggle */}
                  <div className="mb-4 flex flex-col gap-3">
                    {/* Search */}
                    <div className="relative">
                      <FiSearch className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <input
                        type="text"
                        placeholder="Search journeys..."
                        value={searchQuery}
                        onChange={(e) => handleSearchChange(e.target.value)}
                        className="w-full rounded-lg border border-border bg-background pl-9 pr-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                      />
                    </div>

                    {/* Filters & View Mode */}
                    <div className="flex items-center justify-between">
                      {/* Status Filter */}
                      <div className="flex items-center gap-1 rounded-lg border border-border bg-background p-1 overflow-x-auto no-scrollbar">
                        {(["all", "active", "planning", "in_progress", "completed", "cancelled"] as const).map(
                          (status) => {
                            const label =
                              status === "all" ? "All"
                                : status === "active" ? "Active"
                                  : status === "in_progress" ? "In Progress"
                                    : status === "cancelled" ? "Archived"
                                      : status.charAt(0).toUpperCase() + status.slice(1);
                            return (
                              <button
                                key={status}
                                onClick={() => handleFilterChange(status)}
                                className={`rounded px-2 py-1 text-xs font-medium transition-colors whitespace-nowrap ${filterStatus === status
                                  ? "bg-primary text-primary-foreground"
                                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
                                  }`}
                              >
                                {label}
                              </button>
                            );
                          }
                        )}
                      </div>

                      {/* View Mode Toggle */}
                      <div className="flex items-center gap-1 rounded-lg border border-border bg-background p-1 ml-2 shrink-0">
                        <button
                          onClick={() => setViewMode("grid")}
                          className={`rounded p-1.5 transition-colors ${viewMode === "grid"
                            ? "bg-primary text-primary-foreground"
                            : "text-muted-foreground hover:bg-muted hover:text-foreground"
                            }`}
                        >
                          <FiGrid className="h-3 w-3" />
                        </button>
                        <button
                          onClick={() => setViewMode("list")}
                          className={`rounded p-1.5 transition-colors ${viewMode === "list"
                            ? "bg-primary text-primary-foreground"
                            : "text-muted-foreground hover:bg-muted hover:text-foreground"
                            }`}
                        >
                          <FiList className="h-3 w-3" />
                        </button>
                      </div>

                      {/* Delete All Button */}
                      {onDeleteAll && journeys.length > 0 && (
                        <button
                          onClick={onDeleteAll}
                          className="flex items-center gap-1 rounded-lg border border-destructive/20 bg-destructive/5 p-1.5 px-2 text-destructive hover:bg-destructive/10 transition-colors ml-2 shrink-0"
                          title="Delete all journeys"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          <span className="text-[10px] font-bold uppercase tracking-wider">Delete All</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Journey Cards */}
                  {filteredJourneys.length === 0 ? (
                    <div className="rounded-xl border border-border bg-card p-8 text-center">
                      <Plane className="mx-auto h-12 w-12 text-muted-foreground/40 mb-4" />
                      <h3 className="text-lg font-medium text-foreground mb-2">No journeys found</h3>
                      <p className="text-sm text-muted-foreground">
                        {searchQuery || filterStatus !== "all"
                          ? "Try adjusting your search or filters"
                          : "Book a flight to start your first journey"}
                      </p>
                    </div>
                  ) : (
                    <div
                      className={
                        viewMode === "grid"
                          ? "grid gap-3 grid-cols-2"
                          : "space-y-3"
                      }
                    >
                      {paginatedJourneys.map((journey) => (
                        <TripCard
                          key={journey.journey_id}
                          journey={journey}
                          onClick={onSelectJourney}
                          onArchive={onArchiveJourney}
                          onCancel={onCancelJourney}
                          onDelete={onDeleteJourney}
                          activeJourneyId={activeJourneyId}
                          className={viewMode === "list" ? "" : ""}
                        />
                      ))}
                    </div>
                  )}

                  {/* Results Summary */}
                  {filteredJourneys.length > 0 && (
                    <div className="mt-4 text-center text-xs text-muted-foreground">
                      Showing {paginatedJourneys.length} of {filteredJourneys.length} journey
                      {filteredJourneys.length !== 1 ? "s" : ""}
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Pagination footer */}
            {filteredJourneys.length > ITEMS_PER_PAGE && (
              <div className="flex items-center justify-between px-5 py-3 border-t border-border">
                <button
                  onClick={handlePrevPage}
                  disabled={currentPage === 1}
                  className="flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed transition-colors px-3 py-1.5 rounded-lg hover:bg-muted/50"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                  Previous
                </button>
                <span className="text-xs text-muted-foreground">
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  onClick={handleNextPage}
                  disabled={currentPage === totalPages}
                  className="flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed transition-colors px-3 py-1.5 rounded-lg hover:bg-muted/50"
                >
                  Next
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default AllJourneysDrawer;
