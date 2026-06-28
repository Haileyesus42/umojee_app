import { useEffect } from 'react';
import { Route, Routes, useNavigate } from 'react-router-dom';
import PageNotFound from './common/PageNotFound';
import { ProtectedRoute } from './common/ProtectedRoute';
import PageTitle from './components/PageTitle';
import LoginPage from './pages/auth/LoginPage';
import { ROUTES } from './constants/routes';
import { TOKEN } from './constants/general';
import ErrorPage from './pages/ErrorPage';
import Forgotpassword from './pages/auth/ForgotPassword';
import ResetPassword from './pages/auth/ResetPassword';

function App() {
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem(TOKEN);
    if (token) {
      navigate(window.location.pathname, { replace: true });
    }
  }, []);

  return (
    <Routes>
      <Route path="/" element={<ProtectedRoute />}>
        {ROUTES.map(({ title, path, element }, index) => (
          <Route
            key={index}
            path={path}
            element={
              <>
                <PageTitle
                  title={`${title} - | EmojaAirways - Admin Dashboard`}
                />
                {element}
              </>
            }
          />
        ))}
      </Route>
      <Route
        path="/login"
        element={
          <>
            <PageTitle title="Login | EmojaAirways - Admin Dashboard" />
            <LoginPage />
          </>
        }
      />
      <Route
        path="/forgotpassword"
        element={
          <>
            <PageTitle title="Forgot Password | EmojaAirways - Admin Dashboard" />
            <Forgotpassword />
          </>
        }
      />
      <Route
        path="/resetpassword/:token"
        element={
          <>
            <PageTitle title="Reset Password | EmojaAirways - Admin Dashboard" />
            <ResetPassword />
          </>
        }
      />
      <Route
        path="/error"
        element={
          <>
            <PageTitle title="Error | EmojaAirways" />
            <ErrorPage />
          </>
        }
      />
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
}

export default App;
