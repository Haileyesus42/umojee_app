import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { getAnnouncements } from './announcement-extra';
import { announcementsInitialState } from '../initialStates';

const announcementsSlice = createSlice({
    name: 'announcements',
    initialState: announcementsInitialState,
    reducers: {
        updateIsFetchingAnnouncements: (state, { payload }: PayloadAction<boolean>) => {
            state.isFetchingAnnouncements = payload;
        },
        removeFromAnnouncements(state, action) {
            const index = state.announcementsList.findIndex(
                (announcements) => announcements.id === action.payload,
            );

            state.announcementsList.splice(index, 1);
        },
    },
    extraReducers(builder) {
        builder
            .addCase(getAnnouncements.fulfilled, (state, { payload }) => {
                state.announcementsList = payload;
                state.isFetchingAnnouncements = false;
            })
            .addCase(getAnnouncements.rejected, (state) => {
                state.isFetchingAnnouncements = false;
            });
    },
});

export const { removeFromAnnouncements, updateIsFetchingAnnouncements } = announcementsSlice.actions;
export default announcementsSlice.reducer;
