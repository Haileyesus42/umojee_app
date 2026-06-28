import React, { useEffect, useMemo, useState } from "react";
import hotelsData from "./data_hotels.json";
import HotelCustomerDetails, { HotelCustomerInfo } from "./components/HotelCustomerDetails";
import HotelBookingSummary from "./components/HotelBookingSummary";
import NavigationSteps from "./components/NavigationSteps";
import { getHotelCategoryImage } from "../utils/hotelCategoryImages";

export type Hotel = {
  id: string;
  name: string;
  cityCode: string;
  address: string;
  rating: number;
  price: number;
  currency: string;
  imageUrl: string;
  imageUrls?: string[];
  description: string;
  amenities: string[];
};

const hotelsList = hotelsData as Hotel[];

function parseHotelPrice(value: unknown): number {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0;
  }
  if (typeof value === "string") {
    const match = value.match(/-?\d+(\.\d+)?/);
    if (match) {
      const parsed = Number(match[0]);
      return Number.isFinite(parsed) ? parsed : 0;
    }
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

type HotelModalProps = {
  open: boolean;
  hotels?: Hotel[];
  onClose: () => void;
};

const HotelCard: React.FC<{ hotel: Hotel; onSelect: (hotel: Hotel) => void }> = ({
  hotel,
  onSelect,
}) => {
  const fallbackImage = useMemo(
    () => getHotelCategoryImage(hotel.name || hotel.cityCode || "Hotel", hotel.id || "hotel"),
    [hotel.cityCode, hotel.id, hotel.name]
  );
  const coverImage = useMemo(() => {
    if (hotel.imageUrls && hotel.imageUrls.length > 0) return hotel.imageUrls[0];
    if (hotel.imageUrl) return hotel.imageUrl;
    return fallbackImage;
  }, [fallbackImage, hotel]);
  const safeRating = typeof hotel.rating === "number" ? hotel.rating : 0;
  const safePrice = parseHotelPrice(hotel.price);
  const priceLabel =
    typeof hotel.currency === "string" && hotel.currency
      ? `${hotel.currency} ${safePrice.toFixed(0)}`
      : safePrice > 0
        ? `${safePrice.toFixed(0)}`
        : "Price on request";

  return (
    <button
      type="button"
      onClick={() => onSelect(hotel)}
      className="group w-full overflow-hidden z-[650] rounded-2xl border border-border/80 bg-card text-left shadow-lg shadow-black/10 transition-all hover:-translate-y-[2px] hover:shadow-xl"
    >
      <div className="relative h-[120px] w-full overflow-hidden">
        <img
          src={coverImage}
          alt={hotel.name}
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          loading="lazy"
          onError={(e) => {
            e.currentTarget.src = fallbackImage;
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-tr from-black/45 via-black/15 to-transparent" />
        <div className="absolute left-3 bottom-3 rounded-full bg-black/65 px-3 py-1 text-[11px] font-semibold text-white shadow-md shadow-black/30">
          {hotel.cityCode} - {safeRating.toFixed(1)} rating
        </div>
        <div className="absolute right-3 top-3 rounded-full bg-primary/90 px-3 py-1 text-xs font-semibold text-primary-foreground shadow-lg shadow-primary/40">
          {priceLabel}
        </div>
      </div>
      <div className="flex gap-3 p-4">
        <div className="flex-1 space-y-1">
          <p className="text-sm font-semibold text-foreground">{hotel.name}</p>
          <p className="text-xs text-muted-foreground">{hotel.address}</p>
          <p className="text-[11px] text-muted-foreground line-clamp-2">
            {hotel.description}
          </p>
          <div className="flex flex-wrap gap-1 pt-1">
            {hotel.amenities.slice(0, 3).map((amenity) => (
              <span
                key={amenity}
                className="rounded-full bg-primary/10 px-2 py-[2px] text-[10px] font-medium text-primary"
              >
                {amenity}
              </span>
            ))}
          </div>
        </div>
        <div className="flex items-center text-right text-[11px] text-muted-foreground">
          <span className="rounded-full bg-primary/10 px-3 py-1 text-primary">View</span>
        </div>
      </div>
    </button>
  );
};

const HotelDetail: React.FC<{
  hotel: Hotel;
  onBack: () => void;
  onSelect: () => void;
}> = ({ hotel, onBack, onSelect }) => {
  const fallbackImage = useMemo(
    () => getHotelCategoryImage(hotel.name || hotel.cityCode || "Hotel", hotel.id || "hotel"),
    [hotel.cityCode, hotel.id, hotel.name]
  );
  const images = useMemo(() => {
    if (hotel.imageUrls && hotel.imageUrls.length > 0) return hotel.imageUrls;
    if (hotel.imageUrl) return [hotel.imageUrl];
    return [fallbackImage];
  }, [fallbackImage, hotel]);
  const safeRating = typeof hotel.rating === "number" ? hotel.rating : 0;
  const safePrice = parseHotelPrice(hotel.price);
  const priceLabel =
    typeof hotel.currency === "string" && hotel.currency
      ? `${hotel.currency} ${safePrice.toFixed(0)}`
      : safePrice > 0
        ? `${safePrice.toFixed(0)}`
        : "Price on request";

  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    setCurrentIndex(0);
  }, [hotel.id]);

  const handlePrev = () => {
    if (!images.length) return;
    setCurrentIndex((prev) => (prev - 1 + images.length) % images.length);
  };

  const handleNext = () => {
    if (!images.length) return;
    setCurrentIndex((prev) => (prev + 1) % images.length);
  };

  const hasMultipleImages = images.length > 1;

  return (
    <div className="space-y-4">
      <div className="overflow-hidden rounded-xl border border-border bg-muted/20 shadow-sm">
        <div className="relative h-48 w-full bg-card/60">
          <img
            src={images[currentIndex]}
            alt={hotel.name}
            className="h-full w-full object-cover transition-all duration-500"
            loading="lazy"
            onError={(e) => {
              e.currentTarget.src = fallbackImage;
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/20 to-transparent" />
          {hasMultipleImages && (
            <>
              <button
                type="button"
                onClick={handlePrev}
                aria-label="Previous image"
                className="absolute left-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-foreground shadow-lg shadow-black/25 ring-1 ring-black/5 transition hover:-translate-y-[52%] hover:bg-white"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  className="h-5 w-5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                >
                  <path d="M15.5 5.5 9 12l6.5 6.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
              <button
                type="button"
                onClick={handleNext}
                aria-label="Next image"
                className="absolute right-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-foreground shadow-lg shadow-black/25 ring-1 ring-black/5 transition hover:-translate-y-[52%] hover:bg-white"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  className="h-5 w-5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                >
                  <path d="M8.5 18.5 15 12 8.5 5.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
              <div className="absolute bottom-2 left-0 right-0 flex items-center justify-center gap-2">
                {images.map((_, idx) => (
                  <span
                    key={idx}
                    className={`h-1.5 w-1.5 rounded-full ${idx === currentIndex ? "bg-white" : "bg-white/40"}`}
                  />
                ))}
              </div>
            </>
          )}
          <div className="absolute bottom-3 left-4 rounded-full bg-black/70 px-3 py-1 text-xs font-semibold text-white shadow-md">
            {hotel.cityCode} - {safeRating.toFixed(1)} rating
          </div>
          <div className="absolute top-3 right-4 rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground shadow-lg shadow-primary/40">
            {priceLabel}
          </div>
        </div>
        <div className="space-y-4 p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-lg font-semibold text-foreground">{hotel.name}</p>
              <p className="text-xs text-muted-foreground">{hotel.address}</p>
            </div>
            <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
              Flexible rates
            </span>
          </div>
          <p className="text-sm leading-relaxed text-foreground">{hotel.description}</p>
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Amenities</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {hotel.amenities.map((amenity) => (
                <span
                  key={amenity}
                  className="rounded-full bg-muted/50 px-3 py-1 text-xs font-medium text-foreground"
                >
                  {amenity}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={onBack}
          className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted"
        >
          Back to list
        </button>
        <button
          type="button"
          className="rounded-lg bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/30 transition-colors hover:bg-primary/90"
          onClick={onSelect}
        >
          Choose room
        </button>
      </div>
    </div>
  );
};

const HotelModal: React.FC<HotelModalProps> = ({ open, hotels: hotelsProp, onClose }) => {
  const hotels = useMemo(() => hotelsProp ?? hotelsList, [hotelsProp]);
  const pageSize = 3;
  const [page, setPage] = useState(0);
  const [selectedHotel, setSelectedHotel] = useState<Hotel | null>(null);
  const [showCustomerForm, setShowCustomerForm] = useState(false);
  const [customerInfo, setCustomerInfo] = useState<HotelCustomerInfo[] | null>(null);
  const [showSummary, setShowSummary] = useState(false);
  const totalPages = Math.max(1, Math.ceil(hotels.length / pageSize));
  const visibleHotels = hotels.slice(page * pageSize, page * pageSize + pageSize);
  const currentStep = showSummary ? 2 : showCustomerForm ? 1 : 0;
  const stepLabels = ["Hotel", "Guests", "Summary"];

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-8"
      onClick={onClose}
    >
      <div
        className="relative flex max-h-[85vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-card p-4 shadow-2xl shadow-black/20"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="border-b border-border pb-4">
          <NavigationSteps
            currentStep={currentStep}
            labels={stepLabels}
            onStepClick={(step) => {
              if (step === 0) {
                setSelectedHotel(null);
                setShowCustomerForm(false);
                setShowSummary(false);
              } else if (step === 1 && selectedHotel) {
                setShowCustomerForm(true);
                setShowSummary(false);
              } else if (step === 2 && selectedHotel && customerInfo) {
                setShowSummary(true);
              }
            }}
          />
        </header>

        <div className="mt-4 flex-1 overflow-y-auto">
          {showSummary && selectedHotel && customerInfo ? (
            <HotelBookingSummary
              hotel={selectedHotel}
              guests={customerInfo}
              onBack={() => setShowSummary(false)}
              onEditHotel={() => {
                setShowSummary(false);
                setShowCustomerForm(false);
              }}
              onEditGuests={() => {
                setShowSummary(false);
                setShowCustomerForm(true);
              }}
              onConfirm={() => {
                console.log("Confirm booking", { hotel: selectedHotel, guests: customerInfo });
                onClose();
              }}
            />
          ) : showCustomerForm && selectedHotel ? (
            <HotelCustomerDetails
              defaultInfo={customerInfo || undefined}
              onBack={() => setShowCustomerForm(false)}
              onSubmit={(info) => {
                setCustomerInfo(info);
                setShowSummary(true);
              }}
            />
          ) : selectedHotel ? (
            <HotelDetail
              hotel={selectedHotel}
              onBack={() => setSelectedHotel(null)}
              onSelect={() => {
                setShowCustomerForm(true);
              }}
            />
          ) : (
            <div className="space-y-3">
              <div className="grid gap-3">
                {visibleHotels.map((hotel) => (
                  <HotelCard key={hotel.id} hotel={hotel} onSelect={setSelectedHotel} />
                ))}
              </div>
              <div className="flex items-center justify-between rounded-lg border border-border bg-card/70 px-3 py-2 text-xs text-muted-foreground">
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  disabled={page === 0}
                  className="rounded-md border border-border px-3 py-1 font-medium text-foreground transition-colors disabled:cursor-not-allowed disabled:opacity-50 hover:bg-muted"
                >
                  Prev
                </button>
                <span className="text-foreground">
                  Page {page + 1} of {totalPages}
                </span>
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                  disabled={page >= totalPages - 1}
                  className="rounded-md border border-border px-3 py-1 font-medium text-foreground transition-colors disabled:cursor-not-allowed disabled:opacity-50 hover:bg-muted"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default HotelModal;
