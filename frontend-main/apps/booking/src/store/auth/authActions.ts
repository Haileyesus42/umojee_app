import { Dispatch } from "@reduxjs/toolkit";
import axios from "axios";
import toast from "react-hot-toast";
import { NavigateFunction } from "react-router-dom";
import { cookies } from "../../index";
import { getLocalStorageValue, removeLocalStorageValue, storeLocallyWithExpiry } from "../../lib/utils";
import { LoginProp, SignUpProp } from "../../types/types";
import { login, logout } from "./authSlice";

const backendUrl = process.env.REACT_APP_BACKEND_URL;
const TOKEN_EXPIRY_DAYS = 1;
const TOKEN_KEY = "token";
const USER_KEY = "user";
const IS_LOGGED_IN_KEY = "isLoggedIn";

const setAuthCookies = (token: string) => {
  cookies.set(TOKEN_KEY, token, {
    expires: new Date(Date.now() + TOKEN_EXPIRY_DAYS * 24 * 60 * 60 * 1000),
    secure: true,
    sameSite: 'strict',
    path: '/'
  });
};

const clearAuthCookies = () => {
  cookies.remove(TOKEN_KEY, { path: '/' });
  removeLocalStorageValue(TOKEN_KEY);
  removeLocalStorageValue(USER_KEY);
  removeLocalStorageValue(IS_LOGGED_IN_KEY);
};

const persistAuthenticatedSession = (dispatch: Dispatch, token: string, user: any) => {
  dispatch(login({ accessToken: token }));
  storeLocallyWithExpiry(IS_LOGGED_IN_KEY, true);
  storeLocallyWithExpiry(USER_KEY, user);
  storeLocallyWithExpiry(TOKEN_KEY, token);
  setAuthCookies(token);
};

export const loginUser = (
  credentials: LoginProp,
  navigate: NavigateFunction,
  path: string
) => {
  return async (dispatch: Dispatch) => {
    try {
      const res = await axios.post(
        `${backendUrl}/api/client/auth/login`,
        credentials,
        { 
          headers: { 
            "Content-Type": "application/json",
            "Accept": "application/json"
          }
        }
      );
      const data = await res.data;

      if (data.status === "fail") {
        toast.error(data.message);
        return;
      }

      if (data.status === "success") {
        persistAuthenticatedSession(dispatch, data.token, data.data.user);
        
        // Navigate and show success; homepage will trigger location popup until allowed
        navigate(path, { replace: true });
        toast.success("Welcome back!");
      }
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 
        error.message || 
        "Something went wrong. Please try again.";
      toast.error(errorMessage);
      throw error;
    }
  };
};

export const loginUserWithPassword = (
  credentials: LoginProp,
  navigate: NavigateFunction,
  path: string
) => {
  return async (dispatch: Dispatch) => {
    try {
      const res = await axios.post(
        `${backendUrl}/api/client/auth/login/password`,
        credentials,
        { 
          headers: { 
            "Content-Type": "application/json",
            "Accept": "application/json"
          }
        }
      );
      const data = await res.data;

      if (data.status === "fail") {
        toast.error(data.message);
        return;
      }

      if (data.status === "success") {
        persistAuthenticatedSession(dispatch, data.token, data.data.user);
        
        // Navigate and show success; homepage will trigger location popup until allowed
        navigate(path, { replace: true });
        toast.success("Welcome back!");
        return { status: "success", data };
      }
    } catch (error: any) {
      if (error.response?.data?.code === "TWO_FACTOR_REQUIRED") {
        return {
          status: "two_factor_required",
          message: error.response?.data?.message || "Two-factor code required",
        };
      }

      const errorMessage = error.response?.data?.message || 
        error.message || 
        "Something went wrong. Please try again.";
      toast.error(errorMessage);
      throw error;
    }
  };
};

export const loginUserWithGoogle = (
  code: string,
  navigate: NavigateFunction,
  path: string,
  successMessage: string = "Welcome aboard!",
  inviteToken?: string
) => {
  return async (dispatch: Dispatch) => {
    try {
      const res = await axios.post(
        `${backendUrl}/api/client/auth/login/google`,
        { code, inviteToken },
        {
          headers: {
            "Content-Type": "application/json",
            "Accept": "application/json"
          }
        }
      );
      const data = await res.data;

      if (data.status === "fail") {
        toast.error(data.message);
        return;
      }

      if (data.status === "success") {
        persistAuthenticatedSession(dispatch, data.token, data.data.user);
        navigate(path, { replace: true });
        toast.success(successMessage);
        return { status: "success", data };
      }
    } catch (error: any) {
      const errorMessage = error.response?.data?.message ||
        error.message ||
        "Google sign-in failed. Please try again.";
      toast.error(errorMessage);
      throw error;
    }
  };
};

