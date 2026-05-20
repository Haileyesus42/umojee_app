import { Request, Response } from "express";
import DestinationRecommendation from "../../model/client/destinationRecommendation.model";
import DestinationAspiration from "../../model/client/destinationAspiration.model";

/**
 * Get today's date as YYYY-MM-DD in UTC.
 */
function todayDateString(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * POST /api/client/destinations
 * Create or update today's destination recommendation for the authenticated user.
 */
export const createRecommendation = async (req: Request, res: Response) => {
  try {
    console.log("destinations", req.body)
    const userId = (req as any).userId;
    if (!userId) {
      return res.status(401).json({ status: "fail", message: "Not authenticated" });
    }

    const { recommendations, greeting, conversationId, journeyId } = req.body;

    if (!recommendations) {
      return res.status(400).json({ status: "fail", message: "recommendations field is required" });
    }

    const date = todayDateString();

    const doc = await DestinationRecommendation.findOneAndUpdate(
      { userId, date, journeyId: journeyId || null },
      { userId, date, recommendations, greeting, conversationId, journeyId: journeyId || null },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    return res.status(201).json({ status: "success", data: doc });
  } catch (error: any) {
    console.error("createRecommendation error:", error);
    return res.status(500).json({ status: "fail", message: error.message });
  }
};

/**
 * GET /api/client/destinations/today
 * Fetch today's recommendation for the authenticated user.
 */
export const getTodayRecommendation = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    if (!userId) {
      return res.status(401).json({ status: "fail", message: "Not authenticated" });
    }

    const date = todayDateString();
    const doc = await DestinationRecommendation.findOne({ userId, date });

    if (!doc) {
      return res.status(404).json({ status: "fail", message: "No recommendation for today" });
    }

    return res.status(200).json({ status: "success", data: doc });
  } catch (error: any) {
    console.error("getTodayRecommendation error:", error);
    return res.status(500).json({ status: "fail", message: error.message });
  }
};

/**
 * GET /api/client/destinations/history
 * Fetch recommendation history for the authenticated user.
 * Supports ?limit=N query param (default 30).
 */
export const getRecommendationHistory = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    if (!userId) {
      return res.status(401).json({ status: "fail", message: "Not authenticated" });
    }

    const limit = Math.min(parseInt(req.query.limit as string) || 30, 100);
    const journeyId = req.query.journeyId as string | undefined;

    const filter: Record<string, any> = { userId };
    if (journeyId) filter.journeyId = journeyId;

    const docs = await DestinationRecommendation.find(filter)
      .sort({ date: -1 })
      .limit(limit);

    return res.status(200).json({ status: "success", data: docs });
  } catch (error: any) {
    console.error("getRecommendationHistory error:", error);
    return res.status(500).json({ status: "fail", message: error.message });
  }
};

/**
 * POST /api/client/destinations/aspirations
 * Persist a liked destination as a user aspiration.
 */
export const createAspiration = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    if (!userId) {
      return res.status(401).json({ status: "fail", message: "Not authenticated" });
    }

    const { place, source } = req.body;
    if (!place || typeof place !== "object") {
      return res.status(400).json({ status: "fail", message: "place field is required" });
    }

    const placeName = String(place.name || "").trim();
    const placeCountry = String(place.country || "").trim();
    const placeId = String(place.id || `${placeName}_${placeCountry}`).trim();
    if (!placeId || !placeName) {
      return res.status(400).json({ status: "fail", message: "place.id and place.name are required" });
    }

    const doc = await DestinationAspiration.findOneAndUpdate(
      { userId, placeId },
      {
        $set: {
          userId,
          placeId,
          place,
          source: source || "destination_recommendation",
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    return res.status(201).json({ status: "success", data: doc });
  } catch (error: any) {
    console.error("createAspiration error:", error);
    return res.status(500).json({ status: "fail", message: error.message });
  }
};

/**
 * GET /api/client/destinations/aspirations
 * List destination aspirations for the authenticated user.
 */
export const getAspirations = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    if (!userId) {
      return res.status(401).json({ status: "fail", message: "Not authenticated" });
    }

    const limit = Math.min(parseInt(req.query.limit as string) || 30, 100);
    const docs = await DestinationAspiration.find({ userId })
      .sort({ createdAt: -1 })
      .limit(limit);

    return res.status(200).json({ status: "success", data: docs });
  } catch (error: any) {
    console.error("getAspirations error:", error);
    return res.status(500).json({ status: "fail", message: error.message });
  }
};
