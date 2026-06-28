import { zodResolver } from "@hookform/resolvers/zod";
import axios from "axios";
import { MapPin } from "lucide-react";
import React, { useState } from "react";
import { useForm } from "react-hook-form";
import toast from "react-hot-toast";
import { z } from "zod";
import { Button } from "../../common/ui/button";
import { Card } from "../../common/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "../../common/ui/form";
import { Input } from "../../common/ui/input";
import { Loader } from "../../common/ui/loader";
import { Textarea } from "../../common/ui/textarea";
import DefaultLayout from "../../layout/DefaultLayout";
import { getLocalStorageValue } from "../../lib/utils";

const backendUrl = process.env.REACT_APP_BACKEND_URL;

const formSchema = z.object({
  fullName: z.string().min(1, { message: "Name is required" }),
  email: z.string().min(1, { message: "Emai is required" }),
  message: z.string().min(1, { message: "Message is required" }),
});

const ContactUs = () => {
  const [loading, setLoading] = useState(false);

  const user = getLocalStorageValue("user");

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      fullName: user ? user.firstName + " " + user.lastName : "",
      email: user ? user.email : "",
      message: "",
    },
  });

  const onSubmit = async (data: any) => {
    try {
      setLoading(true);
      console.log(data);
      // Handle form submission
      const response = await axios.post(`${backendUrl}/api/contact`, data, {
        headers: {
          "Content-Type": "application/json",
        },
      });

      const result = await response.data;
      console.log(result);
      toast.success("Successfully sent your request");
    } catch (error) {
      // Handle errors
      console.log(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <DefaultLayout>
      <div className="min-h-[70vh] pt-[5vh] max-w-screen-2xl mx-auto px-1">
        <Card className="flex flex-col lg:flex-row my-2 md:m-10 gap-4">
          <div className="bg-blue-700 text-white p-3 lg:p-4 w-full lg:w-[45%] lg:max-w-1/2 grow rounded-xl md:rounded-l-xl my-2">
            <div className="flex flex-col space-y-2 p-4">
              <h1 className="font-bold text-xl">Get in touch</h1>
              <p className="text-sm text-slate-200">
                We love to hear from you. Our friendly team is always here to
                help
              </p>
            </div>
            <div className="px-4">
              <div className="flex py-5">
                <div className="w-10 h-10 rounded-full bg-white flex justify-center items-center">
                  <MapPin className="w-5 h-5 text-black" />
                </div>
                <div className="pl-5 overflow-hidden">
                  <h1 className="font-semibold">Address</h1>
                  <p className="text-sm text-slate-200 break-words">
                    1 Meadowland Plaza, Rutherford NJ 07073
                  </p>
                </div>
              </div>
              {/* <div className="flex py-5">
                <div className="w-10 h-10 rounded-full bg-white flex justify-center items-center">
                  <Mail className="w-5 h-5 text-black" />
                </div>
                <div className="pl-5 overflow-hidden">
                  <h1 className="font-semibold">Email</h1>
                  <p className="text-sm text-slate-200 break-words">
                    umojaairways@nditsolutions.com
                  </p>
                </div>
              </div> */}
              {/* <div className="flex py-5">
                <div className="w-10 h-10 rounded-full bg-white flex justify-center items-center">
                  <Phone className="w-5 h-5 text-black" />
                </div>
                <div className="pl-5 overflow-hidden">
                  <h1 className="font-semibold">Phone</h1>
                  <p className="text-sm text-slate-200 break-words">
                    +1 2023232323
                  </p>
                </div>
              </div> */}
            </div>
          </div>
          <div className="w-full lg:w-[55%] lg:max-w-1/2 grow">
            <div className="flex  flex-col">
              <div className=" p-5 ">
                <div className="">
                  <h2 className="font-bold py-5">Send Message</h2>
                </div>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)}>
                    <div className="mb-5.5 flex flex-col gap-5 sm:grid grid-cols-2">
                      <FormField
                        name="fullName"
                        control={form.control}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Full Name:</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="Full name"
                                {...field}
                                disabled={loading}
                              />
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
                              <Input
                                type="email"
                                placeholder="Email"
                                {...field}
                                disabled={loading}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        name="message"
                        control={form.control}
                        render={({ field }) => (
                          <FormItem className="col-span-2">
                            <FormLabel>Message:</FormLabel>
                            <FormControl>
                              <Textarea
                                placeholder="Type Your Message"
                                rows={3}
                                {...field}
                                disabled={loading}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <div className="my-5">
                      <Button
                        type="submit"
                        className="bg-cyan-500 hover:bg-cyan-500"
                        disabled={loading}
                      >
                        {loading && <Loader color="#ffffff" size={15} />}
                        Send
                      </Button>
                    </div>
                  </form>
                </Form>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </DefaultLayout>
  );
};

export default ContactUs;
