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
import { DialogFooter } from "../ui/dialog";
import { usePermissionModal } from "../../hooks/use-permission-modal";
import { Modal } from "../ui/modal";

const formSchema = z.object({
  permissionId: z.string().default(""),
  permissionName: z.string().default(""),
  assignedTo: z.array(z.string()).default([]),
  createdAt: z.string().default(""),
});

interface PermissionProps {
  invoice: {
    permissionId: string;
    permissionName: string;
    assignedTo: string[] | [];
    createdAt: string;
  };
  updated: boolean;
  setUpdated: (updated: boolean) => void;
}

export const PermissionModal: React.FC<PermissionProps> = ({
  invoice,
  updated,
  setUpdated,
}) => {
  const currentDate = new Date().toISOString().split("T")[0];
  const permissionModal = usePermissionModal();
  const [loading, setLoading] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: invoice
      ? invoice
      : {
          permissionId: "",
          permissionName: "",
          assignedTo: [],
          createdAt: currentDate,
        },
  });

  function getDefaultValues() {
    return invoice
      ? {
          permissionId: invoice?.permissionId,
          permissionName: invoice?.permissionName,
          assignedTo: [],
          createdAt: invoice?.createdAt,
        }
      : {
          permissionId: "",
          permissionName: "",
          assignedTo: [],
          createdAt: currentDate,
        };
  }

  const defaultValues = React.useMemo(() => getDefaultValues(), [invoice]);

  React.useEffect(() => {
    const { setValue } = form;
    setValue("permissionName", defaultValues?.permissionName ?? "");
    setValue("assignedTo", []);
    setValue("createdAt", currentDate);
  }, [defaultValues]);

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      setLoading(true);
      const response = invoice.permissionId.length
        ? await fetch("/api/permissions", {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              permissionId: invoice.permissionId,
              permissionName: values.permissionName,
              assignedTo: values.assignedTo,
              createdAt: currentDate,
            }),
          })
        : await fetch("/api/permissions", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(values),
          });
      permissionModal.onClose();
      const data = await response.json();
      setUpdated(!updated);
      toast.success(invoice.permissionId.length ? "Updated" : "Saved");
      return data;
    } catch (error) {
      toast.error("Something went wrong!");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      title="Add New Permission"
      description="Add a new permission for roles"
      isOpen={permissionModal.isOpen}
      onClose={permissionModal.onClose}
    >
      <div className="spaye-y-4 py-2 pb-4 w-[500PX]">
        <div className="my-2 p-2 border rounded bg-red-100">
          <span>
            <span className="block">Warning!</span> By editing or adding the
            permission name, you might break the system permissions
            functionality. Please ensure you're absolutely certain before
            proceeding.
          </span>
        </div>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <FormField
              name="permissionName"
              control={form.control}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Permission Name:</FormLabel>
                  <FormControl>
                    <Input placeholder="name" {...field} />
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
                  onClick={permissionModal.onClose}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={true} className="bg-cyan-500">
                  {invoice.permissionId.length ? "Update" : "Add"}
                </Button>
              </div>
            </DialogFooter>
          </form>
        </Form>
      </div>
    </Modal>
  );
};
