import { zodResolver } from "@hookform/resolvers/zod";
import React, { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import toast from "react-hot-toast";
import { useDispatch } from "react-redux";
import { useNavigate, useParams } from "react-router-dom";
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
import { Textarea } from "../../common/ui/textarea";
import DefaultLayout from "../../layout/DefaultLayout";
import { getLocalStorageValue, storeLocallyWithExpiry } from "../../lib/utils";
import { cancelBookingData } from "../../store/booking/bookingActions";
import { Loader } from "../../common/ui/loader";

const formSchema = z.object({
  purpose: z.string().min(1, { message: "Purpose is required" }),
});

const RefundRequest = () => {
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();
  const dispatch = useDispatch();
  const user = getLocalStorageValue("user");
  const { bookingId } = useParams();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      purpose: "",
    },
  });

  const onSubmit = async (data: z.infer<typeof formSchema>) => {
    try {
      setLoading(true);
      const newData = {
        cancelationReason: data.purpose,
        userId: user.email,
        bookingId,
      };
      dispatch(cancelBookingData(newData, navigate) as any);
    } catch (error) {
      // Handle errors
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!user) {
      toast.error("Please login before continue to profile!", {
        duration: 6000,
      });
      storeLocallyWithExpiry("redirectPath", "/request/refund");
      navigate("/login");
    }
  }, []);

  return (
    <DefaultLayout>
      <Card className="mx-5 my-7">
        <div className="p-7">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)}>
              <div className="mb-5 flex flex-col gap-5 sm:grid grid-cols-2 md:grid-cols-3">
                <div className="sm:col-span-2 md:col-span-3">
                  <FormField
                    name="purpose"
                    control={form.control}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Purpose:</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Write the purpose...."
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
              </div>

              <div className="flex justify-end gap-4 mt-5">
                <Button
                  type="button"
                  variant={"ghost"}
                  onClick={() => navigate("/trip")}
                >
                  Cancel
                </Button>
                <Button type="submit" className="bg-cyan-500 hover:bg-cyan-500">
                  {loading && <Loader color="#ffffff" size={15} />}
                  Send
                </Button>
              </div>
            </form>
          </Form>
        </div>
      </Card>
    </DefaultLayout>
  );
};

export default RefundRequest;
