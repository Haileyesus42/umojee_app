import React from "react";
import ReactDOM from "react-dom/client";
import "./global.css";
import App from "./App";
import { BrowserRouter as Router } from "react-router-dom";
import store from "./store";
import Cookies from "universal-cookie";
import { Provider } from "react-redux";
import { ToasterProvider } from "./lib/toast-provider";
import { NotificationCenterProvider } from "./context/NotificationCenterContext";

export const cookies = new Cookies();

const root = ReactDOM.createRoot(
  document.getElementById("root") as HTMLElement
);
root.render(
  <Provider store={store}>
    <ToasterProvider />
    <Router>
      <NotificationCenterProvider>
        <App />
      </NotificationCenterProvider>
    </Router>
  </Provider>
);
