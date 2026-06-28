import { zodResolver } from "@hookform/resolvers/zod";
import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "../../common/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "../../common/ui/form";
import { Input } from "../../common/ui/input";
import toast from "react-hot-toast";
import axios from "axios";

const schema = z.object({
  email: z.string().min(1, "Email is required").email("Enter a valid email"),
});

type FormValues = z.infer<typeof schema>;

const backendUrl = process.env.REACT_APP_BACKEND_URL;

export default function ForgotPassword() {
  const [loading, setLoading] = useState(false);
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: "" },
    mode: "onChange",
  });

  const onSubmit = async (values: FormValues) => {
    try {
      setLoading(true);
      await axios.post(`${backendUrl}/api/client/auth/forgotPassword`, { email: values.email });
      toast.success("If an account exists, a reset link will be sent.");
    } catch (e: any) {
      toast.error("Unable to process your request right now.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex items-center justify-center min-h-screen mx-2">
      <div className="w-full max-w-xl mt-8 xl:w-5/12">
        <div className="p-6 bg-white rounded-lg shadow-lg border border-gray-100 sm:p-10 dark:bg-gray-800">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8 w-full">
              <div className="space-y-4">
                <h1 className="text-2xl font-bold text-center text-gray-900 dark:text-white">
                  Forgot Password
                </h1>
                <p className="text-sm text-center text-gray-600 dark:text-gray-400">
                  Enter the email associated with your account. If it exists, we will send password reset instructions.
                </p>

                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input
                          type="email"
                          className="ring-1"
                          disabled={loading}
                          placeholder="Enter your email"
                          autoComplete="email"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button
                  disabled={loading || !form.formState.isValid}
                  type="submit"
                  className={`w-full text-white bg-emerald-600 hover:bg-emerald-700 ${loading ? "cursor-not-allowed" : ""}`}
                >
                  {loading ? "Sending..." : "Send Reset Link"}
                </Button>
              </div>
            </form>
          </Form>
        </div>
      </div>
    </main>
  );
}
