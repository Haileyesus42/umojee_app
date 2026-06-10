import { CreateAnnouncementTemplate, deleteManyAnnouncemenTemplates, deleteTemplate, getAllAnnouncementTemplates, updateTemplate } from '../../controller/admin/announcements/announcementTemplates.controller';
import express from 'express';
import { Role } from '../../types';
import { deleteAllAnnouncements, deleteAnnouncement, deleteManyAnnouncements, getAllAnnouncements, getAllAnnouncementsByUserId, NewAnnouncement, updateAnnouncement } from '../../controller/admin/announcements/announcement.controller';

export const announcementTemplateRouter = express.Router(); //
announcementTemplateRouter.post('/create', CreateAnnouncementTemplate);
announcementTemplateRouter.get('/getall', getAllAnnouncementTemplates);
announcementTemplateRouter.patch('/update', updateTemplate);
announcementTemplateRouter.delete('/delete', deleteTemplate);
announcementTemplateRouter.delete('/deleteMany', deleteManyAnnouncemenTemplates);

export const announcementRouter = express.Router(); //
announcementRouter.post('/create', NewAnnouncement);
// announcementRouter.get('/getall', getAllAnnouncementsByUserId);
announcementRouter.get('/getall', getAllAnnouncements);
announcementRouter.patch('/update', updateAnnouncement);
announcementRouter.delete('/delete', deleteAnnouncement);
announcementRouter.delete('/deleteMany', deleteManyAnnouncements);
announcementRouter.delete('/deleteall', deleteAllAnnouncements);