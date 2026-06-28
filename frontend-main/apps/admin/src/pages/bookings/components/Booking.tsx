import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { arrivalCities, departureCities } from '../../../common/data/data';
import { Button } from '../../../common/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from '../../../common/ui/form';
import SearchableSelect from '../../../common/ui/SearchableSelect';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../../common/ui/select';
import SingleDatePicker from '../../../components/DatePicker';
import DateRangePicker from '../../../components/DateRangePicker';
import PassengerSelectPopover from '../../../components/PassengerSelectPopover';
import {
  getLocalStorageValue,
  storeLocallyWithExpiry,
} from '../../../lib/utils';
import { useAppDispatch, useAppSelector } from '../../../store';
import { getFlights } from '../../../store/flight/flight-extra';
import { setSearchFlightData } from '../../../store/flight/flightSlice';
import { flightPageSelector } from '../../../store/flight/selectors';

const formSchema = z
  .object({
    tripType: z.string().min(1, 'Passenger name is requred'),
    bookingType: z.string().min(1, 'Flight number is requred'),
    departure: z.string().min(1, 'Departure city is requred'),
    arrival: z.string().min(1, 'Arrival city is requred'),
    departureDate: z.string().min(1, 'Departure date is requred'),
    returnDate: z.string(),
    passengers: z.object({
      adult: z.number(),
      child: z.number(),
      infant: z.number(),
    }),
  })
  .refine((data) => data.departure != data.arrival, {
    message: 'Please select different cities',
    path: ['arrival'],
  });

const departureCitiesList = departureCities.map((city) => city.city);
const arrivalCitiesList = arrivalCities.map((city) => city.city);

