import { Download, Plus, Trash } from 'lucide-react';
import { useEffect } from 'react';
import { EditStaffModal } from '../../common/modals/EditStaffModal';
import { Button } from '../../common/ui/button';
import { Card } from '../../common/ui/card';
import { DataTable } from '../../common/ui/data-table';
import { Heading } from '../../common/ui/heading';
import { Loader } from '../../common/ui/loader';
import { Role } from '../../constants/enum';
import { Staff } from '../../interface/staff';
import { useAppDispatch, useAppSelector } from '../../store';
import { staffsPageSelector } from '../../store/staffs/selectors';
import { deleteStaffs, getStaffs } from '../../store/staffs/staff-extra';
import { updateShowNewStaffModal } from '../../store/staffs/staff-slice';
import { hasPermissionToCreateUser } from '../../utils/permissions';
import { formattedStaffs } from '../../utils/support';
import { columns } from './components/columns';
import ExportStaffDataToExcel from './components/ExportStaffDataToExcel';
import NewStaffModal from './components/NewStaffModal';

const StaffsPage = () => {
  const dispatch = useAppDispatch();
  const { staffList, isFetchingStaffs, user, showNewStaffModal } =
    useAppSelector(staffsPageSelector);
  const staffs = formattedStaffs(staffList);

  useEffect(() => {
    dispatch(getStaffs());
  }, []);

  const deleteSelectedData = async (data: Staff[]) => {
    const ids = data?.map((staff) => staff._id);
    dispatch(deleteStaffs(ids) as any);
  };

  return (
    <>
      <Card className="p-5">
        <EditStaffModal />
        <div className="flex border-b pb-2 items-center justify-between">
          <Heading
            title={`Staffs ${isFetchingStaffs ? '' : `(${staffList.length})`}`}
            description="Manage Staffs"
          />
          <div className="flex items-center gap-3">
            {hasPermissionToCreateUser(user?.role as Role) && (
              <Button
                size="sm"
                className="bg-emerald-600 hover:bg-emerald-600"
                onClick={() => dispatch(updateShowNewStaffModal(true))}
              >
                <Plus className="mr-2 h-4 w-4" />
                Add New
              </Button>
            )}
            <Button
              size="sm"
              className={`bg-emerald-600 hover:bg-emerald-600`}
              onClick={() => ExportStaffDataToExcel('notfiltered', staffs)}
              title="disabled"
            >
              <Download className="h-4 w-4" />
              Export All
            </Button>
          </div>
        </div>
        {isFetchingStaffs ? (
          <span className="flex h-[65vh] items-center justify-center">
            <Loader color="#000000" size={50} />
          </span>
        ) : (
          <DataTable
            searchKey="name"
            clickable={true}
            columns={columns}
            data={staffs}
            onConfirmFunction={deleteSelectedData}
            onExport={ExportStaffDataToExcel}
            buttonTitle="Delete Selection"
            ButtonIcon={Trash}
          />
        )}
      </Card>
      {showNewStaffModal && <NewStaffModal />}
    </>
  );
};

export default StaffsPage;
