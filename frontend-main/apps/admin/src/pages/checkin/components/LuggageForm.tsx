// src/components/LuggageFormSection.tsx

import { IMAGES } from '../../../assets';
import { Button } from '../../../common/ui/button';
import { Card } from '../../../common/ui/card';
import { Form } from '../../../common/ui/form';
import { cn } from '../../../lib/utils';

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

interface LuggageFormSectionProps {
  baggage: number;
  setBaggage: (value: number) => void;
  baggagePrice: number;
  form: any;
  onSubmit: (values: any) => void;
  loading: boolean;
}

const LuggageFormSection: React.FC<LuggageFormSectionProps> = ({
  baggage,
  setBaggage,
  baggagePrice,
  form,
  onSubmit,
  loading,
}) => {
  return (
    <Card className="py-2 pb-4 w-full">
      <div className="sm:grid grid-cols-6 border-b py-2 px-5 gap-y-4">
        <div className="flex justify-center">
          <img src={IMAGES.bag} alt="baggage" className="w-[90px] h-[90px]" />
        </div>
        <div className="col-span-5 flex justify-between">
          <div className="flex flex-col justify-center space-y-2">
            <h4 className="font-bold text-blue-700">Baggage</h4>
            <p>Total passenger's baggages</p>
          </div>
          <div className="flex flex-col space-y-2 mt-3">
            {baggage !== 0 && (
              <p className="font-bold">{baggage} x extra baggage</p>
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
          <p className='px-5 py-5'>
            Hand baggage and accessory Max. weight for selected cabin is: 12
            kg / 26 lbs
          </p>
          <div className="flex flex-col items-end px-5">
            <div className="flex items-center space-x-5 mb-5">
              <p className="font-bold">Baggage: </p>
              <CircleButton
                onClick={() => setBaggage(baggage > 0 ? baggage - 1 : 0)}
                text="-"
                className={`${baggage === 0 ? 'pointer-events-none ring-red-50' : ''
                  }`}
              />
              <span className="text-lg font-bold">{baggage}</span>
              <CircleButton
                onClick={() => setBaggage(baggage + 1)}
                text="+"
              />
            </div>
            {/* <Button
              type="submit"
              disabled={loading}
              className="bg-cyan-500 hover:bg-cyan-500"
            >
              Update
            </Button> */}
          </div>

          <div className="pt-6 space-x-5 flex items-center justify-center w-full"></div>
        </form>
      </Form>
    </Card>
  );
};
export default LuggageFormSection;
