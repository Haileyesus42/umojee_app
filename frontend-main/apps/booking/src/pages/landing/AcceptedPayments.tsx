import React from "react";
import { IMAGES } from "../../assets";
import Marquee from "react-fast-marquee";

const paymentMethods = [
  IMAGES.visa,
  IMAGES.visa2,
  IMAGES.masterCard,
  IMAGES.maestro,
  IMAGES.capitalone,
  IMAGES.discover,
  IMAGES.paypal,
  IMAGES.payU,
  IMAGES.jcb,
  IMAGES.uatp,
  IMAGES.express,
];

const AcceptedPayments = () => {
  return (
    <div className="md:mt-10 sm:mx-10">
      <p className="text-xl font-bold text-center">Payment methods accepted</p>
      <div className="flex mt-6 gap-x-6 gap-y-4 sm:gap-x-10 sm:px-5 mx-auto overflow-hidden w-full space-x-5">
        <Marquee className="space-x-20" autoFill>
          {paymentMethods.map((payment, index) => (
            <div key={index} className="h-16 w-20 mx-4">
              <img
                src={payment}
                alt={payment}
                key={index}
                className="w-full h-full object-contain"
              />
            </div>
          ))}
        </Marquee>
      </div>
    </div>
  );
};

export default AcceptedPayments;
