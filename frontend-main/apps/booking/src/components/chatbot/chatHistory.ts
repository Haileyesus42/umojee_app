export interface ChatDataType {
  message: string;
  isBot: boolean;
}

export const chatData: ChatDataType[] = [
  {
    message: "Hello what can I help you today?",
    isBot: true,
  },
  {
    message:
      "I want to book a flight from Toronto to miami on September 23. I am",
    isBot: false,
  },
  {
    message: "Are you booking for your self? tell me the number of passanger?",
    isBot: true,
  },
];

export const chatMessages= [
    {
      "content": "I want to book a flight",
      "additional_kwargs": {},
      "response_metadata": {},
      "type": "human",
      "name": null,
      "id": "027ed1c3-d28e-47a4-98d4-b4f470a39de6",
      "example": false
    },
    {
      "content": "how can I help you",
      "additional_kwargs": {},
      "response_metadata": {},
      "type": "ai",
      "name": "supervisor",
      "id": "run-357e5f09-20e6-45a3-a687-a30799207f4d",
      "example": false,
      "tool_calls": [],
      "invalid_tool_calls": [],
      "usage_metadata": {}
    },
    {
      "content": "Successfully transferred to booking_agent",
      "additional_kwargs": {},
      "response_metadata": {},
      "type": "tool",
      "name": "transfer_to_booking_agent",
      "id": "90086936-5d03-404f-a6a2-f19ff779fe20",
      "tool_call_id": "call_bv9e",
      "artifact": null,
      "status": "success"
    },
    {
      "content": "To book a flight, I need to know your departure and arrival cities. Can you please provide me with the exact city names (e.g., \"New York\", \"London\")? I'll use this information to search for available flights.",
      "additional_kwargs": {},
      "response_metadata": {},
      "type": "ai",
      "name": "booking_agent",
      "id": "run-b6b22ac1-1b03-4776-83f1-51176e6cc37a",
      "example": false,
      "tool_calls": [],
      "invalid_tool_calls": [],
      "usage_metadata": {}
    },
    {
      "content": "Do you want to continue?",
      "additional_kwargs": {},
      "response_metadata": {},
      "type": "ai",
      "name": "supervisor",
      "id": "run-4acc0cbe-c7f8-4709-966f-8a0164454e35",
      "example": false,
      "tool_calls": [],
      "invalid_tool_calls": [],
      "usage_metadata": {}
    }
  ]