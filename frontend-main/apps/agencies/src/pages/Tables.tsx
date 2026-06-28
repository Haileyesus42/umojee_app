import Breadcrumb from '../components/Breadcrumbs/Breadcrumb';
import TableOne from '../components/Tables/AllBooking';

const Tables = () => {
  return (
    <>
      <Breadcrumb pageName="Tables" />
      <div className="flex flex-col gap-10">
        <TableOne />
      </div>
    </>
  );
};

export default Tables;
