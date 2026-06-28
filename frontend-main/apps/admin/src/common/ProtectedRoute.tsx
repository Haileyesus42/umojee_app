import { Navigate, Outlet } from 'react-router-dom';
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
  if (pathname === '/error') {
    return <Navigate to={pathname} />;
  } else {
    if (token) {
      const decodedToken = jwtDecode(token);
      const currentTime = new Date().getTime() / 1000;
      if (currentTime >= (decodedToken?.exp ?? 0)) {
        localStorage.removeItem(TOKEN);
        localStorage.removeItem(USER);
        toast.error('User session expired. please log in');
        return <Navigate to="/login" state={{ path: pathname }} />;
      } else {
        const user = localStorage.getItem(USER);
        dispatch(updateUser(user ? JSON.parse(user) : undefined));
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
