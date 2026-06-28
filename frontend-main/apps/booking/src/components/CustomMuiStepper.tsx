import { CheckCircle } from "@mui/icons-material";
import { Container, Paper, Step, StepLabel, Stepper } from "@mui/material";
import {
  Briefcase,
  CreditCard,
  PlaneLanding,
  PlaneTakeoff,
  Search,
  Users,
} from "lucide-react";
import React, { useState } from "react";

function CustomMuiStepper() {
  const [activeStep, setActiveStep] = useState(1);

  const steps = [
    "Search",
    "Departing flight",
    "Return flight",
    "Passengers",
    "Extra options",
    "Payment",
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
      <Briefcase />
    ) : index === 5 ? (
      <CreditCard />
    ) : (
      <CheckCircle />
    );
  };

  return (
      <div
        className="shadow-md overflow-hidden overflow-x-scroll flex items-center justify-center pt-4 m-4"
        >
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
                  color: index !== 6 ? "orange" : "success.light", // circle color (ACTIVE)
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
                onClick={() => setActiveStep(index)}
              >
                {steps[index]}
              </StepLabel>
            </Step>
          ))}
        </Stepper>
      </div>
  );
}

export default CustomMuiStepper;