const Booking = () => {
  const [tripType, setTripType] = useState('one-way');
  const [bookingType, setBookingType] = useState('economy');
  const [loading, setLoading] = useState(false);
  const [adults, setAdults] = useState(1);
  const [children, setChildren] = useState(0);
  const [infants, setInfants] = useState(0);
  const [selectedDeparture, setSelectedDeparture] = useState<string | null>(
    null,
  );
  const [departureValue, setDepartureValue] = useState('');
  const [selectedArrival, setSelectedArrival] = useState<string | null>(null);
  const [arrivalValue, setArrivalValue] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [inputValue, setInputValue] = useState('');
  const [endDate, setEndDate] = useState(new Date());

  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  useEffect(() => {
    dispatch(getFlights());
  }, []);
  const { flightList } = useAppSelector(flightPageSelector);
  // const flights = useSelector((state: any) => state.flight.flightsList);
  const searchData = getLocalStorageValue('searchFlightData');
  useEffect(() => {
    if (searchData) {
      setSelectedArrival(searchData.arrival);
      setSelectedDeparture(searchData.departure);
    }
  }, []);

  useEffect(() => {
    if (searchData) setTripType(searchData.tripType);
  }, []);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      tripType: searchData ? searchData.tripType : 'one-way',
      bookingType: searchData ? searchData.bookingType : 'economy',
      departure: searchData ? searchData.departure : '',
      arrival: searchData ? searchData.arrival : '',
      departureDate: searchData
        ? searchData.departureDate
        : selectedDate
        ? selectedDate.toLocaleString()
        : '',
      returnDate: '',
      passengers: {
        adult: 1,
        child: 0,
        infant: 0,
      },
    },
  });

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      setLoading(true);
      if (flightList.length > 0) {
        const filteredFlight = flightList.filter(
          (flight: any) =>
            flight.departureAirport === values.departure &&
            flight.arrivalAirport === values.arrival,
        );

        const filteredReturnFlight = flightList.filter(
          (flight: any) =>
            flight.arrivalAirport === values.departure &&
            flight.departureAirport === values.arrival,
        );
        dispatch(setSearchFlightData(values) as any);
        // dispatch(searchFlight(filteredFlight));
        storeLocallyWithExpiry('filteredFlightsList', filteredFlight);
        storeLocallyWithExpiry(
          'filteredReturnFlightsList',
          filteredReturnFlight,
        );
        storeLocallyWithExpiry('searchFlightData', values);
        // dispatch(searchReturnFlight(filteredReturnFlight));
      }

      navigate('/bookings/search/flight/departure');
    } catch (error: any) {
      if (error.message === 'Invalid flight') {
        toast.error('Invalid Flight');
      } else if (error.message === 'The flight has expired.') {
        toast.error('OTP Expired');
      } else toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex flex-col py-0 h-full">
      <div className="flex flex-col lg:absolute top-[85%] w-full py-3 sm:py-0">
        <div className="w-full bg-white shadow-md sm:px-10 py-5 dark:bg-slate-500">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)}>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-x-4 gap-y-6 ">
                <FormField
                  name="tripType"
                  control={form.control}
                  render={({ field }) => (
                    <FormItem>
                      <Select
                        disabled={loading}
                        onValueChange={(value) => {
                          field.onChange(value);
                          setTripType(value);
                        }}
                        value={field.value.toString()}
                        defaultValue={field.value.toString()}
                      >
                        <FormControl>
                          <SelectTrigger className="py-6">
                            <SelectValue placeholder="Select a trip" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="w-40">
                          <SelectGroup>
                            <SelectItem className="py-3" value="round-trip">
                              Round trip
                            </SelectItem>
                            <SelectItem className="py-3" value="one-way">
                              One way
                            </SelectItem>
                          </SelectGroup>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  name="departure"
                  control={form.control}
                  render={({ field }) => (
                    <FormItem className="col-span-2">
                      <FormControl>
                        <SearchableSelect
                          options={departureCitiesList}
                          placeholder="Departing from"
                          colSpan={1}
                          padding="py-6"
                          onChange={(selectedOption: string) =>
                            form.setValue('departure', selectedOption)
                          }
                          setValue={setDepartureValue}
                          setSelectedOption={setSelectedDeparture}
                          selectedOption={selectedDeparture}
                          value={departureValue}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  name="arrival"
                  control={form.control}
                  render={({ field }) => (
                    <FormItem className="col-span-2">
                      <FormControl>
                        <SearchableSelect
                          options={arrivalCitiesList}
                          placeholder="Arriving at"
                          colSpan={2}
                          padding="py-6"
                          onChange={(selectedOption: string) =>
                            form.setValue('arrival', selectedOption)
                          }
                          setValue={setArrivalValue}
                          setSelectedOption={setSelectedArrival}
                          selectedOption={selectedArrival}
                          value={arrivalValue}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  name="bookingType"
                  control={form.control}
                  render={({ field }) => (
                    <FormItem className="col-span-1">
                      <Select
                        disabled={loading}
                        onValueChange={(value) => {
                          field.onChange(value);
                          setBookingType(value);
                        }}
                        value={field.value.toString()}
                        defaultValue={field.value.toString()}
                      >
                        <FormControl>
                          <SelectTrigger className="py-6">
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="w-full">
                          <SelectGroup>
                            <SelectItem className="py-3" value="economy">
                              Economy
                            </SelectItem>
                            {/* 
                        <SelectItem className="py-3" value="business">
                          Business
                        </SelectItem> */}
                          </SelectGroup>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                {tripType === 'round-trip' && (
                  <FormField
                    name="departureDate"
                    control={form.control}
                    render={({ field }) => (
                      <FormItem className="col-span-2">
                        <FormControl>
                          <DateRangePicker
                            placeholder="Select dates"
                            setInputValue={setInputValue}
                            setSelectedDate={setSelectedDate}
                            setEndDate={setEndDate}
                            inputValue={inputValue}
                            selectedDate={selectedDate}
                            endDate={endDate}
                            onDepartureChange={(date: Date) =>
                              form.setValue(
                                'departureDate',
                                date.toLocaleDateString(),
                              )
                            }
                            onReturnChange={(date: Date) =>
                              form.setValue(
                                'returnDate',
                                date.toLocaleDateString(),
                              )
                            }
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                {tripType === 'one-way' && (
                  <FormField
                    name="departureDate"
                    control={form.control}
                    render={({ field }) => (
                      <FormItem className="col-span-2">
                        <FormControl>
                          <SingleDatePicker
                            placeholder="Select departure date"
                            setInputValue={setInputValue}
                            setSelectedDate={setSelectedDate}
                            inputValue={inputValue}
                            selectedDate={selectedDate}
                            onChange={(date: Date) =>
                              form.setValue(
                                'departureDate',
                                date.toLocaleDateString(),
                              )
                            }
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                <FormField
                  name="passengers"
                  control={form.control}
                  render={({ field }) => (
                    <FormItem className="col-span-2">
                      <FormControl>
                        <PassengerSelectPopover
                          onSelectionChange={(
                            adults: number,
                            children: number,
                            infants: number,
                          ) => {
                            form.setValue('passengers.adult', adults);
                            form.setValue('passengers.child', children);
                            form.setValue('passengers.infant', infants);
                          }}
                          adults={adults}
                          children={children}
                          infants={infants}
                          setAdults={setAdults}
                          setChildren={setChildren}
                          setInfants={setInfants}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="pt-6 space-x-2 flex items-center justify-end w-full ">
                <Button
                  type="submit"
                  disabled={loading}
                  className="bg-emerald-600 hover:bg-emerald-700"
                >
                  Search flights
                </Button>
              </div>
            </form>
          </Form>
        </div>
      </div>
    </div>
  );
};

export default Booking;
