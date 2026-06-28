import React, { useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "../common/ui/popover";
import { Button } from "../common/ui/button";
import { cn } from "../lib/utils";

const CircleButton: React.FC<{
  text: string;
  onClick: () => void;
  className?: string;
}> = ({ text, onClick, className }) => {
  return (
    <div
      className={cn(
        "relative flex justify-center items-center w-10 h-10 ring-1 ring-red-300 text-xl font-bold rounded-full hover:cursor-pointer",
        className
      )}
      onClick={onClick}
    >
      <span className="absolute top-1">{text}</span>
    </div>
  );
};

const PassengerSelectPopover: React.FC<{
  onSelectionChange: (
    adults: number,
    children: number,
    infants: number
  ) => void;
  setAdults: React.Dispatch<React.SetStateAction<number>>;
  setChildren: React.Dispatch<React.SetStateAction<number>>;
  setInfants: React.Dispatch<React.SetStateAction<number>>;
  adults: number;
  children: number;
  infants: number;
}> = ({
  onSelectionChange,
  setAdults,
  setChildren,
  setInfants,
  adults,
  children,
  infants,
}) => {
  const [open, setOpen] = useState(false);

  const handleDone = () => {
    onSelectionChange(adults, children, infants);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant={"secondary"}
          onClick={() => setOpen(!open)}
          className="py-6"
        >
          {adults + children + infants} Passengers
        </Button>
      </PopoverTrigger>
      <PopoverContent className="max-w-[400px] max-h-[320px]">
        <div className="flex flex-col space-y-2 p-4 mb-1">
          <div className="flex items-center justify-between">
            <div className="flex flex-col">
              <p className="text-lg py-0 font-medium">Adults</p>
              <span className="font-light text-xs ml-1 leading-[10px]">
                12+ Years
              </span>
            </div>
            <div className="flex space-x-2 items-center space-x-5 my-3">
              <CircleButton
                onClick={() => setAdults(adults - 1)}
                text="-"
                className={`${
                  adults === 0 ? "pointer-events-none ring-red-50" : ""
                }`}
              />
              <span className="text-lg font-bold">{adults}</span>
              <CircleButton onClick={() => setAdults(adults + 1)} text="+" />
            </div>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex flex-col">
              <p className="text-lg py-0 font-medium">Children</p>
              <span className="font-light text-xs ml-1 leading-[10px]">
                2-11 Years
              </span>
            </div>
            <div className="flex space-x-2 items-center  space-x-5 my-3">
              <CircleButton
                onClick={() => setChildren(children - 1)}
                text="-"
                className={`${
                  children === 0 ? "pointer-events-none ring-red-50" : ""
                }`}
              />
              <span className="text-lg font-bold">{children}</span>
              <CircleButton
                onClick={() => setChildren(children + 1)}
                text="+"
              />
            </div>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex flex-col">
              <p className="text-lg py-0 font-medium">Infants</p>
              <span className="font-light text-xs ml-1 leading-[10px]">
                0-23 Months
              </span>
            </div>
            <div className="flex space-x-2 items-center  space-x-5 my-3">
              <CircleButton
                onClick={() => setInfants(infants - 1)}
                text="-"
                className={`${
                  infants === 0 ? "pointer-events-none ring-red-50" : ""
                }`}
              />
              <span className="text-lg font-bold">{infants}</span>
              <CircleButton onClick={() => setInfants(infants + 1)} text="+" />
            </div>
          </div>
          <div className="flex justify-end pt-5">
            <Button
              onClick={handleDone}
              className="bg-red-300 hover:bg-red-300"
            >
              Done
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default PassengerSelectPopover;
