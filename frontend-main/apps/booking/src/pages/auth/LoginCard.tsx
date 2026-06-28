import { zodResolver } from "@hookform/resolvers/zod";
import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { useDispatch } from "react-redux";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { z } from "zod";
import { Eye, EyeOff } from "lucide-react";
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
import { getLocalStorageValue } from "../../lib/utils";
import { loginUserWithPassword } from "../../store/auth/authActions";
import toast from "react-hot-toast";
import { LoginProp } from "../../types/types";
import GoogleAuthButton from "../../components/auth/GoogleAuthButton";
import Coachmark from "../chat/mobile/components/Coachmark";

const formSchema = z.object({
  email: z
    .string()
    .min(1, "Email is required")
    .email("Please enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});

type LevelFormValues = z.infer<typeof formSchema>;

function LoginCard() {
  const [loading, setLoading] = useState(false);
  const [requiresTwoFactor, setRequiresTwoFactor] = useState(false);
  const [twoFactorCode, setTwoFactorCode] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch();

  // Get redirect path from location state or localStorage
  const redirectPath =
    location.state?.from?.pathname ||
    getLocalStorageValue("redirectPath") ||
    "/";

  const form = useForm<LevelFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
      password: "",
    },
    mode: "onChange",
  });

  const onSubmit = async (data: LoginProp) => {
    if (requiresTwoFactor && twoFactorCode.length !== 6) {
      toast.error("Enter your 6-digit authenticator code");
      return;
    }

    try {
      setLoading(true);
      const result = await dispatch(
        loginUserWithPassword(
          { ...data, twoFactorCode: requiresTwoFactor ? twoFactorCode : undefined } as any,
          navigate,
          redirectPath
        ) as any
      );

      if (result?.status === "two_factor_required") {
        setRequiresTwoFactor(true);
        toast.success("Authenticator code required for this account");
      }
    } catch (error: any) {
      // Error is already handled in the action
      console.error("Login error:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 px-3 py-8 dark:bg-gray-900">
      <div className="w-full max-w-xl">
        <div className="rounded-lg border border-gray-200 bg-white p-8 shadow-md dark:border-gray-700 dark:bg-gray-800">
          <div className="mb-8 text-center">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Welcome Back
            </h1>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
              Sign in to your account to continue your journey
            </p>
          </div>

          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onSubmit)}
              className="w-full space-y-6"
            >
              <div className="space-y-4">
                <div className="rounded-lg border border-emerald-100 bg-gradient-to-r from-emerald-50 via-white to-amber-50 p-4 dark:border-emerald-900 dark:from-emerald-950/40 dark:via-gray-800 dark:to-amber-950/30">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-emerald-700 dark:text-emerald-300">Fast lane</p>
                  <p className="mt-2 text-sm text-gray-700 dark:text-gray-200">
                    Jump in with your Google account and we&apos;ll connect or create your traveler profile automatically.
                  </p>
                  <Coachmark
                    id="login_google_signin_button"
                    title="New Sign-In Option!"
                    description="Use your Google account to sign in faster and continue with your traveler profile automatically."
                    position="bottom"
                    buttonText="Got it!"
                    className="mt-4"
                  >
                    <GoogleAuthButton mode="signin" />
                  </Coachmark>
                </div>
                <div className="flex items-center gap-3 text-xs uppercase tracking-[0.24em] text-gray-400 dark:text-gray-500">
                  <span className="h-px flex-1 bg-gray-200 dark:bg-gray-700" />
                  <span>Or continue with email</span>
                  <span className="h-px flex-1 bg-gray-200 dark:bg-gray-700" />
                </div>
                <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-900/50">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-gray-500 dark:text-gray-400">Sign-in flow</p>
                  <p className="mt-2 text-sm text-gray-700 dark:text-gray-300">
                    Enter your email and password. If your account has two-factor protection enabled, we'll ask for the live authenticator code before completing sign-in.
                  </p>
                </div>
                <div className="space-y-4">
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
                  <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Password</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Input
                              type={showPassword ? "text" : "password"}
                              className="ring-1 pr-10"
                              disabled={loading}
                              placeholder="Enter your password"
                              autoComplete="current-password"
                              {...field}
                            />
                            <button
                              type="button"
                              onClick={() => setShowPassword((prev) => !prev)}
                              className="absolute right-3 top-1/2 -translate-y-1/2"
                            >
                              {showPassword ? (
                                <EyeOff className="h-4 w-4 text-gray-500" />
                              ) : (
                                <Eye className="h-4 w-4 text-gray-500" />
                              )}
                            </button>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  {requiresTwoFactor && (
                    <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-emerald-700">Two-factor required</p>
                      <p className="mt-2 text-sm text-gray-700">
                        Open your authenticator app and enter the current 6-digit code for this account.
                      </p>
                      <Input
                        type="text"
                        inputMode="numeric"
                        maxLength={6}
                        value={twoFactorCode}
                        onChange={(e) => setTwoFactorCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                        className="mt-4 text-center tracking-[0.38em] ring-1"
                        placeholder="123456"
                      />
                    </div>
                  )}
                </div>
                <div className="flex items-center justify-between">
                  <Link
                    to="/forgot-password"
                    className="text-sm text-emerald-600 hover:text-emerald-700 dark:text-emerald-400"
                  >
                    Forgot password?
                  </Link>
                </div>
                <Button
                  disabled={loading || !form.formState.isValid || (requiresTwoFactor && twoFactorCode.length !== 6)}
                  type="submit"
                  className={`w-full bg-emerald-600 py-2.5 font-medium text-white hover:bg-emerald-700 ${
                    loading ? "cursor-not-allowed" : ""
                  }`}
                >
                  {loading ? (
                    <>
                      <Loader color="#ffffff" size={15} />
                      <span className="ml-2">{requiresTwoFactor ? "Verifying secure sign-in..." : "Signing in..."}</span>
                    </>
                  ) : (
                    requiresTwoFactor ? "Verify and Sign In" : "Sign In"
                  )}
                </Button>
                <div className="text-center text-sm text-gray-600 dark:text-gray-400">
                  Don't have an account?{" "}
                  <Link
                    to="/register"
                    className="font-medium text-emerald-600 hover:text-emerald-700 dark:text-emerald-400"
                  >
                    Sign Up
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

export default LoginCard;
