import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
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
import { forgotUserPassword } from '../../store/setting/settingActions';
import { ForgotPasswordProps } from '../../types/types';
import { emailRegex } from '../../lib/utils';

const formSchema = z.object({
  username: z
    .string()
    .min(1, { message: 'Email is required' })
    .refine(
      (data) => {
        return emailRegex.test(data);
      },
      { message: 'Invalid Email' },
    ),
});

function Forgotpassword() {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const dispatch = useAppDispatch();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      username: '',
    },
  });

  const onSubmit = async (data: ForgotPasswordProps) => {
    try {
      setLoading(true);
      dispatch(forgotUserPassword(data.username));
      form.reset();
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
            <span className="text-xl">Forgot Password</span>
          </div>
          <Separator className="my-4" />
          <div className="spaye-y-4 py-2 pb-4">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)}>
                <div className="grid">
                  <FormField
                    name="username"
                    control={form.control}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email:</FormLabel>
                        <FormControl>
                          <Input
                            type="username"
                            placeholder="email"
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

export default Forgotpassword;
