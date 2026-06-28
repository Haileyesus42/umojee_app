import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { getAgencies } from './agencies-extra.ts';
import { agenciesInitialState } from '../initialStates';

const agenciesSlice = createSlice({
    name: 'agencies',
    initialState: agenciesInitialState,
    reducers: {
        updateIsFetchingAgencies: (state, { payload }: PayloadAction<boolean>) => {
            state.isFetchingAgencies = payload;
        },
        removeFromAgencies(state, action) {
            const index = state.agenciesList.findIndex(
                (agencies) => agencies._id === action.payload,
            );

            state.agenciesList.splice(index, 1);
        },
    },
    extraReducers(builder) {
        builder
            .addCase(getAgencies.fulfilled, (state, { payload }) => {
                state.agenciesList = payload;
                state.isFetchingAgencies = false;
            })
            .addCase(getAgencies.rejected, (state) => {
                state.isFetchingAgencies = false;
            });
    },
});

export const { removeFromAgencies, updateIsFetchingAgencies } = agenciesSlice.actions;
export default agenciesSlice.reducer;
