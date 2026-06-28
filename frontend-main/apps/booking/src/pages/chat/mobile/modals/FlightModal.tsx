import React, { useEffect, useMemo, useState } from "react";
import FlightCard from "./components/FlightCard";
import FlightDetail from "./components/FlightDetail";
import PassengerDetailsForm, { Passenger } from "./components/PassengerDetailsForm";
import SeatSelection from "./components/SeatSelection";
import ExtraLuggage from "./components/ExtraLuggage";
import ReviewDetails from "./components/ReviewDetails";
import NavigationSteps from "./components/NavigationSteps";
import { Flight, flightsList } from "./utils";
import { createFlightOrder, updateBookingSeats } from "../../../../services/amadeusBooking.service";
import { toast } from "react-hot-toast";
import CalmNotificationToast from "../components/CalmNotificationToast";
import { getLocalStorageValue } from "../../../../lib/utils";

type FlightModalProps = {
  open: boolean;
  flights?: Flight[];
  onClose: () => void;
  /** Pre-select a flight and skip directly to Passenger Details (step 1) */
  initialFlight?: Flight | null;
  userId?: string;
  conversationId?: string;
  journeyId?: string;
  /** Called after a successful booking with the full API result (includes journey data) */
  onBookingSuccess?: (result: any) => void;
};

