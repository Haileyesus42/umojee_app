import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { useDispatch } from 'react-redux';
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
import { Modal } from '../../../common/ui/modal';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../../common/ui/select';
import { NewStaff } from '../../../constants/interface/staff';
import { emailRegex } from '../../../lib/utils';
import { createUserData } from '../../../store/setting/settingActions';
import { updateShowNewStaffModal } from '../../../store/staffs/staff-slice';
import { roles } from '../../../common/data/data';

const formSchema = z.object({
  email: z
    .string()
    .min(1, { message: 'Email is required' })
    .refine(
      (data) => {
        return emailRegex.test(data);
      },
      { message: 'Invalid email' },
    ),
  name: z.string().min(1, { message: 'Name is required' }),
  role: z.string().min(1, { message: 'Role is required' }),
});

type LevelFormValues = z.infer<typeof formSchema>;

function NewStaffModal() {
  const [loading, setLoading] = useState(false);
  const dispatch = useDispatch();

  const form = useForm<LevelFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: '',
      role: 'admin',
      name: '',
    },
  });

  const onSubmit = async (data: NewStaff) => {
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
    <Modal
      title="Add staff"
      description=""
      isOpen={true}
      onClose={() => dispatch(updateShowNewStaffModal(false))}
      className="z-[101] w-full sm:w-[70%] h-full sm:h-[400px] mt-5"
    >
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
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
                        <SelectValue
                          defaultValue=""
                          placeholder="Select a role"
                        />
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
            <div className="flex items-center justify-center gap-4 self-center">
              <Button
                disabled={loading}
                variant={'secondary'}
                type="button"
                className={` ${loading ? 'cursor-not-allowed' : ''}`}
                onClick={() => dispatch(updateShowNewStaffModal(false))}
              >
                {loading && <Loader color="#ffffff" size={15} />}
                Cancel
              </Button>
              <Button
                disabled={loading}
                variant={'secondary'}
                type="submit"
                className={`bg-emerald-600 text-white hover:bg-emerald-600${
                  loading ? 'cursor-not-allowed' : ''
                }`}
              >
                {loading && <Loader color="#ffffff" size={15} />}
                Add
              </Button>
            </div>
          </div>
        </form>
      </Form>
    </Modal>
  );
}

export default NewStaffModal;
