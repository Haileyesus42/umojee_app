import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { useDispatch, useSelector } from 'react-redux';
import * as z from 'zod';
import { useEditPassengersModal } from '../../hooks/use-edit-passengers-modal';

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
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { updatePassengers } from '../../store/booking/booking-extra';

const formSchema = z.object({
  id: z.string(),
  email: z.string().email('Invalid email format').min(1, 'Email is required'),
  passengers: z
    .array(
      z.object({
        title: z.string().min(1, 'Title is required'),
        firstName: z.string().min(1, 'First name is required'),
        lastName: z.string().min(1, 'Last name is required'),
      }),
    )
    .optional(),
});

export const EditPassengersModal = () => {
  const editPassengersModal = useEditPassengersModal();
  const [loading, setLoading] = useState(false);
  const [passengerCount, setPassengerCount] = useState(1);

  const dispatch = useDispatch();

  const bookings = useSelector((state: any) => state.booking.bookingsList);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      id: '-1',
      email: '',
      passengers: [],
    },
  });

  useEffect(() => {
    const id = editPassengersModal.defaultValues.id;
    const booking = bookings.find((booking: any) => booking._id === id);
    setPassengerCount(booking?.passengers.length);

    form.reset({
      id,
      passengers: booking?.passengers,
      email: booking?.additionalInfo.email,
    });
  }, [editPassengersModal.defaultValues]);

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      setLoading(true);
      dispatch(updatePassengers(values) as any);
      form.reset();
      editPassengersModal.onClose();
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
        title="Update Passengers"
        description="Update passengers information for this booking"
        isOpen={editPassengersModal.isOpen}
        onClose={editPassengersModal.onClose}
        className="z-[101] w-full sm:w-[80%] h-full sm:h-[600px] mt-5 overflow-auto"
      >
        <div className="spaye-y-4 py-2 pb-4 w-full">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)}>
              <div className="py-2">
                <h1>Passengers</h1>
              </div>
              <div className="flex flex-col md:grid md:gap-4 md:grid-cols-3">
                {[...Array(passengerCount)].map((_, index) => (
                  <>
                    <FormField
                      name={`passengers.${index}.title`}
                      control={form.control}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Title:</FormLabel>
                          <Select
                            disabled={loading}
                            onValueChange={(value) => {
                              field.onChange(value);
                            }}
                            value={field.value ? field.value.toString() : ''}
                            defaultValue={
                              field.value ? field.value.toString() : ''
                            }
                          >
                            <FormControl>
                              <SelectTrigger className="py-6">
                                <SelectValue placeholder="Select a title" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent className="w-40">
                              <SelectGroup>
                                <SelectItem className="py-3" value="Mr">
                                  Mr.
                                </SelectItem>
                                <SelectItem className="py-3" value="Mrs">
                                  Ms.
                                </SelectItem>
                              </SelectGroup>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name={`passengers.${index}.firstName`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>First Name:</FormLabel>
                          <FormControl>
                            <Input
                              type="text"
                              className="ring-1 py-6"
                              {...field}
                              disabled={loading}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name={`passengers.${index}.lastName`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Last Name:</FormLabel>
                          <FormControl>
                            <Input
                              type="text"
                              className="ring-1 py-6"
                              {...field}
                              disabled={loading}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </>
                ))}
                <div className="pt-4 pb-2">
                  <h1>User</h1>

                  <FormField
                    control={form.control}
                    name={`email`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email:</FormLabel>
                        <FormControl>
                          <Input
                            type="text"
                            className="ring-1 py-6"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              <div className="pt-6 space-x-2 flex items-center justify-center w-full">
                <Button
                  variant="outline"
                  type="button"
                  onClick={editPassengersModal.onClose}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={loading}
                  className="bg-emerald-500 hover:bg-emerald-500"
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
