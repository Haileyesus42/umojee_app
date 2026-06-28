import React, { useState } from 'react';
import Chart from 'react-apexcharts';

interface PiechartProps {
  labels: string[];
  colors: string[];
  data: number[];
}
const PieChart = ({ data, labels, colors }: PiechartProps) => {
  const [chartOptions] = useState({
    labels,
    colors,
    responsive: [
      {
        breakpoint: 480,
        options: {
          chart: {
            width: 300,
          },
          legend: {
            position: 'bottom',
          },
        },
      },
    ],
  });


  return (
    <div className=" h-full  w-full">
      <div className="w-full sm:max-w-xl min-h-[250px] flex justify-center items-center">
        <Chart options={chartOptions} series={data} type="pie" width="100%" />
      </div>
    </div>
  );
};

export default PieChart;
