import { addYears } from "date-fns";
import React, { useEffect } from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { cn } from "../lib/utils";
import { Button } from "./ui/button";
import { Input } from "./ui/input";

interface StyledInputProps {
  value: string;
  onClick: () => void;
  className?: string;
}

function SingleDatePicker({
  placeholder,
  onChange,
  setInputValue,
  setSelectedDate,
  inputValue,
  selectedDate,
  monthsShown = 2,
  minDate = null,
  maxDate = null,
  isDisabled = false,
  className = "",
  extraFutureYears = 0,
}: {
  placeholder: string;
  selectedDate: Date;
  inputValue: string;
  monthsShown?: number;
  extraFutureYears?: number;
  minDate?: Date | null;
  maxDate?: Date | null;
  isDisabled?: boolean;
  className?: string;
  onChange: (date: Date) => void;
  setSelectedDate: React.Dispatch<React.SetStateAction<Date>>;
  setInputValue: React.Dispatch<React.SetStateAction<string>>;
}) {
  useEffect(() => {
    setInputValue(selectedDate.toLocaleDateString());
  }, [selectedDate]);

  const handleDateChange = (date: Date) => {
    if (date !== null) {
      setSelectedDate(date);
      onChange(date);
    }
  };

  const startDate: Date = addYears(new Date(), extraFutureYears);

  return (
    <div className="w-full flex justify-center dark:bg-slate-500">
      <DatePicker
        customInput={
          <StyledInput
            value={inputValue}
            onClick={() => {}}
            className={className}
          />
        }
        placeholderText={placeholder}
        renderCustomHeader={({
          monthDate,
          customHeaderCount,
          decreaseMonth,
          increaseMonth,
          date,
          changeYear,
        }) => (
          <div className="flex items-center justify-center p-1 dark:bg-slate-500">
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
            <div className="flex flex-col">
              <span className="react-datepicker__current-month px-4">
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
                  className="react-datepicker__year-select flex h-9 w-full items-center justify-between whitespace-nowrap bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus:outline-none dark:bg-slate-500"
                >
                  {Array.from({ length: 100 }, (_, i) => (
                    <option key={i} value={startDate.getFullYear() - i}>
                      {startDate.getFullYear() - i}
                    </option>
                  ))}
                </select>
              </span>
            </div>
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
        selected={selectedDate}
        disabled={isDisabled}
        minDate={minDate ? minDate : null}
        maxDate={maxDate ? maxDate : null}
        onChange={handleDateChange}
        monthsShown={monthsShown}
        calendarClassName="p-5 text-md font-extralight leading-[40px] text-muted-foreground border-none shadow shadow-md dark:bg-slate-500"
        wrapperClassName="w-full"
      />
    </div>
  );
}

const StyledInput: React.FC<StyledInputProps> = ({
  value,
  onClick,
  className,
}) => (
  <Input
    className={cn(
      "text-md text-center text-muted-foreground w-full py-6 dark:text-white",
      className
    )}
    value={value}
    onClick={onClick}
    readOnly
  />
);

export default SingleDatePicker;
