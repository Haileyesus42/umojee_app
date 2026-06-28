import { zodResolver } from "@hookform/resolvers/zod";
import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useNavigate, useParams, Link } from "react-router-dom";
import axios from "axios";
import toast from "react-hot-toast";
import { Button } from "../../common/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "../../common/ui/form";
import { Input } from "../../common/ui/input";

const schema = z
  .object({
    password: z.string().min(8, "Minimum 8 characters"),
    confirmPassword: z.string().min(8, "Minimum 8 characters"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type FormValues = z.infer<typeof schema>;

const backendUrl = process.env.REACT_APP_BACKEND_URL;

export default function ResetPassword() {
  const [loading, setLoading] = useState(false);
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { password: "", confirmPassword: "" },
    mode: "onChange",
  });

  const onSubmit = async (values: FormValues) => {
    if (!token) {
      toast.error("Invalid reset link");
      return;
    }
    try {
      setLoading(true);
      await axios.patch(
        `${backendUrl}/api/client/auth/resetPassword/${token}`,
        { password: values.password },
        { headers: { "Content-Type": "application/json", Accept: "application/json" } }
      );
      toast.success("Password updated. You can now sign in.");
      navigate("/login");
    } catch (e: any) {
      const msg = e?.response?.data?.message || "Reset link invalid or expired";
      toast.error(msg);
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
                  Reset Password
                </h1>
                <p className="text-sm text-center text-gray-600 dark:text-gray-400">
                  Enter a new password for your account.
                </p>

                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>New Password</FormLabel>
                      <FormControl>
                        <Input
                          type="password"
                          className="ring-1"
                          disabled={loading}
                          placeholder="Enter new password"
                          autoComplete="new-password"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="confirmPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Confirm Password</FormLabel>
                      <FormControl>
                        <Input
                          type="password"
                          className="ring-1"
                          disabled={loading}
                          placeholder="Re-enter new password"
                          autoComplete="new-password"
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
                  {loading ? "Updating..." : "Update Password"}
                </Button>

                <div className="text-sm text-gray-600 dark:text-gray-400 text-center">
                  Remembered your password?{" "}
                  <Link to="/login" className="text-emerald-600 hover:text-emerald-700 font-medium">
                    Sign In
                  </Link>
                </div>
              </div>
            </form>
          </Form>
        </div>
      </div>
    </main>
  );
}
