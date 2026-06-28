import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Passenger } from "./PassengerDetailsForm";
import { fetchSeatMap, fetchSeatMapByOrderId } from "../../../../../services/amadeusBooking.service";

type SelectedSeat = { row: number; seat: string; price?: string; currency?: string };

type SeatSelectionProps = {
  passengerCount: number;
  passengers?: Passenger[];
  onBack: () => void;
  onSubmit: (selections: SelectedSeat[]) => void;
  initialSeats?: SelectedSeat[];
  /** Flight order ID — when provided, seatmap is fetched via GET using the order ID */
  flightOrderId?: string;
  flight?: {
    from: string;
    to: string;
    departure: string;
    flightNo: string;
    airline: string;
  };
};

/* ------------------------------------------------------------------ */
/*  Amadeus seat characteristic code descriptions                      */
/* ------------------------------------------------------------------ */
const CHAR_LABELS: Record<string, string> = {
  W: "Window",
  A: "Aisle",
  "9": "Center",
  B: "Overwing",
  CH: "Chargeable",
  K: "Bulkhead",
  LS: "Left side",
  RS: "Right side",
  E: "Exit row",
  L: "Leg room",
  H: "Accessible",
  I: "Near lavatory",
  FC: "Front cabin",
  "1": "Restricted view",
  "1A": "Restricted recline",
  "1D": "Restricted recline",
  IE: "Electronic connection",
};

/* ------------------------------------------------------------------ */
/*  Amadeus facility code labels                                       */
/* ------------------------------------------------------------------ */
const FACILITY_LABELS: Record<string, string> = {
  BK: "Bulkhead",
  LA: "Lavatory",
  G: "Galley",
  ST: "Storage",
  CL: "Closet",
  LG: "Luggage",
  SO: "Stairs/door",
  EX: "Emergency exit",
};

/* ------------------------------------------------------------------ */
/*  Types for parsed seatmap                                           */
/* ------------------------------------------------------------------ */
interface ParsedSeat {
  number: string; // e.g. "6A"
  row: number;
  col: string; // e.g. "A"
  cabin: string;
  available: boolean;
  price: string;
  currency: string;
  characteristics: string[];
  isWindow: boolean;
  isAisle: boolean;
  isExitRow: boolean;
  isPremium: boolean;
  x: number;
  y: number;
}

interface ParsedDeck {
  deckType: string;
  columns: string[];
  aisleAfter: Set<string>; // column letters after which there's an aisle
  rows: number[];
  startRow: number;
  endRow: number;
  exitRows: number[];
  wingStartRow: number;
  wingEndRow: number;
  seats: Map<string, ParsedSeat>; // key: "row-col" e.g. "6-A"
  facilities: Array<{ code: string; label: string; row?: string; column?: string; position: string }>;
}

interface ParsedSegment {
  id: string;
  departure: string;
  arrival: string;
  carrierCode: string;
  flightNumber: string;
  aircraft: string;
  cabin: string;
  decks: ParsedDeck[];
}

