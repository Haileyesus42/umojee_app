import React, { useEffect, useRef } from "react";
import ChatBubble from "./ChatBubble";
import { ChatDataType } from "./chatHistory";

const ChatBoxBody = ({ chats }: { chats: ChatDataType[] }) => {
  const chatEndRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chats]);

  return (
    <div className="h-full flex flex-col gap-4 overflow-y-scroll hide-scrollbar">
      {chats.map((chat, i) => (
        <ChatBubble key={i} isBot={chat.isBot}>
          {chat.message}
        </ChatBubble>
      ))}
      {/* <ChatBubble isBot thinking /> */}
      <div ref={chatEndRef} />
    </div>
  );
};

export default ChatBoxBody;
