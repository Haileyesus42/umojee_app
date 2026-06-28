import { zodResolver } from "@hookform/resolvers/zod";
import React, { useState } from "react";
import { useForm } from "react-hook-form";
import toast from "react-hot-toast";
import PhoneInput from "react-phone-input-2";
import { useDispatch } from "react-redux";
import { useNavigate, useSearchParams } from "react-router-dom";
import { z } from "zod";
import SingleDatePicker from "../../common/DatePicker";
import { Button } from "../../common/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "../../common/ui/form";
import { Input } from "../../common/ui/input";
import { Loader } from "../../common/ui/loader";
// import { UserRequest } from "../../types/types";
import { Eye, EyeOff } from "lucide-react";
import { registerUser } from "../../store/auth/authActions";
import GoogleAuthButton from "../../components/auth/GoogleAuthButton";
import Coachmark from "../chat/mobile/components/Coachmark";

const passwordRegex =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

const formSchema = z
  .object({
    email: z
      .string()
      .min(1, { message: "Email is required" })
      .email("Invalid email address"),
    phone: z.string().min(10, "Please enter a valid phone number"),
    firstName: z
      .string()
      .min(2, { message: "First name must be at least 2 characters" })
      .max(50, { message: "First name must be less than 50 characters" })
      .regex(/^[a-zA-Z\s]*$/, "First name can only contain letters and spaces"),
    lastName: z
      .string()
      .min(2, { message: "Last name must be at least 2 characters" })
      .max(50, { message: "Last name must be less than 50 characters" })
      .regex(/^[a-zA-Z\s]*$/, "Last name can only contain letters and spaces"),
    dob: z.date().refine((date) => !!date, { message: "Date of birth is required" }),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .regex(
        passwordRegex,
        "Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character"
      ),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

type LevelFormValues = z.infer<typeof formSchema>;

function RegisterCard() {
  const [loading, setLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [inputValue, setInputValue] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const maxDate = new Date();
  maxDate.setFullYear(maxDate.getFullYear() - 13); // Minimum age requirement of 13 years

  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const dispatch = useDispatch();
  const inviteToken = searchParams.get("invite") || "";

  const form = useForm<LevelFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      phone: "",
      email: "",
      firstName: "",
      lastName: "",
      dob: new Date(),
      password: "",
      confirmPassword: "",
    },
  });

  const onSubmit = async (data: LevelFormValues) => {
    try {
      setLoading(true);
      console.log(data);

      if (!data.dob) {
        toast.error("Date of birth is required");
        return;
      }
      // const birthDate = new Date(data.dob);
      // const age = Math.floor(
      //   (Date.now() - birthDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000)
      // );
      // const redirectPath = "/login"
      await dispatch(registerUser({ ...data, inviteToken: inviteToken || undefined }, navigate) as any);

      navigate("/user/verify");
    } catch (error: any) {
      console.error("Registration error:", error);
      toast.error(error.message || "Registration failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full min-h-screen flex justify-center items-center bg-gray-50 dark:bg-gray-900 py-8">
      <div className="w-full max-w-xl">
        <div className="p-8 bg-white rounded-lg shadow-md border border-gray-200 dark:bg-gray-800 dark:border-gray-700">
          <div className="mb-8 text-center">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Create an Account
            </h1>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
              Join us today and start your journey
            </p>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="rounded-lg border border-emerald-100 bg-gradient-to-r from-emerald-50 via-white to-amber-50 p-4 dark:border-emerald-900 dark:from-emerald-950/40 dark:via-gray-800 dark:to-amber-950/30">
                <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-emerald-700 dark:text-emerald-300">Quick start</p>
                <p className="mt-2 text-sm text-gray-700 dark:text-gray-200">
                  Open your account with Google and we&apos;ll set up your traveler profile in one step.
                </p>
                <Coachmark
                  id="register_google_signup_button"
                  title="New Sign-Up Option!"
                  description="Use your Google account to create your profile faster and start your journey in one step."
                  position="bottom"
                  buttonText="Got it!"
                  className="mt-4"
                >
                  <GoogleAuthButton mode="signup" />
                </Coachmark>
              </div>

              <div className="flex items-center gap-3 text-xs uppercase tracking-[0.24em] text-gray-400 dark:text-gray-500">
                <span className="h-px flex-1 bg-gray-200 dark:bg-gray-700" />
                <span>Or sign up with email</span>
                <span className="h-px flex-1 bg-gray-200 dark:bg-gray-700" />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="firstName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>First Name</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="John"
                          className="ring-1"
                          {...field}
                          disabled={loading}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="lastName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Last Name</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Doe"
                          className="ring-1"
                          {...field}
                          disabled={loading}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email Address</FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder="john.doe@example.com"
                        className="ring-1"
                        {...field}
                        disabled={loading}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="phone"
                render={({ field: { onChange, value, ...field } }) => (
                  <FormItem>
                    <FormLabel>Phone Number</FormLabel>
                    <FormControl>
                      <PhoneInput
                        country={"us"}
                        value={value}
                        onChange={(phone) => onChange(phone)}
                        inputClass="!w-full !pl-14 !pr-3 !py-[7px] !text-base !rounded-md !border !border-input !bg-white dark:!bg-gray-800 !ring-1 !ring-emerald-200 focus:!ring-emerald-500"
                        containerClass="!w-full relative"
                        buttonClass="!absolute !left-0 !top-0 !bottom-0 !border-input !bg-transparent dark:!bg-gray-800 !border-r"
                        dropdownClass="!bg-white dark:!bg-gray-800"
                        searchClass="!bg-white dark:!bg-gray-800"
                        enableSearch
                        disabled={loading}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="dob"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date of Birth</FormLabel>
                    <FormControl>
                      <SingleDatePicker
                        placeholder="Select your birth date"
                        setInputValue={setInputValue}
                        setSelectedDate={setSelectedDate}
                        inputValue={inputValue}
                        selectedDate={selectedDate}
                        monthsShown={1}
                        minDate={null}
                        maxDate={maxDate}
                        className="ring-1 !py-3"
                        onChange={(date: Date) =>
                          form.setValue("dob", date)
                        }
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <div className="relative">
                      <FormControl>
                        <Input
                          type={showPassword ? "text" : "password"}
                          placeholder="••••••••"
                          className="ring-1 pr-10"
                          {...field}
                          disabled={loading}
                        />
                      </FormControl>
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2"
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4 text-gray-500" />
                        ) : (
                          <Eye className="h-4 w-4 text-gray-500" />
                        )}
                      </button>
                    </div>
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
                    <div className="relative">
                      <FormControl>
                        <Input
                          type={showConfirmPassword ? "text" : "password"}
                          placeholder="••••••••"
                          className="ring-1 pr-10"
                          {...field}
                          disabled={loading}
                        />
                      </FormControl>
                      <button
                        type="button"
                        onClick={() =>
                          setShowConfirmPassword(!showConfirmPassword)
                        }
                        className="absolute right-3 top-1/2 transform -translate-y-1/2"
                      >
                        {showConfirmPassword ? (
                          <EyeOff className="h-4 w-4 text-gray-500" />
                        ) : (
                          <Eye className="h-4 w-4 text-gray-500" />
                        )}
                      </button>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button
                disabled={loading}
                type="submit"
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-medium py-2.5"
              >
                {loading ? (
                  <div className="flex items-center justify-center">
                    <Loader color="#ffffff" size={15} />
                    <span className="ml-2">Creating Account...</span>
                  </div>
                ) : (
                  "Create Account"
                )}
              </Button>

              <p className="text-sm text-center text-gray-600 dark:text-gray-400">
                Already have an account?{" "}
                <button
                  type="button"
                  onClick={() => navigate("/login")}
                  className="font-medium text-emerald-600 hover:text-emerald-700 dark:text-emerald-400"
                >
                  Sign in
                </button>
              </p>
            </form>
          </Form>
        </div>
      </div>
    </div>
  );
}

export default RegisterCard;
