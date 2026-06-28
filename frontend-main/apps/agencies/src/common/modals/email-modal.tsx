"use client";

import * as z from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "../ui/form";
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import React, { useState } from "react";
import toast from "react-hot-toast";
// import ReactQuill from "react-quill";
// const ReactQuill = dynamic(() => import("react-quill"), { ssr: false });
import "react-quill/dist/quill.snow.css";
import { DialogFooter } from "../ui/dialog";
import { useEmailModal } from "../../hooks/use-email-modal";
import { Modal } from "../ui/modal";
// import dynamic from "next/dynamic";

const formSchema = z.object({
  id: z.string().default(""),
  title: z.string().default(""),
  subject: z.string().default(""),
  body: z.string().default(""),
});

interface EmailProps {
  invoice: {
    id: string;
    title: string;
    body: string;
    subject: string;
  };
  updated: boolean;
  setUpdated: (updated: boolean) => void;
}

export const EmailModal: React.FC<EmailProps> = ({
  invoice,
  updated,
  setUpdated,
}) => {
  const emailModal = useEmailModal();
  const [loading, setLoading] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: invoice
      ? invoice
      : {
          id: "",
          title: "",
          subject: "",
          body: "",
        },
  });

  function getDefaultValues() {
    return invoice
      ? {
          id: invoice?.id,
          title: invoice?.title,
          body: invoice?.body,
          subject: invoice?.subject,
        }
      : {
          id: "",
          title: "",
          subject: "",
          body: "",
        };
  }

  const defaultValues = React.useMemo(() => getDefaultValues(), [invoice]);

  React.useEffect(() => {
    const { setValue } = form;
    setValue("title", defaultValues?.title ?? "");
    setValue("subject", defaultValues?.subject ?? "");
    setValue("body", defaultValues?.body ?? "");
  }, [defaultValues]);

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      setLoading(true);
      const response = invoice.id.length
        ? await fetch("/api/emails", {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              id: invoice.id,
              subject: values.subject,
              title: values.title,
              body: values.body,
            }),
          })
        : await fetch("/api/emails", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(values),
          });
      emailModal.onClose();
      const data = await response.json();
      setUpdated(!updated);
      toast.success(invoice.id.length ? "Updated" : "Saved");
      return data;
    } catch (error) {
      toast.error("Something went wrong!");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      title="Add Email Format"
      description="Add a new email format"
      isOpen={emailModal.isOpen}
      onClose={emailModal.onClose}
    >
      <div className="spaye-y-4 py-2 pb-4">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <FormField
              name="title"
              control={form.control}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email Title:</FormLabel>
                  <FormControl>
                    <Input placeholder="email title" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              name="subject"
              control={form.control}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Subject:</FormLabel>
                  <FormControl>
                    <Input placeholder="subject" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              name="body"
              control={form.control}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email Body:</FormLabel>
                  <FormControl>
                    {/* <Textarea placeholder="email body" rows={7} {...field} /> */}
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
                          [{ indent: "-1" }, { indent: "+1" }, { align: [] }],
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
            <DialogFooter>
              <div className="pt-6 space-x-2 flex items-center justify-end w-full mt-12">
                <Button
                  // variant="outline"
                  type="button"
                  onClick={emailModal.onClose}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={loading}
                  className="bg-cyan-500"
                >
                  {invoice.id.length ? "Update" : "Add"}
                </Button>
              </div>
            </DialogFooter>
          </form>
        </Form>
      </div>
    </Modal>
  );
};
