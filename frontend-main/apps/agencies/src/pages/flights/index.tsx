import { useEffect } from 'react';
import { Download, Plus, Trash } from 'lucide-react';
import FlightFormModal from './components/FlightFormModal';
import { Button } from '../../common/ui/button';
import { Card } from '../../common/ui/card';
import { useAppDispatch, useAppSelector } from '../../store';
import { deleteFlight, getFlights } from '../../store/flight/flight-extra';
import { flightPageSelector } from '../../store/flight/selectors';
import { DataTable } from '../../common/ui/data-table';
import { Heading } from '../../common/ui/heading';
import { columns } from './components/columns';
import { Loader } from '../../common/ui/loader';
import { hasPermissionToCreateFlight } from '../../utils/permissions';
import { Role } from '../../constants/enum';
import {
  updateIsDeletingAllFlights,
  updateSelectedFlightIds,
  updateShowFlightFormModal,
} from '../../store/flight/flight-slice';
import moment from 'moment';
import ExportFlightDataToExcel from './components/ExportFlightDataToExcel';

const FlightPage = () => {
  const dispatch = useAppDispatch();
  const {
    flightList,
    isFetchingFlightList,
    user,
    showFlightFormModal,
    selectedFlightIds,
    isDeletingAllFlights,
  } = useAppSelector(flightPageSelector);

  const data = flightList.map(
    ({ departureTime, arrivalTime, createdAt, updatedAt, ...rest }) => ({
      ...rest,
      departureTime: moment(departureTime).format('MMMM DD, yyyy HH:mm'),
      arrivalTime: moment(arrivalTime).format('MMMM DD, yyyy HH:mm'),
      createdAt: moment(createdAt).format('MMMM do, yyyy'),
      updatedAt: moment(updatedAt).format('MMMM do, yyyy'),
    }),
  );

  useEffect(() => {
    dispatch(getFlights());
  }, []);

  const handleDelete = async () => {
    if (user) {
      dispatch(updateIsDeletingAllFlights(true));
      await Promise.allSettled(
        selectedFlightIds.map((id) => dispatch(deleteFlight(id))),
      );
      dispatch(updateIsDeletingAllFlights(false));
      dispatch(updateSelectedFlightIds([]));
    }
  };

  return (
    <>
      <Card className="p-5">
        <div className="flex border-b pb-2 items-center justify-between">
          <Heading
            title={`Flights ${
              isFetchingFlightList ? '' : `(${flightList.length})`
            }`}
            description="Manage Flights"
          />
          <div className="flex items-center gap-4">
            {hasPermissionToCreateFlight(user?.role as Role) && (
              <Button
                size="sm"
                className="bg-emerald-600 hover:bg-emerald-600"
                onClick={() => dispatch(updateShowFlightFormModal(true))}
                disabled={isDeletingAllFlights}
              >
                <Plus className="mr-2 h-4 w-4" />
                Add New
              </Button>
            )}
            {hasPermissionToCreateFlight(user?.role as Role) && (
              <Button
                size="sm"
                className={`bg-emerald-600 hover:bg-emerald-600`}
                onClick={() => ExportFlightDataToExcel('notfiltered', data)}
                title="disabled"
              >
                <Download className="mr-2 h-4 w-4" />
                Export All
              </Button>
            )}
          </div>
        </div>
        {isFetchingFlightList ? (
          <span className="flex h-[65vh] items-center justify-center">
            <Loader color="#000000" size={50} />
          </span>
        ) : (
          <DataTable
            searchKey="flightNumber"
            clickable={true}
            columns={columns}
            data={data}
            onConfirmFunction={handleDelete}
            onExport={ExportFlightDataToExcel}
            buttonTitle="Delete"
            ButtonIcon={Trash}
          />
        )}
      </Card>
      {showFlightFormModal && <FlightFormModal />}
    </>
  );
};

export default FlightPage;
