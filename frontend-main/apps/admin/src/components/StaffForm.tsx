import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { roles } from '../common/data/data';
import { Button } from '../common/ui/button';
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
import { AddStaff } from '../interface/staff';
import { emailRegex } from '../lib/utils';

const formSchema = z.object({
  email: z
    .string()
    .min(1, { message: 'Email is required' })
    .refine((data) => emailRegex.test(data), {
      message: 'Invalid email address',
    }),
  name: z.string().min(1, { message: 'Name is required' }),
  role: z.string().min(1, { message: 'Role is required' }),
});

type FormValues = z.infer<typeof formSchema>;

interface StaffFormProps {
  defaultValues: Partial<FormValues>;
  onSubmit: (data: AddStaff) => void;
  loading: boolean;
  onClose: () => void;
  buttonTitle: string;
}

const StaffForm: React.FC<StaffFormProps> = ({
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
  const handleSubmit = async (data: AddStaff) => {
    const newData = {
      ...defaultValues,
      email: data.email,
      name: data.name,
      role: data.role,
    };
    onSubmit(newData);
    form.reset();
  };

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(handleSubmit)}
        className="space-y-8 w-full"
      >
        <div className="space-y-4 md:space-y-4">
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
                      <SelectValue placeholder="Select a role" />
                    </SelectTrigger>
                  </FormControl>

                  <SelectContent className="max-h-64 overflow-y-auto">
                    {roles.map((role) => (
                      <SelectItem value={role.value}>{role.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
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
              {loading && <Loader color="#ffffff" size={15} />}
              {buttonTitle}
            </Button>
          </div>
        </div>
      </form>
    </Form>
  );
};

export default StaffForm;
