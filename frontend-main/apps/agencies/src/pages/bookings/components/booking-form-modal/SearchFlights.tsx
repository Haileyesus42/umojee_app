import * as z from 'zod';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '../../../../common/ui/form';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../../../common/ui/select';
import { Button } from '../../../../common/ui/button';
import moment from 'moment';
import { CITIES } from '../../../../constants/general';
import { useState } from 'react';
import { useAppDispatch, useAppSelector } from '../../../../store';
import { searchFlightsSelector } from '../../../../store/booking/selectors';
import { CircleDotDashedIcon } from 'lucide-react';
import { searchDirectFlights } from '../../../../store/flight/flight-extra';
import { SearchFlightsSchema } from '../../../../utils/schemas';
import DateRangePicker from '../../../../components/DateRangePicker';

const SearchFlights = () => {
  const dispatch = useAppDispatch();
  const [cities, setCities] = useState({ departure: CITIES, arrival: CITIES });
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date());
  const isSearchingDirectFlights = useAppSelector(searchFlightsSelector);
  const form = useForm<z.infer<typeof SearchFlightsSchema>>({
    resolver: zodResolver(SearchFlightsSchema),
    defaultValues: {
      date: { start: new Date().toISOString(), end: new Date().toISOString() },
      departureCity: '',
      arrivalCity: '',
    },
  });

  const shouldAllowSearch =
    !form.getValues('date') || !isSearchingDirectFlights;

  const onSubmit = async (values: z.infer<typeof SearchFlightsSchema>) => {
    const { arrivalCity, departureCity } = values;
    startDate &&
      endDate &&
      dispatch(
        searchDirectFlights({
          date: {
            start: moment(startDate).toISOString(),
            end: moment(endDate).toISOString(),
          },
          departureCity: departureCity,
          arrivalCity,
        }),
      );
  };

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="flex flex-col gap-2 w-full rounded-md border border-input bg-transparent text-sm shadow-sm transition-colors p-5"
      >
        <div className="grid grid-cols-3 gap-20">
          <FormField
            name="date"
            control={form.control}
            render={({ field }) => (
              <FormItem className="flex flex-col gap-1">
                <FormLabel className="min-w-max ">Select Dates:</FormLabel>
                <FormControl className="bg-slate-500">
                  <DateRangePicker
                    disabled={isSearchingDirectFlights}
                    placeholder="Select date"
                    selectedDate={startDate}
                    endDate={endDate}
                    setSelectedDate={setStartDate}
                    setEndDate={setEndDate}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            name="departureCity"
            control={form.control}
            render={({ field }) => (
              <FormItem>
                <FormLabel>Departure City:</FormLabel>
                <Select
                  disabled={isSearchingDirectFlights}
                  onValueChange={(value) => {
                    field.onChange(value);
                    setCities((prev) => ({
                      ...prev,
                      arrival: CITIES.filter((city) => city.acronym !== value),
                    }));
                  }}
                  value={field.value.toString()}
                  defaultValue={field.value.toString()}
                >
                  <FormControl>
                    <SelectTrigger className="py-2">
                      <SelectValue placeholder="Select a city" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {cities.departure.map((city) => (
                      <SelectItem key={city.acronym} value={city.acronym}>
                        {city.city}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            name="arrivalCity"
            control={form.control}
            render={({ field }) => (
              <FormItem>
                <FormLabel>Arrival City:</FormLabel>
                <Select
                  disabled={isSearchingDirectFlights}
                  onValueChange={(value) => {
                    field.onChange(value);
                    setCities((prev) => ({
                      ...prev,
                      departure: CITIES.filter(
                        (city) => city.acronym !== value,
                      ),
                    }));
                  }}
                  value={field.value.toString()}
                  defaultValue={field.value.toString()}
                >
                  <FormControl>
                    <SelectTrigger className="py-2">
                      <SelectValue placeholder="Select a city" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {cities.arrival.map((city) => (
                      <SelectItem key={city.acronym} value={city.acronym}>
                        {city.city}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <Button disabled={!shouldAllowSearch} className="w-fit self-end">
          {isSearchingDirectFlights ? (
            <CircleDotDashedIcon className="animate-spin" />
          ) : (
            `Search Flights`
          )}
        </Button>
      </form>
    </Form>
  );
};

export default SearchFlights;
