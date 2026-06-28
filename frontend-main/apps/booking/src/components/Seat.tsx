import React from "react";
import { HandicapIcon, NoHandicapIcon, TriangleIcon } from "../assets";
import { SeatProps } from "../types/types";

const Seat = ({ seatData, onClick, isSelected }: SeatProps) => {
  const {
    _id,
    seatId,
    status,
    armTrayLeft,
    armTrayRight,
    handicapArmRest,
    hideSeat,
    noBreakOver,
    noRecline,
    unsuitableForHandicap,
  } = seatData;

  const seatCharacter = () => {
    switch (status) {
      case "available":
        return `${
          isSelected
            ? "bg-[#5A92C6] outline-[1.5px] outline-dashed outline-green-600"
            : "bg-[#A8D5BA] group-hover:bg-[#7cc097] cursor-pointer"
        }`;
      case "occupied":
        return "bg-[#F3A6A6] cursor-not-allowe";
      case "unavailable":
        return "bg-[#D8D8D8] cursor-not-allowe";
      default:
        return "bg-[#D8D8D8] cursor-not-allowe";
    }
  };

  return (
    <div
      className={`group ${
        status !== "unavailable" && "active:scale-[0.98]"
      } ${seatId.includes('C') ? 'pr-2 sm:pr-4' : seatId.includes('D') && 'pl-2 sm:pl-4'} transition-all select-none duration-500`}
      onClick={() => status === "available" && !hideSeat && onClick(_id)}
    >
      <div
        className={`relative w-12 xs:w-14 sm:w-16 h-[47px] rounded-lg ${seatCharacter()} border border-b-0 grid place-content-center transition-all`}
      >
        <div
          className={`absolute ${
            armTrayLeft ? "bg-gray-800" : "bg-slate-100"
          } left-0 bottom-0 h-[80%] border border-gray-600 rounded-t-md w-2 -translate-x-1/2 `}
        />
        <div
          className={`absolute ${
            armTrayRight ? "bg-gray-800" : "bg-slate-100"
          } right-0 bottom-0 h-[80%] border border-gray-600 rounded-t-md w-2 -mr-[1.5px] translate-x-1/2 `}
        />
        {handicapArmRest ? (
          <HandicapIcon
            className={`text-2xl ${
              isSelected ? "text-white" : "text-blue-600"
            } -mb-1`}
          />
        ) : (
          unsuitableForHandicap && (
            <NoHandicapIcon
              className={`text-[21px] -mb-1 ${
                isSelected ? "text-white" : "text-red-600"
              } mt-1`}
            />
          )
        )}
        <span
          className={`font-semibold drop-shadow-lg ${
            isSelected ? "text-white" : "text-black"
          }`}
        >
          {seatId}
        </span>
      </div>
      <div
        className={`${seatCharacter()} h-4 flex items-center justify-between p-1 rounded-md border-[1px] border-slate-800 transition-all`}
      >
        {noBreakOver && (
          <TriangleIcon className="text-gray-800 h-[13px] w-[13px]" />
        )}
        {noRecline && <div className="h-3 w-3 rounded-full bg-gray-800" />}
      </div>
    </div>
  );
};

export default Seat;
