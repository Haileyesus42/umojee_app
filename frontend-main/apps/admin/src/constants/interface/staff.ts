export interface StaffSliceType {
  staffList: Staff[];
  isFetchingStaffs: boolean;
}

export interface NewStaff {
  email: string;
  role: string;
  password?: string;
  name: string;
}

export interface Staff {
  id: string;
  email: string;
  role: string;
  password?: string;
  name: string;
  active?: string;
  status?: boolean;
}

export interface Staffs {
  id: string;
  email: string;
  role: string;
  password?: string;
  name: string;
  status: boolean;
}