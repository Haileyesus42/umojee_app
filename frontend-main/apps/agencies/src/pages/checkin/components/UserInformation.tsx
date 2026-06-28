import { useEffect, useState } from 'react';
import { Card } from '../../../common/ui/card';
import * as z from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '../../../common/ui/button';
import { useSelector } from 'react-redux';

const formSchema = z.object({
  docNo: z.string().min(1, 'Document number is required'),
  expirationDate: z
    .string()
    .min(1, 'Expiration date is required')
    .refine(
      (date) => {
        const currentDate = new Date();
        const enteredDate = new Date(date);
        return enteredDate > currentDate; // Ensures expiration date is in the future
      },
      {
        message: 'Expiration date must be in the future', // Error message
      },
    ),
  country: z.string().min(1, 'Country is required'),
  nationality: z.string().min(1, 'Nationality is required'),
  email: z.string().min(1, 'Nationality is required'),
});

const UserInformation = ({
  bookingId,
  handleSubmit,
  user,
}: {
  bookingId: string;
  handleSubmit: (data: any) => void;
  user: {
    firstName: string;
    lastName: string;
    title: string;
  };
}) => {
  const bookings = useSelector((state: any) => state.booking.bookingsList);
  const [bookingData, setBookingData] = useState<any>(null);
  const [isFormVisible, setIsFormVisible] = useState(false); // Track form visibility
  const [formData, setFormData] = useState<any>(null); // Store submitted form data

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      docNo: bookingData?.additionalInfo.docNo || '',
      expirationDate: bookingData?.additionalInfo.expirationDate || '',
      country: bookingData?.additionalInfo.issuingCountry || '',
      nationality: bookingData?.additionalInfo.nationality || '',
      email: bookingData?.additionalInfo.email || '',
    },
  });
  const { setValue } = form;

  useEffect(() => {
    const booking = bookings.find((booking: any) => booking._id === bookingId);
    if (booking) {
      setBookingData(booking);

      // const data = {
      //   email: booking?.additionalInfo.email,
      //   docNo: booking?.additionalInfo.docNo,
      //   expirationDate: booking?.additionalInfo.expirationDate,
      //   nationality: booking?.additionalInfo.nationality,
      //   country: booking?.additionalInfo.issuingCountry,
      // };
      // setFormData(data);

      setValue('docNo', booking?.additionalInfo.docNo || '');
      setValue('expirationDate', booking?.additionalInfo.expirationDate || '');
      setValue('country', booking?.additionalInfo.issuingCountry || '');
      setValue('nationality', booking?.additionalInfo.nationality || '');
      setValue('email', booking?.additionalInfo.email || '');
    }
  }, [bookings, bookingId, setValue]);

  const handleAddModifyClick = () => {
    setIsFormVisible(true); // Show the form on button click
  };

  const handleFormSubmit = (data: any) => {
    setFormData(data); // Save form data
    setIsFormVisible(false); // Hide form after submission
    handleSubmit(data);
  };

  const handleEditClick = () => {
    setIsFormVisible(true); // Show the form again for editing
  };

  return (
    <Card className="flex flex-col space-y-5 h-full px-5 py-5">
      <div className="flex flex-col items-center justify-center gap-4 p-2 bg-white shadow-lg rounded-md">
        <div className="flex flex-col justify-center items-center gap-4">
          <h1 className="text-[#03003e] text-2xl font-extrabold tracking-tight">
            User Information
          </h1>
          <div className="border-2 border-gray-300 rounded-full overflow-hidden shadow-md">
            <img
              src="https://i.pinimg.com/originals/6b/aa/98/6baa98cc1c3f4d76e989701746e322dd.png"
              alt={`Profile picture of ${user.firstName} ${user.lastName}`}
              className="w-32 h-32 object-cover"
            />
          </div>
          <h2 className="text-[#03003e] text-lg font-semibold">{`${user.title} ${user.firstName} ${user.lastName}`}</h2>
          <h1 className="text-[#03003e] text-md font-semibold">
            {bookingData?.additionalInfo.email}
          </h1>
        </div>
      </div>

      <div className="flex flex-col space-y-5 mt-5">
        {isFormVisible ? (
          <form
            onSubmit={form.handleSubmit(handleFormSubmit)}
            className="flex flex-col space-y-4 p-4 border rounded-lg bg-gray-50"
          >
            <h3 className="text-lg font-semibold text-gray-700">
              Provide Travel Document Details
            </h3>
            <div>
              <label htmlFor="docNo" className="block text-sm font-medium">
                Document Number
              </label>
              <input
                type="text"
                id="docNo"
                {...form.register('docNo')}
                className="mt-1 block w-full p-2 border border-gray-300 rounded-md"
              />
            </div>

            <div>
              <label
                htmlFor="expirationDate"
                className="block text-sm font-medium"
              >
                Expiration Date
              </label>
              <input
                type="date"
                id="expirationDate"
                {...form.register('expirationDate')}
                className="mt-1 block w-full p-2 border border-gray-300 rounded-md"
              />
            </div>

            <div>
              <label htmlFor="country" className="block text-sm font-medium">
                Issuing Country
              </label>
              <input
                type="text"
                id="country"
                {...form.register('country')}
                className="mt-1 block w-full p-2 border border-gray-300 rounded-md"
              />
            </div>

            <div>
              <label
                htmlFor="nationality"
                className="block text-sm font-medium"
              >
                Nationality
              </label>
              <input
                type="text"
                id="nationality"
                {...form.register('nationality')}
                className="mt-1 block w-full p-2 border border-gray-300 rounded-md"
              />
            </div>
            <div>
              <label htmlFor="email" className="block text-sm font-medium">
                Email Address
              </label>
              <input
                type="email"
                id="email"
                {...form.register('email')}
                className="mt-1 block w-full p-2 border border-gray-300 rounded-md"
              />
            </div>

            <Button type="submit" className="bg-cyan-500 text-white mt-4">
              Submit
            </Button>
          </form>
        ) : formData ? (
          <div className="p-4 border rounded-lg bg-gray-50">
            <h3 className="text-lg font-semibold text-gray-700 mb-4">
              Travel Document Details
            </h3>
            <div className="space-y-2">
              <div>
                <h4 className="text-md font-semibold">Document Number</h4>
                <p className="text-gray-600">{formData.docNo}</p>
              </div>
              <div>
                <h4 className="text-md font-semibold">Expiration Date</h4>
                <p className="text-gray-600">{formData.expirationDate}</p>
              </div>
              <div>
                <h4 className="text-md font-semibold">Issuing Country</h4>
                <p className="text-gray-600">{formData.country}</p>
              </div>
              <div>
                <h4 className="text-md font-semibold">Nationality</h4>
                <p className="text-gray-600">{formData.nationality}</p>
              </div>
              <div>
                <h4 className="text-md font-semibold">Email Address</h4>
                <p className="text-gray-600">{formData.email}</p>
              </div>
            </div>
            <div className="mt-4">
              <Button
                variant={'ghost'}
                className="bg-cyan-500 text-white hover:text-white hover:bg-cyan-500"
                onClick={handleEditClick}
              >
                Add / Modify
              </Button>
            </div>
          </div>
        ) : (
          <Button
            variant={'ghost'}
            className="text-white hover:text-white bg-cyan-500 hover:bg-cyan-500"
            onClick={handleAddModifyClick}
          >
            Provide Travel Document Details
          </Button>
        )}
      </div>
    </Card>
  );
};

export default UserInformation;
