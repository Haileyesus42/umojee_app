import { zodResolver } from "@hookform/resolvers/zod";
import { Plane } from "lucide-react";
import React, { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import toast from "react-hot-toast";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import * as z from "zod";
import SingleDatePicker from "../../common/DatePicker";
import DateRangePicker from "../../common/DateRangePicker";
import { Button } from "../../common/ui/button";
import { arrivalCities, departureCities } from "../../common/ui/data/data";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "../../common/ui/form";
import SearchableSelect from "../../common/ui/SearchableSelect";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../common/ui/select";
import PassengerSelectPopover from "../../components/PassengerSelectPopover";
import { getLocalStorageValue } from "../../lib/utils";
import {
  searchFlight,
  searchReturnFlight,
  setSearchFlightData,
} from "../../store/flight/flightSlice";

const formSchema = z
  .object({
    tripType: z.string().min(1, "Passenger name is requred"),
    bookingType: z.string().min(1, "Flight number is requred"),
    departure: z.string().min(1, "Departure city is requred"),
    arrival: z.string().min(1, "Arrival city is requred"),
    departureDate: z.string().min(1, "Departure date is requred"),
    returnDate: z.string(),
    passengers: z.object({
      adult: z.number(),
      child: z.number(),
      infant: z.number(),
    }),
  })
  .refine((data) => data.departure !== data.arrival, {
    message: "Please select different cities",
    path: ["arrival"],
  });

const departureCitiesList = departureCities.map((city) => city.city);
const arrivalCitiesList = arrivalCities.map((city) => city.city);

const BookingPage = () => {
  const [tripType, setTripType] = useState("one-way");
  const [, setBookingType] = useState("economy");
  const [loading, setLoading] = useState(false);
  const [adults, setAdults] = useState(1);
  const [children, setChildren] = useState(0);
  const [infants, setInfants] = useState(0);
  const [selectedDeparture, setSelectedDeparture] = useState<string | null>(
    null
  );
  const [departureValue, setDepartureValue] = useState("");
  const [selectedArrival, setSelectedArrival] = useState<string | null>(null);
  const [arrivalValue, setArrivalValue] = useState("");
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [inputValue, setInputValue] = useState("");
  const [endDate, setEndDate] = useState(new Date());

  const dispatch = useDispatch();
  const navigate = useNavigate();

  const flights = useSelector((state: any) => state.flight.flightsList);
  const searchData = getLocalStorageValue("searchFlightData");

  useEffect(() => {
    if (searchData) {
      setSelectedArrival(searchData.arrival);
      setSelectedDeparture(searchData.departure);
    }
  }, [searchData]);

  useEffect(() => {
    if (searchData) setTripType(searchData.tripType);
  }, []);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      tripType: searchData ? searchData.tripType : "one-way",
      bookingType: searchData ? searchData.bookingType : "economy",
      departure: searchData ? searchData.departure : "",
      arrival: searchData ? searchData.arrival : "",
      departureDate: searchData
        ? searchData.departureDate
        : selectedDate.toISOString(),
      returnDate: "",
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
      if (flights.length > 0) {
        const filteredFlight = flights.filter(
          (flight: any) =>
            flight.departureAirport === values.departure &&
            flight.arrivalAirport === values.arrival
        );

        const filteredReturnFlight = flights.filter(
          (flight: any) =>
            flight.arrivalAirport === values.departure &&
            flight.departureAirport === values.arrival
        );
        dispatch(setSearchFlightData(values) as any);
        dispatch(searchFlight(filteredFlight));
        dispatch(searchReturnFlight(filteredReturnFlight));
      }

      navigate("/flights");
    } catch (error: any) {
      if (error.message === "Invalid flight") {
        toast.error("Invalid Flight");
      } else if (error.message === "The flight has expired.") {
        toast.error("OTP Expired");
      } else toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex flex-col py-0">
      <div className="flex flex-col items-center lg:absolute -translate-y-1/4 lg:-translate-y-1/2 w-full py-3 sm:py-0 sm:px-5">
        <div className="relative w-full max-w-5xl bg-white shadow-[0px_8px_18px_rgba(0,0,0,0.2)] p-4 sm:py-6 dark:bg-slate-500 rounded-xl md:rounded-tl-none">
          {/* Top Component Title */}
          <div className="absolute top-0 -translate-y-full left-1/2 md:left-0 -translate-x-1/2 md:translate-x-0 flex bg-white text-waikawa-gray-700 w-fit px-4 pt-3 pb-1 font-bold dark:bg-slate-500  rounded-t-xl">
            <Plane className="h-5 w-5 mr-2 text-emerald-600" />
            Book a flight
          </div>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)}>
              <div className="grid grid-cols-1 sm:grid-cols-3 md:grid-cols-3 gap-x-4 gap-y-6  ">
                <FormField
                  name="tripType"
                  control={form.control}
                  render={({ field }) => (
                    <FormItem className="col-span-1">
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
                    <FormItem className="col-span-1">
                      <FormControl>
                        <SearchableSelect
                          options={departureCitiesList}
                          placeholder="Departing from"
                          colSpan={1}
                          padding="py-6"
                          onChange={(selectedOption: string) =>
                            form.setValue("departure", selectedOption)
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
                    <FormItem className="col-span-1">
                      <FormControl>
                        <SearchableSelect
                          options={arrivalCitiesList}
                          placeholder="Arriving at"
                          colSpan={2}
                          padding="py-6"
                          onChange={(selectedOption: string) =>
                            form.setValue("arrival", selectedOption)
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
                            {/* <SelectItem
                              className="py-3"
                              value="premium-economy"
                            >
                              Premium Economy
                            </SelectItem>
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
                {tripType === "round-trip" && (
                  <FormField
                    name="departureDate"
                    control={form.control}
                    render={({ field }) => (
                      <FormItem className="col-span-1">
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
                                "departureDate",
                                date.toLocaleDateString()
                              )
                            }
                            onReturnChange={(date: Date) =>
                              form.setValue(
                                "returnDate",
                                date.toLocaleDateString()
                              )
                            }
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                {tripType === "one-way" && (
                  <FormField
                    name="departureDate"
                    control={form.control}
                    render={({ field }) => (
                      <FormItem className="col-span-1">
                        <FormControl>
                          <SingleDatePicker
                            placeholder="Select departure date"
                            setInputValue={setInputValue}
                            setSelectedDate={setSelectedDate}
                            inputValue={inputValue}
                            selectedDate={selectedDate}
                            onChange={(date: Date) =>
                              form.setValue(
                                "departureDate",
                                date.toLocaleDateString()
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
                    <FormItem className="col-span-1">
                      <FormControl>
                        <PassengerSelectPopover
                          onSelectionChange={(
                            adults: number,
                            children: number,
                            infants: number
                          ) => {
                            form.setValue("passengers.adult", adults);
                            form.setValue("passengers.child", children);
                            form.setValue("passengers.infant", infants);
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
              <div className="pt-4 -mb-1 flex items-center justify-center md:justify-end w-full ">
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

export default BookingPage;
