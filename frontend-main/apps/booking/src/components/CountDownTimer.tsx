import React, { useState, useEffect } from "react";

interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

const CountdownTimer = ({ targetDate }: { targetDate: string }) => {
  const calculateTimeLeft = (): TimeLeft => {
    const target = new Date(targetDate);
    const now = new Date();
    const difference = target.getTime() - now.getTime();

    // Handle negative time difference (target date in the past)
    if (difference <= 0) {
      return { days: 0, hours: 0, minutes: 0, seconds: 0 };
    }

    return {
      days: Math.floor(difference / (1000 * 60 * 60 * 24)),
      hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
      minutes: Math.floor((difference / 1000 / 60) % 60),
      seconds: Math.floor((difference / 1000) % 60),
    };
  };

  const [timeLeft, setTimeLeft] = useState<TimeLeft>(calculateTimeLeft());

  useEffect(() => {
    const timerId = setInterval(() => {
      setTimeLeft(calculateTimeLeft());
    }, 1000);

    return () => clearInterval(timerId); // Ensure proper cleanup
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty dependency array to run only once on mount

  const DD_Count = {
    "--value": timeLeft.days,
  } as React.CSSProperties;
  const HH_Count = {
    "--value": timeLeft.hours,
  } as React.CSSProperties;
  const MM_Count = {
    "--value": timeLeft.minutes,
  } as React.CSSProperties;
  const SS_Count = {
    "--value": timeLeft.seconds,
  } as React.CSSProperties;

  const isCounting =
    timeLeft.days || timeLeft.hours || timeLeft.minutes || timeLeft.seconds;

  return (
    Boolean(isCounting) && (
      <div className="flex flex-col justify-center items-center bg-deep-blue py-2 gap-2 text-white sm:space-x-8">
        <h1 className="font-bold sm:text-xl uppercase">Big Reveal Coming...</h1>
        <div className="flex flex-wrap justify-center items-center space-x-4">
          <div className="flex flex-col sm:flex-row items-center sm:items-baseline space-x-2 border px-2 py-1 border-slate-700 rounded-md">
            <span className="countdown font-bold text-lg sm:text-xl md:text-3xl">
              <span style={DD_Count} />
            </span>
            <div className="text-lg font-light">days</div>
          </div>
          <div className="flex flex-col sm:flex-row items-center sm:items-baseline space-x-2 border px-2 py-1 border-slate-700 rounded-md">
            <span className="countdown font-bold text-lg sm:text-xl md:text-3xl">
              <span style={HH_Count} />
            </span>
            <div className="text-lg font-light">hours</div>
          </div>
          <div className="flex flex-col sm:flex-row items-center sm:items-baseline space-x-2 border px-2 py-1 border-slate-700 rounded-md">
            <span className="countdown font-bold text-lg sm:text-xl md:text-3xl">
              <span style={MM_Count} />
            </span>
            <div className="text-lg font-light">mins</div>
          </div>
          <div className="flex flex-col sm:flex-row items-center sm:items-baseline space-x-2 border px-2 py-1 border-slate-700 rounded-md">
            <span className="countdown font-bold text-lg sm:text-xl md:text-3xl">
              <span style={SS_Count} />
            </span>
            <div className="text-lg font-light">secs</div>
          </div>
        </div>
      </div>
    )
  );
};

export default CountdownTimer;
