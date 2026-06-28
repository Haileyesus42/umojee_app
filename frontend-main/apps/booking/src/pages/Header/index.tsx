import { LogIn, Menu } from "lucide-react";
import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import Logo from "../../common/Logo";
import { getLocalStorageValue, removeLocalStorageValue } from "../../lib/utils";
import DarkModeSwitcher from "./DarkModeSwitcher";
import DropdownNotification from "./DropdownNotification";
import DropdownUser from "./DropdownUser";
import Coachmark from "../chat/mobile/components/Coachmark";

const Header = (props: {
  sidebarOpen: string | boolean | undefined;
  setSidebarOpen: (arg0: boolean) => void;
}) => {
  const location = useLocation();
  const { pathname } = location;
  const isUserLoggedIn = getLocalStorageValue("isLoggedIn")
    ? getLocalStorageValue("isLoggedIn")
    : false;
  const [isLoggedIn] = useState(isUserLoggedIn);

  const isRouteGroupActive = (paths: string[]) => {
    return paths.some((path) => pathname === path || pathname.startsWith(`${path}/`));
  };

  const navLinkClass = (isActive: boolean) =>
    `px-4 py-2 font-medium transition-colors duration-500 ${
      isActive
        ? "text-emerald-600 dark:text-emerald-600"
        : "text-waikawa-gray-700 hover:text-emerald-700 dark:text-gray-200"
    }`;

  return (
    <nav
      className={`sticky flex flex-col top-0 z-[1001] w-full bg-white shadow-md border-gray-200 dark:bg-slate-500 dark:drop-shadow-none dark:border-gray-700`}
    >
      {/* Header content */}
      <div className="flex items-center justify-between py-3 shadow-2 mx-auto w-full max-w-[1480px]">
        <div className="flex items-center gap-2">
          <Logo />
        </div>
        {/* Navigation Links */}
        <div className="hidden md:flex px-4 py-0 md:px-6 2xl:px-11">
          <Link
            to={"/"}
            className={navLinkClass(
              pathname === "/" ||
                isRouteGroupActive([
                  "/search/flights",
                  "/flights",
                  "/passengers/details",
                  "/passengers/seat-selection",
                  "/passengers/seatSelection-return",
                  "/passengers/extra-options",
                  "/passengers/payments",
                ]),
            )}
          >
            Book a flight
          </Link>
          {/* <Link
            to={"#"}
            // to={"/check-in"}
            className={`px-4 py-2 text-waikawa-gray-700 font-medium hover:text-emerald-700 transition-colors ${
              isActive("/check-in") ? "text-emerald-600 dark:text-emerald-600"
                  : "text-waikawa-gray-700 dark:text-gray-200"
            } duration-500`}
          >
            Check-in
          </Link> */}
          {isLoggedIn && (
            <Link
              to={"/trip"}
              className={navLinkClass(
                isRouteGroupActive(["/trip", "/request/refund"]),
              )}
            >
              My Bookings
            </Link>
          )}
          {/* <Link
            // to={"/information"}
            to={"#"}
            className={`px-4 py-2 text-waikawa-gray-700 font-medium hover:text-emerald-700 transition-colors ${
              isActive("/information")
                ? "text-emerald-600 dark:text-emerald-600"
                : "text-waikawa-gray-700 dark:text-gray-200"
            } duration-500`}
          >
            Information
          </Link> */}
          <Link
            to={"/journey"}
            className={navLinkClass(isRouteGroupActive(["/journey"]))}
          >
            Umojee
          </Link>
          {isLoggedIn && (
            <Coachmark
              id="header_communities_nav"
              title="New Feature!"
              description="Visit Communities to connect with travelers, manage journey shares, and keep up with trip conversations."
              position="bottom"
              buttonText="Got it!"
            >
              <Link
                to={"/communities"}
                className={navLinkClass(isRouteGroupActive(["/communities"]))}
              >
                Communities
              </Link>
            </Coachmark>
          )}
          <Link
            to={"/support"}
            className={navLinkClass(
              isRouteGroupActive(["/support", "/chat/support"]),
            )}
          >
            Support
          </Link>
        </div>
        {/* <div></div> */}

        {/* Authentication & Navigation Links */}
        <div className="flex items-center gap-3 2xsm:gap-7 px-4">
          {!isLoggedIn ? (
            <ul className="flex items-center gap-2 2xsm:gap-4">
              <li className="relative">
                <Link
                  to="/login"
                  className="relative flex h-8.5 w-8.5 items-center justify-center text-sm px-4 py-2 text-emerald-600 border rounded-md border-emerald-200 hover:text-emerald-700 font-medium transition-colors duration-500 bg-gray dark:bg-slate-500 dark:text-white"
                  onClick={() => {
                    removeLocalStorageValue("isLoggedIn");
                    removeLocalStorageValue("user");
                  }}
                >
                  <LogIn className="h-4 w-4 mr-1" />
                  Login
                </Link>
              </li>
            </ul>
          ) : (
            <>
              <ul className="flex items-center gap-2 2xsm:gap-4">
                <DarkModeSwitcher />
                <DropdownNotification />
                {/* <DropdownMessage /> */}
              </ul>
              <DropdownUser />
            </>
          )}
          {/* Hamburger Toggle BTN */}
          <button
            aria-controls="sidebar"
            onClick={(e) => {
              e.stopPropagation();
              props.setSidebarOpen(!props.sidebarOpen);
            }}
            className="z-99999 md:hidden block rounded-sm border border-stroke bg-white p-1.5 shadow-sm dark:border-strokedark dark:bg-slate-500"
          >
            <span className="relative block h-5.5 w-5.5 cursor-pointer">
              <Menu />
            </span>
          </button>
        </div>
      </div>
    </nav>
  );
};

export default Header;
