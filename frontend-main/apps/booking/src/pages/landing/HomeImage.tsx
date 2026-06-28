import React from "react";
import { IMAGES } from "../../assets";
import CountdownTimer from "../../components/CountDownTimer";

const HomeImage = () => {
  return (
    <div
      className="mt-6 w-full bg-center bg-cover bg-no-repeat"
      style={{
        backgroundImage: `linear-gradient(to top, rgba(19,17,78,0.7), rgba(19,17,78,0.3)), url('${IMAGES.boyPlayingAirplane}')`,
      }}
    >
      <div className="w-full h-96 flex items-center py-10 max-w-7xl mx-auto px-2 sm:px-4">
        <div className="w-fit max-w-[400px] p-5 bg-blue-950 bg-opacity-30 rounded-xl text-white h-full">
          <h3 className="text-3xl font-bold ">Soar into Adventure!</h3>
          <p className="text-slate-200 font-thin">
            Experience unforgettable journeys with our exclusive flight deals!
          </p>
        </div>
      </div>
      <CountdownTimer targetDate={"2024-07-31"} />
    </div>
  );
};

export default HomeImage;
