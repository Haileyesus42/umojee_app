import { createAppSelector } from '../../store';

export const announcementsPageSelector = createAppSelector(
    [
        (state) => state.announcements.announcementsList.slice(),
        (state) => state.announcements.isFetchingAnnouncements,
    ],
    (announcementsList, isFetchingAnnouncements) => ({
        announcementsList,
        isFetchingAnnouncements
    }),
);
