"use client";

import { Download } from "lucide-react";
import React from "react";
import { useDispatch } from "react-redux"; // Import useDispatch hook
import { Button } from "../common/ui/button";
import { Heading } from "../common/ui/heading";
import ExportDataToExcel from "./flights/components/ExportFlightDataToExcel";
import { Booking } from "../types/types";
import { columns } from "./bookings/components/columns";
import { DataTable } from "../common/ui/data-table";
import { deleteBookings } from "../store/booking/booking-extra"; // Import deleteBookings action

interface BookingProps {
  data: Booking[];
}

const Bookings: React.FC<BookingProps> = ({ data }) => {
  // const userAuthorities = localStorage.getItem("authorities");
  const dispatch = useDispatch(); // Initialize the useDispatch hook

  const deleteSelectedData = async (selectedData: Booking[]) => {
    const ids = selectedData.map((booking) => booking.id); // Extract the IDs of the selected bookings
    dispatch(deleteBookings(ids) as any); // Dispatch the deleteBookings action
  };

  return (
    <>
      <div className="flex border-b pb-2 items-center justify-between">
        <Heading
          title={`Bookings (${data.length})`}
          description="Manage Bookings"
        />
        <div></div>
        <div>
          <Button
            size="sm"
            className="bg-red-300"
            onClick={() => ExportDataToExcel("notfiltered", data)}
            title="disabled"
          >
            <Download className="mr-2 h-4 w-4" />
            Export All
          </Button>
        </div>
      </div>
      <DataTable
        searchKey="airline"
        clickable={true}
        columns={columns}
        data={data}
        dataType={'booking'}
        onDeleteData={deleteSelectedData} // Pass deleteSelectedData to onDeleteData prop
      />
    </>
  );
};

export default Bookings;
