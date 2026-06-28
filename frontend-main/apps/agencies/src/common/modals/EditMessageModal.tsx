import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
// import { useDispatch } from 'react-redux';
import * as z from 'zod';
import { useEditMessageModal } from '../../hooks/use-edit-message-modal';
import { Button } from '../ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '../ui/form';
import { Input } from '../ui/input';
import { Modal } from '../ui/modal';
import { Textarea } from '../ui/textarea';
import { useSelector } from 'react-redux';
import { updateTemplate } from '../../store/announcements/templates-extra';
import { useAppDispatch } from '../../store';

const formSchema = z.object({
  id: z.string(),
  templateName: z.string().min(1, 'Name is requred'),
  templateTitle: z.string().min(1, 'Title is requred'),
  templateBody: z.string().min(1, 'Body is requred'),
});

export const EditMessageModal = () => {
  const editMessageModal = useEditMessageModal();
  const [loading, setLoading] = useState(false);

  const dispatch = useAppDispatch();

  const messages = useSelector(
    (state: any) => state.announcementTemplates.templatesList,
  );
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
  });

  useEffect(() => {
    const id = editMessageModal.defaultValues.id;
    const message = messages.find((message: any) => message._id === id);
    form.reset({
      id,
      templateTitle: message?.templateTitle,
      templateName: message?.templateName,
      templateBody: message?.templateBody,
    });
  }, [editMessageModal.defaultValues]);

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      setLoading(true);
      dispatch(updateTemplate(values));
      form.reset();
      editMessageModal.onClose();
    } catch (error: any) {
      console.log(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <Modal
        title="Update Message"
        description="Update available messages"
        isOpen={editMessageModal.isOpen}
        onClose={editMessageModal.onClose}
        className="z-[101] w-full sm:w-[70%] h-full sm:h-[500px] mt-5 overflow-auto"
      >
        <div className="spaye-y-4 py-2 pb-4 w-full">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)}>
              <div className="flex flex-col md:grid md:gap-4 md:grid-cols-2">
                <FormField
                  name="templateName"
                  control={form.control}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Name:</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  name="templateTitle"
                  control={form.control}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Title:</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  name="templateBody"
                  control={form.control}
                  render={({ field }) => (
                    <FormItem className="col-span-2">
                      <FormLabel>Body:</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Write the body...."
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
                  variant="outline"
                  type="button"
                  onClick={editMessageModal.onClose}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={loading}
                  className="bg-emerald-500 hover:bg-emerald-500"
                >
                  Update
                </Button>
              </div>
            </form>
          </Form>
        </div>
      </Modal>
    </div>
  );
};