/* ------------------------------------------------------------------ */
/*  Parse Amadeus seatmap response                                     */
/* ------------------------------------------------------------------ */
function parseSeatmapData(seatmaps: any[]): ParsedSegment[] {
  return seatmaps.map((sm: any) => {
    const decks: ParsedDeck[] = (sm.decks || []).map((deck: any) => {
      const config = deck.deckConfiguration || {};
      const width = config.width || 7;
      const startRow = config.startSeatRow || 1;
      const endRow = config.endSeatRow || 30;
      const exitRowsX = config.exitRowsX || [];
      const wingStartRow = config.startWingsRow || 0;
      const wingEndRow = config.endWingsRow || 0;

      // Build column map from seats — collect all unique column letters
      const colSet = new Set<string>();
      const seatMap = new Map<string, ParsedSeat>();
      const yToCol = new Map<number, string>();

      for (const seat of deck.seats || []) {
        const seatNum: string = seat.number || "";
        const match = seatNum.match(/^(\d+)([A-Z]+)$/i);
        if (!match) continue;
        const row = parseInt(match[1], 10);
        const col = match[2].toUpperCase();
        colSet.add(col);
        if (seat.coordinates?.y !== undefined) {
          yToCol.set(seat.coordinates.y, col);
        }

        const chars: string[] = seat.characteristicsCodes || [];
        const pricing = seat.travelerPricing?.[0];
        const available = pricing?.seatAvailabilityStatus === "AVAILABLE";
        const price = pricing?.price?.total || "0";
        const currency = pricing?.price?.currency || "USD";

        const parsed: ParsedSeat = {
          number: seatNum,
          row,
          col,
          cabin: seat.cabin || "ECONOMY",
          available,
          price,
          currency,
          characteristics: chars,
          isWindow: chars.includes("W"),
          isAisle: chars.includes("A"),
          isExitRow: chars.includes("E"),
          isPremium: chars.some((c: string) => c.includes("PREMIUM")),
          x: seat.coordinates?.x ?? 0,
          y: seat.coordinates?.y ?? 0,
        };

        seatMap.set(`${row}-${col}`, parsed);
      }

      // Build a reverse lookup: column letter → y coordinate
      const colToY: Record<string, number> = {};
      Array.from(yToCol.entries()).forEach(([y, col]) => {
        colToY[col] = y;
      });

      // Sort columns by their y-coordinate
      const sortedCols = Array.from(colSet).sort((a, b) => {
        return (colToY[a] ?? 0) - (colToY[b] ?? 0);
      });

      // Detect aisles: gaps in y-coordinates between adjacent columns
      const aisleAfter = new Set<string>();
      for (let i = 0; i < sortedCols.length - 1; i++) {
        const yA = colToY[sortedCols[i]] ?? i;
        const yB = colToY[sortedCols[i + 1]] ?? i + 1;
        if (yB - yA > 1) {
          aisleAfter.add(sortedCols[i]);
        }
      }

      // Build row list
      const rows: number[] = [];
      for (let r = startRow; r <= endRow; r++) rows.push(r);

      // Determine exit rows from exitRowsX — these are x-coordinate based
      // Map x back to actual row numbers
      const exitRows: number[] = [];
      if (exitRowsX.length > 0) {
        for (const xVal of exitRowsX) {
          const mappedRow = startRow + xVal - 1;
          if (mappedRow >= startRow && mappedRow <= endRow) {
            exitRows.push(mappedRow);
          }
        }
      }
      // Also check seats that have the "E" characteristic
      Array.from(seatMap.values()).forEach((s) => {
        if (s.isExitRow && !exitRows.includes(s.row)) {
          exitRows.push(s.row);
        }
      });

      // Parse facilities
      const facilities = (deck.facilities || []).map((f: any) => ({
        code: f.code,
        label: FACILITY_LABELS[f.code] || f.code,
        row: f.row,
        column: f.column,
        position: f.position || "",
      }));

      return {
        deckType: deck.deckType || "MAIN",
        columns: sortedCols,
        aisleAfter,
        rows,
        startRow,
        endRow,
        exitRows,
        wingStartRow,
        wingEndRow,
        seats: seatMap,
        facilities,
      };
    });

    return {
      id: sm.id,
      departure: sm.departure?.iataCode || "",
      arrival: sm.arrival?.iataCode || "",
      carrierCode: sm.carrierCode || "",
      flightNumber: sm.number || "",
      aircraft: sm.aircraft?.code || "",
      cabin: sm.class || "",
      decks,
    };
  });
}

/* ------------------------------------------------------------------ */
/*  Price tier helpers                                                  */
/* ------------------------------------------------------------------ */
function getPriceTier(price: string): "free" | "low" | "mid" | "high" {
  const p = parseFloat(price);
  if (p === 0) return "free";
  if (p <= 25) return "low";
  if (p <= 50) return "mid";
  return "high";
}

