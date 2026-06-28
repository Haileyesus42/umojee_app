import React from "react";
import DefaultLayout from "../../layout/DefaultLayout";
import { AlertCircle, CheckCircle2, XCircle } from "lucide-react";
import { Card } from "../../common/ui/card";
import { Button } from "../../common/ui/button";
import { useNavigate } from "react-router-dom";

const FailedPayment = () => {
  const navigate = useNavigate();

  return (
    <DefaultLayout>
      <div className="w-full m-10 mt-14 flex justify-center items-center">
        <Card className="w-full sm:w-[600px] p-5 flex flex-col items-center z-[2000] dark:bg-slate-400">
          <XCircle className="w-20 h-20 text-white dark:text-slate-400" fill="red" />
          <h1 className="font-bold text-red-700">Payment Failed</h1>
          <div className="w-full flex flex-col items-center justify-center my-5 px-5 space-y-3">
            <h1 className="font-semibold">
              We're sorry, it seems there was an issue processing your booking!
            </h1>
            <p className="text-center text-sm leading-7">
              Don't worry, though. Our team is working to resolve this quickly.
              Please attempt your booking again and proceed with payment. Thank
              you for your patience.
            </p>
          </div>
          <div className="flex justify-center w-full">
            <Button
              className="bg-slate-700 hover:bg-slate-700 dark:text-white"
              onClick={() =>
                navigate("/passengers/payments", { replace: true })
              }
            >
              Try Again
            </Button>
          </div>
        </Card>
      </div>
    </DefaultLayout>
  );
};

export default FailedPayment;
