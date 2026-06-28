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
        "relative inline-flex justify-center items-center w-10 h-10  whitespace-nowrap text-xl ring-1 font-bold rounded-full hover:cursor-pointer",
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
          className="py-6 text-waikawa-gray-600"
        >
          {adults + children + infants} Passengers
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[400px]">
        <div className="flex flex-col space-y-2 p-4 mb-1">
          <div className="flex items-center justify-between">
            <div className="flex flex-col">
              <p className="text-lg py-0 font-medium text-waikawa-gray-800">
                Adults
              </p>
              <span className="text-sm text-waikawa-gray-500 ml-1 leading-[10px]">
                12+ Years
              </span>
            </div>
            <div className="flex items-center space-x-5 my-3">
              <CircleButton
                onClick={() => setAdults(adults - 1)}
                text="-"
                className={`ring-torch-red-300 hover:bg-torch-red-50 ${
                  adults === 0 ? "pointer-events-none ring-torch-red-50" : ""
                }`}
              />
              <span className="text-lg font-bold">{adults}</span>
              <CircleButton
                onClick={() => setAdults(adults + 1)}
                text="+"
                className="ring-emerald-300 hover:bg-emerald-50"
              />
            </div>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex flex-col">
              <p className="text-lg py-0 font-medium text-waikawa-gray-800">
                Children
              </p>
              <span className="text-sm text-waikawa-gray-500 ml-1 leading-[10px]">
                2-11 Years
              </span>
            </div>
            <div className="flex items-center  space-x-5 my-3">
              <CircleButton
                onClick={() => setChildren(children - 1)}
                text="-"
                className={`ring-torch-red-300 hover:bg-torch-red-50 ${
                  children === 0 ? "pointer-events-none ring-torch-red-50" : ""
                }`}
              />
              <span className="text-lg font-bold">{children}</span>
              <CircleButton
                onClick={() => setChildren(children + 1)}
                text="+"
                className="ring-emerald-300 hover:bg-emerald-50"
              />
            </div>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex flex-col">
              <p className="text-lg py-0 font-medium text-waikawa-gray-800">
                Infants
              </p>
              <span className="text-sm text-waikawa-gray-500 ml-1 leading-[10px]">
                0-23 Months
              </span>
            </div>
            <div className="flex items-center  space-x-5 my-3">
              <CircleButton
                onClick={() => setInfants(infants - 1)}
                text="-"
                className={`ring-torch-red-300 hover:bg-torch-red-50 ${
                  infants === 0 ? "pointer-events-none ring-torch-red-50" : ""
                }`}
              />
              <span className="text-lg font-bold">{infants}</span>
              <CircleButton
                onClick={() => setInfants(infants + 1)}
                text="+"
                className="ring-emerald-300 hover:bg-emerald-50"
              />
            </div>
          </div>
          <div className="flex justify-end pt-5">
            <Button
              onClick={handleDone}
              className="bg-emerald-600 hover:bg-emerald-700"
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
