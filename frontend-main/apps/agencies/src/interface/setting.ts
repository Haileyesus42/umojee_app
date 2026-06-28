export interface SettingSliceType {
  user?: User;
}

export interface User {
  _id: string;
  name: string;
  email: string;
  profile_pic?: string;
  role: string;
  bio?: string;
  photo?: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}
