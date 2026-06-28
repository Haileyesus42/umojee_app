import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import PhoneInput from 'react-phone-input-2';
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
import { NewAgency } from '../constants/interface/agencies';

const formSchema = z.object({
  agencyEmail: z
    .string()
    .min(1, { message: 'Email is required' })
    .refine((data) => emailRegex.test(data), {
      message: 'Invalid email address',
    }),
  agencyName: z.string().min(1, { message: 'Name is required' }),
  agencyPhone: z.string().min(1, { message: 'Phone is required' }),
  agencyAddress: z.string().min(1, { message: 'Address is required' }),
  description: z.string().min(1, { message: 'Description is required' }),
  agencyStatus: z.string().min(1, { message: 'Status is required' }),
  totalAgents: z.number().min(1, { message: 'Total agents is required' }),
});

type FormValues = z.infer<typeof formSchema>;

interface AgencyFormProps {
  defaultValues: Partial<FormValues>;
  onSubmit: (data: NewAgency) => void;
  loading: boolean;
  onClose: () => void;
  buttonTitle: string;
}

const AddAgencyForm: React.FC<AgencyFormProps> = ({
  defaultValues,
  onSubmit,
  loading,
  onClose,
  buttonTitle,
}) => {
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues,
  });

  const handleSubmit = async (data: NewAgency) => {
    onSubmit(data);
    form.reset();
  };

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(handleSubmit)}
        className="space-y-8 w-full"
      >
        <div className="mb-5 flex flex-col gap-5 sm:grid grid-cols-2 md:grid-cols-3">
          <FormField
            name="agencyName"
            control={form.control}
            render={({ field }) => (
              <FormItem>
                <FormLabel>Full Name:</FormLabel>
                <FormControl>
                  <Input {...field} disabled={loading} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            name="agencyEmail"
            control={form.control}
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email:</FormLabel>
                <FormControl>
                  <Input type="email" {...field} disabled={loading} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            name="agencyPhone"
            control={form.control}
            render={({ field }) => (
              <FormItem className=" hideIncrementor">
                <FormLabel>Phone:</FormLabel>
                <FormControl>
                  <Input type="number" {...field} disabled={loading} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            name="totalAgents"
            control={form.control}
            render={({ field }) => (
              <FormItem className="hideIncrementor">
                <FormLabel>Total Agents:</FormLabel>
                <FormControl>
                  <Input
                    type="number"
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
          <FormField
            name="agencyAddress"
            control={form.control}
            render={({ field }) => (
              <FormItem>
                <FormLabel>Address:</FormLabel>
                <FormControl>
                  <Input type="text" {...field} disabled={loading} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
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
                    <SelectTrigger>
                      <SelectValue placeholder="Select a status" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {agenciesStatuses.map((status) => (
                      <SelectItem key={status.value} value={status.value}>
                        {status.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            name="description"
            control={form.control}
            render={({ field }) => (
              <FormItem className="sm:col-span-2 md:col-span-3">
                <FormLabel>Description:</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Write the description...."
                    rows={4}
                    {...field}
                    disabled={loading}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <div className="pt-6 space-x-2 flex items-center justify-center w-full">
          <Button
            variant={'secondary'}
            type="button"
            onClick={() => {
              form.reset();
              onClose();
            }}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={loading}
            variant={'secondary'}
            className={`bg-emerald-600 text-white hover:bg-emerald-600${
              loading ? 'cursor-not-allowed' : ''
            }`}
          >
            {loading && <Loader color="#ffffff" size={15} />} {buttonTitle}
          </Button>
        </div>
      </form>
    </Form>
  );
};

export default AddAgencyForm;
