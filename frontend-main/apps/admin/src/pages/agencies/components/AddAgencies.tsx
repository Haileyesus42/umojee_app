import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { Button } from '../../../common/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '../../../common/ui/form';
import { Input } from '../../../common/ui/input';
import { Loader } from '../../../common/ui/loader';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../../common/ui/select';
import { emailRegex } from '../../../lib/utils';
import { NewAgency } from '../../../types/types';
import { useDispatch } from 'react-redux';
import { createUserData } from '../../../store/setting/settingActions';
import { roles } from '../../../common/data/data';

const formSchema = z.object({
  email: z
    .string()
    .min(1, { message: 'Email is required' })
    .refine(
      (data) => {
        return emailRegex.test(data);
      },
      { message: 'Invalid email number' },
    ),
  name: z.string().min(1, { message: 'Name is required' }),
  role: z.string().min(1, { message: 'Role is required' }),
});

type LevelFormValues = z.infer<typeof formSchema>;

function AddAgencies() {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const form = useForm<LevelFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: '',
      role: 'admin',
      name: '',
    },
  });

  const onSubmit = async (data: NewAgency) => {
    try {
      setLoading(true);
      data.password = '12345678';
      dispatch(createUserData(data) as any);
      setLoading(false);
      form.reset();
    } catch (error: any) {
      if (error.message === 'Please check your email and password.') {
        toast.error('Invalid email or password');
      } else if (
        error.message === 'Network error: Unable to connect to the server.'
      ) {
        toast.error('Network error: Unable to connect to the server');
      } else if (error.message) {
        toast.error(error.message);
      } else {
        toast.error('Something went wrong!');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen mx-2">
      <div className="w-full max-w-xl xl:w-5/12">
        <div className=" bg-white dark:bg-gray-800">
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onSubmit)}
              className="space-y-8 w-full"
            >
              <div className="space-y-4 md:space-y-4">
                <h1 className="text-md font-medium leading-tight tracking-tight text-gray-900 md:text-lg dark:text-white">
                  Add agency
                </h1>

                <div className="space-y-2">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Full Name:</FormLabel>
                        <FormControl>
                          <Input
                            type="text"
                            className="ring-1"
                            {...field}
                            disabled={loading}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div className="space-y-2">
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email:</FormLabel>
                        <FormControl>
                          <Input
                            type="email"
                            className="ring-1"
                            {...field}
                            disabled={loading}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div className="space-y-2">
                  <FormField
                    name="role"
                    control={form.control}
                    render={({ field }) => (
                      <FormItem className="col-span-1">
                        <FormLabel>Role:</FormLabel>
                        <Select
                          disabled={loading}
                          onValueChange={field.onChange}
                          value={field.value.toString()}
                          defaultValue={field.value.toString()}
                        >
                          <FormControl>
                            <SelectTrigger className="ring-1">
                              <SelectValue
                                defaultValue=""
                                placeholder="Select a product"
                              />
                            </SelectTrigger>
                          </FormControl>

                          <SelectContent className="max-h-64 overflow-y-auto">
                            {roles.map((role) => (
                              <SelectItem value={role.value}>
                                {role.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div className="flex space-x-2">
                  <Button
                    disabled={loading}
                    variant={'secondary'}
                    type="button"
                    className={` ${loading ? 'cursor-not-allowed' : ''}`}
                  >
                    {loading && <Loader color="#ffffff" size={15} />}
                    Cancel
                  </Button>
                  <Button
                    disabled={loading}
                    variant={'secondary'}
                    type="submit"
                    className={`bg-red-600 text-white hover:bg-red-600${
                      loading ? 'cursor-not-allowed' : ''
                    }`}
                  >
                    {loading && <Loader color="#ffffff" size={15} />}
                    Add
                  </Button>
                </div>
                <div className="form-group">
                  <div
                    className={'hidden alert alert-success'}
                    role="alert"
                  ></div>
                </div>
              </div>
            </form>
          </Form>
        </div>
      </div>
    </div>
  );
}

export default AddAgencies;
