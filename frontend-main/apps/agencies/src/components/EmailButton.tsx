"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Mail, SendHorizonal } from "lucide-react";
import * as React from "react";
import { Form, FormProvider, useForm } from "react-hook-form";
import toast from "react-hot-toast";
import { z } from "zod";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "../common/ui/command";
import {
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "../common/ui/form";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "../common/ui/popover";
// import ReactQuill from "react-quill";
// const ReactQuill = dynamic(() => import("react-quill"), { ssr: false });
import "react-quill/dist/quill.snow.css";
import { Button } from "../common/ui/button";
import { Input } from "../common/ui/input";
import { cn } from "../lib/utils";
import { EmailTemplate } from "../types/types";

const formSchema = z.object({
  id: z.string().default(""),
  title: z.string().default(""),
  subject: z.string().default(""),
  body: z.string().default(""),
});

export function EmailButton({ customers }: any) {
  const methods = useForm();
  const [open, setOpen] = React.useState(false);
  const [value, setValue] = React.useState("");
  const isOtherSelected = value.length > 0;
  const [selectedLabel, setSelectedLabel] = React.useState<
    EmailTemplate | undefined
  >(undefined);

  const [selectedEmail, setSelectedEmail] = React.useState<EmailTemplate>({
    id: "",
    title: "",
    subject: "",
    body: "",
  });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: selectedEmail
      ? selectedEmail
      : {
          id: "",
          title: "",
          subject: "",
          body: "",
        },
  });
  function getDefaultValues() {
    return selectedEmail
      ? {
          title: selectedEmail.title,
          body: selectedEmail.body,
          subject: selectedEmail.subject,
        }
      : {
          id: "",
          title: "",
          subject: "",
          body: "",
        };
  }

  const defaultValues = React.useMemo(
    () => getDefaultValues(),
    [selectedEmail]
  );

  React.useEffect(() => {
    const { setValue } = form;
    setValue(
      "title",
      defaultValues?.title
        ? defaultValues?.title === "other"
          ? ""
          : defaultValues.title
        : ""
    );
    setValue("subject", defaultValues?.subject ?? "");
    setValue("body", defaultValues?.body ?? "");
  }, [defaultValues]);

  const [emails, setEmails] = React.useState<EmailTemplate[]>([]);

  React.useEffect(() => {
    const fetchData = async () => {
      const res = await fetch("/api/emails");
      if (!res.ok) {
        throw new Error(`Request failed with status: ${res.status}`);
      }
      const responseData = await res.json();
      const data = responseData instanceof Array ? responseData : [];
      setEmails(data);
    };
    fetchData();
  }, []);

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      customers.map(async (customer: any) => {
        const emailDataToSend = {
          to: customer.original.email,
          name: customer.original.fullName,
          subject: values.subject,
          title: values.title,
          body: values.body,
          userId: btoa(customer.original.id),
          phoneNumber: customer.original.phone,
          motherName: customer.original.motherName,
          gender: customer.original.sex,
          initialDeposit: customer.original.initialDeposit,
          monthlyIncome: customer.original.monthlyIncome,
          occupation: customer.original.occupation,
          branch: customer.original.branch,
          accountType: customer.original.accountType,
          city: customer.original.city,
          state: customer.original.state,
        };
        try {
          const response = await fetch("/api/sendemail", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(emailDataToSend),
          });
          if (response.ok) {
          } else {
            console.error("Error sending email:", await response.json());
          }
        } catch (error) {
          console.error("Network error:", error);
        }
      });
      setOpen(false);
      toast.success(`email sent to ${customers.length} customers`);
      // form.reset();
    } catch (error) {
      toast.error("Something went wrong");
    }
  };

  React.useEffect(() => {
    const foundEmail = emails.find(
      (email) => email.title.toLowerCase() === value.toLowerCase()
    );

    if (value.length > 0 && foundEmail) {
      setSelectedLabel(foundEmail);
    } else {
      // Handle the case when no matching email is found or value is empty
      setSelectedLabel(undefined); // or provide a default value
    }
  }, [value]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-[200px] justify-between overflow-hidden"
          onClick={() => setValue("")}
        >
          {value &&
            (emails.find((framework) => framework.title === value)?.title ||
              selectedLabel?.title)}
          {!value && "Email"}
          <Mail className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[450px] p-0 mr-7">
        <Command>
          {value.length === 0 && <CommandInput placeholder="Search email..." />}
          {value.length === 0 && <CommandEmpty>No email found.</CommandEmpty>}
          {isOtherSelected ? (
            <FormProvider {...methods}>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)}>
                  <div className="m-1">
                    <div className="m-1">
                      <FormField
                        name="title"
                        control={form.control}
                        render={({ field }) => (
                          <FormItem>
                            <FormControl>
                              <Input placeholder="Email Title" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <div className="m-1">
                      <FormField
                        name="subject"
                        control={form.control}
                        render={({ field }) => (
                          <FormItem>
                            <FormControl>
                              <Input placeholder="Subject" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <div className="m-1">
                      <FormField
                        name="body"
                        control={form.control}
                        render={({ field }) => (
                          <FormItem>
                            <FormControl>
                              {/* <Textarea
                                placeholder="Type your body here..."
                                rows={7}
                                {...field}
                              /> */}
                              {/* <ReactQuill
                                theme="snow"
                                style={{
                                  height: "160px",
                                  // width: "620px",
                                  fontFamily: "Arial, sans-serif",
                                }}
                                modules={{
                                  toolbar: [
                                    [{ font: [] }],
                                    [{ header: [1, 2, 3] }],
                                    ["bold", "italic", "underline", "strike"],
                                    [{ color: [] }, { background: [] }],
                                    [{ script: "sub" }, { script: "super" }],
                                    ["blockquote", "code-block"],
                                    [{ list: "ordered" }, { list: "bullet" }],
                                    [
                                      { indent: "-1" },
                                      { indent: "+1" },
                                      { align: [] },
                                    ],
                                    ["link", "image", "video"],
                                    ["clean"],
                                  ],
                                }}
                                {...field}
                              /> */}
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <div className="w-full flex space-x-2 mt-24">
                      <Button
                        onClick={() => {
                          setValue("");
                          // setOpen(false);
                        }}
                        size="sm"
                        variant="outline"
                        className="w-full mt-1"
                      >
                        Cancel
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => onSubmit(form.getValues())}
                        className="w-full mt-1 bg-cyan-500 hover:bg-cyan-600"
                      >
                        Send <SendHorizonal className="ml-2" size={15} />
                      </Button>
                    </div>
                  </div>
                </form>
              </Form>
            </FormProvider>
          ) : (
            <CommandGroup>
              {emails.map((framework) => (
                <CommandItem
                  key={framework.id}
                  value={framework.title}
                  onSelect={(currentValue:any) => {
                    setSelectedEmail(framework);
                    setValue(currentValue === value ? "" : currentValue);
                    setOpen(value.length ? false : true);
                  }}
                >
                  <div className="flex justify-between items-center w-full">
                    {framework.title}
                    <SendHorizonal className={cn("mr-2 h-4 w-4")} />
                  </div>
                </CommandItem>
              ))}
              <CommandItem
                key={1252525252525}
                value="other"
                onSelect={(currentValue:any) => {
                  setSelectedEmail({
                    id: "",
                    title: "other",
                    body: "",
                    subject: "",
                  });
                  setValue(currentValue === value ? "" : currentValue);
                  setOpen(value.length ? false : true);
                }}
              >
                <div className="flex justify-between items-center w-full">
                  Other
                  <SendHorizonal className={cn("mr-2 h-4 w-4")} />
                </div>
              </CommandItem>
            </CommandGroup>
          )}
        </Command>
      </PopoverContent>
    </Popover>
  );
}
