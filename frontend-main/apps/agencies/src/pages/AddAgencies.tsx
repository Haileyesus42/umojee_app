import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import PhoneInput from 'react-phone-input-2';
import { useDispatch } from 'react-redux';
import { z } from 'zod';
import { Button } from '../common/ui/button';
import { agenciesStatuses } from '../common/data/data';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '../common/ui/form';
import { Input } from '../common/ui/input';
import { Loader } from '../common/ui/loader';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../common/ui/select';
import { Textarea } from '../common/ui/textarea';
import { emailRegex } from '../lib/utils';
import { createAgencyData } from '../store/agencies/agencies-extra';
import { useNavigate } from 'react-router-dom';

const formSchema = z.object({
  agencyEmail: z
    .string()
    .min(1, { message: 'Email is required' })
    .refine(
      (data) => {
        return emailRegex.test(data);
      },
      { message: 'Invalid email number' },
    ),
  agencyName: z.string().min(1, { message: 'Name is required' }),
  agencyPhone: z.string().min(1, { message: 'Phone is required' }),
  agencyAddress: z.string().min(1, { message: 'Address is required' }),
  description: z.string().min(1, { message: 'Description is required' }),
  agencyStatus: z.string().min(1, { message: 'Status is required' }),
  totalAgents: z.number().min(0, { message: 'Total Agents is required' }),
  password: z.string().min(1, { message: 'Agency is required' }),
  countryCode: z.string().min(1, 'Country code is required'),
});

type LevelFormValues = z.infer<typeof formSchema>;

function AddAgency() {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const form = useForm<LevelFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      agencyEmail: '',
      agencyName: '',
      agencyAddress: '',
      agencyPhone: '',
      countryCode: '1',
      description: '',
      agencyStatus: 'Active',
      totalAgents: 1,
      password: '12345678'
    },
  });

  const onSubmit = async (data: z.infer<typeof formSchema>) => {
    try {
      setLoading(true);
      data.password = '12345678';
      // data.totalAgents = 1;
      // const fullPhoneNumber = data.countryCode + data.agencyPhone;
      // data.agencyPhone = fullPhoneNumber;
      console.log("Agency form", data);
      dispatch(createAgencyData(data) as any);
      setLoading(false);
      // form.reset();
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
    <main className="min-h-screen mx-2">
      <div className="w-full">
        <div className=" bg-white dark:bg-gray-800">
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onSubmit)}
              className="space-y-8 w-full"
            >
              <div className="space-y-4 md:space-y-4">
                <h1 className="text-md font-medium leading-tight tracking-tight text-gray-900 md:text-lg dark:text-white">
                  Add Agency
                </h1>
                <div className="mb-5 flex flex-col gap-5 sm:grid grid-cols-2 md:grid-cols-3">
                  <div className="space-y-2">
                    <FormField
                      control={form.control}
                      name="agencyName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Agency Name:</FormLabel>
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
                      name="agencyEmail"
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
                  <div className="grid grid-cols-3">
                    <FormField
                      name={`countryCode`}
                      control={form.control}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Country code:</FormLabel>
                          <FormControl className="py-4">
                            <PhoneInput
                              country={'us'}
                              inputStyle={{
                                display: 'none',
                              }}
                              containerStyle={{ width: '100%' }}
                              value={field.value.toString()}
                              onChange={field.onChange}
                              disabled={loading}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="agencyPhone"
                      render={({ field }) => (
                        <FormItem className="col-span-2 hideIncrementor">
                          <FormLabel>Phone:</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
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
                      name="totalAgents"
                      render={({ field }) => (
                        <FormItem className="col-span-2 hideIncrementor">
                          <FormLabel>Total Agents:</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              className="ring-1"
                              {...field}
                              onChange={(e) =>
                                field.onChange(parseInt(e.target.value, 10))
                              }
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
                      name="agencyAddress"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Address:</FormLabel>
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
                      name="agencyStatus"
                      control={form.control}
                      render={({ field }) => (
                        <FormItem className="col-span-1">
                          <FormLabel>Status:</FormLabel>
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
                                  placeholder="Select a role"
                                />
                              </SelectTrigger>
                            </FormControl>

                            <SelectContent className="max-h-64 overflow-y-auto">
                              {agenciesStatuses.map((status) => (
                                <SelectItem value={status.value}>
                                  {status.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <div className="space-y-2 sm:col-span-2 md:col-span-3">
                    <FormField
                      control={form.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Description:</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="Write the description...."
                              rows={4}
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
                </div>
                <div className="flex space-x-2">
                  <Button
                    disabled={loading}
                    variant={'secondary'}
                    type="button"
                    className={` ${loading ? 'cursor-not-allowed' : ''}`}
                    onClick={() => navigate(`/agencies`)}
                  >
                    {loading && <Loader color="#ffffff" size={15} />}
                    Cancel
                  </Button>
                  <Button
                    disabled={loading}
                    variant={'secondary'}
                    type="submit"
                    className={`bg-red-600 text-white hover:bg-red-600${loading ? 'cursor-not-allowed' : ''
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
    </main>
  );
}

export default AddAgency;
