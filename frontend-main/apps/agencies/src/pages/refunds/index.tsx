import moment from 'moment';
import { useEffect } from 'react';
import { Card } from '../../common/ui/card';
import { DataTable } from '../../common/ui/data-table';
import { Heading } from '../../common/ui/heading';
import { Loader } from '../../common/ui/loader';
import { Refund } from '../../interface/refund';
import { useAppDispatch, useAppSelector } from '../../store';
import { deleteRefunds, getRefunds } from '../../store/refund/extra';
import {
  refundCellActionsSelector,
  refundsPageSelector,
} from '../../store/refund/selector';
import { columns } from '../refunds/components/columns';
import ExportRefundsToExcel from './components/ExportRefundsToExcel';
import { Download, Trash } from 'lucide-react';
import { Button } from '../../common/ui/button';

const RefundsPage = () => {
  const dispatch = useAppDispatch();
  const { isFetchingRefunds, refunds } = useAppSelector(refundsPageSelector);
  const { user } = useAppSelector(refundCellActionsSelector);

  const formattedRefunds = refunds?.map(
    ({ createdAt, updatedAt, bookingDate, ...rest }) => ({
      ...rest,
      bookingDate: moment(bookingDate).format('MMM Do, yyyy hh:mm a'),
      createdAt: moment(createdAt).toDate(),
      updatedAt: moment(updatedAt).toDate(),
      currentUser: user,
    }),
  );

  useEffect(() => {
    dispatch(getRefunds());
  }, []);

  const deleteSelectedData = async (data: Refund[]) => {
    const ids = data.map((agents) => agents._id);
    dispatch(deleteRefunds(ids));
  };

  return (
    <>
      <Card className="p-5">
        <div className="flex border-b pb-2 items-center justify-between">
          <Heading
            title={`Refunds ${isFetchingRefunds ? '' : `(${refunds?.length})`}`}
            description="Manage Refunds"
          />
          <Button
            size="sm"
            className={`bg-emerald-600 hover:bg-emerald-600`}
            onClick={() =>
              ExportRefundsToExcel('notfiltered', formattedRefunds)
            }
            title="disabled"
          >
            <Download className="mr-2 h-4 w-4" />
            Export All
          </Button>
        </div>
        {isFetchingRefunds ? (
          <span className="flex h-[65vh] items-center justify-center">
            <Loader color="#000000" size={50} />
          </span>
        ) : (
          <DataTable<Refund, unknown>
            searchKey="requestComesFrom"
            clickable={true}
            columns={columns}
            data={formattedRefunds}
            onConfirmFunction={deleteSelectedData}
            onExport={ExportRefundsToExcel}
            buttonTitle="Delete Selection"
            ButtonIcon={Trash}
          />
        )}
      </Card>
    </>
  );
};

export default RefundsPage;
