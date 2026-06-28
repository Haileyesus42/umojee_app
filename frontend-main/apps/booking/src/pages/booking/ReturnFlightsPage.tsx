import React from "react";
import CustomRoundtripStepper from "../../components/CustomRoundtripStepper";
import DirectFlights from "../../components/DirectFlights";
import DefaultLayout from "../../layout/DefaultLayout";
import ReturnFlights from "../../components/ReturnFlights";

const ReturnFlightsPage = () => {
  return (
    <DefaultLayout>
      <CustomRoundtripStepper activeIndex={2} />
      <ReturnFlights />
    </DefaultLayout>
  );
};

export default ReturnFlightsPage;
