import { CheckCircle } from "@mui/icons-material";
import { Step, StepLabel, Stepper } from "@mui/material";
import {
  Briefcase,
  CreditCard,
  PlaneTakeoff,
  RockingChair,
  Search,
  Users
} from "lucide-react";
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

interface StepperProps {
  activeIndex: number;
}

function CustomOnewayStepper({ activeIndex = 0 }: StepperProps) {
  const [activeStep, setActiveStep] = useState(activeIndex);

  const navigate = useNavigate();

  const steps = [
    "Search",
    "Departing flight",
    "Passengers",
    "Seat selection",
    "Extra options",
    "Payment",
  ];

  const paths = [
    "/",
    "/search/flights",
    "/passengers/details",
    "/passengers/seatSelection",
    "/passengers/extra-options",
    "/passengers/payments",
  ];

  const stepIcon = (index: number) => {
    return index === 0 ? (
      <Search />
    ) : index === 1 ? (
      <PlaneTakeoff />
    ) : index === 2 ? (
      <Users />
    ) : index === 3 ? (
      <RockingChair />
    ) : index === 4 ? (
      <Briefcase />
    ) : index === 5 ? (
      <CreditCard />
    ) : (
      <CheckCircle />
    );
  };

  return (
    <div className="max-w-screen-2xl bg-slate-100 shadow-[0px_2px_12px_rgba(0,0,0,0.2)] rounded-xl overflow-x-scroll sm:overflow-auto flex items-center justify-center p-4 xs:mx-[2px] sm:mx-1 md:mx-2 lg:mx-4 dark:bg-slate-500">
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
            className="shrink-0 mx-3 sm:mx-1"
            sx={{
              cursor: "pointer",
              "& .MuiStepLabel-root .Mui-completed": {
                color: "success.light", // circle color (COMPLETED)
              },
              "& .MuiStepLabel-label.Mui-completed.MuiStepLabel-alternativeLabel":
              {
                color: "grey.700", // Just text label (COMPLETED)
              },
              "& .MuiStepLabel-root .Mui-active": {
                color: index !== 6 ? "orange" : "success.light", // circle color (ACTIVE)
              },
              "& .MuiStepLabel-label.Mui-active.MuiStepLabel-alternativeLabel":
              {
                color: "common.black", // Just text label (ACTIVE)
              },
              "& .MuiStepLabel-root .Mui-active .MuiStepIcon-text": {
                fill: "black", // circle's number (ACTIVE)
              },
              "&:hover": {
                cursor: "pointer", // Ensure cursor is pointer on hover for all steps
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

export default CustomOnewayStepper;
