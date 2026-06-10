
export const manageSeats = async (selectedSeats: any, selectedSeatsReturn: any) => {
    const selectedSeatsData = JSON.parse(selectedSeats).map((selectedSeat: { rowId: string; seatId: string; }) => {
        if (!selectedSeat.rowId || !selectedSeat.seatId) {
            throw new Error('Seat data is missing required fields.');
        }
        return {
            rowId: selectedSeat.rowId,
            seatId: selectedSeat.seatId,
        };
    });
    console.log("Selected seats data", selectedSeatsData[0])
    let selectedSeatsReturnData: { rowId: string; seatId: string; }[] = [];
    if (selectedSeatsReturn) {
        selectedSeatsReturnData = JSON.parse(selectedSeatsReturn).map((selectedSeatReturn: { rowId: string; seatId: string; }) => {
            if (!selectedSeatReturn.rowId || !selectedSeatReturn.seatId) {
                throw new Error('Return seat data is missing required fields.');
            }
            return {
                rowId: selectedSeatReturn.rowId,
                seatId: selectedSeatReturn.seatId,
            };
        });
    }
    return { selectedSeatsData, selectedSeatsReturnData }
}