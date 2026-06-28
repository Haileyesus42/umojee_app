import React from "react";
import { NavLink } from "react-router-dom";
import { IMAGES } from "../../assets";

const Logo = () => {
  return (
    <NavLink to="/">
      <div className="flex items-center ml-4 mt-1">
        <img
          src={IMAGES.umojaAirwaysLogo}
          alt=""
          className="h-7 sm:h-9 lg:h-11 pr-1 w-full object-contain"
        />
      </div>
    </NavLink>
  );
};

export default Logo;
