export interface SettingSliceType {
  user?: User;
}

export interface User {
  _id: string;
  name: string;
  email: string;
  role: string;
  bio?: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}
