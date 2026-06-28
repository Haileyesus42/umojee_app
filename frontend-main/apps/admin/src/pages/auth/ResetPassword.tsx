import { zodResolver } from '@hookform/resolvers/zod';
import { Eye, EyeOff } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate, useParams } from 'react-router-dom';
import { z } from 'zod';
import { Button } from '../../common/ui/button';
import { Card } from '../../common/ui/card';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '../../common/ui/form';
import { Input } from '../../common/ui/input';
import { Separator } from '../../common/ui/separator';
import { useAppDispatch } from '../../store';
import { resetUserPassword } from '../../store/setting/settingActions';

const formSchema = z
  .object({
    password: z
      .string()
      .min(8, { message: 'Password must be at least 8 characters long' })
      .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+{}|:"<>?~])/, {
        message:
          'Password must contain one lowercase letter, one uppercase letter, one number, and one special character',
      }),
    confirmPassword: z
      .string()
      .min(6, { message: 'Confirm Password is required' }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Password must match',
    path: ['confirmPassword'],
  });

function ResetPassword() {
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();
  const dispatch = useAppDispatch();

  const { token } = useParams();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      password: '',
      confirmPassword: '',
    },
  });

  const onSubmit = async (data: z.infer<typeof formSchema>) => {
    try {
      setLoading(true);
      dispatch(resetUserPassword(data.password, token ?? '', navigate));
      // form.reset();
    } catch (error: any) {
      console.log(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex justify-center items-center h-screen">
      <Card className="p-5 mx-3 md:mx-5 w-full md:w-2/3 lg:w-1/2">
        <div>
          <div className="mb-3 flex items-center justify-between">
            <span className="text-xl">Reset Password</span>
          </div>
          <Separator className="my-4" />
          <div className="spaye-y-4 py-2 pb-4">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)}>
                <div className="grid">
                  <div className="relative">
                    <FormField
                      name="password"
                      control={form.control}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>New Password:</FormLabel>
                          <FormControl>
                            <div className="flex items-center space-x-2">
                              <Input
                                type={showPassword ? 'text' : 'password'}
                                placeholder="new password"
                                {...field}
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
                  <FormField
                    name="confirmPassword"
                    control={form.control}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Confirm Password:</FormLabel>
                        <FormControl>
                          <Input
                            type="password"
                            placeholder="confirm password"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="pt-6 space-x-2 flex items-center justify-end w-full">
                  <Button
                    variant="outline"
                    type="button"
                    disabled={loading}
                    onClick={() => navigate('/login')}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    className="bg-emerald-600 hover:bg-emerald-700"
                    disabled={loading}
                  >
                    Submit
                  </Button>
                </div>
              </form>
            </Form>
          </div>
        </div>
      </Card>
    </div>
  );
}

export default ResetPassword;
