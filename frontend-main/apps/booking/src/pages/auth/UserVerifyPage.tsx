import { zodResolver } from "@hookform/resolvers/zod";
import React, { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import toast from "react-hot-toast";
import { useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import * as z from "zod";
import { Button } from "../../common/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem
} from "../../common/ui/form";
import { Input } from "../../common/ui/input";
import { Loader } from "../../common/ui/loader";
import { getLocalStorageValue } from "../../lib/utils";
import { generateToken, loginUser } from "../../store/auth/authActions";

const formSchema = z.object({
  otp: z.string().min(6).max(6),
});

export const UserVerifyPage = () => {
  const [loading, setLoading] = useState(false);
  const otpRefs = useRef(
    Array.from({ length: 6 }, () => React.createRef<HTMLInputElement>())
  );

  const navigate = useNavigate();
  const dispatch = useDispatch();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      otp: "",
    },
  });

  useEffect(() => {
    otpRefs.current[0].current?.focus();
  }, []);

  const redirectPath = getLocalStorageValue("redirectPath")
    ? getLocalStorageValue("redirectPath")
    : "/";
  const email = getLocalStorageValue("username");

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      setLoading(true);
      // await dispatch(
      //   loginUser({ email, otp: values.otp }, navigate, redirectPath) as any
      // );
    } catch (error: any) {
      if (error.message === "Invalid Token") {
        toast.error("Invalid OTP");
      } else if (error.message === "The token has expired.") {
        toast.error("OTP Expired");
      } else toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleOtpChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    index: number
  ) => {
    const { value } = e.target;
    if (value.length > 1) return; // Prevent more than one character input
    const otp = form.getValues("otp").split("");
    otp[index] = value;
    form.setValue("otp", otp.join(""));
    if (value && index < otpRefs.current.length - 1) {
      otpRefs.current[index + 1].current?.focus();
    }
  };

  const handleOtpKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>,
    index: number
  ) => {
    if (e.key === "Backspace" && !e.currentTarget.value) {
      if (index > 0) {
        otpRefs.current[index - 1].current?.focus();
      }
    }
  };

  const resendOtp = async () => {
    await dispatch(generateToken(email) as any);
  };

  return (
    <div className="w-full min-h-screen flex justify-center items-center">
      <div className="w-full sm:w-[500px] sm:h-[400px] border p-10 flex flex-col items-center">
        <h1 className="text-lg font-bold py-5">Verify Your Account</h1>
        <p className="leading-8 text-center">
          We sent you the six digit code to your email. Enter the code below to
          confirm your email address
        </p>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="flex flex-col justify-between min-h-full py-5"
          >
            <div className="relative">
              <FormField
                name="otp"
                control={form.control}
                render={() => (
                  <FormItem>
                    <FormControl>
                      <div className="flex space-x-3">
                        {otpRefs.current.map((ref, index) => (
                          <Input
                            key={index}
                            type="text"
                            ref={ref}
                            className="w-10 text-center ring-1"
                            maxLength={1}
                            onChange={(e) => handleOtpChange(e, index)}
                            onKeyDown={(e) => handleOtpKeyDown(e, index)}
                            disabled={loading}
                          />
                        ))}
                      </div>
                    </FormControl>
                  </FormItem>
                )}
              />

              <div className="w-full py-5 mt-5">
                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-cyan-500 hover:bg-cyan-500"
                >
                  {loading && <Loader color="#ffffff" size={15} />}
                  Veirfy
                </Button>
              </div>
              <p className="text-sm font-light text-gray-500 dark:text-gray-400">
                Didn't receive code?
                <span
                  onClick={resendOtp}
                  className={`font-medium ml-2 text-cyan-500 hover:underline hover:cursor-pointer dark:text-cyan-500${
                    loading ? "cursor-not-allowed" : ""
                  }`}
                >
                  Resend
                </span>
              </p>
            </div>
          </form>
        </Form>
      </div>
    </div>
  );
};
