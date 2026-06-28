'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { AnncDataTable } from '../common/ui/announcement-data-table';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from '../common/ui/form';
import { Heading } from '../common/ui/heading';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../common/ui/select';
import {
  AnnouncementTemplate,
  AnnouncementUsersTypes
} from '../constants/interface/announcements';
import { columns } from './announcements/components/columns';

interface AnnouncementProps {
  data: AnnouncementUsersTypes[];
  messages: AnnouncementTemplate[];
}

const formSchema = z.object({
  message: z.string().min(1, 'Message is requred'),
});

const Announcements: React.FC<AnnouncementProps> = ({ data, messages }) => {
  const [loading, setLoading] = useState(false);
  const [selectedMessageType, setSelectedMessageType] =
    useState<AnnouncementTemplate | null>(null);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      message: '',
    },
  });

  return (
    <>
      <div className="flex justify-between border-b pb-2 w-full">
        <Heading
          title={`Users (${data.length})`}
          description="Send Announcement to users"
        />
        <div></div>
        <div>
          <Form {...form}>
            <form>
              <div className="flex w-full md:w-[50%] space-y-3 bg-transparent text-muted-foreground">
                <FormField
                  name="message"
                  control={form.control}
                  render={({ field }) => (
                    <FormItem className="flex items-center space-x-2">
                      <Select
                        disabled={loading}
                        onValueChange={(value) => {
                          field.onChange(value);
                          const selectedMessage = messages.find(
                            (message) => message.templateName === value,
                          );
                          setSelectedMessageType(selectedMessage || null);
                        }}
                        value={field.value.toString()}
                        defaultValue={field.value.toString()}
                      >
                        <FormControl>
                          <SelectTrigger className="ring-1">
                            <SelectValue
                              defaultValue=""
                              placeholder="Select a message"
                            />
                          </SelectTrigger>
                        </FormControl>

                        <SelectContent className="max-h-64 overflow-y-auto">
                          {messages.length > 0 &&
                            messages.map((message) => (
                              <SelectItem
                                value={message.templateName}
                                key={message.templateName}
                              >
                                {message.templateName}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </form>
          </Form>
        </div>
      </div>
      <AnncDataTable
        searchKey="anncUserName"
        clickable={true}
        columns={columns}
        data={data}
        selectedMessageType={selectedMessageType}
      />
    </>
  );
};

export default Announcements;
