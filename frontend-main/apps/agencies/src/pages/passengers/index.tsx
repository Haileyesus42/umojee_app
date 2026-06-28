import { Download, Trash } from 'lucide-react';
import { useEffect } from 'react';
import { Button } from '../../common/ui/button';
import { Card } from '../../common/ui/card';
import { DataTable } from '../../common/ui/data-table';
import { Heading } from '../../common/ui/heading';
import { Loader } from '../../common/ui/loader';
import { Passenger } from '../../interface/passenger';
import { useAppDispatch, useAppSelector } from '../../store';
import {
  deletePassengers,
  getPassengers,
} from '../../store/passengers/passenger-extra';
import { passengerPageSelector } from '../../store/passengers/selectors';
import { formattedPassengers } from '../../utils/support';
import { columns } from './components/columns';
import ExportPassengerDataToExcel from './components/ExportPassengerDataToExcel';

const PassengersPage = () => {
  const dispatch = useAppDispatch();
  const { passengerList, isFetchingPassengerList } = useAppSelector(
    passengerPageSelector,
  );

  const passengers = formattedPassengers(passengerList);

  useEffect(() => {
    dispatch(getPassengers());
  }, []);

  const deleteSelectedData = async (data: Passenger[]) => {
    const ids = data.map((d) => d._id);
    dispatch(deletePassengers(ids) as any);
  };

  return (
    <>
      <Card className="p-5">
        <div className="flex border-b pb-2 items-center justify-between">
          <Heading
            title={`Passengers ${
              isFetchingPassengerList ? '' : `(${passengerList.length})`
            }`}
            description="Manage Passengers"
          />

          <Button
            size="sm"
            className={`bg-emerald-600 hover:bg-emerald-600`}
            onClick={() =>
              ExportPassengerDataToExcel('notfiltered', passengers)
            }
            title="disabled"
          >
            <Download className="mr-2 h-4 w-4" />
            Export All
          </Button>
        </div>
        {isFetchingPassengerList ? (
          <span className="flex h-[65vh] items-center justify-center">
            <Loader color="#000000" size={50} />
          </span>
        ) : (
          <DataTable
            searchKey="lastName"
            clickable={true}
            columns={columns}
            data={passengers}
            onConfirmFunction={deleteSelectedData}
            onExport={ExportPassengerDataToExcel}
            buttonTitle="Delete Selection"
            ButtonIcon={Trash}
          />
        )}
      </Card>
    </>
  );
};

export default PassengersPage;
