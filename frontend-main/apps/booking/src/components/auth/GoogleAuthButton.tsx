import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import toast from "react-hot-toast";
import { useDispatch } from "react-redux";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { getLocalStorageValue } from "../../lib/utils";
import { loginUserWithGoogle } from "../../store/auth/authActions";

declare global {
  interface Window {
    google?: {
      accounts: {
        oauth2: {
          initCodeClient: (config: {
            client_id: string;
            scope: string;
            ux_mode: "popup" | "redirect";
            callback: (response: { code?: string; error?: string; error_description?: string }) => void;
          }) => { requestCode: () => void };
        };
      };
    };
  }
}

type GoogleAuthButtonProps = {
  mode: "signin" | "signup";
  className?: string;
};

const GOOGLE_SCRIPT_ID = "google-identity-services";
const GOOGLE_CLIENT_ID = process.env.REACT_APP_GOOGLE_CLIENT_ID || "";

function GoogleGIcon() {
  return (
    <svg aria-hidden="true" className="h-5 w-5" viewBox="0 0 24 24">
      <path fill="#4285F4" d="M21.6 12.23c0-.68-.06-1.33-.17-1.96H12v3.71h5.39a4.61 4.61 0 0 1-2 3.02v2.5h3.24c1.9-1.75 2.97-4.33 2.97-7.27Z" />
      <path fill="#34A853" d="M12 22c2.7 0 4.96-.89 6.61-2.41l-3.24-2.5c-.9.61-2.06.98-3.37.98-2.59 0-4.78-1.75-5.56-4.1H3.09v2.58A10 10 0 0 0 12 22Z" />
      <path fill="#FBBC04" d="M6.44 13.97a6.02 6.02 0 0 1 0-3.94V7.45H3.09a10 10 0 0 0 0 9.1l3.35-2.58Z" />
      <path fill="#EA4335" d="M12 5.93c1.47 0 2.79.5 3.83 1.49l2.87-2.87C16.95 2.92 14.7 2 12 2a10 10 0 0 0-8.91 5.45l3.35 2.58C7.22 7.68 9.41 5.93 12 5.93Z" />
    </svg>
  );
}

export default function GoogleAuthButton({ mode, className = "" }: GoogleAuthButtonProps) {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(false);
  const codeClientRef = useRef<{ requestCode: () => void } | null>(null);

  const redirectPath = useMemo(
    () => location.state?.from?.pathname || getLocalStorageValue("redirectPath") || "/",
    [location.state]
  );
  const inviteToken = searchParams.get("invite") || "";

  const ensureGoogleScript = useCallback(async () => {
    if (window.google?.accounts?.oauth2) return;

    const existingScript = document.getElementById(GOOGLE_SCRIPT_ID) as HTMLScriptElement | null;
    if (existingScript) {
      await new Promise<void>((resolve, reject) => {
        existingScript.addEventListener("load", () => resolve(), { once: true });
        existingScript.addEventListener("error", () => reject(new Error("Failed to load Google sign-in")), { once: true });
      });
      return;
    }

    await new Promise<void>((resolve, reject) => {
      const script = document.createElement("script");
      script.id = GOOGLE_SCRIPT_ID;
      script.src = "https://accounts.google.com/gsi/client";
      script.async = true;
      script.defer = true;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error("Failed to load Google sign-in"));
      document.head.appendChild(script);
    });
  }, []);

  useEffect(() => {
    let cancelled = false;

    const setupGoogleClient = async () => {
      if (!GOOGLE_CLIENT_ID) return;

      try {
        await ensureGoogleScript();
        if (cancelled || !window.google?.accounts?.oauth2) return;

        codeClientRef.current = window.google.accounts.oauth2.initCodeClient({
          client_id: GOOGLE_CLIENT_ID,
          scope: "openid email profile",
          ux_mode: "popup",
          callback: async (response) => {
            if (response.error) {
              setLoading(false);
              toast.error(response.error_description || "Google sign-in was cancelled");
              return;
            }

            if (!response.code) {
              setLoading(false);
              toast.error("Google sign-in did not return an authorization code");
              return;
            }

            try {
              await dispatch(
                loginUserWithGoogle(
                  response.code,
                  navigate,
                  redirectPath,
                  mode === "signin" ? "Signed in with Google" : "Account created with Google",
                  inviteToken || undefined
                ) as any
              );
            } catch (error) {
              console.error("Google auth error:", error);
            } finally {
              setLoading(false);
            }
          },
        });
      } catch (error: any) {
        if (!cancelled) {
          toast.error(error.message || "Google sign-in is unavailable right now");
        }
      }
    };

    setupGoogleClient();

    return () => {
      cancelled = true;
    };
  }, [dispatch, ensureGoogleScript, inviteToken, mode, navigate, redirectPath]);

  const handleClick = () => {
    if (!GOOGLE_CLIENT_ID) {
      toast.error("Google sign-in is not configured for this app");
      return;
    }

    if (!codeClientRef.current) {
      toast.error("Google sign-in is still loading");
      return;
    }

    setLoading(true);
    codeClientRef.current.requestCode();
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={loading || !GOOGLE_CLIENT_ID}
      className={`group flex w-full items-center justify-center gap-3 rounded-md border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-700 shadow-sm transition hover:-translate-y-0.5 hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-700 disabled:cursor-not-allowed disabled:opacity-70 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 dark:hover:border-emerald-500 dark:hover:bg-emerald-950/40 dark:hover:text-emerald-200 ${className}`}
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <GoogleGIcon />}
      <span>{mode === "signin" ? "Sign In with Google" : "Sign Up with Google"}</span>
    </button>
  );
}
