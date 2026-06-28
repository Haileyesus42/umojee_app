import React from "react";
import { useNavigate } from "react-router-dom";
import { IMAGES } from "../../assets";

const MoreThanFlight = () => {
  const navigate = useNavigate();

  const data = [
    {
      image: IMAGES.car,
      description: "Rent a car at a favorable price and earn Miles",
      name: "with Hertz",
      link: "/hello",
    },
    {
      image: IMAGES.islandGirl,
      description: "Book your stay and earn Miles",
      name: "with Booking.com",
      link: "/hello",
    },
    {
      image: IMAGES.carParking,
      description: "Book a personal driver or airport parking",
      name: "with Hertz DriveU & Free2Move",
      link: "/hello",
    },
    {
      image: IMAGES.visaCard,
      description: "Earn Miles on each purchase",
      name: "with the AIR FRANCE KLM - AMERICAN EXPRESS card",
      link: "/hello",
    },
  ];

  return (
    <div className="mt-10  mx-1 sm:mx-10">
      <div className="text-2xl font-bold my-5 px-2 text-emerald-600">
        Looking for more than a flight?
      </div>
      <div className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {data &&
          data.map((item) => (
            <div
              key={item.name}
              className="flex flex-col bg-slate-200 rounded-lg py-4 px-3 hover:cursor-pointer shadow-lg"
              onClick={() => navigate(item.link)}
            >
              <div className="h-full flex flex-col hover:scale-y-95 hover:scale-x-[0.98] duration-300">
                <div className="">
                  <img
                    src={item.image}
                    alt="car"
                    className="h-[150px] w-[150px]"
                  />
                </div>
                <div className="">
                  <h4 className="text-md font-bold text-blue-950 pt-4 leading-5 px-3">
                    {item.description}
                  </h4>
                  <p className="text-sm font-normal text-blue-950 px-3">
                    {item.name}
                  </p>
                </div>
              </div>
            </div>
          ))}
      </div>
    </div>
  );
};

export default MoreThanFlight;
