import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { getTemplates } from './templates-extra';
import { announcementTemplatesInitialState } from '../initialStates';

const announcementTemplatesSlice = createSlice({
    name: 'announcementTemplates',
    initialState: announcementTemplatesInitialState,
    reducers: {
        updateIsFetchingTemplates: (state, { payload }: PayloadAction<boolean>) => {
            state.isFetchingTemplates = payload;
        },
        removeFromTemplates(state, action) {
            const index = state.templatesList.findIndex(
                (templates) => templates.id === action.payload,
            );

            state.templatesList.splice(index, 1);
        },
    },
    extraReducers(builder) {
        builder
            .addCase(getTemplates.fulfilled, (state, { payload }) => {
                state.templatesList = payload;
                state.isFetchingTemplates = false;
            })
            .addCase(getTemplates.rejected, (state) => {
                state.isFetchingTemplates = false;
            });
    },
});

export const { removeFromTemplates, updateIsFetchingTemplates } = announcementTemplatesSlice.actions;
export default announcementTemplatesSlice.reducer;
