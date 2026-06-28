import React from "react";

const LineWithCircles = () => {
  return (
    <div className="relative w-full flex items-center">
      {/* Line */}
      <div className="absolute left-0 right-0 top-1/2 h-1 bg-picton-blue-500 transform -translate-y-1/2"></div>
      
      {/* Starting circle */}
      <div className="absolute w-1 h-1 bg-white rounded-full ring-1 ring-pictbg-picton-blue-500 left-0  transform -translate-x-1/2"></div>
      
      {/* Ending circle */}
      <div className="absolute w-1 h-1 bg-white rounded-full ring-1 ring-pictbg-picton-blue-500 right-0  transform translate-x-1/2"></div>
    </div>
  );
};

export default LineWithCircles;
