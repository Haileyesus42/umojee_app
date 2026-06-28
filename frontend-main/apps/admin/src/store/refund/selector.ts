import { createAppSelector } from '../../store';

export const refundsPageSelector = createAppSelector(
  [
    (state) => state.refund.refunds?.slice(),
    (state) => state.refund.isFetchingRefunds,
  ],
  (refunds, isFetchingRefunds) => ({
    refunds,
    isFetchingRefunds,
  }),
);

export const refundCellActionsSelector = createAppSelector(
  [
    (state) => state.setting.user,
    (state) => state.refund.isApprovingRefund,
    (state) => state.refund.selectedRefund,
  ],
  (user, isApprovingRefund, selectedRefund) => ({
    user,
    isApprovingRefund,
    selectedRefund,
  }),
);
