import FlightModel, { FlightDocument } from "../model/flight.model"
import { ObjectId } from "mongodb"

export default class FlightRepository {
    async findFlight(id: string): Promise<FlightDocument | null> {
        const flight = await FlightModel.findOne({
            _id: { $eq: new ObjectId(id) }
        }).exec()

        return flight
    }
}