import React, { useEffect, useMemo, useState } from 'react';
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../../common/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../common/ui/select';
import { useDispatch, useSelector } from 'react-redux';
import { fetchLineGraphsData } from '../../store/dashboard/dashboardActions';

const currentYear = new Date().getFullYear();
const years = Array.from({ length: 5 }, (_, i) => currentYear - i);

const months = [
  { label: 'January', value: 1 },
  { label: 'February', value: 2 },
  { label: 'March', value: 3 },
  { label: 'April', value: 4 },
  { label: 'May', value: 5 },
  { label: 'June', value: 6 },
  { label: 'July', value: 7 },
  { label: 'August', value: 8 },
  { label: 'September', value: 9 },
  { label: 'October', value: 10 },
  { label: 'November', value: 11 },
  { label: 'December', value: 12 },
];

const LineChartComponent: React.FC = () => {
  const currentMonth = new Date().getMonth();
  const [selectedMonth, setSelectedMonth] = useState(
    months[currentMonth].value,
  );
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [loading, setLoading] = useState<boolean>(true);
  const dispatch = useDispatch();

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await dispatch(fetchLineGraphsData(selectedYear) as any);
      setLoading(false);
    };
    loadData();
  }, [dispatch, selectedYear]);

  const graphData = useSelector((state: any) => state.dashboard.graphsDataList);

  const filteredData = useMemo(() => {
    const key = months[selectedMonth - 1].label.toLowerCase();
    return graphData[key] || [];
  }, [graphData, selectedMonth]);

  const handleMonthChange = (value: string) => {
    setSelectedMonth(parseInt(value, 10));
  };

  const handleYearChange = (value: string) => {
    setSelectedYear(parseInt(value, 10));
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Flight Analytics</CardTitle>
            <CardDescription>
              {months.find((month) => month.value === selectedMonth)?.label}{' '}
              month data.
            </CardDescription>
          </div>
          <div className="min-w-56 flex space-x-2">
            <Select
              onValueChange={(value) => handleYearChange(value)}
              value={selectedYear.toString()}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a year" />
              </SelectTrigger>
              <SelectContent>
                {years.map((year) => (
                  <SelectItem key={year} value={year.toString() || ''}>
                    {year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              onValueChange={(value) => handleMonthChange(value)}
              value={selectedMonth.toString()}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a month" />
              </SelectTrigger>
              <SelectContent>
                {months.map((month) => (
                  <SelectItem
                    key={month.value}
                    value={month.value.toString() || ''}
                  >
                    {month.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pl-2">
        {loading ? (
          <div>Loading...</div>
        ) : filteredData.length === 0 ? (
          <div className="flex justify-center items-center">
            No data available for the selected month.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={400}>
            <LineChart
              data={filteredData}
              margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line
                type="monotone"
                dataKey="onTime"
                name="On Time"
                stroke="#39e662"
              />
              <Line
                type="monotone"
                dataKey="delayed"
                name="Delay"
                stroke="#ffa500"
              />
              <Line
                type="monotone"
                dataKey="cancelled"
                name="Cancelled"
                stroke="#e2202b"
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
};

export default LineChartComponent;
