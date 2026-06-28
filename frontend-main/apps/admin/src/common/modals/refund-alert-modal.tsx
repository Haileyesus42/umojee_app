'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { Button } from '../ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '../ui/form';
import { Modal } from '../ui/modal';
import { Textarea } from '../ui/textarea';

interface AlertModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (remarks: string, amount?: string) => void;
  loading: boolean;
  amount: string;
  title?: string;
}
const formSchema = z.object({
  remarks: z.string().min(20, 'Remarks must contain at least 20 characters'),
});

export const AlertModal: React.FC<AlertModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  loading,
  amount,
  title,
}) => {
  const [isMounted, setIsMounted] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      remarks: '',
    },
  });

  useEffect(() => {
    setIsMounted(true);
  }, []);
  if (!isMounted) return null;

  const handleFormSubmit = (data: { remarks: string }) => {
    onConfirm(data.remarks, amount);
  };

  return (
    <Modal
      title={title ? title : 'Are you sure?'}
      description="This action cannot be undone."
      isOpen={isOpen}
      onClose={onClose}
    >
      <div className="my-5 text-left">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleFormSubmit)}>
            <FormField
              name="remarks"
              control={form.control}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Remarks:</FormLabel>
                  <FormControl>
                    <Textarea
                      className="w-full"
                      rows={5}
                      placeholder="Enter remarks"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="pt-6 space-x-2 flex items-center justify-end w-96">
              <Button disabled={loading} variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button
                disabled={loading}
                variant="destructive"
                type="submit"
                // onClick={() => onConfirm(form.getValues('remarks'), amount)}
              >
                Continue
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </Modal>
  );
};
