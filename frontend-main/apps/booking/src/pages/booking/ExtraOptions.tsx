import { zodResolver } from "@hookform/resolvers/zod";
import {
  Backpack,
  Briefcase,
  ChevronDown,
  ChevronUp,
  Luggage,
} from "lucide-react";
import React, { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import toast from "react-hot-toast";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import * as z from "zod";
import { Button } from "../../common/ui/button";
import { Card } from "../../common/ui/card";
import { Form } from "../../common/ui/form";
import CustomOnewayStepper from "../../components/CustomOnewayStepper";
import CustomRoundtripStepper from "../../components/CustomRoundtripStepper";
import DefaultLayout from "../../layout/DefaultLayout";
import {
  cn,
  getLocalStorageValue,
  removeLocalStorageValue,
} from "../../lib/utils";
import { setExtraOptionsData } from "../../store/flight/flightSlice";
import { IMAGES } from "../../assets";

const CircleButton: React.FC<{
  text: string;
  onClick: () => void;
  className?: string;
}> = ({ text, onClick, className }) => {
  return (
    <div
      className={cn(
        'relative inline-flex justify-center items-center w-10 h-10  whitespace-nowrap text-xl ring-1 font-bold rounded-full hover:cursor-pointer',
        className
      )}
      onClick={onClick}
    >
      <span className="absolute top-1">{text}</span>
    </div>
  );
};

const formSchema = z.object({
  pricePerBaggage: z.number(),
  totalBaggages: z.number(),
  totalPriceValue: z.number(),
});

const ExtraOptions = () => {
  const [loading, setLoading] = useState(false);
  const [isExtraBaggage, setIsExtraBaggage] = useState(true);
  const [showChooseBaggage, setShowChooseBaggage] = useState(false);
  const [showContinueToPayments, setShowContinueToPayments] = useState(false);
  const [baggage, setBaggage] = useState(0);
  const [baggagePrice, setBaggagePrice] = useState(40);

  const navigate = useNavigate();
  const dispatch = useDispatch();

  const searchFlightDataRedux = useSelector(
    (state: any) => state.flight.searchFlightData
  );
  const searchFlightData = getLocalStorageValue("searchFlightData")
    ? getLocalStorageValue("searchFlightData")
    : searchFlightDataRedux;

  const extraOptionsData = getLocalStorageValue("extraOptions");

  useEffect(() => {
    if (extraOptionsData) {
      setBaggage(extraOptionsData.totalBaggages);
    }
  }, []);

  const selectedFlightRedux = useSelector(
    (state: any) => state.flight.selectedFlight
  );

  const selectedFlight = getLocalStorageValue("selectedFlight")
    ? getLocalStorageValue("selectedFlight")
    : selectedFlightRedux;

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      pricePerBaggage: baggagePrice,
      totalBaggages: extraOptionsData ? extraOptionsData.totalBaggages : 0,
      totalPriceValue: extraOptionsData ? extraOptionsData.totalPriceValue : 0,
    },
  });

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      setLoading(true);
      values.totalBaggages = baggage;
      values.totalPriceValue = baggage * baggagePrice;

      console.log("Extra options: ", values);
      dispatch(setExtraOptionsData(values));
      setIsExtraBaggage(true);
      setShowChooseBaggage(false);
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
    <DefaultLayout>
      <div className="max-w-screen-2xl mx-auto">
        <div className="sticky top-[70px] flex flex-col justify-center z-[1000] mx-auto">
          {searchFlightData.tripType === "one-way" ? (
            <CustomOnewayStepper activeIndex={3} />
          ) : (
            <CustomRoundtripStepper activeIndex={4} />
          )}
        </div>
        <Card className="sm:mx-5 my-5 sm:my-8 sm:p-5 border">
          <div className="text-2xl font-bold py-5">Customize your trip</div>
          <div className="text-muted-foreground">
            Choose from our range of Options for a smoother and more comfortable
            journey.
          </div>
          <div className="sm:grid sm:grid-cols-2 bg-slate-100 my-5 dark:bg-slate-500">
            <div className="py-5 px-5">
              <h1 className="text-2xl font-bold pb-5">
                Add an extra checked bag from {selectedFlight.price.currency}{" "}
                {baggagePrice}.
              </h1>
              <h4 className="font-bold">Baggage</h4>
              <p className="font-bold pb-2 flex space-x-2">
                <span>from</span>
                <span className="text-emerald-600">
                  {selectedFlight.price.currency} {baggagePrice}
                </span>
              </p>
              <Button
                className="bg-emerald-600 hover:bg-emerald-600 text-white mt-5"
                onClick={() => setShowChooseBaggage(true)}
                disabled={loading}
              >
                Add extra baggage
              </Button>
            </div>
            <div className="w-full">
              <img
                className="w-full h-[210px] object-fill"
                src={IMAGES.manLookingPhone}
                alt="man"
              />
            </div>
          </div>
          <div className="flex flex-col space-y-5">
            <div className="sm:grid grid-cols-6 border rounded-lg py-2 px-5 gap-y-4">
              <div className="flex justify-center">
                <img
                  src={IMAGES.bag}
                  alt="baggage"
                  className="w-[90px] h-[90px]"
                />
              </div>
              <div
                className="col-span-5 flex justify-between"
                onClick={() => setShowChooseBaggage(!showChooseBaggage)}
              >
                <div className="flex flex-col justify-center space-y-2">
                  <h4 className="font-bold text-emerald-600">Baggage</h4>
                  <p>View your baggage allowance</p>
                </div>
                <div className="flex flex-col space-y-2 mt-3">
                  <div className="flex justify-end">
                    {showChooseBaggage ? (
                      <ChevronUp className="w-5 h-5" />
                    ) : (
                      <ChevronDown className="w-5 h-5" />
                    )}
                  </div>
                  {isExtraBaggage && baggage !== 0 && (
                    <p className="font-bold">{baggage} x checked baggage</p>
                  )}
                </div>
              </div>
              {isExtraBaggage && baggage > 0 && (
                <div className="sm:col-span-6 grid grid-cols-2">
                  <div className="flex space-x-1">
                    <p>Additional baggage item(s) </p>
                    <span className="font-bold text-xl">
                      {" "}
                      - {selectedFlight.price.currency} {baggage * baggagePrice}
                    </span>
                  </div>
                  <div
                    className="flex justify-end"
                    onClick={() => {
                      setIsExtraBaggage(false);
                      setBaggage(0);
                      removeLocalStorageValue("extraOptions");
                    }}
                  >
                    <Button
                      variant={"ghost"}
                      className="font-bold "
                      disabled={loading}
                    >
                      Remove
                    </Button>
                  </div>
                </div>
              )}
            </div>
            {showChooseBaggage && (
              <Card className="px-5 py-5">
                <p>
                  Hand baggage and accessory Max. weight for your selected cabin
                  is: 12 kg / 26 lbs
                </p>
                <div className="px-2 py-5">
                  <div className="grid sm:grid-cols-3 gap-4 py-4">
                    <div className="col-span-2 flex space-x-4 items-center">
                      <Briefcase className="w-5 h-5 text-emerald-600" />
                      <p>Personal item 40 x 30 x 15 cm / 16 x 12 x 6 in</p>
                    </div>
                    <div>1 included</div>
                  </div>
                  <div className="grid sm:grid-cols-3 gap-4 py-4">
                    <div className="col-span-2 flex space-x-4 items-center">
                      <Backpack className="w-5 h-5 text-emerald-600" />
                      <p>
                        Hand baggage 55 x 25 x 35 cm / 21.7 x 9.9 x 13.8 in
                        (including handles and wheels)
                      </p>
                    </div>
                    <div>1 included</div>
                  </div>
                  <div className="grid sm:grid-cols-3 gap-4 py-4">
                    <div className="col-span-2 flex space-x-4 items-center">
                      <Luggage className="w-5 h-5 text-emerald-600" />
                      <p>
                        Checked baggage Max. 158 cm/62.2 in. (length + width +
                        height) - 23 kg
                      </p>
                    </div>
                    <div>{baggage} included</div>
                  </div>
                  <div className="w-full flex flex-col items-end">
                    <Form {...form}>
                      <form onSubmit={form.handleSubmit(onSubmit)}>
                        <div className="flex items-center space-x-5 my-3">
                          <p className="font-bold">Baggage: </p>
                          <CircleButton
                            onClick={() => setBaggage(baggage - 1)}
                            text="-"
                            className={`ring-torch-red-300 hover:bg-torch-red-50 ${
                              baggage === 0
                                ? 'pointer-events-none ring-torch-red-50'
                                : ''
                            }`}
                          />
                          <span className="text-lg font-bold">{baggage}</span>
                          <CircleButton
                            onClick={() => setBaggage(baggage + 1)}
                            text="+"
                            className="ring-emerald-300 hover:bg-emerald-50"
                          />
                        </div>
                        <Button
                          type="submit"
                          className="bg-slate-700 hover:bg-slate-700 dark:text-white dark:bg-slate-400"
                          disabled={loading}
                        >
                          Apply
                        </Button>
                      </form>
                    </Form>
                  </div>
                </div>
              </Card>
            )}
          </div>
        </Card>
        {!showContinueToPayments && (
          <div className="pt-6 space-x-2 flex items-center justify-end mx-5">
            <Button
              type="submit"
              variant={"link"}
              disabled={loading}
              className="bg-emerald-600 text-white text-sm font-bold hover:no-underline"
              onClick={() => navigate("/passengers/payments")}
            >
              Continue to payments
            </Button>
          </div>
        )}
      </div>
    </DefaultLayout>
  );
};

export default ExtraOptions;
