import { zodResolver } from "@hookform/resolvers/zod";
import React, { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import toast from "react-hot-toast";
import { useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import * as z from "zod";
import { Button } from "../../common/ui/button";
import { Form } from "../../common/ui/form";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot
} from "../../common/ui/input-otp";
import { Loader } from "../../common/ui/loader";
import { getLocalStorageValue } from "../../lib/utils";
import { generateToken, verifyOTP } from "../../store/auth/authActions";

const formSchema = z.object({
  otp: z.string().length(6, "OTP must be 6 characters"),
});

export const UserVerifyPage1 = () => {
  const [loading, setLoading] = useState(false);
  const [resendDisabled, setResendDisabled] = useState(false);
  const [resendTimer, setResendTimer] = useState(60);
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      otp: "",
    },
  });

  const redirectPath = getLocalStorageValue("redirectPath") || "/";
  const user = getLocalStorageValue("user");
  const email = user.email
  console.log(user, email);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (resendDisabled && resendTimer > 0) {
      timer = setInterval(() => {
        setResendTimer((prev) => prev - 1);
      }, 1000);
    } else if (resendTimer === 0) {
      setResendDisabled(false);
      setResendTimer(60);
    }
    return () => clearInterval(timer);
  }, [resendDisabled, resendTimer]);

 const onSubmit = async (values: z.infer<typeof formSchema>) => {
  try {
    setLoading(true);
    await dispatch(verifyOTP(email, values.otp, navigate, redirectPath) as any);
  } catch (error: any) {
    if (error.message === "Invalid Token") {
      toast.error("Invalid OTP");
    } else if (error.message === "The token has expired.") {
      toast.error("OTP Expired");
    } else {
      toast.error(error.message);
    }
  } finally {
    setLoading(false);
  }
};


  const resendOtp = async () => {
    if (resendDisabled) return;

    try {
      setResendDisabled(true);
      await dispatch(generateToken(email) as any);
      toast.success("New OTP has been sent to your email!");
    } catch (error: any) {
      toast.error("Failed to resend OTP. Please try again.");
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="w-full max-w-lg p-8 space-y-8 bg-white rounded-lg shadow dark:bg-gray-800">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Verify Your Account
          </h2>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            We've sent a 6-digit code
          </p>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="flex justify-center">
              <InputOTP
                maxLength={6}
                value={form.watch("otp")}
                onChange={(value: string) =>
                  form.setValue("otp", value, { shouldValidate: true })
                }
                disabled={loading}
              >
                <InputOTPGroup>
                  <InputOTPSlot index={0} />
                  <InputOTPSlot index={1} />
                  <InputOTPSlot index={2} />
                  <InputOTPSlot index={3} />
                  <InputOTPSlot index={4} />
                  <InputOTPSlot index={5} />
                </InputOTPGroup>
              </InputOTP>
            </div>

            <Button
              type="submit"
              disabled={loading || form.watch("otp")?.length !== 6}
              className="w-full bg-emerald-600 hover:bg-emerald-700"
            >
              {loading ? (
                <>
                  <Loader color="#ffffff" size={15} />
                  <span className="ml-2">Verifying...</span>
                </>
              ) : (
                "Verify"
              )}
            </Button>

            <div className="text-center">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Didn't receive the code?{" "}
                <button
                  type="button"
                  onClick={resendOtp}
                  disabled={resendDisabled}
                  className={`font-medium text-emerald-600 hover:text-emerald-700 ${
                    resendDisabled ? "opacity-50 cursor-not-allowed" : ""
                  }`}
                >
                  {resendDisabled ? `Resend in ${resendTimer}s` : "Resend OTP"}
                </button>
              </p>
            </div>
          </form>
        </Form>
      </div>
    </div>
  );
};
