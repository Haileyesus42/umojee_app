import React, { ReactNode } from "react";

export interface ChatBubbleProps {
  isBot: boolean;
  thinking?: boolean;
  children?: ReactNode;
}

const ChatBubble = ({ isBot, thinking, children }: ChatBubbleProps) => {
  return (
    <div className={`flex ${!isBot && "justify-end"}`}>
      <div
        className={`w-fit bg-white max-w-[90%] text-sm flex rounded-2xl ${
          isBot ? "rounded-bl-none" : "rounded-br-none"
        } px-4 py-2`}
      >
        {thinking ? (
          <span className="loading loading-dots loading-xs -mb-1"></span>
        ) : (
          children
        )}
      </div>
    </div>
  );
};

export default ChatBubble;
