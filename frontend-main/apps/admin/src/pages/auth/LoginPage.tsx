import { zodResolver } from '@hookform/resolvers/zod';
import { Eye, EyeOff } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'react-hot-toast';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { Button } from '../../common/ui/button';
import { Checkbox } from '../../common/ui/checkbox';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '../../common/ui/form';
import { Input } from '../../common/ui/input';
import { Loader } from '../../common/ui/loader';
import { Login } from '../../types/types';
import { authenticate } from '../../store/setting/settingActions';
import { useAppDispatch, useAppSelector } from '../../store';
import { AxiosError } from 'axios';
import { TOKEN } from '../../constants/general';

const formSchema = z.object({
  email: z.string().min(1, 'Email is required'),
  password: z.string().min(1, 'Password is required'),
});

type LevelFormValues = z.infer<typeof formSchema>;

function LoginCard() {
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const location = useLocation();
  const user = useAppSelector((state) => state.setting.user);
  const redirectPath = location.state?.path ?? '/';

  useEffect(() => {
    const token = localStorage.getItem(TOKEN);
    if (token) {
      navigate(redirectPath, { replace: true });
    }
  }, [user]);

  const form = useForm<LevelFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const onSubmit = async (data: Login) => {
    try {
      setLoading(true);
      await dispatch(authenticate(data));
      setLoading(false);
    } catch (error) {
      const errors = error as AxiosError;
      if (errors.message === 'Please check your username and password.') {
        toast.error('Invalid username or password');
      } else {
        toast.error('Something went wrong!');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex items-center justify-center min-h-screen mx-2">
      <div className="w-full max-w-xl mt-8 xl:w-5/12">
        {/* <div>here{searchParams?.message && <h2>{searchParams.message}</h2>}</div> */}
        <div className="p-6 bg-white rounded shadow border border-gray-100 sm:p-10 dark:bg-gray-800">
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onSubmit)}
              className="space-y-8 w-full"
            >
              <div className="space-y-4 md:space-y-4">
                <h1 className="text-xl font-medium text-muted-foreground leading-tight tracking-tight text-gray-900 md:text-2xl dark:text-white">
                  Sign in to your account
                </h1>
                <div className="space-y-2">
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email:</FormLabel>
                        <FormControl>
                          <Input
                            type="text"
                            className="ring-1"
                            // placeholder="johndoe@example.com"
                            disabled={loading}
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div className="space-y-2 relative">
                  <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Password:</FormLabel>
                        <FormControl>
                          <div className="flex items-center space-x-2">
                            <Input
                              type={showPassword ? 'text' : 'password'}
                              className="ring-1"
                              {...field}
                              disabled={loading}
                            />
                            <span
                              className="absolute right-1"
                              onClick={() => setShowPassword(!showPassword)}
                            >
                              {showPassword ? (
                                <EyeOff height={20} />
                              ) : (
                                <Eye height={20} />
                              )}
                            </span>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Checkbox id="terms" />
                    <label
                      htmlFor="terms"
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      Remember me
                    </label>
                  </div>
                  <Link
                    to={'/forgotpassword'}
                    className="text-sm font-medium text-picton-blue-500 hover:underline dark:text-picton-blue-500"
                  >
                    Forgot password?
                  </Link>
                </div>
                <Button
                  disabled={loading}
                  type="submit"
                  className={`w-full text-white bg-emerald-600 hover:bg-emerald-700 ${
                    loading ? 'cursor-not-allowed' : ''
                  }`}
                >
                  {loading && (
                    <span className="mr-2">
                      {' '}
                      <Loader color="#ffffff" size={15} />
                    </span>
                  )}
                  SIGN IN
                </Button>
              </div>
            </form>
          </Form>
        </div>
      </div>
    </main>
  );
}

export default LoginCard;
