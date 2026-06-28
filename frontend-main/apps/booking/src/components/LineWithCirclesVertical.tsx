import React from "react";

const LineWithCirclesVertical = () => {
  return (
    <div className="relative h-full flex items-center w-fit">
      {/* Line */}
      <div className="absolute top-0 bottom-0 left-1/2 w-1 bg-emerald-600 transform translate-x-1/2"></div>

      {/* Starting circle */}
      <div className="absolute w-2 h-2 bg-white rounded-full ring-2 ring-emerald-600 top-0 transform -translate-y-1/2"></div>

      {/* Ending circle */}
      <div className="absolute w-2 h-2 bg-white rounded-full ring-2 ring-emerald-600 bottom-0 transform translate-y-1/2"></div>
    </div>
  );
};

export default LineWithCirclesVertical;
