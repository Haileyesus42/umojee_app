import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import {
  storeLocallyWithExpiry
} from "../../lib/utils";
import { AuthState } from "../../types/types";

const initialState: AuthState = {
  isLoggedIn: false,
  accessToken: null,
};

const AuthSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    tokenLogin(state) {
      state.isLoggedIn = true;
      storeLocallyWithExpiry("isLoggedIn", true);
    },
    login(state, action: PayloadAction<{ accessToken: string }>) {
      state.isLoggedIn = true;
      state.accessToken = action.payload.accessToken;
    },
    logout(state) {
      state.isLoggedIn = false;
      state.accessToken = null;
    },
  },
});

export const { login, logout, tokenLogin } = AuthSlice.actions;
export default AuthSlice.reducer;
