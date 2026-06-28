"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import toast from "react-hot-toast";
import * as z from "zod";
import { useVerifyUserModal } from "../../hooks/use-veirfy-user-modal";
import { useNavigate } from "react-router-dom";
import { zodResolver } from "@hookform/resolvers/zod";
import { Modal } from "../ui/modal";
import { Form, FormControl, FormField, FormItem, FormMessage } from "../ui/form";
import { Input } from "../ui/input";
import { Button } from "../ui/button";

const formSchema = z.object({
  otp: z.string().min(6),
});

// const url = process.env.NEXT_PUBLIC_FRONTEND_URL;

export const UserVerifyModal = ({ email }: { email: string }) => {
  const verifyUserModal = useVerifyUserModal();
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      otp: "",
    },
  });

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      setLoading(true);
      // @ts-ignore
      // const response = await verifyOTP(email, values.otp);
      // if (response) {
      //   router.push(`${url}/auth/verifyuser/${values.otp}`);
      // }
      verifyUserModal.onClose();
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

  return (
    <Modal
      title="Verify OTP"
      description="Your code sent to you via email"
      isOpen={verifyUserModal.isOpen}
      onClose={verifyUserModal.onClose}
    >
      <div className="spaye-y-4 py-2 pb-4 w-96">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <FormField
              name="otp"
              control={form.control}
              render={({ field }) => (
                <FormItem>
                  {/* <FormLabel>OTP:</FormLabel> */}
                  <FormControl>
                    <Input type="password" placeholder="Enter OTP" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="mt-6">
              <p className="text-sm font-light text-gray-500 dark:text-gray-400">
                Didn't receive code?
                <span
                  // onClick={() => resendOTP(email)}
                  className="font-medium ml-2 text-cyan-500 hover:underline hover:cursor-pointer dark:text-cyan-500"
                >
                  Resend
                </span>
              </p>
            </div>
            <div className="pt-6 space-x-2 flex items-center justify-center w-full">
              <Button
                variant="outline"
                type="button"
                onClick={verifyUserModal.onClose}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={loading} className="bg-cyan-500 hover:bg-cyan-500">
                Veirfy
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </Modal>
  );
};
