import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { useDispatch, useSelector } from 'react-redux';
import * as z from 'zod';
import { useCheckInEditPassengersModal } from '../../hooks/use-check-in-edit-passenger-modal';

import { Button } from '../ui/button';
import {
    Form, FormControl, FormField, FormItem, FormLabel, FormMessage
} from '../ui/form';
import { Input } from '../ui/input';
import { Modal } from '../ui/modal';
import {
    Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue
} from '../ui/select';
import { updatePassengers } from '../../store/booking/booking-extra';

// Form schema using Zod for validation
const formSchema = z.object({
    id: z.string(),
    email: z.string().email('Invalid email format').min(1, 'Email is required'),
    passengers: z.array(
        z.object({
            title: z.string().min(1, 'Title is required'),
            firstName: z.string().min(1, 'First name is required'),
            lastName: z.string().min(1, 'Last name is required'),
        })
    ).optional(),
    docNo: z.string(),
    expirationDate: z.string().refine((value) => !isNaN(Date.parse(value)), {
        message: 'Invalid date',
    }),
    issuingCountry: z.string(),
    nationality: z.string(),
});

export const CheckInEditPassengersInfoModal = () => {
    const editPassengersModal = useCheckInEditPassengersModal();
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
            docNo: '',
            expirationDate: '',
            issuingCountry: '',
            nationality: '',
        },
    });

    // Update form when modal values or bookings change
    useEffect(() => {
        const { id } = editPassengersModal.defaultValues;
        const booking = bookings.find((b: any) => b._id === id);
        setPassengerCount(booking?.passengers.length);

        form.reset({
            id,
            passengers: booking?.passengers || [],
            email: booking?.additionalInfo.email || '',
            docNo: booking?.additionalInfo.docNo || '',
            expirationDate: booking?.additionalInfo.expirationDate || '',
            issuingCountry: booking?.additionalInfo.issuingCountry || '',
            nationality: booking?.additionalInfo.nationality || '',
        });
    }, [editPassengersModal.defaultValues, bookings]);

    // Handle form submission
    const onSubmit = async (values: z.infer<typeof formSchema>) => {
        try {
            setLoading(true);

            // Convert expirationDate string to Date object before dispatching
            const updatedValues = {
                ...values,
                expirationDate: new Date(values.expirationDate),
            };

            dispatch(updatePassengers(updatedValues) as any);
            form.reset();
            editPassengersModal.onClose();
            toast.success('Passengers updated successfully!');
        } catch (error: any) {
            const errorMsg =
                error.message === 'Invalid Token' ? 'Invalid OTP' :
                    error.message === 'The token has expired.' ? 'OTP Expired' :
                        error.message;
            toast.error(errorMsg);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal
            title="Update Passengers"
            description="Update passengers' information for this booking"
            isOpen={editPassengersModal.isOpen}
            onClose={editPassengersModal.onClose}
            className="z-[101] w-full sm:w-[80%] h-full sm:h-[600px] mt-5 overflow-auto"
        >
            <div className="space-y-4 py-2 pb-4 w-full">
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)}>
                        {/* Passengers Section */}
                        <h1 className="py-2">Passengers</h1>
                        <div className="flex flex-col md:grid md:gap-4 md:grid-cols-3">
                            {[...Array(passengerCount)].map((_, index) => (
                                <div key={index}>
                                    <FormField
                                        name={`passengers.${index}.title`}
                                        control={form.control}
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Title:</FormLabel>
                                                <Select
                                                    disabled={loading}
                                                    onValueChange={field.onChange}
                                                    value={field.value || ''}
                                                >
                                                    <FormControl>
                                                        <SelectTrigger className="py-6">
                                                            <SelectValue placeholder="Select a title" />
                                                        </SelectTrigger>
                                                    </FormControl>
                                                    <SelectContent className="w-40">
                                                        <SelectGroup>
                                                            <SelectItem value="Mr">Mr.</SelectItem>
                                                            <SelectItem value="Mrs">Ms.</SelectItem>
                                                        </SelectGroup>
                                                    </SelectContent>
                                                </Select>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    {/* First Name */}
                                    <FormField
                                        control={form.control}
                                        name={`passengers.${index}.firstName`}
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>First Name:</FormLabel>
                                                <FormControl>
                                                    <Input type="text" {...field} disabled={loading} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    {/* Last Name */}
                                    <FormField
                                        control={form.control}
                                        name={`passengers.${index}.lastName`}
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Last Name:</FormLabel>
                                                <FormControl>
                                                    <Input type="text" {...field} disabled={loading} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </div>
                            ))}
                        </div>

                        {/* User Section */}
                        <h1 className="pt-4 pb-2">User</h1>
                        <FormField
                            control={form.control}
                            name="email"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Email:</FormLabel>
                                    <FormControl>
                                        <Input type="text" {...field} disabled={loading} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="expirationDate"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Expiration Date:</FormLabel>
                                    <FormControl>
                                        <Input type="date" {...field} disabled={loading} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="docNo"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Document Number:</FormLabel>
                                    <FormControl>
                                        <Input type="text" {...field} disabled={loading} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="issuingCountry"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Issuing Country:</FormLabel>
                                    <FormControl>
                                        <Input type="text" {...field} disabled={loading} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="nationality"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Nationality:</FormLabel>
                                    <FormControl>
                                        <Input type="text" {...field} disabled={loading} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        {/* Buttons */}
                        <div className="pt-6 space-x-2 flex items-center justify-center w-full">
                            <Button variant="outline" type="button" onClick={editPassengersModal.onClose}>
                                Cancel
                            </Button>
                            <Button type="submit" disabled={loading} className="bg-cyan-500 hover:bg-cyan-500">
                                Update
                            </Button>
                        </div>
                    </form>
                </Form>
            </div>
        </Modal>
    );
};
