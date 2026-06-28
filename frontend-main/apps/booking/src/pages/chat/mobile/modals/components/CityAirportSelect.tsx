import React, { useState, useRef, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Plane, MapPin } from "lucide-react";
import {
  searchCities,
  formatCityAirport,
  isValidAirportSelection,
  type AirportEntry,
  type CityGroup,
} from "../../utils/airportCityUtils";

interface CityAirportSelectProps {
  value: string;
  onSelect: (display: string, code: string) => void;
  onClear: () => void;
  placeholder?: string;
  disabled?: boolean;
  autoFocus?: boolean;
}

const CityAirportSelect: React.FC<CityAirportSelectProps> = ({
  value,
  onSelect,
  onClear,
  placeholder = "Search cities...",
  disabled = false,
  autoFocus = false,
}) => {
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const isConfirmed = isValidAirportSelection(value);

  // Compute search results
  const results = useMemo(() => searchCities(query), [query]);

  // Flatten results for keyboard navigation
  const flatItems = useMemo(() => {
    const items: { airport: AirportEntry; group: CityGroup }[] = [];
    for (const group of results) {
      for (const airport of group.airports) {
        items.push({ airport, group });
      }
    }
    return items;
  }, [results]);

  // Click-outside handler
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Reset highlight when results change
  useEffect(() => {
    setHighlightIndex(-1);
  }, [results]);

  // Scroll highlighted item into view
  useEffect(() => {
    if (highlightIndex >= 0 && listRef.current) {
      const items = listRef.current.querySelectorAll("[data-airport-item]");
      items[highlightIndex]?.scrollIntoView({ block: "nearest" });
    }
  }, [highlightIndex]);

  function handleSelect(airport: AirportEntry, group: CityGroup) {
    const display =
      group.airports.length > 1
        ? `${airport.cityName} (${airport.code})`
        : `${group.city} (${airport.code})`;

    onSelect(display, airport.code);
    setQuery("");
    setIsOpen(false);
    setHighlightIndex(-1);
  }

  function handleClear() {
    onClear();
    setQuery("");
    setIsOpen(false);
    setHighlightIndex(-1);
    inputRef.current?.focus();
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value;
    setQuery(val);
    if (!isOpen) setIsOpen(true);

    // If user edits a confirmed value, clear the selection
    if (isConfirmed) {
      onClear();
    }
  }

  function handleFocus() {
    if (!disabled && !isConfirmed) {
      setIsOpen(true);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (!isOpen) {
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        setIsOpen(true);
        e.preventDefault();
      }
      return;
    }

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setHighlightIndex((prev) =>
          prev < flatItems.length - 1 ? prev + 1 : 0
        );
        break;
      case "ArrowUp":
        e.preventDefault();
        setHighlightIndex((prev) =>
          prev > 0 ? prev - 1 : flatItems.length - 1
        );
        break;
      case "Enter":
        e.preventDefault();
        if (highlightIndex >= 0 && highlightIndex < flatItems.length) {
          const { airport, group } = flatItems[highlightIndex];
          handleSelect(airport, group);
        }
        break;
      case "Escape":
        e.preventDefault();
        setIsOpen(false);
        setHighlightIndex(-1);
        break;
    }
  }

  return (
    <div ref={containerRef} className="relative">
      {/* Input with clear button */}
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={isConfirmed ? value : query}
          onChange={handleInputChange}
          onFocus={handleFocus}
          onKeyDown={handleKeyDown}
          readOnly={disabled}
          autoFocus={autoFocus}
          className={`w-full rounded-xl border border-border bg-background px-4 py-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-colors ${
            disabled ? "bg-muted/30 text-muted-foreground" : ""
          } ${isConfirmed ? "pr-10" : ""}`}
          placeholder={placeholder}
        />
        {isConfirmed && !disabled && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 rounded-full hover:bg-muted/50 transition-colors"
          >
            <X className="h-3.5 w-3.5 text-muted-foreground" />
          </button>
        )}
      </div>

      {/* Inline dropdown */}
      <AnimatePresence>
        {isOpen && !isConfirmed && !disabled && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.15 }}
            className="mt-1 rounded-xl border border-border bg-background shadow-lg overflow-hidden"
          >
            <div
              ref={listRef}
              className="max-h-48 overflow-y-auto py-1"
              role="listbox"
            >
              {results.length === 0 ? (
                <div className="px-4 py-3 text-sm text-muted-foreground text-center">
                  No cities found
                </div>
              ) : (
                results.map((group) => (
                  <div key={group.city}>
                    {/* Show group heading for multi-airport cities */}
                    {group.airports.length > 1 && (
                      <div className="px-3 pt-2 pb-1">
                        <span className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">
                          {group.city}
                        </span>
                      </div>
                    )}
                    {group.airports.map((airport) => {
                      const flatIdx = flatItems.findIndex(
                        (fi) => fi.airport.code === airport.code
                      );
                      const isHighlighted = flatIdx === highlightIndex;

                      return (
                        <button
                          key={airport.code}
                          type="button"
                          data-airport-item
                          role="option"
                          aria-selected={isHighlighted}
                          onClick={() => handleSelect(airport, group)}
                          onMouseEnter={() => setHighlightIndex(flatIdx)}
                          className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm text-left transition-colors cursor-pointer ${
                            isHighlighted
                              ? "bg-primary/10 text-primary"
                              : "hover:bg-muted/50 text-foreground"
                          }`}
                        >
                          {group.airports.length > 1 ? (
                            <Plane className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                          ) : (
                            <MapPin className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                          )}
                          <span className="flex-1 truncate">
                            {group.airports.length > 1
                              ? airport.cityName
                              : group.city}
                          </span>
                          <span className="text-xs font-mono text-muted-foreground shrink-0">
                            {airport.code}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default CityAirportSelect;
