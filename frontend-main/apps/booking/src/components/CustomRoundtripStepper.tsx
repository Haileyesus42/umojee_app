import { CheckCircle } from "@mui/icons-material";
import { Container, Paper, Step, StepLabel, Stepper } from "@mui/material";
import {
  Briefcase,
  CreditCard,
  PlaneLanding,
  PlaneTakeoff,
  RockingChair,
  Search,
  Users,
} from "lucide-react";
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

interface StepperProps {
  activeIndex: number;
}

function CustomRoundtripStepper({ activeIndex = 0 }: StepperProps) {
  const [activeStep, setActiveStep] = useState(activeIndex);

  const navigate = useNavigate();

  const steps = [
    "Search",
    "Departing flight",
    "Return flight",
    "Passengers",
    "Seat selection - Direct flight",
    "Seat selection - Return flight",
    "Extra options",
    "Payment",
  ];

  const paths = [
    "/",
    "/search/flights/departure",
    "/search/flights/return",
    "/passengers/details",
    "/passengers/seatSelection",
    "/passengers/seatSelection-return",
    "/passengers/extra-options",
    "/passengers/payments",
  ];

  const stepIcon = (index: number) => {
    return index === 0 ? (
      <Search />
    ) : index === 1 ? (
      <PlaneTakeoff />
    ) : index === 2 ? (
      <PlaneLanding />
    ) : index === 3 ? (
      <Users />
    ) : index === 4 ? (
      <RockingChair />
    ) : index === 5 ? (
      <RockingChair />
    ) : index === 6 ? (
      <Briefcase />
    ) : index === 7 ? (
      <CreditCard />
    ) : (
      <CheckCircle />
    );
  };

  return (
    <div className="max-w-screen-2xl bg-slate-100 shadow-[0px_2px_12px_rgba(0,0,0,0.2)] rounded-xl overflow-hidden overflow-x-scroll flex items-center justify-center pt-4 m-4 mx-2 sm:mx-10">
      <Stepper
        activeStep={activeStep}
        sx={{
          width: "100%",
          textAlign: "center",
        }}
        variant={"outlined"}
        elevation={0}
        square={false}
      >
        {steps.map((label, index) => (
          <Step
            key={label}
            sx={{
              "& .MuiStepLabel-root .Mui-completed": {
                color: "success.light", // circle color (COMPLETED)
              },
              "& .MuiStepLabel-label.Mui-completed.MuiStepLabel-alternativeLabel":
                {
                  color: "grey.700", // Just text label (COMPLETED)
                },
              "& .MuiStepLabel-root .Mui-active": {
                color: index !== 8 ? "orange" : "success.light", // circle color (ACTIVE)
              },
              "& .MuiStepLabel-label.Mui-active.MuiStepLabel-alternativeLabel":
                {
                  color: "common.black", // Just text label (ACTIVE)
                },
              "& .MuiStepLabel-root .Mui-active .MuiStepIcon-text": {
                fill: "black", // circle's number (ACTIVE)
              },
            }}
          >
            <StepLabel
              StepIconComponent={() => stepIcon(index)}
              onClick={() => {
                setActiveStep(index);
                navigate(paths[index]);
              }}
            >
              {steps[index]}
            </StepLabel>
          </Step>
        ))}
      </Stepper>
    </div>
  );
}

export default CustomRoundtripStepper;
