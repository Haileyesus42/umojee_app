import { Check, X } from "lucide-react";
import React, { useState } from "react";
import { Button } from "../common/ui/button";

const availableOffers = {
  light: {
    offers: [
      {
        offer: "1 hand baggage and 1 personal item (12 kg total)*",
        isAvailable: true,
      },
      {
        offer: "No checked baggage included",
        isAvailable: false,
      },
      {
        offer: "No free seat selection before check-in",
        isAvailable: false,
      },
      {
        offer: "Unchangeable",
        isAvailable: false,
      },
      {
        offer: "Non-refundable",
        isAvailable: false,
      },
    ],
    price: 365,
  },
  standard: {
    offers: [
      {
        offer: "1 hand baggage and 1 personal item (12 kg total)*",
        isAvailable: true,
      },
      {
        offer: "1 checked baggage (23 kg)",
        isAvailable: true,
      },
      {
        offer: "No free seat selection before check-in",
        isAvailable: false,
      },
      {
        offer: "Changeable (EUR 70 fee + possible fare difference)",
        isAvailable: true,
      },
      {
        offer: "Non-refundable",
        isAvailable: false,
      },
    ],
    price: 395,
  },
  flex: {
    offers: [
      {
        offer: "1 hand baggage and 1 personal item (12 kg total)*",
        isAvailable: true,
      },
      {
        offer: "1 checked baggage (23 kg)",
        isAvailable: true,
      },
      {
        offer: "Seat selection before check-in*",
        isAvailable: true,
      },
      {
        offer: "Changeable (only pay possible fare difference)",
        isAvailable: true,
      },
      {
        offer: "Refundable if you cancel before the 1st flight in your trip",
        isAvailable: true,
      },
    ],
    price: 469,
  },
};

const SelectFlight = ({ setIsSelected }: { setIsSelected: (value: boolean) => void }) => {
  return (
    <div className="flex justify-center items-center">
      <div className="grid sm:grid-cols-2 sm:gap-2 md:grid-cols-3 md:gap-8 gap-y-4 md:mx-16">
        {Object.entries(availableOffers).map(([key, value]) => (
          <div
            key={key}
            className="shadow-md rounded-lg flex flex-col justify-between"
          >
            <div className="py-0">
              <div className="w-full flex justify-center items-center bg-blue-900 h-[46px] ">
                <h1 className="text-white font-bold">{key}</h1>
              </div>
              <div className="py-7 px-5">
                <p className="font-bold">Included per passenger</p>
                {value.offers.map((data, index) => (
                  <div key={index} className="flex space-x-4 pt-4 py-2">
                    {data.isAvailable ? (
                      <Check className="h-6 w-6 text-green-600" />
                    ) : (
                      <X className="h-6 w-6 text-red-700" />
                    )}
                    <p>{data.offer}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex flex-col p-5 space-y-5">
              <div className="flex justify-center">
                <h1 className="text-2xl font-bold">EUR {value.price}</h1>
              </div>
              <div className="flex justify-end">
                <Button
                  variant="secondary"
                  className="content-end text-white text-md bg-red-600 hover:bg-red-600"
                  onClick={() => setIsSelected(true)}
                >
                  Select
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SelectFlight;
