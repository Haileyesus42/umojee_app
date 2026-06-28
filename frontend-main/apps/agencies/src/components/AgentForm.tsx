import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { agentRoles, agentsStatuses } from '../common/data/data';
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
import { Textarea } from '../common/ui/textarea';
import { emailRegex } from '../lib/utils';
// import { AddAgent } from '../types/types';
// import { Agenciees } from '../constants/interface/agencies';
import { Agents } from '../constants/interface/agents';

const formSchema = z.object({
  _id: z.string(),
  agentsEmail: z
    .string()
    .min(1, { message: 'Email is required' })
    .refine((data) => emailRegex.test(data), {
      message: 'Invalid email address',
    }),
  agentsName: z.string().min(1, { message: 'Name is required' }),
  agentsPhone: z.string().min(1, { message: 'Phone is required' }),
  agentsAddress: z.string().min(1, { message: 'Address is required' }),
  // agentsTeam: z.string().min(1, { message: 'Team is required' }),
  description: z.string().min(1, { message: 'Description is required' }),
  agentsStatus: z.string().min(1, { message: 'Status is required' }),
  agentsRole: z.string().min(1, { message: "Agent's role is required" }),
  // agentsAgency: z.string().min(1, { message: 'Agency is required' }),
  createdAt: z.string(),
  updatedAt: z.string(),
});

type FormValues = z.infer<typeof formSchema>;

interface AgentFormProps {
  defaultValues: Partial<FormValues>;
  onSubmit: (data: Agents) => void;
  loading: boolean;
  onClose: () => void;
  buttonTitle: string;
  // agenciesList: Agenciees[];
}

const AgentForm: React.FC<AgentFormProps> = ({
  defaultValues,
  onSubmit,
  loading,
  onClose,
  buttonTitle,
  // agenciesList,
}) => {
  // defaultValues.agentsTeam = defaultValues.agentsTeam || '';
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues,
  });

  const handleSubmit = async (data: Agents) => {
    onSubmit(data);
    form.reset();
  };

  // const activeAgencies = agenciesList.filter(
  //   (agency) => agency.agencyStatus === 'Active',
  // );

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(handleSubmit)}
        className="space-y-8 w-full"
      >
        <div className="mb-5 flex flex-col gap-5 sm:grid grid-cols-2 md:grid-cols-3">
          <FormField
            name="agentsName"
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
            name="agentsEmail"
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
            name="agentsPhone"
            control={form.control}
            render={({ field }) => (
              <FormItem className="hideIncrementor">
                <FormLabel>Phone:</FormLabel>
                <FormControl>
                  <Input type="number" {...field} disabled={loading} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            name="agentsAddress"
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
          {/* <FormField
            name="agentsAgency"
            control={form.control}
            render={({ field }) => (
              <FormItem className="col-span-1">
                <FormLabel>Agents Agency:</FormLabel>
                <Select
                  disabled={loading}
                  onValueChange={field.onChange}
                  value={field.value.toString()}
                  defaultValue={field.value.toString()}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a agency" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value={'Self'}>Self</SelectItem>
                    {activeAgencies.map((agency) => (
                      <SelectItem
                        key={agency._id}
                        value={agency._id}
                      >
                        {agency.agencyName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          /> */}
          {/* <FormField
            name="agentsTeam"
            control={form.control}
            render={({ field }) => (
              <FormItem className="col-span-1">
                <FormLabel>Team:</FormLabel>
                <Select
                  disabled={loading}
                  onValueChange={field.onChange}
                  value={field.value.toString()}
                  defaultValue={field.value.toString()}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a team" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {agentTeams.map((team) => (
                      <SelectItem key={team.value} value={team.value}>
                        {team.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          /> */}
          <FormField
            name="agentsRole"
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
                    <SelectTrigger>
                      <SelectValue placeholder="Select a role" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {agentRoles.map((role) => (
                      <SelectItem key={role.value} value={role.value}>
                        {role.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            name="agentsStatus"
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
                    {agentsStatuses.map((status) => (
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

export default AgentForm;
