import express from "express";
import { Clientprotect } from "../../controller/client/authController";
import {
  createRecommendation,
  getTodayRecommendation,
  getRecommendationHistory,
  createAspiration,
  getAspirations,
} from "../../controller/client/destinationRecommendation.controller";

const destinationRecommendationRouter = express.Router();

destinationRecommendationRouter.post("/", Clientprotect, createRecommendation);
destinationRecommendationRouter.get("/today", Clientprotect, getTodayRecommendation);
destinationRecommendationRouter.get("/history", Clientprotect, getRecommendationHistory);
destinationRecommendationRouter.post("/aspirations", Clientprotect, createAspiration);
destinationRecommendationRouter.get("/aspirations", Clientprotect, getAspirations);

export default destinationRecommendationRouter;
