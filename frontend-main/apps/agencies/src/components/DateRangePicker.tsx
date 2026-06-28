import React, { useState, useEffect } from 'react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { Button } from '../common/ui/button';
import { Input } from '../common/ui/input';

interface StyledInputProps {
  value: string;
  onClick: () => void;
}

function DateRangePicker({
  placeholder,
  onDepartureChange,
  onReturnChange,
  setInputValue,
  setSelectedDate,
  setEndDate,
  inputValue,
  selectedDate,
  endDate,
  disabled,
  minDate,
}: {
  placeholder?: string;
  onDepartureChange?: (date: Date) => void;
  onReturnChange?: (date: Date) => void;
  selectedDate: Date;
  endDate: Date;
  inputValue?: string;
  setSelectedDate: React.Dispatch<React.SetStateAction<Date>>;
  setEndDate: React.Dispatch<React.SetStateAction<Date>>;
  setInputValue?: React.Dispatch<React.SetStateAction<string>>;
  disabled?: boolean;
  minDate?: Date;
}) {
  useEffect(() => {
    if (endDate != null) setInputValue?.(selectedDate.toLocaleDateString());
  }, [selectedDate]);

  const handleDateChange = (dates: [Date, Date]) => {
    if (dates !== null) {
      const [start, end] = dates;
      setSelectedDate?.(start);
      setEndDate?.(end);
      if (end != null) {
        onDepartureChange?.(start);
        onReturnChange?.(end);
      }
    }
  };

  return (
    <div className="w-full flex justify-center">
      <DatePicker
        disabled={disabled}
        customInput={
          <StyledInput value={inputValue ?? ''} onClick={() => {}} />
        }
        placeholderText={placeholder}
        renderCustomHeader={({
          monthDate,
          customHeaderCount,
          decreaseMonth,
          increaseMonth,
        }) => (
          <div className="flex items-center justify-center p-1">
            <Button
              variant={'ghost'}
              aria-label="Previous Month"
              className={`react-datepicker__navigation react-datepicker__navigation--previous ${
                customHeaderCount === 1 ? 'invisible' : 'visible'
              }`}
              onClick={decreaseMonth}
            >
              <span className="react-datepicker__navigation-icon react-datepicker__navigation-icon--previous">
                {'<'}
              </span>
            </Button>
            <span className="react-datepicker__current-month">
              {monthDate.toLocaleString('en-US', {
                month: 'long',
                year: 'numeric',
              })}
            </span>
            <Button
              variant={'ghost'}
              aria-label="Next Month"
              className={`react-datepicker__navigation react-datepicker__navigation--next ${
                customHeaderCount === 0 ? 'invisible' : 'visible'
              }`}
              onClick={increaseMonth}
            >
              <span className="react-datepicker__navigation-icon react-datepicker__navigation-icon--next">
                {'>'}
              </span>
            </Button>
          </div>
        )}
        minDate={minDate ?? new Date()}
        selected={selectedDate}
        startDate={selectedDate}
        endDate={endDate}
        selectsRange={true}
        onChange={handleDateChange}
        monthsShown={2}
        calendarClassName="p-5 text-md font-extralight leading-[40px] text-muted-foreground border-none shadow shadow-md"
        wrapperClassName="w-full"
      />
    </div>
  );
}

const StyledInput: React.FC<StyledInputProps> = ({ value, onClick }) => (
  <Input
    className="text-md text-center text-muted-foreground w-full py-6"
    value={value}
    onClick={onClick}
    readOnly
  />
);

export default DateRangePicker;
