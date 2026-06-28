import React, { useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "./popover";
import { Button } from "./button";
import { Check, ChevronsUpDown } from "lucide-react";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "./command";

const SearchableSelect: React.FC<{
  options: string[];
  placeholder: string;
  colSpan?: number;
  padding?: string;
  onChange: (selectedOption: string) => void;
  setValue: React.Dispatch<React.SetStateAction<string>>;
  setSelectedOption: React.Dispatch<React.SetStateAction<string | null>>;
  selectedOption: string | null;
  value: string;
}> = ({
  options,
  placeholder,
  colSpan = 1,
  padding = "py-3",
  onChange,
  setValue,
  setSelectedOption,
  selectedOption,
  value,
}) => {
  const [open, setOpen] = useState(false);

  const handleSelectOption = (option: string) => {
    setSelectedOption(option);
    setOpen(false);
    onChange(option);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild className={`font-normal col-span-${colSpan}`}>
        <Button
          variant="outline"
          className={`flex w-full justify-between ${padding}`}
          onClick={() => setOpen(!open)}
        >
          {selectedOption ? selectedOption : placeholder}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className={`flex flex-grow justify-start items-start max-h-[300px] overflow-y-scroll`}>
        <Command>
          <CommandInput
            placeholder="Search..."
            className="sticky bg-white z-[1000]"  
            // value={value}
            // onChange={(e) => setValue(e.target.value)}
          />
          <CommandEmpty>Not found.</CommandEmpty>
          <CommandGroup>
            {options
              .filter((option) =>
                option.toLowerCase().includes(value.toLowerCase())
              )
              .map((option) => (
                <CommandItem
                  key={option}
                  value={option}
                  onSelect={() => {
                    handleSelectOption(option);
                  }}
                  className={"py-3"}
                >
                  <Check
                    className={
                      selectedOption === option
                        ? "mr-2 h-4 w-4 opacity-100"
                        : "mr-2 h-4 w-4 opacity-0"
                    }
                  />
                  {option}
                </CommandItem>
              ))}
          </CommandGroup>
        </Command>
      </PopoverContent>
    </Popover>
  );
};

export default SearchableSelect;
