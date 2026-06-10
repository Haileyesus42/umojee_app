import { Router } from 'express';
import {
  approveRefund,
  cancelRefund,
  deleteAllRefunds,
  deleteManyRefunds,
  deleteRefund,
  getRefunds,
  requestRefund
} from '../../controller/admin/refund.controller';
import { restrictToMiddleWare } from '../../middleware/authentication';
import { Role } from '../../types';

const refundRouter = Router();

refundRouter.post(
  '/request-refund',
  // restrictToMiddleWare(
  //   Role.Agent,
  //   Role.Supervisor,
  //   Role.Manager,
  //   Role.SuperAdmin
  // ),
  requestRefund
);

refundRouter.get('/get-refunds', getRefunds);

refundRouter.patch(
  '/approve-refund',
  // restrictToMiddleWare(Role.SuperAdmin, Role.Admin),
  approveRefund
);

refundRouter.patch('/cancel', cancelRefund);

refundRouter.delete('/delete', deleteRefund);
refundRouter.delete('/deleteMany', deleteManyRefunds);
refundRouter.delete('/deleteall', deleteAllRefunds);

export { refundRouter };
