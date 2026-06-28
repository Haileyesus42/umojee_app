"use client";

import * as z from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "../ui/button";
import { useEffect, useState } from "react";
import { toast } from "react-hot-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { useUserModal } from "../../hooks/use-user-modal";
import { Role } from "../../types/types";
import { Modal } from "../ui/modal";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "../ui/form";
import { Input } from "../ui/input";

const formSchema = z.object({
  fullName: z.string().min(1),
  email: z.string().default(""),
  password: z.string().default(""),
  roleId: z.string(),
});

export const UserModal = () => {
  const userModal = useUserModal();
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      // const res = await getAllRoles();
      // const data = res instanceof Array ? res : [];
      // setRoles(data);
    };
    fetchData();
  }, []);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      fullName: "",
      email: "",
      password: "",
      roleId: "",
    },
  });

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      setLoading(true);

      // const response = await createUser(values);
      if (true) {
        toast.success("User Created");
        window.location.reload();
      }
      userModal.onClose();
    } catch (error) {
      toast.error("Something went wrong!");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      title="Add User"
      description="Add a new user"
      isOpen={true}
      onClose={userModal.onClose}
    >
      <div className="spaye-y-4 py-2 pb-4 w-96">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <FormField
              name="fullName"
              control={form.control}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Full Name:</FormLabel>
                  <FormControl>
                    <Input placeholder="fullname" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              name="email"
              control={form.control}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email:</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="email" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              name="password"
              control={form.control}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Password:</FormLabel>
                  <FormControl>
                    <Input type="password" placeholder="password" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="roleId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Role:</FormLabel>
                  <Select
                    disabled={loading}
                    onValueChange={field.onChange}
                    value={field.value.toString()}
                    defaultValue={field.value.toString()}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue
                          defaultValue={field.value}
                          placeholder="Select a role"
                        />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {roles
                        .filter((item) => item.roleName !== "SUPER-ADMIN")
                        .map((role) => (
                          <SelectItem
                            key={role.id}
                            value={role.id?.toString() || ""}
                          >
                            {role.roleName}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="pt-6 space-x-2 flex items-center justify-end w-full">
              <Button
                // variant="outline"
                type="button"
                onClick={userModal.onClose}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={loading} className="bg-cyan-500">
                Continue
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </Modal>
  );
};
