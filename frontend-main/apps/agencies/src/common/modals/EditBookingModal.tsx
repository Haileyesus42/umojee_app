'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import * as z from 'zod';
import DateTimePicker from '../../components/Forms/DatePicker/DateTimePicker';
import { useEditBookingModal } from '../../hooks/use-edit-booking-modal';
import { Button } from '../ui/button';
import { bookingStatuses } from '../data/data';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '../ui/form';
import { Input } from '../ui/input';
import { Modal } from '../ui/modal';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { useDispatch } from 'react-redux';
import { updateBookingData } from '../../store/booking/booking-extra';

const formSchema = z.object({
  id: z.string(),
  passengerName: z.string().min(1, 'Passenger name is requred'),
  flightNumber: z.string().min(1, 'Flight number is requred'),
  airline: z.string().min(1, 'Airline is requred'),
  seatNumber: z.string().min(1, 'Seat number is requred'),
  departureAirport: z.string().min(1, 'Departure airport is requred'),
  arrivalAirport: z.string().min(1, 'Arrival airport is requred'),
  departureTime: z.date().min(new Date(1), 'Departure time is requred'),
  arrivalTime: z.date().min(new Date(1), 'Arrival time is requred'),
  bookingStatus: z.string().min(1, 'Booking status is requred'),
});

// const url = process.env.NEXT_PUBLIC_FRONTEND_URL;

export const EditBookingModal = () => {
  const editBookingModal = useEditBookingModal();
  const [loading, setLoading] = useState(false);
  const [departureTime, setDepartureTime] = useState(new Date());
  const [arrivalTime, setArrivalTime] = useState(new Date());

  const navigate = useNavigate();
  const dispatch = useDispatch();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
  });

  useEffect(() => {
    form.reset({
      id: editBookingModal.defaultValues.id,
      flightNumber: editBookingModal.defaultValues.flightNumber,
      passengerName: editBookingModal.defaultValues.passengerName,
      airline: editBookingModal.defaultValues.airline,
      seatNumber: editBookingModal.defaultValues.seatNumber,
      departureAirport: editBookingModal.defaultValues.departureAirport,
      arrivalAirport: editBookingModal.defaultValues.arrivalAirport,
      bookingStatus: editBookingModal.defaultValues.bookingStatus,
      departureTime,
      arrivalTime,
    });
  }, [editBookingModal.defaultValues]);

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      setLoading(true);
      dispatch(updateBookingData(values) as any);
      form.reset();
      editBookingModal.onClose();
    } catch (error: any) {
      if (error.message === 'Invalid Token') {
        toast.error('Invalid OTP');
      } else if (error.message === 'The token has expired.') {
        toast.error('OTP Expired');
      } else toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <Modal
        title="Update Booking"
        description="Update Booking available at your stock"
        isOpen={editBookingModal.isOpen}
        onClose={editBookingModal.onClose}
        className="z-[101] w-full sm:w-[70%] h-full sm:h-[500px] mt-5 overflow-auto"
      >
        <div className="spaye-y-4 py-2 pb-4 w-full">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)}>
              <div className="flex flex-col md:grid md:gap-4 md:grid-cols-2">
                <FormField
                  name="passengerName"
                  control={form.control}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Passenger Name:</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
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
                  name="seatNumber"
                  control={form.control}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Seat Number:</FormLabel>
                      <FormControl>
                        <Input {...field} />
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
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
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
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
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
                          setSelectedDate={setDepartureTime}
                          minDate={new Date()}
                          selectedDate={departureTime}
                          onChange={(date: Date) =>
                            form.setValue('departureTime', date)
                          }
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  name="arrivalTime"
                  control={form.control}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Arrival Time:</FormLabel>
                      <FormControl>
                        <DateTimePicker
                          placeholder="Select arrival time"
                          setSelectedDate={setArrivalTime}
                          selectedDate={arrivalTime}
                          minDate={departureTime}
                          onChange={(date: Date) =>
                            form.setValue('arrivalTime', date)
                          }
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  name="bookingStatus"
                  control={form.control}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Booking Status:</FormLabel>
                      <Select
                        disabled={loading}
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
                          {bookingStatuses.map((status) => (
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
              </div>

              <div className="pt-6 space-x-2 flex items-center justify-center w-full">
                <Button
                  variant="outline"
                  type="button"
                  onClick={editBookingModal.onClose}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={loading}
                  className="bg-cyan-500 hover:bg-cyan-500"
                >
                  Update
                </Button>
              </div>
            </form>
          </Form>
        </div>
      </Modal>
    </div>
  );
};
