import React, { useEffect, useState } from "react";
import { animated, useTransition } from "@react-spring/web";
import { Button } from "../common/ui/button";
import { ChevronRight } from "lucide-react";
import { IMAGES } from "./../assets/index";

const images = [IMAGES.umojaAirplane, IMAGES.kidRunning, IMAGES.islandGirl];

const MainHero = () => {
  const [index, setIndex] = useState(0);

  const transitions = useTransition(index, {
    keys: index,
    from: { opacity: 0 },
    enter: { opacity: 1 },
    leave: { opacity: 0 },
    config: { duration: 1000 },
  });

  useEffect(() => {
    const interval = setInterval(() => {
      setIndex((prevIndex) => (prevIndex + 1) % images.length);
    }, 1000 * 10);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="relative h-[550px] -mt-24 bg-no-repeat bg-center bg-cover transition-opacity duration-1000 ease-in-out">
      <div className="absolute z-0 h-full w-full overflow-hidden">
        {transitions((style, i) => (
          <animated.div
            key={i}
            style={{
              ...style,
              position: "absolute",
              top: 0,
              left: 0,
              width: "100%",
              height: "100%",
              backgroundImage: `linear-gradient(to top, rgba(19,17,78,0.7), rgba(19,17,78,0.3)), url('${images[i]}')`,
              backgroundSize: "cover",
              backgroundPosition: "center",
              backgroundRepeat: "none",
            }}
          ></animated.div>
        ))}
      </div>
      <div className=" flex flex-col items-center justify-center w-full h-full max-w-screen-2xl px-4 sm:px-20 mx-auto ">
        <div className=" text-center p-5 rounded-xl transition-all -translate-y-8 md:-translate-y-8 lg:-translate-y-2 duration-500 drop-shadow-xl">
          <div className="text-white">
            <h1 className="font-bold text-2xl md:text-4xl lg:text-5xl">
              Discover the Premium Economy Cabin
            </h1>
            <p className="mt-2 text-sm sm:text-base tracking-widest">
              Peace, quiet and additional space: travel comfortably in your own
              personal heaven.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MainHero;
