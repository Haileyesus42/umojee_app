import React, { useEffect, useState } from "react";
import { useDispatch } from "react-redux";
import { Route, Routes, useLocation } from "react-router-dom";
import Loader from "./common/Loader";
import PageTitle from "./components/PageTitle";
import {
  fetchFeaturedFlights,
  fetchFlightData,
} from "./store/flight/flightActions";
import { ROUTES } from "./constnats/route";

function App() {
  const [loading, setLoading] = useState<boolean>(true);
  const { pathname } = useLocation();
  const dispatch = useDispatch();
  // const isLoggedIn = getLocalStorageValue("isLoggedIn")
  //   ? getLocalStorageValue("isLoggedIn")
  //   : false;

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  useEffect(() => {
    try {
      setLoading(true);
      dispatch(fetchFlightData() as any);
      dispatch(fetchFeaturedFlights() as any);
      setLoading(false);
    } catch (error) {
      setLoading(false);
    }
  }, []);

  return loading ? (
    <Loader />
  ) : (
    <>
      <Routes>
        {ROUTES.map((route, index) => (
          <Route
            key={index}
            path={route.path}
            element={
              <>
                <PageTitle title={route.title} />
                <route.component />
              </>
            }
            {...(route.exact && { exact: true })}
          />
        ))}
      </Routes>
    </>
  );
}

export default App;
