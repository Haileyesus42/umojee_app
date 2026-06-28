import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { Button } from '../../../common/ui/button';
import { Input } from '../../../common/ui/input';

interface StyledInputProps {
  value: string;
  onClick: () => void;
}

function DateTimePicker({
  placeholder,
  onChange,
  setSelectedDate,
  selectedDate,
  minDate,
  disabled,
}: {
  placeholder?: string;
  selectedDate: Date;
  minDate: Date;
  onChange: (date: Date) => void;
  setSelectedDate?: React.Dispatch<React.SetStateAction<Date>>;
  disabled?: boolean;
}) {
  const handleDateChange = (date: Date) => {
    if (date !== null) {
      setSelectedDate?.(date);
      onChange(date);
    }
  };

  return (
    <div className="w-full flex justify-center">
      <DatePicker
        disabled={disabled}
        customInput={
          <StyledInput value={selectedDate.toISOString()} onClick={() => {}} />
        }
        placeholderText={placeholder}
        renderCustomHeader={({
          monthDate,
          customHeaderCount,
          decreaseMonth,
          increaseMonth,
        }) => (
          <div className="flex items-center justify-center p-1 mr-1">
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
              className={`react-datepicker__navigation react-datepicker__navigation--next`}
              onClick={increaseMonth}
            >
              <span className="react-datepicker__navigation-icon react-datepicker__navigation-icon--next">
                {'>'}
              </span>
            </Button>
          </div>
        )}
        selected={selectedDate}
        minDate={minDate}
        onChange={handleDateChange}
        showTimeSelect
        dateFormat="yyyy-MM-dd HH:mm"
        timeFormat="HH:mm"
        timeIntervals={1}
        calendarClassName="p-5 text-md font-extralight leading-[40px] text-muted-foreground border-none shadow shadow-md"
        wrapperClassName="w-full"
      />
    </div>
  );
}

const StyledInput: React.FC<StyledInputProps> = ({ value, onClick }) => (
  <Input
    className="text-md text-muted-foreground w-full"
    value={value}
    onClick={onClick}
    readOnly
  />
);

export default DateTimePicker;
