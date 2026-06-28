"use client";

import * as z from "zod";
import { useForm } from "react-hook-form";
import { Button } from "../ui/button";
import React, { useEffect, useState } from "react";

import toast from "react-hot-toast";
import { DialogFooter } from "../ui/dialog";
import { Separator } from "../ui/separator";
import { Checkbox } from "../ui/checkbox";
import { PermissionTemplate, Role } from "../../types/types";
import { zodResolver } from "@hookform/resolvers/zod";
import { Modal } from "../ui/modal";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "../ui/form";
import { Input } from "../ui/input";
import { useRoleModal } from "../../hooks/use-roles-modal";

interface PermissionProps {
  invoice: Role;
  updated: boolean;
  setUpdated: (updated: boolean) => void;
  authorities: PermissionTemplate[];
}

export const RoleModal: React.FC<PermissionProps> = ({
  invoice,
  updated,
  setUpdated,
  authorities,
}) => {
  const currentDate = new Date().toISOString().split("T")[0];
  const roleModal = useRoleModal();
  const [loading, setLoading] = useState(false);
  const [groupedAuthorities, setGroupedAuthorities] = useState<
    Record<string, PermissionTemplate[]>
  >({});
  const [groupedAuthoritiesUser, setGroupedAuthoritiesUser] = useState<
    Record<string, PermissionTemplate[]>
  >({});

  const formSchema = z.object({
    id: z.number().default(0),
    roleName: z.string().default(""),
    authorities: z.array(
      z.object({
        id: z.number().default(0),
        resource: z.string().default(""),
        action: z.string().default(""),
        description: z.string().default(""),
        authority: z.string().default(""),
      })
    ),
  });
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: invoice
      ? invoice
      : {
          id: 0,
          roleName: "",
          authorities: [],
        },
  });

  const getDefaultValues = () => {
    return invoice
      ? {
          id: invoice.id,
          roleName: invoice.roleName,
          authorities: invoice.authorities,
        }
      : {
          id: 0,
          roleName: "",
          authorities: [],
        };
  };

  const defaultValues = React.useMemo(() => getDefaultValues(), [invoice]);

  React.useEffect(() => {
    const { setValue } = form;
    setValue("roleName", defaultValues?.roleName ?? "");
    setValue("authorities", defaultValues?.authorities ?? []);
  }, [defaultValues]);

  const handleCheckboxSelect = (resource: string, action: string) => {
    const { setValue, getValues } = form;
    const currentPermissions = getValues("authorities");

    // Check if the selected authority already exists
    const existingIndex = currentPermissions.findIndex(
      (auth) => auth.resource === resource && auth.action === action
    );

    if (existingIndex !== -1) {
      // If the authority already exists, remove it
      const updatedPermissions = [...currentPermissions];
      updatedPermissions.splice(existingIndex, 1);
      setValue("authorities", updatedPermissions);
    } else {
      // If the authority doesn't exist, add it with the id from the overall authorities
      const updatedPermissions: any = [
        ...currentPermissions,
        {
          ...authorities.find(
            (auth) => auth.resource === resource && auth.action === action
          ),
        },
      ];

      // Check if the action is "EDIT," "WRITE," or "DELETE" and "READ" is not already included
      const readAction =
        action === "EDIT" || action === "WRITE" || action === "DELETE"
          ? "READ"
          : null;

      if (
        readAction &&
        !currentPermissions.some(
          (auth) => auth.resource === resource && auth.action === readAction
        )
      ) {
        const readPermission = authorities.find(
          (auth) => auth.resource === resource && auth.action === readAction
        );

        if (readPermission) {
          updatedPermissions.push(readPermission);
        }
      }

      setValue("authorities", updatedPermissions);
    }
  };

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      setLoading(true);
     
      setUpdated(!updated);
      toast.success(invoice.id ? "Updated" : "Role Created");
    } catch (error) {
      toast.error("Something went wrong!");
    } finally {
      setLoading(false);
    }
  };
  React.useEffect(() => {
    let isMounted = true;

    const groupAuthorities = async () => {
      setLoading(true);
      try {
        const groupedData: Record<string, PermissionTemplate[]> = {};
        for (const authority of authorities) {
          const { resource } = authority;
          if (!groupedData[resource]) {
            groupedData[resource] = [];
          }
          groupedData[resource].push(authority);
        }

        if (isMounted) {
          setGroupedAuthorities(groupedData);
        }
      } catch (error) {
        console.error("Error grouping authorities", error);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };
    const groupAuthoritiesFromUser = async () => {
      setLoading(true);
      try {
        const groupedData: Record<string, PermissionTemplate[]> = {};
        for (const authority of form.control._formValues.authorities) {
          const { resource } = authority;
          if (!groupedData[resource]) {
            groupedData[resource] = [];
          }
          groupedData[resource].push(authority);
        }

        if (isMounted) {
          setGroupedAuthoritiesUser(groupedData);
        }
      } catch (error) {
        console.error("Error grouping authorities", error);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    groupAuthorities();
    groupAuthoritiesFromUser();

    // Cleanup function
    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <Modal
      title="Role"
      description="Manage roles"
      isOpen={roleModal.isOpen}
      onClose={roleModal.onClose}
    >
      <div className="spaye-y-4 py-2 pb-4 w-[550px]">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <FormField
              name="roleName"
              control={form.control}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Role Name:</FormLabel>
                  <FormControl>
                    <Input placeholder="name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="my-4">
              <Separator />
            </div>
            <div>
              <div>
                <h2 className="text-lg font-semibold mb-2">Role Permissions</h2>
                {Object.entries(groupedAuthorities).map(
                  ([resource, authorities], index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between border-t border-b py-2"
                    >
                      <div>{resource}</div>
                      <div className="flex space-x-5 whitespace-nowrap">
                        {["READ", "WRITE", "EDIT", "DELETE"].map((action) => (
                          <div
                            key={action}
                            className="flex items-center space-x-2"
                          >
                            <Checkbox
                              disabled={
                                invoice.roleName === "SUPER-ADMIN"
                                  ? true
                                  : false
                              }
                              id={`${resource.toLowerCase()}-${action}`}
                              value={action.toLowerCase()}
                              checked={groupedAuthoritiesUser[resource]
                                ?.map((auth) => auth.action === action)
                                .includes(true)}
                              onClick={(e) => {
                                handleCheckboxSelect(resource, action);
                                roleModal.onClose();
                                roleModal.onOpen();
                              }}
                            />
                            <label
                              htmlFor={`${resource.toLowerCase()}-${action}`}
                              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                            >
                              {action.charAt(0).toUpperCase() + action.slice(1)}
                            </label>
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                )}
              </div>
            </div>
            <DialogFooter>
              <div className="pt-6 space-x-2 flex items-center justify-end w-full mt-12">
                <Button
                  // variant="outline"
                  type="button"
                  onClick={roleModal.onClose}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={loading || invoice.roleName === "SUPER-ADMIN"}
                  className="bg-cyan-500"
                >
                  {invoice.id !== 0 ? "Update" : "Add"}
                </Button>
              </div>
            </DialogFooter>
          </form>
        </Form>
      </div>
    </Modal>
  );
};
