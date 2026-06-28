import React, { useEffect } from "react";
import { useSelector } from "react-redux";
import { IMAGES } from "../assets";
import { formatTime } from "../lib/utils";
import { Flights } from "../types/types";
import { Button } from "../common/ui/button";
import { Eye, Heart } from "lucide-react";

interface featuredFlights {
  _id: string;
  bookingCount: number;
  flightDetails: Flights;
  flightId: string;
}

const images = [IMAGES.london, IMAGES.city1, IMAGES.city2, IMAGES.italy];

const FeaturedFlight = () => {
  const featuredFlights = useSelector(
    (state: any) => state.flight.featuredFlights
  );

  return (
    <div className="lg:mt-40 mb-10 sm:mx-10">
      {featuredFlights.length > 0 && (
        <>
          <h2 className="text-2xl font-bold px-2 text-emerald-600">Featured Flights</h2>
          <p className="font-light px-2 text-muted-foreground">
            Explore top flight deals for your next adventure!
          </p>
          <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2 place-items-center">
            {featuredFlights.map((flight: featuredFlights, index: number) => {
              return (
                flight.flightDetails && (
                  <div
                    key={flight._id}
                    className="relative group flex flex-col justify-end rounded-xl w-full sm:max-w-80 h-96 bg-cover bg-no-repeat overflow-hidden"
                    style={{
                      backgroundImage: `linear-gradient(to top, rgba(19,17,78,0.5), rgba(19,17,78,0.3)), url('${images[index]}`,
                    }}
                  >
                    <div className="absolute right-5 top-5">
                      <div className="flex space-x-2">
                        {/* <Button
                          variant={"link"}
                          className="bg-picton-blue-100 hover:bg-picton-blue-50 hover:text-emerald-700 w-10 h-10 rounded-full p-0"
                          onClick={() => {}}
                        >
                          <Heart
                            className="text-emerald-600"
                            height={18}
                            width={18}
                          />
                        </Button> */}
                        <Button
                          variant={"link"}
                          className="bg-picton-blue-100 hover:bg-picton-blue-50 hover:text-emerald-700 w-10 h-10 rounded-full p-0"
                          onClick={() => {}}
                        >
                          <Eye
                            className="text-emerald-600"
                            height={18}
                            width={18}
                          />
                        </Button>
                      </div>
                    </div>
                    <div className="px-4 py-4 pb-10 translate-y-5 group-hover:translate-y-0 bg-slate-900 bg-opacity-50 text-white transition-all duration-500">
                      <h4 className="text-lg font-bold">
                        {flight.flightDetails.departureAirport}
                        {" → "}
                        {flight.flightDetails.arrivalAirport}
                      </h4>
                      <div className="flex justify-between items-end pb-2">
                        <div>
                          <h4 className="text-sm font-medium">
                            {
                              formatTime(flight.flightDetails.departureTime)
                                .shortDate
                            }
                          </h4>
                          <h4 className="text-sm font-light">
                            {
                              formatTime(flight.flightDetails.departureTime)
                                .time
                            }
                          </h4>
                        </div>
                        <h3 className="text-white font-bold">
                          {flight.flightDetails.price.oneway}{" "}
                          {flight.flightDetails.price.currency}
                        </h3>
                      </div>
                    </div>
                  </div>
                )
              );
            })}
          </div>
        </>
      )}
    </div>
  );
};

export default FeaturedFlight;
