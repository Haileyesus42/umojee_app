export interface StaffSliceType {
  staffList: Staff[];
  isFetchingStaffs: boolean;
  showNewStaffModal: boolean;
}

export interface NewStaff {
  email: string;
  role: string;
  password?: string;
  name: string;
}

export interface Staff {
  _id: string;
  email: string;
  role: string;
  password?: string;
  name: string;
  status?: string;
  active?: boolean;
}

export interface AddStaff {
  id?: string;
  email: string;
  role: string;
  password?: string;
  name: string;
}
export interface EditStaff {
  _id: string;
  email: string;
  role: string;
  password?: string;
  name: string;
  status?: string;
  active?: boolean;
}
