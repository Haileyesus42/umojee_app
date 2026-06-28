import { zodResolver } from '@hookform/resolvers/zod';
import { CheckCircle2, ChevronDown, Mail, User } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import 'react-phone-input-2/lib/bootstrap.css';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import * as z from 'zod';
import { Button } from '../common/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '../common/ui/form';
import { Input } from '../common/ui/input';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../common/ui/select';
import { getLocalStorageValue, storeLocallyWithExpiry } from '../lib/utils';
import { setPassengersContact } from '../store/flight/flightSlice';
import PhoneInput from 'react-phone-input-2';

const formSchema = z.object({
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

const contactFormSchema = z.object({
  phone: z.string().min(1, 'Phone is required'),
  email: z.string().email('Invalid email format').min(1, 'Email is required'),
});

let passengerCount = 1;

const PassengerDetails = () => {
  const [loading, setLoading] = useState(false);
  const [hidePassenger, setHidePassenger] = useState(false);
  const [hideContact, setHideContact] = useState(false);
  const [passengerDetails, setPassengerDetails] = useState<
    { title: string; firstName: string; lastName: string }[]
  >([]);

  const [passengerSubmitted, setPassengerSubmitted] = useState<boolean>(false);
  const [contactSubmitted, setContactDetailsSubmitted] =
    useState<boolean>(false);

  const navigate = useNavigate();
  const dispatch = useDispatch();

  const selectedFlightRedux = useSelector(
    (state: any) => state.flight.selectedFlight,
  );
  const selectedFlight = getLocalStorageValue('selectedFlight')
    ? getLocalStorageValue('selectedFlight')
    : selectedFlightRedux;

  passengerCount = selectedFlight.totalPassengers;
  const searchFlightDataRedux = useSelector(
    (state: any) => state.flight.searchFlightData,
  );
  const searchFlightData = getLocalStorageValue('searchFlightData')
    ? getLocalStorageValue('searchFlightData')
    : searchFlightDataRedux;
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      passengers: [],
    },
  });

  const contactForm = useForm<z.infer<typeof contactFormSchema>>({
    resolver: zodResolver(contactFormSchema),
    defaultValues: {
      phone: '',
      email: '',
    },
  });

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      setLoading(true);

      const passengers = values.passengers?.map((passenger: any) => ({
        title: passenger.title,
        firstName: passenger.firstName,
        lastName: passenger.lastName,
      }));

      // dispatch(setPassengersData(passengers));
      storeLocallyWithExpiry('passengers', passengers);
      setPassengerDetails(passengers ? passengers : []);
      setHidePassenger(true);
      setPassengerSubmitted(true);
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

  const onSubmitContacts = async (
    values: z.infer<typeof contactFormSchema>,
  ) => {
    try {
      setLoading(true);
      const data = {
        email: values.email,
        phone: values.phone,
      };
      storeLocallyWithExpiry('passengerUser', data);
      dispatch(setPassengersContact(data));
      setHideContact(true);
      setContactDetailsSubmitted(true);
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
    <div className="sm:mx-5 sm:p-5">
      <div className="py-0 border mb-5 rounded-t-lg">
        <div
          className="w-full flex justify-between items-center bg-emerald-600 h-[55px] px-5  rounded-t-lg"
          onClick={() => setHidePassenger(false)}
        >
          <div className="flex space-x-3 items-center">
            <User className="w-5 h-5 text-white " />
            <h1 className="text-white font-bold text-lg">Passengers</h1>
          </div>
          {hidePassenger && (
            <div className={`text-white`}>
              <ChevronDown />
            </div>
          )}
        </div>
        <div className="mx-5 my-5 px-5 py-3">
          {!hidePassenger ? (
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)}>
                {[...Array(passengerCount)].map((_, index) => (
                  <div key={index}>
                    <div className="flex flex-col sm:flex-row sm:space-x-2 sm:items-center py-5">
                      <p className="font-bold">{`Passenger ${index + 1}:`}</p>
                      <span className="text-sm">Adult</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-6 ">
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
                    </div>
                  </div>
                ))}
                <div className="pt-6 space-x-2 flex items-center justify-end w-full ">
                  <Button
                    type="submit"
                    disabled={loading}
                    className="bg-picton-blue-500 hover:bg-picton-blue-500 dark:text-white"
                  >
                    Continue
                  </Button>
                </div>
              </form>
            </Form>
          ) : (
            <div>
              {passengerDetails.map((passenger, index) => (
                <div key={index}>
                  <div className="flex flex-col sm:flex-row sm:space-x-2 sm:items-center py-5">
                    <p className="font-bold">{`Passenger ${index + 1}:`}</p>
                    <span className="text-sm">{`${passenger.title} ${passenger.firstName} ${passenger.lastName}`}</span>
                    <CheckCircle2 className="text-white" fill="green" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="py-0 border mb-5 rounded-t-lg">
        <div
          className="w-full flex justify-between items-center bg-emerald-600 h-[55px] px-5  rounded-t-lg"
          onClick={() => setHideContact(false)}
        >
          <div className="flex space-x-3 items-center">
            <Mail className="w-5 h-5 text-white " />
            <h1 className="text-white font-bold text-lg">Contacts details</h1>
          </div>
          {hideContact && (
            <div className={`text-white`}>
              <ChevronDown />
            </div>
          )}
        </div>
        <div className="px-5 flex flex-col ">
          {!hideContact && (
            <div className="px-5 py-5">
              <p className="text-sm font-light">
                Please provide the contact details of the person who will
                receive the booking confirmation and trip details.
              </p>
              <Form {...contactForm}>
                <form onSubmit={contactForm.handleSubmit(onSubmitContacts)}>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-6 py-6">
                    <FormField
                      control={contactForm.control}
                      name={`phone`}
                      render={({ field }) => (
                        <FormItem className="hideIncrementor">
                          <FormLabel>Phone:</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
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
                      control={contactForm.control}
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

                  <div className="pt-6 space-x-2 flex items-center justify-end w-full ">
                    <Button
                      type="submit"
                      disabled={loading}
                      className="bg-picton-blue-500 hover:bg-picton-blue-500"
                    >
                      Continue
                    </Button>
                  </div>
                </form>
              </Form>
            </div>
          )}
        </div>
      </div>

      <div className="pt-6 space-x-2 flex items-center justify-end w-full ">
        {searchFlightData.tripType === 'one-way' ? (
          <Button
            type="submit"
            variant={'link'}
            disabled={loading || !passengerSubmitted}
            className="bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold hover:no-underline"
            onClick={() => navigate('/bookings/passenger/seat')}
          >
            Continue to seat selection
          </Button>
        ) : (
          <Button
            type="submit"
            variant={'link'}
            disabled={loading || !passengerSubmitted}
            className="bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold hover:no-underline"
            onClick={() => navigate('/bookings/passenger/seat')}
          >
            Continue to seat selection | Direct flight
          </Button>
        )}
      </div>
    </div>
  );
};

export default PassengerDetails;