const FlightModal: React.FC<FlightModalProps> = ({ open, flights: flightsProp, onClose, initialFlight, userId, conversationId, journeyId, onBookingSuccess }) => {
  const flights = useMemo(() => flightsProp ?? flightsList, [flightsProp]);
  const pageSize = 3;
  const [page, setPage] = useState(0);
  const [selectedFlight, setSelectedFlight] = useState<Flight | null>(null);
  const [showPassengers, setShowPassengers] = useState(false);
  const [showLuggage, setShowLuggage] = useState(false);
  const [showReview, setShowReview] = useState(false);
  const [showPostBookingSeats, setShowPostBookingSeats] = useState(false);
  // Pre-fill first passenger from user profile & travel documents
  const [passengerData, setPassengerData] = useState<Passenger[]>(() => {
    try {
      const user = getLocalStorageValue("user") as any;
      if (!user) return [];
      const docs = user.travelDocuments;
      const passportNumber = docs?.passportNumber || "";
      const hasData = user.firstName || user.lastName || user.email || user.phone || passportNumber;
      if (!hasData) return [];
      return [{
        firstName: user.firstName || "",
        lastName: user.lastName || "",
        email: user.email || "",
        phone: user.phone || "",
        dateOfBirth: user.dob ? new Date(user.dob).toISOString().split("T")[0] : "",
        passport: passportNumber,
        nationality: docs?.nationality || user.country || "",
      }];
    } catch {
      return [];
    }
  });
  const [selectedSeats, setSelectedSeats] = useState<
    { row: number; seat: string }[]
  >([]);
  const [luggage, setLuggage] = useState<any[]>([]);
  const [isBooking, setIsBooking] = useState(false);
  const [bookingError, setBookingError] = useState<string | null>(null);
  const [flightOrderId, setFlightOrderId] = useState<string | null>(null);
  const [bookingDbId, setBookingDbId] = useState<string | null>(null);

  // When initialFlight is provided, pre-select it and jump to Passenger Details
  useEffect(() => {
    if (open && initialFlight) {
      setSelectedFlight(initialFlight);
      setShowPassengers(true);
      setShowLuggage(false);
      setShowReview(false);
      setShowPostBookingSeats(false);
    }
  }, [open, initialFlight]);

  const currentStep = showPostBookingSeats
    ? 4
    : showReview
      ? 3
      : showLuggage
        ? 2
        : showPassengers
          ? 1
          : 0;

  const stepLabels = ["Flight", "Passengers", "Luggage", "Review", "Seats"];
  const totalPages = Math.max(1, Math.ceil(flights.length / pageSize));
  const visibleFlights = flights.slice(page * pageSize, page * pageSize + pageSize);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[650] flex items-center justify-center bg-black/40 px-4 py-8"
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
              // Don't allow navigating back once booking is done (post-booking seats)
              if (showPostBookingSeats) return;
              if (!selectedFlight && step > 0) return;
              if (step === 0) {
                setShowPassengers(false);
                setShowLuggage(false);
                setShowReview(false);
              } else if (step === 1) {
                setShowPassengers(true);
                setShowLuggage(false);
                setShowReview(false);
              } else if (step === 2 && passengerData.length > 0) {
                setShowPassengers(false);
                setShowLuggage(true);
                setShowReview(false);
              } else if (step === 3) {
                setShowPassengers(false);
                setShowLuggage(false);
                setShowReview(true);
              }
            }}
          />
        </header>

        <div className="mt-4 flex-1 overflow-y-auto">
          {/* Step 4: Post-booking seat selection */}
          {showPostBookingSeats && selectedFlight ? (
            <SeatSelection
              passengerCount={passengerData.length || 1}
              passengers={passengerData}
              initialSeats={selectedSeats}
              flightOrderId={flightOrderId || undefined}
              flight={selectedFlight}
              onBack={() => {
                // Skip seats and close
                onClose();
              }}
              onSubmit={async (seats) => {
                setSelectedSeats(seats);
                // Persist selected seats to the booking in DB
                if (bookingDbId && seats.length > 0) {
                  try {
                    const seatPayload = seats.map((s, i) => ({
                      seatNumber: `${s.row}${s.seat}`,
                      row: s.row,
                      column: s.seat,
                      price: s.price,
                      currency: s.currency,
                      passengerName: passengerData[i]
                        ? `${passengerData[i].firstName} ${passengerData[i].lastName}`
                        : undefined,
                    }));
                    await updateBookingSeats(bookingDbId, seatPayload);
                    console.log("[FlightModal] Seats saved to booking:", bookingDbId);
                    toast.custom(
                      (t) => (
                        <CalmNotificationToast
                          t={t}
                          priority="info"
                          title="Seats Confirmed"
                          message={`Your seats (${seatPayload.map((s) => s.seatNumber).join(", ")}) have been saved.`}
                          actionLabel="OK"
                          onAction={() => toast.dismiss(t.id)}
                        />
                      ),
                      { duration: 5000, position: "top-center" },
                    );
                  } catch (err) {
                    console.error("[FlightModal] Failed to save seats:", err);
                  }
                }
                onClose();
              }}
            />
          ) : showReview && selectedFlight ? (
            <ReviewDetails
              flight={selectedFlight}
              passengers={passengerData}
              seats={selectedSeats}
              luggage={luggage}
              isBooking={isBooking}
              bookingError={bookingError}
              onBack={() => setShowReview(false)}
              onSubmit={async () => {
                // Resolve userId from prop or localStorage
                let resolvedUserId = userId;
                if (!resolvedUserId) {
                  try {
                    const storedUser = localStorage.getItem("user");
                    const storedToken = localStorage.getItem("token");
                    console.log("[FlightModal] localStorage user:", storedUser);
                    console.log("[FlightModal] localStorage token:", storedToken);
                    if (storedUser) {
                      const parsed = JSON.parse(storedUser);
                      resolvedUserId = parsed?._id || parsed?.id || parsed?.data._id;
                    }
                  } catch (e) {
                    console.error("[FlightModal] Error reading localStorage:", e);
                  }
                }

                // Resolve conversationId from prop or generate one
                const resolvedConversationId =
                  conversationId || `booking_${Date.now()}`;

                console.log("[FlightModal] Booking payload:", {
                  resolvedUserId,
                  resolvedConversationId,
                  flight: selectedFlight,
                  passengers: passengerData,
                  seats: selectedSeats,
                  luggage,
                });

                if (!resolvedUserId) {
                  setBookingError("Please log in to complete your booking.");
                  return;
                }

                setIsBooking(true);
                setBookingError(null);

                try {
                  const result = await createFlightOrder({
                    flight: selectedFlight!,
                    passengers: passengerData,
                    seats: selectedSeats,
                    luggage,
                    userId: resolvedUserId,
                    conversationId: resolvedConversationId,
                    journeyId: journeyId || undefined,
                  });
                  console.log("[FlightModal] Booking success:", result);
                  onBookingSuccess?.(result);

                  const provider =
                    result?.data?.provider ||
                    result?.data?.booking?.provider ||
                    "amadeus";
                  const seatSelectionAvailable =
                    result?.data?.seatSelectionAvailable !== false &&
                    provider === "amadeus";

                  const orderId =
                    result?.data?.providerOrder?.data?.id ||
                    result?.data?.amadeusOrder?.data?.id ||
                    result?.data?.booking?.amadeusOrderId;
                  const dbId = result?.data?.booking?._id;
                  console.log("[FlightModal] Order ID for seatmap:", orderId, "DB ID:", dbId);

                  toast.custom(
                    (t) => (
                      <CalmNotificationToast
                        t={t}
                        priority="info"
                        title="Booking Confirmed"
                        message={
                          seatSelectionAvailable
                            ? `Your flight has been booked! Now select your seats.`
                            : `Your flight has been reserved successfully.`
                        }
                        actionLabel="OK"
                        onAction={() => toast.dismiss(t.id)}
                      />
                    ),
                    { duration: 5000, position: "top-center" },
                  );

                  if (orderId) setFlightOrderId(orderId);
                  if (dbId) setBookingDbId(dbId);
                  setShowReview(false);
                  if (seatSelectionAvailable) {
                    setShowPostBookingSeats(true);
                  } else {
                    onClose();
                  }
                } catch (err: any) {
                  const msg =
                    err?.response?.data?.message ||
                    err?.message ||
                    "Booking failed. Please try again.";
                  setBookingError(msg);
                  toast.custom(
                    (t) => (
                      <CalmNotificationToast
                        t={t}
                        priority="action_required"
                        title="Booking Failed"
                        message={msg}
                        actionLabel="Try Again"
                        onAction={() => {
                          setBookingError(null);
                        }}
                      />
                    ),
                    { duration: Infinity, position: "top-center" },
                  );
                } finally {
                  setIsBooking(false);
                }
              }}
              onEditFlight={() => {
                setSelectedFlight(null);
                setShowPassengers(false);
                setShowLuggage(false);
                setShowReview(false);
              }}
              onEditPassengers={() => {
                setShowPassengers(true);
                setShowLuggage(false);
                setShowReview(false);
              }}
              onEditSeats={() => {
                // No pre-booking seat editing — seats are selected post-booking
              }}
              onEditLuggage={() => {
                setShowPassengers(false);
                setShowLuggage(true);
                setShowReview(false);
              }}
            />
          ) : showLuggage && selectedFlight ? (
            <ExtraLuggage
              passengers={passengerData}
              initialLuggage={luggage}
              onBack={() => setShowLuggage(false)}
              onSubmit={(bags) => {
                setLuggage(bags);
                setShowReview(true);
              }}
            />
          ) : showPassengers && selectedFlight ? (
            <PassengerDetailsForm
              flight={selectedFlight}
              onBack={() => setShowPassengers(false)}
              initialPassengers={passengerData}
              onSubmit={(passengers) => {
                setPassengerData(passengers);
                // Go straight to luggage (seats are post-booking now)
                setShowPassengers(false);
                setShowLuggage(true);
              }}
            />
          ) : selectedFlight ? (
            <FlightDetail
              flight={selectedFlight}
              onBack={() => {
                setSelectedFlight(null);
                setShowPassengers(false);
              }}
              onSelect={() => setShowPassengers(true)}
            />
          ) : (
            <div className="space-y-3">
              <div className="grid gap-3">
                {visibleFlights.map((flight) => (
                  <FlightCard
                    key={flight.id}
                    flight={flight}
                    onSelect={(flt) => {
                      setSelectedFlight(flt);
                      setShowPassengers(false);
                    }}
                  />
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

export default FlightModal;
