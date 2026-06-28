import React from "react";

interface FloatingButtonProps {
  onClick: () => void;
}

const FloatingChatbotButton = ({ onClick }: FloatingButtonProps) => {
  return (
    <button
      type="button"
      className="relative group flex items-center justify-center h-14 w-14 sm:w-16 sm:h-16 rounded-full drop-shadow-[0px_6px_6px_rgba(0,0,0,0.4)] transition-all duration-300"
      onClick={onClick}
    >
      <div className="absolute z-50 right-1 top-0 stroke w-3 h-3 sm:w-[14px] sm:h-[14px] rounded-full bg-red-500 animate-pulse" />
      <div className="absolute -z-10 w-14 h-14 sm:w-16 sm:h-16 scale-125 group-hover:scale-110 duration-[2000s] rounded-full bg-radial-gradient animate-pulse group-hover:animate-none group-hover:duration-1000" />
      <div className="w-[90%] h-[90%] group-hover:scale-105 grid place-content-center rounded-full bg-[#2152A3] transition-all duration-300">
        <div className="w-5 h-5 sm:h-6 sm:w-6 group-hover:scale-[0.8] transition-all duration-300">
          <svg
            width="100%"
            height="100%"
            viewBox="0 0 26 23"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M0.861145 4C0.861145 1.79086 2.65201 0 4.86115 0H21.8284C24.0375 0 25.8284 1.79086 25.8284 4V17.5695H4.86114C2.65201 17.5695 0.861145 15.7787 0.861145 13.5695V4Z"
              fill="#ffffff"
            />
            <path
              d="M25.8285 22.6554V17.3383H21.205L25.8285 22.6554Z"
              fill="#F8F3F3"
            />
          </svg>
        </div>
      </div>
    </button>
  );
};

export default FloatingChatbotButton;
