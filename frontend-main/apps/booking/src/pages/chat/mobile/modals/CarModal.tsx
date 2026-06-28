import React, { useMemo, useState } from "react";
import carsData from "./data_cars.json";
import CarCard, { Car } from "./components/CarCard";
import CarDetail from "./components/CarDetail";
import CarDriverDetails, { CarDriverInfo } from "./components/CarDriverDetails";
import CarBookingSummary from "./components/CarBookingSummary";
import NavigationSteps from "./components/NavigationSteps";

type CarModalProps = {
  open: boolean;
  cars?: Car[];
  onClose: () => void;
};

const carsList = carsData as Car[];

const CarModal: React.FC<CarModalProps> = ({ open, cars: carsProp, onClose }) => {
  const cars = useMemo(() => carsProp ?? carsList, [carsProp]);
  const pageSize = 3;
  const [page, setPage] = useState(0);
  const [selectedCar, setSelectedCar] = useState<Car | null>(null);
  const [showDriverForm, setShowDriverForm] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const [driverInfo, setDriverInfo] = useState<CarDriverInfo | null>(null);

  const totalPages = Math.max(1, Math.ceil(cars.length / pageSize));
  const visibleCars = cars.slice(page * pageSize, page * pageSize + pageSize);
  const currentStep = showSummary ? 2 : showDriverForm ? 1 : 0;
  const stepLabels = ["Car", "Driver", "Summary"];

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
              if (!selectedCar && step > 0) return;
              if (step === 0) {
                setShowDriverForm(false);
                setShowSummary(false);
              } else if (step === 1) {
                setShowDriverForm(true);
                setShowSummary(false);
              } else if (step === 2 && driverInfo) {
                setShowDriverForm(false);
                setShowSummary(true);
              }
            }}
          />
        </header>

        <div className="mt-4 flex-1 overflow-y-auto">
          {showSummary && selectedCar && driverInfo ? (
            <CarBookingSummary
              car={selectedCar}
              driver={driverInfo}
              onBack={() => setShowSummary(false)}
              onEditCar={() => {
                setShowSummary(false);
                setShowDriverForm(false);
              }}
              onEditDriver={() => {
                setShowSummary(false);
                setShowDriverForm(true);
              }}
              onConfirm={() => {
                console.log("Confirm car booking", { car: selectedCar, driver: driverInfo });
                onClose();
              }}
            />
          ) : showDriverForm && selectedCar ? (
            <CarDriverDetails
              initialDriver={driverInfo || undefined}
              onBack={() => setShowDriverForm(false)}
              onSubmit={(driver) => {
                setDriverInfo(driver);
                setShowSummary(true);
              }}
            />
          ) : selectedCar ? (
            <CarDetail
              car={selectedCar}
              onBack={() => setSelectedCar(null)}
              onSelect={() => setShowDriverForm(true)}
            />
          ) : (
            <div className="space-y-3">
              <div className="grid gap-3">
                {visibleCars.map((car) => (
                  <CarCard key={car.id} car={car} onSelect={setSelectedCar} />
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

export default CarModal;
