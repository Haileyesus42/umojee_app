import React from "react";
import CustomOnewayStepper from "../../components/CustomOnewayStepper";
import DirectFlights from "../../components/DirectFlights";
import DefaultLayout from "../../layout/DefaultLayout";
import CustomRoundtripStepper from "../../components/CustomRoundtripStepper";
import { getLocalStorageValue } from "../../lib/utils";
import { useSelector } from "react-redux";

const DepartureFlightsPage = () => {
  const searchDataRedux = useSelector(
    (state: any) => state.flight.searchFlightData
  );
  const searchFlightData = getLocalStorageValue("searchFlightData")
    ? getLocalStorageValue("searchFlightData")
    : searchDataRedux;
  console.log(searchFlightData);

  return (
    <DefaultLayout>
      {searchFlightData && searchFlightData.tripType === "one-way" ? (
        <div className="max-w-screen-2xl mx-auto">
          <div className="sticky top-[70px] flex flex-col justify-center z-[1000] mx-auto">
            <CustomOnewayStepper activeIndex={1} />
          </div>
          <DirectFlights />
        </div>
      ) : (
        <div className="max-w-screen-2xl mx-auto">
          <div className="sticky top-[70px] flex flex-col justify-center z-[1000] mx-auto">
            <CustomRoundtripStepper activeIndex={1} />
          </div>
          <DirectFlights />
        </div>
      )}
    </DefaultLayout>
  );
};

export default DepartureFlightsPage;
