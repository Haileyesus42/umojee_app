'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import * as z from 'zod';
import { useAddBookingModal } from '../../hooks/use-add-booking-modal';
import { Button } from '../ui/button';
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


const formSchema = z.object({
  id: z.number(),
  passengerName: z.string().min(1, 'Passenger name is requred'),
  flightNumber: z.string().min(1, 'Flight number is requred'),
  airline: z.string().min(1, 'Airline is requred'),
  seatNumber: z.string().min(1, 'Seat number is requred'),
  departureAirport: z.string().min(1, 'Departure airport is requred'),
  arrivalAirport: z.string().min(1, 'Arrival airport is requred'),
  departureTime: z.string().min(1, 'Departure time is requred'),
  arrivalTime: z.string().min(1, 'Arrival time is requred'),
  bookingStatus: z.string().min(1, 'Booking status is requred'),
  totalPeoples: z.number().min(1, 'Ticket price is requred'),
});

// const url = process.env.NEXT_PUBLIC_FRONTEND_URL;

export const AddBookingModal = () => {
  const addFBookingModal = useAddBookingModal();
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
  flightNumber: "",
  passengerName: "",
  airline: "",
  totalPeoples: 1,
  departureAirport: "",
  arrivalAirport: "",
  departureTime: "",
  arrivalTime: "",
  bookingStatus: "",
  seatNumber: "",
    },
  });

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      setLoading(true);
      // @ts-ignore
      // const response = await verifyOTP(username, values.otp);
      // if (response) {
      //   router.push(`${url}/auth/verifyuser/${values.otp}`);
      // }
      form.reset();
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
    <div>
      <Modal
        title="Register Booking"
        description="Register Booking available at your stock"
        isOpen={addFBookingModal.isOpen}
        onClose={addFBookingModal.onClose}
        className='z-[101] w-full sm:w-[70%] h-full sm:h-[500px] mt-5 overflow-auto'
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
                        <Input {...field} />
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
                        <Input {...field} />
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
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  name="totalPeoples"
                  control={form.control}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Passengers:</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="pt-6 space-x-2 flex items-center justify-center w-full">
                <Button
                  variant="outline"
                  type="button"
                  onClick={addFBookingModal.onClose}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={loading}
                  className="bg-cyan-500 hover:bg-cyan-500"
                >
                  Register
                </Button>
              </div>
            </form>
          </Form>
        </div>
      </Modal>
    </div>
  );
};
