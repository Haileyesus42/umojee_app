import { Navigate, Outlet } from 'react-router-dom';
import { useEffect } from 'react';
import { jwtDecode } from 'jwt-decode';
import toast from 'react-hot-toast';
import DefaultLayout from '../layout/DefaultLayout';
import { TOKEN, USER } from '../constants/general';
import { useAppDispatch } from '../store';
import { updateUser } from '../store/setting/settingSlice';

export const ProtectedRoute = () => {
  const dispatch = useAppDispatch();
  const pathname = window.location.pathname;
  const token = localStorage.getItem(TOKEN);
  const decodedToken: { exp?: number } | undefined = token
    ? (jwtDecode(token) as { exp?: number })
    : undefined;
  const isExpired = token
    ? new Date().getTime() / 1000 >= (decodedToken?.exp ?? 0)
    : false;

  useEffect(() => {
    if (token && !isExpired) {
      const user = localStorage.getItem(USER);
      dispatch(updateUser(user ? JSON.parse(user) : undefined));
    }
  }, [dispatch, token, isExpired]);
  if (pathname === '/error') {
    return <Navigate to={pathname} />;
  } else {
    if (token) {
      if (isExpired) {
        localStorage.removeItem(TOKEN);
        localStorage.removeItem(USER);
        toast.error('User session expired. please log in');
        return <Navigate to="/login" state={{ path: pathname }} />;
      } else {
        return (
          <DefaultLayout>
            <Outlet />
          </DefaultLayout>
        );
      }
    }
    return <Navigate to="/login" state={{ path: pathname }} />;
  }
};
