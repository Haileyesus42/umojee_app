import React from "react";
import { cn } from "../lib/utils";
interface LineProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
}

const Line: React.FC<LineProps> = ({ className, ...rest }) => {
  return (
    <div className="relative w-full flex items-center" {...rest}>
      <div
        className={cn(
          "absolute left-0 right-0 top-1/2 h-[2px] bg-blue-500 transform -translate-y-1/2",
          className
        )}
      ></div>
    </div>
  );
};

export default Line;
