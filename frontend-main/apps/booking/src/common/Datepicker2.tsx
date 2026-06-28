import React, { useState } from "react";
import DatePicker from "react-datepicker";
import { subMonths, addMonths, addYears } from "date-fns";
import "react-datepicker/dist/react-datepicker.css";
import { cn } from "../lib/utils";
import { Input } from "./ui/input";
import { Button } from "./ui/button";

interface StyledInputProps {
  value: string;
  onClick: () => void;
  className?: string;
}

let extraFutureYears=2
const DatePicker2: React.FC = () => {
  const [startDate, setStartDate] = useState<Date | null>(new Date());
  const [todayDate, setTodayDate] = useState<Date>(addYears(new Date(), extraFutureYears));


  return (
    <div className="w-full h-screen flex justify-center items-center">
      <DatePicker
        customInput={
          <StyledInput
            value={startDate ? startDate.toLocaleDateString() : ""}
            onClick={() => {}}
            className={"className"}
          />
        }
        renderCustomHeader={({
          monthDate,
          customHeaderCount,
          decreaseMonth,
          increaseMonth,
          changeYear,
          date,
        }) => (
          <div className="flex items-center justify-center p-1">
            <Button
              variant={"ghost"}
              type="button"
              aria-label="Previous Month"
              className={`react-datepicker__navigation react-datepicker__navigation--previous my-3 ${
                customHeaderCount === 1 ? "invisible" : "visible"
              }`}
              onClick={decreaseMonth}
            >
              <span className="react-datepicker__navigation-icon react-datepicker__navigation-icon--previous">
                {"<"}
              </span>
            </Button>
            <span
              className="react-datepicker__current-month hover:cursor-pointer hover:bg-slate-100 px-4 py-2 rounded-sm"
              onClick={() => alert("hello")}
            >
              {monthDate.toLocaleString("en-US", {
                month: "long",
                year: "numeric",
              })}
            </span>
            <span className="mx-2">
              <select
                value={date.getFullYear()}
                onChange={({ target: { value } }) =>
                  changeYear(parseInt(value))
                }
                className="react-datepicker__year-select"
              >
                {Array.from({ length: 100 }, (_, i) => (
                  <option key={i} value={todayDate.getFullYear() - i}>
                    {todayDate.getFullYear() - i}
                  </option>
                ))}
              </select>
            </span>
            <Button
              variant={"ghost"}
              type="button"
              aria-label="Next Month"
              className={`react-datepicker__navigation react-datepicker__navigation--next my-3 ${
                customHeaderCount === 1 ? "invisible" : "visible"
              }`}
              onClick={increaseMonth}
            >
              <span className="react-datepicker__navigation-icon react-datepicker__navigation-icon--next">
                {">"}
              </span>
            </Button>
          </div>
        )}
        selected={startDate}
        onChange={(date: Date | null) => setStartDate(date)}
        dateFormatCalendar="MMM yyyy"
        maxDate={new Date(2025, 11, 31)}
        yearDropdownItemNumber={100} //
      />
    </div>
  );
};

const StyledInput: React.FC<StyledInputProps> = ({
  value,
  onClick,
  className,
}) => (
  <Input
    className={cn(
      "text-md text-center text-muted-foreground w-full py-6",
      className
    )}
    value={value}
    onClick={onClick}
    readOnly
  />
);

export default DatePicker2;
