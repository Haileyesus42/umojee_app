import React from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "../../common/ui/tabs";
import { Separator } from "../../common/ui/separator";
import { ArrowRightLeft } from "lucide-react";
import { destinations } from "../../common/ui/data/data";

const DestinationsPage = () => {
  return (
    <div className="mt-10 lg:mt-24 mx-1 sm:mx-10">
      <div className="text-2xl font-bold my-5 px-2">Destinations and deals</div>
      <Tabs defaultValue="flights" className="w-full">
        <TabsList className="space-x-0">
          <TabsTrigger
            value="flights"
            className="py-2 font-bold data-[state=active]:text-cyan-500"
          >
            Flights
          </TabsTrigger>
          <TabsTrigger
            value="promo"
            className="py-2 font-bold data-[state=active]:text-cyan-500"
          >
            Promo rewards
          </TabsTrigger>
        </TabsList>
        <Separator />

        <TabsContent value="flights">
          <div className="flex flex-col py-3 px-3 space-y-5">
            <p className="text-muted-foreground">
              Discover our best deals in the Economy cabin on flights departing
              from <span>Paris</span>
            </p>
            <div className="space-y-2">
              {destinations &&
                destinations.map((destination) => (
                  <div
                    key={destination.city}
                    className="bg-slate-50 hover:bg-gray-100 dark:bg-slate-500 cursor-pointer rounded-lg hover:scale-y-90 hover:scale-x-[0.99] transition-all duration-500"
                  >
                    <div className="flex flex-col sm:flex-row border-b justify-between sm:items-center py-3 sm:px-4 rounded duration-300">
                      <div className="flex space-x-5 w-full sm:w-[200px]">
                        <img
                          className="h-12 w-12 rounded-sm"
                          src={destination.image}
                          alt="place"
                        />
                        <div className="flex flex-col">
                          <p className="font-semibold">{destination.city}</p>
                          <span>({destination.country})</span>
                        </div>
                      </div>
                      <p>
                        From{" "}
                        <span className="font-semibold">
                          {destination.currency} {destination.startPrice}
                          <sup>*</sup>
                        </span>
                      </p>
                      <div className=" sm:inline-flex flex items-center space-x-1">
                        <ArrowRightLeft className="h-4 w-4" />
                        <span>Round trip</span>
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </TabsContent>
        <TabsContent value="promo">{""}</TabsContent>
      </Tabs>
    </div>
  );
};

export default DestinationsPage;
