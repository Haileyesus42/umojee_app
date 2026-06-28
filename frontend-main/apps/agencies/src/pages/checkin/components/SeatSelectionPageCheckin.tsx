import { TriangleIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { CautionIcon, HandicapIcon, IMAGES, NoHandicapIcon } from "../../../assets";
import Seat from "../../../components/Seat";
import SeatDescription from "../../../components/SeatDescription";
import axios from "axios";

interface seatSelectionPageProps {
  bookingId: string;
  setIsEditingSeats: (isEditing: boolean) => void;
  onSeatSelect: (seatNumber: string) => void; // Add this prop
}

interface SeatProp {
  _id: string;
  seatId: string;
  status: string;
  unsuitableForHandicap: boolean;
  armTrayLeft: boolean;
  armTrayRight: boolean;
  babyHammock?: boolean;
  handicapArmRest?: boolean;
  noBreakOver?: boolean;
  limitedRecline?: boolean;
  noRecline?: boolean;
  hideSeat?: boolean;
}

interface Row {
  _id: string;
  rowNumber: number;
  seats: SeatProp[];
}


const SeatSelectionPageCheckin = ({ bookingId, setIsEditingSeats, onSeatSelect }: seatSelectionPageProps) => {
  const [selectedSeats, setSelectedSeats] = useState<
    { rowId: string; seatId: string }[]
  >([]);
  const [passengerCount, setPassengerCount] = useState<number>(0);
  const [allSeats, setAllSeats] = useState<Row[]>([]);
  const [isFetchingSeat, setIsFetchingSeat] = useState<boolean>(false);
  const serverURL = (import.meta as any).env.VITE_BACKEND_URL

  const fetchSeats = async () => {
    setIsFetchingSeat(true);
    try {
      const response = await axios.get(
        `${serverURL}/admin/seats/getallsb/${bookingId}`
      );

      setAllSeats(response.data.allSeats);
      setPassengerCount(response.data.passengersCount);
    } catch (error) {
      console.error("Error fetching seats:", error);
    } finally {
      setIsFetchingSeat(false);
    }
  };

  useEffect(() => {
    fetchSeats();
  }, []);

  const toggleSeatSelection = (rowId: string, seatId: string) => {
    const seatIdentifier = { rowId, seatId };

    const isSelected = selectedSeats.some(
      (seat) => seat.rowId === rowId && seat.seatId === seatId
    );

    if (isSelected) {
      setSelectedSeats((prev) =>
        prev.filter((seat) => !(seat.rowId === rowId && seat.seatId === seatId))
      );
    } else if (selectedSeats.length >= passengerCount) {
      const updatedSelect = selectedSeats.slice(1).concat(seatIdentifier);
      setSelectedSeats(updatedSelect);
    } else {
      setSelectedSeats((prev) => [...prev, seatIdentifier]);
    }

  };

  // Function to find the seat number
  function findSeat(allSeats: Row[], targetRowId: string, targetSeatId: string) {
    for (const row of allSeats) {
      if (row._id === targetRowId) {
        for (const seat of row.seats) {
          if (seat._id === targetSeatId) {
            return `${seat.seatId}`;
          }
        }
      }
    }
    // If no seat is found
    return "Seat not found";
  }

  const handleSaveSelection = () => {
    if (!isFetchingSeat && selectedSeats) {
      selectedSeats.forEach((selectedSeat) => {
        let targetRowId = selectedSeat.rowId
        let targetSeatId = selectedSeat.seatId
        let seatNumber = findSeat(allSeats, targetRowId, targetSeatId)
        onSeatSelect(seatNumber);
      })
      setIsEditingSeats(false)
    }
  }
  return (
    <>
      <div className="relative max-w-screen-2xl h-full mx-auto">
        <div className="mt-2 w-full mx-auto max-w-[1480px] px-4 py-2 bg-slate-50 rounded-xl shadow-[0px_2px_12px_rgba(0,0,0,0.2)]">
          <div className="flex justify-evenly gap-4 overflow-x-scroll sm:overflow-auto space-x-3 pb-2">
            <SeatDescription color="bg-[#A8D5BA]" label="Available" />
            <SeatDescription color="bg-[#F3A6A6]" label="Occupied" />
            <SeatDescription
              color="bg-[#5A92C6] outline-[1px] outline-dashed"
              label="Your Selection"
            />
            <SeatDescription color="bg-[#D8D8D8]" label="Unavailable" />
          </div>
          <div className="mt-4 flex mx-auto space-x-2 w-full">
            <div className="flex justify-between w-full gap-2">
              <button
                className={`${selectedSeats.length < passengerCount
                  ? "bg-blue-200 hover:bg-blue-100 text-black"
                  : "bg-blue-800 hover:bg-blue-700 text-white"
                  } font-semibold grow  py-3 px-6 rounded-md  active:scale-95 transition-all duration-500`}
                onClick={handleSaveSelection}
              >
                {isFetchingSeat ? "Fetching All Seats..." : "Procceed"}
              </button>
            </div>
            <button
              className=" text-gray-900 py-3 px-6 rounded-md border border-gray-400 hover:bg-red-200 active:scale-95 transition-all duration-500"
              onClick={() => {
                setIsEditingSeats(false)
              }}
            >
              Skip
            </button>
          </div>
        </div>
      </div>

      {/* Seat Selection Component with airplane asset */}
      <div className="mt-2 sm:mt-4 md:mt-0 sm:px-4 w-fit flex justify-center mx-auto">
        {!isFetchingSeat && allSeats.length > 0 ? (
          <div className="relative w-full mt-10 min-h-screen lg:w-[1080px] mx-auto flex">
            <img
              src={IMAGES.planeLayout}
              alt=""
              className="w-full hidden lg:block"
            />
            <div className=" lg:absolute space-y-2 lg:right-1/2 lg:translate-x-1/2 lg:top-[680px] overflow-x-scroll xs:border-4 border-blue-800 sm:p-4 lg:border-0 lg:p-0 lg:rounded-none rounded-xl">
              {allSeats.map((columnSeat, i) => (
                <div key={i} className="flex items-center">
                  {columnSeat.seats.map((rowSeat, j) =>
                    rowSeat.hideSeat ? (
                      <div className="w-12 xs:w-14 sm:w-16" />
                    ) : (
                      <Seat
                        key={j}
                        seatData={rowSeat}
                        onClick={() =>
                          rowSeat.status === "available" &&
                          passengerCount &&
                          toggleSeatSelection(columnSeat._id, rowSeat._id)
                        }
                        isSelected={selectedSeats.some(
                          (s) =>
                            s.rowId === columnSeat._id &&
                            s.seatId === rowSeat._id
                        )}
                      />
                    )
                  )}
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className=" h-[calc(100vh-250px)] grid place-content-center">
            {isFetchingSeat ? (
              <div
                className=" inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-e-transparent align-[-0.125em] text-surface motion-reduce:animate-[spin_1.5s_linear_infinite] dark:text-white"
                role="status"
              >
                <span className="!absolute !-m-px !h-px !w-px !overflow-hidden !whitespace-nowrap !border-0 !p-0 ![clip:rect(0,0,0,0)]">
                  Loading...
                </span>
              </div>
            ) : (
              <div className="flex flex-col justify-center items-center gap-2">
                <span className="font-semibold sm:text-lg">
                  Unable to fetch seats!
                </span>
                <CautionIcon className="text-[4rem] text-red-400" />
                <button
                  className=" text-gray-900 py-2 px-6 rounded-md border border-gray-400 hover:bg-red-200 active:scale-95 transition-all duration-500"
                  onClick={() => fetchSeats()}
                >
                  Refetch
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Seat Type Description */}
      <div className="mt-10 p-6 bg-slate-100 shadow-[0px_2px_12px_rgba(0,0,0,0.2)]">
        <h2 className="text-center uppercase text-lg sm:text-xl mb-5 font-bold">
          Seat type descriptions
        </h2>
        <div className="flex flex-wrap sm:justify-evenly gap-4 xs:gap-6 text-slate-950">
          <div className="grid grid-cols-[24px_1fr] items-center gap-2">
            <div className="w-2 h-7 bg-gray-900 mx-auto rounded-md" />
            <span className="text-sm xs:text-base  ">
              SEAT WITH IN ARM TRAY
            </span>
          </div>
          <div className="grid grid-cols-[24px_1fr] items-center gap-2">
            <div className="h-5 w-5 rounded-full bg-gray-900 mx-auto" />
            <span className="text-sm  xs:text-base ">
              SEAT WITH NO RECLINE
            </span>
          </div>
          <div className="grid grid-cols-[24px_1fr] items-center gap-2">
            <TriangleIcon className=" text-2xl mx-auto" />
            <span className="text-sm xs:text-base  ">
              SEAT WITH NO BREAK OVER
            </span>
          </div>
          <div className="grid grid-cols-[24px_1fr] items-center gap-2">
            <HandicapIcon className=" text-3xl mx-auto" />
            <span className="text-sm xs:text-base  ">HANDICAP ARM REST</span>
          </div>
          <div className="grid grid-cols-[24px_1fr] items-center gap-2">
            <NoHandicapIcon className=" text-3xl mx-auto" />
            <span className="text-sm xs:text-base  ">
              UNSUITABLE FOR H/CAP
            </span>
          </div>
        </div>
      </div>
      {/* </div> */}
    </>
  );
};

export default SeatSelectionPageCheckin;
