import { useState } from 'react';
import { useSelector } from 'react-redux';
import { Card, CardContent, CardHeader } from '../../common/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../common/ui/select';
import { PieChartType } from '../../types/types';
import PieChart from './PieChart';

const formatData = (data: PieChartType) => {
  return [data.totalOnTime, data.totalDelayed, data.totalCancelled];
};
const COLORS = ['#3daa55', '#ee9112', '#e2202b'];
const labels = ['Ontime', 'Delayed', 'Cancelled'];

export default function PieChartComponent() {
  const piePhartData = useSelector(
    (state: any) => state.dashboard.pieChartDataList,
  );
  const [pieData, setPieData] = useState(formatData(piePhartData.todayData));

  const [selectedOption, setSelectedOption] = useState('today');

  const handleOptionChange = (selectedOption: string) => {
    setSelectedOption(selectedOption);

    const selectedData =
      selectedOption === 'today'
        ? piePhartData.todayData
        : selectedOption === 'thisweek'
        ? piePhartData.weekData
        : piePhartData.totalData;
    setPieData(formatData(selectedData));
  };

  return (
    <Card className="h-full">
      <CardHeader>
        <div className="flex items-center">
          <div className="w-28">
            <Select
              onValueChange={(value) => handleOptionChange(value)}
              value={selectedOption}
            >
              <SelectTrigger>
                <SelectValue
                  defaultValue={'today'}
                  placeholder="Select a one"
                />
              </SelectTrigger>
              <SelectContent>
                <SelectItem key={'today'} value={'today'}>
                  Today
                </SelectItem>
                <SelectItem key={'thisweek'} value={'thisweek'}>
                  This Week
                </SelectItem>
                <SelectItem key={'total'} value={'total'}>
                  Total
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex justify-center w-full p-0">
        <PieChart labels={labels} data={pieData} colors={COLORS} />
      </CardContent>
    </Card>
  );
}
