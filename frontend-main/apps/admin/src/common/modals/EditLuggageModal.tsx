import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useDispatch, useSelector } from 'react-redux';
import * as z from 'zod';

import toast from 'react-hot-toast';
import { IMAGES } from '../../assets';
import { useEditLuggageModal } from '../../hooks/use-edit-luggage-modal';
import { cn } from '../../lib/utils';
import { updateLuggages } from '../../store/booking/booking-extra';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { Form } from '../ui/form';
import { Modal } from '../ui/modal';

const CircleButton: React.FC<{
  text: string;
  onClick: () => void;
  className?: string;
}> = ({ text, onClick, className }) => {
  return (
    <div
      className={cn(
        'relative flex justify-center items-center w-10 h-10 ring-1 ring-red-300 text-xl font-bold rounded-full hover:cursor-pointer',
        className,
      )}
      onClick={onClick}
    >
      <span className="absolute top-1">{text}</span>
    </div>
  );
};

const formSchema = z.object({
  id: z.string(),
  luggage: z.number().optional(),
});

export const EditLuggageModal = () => {
  const editLuggageModal = useEditLuggageModal();
  const [loading, setLoading] = useState(false);
  const [baggage, setBaggage] = useState(0);
  const [baggagePrice, setBaggagePrice] = useState(40);

  const dispatch = useDispatch();

  const bookings = useSelector((state: any) => state.booking.bookingsList);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      id: '-1',
      luggage: 0,
    },
  });

  useEffect(() => {
    const id = editLuggageModal.defaultValues.id;
    const booking = bookings.find((booking: any) => booking._id === id);

    form.reset({
      id,
      luggage: booking?.totalBaggages,
    });
    setBaggage(booking?.totalBaggages);
  }, [editLuggageModal.defaultValues]);

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      setLoading(true);
      values.luggage = baggage;
      dispatch(updateLuggages(values) as any);
      form.reset();
      editLuggageModal.onClose();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <Modal
        title="Update Luggage"
        description="Update Luggage information for this booking"
        isOpen={editLuggageModal.isOpen}
        onClose={editLuggageModal.onClose}
        className="z-[101] w-full sm:w-[80%] md:w-[50%] h-full sm:h-fit mt-5 overflow-auto"
      >
        <div className="py-2 pb-4 w-full">
          <div className="sm:grid grid-cols-6 border rounded-lg py-2 px-5 gap-y-4">
            <div className="flex justify-center">
              <img
                src={IMAGES.bag}
                alt="baggage"
                className="w-[90px] h-[90px]"
              />
            </div>
            <div className="col-span-5 flex justify-between">
              <div className="flex flex-col justify-center space-y-2">
                <h4 className="font-bold text-blue-700">Baggage</h4>
                <p>Total passenger's baggages</p>
              </div>
              <div className="flex flex-col space-y-2 mt-3">
                {baggage !== 0 && (
                  <p className="font-bold">{baggage} x checked baggage</p>
                )}
              </div>
            </div>
            {baggage > 0 && (
              <div className="sm:col-span-6 grid grid-cols-2">
                <div className="flex space-x-1">
                  <p>Additional baggage item(s) </p>
                  <span className="font-bold text-xl">
                    {' '}
                    - {baggage * baggagePrice}
                  </span>
                </div>
                <div
                  className="flex justify-end"
                  onClick={() => {
                    setBaggage(0);
                  }}
                >
                  <Button
                    variant={'ghost'}
                    className="font-bold "
                    disabled={loading}
                  >
                    Remove
                  </Button>
                </div>
              </div>
            )}
          </div>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)}>
              <Card className="px-5 py-5">
                <p>
                  Hand baggage and accessory Max. weight for selected cabin is:
                  12 kg / 26 lbs
                </p>
                <div className="flex justify-end px-2 py-5 ">
                  <div className="flex items-center space-x-5 my-3">
                    <p className="font-bold">Baggage: </p>
                    <CircleButton
                      onClick={() => setBaggage(baggage - 1)}
                      text="-"
                      className={`${
                        baggage === 0 ? 'pointer-events-none ring-red-50' : ''
                      }`}
                    />
                    <span className="text-lg font-bold">{baggage}</span>
                    <CircleButton
                      onClick={() => setBaggage(baggage + 1)}
                      text="+"
                    />
                  </div>
                </div>
              </Card>

              <div className="pt-6 space-x-2 flex items-center justify-center w-full">
                <Button
                  variant="outline"
                  type="button"
                  onClick={editLuggageModal.onClose}
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
