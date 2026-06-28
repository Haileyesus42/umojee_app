import React from "react";
import { SeatDescriptionProps } from "../types/types";

const SeatDescription = ({ color, label }: SeatDescriptionProps) => {
  return (
    <div className="flex gap-2 items-center w-fit shrink-0">
      <div className={`${color} w-5 h-5 rounded-full`} />
      <span className="text-sm mt-1 text-gray-800">{label}</span>
    </div>
  );
};

export default SeatDescription;
