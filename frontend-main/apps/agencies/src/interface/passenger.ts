export interface PassengerSliceType {
  passengerList: Passenger[];
  isFetchingPassengerList: boolean;
}

export interface PassengersDetails {
  firstName: string;
  lastName: string;
  title: string;
}

export interface Passenger {
  _id: string;
  passengerName: string;
  passengerEmail: string;
  passengerStatus: string;
  isBlocked?: boolean;
  status?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PassengersContact {
  code: string;
  phone: string;
  email: string;
}
