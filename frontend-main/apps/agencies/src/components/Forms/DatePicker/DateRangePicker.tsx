import React, { useState, useEffect } from 'react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { Button } from '../../../common/ui/button';
import { Input } from '../../../common/ui/input';

interface StyledInputProps {
  value: string;
  onClick: () => void;
}

function DateRangePicker() {
  const [startDate, setStartDate] = useState(new Date());
  const [inputValue, setInputValue] = useState('');

  useEffect(() => {
    setInputValue(startDate.toLocaleDateString());
  }, [startDate]);

  const handleDateChange = (date: Date) => {
    if (date !== null) {
      setStartDate(date);
    }
  };

  return (
    <div className='w-full flex justify-center'>
      <DatePicker
        customInput={<StyledInput value={inputValue} onClick={() => {}} />}
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
        selected={startDate}
        minDate={startDate}
        onChange={handleDateChange}
        monthsShown={2}
        calendarClassName="p-5 text-md font-extralight leading-[40px] text-muted-foreground border-none shadow shadow-md"
      />
    </div>
  );
}

const StyledInput: React.FC<StyledInputProps> = ({ value, onClick }) => (
  <Input
    className="text-md text-center text-muted-foreground w-full"
    value={value}
    onClick={onClick}
    readOnly
  />
);

export default DateRangePicker;