export const registerUser = (
  credentials: SignUpProp,
  navigate: NavigateFunction,
  // path: string
) => {
  return async (dispatch: Dispatch) => {
    try {
      const res = await axios.post(
        `${backendUrl}/api/client/auth/signup`,
        credentials,
        { 
          headers: { 
            "Content-Type": "application/json",
            "Accept": "application/json"
          }
        }
      );
      const data = await res.data;
      console.log(data, "data from registerUser action");
      console.log(res, "response from registerUser action");
      if (data.status === "fail") {
        toast.error(data.message);
        return;
      }

      if (data.status === "success") {
        // Set auth state
        // dispatch(login({ accessToken: data.token }));
        
        // Store user data
        // storeLocallyWithExpiry(IS_LOGGED_IN_KEY, true);
        storeLocallyWithExpiry(USER_KEY, data.data);
        // storeLocallyWithExpiry(TOKEN_KEY, data.token);
        
        // Set secure cookie
        // setAuthCookies(data.token);
        
        // Navigate and show success
        // navigate(path, { replace: true });
        toast.success("Registered Successfully!");
      }
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 
        error.message || 
        "Something went wrong. Please try again.";
      toast.error(errorMessage);
      throw error;
    }
  };
};

export const verifyOTP = (
  email: string,
  otp: string,
  navigate: NavigateFunction,
  path: string
) => {
  return async (dispatch: Dispatch) => {
    try {
      const res = await axios.post(
        `${backendUrl}/api/client/auth/verify`,
        { email, OTP: otp },
        {
          headers: {
            "Content-Type": "application/json",
            "Accept": "application/json"
          }
        }
      );

      const data = await res.data;

      if (data.status === "success") {
        toast.success("Account verified!");

        // Optionally set login status if backend returns token
        if (data.token && data.data?.user) {
          persistAuthenticatedSession(dispatch, data.token, data.data.user);
        }

        navigate(path, { replace: true });
      } else {
        toast.error(data.message);
      }
    } catch (error: any) {
      const errorMessage =
        error.response?.data?.message || error.message || "OTP verification failed";
      toast.error(errorMessage);
      throw error;
    }
  };
};


export const logoutUser = (navigate: NavigateFunction) => {
  return async (dispatch: Dispatch) => {
    try {
      // Clear all auth data
      clearAuthCookies();
      dispatch(logout());
      
      // Navigate to login
      navigate("/login", { replace: true });
      toast.success("Logged out successfully");
    } catch (error: any) {
      toast.error("Error during logout. Please try again.");
      console.error("Logout error:", error);
    }
  };
};

export const updateUserData = (data: any) => {
  return async (dispatch: Dispatch) => {
    try {
      const token = getLocalStorageValue(TOKEN_KEY);
      if (!token) {
        toast.error("Authentication required");
        return;
      }

      const res = await axios.patch(
        `${backendUrl}/api/client/user/updateMe`,
        data,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
            "Accept": "application/json"
          },
        }
      );

      const newData = await res.data;
      if (newData.status !== "success") {
        toast.error(newData.message);
        return;
      }

      // Update user data in storage
      storeLocallyWithExpiry(USER_KEY, newData.data);
      dispatch(login({ accessToken: token }));
      toast.success("Profile updated successfully");
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 
        "Failed to update profile. Please try again.";
      toast.error(errorMessage);
    }
  };
};

export const generateToken = (email: string) => {
  return async (dispatch: Dispatch) => {
    try {
      const res = await axios.post(
        `${backendUrl}/api/client/auth/generate-otp`,
        { email },
        { headers: { "Content-Type": "application/json" } }
      );

      if (res.status === 200) {
        toast.success("OTP has been sent to your email!");
      }
      return res;
    } catch (error: any) {
      toast.error(error.response.data);
    }
  };
};

export const UpdateProfileImage = (newData: {
  photo: File;
  userId: string;
}) => {
  return async (dispatch: Dispatch) => {
    try {
      const token = getLocalStorageValue(TOKEN_KEY);
      if (!token) {
        toast.error("Authentication required");
        return;
      }

      const formData = new FormData();
      formData.append("photo", newData.photo);

      const { status, data } = await axios.put(
        `${backendUrl}/api/client/user/avatar/${newData.userId}/photo`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "multipart/form-data"
          }
        }
      );
      
      if (status === 200) {
        const userData = getLocalStorageValue(USER_KEY);
        if (userData) {
          userData.photo = data.data.clientUser.photo;
          storeLocallyWithExpiry(USER_KEY, userData);
        }
        toast.success(data.message ?? "Profile image updated successfully");
        return data.data.clientUser.photo;
      }
      
      toast.error("Failed to update profile image");
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 
        "Failed to update profile image. Please try again.";
      toast.error(errorMessage);
    }
  };
};
