interface Client {
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
}

export interface Refund {
  _id: string;
  passengerName: string;
  passengerEmail: string;
  bookingComesFrom: string;
  bookerName: string;
  bookerEmail: string;
  price: number;
  reason: string;
  bookingDate: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface RefundSliceType {
  isFetchingRefunds: boolean;
  isRequestingRefund: boolean;
  isApprovingRefund: boolean;
  refunds: Refund[];
  selectedRefund?: Refund;
}

export interface RequestRefundPayload {
  bookingId: string;
  userId: string;
  reason: string;
}

export interface ApproveRefundPayload {
  refundId: string;
  status: string;
}

// export interface ViewRefundProps {
//   id: number;
//   passengerName: string;
//   passengerEmail: string;
//   totalPrice: string;
//   bookingDate: string;
//   requestDate: string;
//   description: string;
//   refundStatus: string;
// }