const TIER_COLORS = {
  free: "bg-emerald-500/20 border-emerald-500/50 text-emerald-400",
  low: "bg-sky-500/20 border-sky-500/50 text-sky-400",
  mid: "bg-amber-500/20 border-amber-500/50 text-amber-400",
  high: "bg-violet-500/20 border-violet-500/50 text-violet-400",
};

/* ------------------------------------------------------------------ */
/*  SeatSelection Component                                            */
/* ------------------------------------------------------------------ */
const SeatSelection: React.FC<SeatSelectionProps> = ({
  passengerCount,
  passengers = [],
  onBack,
  onSubmit,
  initialSeats,
  flightOrderId,
  flight,
}) => {
  const [selected, setSelected] = useState<SelectedSeat[]>(initialSeats || []);
  const [segments, setSegments] = useState<ParsedSegment[]>([]);
  const [activeSegment, setActiveSegment] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hoveredSeat, setHoveredSeat] = useState<string | null>(null);

  const isFull = selected.length >= passengerCount;

  // Fetch seatmap on mount — prefer order ID (GET), fall back to flight offer (POST)
  useEffect(() => {
    if (!flightOrderId && !flight) return;
    let cancelled = false;
    setLoading(true);
    setError(null);

    const request = flightOrderId
      ? fetchSeatMapByOrderId(flightOrderId)
      : fetchSeatMap({
          flight: {
            from: flight!.from,
            to: flight!.to,
            departure: flight!.departure,
            flightNo: flight!.flightNo,
            airline: flight!.airline,
          },
          passengers: passengerCount,
        });

    request
      .then((res) => {
        if (cancelled) return;
        const parsed = parseSeatmapData(res.data || []);
        setSegments(parsed);
        if (parsed.length > 0) setActiveSegment(0);
      })
      .catch((err) => {
        if (cancelled) return;
        console.error("[SeatSelection] Failed to fetch seatmap:", err);
        setError(err?.response?.data?.message || err?.message || "Failed to load seat map.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [flightOrderId, flight, passengerCount]);

  const currentSegment = segments[activeSegment];
  const currentDeck = currentSegment?.decks?.[0]; // Main deck

  const toggleSeat = useCallback(
    (row: number, col: string, price?: string, currency?: string) => {
      const seatLabel = `${row}${col}`;
      const exists = selected.some((s) => s.row === row && s.seat === col);
      if (exists) {
        setSelected((prev) => prev.filter((s) => !(s.row === row && s.seat === col)));
        return;
      }
      if (isFull) return;
      setSelected((prev) => [...prev, { row, seat: col, price, currency }]);
    },
    [selected, isFull],
  );

  const labelForSeat = (row: number, col: string) => {
    const index = selected.findIndex((s) => s.row === row && s.seat === col);
    if (index === -1) return null;
    const passenger = passengers[index];
    return passenger
      ? `${passenger.firstName || "P"}${passenger.lastName ? " " + passenger.lastName.charAt(0) : ""}`
      : `P${index + 1}`;
  };

  const totalSeatCost = useMemo(() => {
    return selected.reduce((sum, s) => sum + parseFloat(s.price || "0"), 0);
  }, [selected]);

  const currency = selected[0]?.currency || "USD";

  // ---- Loading state ----
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 space-y-4">
        <div className="relative">
          <div className="h-12 w-12 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
          <svg className="absolute inset-0 m-auto h-5 w-5 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 2L12 6M12 18L12 22M2 12L6 12M18 12L22 12" strokeLinecap="round" />
          </svg>
        </div>
        <p className="text-sm text-muted-foreground animate-pulse">Loading seat map...</p>
        <p className="text-xs text-muted-foreground/70">
          {flight?.airline} {flight?.flightNo} &middot; {flight?.from} → {flight?.to}
        </p>
      </div>
    );
  }

  // ---- Error state ----
  if (error) {
    return (
      <div className="space-y-4">
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-6 text-center space-y-3">
          <div className="mx-auto h-10 w-10 rounded-full bg-destructive/10 flex items-center justify-center">
            <svg className="h-5 w-5 text-destructive" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" /><path d="M12 8v4M12 16h.01" strokeLinecap="round" />
            </svg>
          </div>
          <p className="text-sm font-medium text-foreground">Unable to load seat map</p>
          <p className="text-xs text-muted-foreground">{error}</p>
        </div>
        <div className="flex items-center justify-between">
          <button type="button" onClick={onBack}
            className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-muted">
            Back
          </button>
          <button type="button" onClick={() => onSubmit([])}
            className="rounded-lg bg-muted px-4 py-2 text-sm font-medium text-foreground hover:bg-muted/80">
            Skip seat selection
          </button>
        </div>
      </div>
    );
  }

  // ---- No seatmap available — fall through impossible but handle it ----
  if (!currentDeck) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground text-center py-8">No seat map data available for this flight.</p>
        <div className="flex items-center justify-between">
          <button type="button" onClick={onBack}
            className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-muted">
            Back
          </button>
          <button type="button" onClick={() => onSubmit([])}
            className="rounded-lg bg-muted px-4 py-2 text-sm font-medium text-foreground hover:bg-muted/80">
            Skip
          </button>
        </div>
      </div>
    );
  }

  const { columns, aisleAfter, rows, exitRows, wingStartRow, wingEndRow, seats } = currentDeck;

  // Build column groups separated by aisles
  const colGroups: string[][] = [];
  let currentGroup: string[] = [];
  for (const col of columns) {
    currentGroup.push(col);
    if (aisleAfter.has(col)) {
      colGroups.push(currentGroup);
      currentGroup = [];
    }
  }
  if (currentGroup.length > 0) colGroups.push(currentGroup);

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-foreground">Select your seats</p>
          <p className="text-xs text-muted-foreground">
            {currentSegment?.carrierCode} {currentSegment?.flightNumber} &middot;{" "}
            {currentSegment?.departure} → {currentSegment?.arrival} &middot; {currentSegment?.aircraft}
          </p>
        </div>
        <div className="text-right">
          <div className="text-xs font-semibold text-foreground">
            {selected.length}/{passengerCount}
          </div>
          {totalSeatCost > 0 && (
            <div className="text-[10px] text-muted-foreground">
              +{currency} {totalSeatCost.toFixed(2)}
            </div>
          )}
        </div>
      </div>

      {/* Segment tabs (for multi-segment flights) */}
      {segments.length > 1 && (
        <div className="flex gap-1 rounded-lg bg-muted/50 p-1">
          {segments.map((seg, idx) => (
            <button
              key={seg.id}
              type="button"
              onClick={() => setActiveSegment(idx)}
              className={`flex-1 rounded-md px-2 py-1.5 text-[11px] font-medium transition-colors ${
                idx === activeSegment
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {seg.departure} → {seg.arrival}
            </button>
          ))}
        </div>
      )}

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-3 text-[10px] text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="h-3.5 w-3.5 rounded border border-primary/50 bg-primary/20" /> Selected
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-3.5 w-3.5 rounded border border-emerald-500/50 bg-emerald-500/20" /> Free
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-3.5 w-3.5 rounded border border-sky-500/50 bg-sky-500/20" /> $1-25
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-3.5 w-3.5 rounded border border-amber-500/50 bg-amber-500/20" /> $26-50
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-3.5 w-3.5 rounded border border-violet-500/50 bg-violet-500/20" /> $51+
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-3.5 w-3.5 rounded border border-border bg-muted/50 opacity-40" /> Unavailable
        </span>
      </div>

      {/* Aircraft body */}
      <div className="relative rounded-2xl border border-border bg-gradient-to-b from-muted/30 to-muted/10 shadow-lg shadow-black/5 overflow-hidden">
        {/* Nose / Cockpit */}
        <div className="relative mx-auto flex items-center justify-center py-3">
          <div className="absolute inset-x-0 top-0 h-full bg-gradient-to-b from-card/80 to-transparent" />
          <div className="relative flex items-center gap-2 rounded-full border border-border/60 bg-card/80 px-4 py-1.5">
            <svg className="h-3.5 w-3.5 text-muted-foreground" viewBox="0 0 24 24" fill="currentColor">
              <path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z" />
            </svg>
            <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              Cockpit
            </span>
          </div>
        </div>

        {/* Seat grid */}
        <div className="no-scrollbar max-h-[400px] overflow-y-auto px-3 pb-3">
          {/* Column headers */}
          <div className="sticky top-0 z-10 bg-gradient-to-b from-muted/30 to-transparent pb-2 pt-1">
            <div className="flex items-center justify-center gap-0.5">
              <div className="w-8" /> {/* row number spacer */}
              {colGroups.map((group, gi) => (
                <React.Fragment key={gi}>
                  {gi > 0 && <div className="w-6" />} {/* aisle spacer */}
                  {group.map((col) => (
                    <div key={col} className="flex h-6 w-9 items-center justify-center text-[11px] font-bold text-muted-foreground">
                      {col}
                    </div>
                  ))}
                </React.Fragment>
              ))}
              <div className="w-8" /> {/* wing indicator spacer */}
            </div>
          </div>

          {/* Rows */}
          <div className="space-y-0.5">
            {rows.map((rowNum) => {
              const isExitRow = exitRows.includes(rowNum);
              const isWingRow = rowNum >= wingStartRow && rowNum <= wingEndRow;

              return (
                <React.Fragment key={rowNum}>
                  {/* Exit row indicator */}
                  {isExitRow && (
                    <div className="flex items-center gap-2 py-1">
                      <div className="h-px flex-1 bg-red-500/30" />
                      <span className="text-[9px] font-bold uppercase tracking-wider text-red-400">
                        Exit
                      </span>
                      <div className="h-px flex-1 bg-red-500/30" />
                    </div>
                  )}

                  <div className="flex items-center justify-center gap-0.5">
                    {/* Row number */}
                    <div className="flex h-8 w-8 items-center justify-center text-[10px] font-semibold text-muted-foreground">
                      {rowNum}
                    </div>

                    {/* Seat groups */}
                    {colGroups.map((group, gi) => (
                      <React.Fragment key={gi}>
                        {gi > 0 && (
                          <div className="flex h-8 w-6 items-center justify-center">
                            <div className="h-full w-px bg-border/30" />
                          </div>
                        )}
                        {group.map((col) => {
                          const seat = seats.get(`${rowNum}-${col}`);
                          if (!seat) {
                            // No seat at this position (e.g. missing seat in layout)
                            return <div key={col} className="h-8 w-9" />;
                          }

                          const isSelected = selected.some(
                            (s) => s.row === rowNum && s.seat === col,
                          );
                          const label = labelForSeat(rowNum, col);
                          const tier = getPriceTier(seat.price);
                          const seatKey = `${rowNum}-${col}`;
                          const isHovered = hoveredSeat === seatKey;

                          return (
                            <div key={col} className="relative">
                              <button
                                type="button"
                                disabled={!seat.available && !isSelected}
                                onClick={() =>
                                  seat.available && toggleSeat(rowNum, col, seat.price, seat.currency)
                                }
                                onMouseEnter={() => setHoveredSeat(seatKey)}
                                onMouseLeave={() => setHoveredSeat(null)}
                                className={`relative flex h-8 w-9 items-center justify-center rounded-md border text-[10px] font-bold transition-all duration-150 ${
                                  isSelected
                                    ? "border-primary bg-primary/20 text-primary ring-1 ring-primary/40 shadow-md shadow-primary/20 scale-105"
                                    : seat.available
                                    ? `${TIER_COLORS[tier]} hover:scale-105 hover:shadow-sm cursor-pointer`
                                    : "border-border/40 bg-muted/30 text-muted-foreground/30 cursor-not-allowed"
                                }`}
                                title={
                                  seat.available
                                    ? `${seat.number} — ${seat.currency} ${seat.price}${
                                        seat.characteristics.length > 0
                                          ? "\n" + seat.characteristics
                                              .filter((c) => CHAR_LABELS[c])
                                              .map((c) => CHAR_LABELS[c])
                                              .join(", ")
                                          : ""
                                      }`
                                    : `${seat.number} — Unavailable`
                                }
                              >
                                {/* Window indicator */}
                                {seat.isWindow && (
                                  <span className="absolute -left-0.5 top-1/2 -translate-y-1/2 h-3 w-0.5 rounded-full bg-current opacity-30" />
                                )}

                                {isSelected ? (
                                  <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" />
                                  </svg>
                                ) : seat.available ? (
                                  <span className="leading-none">{seat.number}</span>
                                ) : (
                                  <svg className="h-3 w-3" viewBox="0 0 24 24" fill="currentColor" opacity={0.3}>
                                    <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12 19 6.41z" />
                                  </svg>
                                )}
                              </button>

                              {/* Passenger label */}
                              {label && (
                                <span className="absolute -bottom-3.5 left-1/2 -translate-x-1/2 whitespace-nowrap text-[8px] font-semibold text-primary">
                                  {label}
                                </span>
                              )}

                              {/* Hover tooltip */}
                              {isHovered && seat.available && !isSelected && (
                                <div className="absolute -top-12 left-1/2 -translate-x-1/2 z-20 whitespace-nowrap rounded-lg border border-border bg-card px-2.5 py-1.5 shadow-lg">
                                  <p className="text-[10px] font-bold text-foreground">{seat.number}</p>
                                  <p className="text-[9px] text-muted-foreground">
                                    {seat.currency} {seat.price}
                                    {seat.isWindow ? " · Window" : seat.isAisle ? " · Aisle" : " · Middle"}
                                  </p>
                                  <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 h-2 w-2 rotate-45 border-b border-r border-border bg-card" />
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </React.Fragment>
                    ))}

                    {/* Wing indicator */}
                    <div className="flex h-8 w-8 items-center justify-center">
                      {isWingRow && (
                        <div className="h-full w-1 rounded-full bg-muted-foreground/15" title="Wing" />
                      )}
                    </div>
                  </div>
                </React.Fragment>
              );
            })}
          </div>
        </div>

        {/* Tail */}
        <div className="relative mx-auto flex items-center justify-center py-3">
          <div className="absolute inset-x-0 bottom-0 h-full bg-gradient-to-t from-card/80 to-transparent" />
          <div className="relative flex items-center gap-2 rounded-full border border-border/60 bg-card/80 px-4 py-1.5">
            <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              Tail
            </span>
          </div>
        </div>
      </div>

      {/* Seat limit message */}
      {isFull && (
        <p className="text-center text-[11px] text-primary">
          All seats selected. Tap a seat to change.
        </p>
      )}

      {/* Selected seats summary */}
      {selected.length > 0 && (
        <div className="rounded-lg border border-border bg-card/50 p-2.5">
          <p className="text-[10px] font-semibold text-muted-foreground mb-1.5 uppercase tracking-wider">
            Selected seats
          </p>
          <div className="flex flex-wrap gap-1.5">
            {selected.map((s, i) => (
              <span
                key={`${s.row}${s.seat}`}
                className="inline-flex items-center gap-1 rounded-md border border-primary/30 bg-primary/10 px-2 py-1 text-[10px] font-semibold text-primary"
              >
                {s.row}{s.seat}
                {passengers[i] ? ` — ${passengers[i].firstName}` : ""}
                {parseFloat(s.price || "0") > 0 && (
                  <span className="text-muted-foreground">
                    ${s.price}
                  </span>
                )}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={onBack}
          className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted"
        >
          Back to passengers
        </button>
        <button
          type="button"
          onClick={() => onSubmit(selected)}
          disabled={selected.length !== passengerCount}
          className="rounded-lg bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/30 transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          Confirm seats
          {totalSeatCost > 0 && (
            <span className="ml-1 text-xs opacity-80">
              (+${totalSeatCost.toFixed(0)})
            </span>
          )}
        </button>
      </div>
    </div>
  );
};

export default SeatSelection;
