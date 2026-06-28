import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import DateTimePicker from '../../../components/Forms/DatePicker/DateTimePicker';
import { createFlight, updateFlight } from '../../../store/flight/flight-extra';
import { Button } from '../../../common/ui/button';
import { flightStatuses } from '../../../common/data/data';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '../../../common/ui/form';
import { Input } from '../../../common/ui/input';
import { Modal } from '../../../common/ui/modal';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../../common/ui/select';
import { useAppDispatch, useAppSelector } from '../../../store';
import { updateShowFlightFormModal } from '../../../store/flight/flight-slice';
import { FlightFormSchema } from '../../../utils/schemas';
import { FlightFormModalSelector } from '../../../store/flight/selectors';
import { Loader } from '../../../common/ui/loader';
import { DEFAULT_FLIGHT_FORM } from '../../../assets/data';
import { convertToDate } from '../../../utils/support';
import moment from 'moment';
import { CITIES } from '../../../constants/general';

const FlightFormModal = () => {
  const dispatch = useAppDispatch();
  const [cities, setCities] = useState({ departure: CITIES, arrival: CITIES });
  const { isCreatingFlight, selectedFlight, isUpdatingFlight } = useAppSelector(
    FlightFormModalSelector,
  );

  const form = useForm<z.infer<typeof FlightFormSchema>>({
    resolver: zodResolver(FlightFormSchema),
    defaultValues: selectedFlight
      ? {
          id: selectedFlight._id,
          flightNumber: selectedFlight.flightNumber,
          airline: selectedFlight.airline,
          duration: selectedFlight.duration,
          TotalSeatsCapacity: selectedFlight.TotalSeatsCapacity,
          stoppageCount: selectedFlight.stoppageCount,
          departureAirport: selectedFlight.departureAirport,
          arrivalAirport: selectedFlight.arrivalAirport,
          departureAirportAcronym: selectedFlight.departureAirportAcronym,
          arrivalAirportAcronym: selectedFlight.arrivalAirportAcronym,
          departureTime: convertToDate(selectedFlight.departureTime),
          arrivalTime: convertToDate(selectedFlight.arrivalTime),
          flightStatus: selectedFlight.flightStatus,
          price: selectedFlight.price,
          gate: selectedFlight.gate,
          terminal: selectedFlight.terminal,
          runway: selectedFlight.runway,
        }
      : DEFAULT_FLIGHT_FORM,
  });

  const onSubmit = async (values: z.infer<typeof FlightFormSchema>) => {
    values.price.roundtrip = values.price.oneway * 2;
    values.TotalSeatsCapacity = 117;
    selectedFlight
      ? dispatch(updateFlight(values))
      : dispatch(createFlight(values));
    form.reset();
  };

  const shouldShowLoadingIndicator = isCreatingFlight || isUpdatingFlight;

  return (
    <Modal
      title="Register Flights"
      description="Register Flights available at your stock"
      isOpen={true}
      onClose={() =>
        !isCreatingFlight && dispatch(updateShowFlightFormModal(false))
      }
      className="w-full sm:w-[70%] h-full sm:h-fit sm:max-h-[75vh] overflow-y-auto z-[101]"
    >
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <div className="flex flex-col sm:grid sm:gap-4 sm:grid-cols-2 md:grid-cols-3">
            <FormField
              name="flightNumber"
              control={form.control}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Flight Number:</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              name="airline"
              control={form.control}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Airline:</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              name="TotalSeatsCapacity"
              control={form.control}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Total Seats:</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      {...field}
                      onChange={(e) => {
                        const value = parseInt(e.target.value, 10);
                        field.onChange(value);
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              name="stoppageCount"
              control={form.control}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Stoppage Count:</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      {...field}
                      onChange={(e) => {
                        const value = parseInt(e.target.value, 10);
                        field.onChange(value);
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              name="departureAirport"
              control={form.control}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Departure Airport:</FormLabel>
                  <Select
                    disabled={isCreatingFlight}
                    onValueChange={(value) => {
                      field.onChange(value);
                      const city = cities.arrival.filter(
                        (data) => data.city === value,
                      );
                      form.setValue('departureAirportAcronym', city[0].acronym);
                      setCities((prev) => ({
                        ...prev,
                        arrival: CITIES.filter((city) => city.city !== value),
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
                        <SelectItem key={city.acronym} value={city.city}>
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
              name="arrivalAirport"
              control={form.control}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Arrival Airport:</FormLabel>
                  <Select
                    disabled={shouldShowLoadingIndicator}
                    onValueChange={(value) => {
                      field.onChange(value);
                      const city = cities.arrival.filter(
                        (data) => data.city === value,
                      );
                      form.setValue('arrivalAirportAcronym', city[0].acronym);
                      setCities((prev) => ({
                        ...prev,
                        departure: CITIES.filter((city) => city.city !== value),
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
                        <SelectItem key={city.acronym} value={city.city}>
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
              name="departureTime"
              control={form.control}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Departure Time:</FormLabel>
                  <FormControl>
                    <DateTimePicker
                      placeholder="Select departure time"
                      minDate={new Date()}
                      selectedDate={field.value}
                      onChange={(date: Date) => {
                        form.setValue('departureTime', date);
                        form.setValue(
                          'arrivalTime',
                          moment(date.toISOString())
                            .add(form.getValues('duration'), 'minutes')
                            .toDate(),
                        );
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              name="duration"
              control={form.control}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Duration(Min):</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      type="number"
                      onChange={(e) => {
                        const value = parseInt(e.target.value, 10);
                        field.onChange(value);
                        form.setValue(
                          'arrivalTime',
                          moment(form.getValues('departureTime').toISOString())
                            .add(value, 'minutes')
                            .toDate(),
                        );
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              name="price.oneway"
              control={form.control}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Price:</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      {...field}
                      onChange={(e) => {
                        const value = parseInt(e.target.value, 10);
                        field.onChange(value);
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              name="price.currency"
              control={form.control}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Currency:</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              name="flightStatus"
              control={form.control}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Flight Status:</FormLabel>
                  <Select
                    disabled={shouldShowLoadingIndicator}
                    onValueChange={field.onChange}
                    value={field.value.toString()}
                    defaultValue={field.value.toString()}
                  >
                    <FormControl>
                      <SelectTrigger className="py-2">
                        <SelectValue placeholder="Select a status" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {flightStatuses.map((status) => (
                        <SelectItem key={status.value} value={status.value}>
                          {status.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              name="gate"
              control={form.control}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Gate:</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              name="terminal"
              control={form.control}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Terminal:</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              name="runway"
              control={form.control}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Runway:</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          <div className="flex items-center justify-center gap-6 py-10">
            <Button
              disabled={shouldShowLoadingIndicator}
              variant="outline"
              type="button"
              onClick={() => dispatch(updateShowFlightFormModal(false))}
            >
              Cancel
            </Button>
            {shouldShowLoadingIndicator ? (
              <Loader color="#000000" size={20} />
            ) : (
              <Button type="submit" className="bg-emerald-600 hover:bg-emerald-600">
                {selectedFlight ? 'Update' : 'Create'}
              </Button>
            )}
          </div>
        </form>
      </Form>
    </Modal>
  );
};

export default FlightFormModal;
