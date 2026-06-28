interface Timestamps {
  createdAt: string;
  updatedAt: string;
}

export interface AnnouncementTemplatesSliceType {
  templatesList: AnnouncementTemplate[];
  isFetchingTemplates: boolean;
}

export interface AnnouncementsSliceType {
  announcementsList: Announcement[];
  isFetchingAnnouncements: boolean;
}

export interface Announcement {
  id: string;
  announcer: string;
  announcedTo: string;
  message: string;
  createdAt: string;
  updatedAt: string;
}

export interface AnnouncementTemplate {
  id: string;
  templateName: string;
  templateTitle: string;
  templateBody: string;
  createdAt: string;
  updatedAt: string;
}

export interface AnnouncementUserTypes {
  id: number;
  anncName: string;
  anncEmail: string;
  anncPhone: string;
  anncRole: string;
  anncStatus: string;
}

export interface AnnouncementUsersTypes {
  anncUserName: string;
  anncUserEmail: string;
  anncUserRole: string;
  anncUserStatus: string;
}

export interface NewTemplate {
  templateName: string;
  templateTitle: string;
  templateBody: string;
}

export interface AddTemplate extends Timestamps {
  id: string;
  templateName: string;
  templateTitle: string;
  templateBody: string;
}

export interface EditTemplate {
  id: string;
  templateName: string;
  templateTitle: string;
  templateBody: string;
}
