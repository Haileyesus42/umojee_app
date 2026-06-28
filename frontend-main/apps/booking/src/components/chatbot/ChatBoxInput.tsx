import React, {
  forwardRef,
  SyntheticEvent,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import { IoSend } from "react-icons/io5";
import SpeechRecognition, {
  useSpeechRecognition,
} from "react-speech-recognition";
import { IMAGES } from "../../assets";

export interface ChatBoxInputProps {
  onAskBot: (e: SyntheticEvent, message: string) => void;
}

const ChatBoxInput = forwardRef(({ onAskBot }: ChatBoxInputProps, ref) => {
  const [message, setMessage] = useState<string>("");
  const inputRef = useRef<HTMLInputElement>(null);
  const commands = [
    {
      command: "stop",
      callback: () => {
        SpeechRecognition.stopListening();
      },
    },
    {
      command: "clear",
      callback: ({ resetTranscript }: { resetTranscript: () => void }) => {
        resetTranscript();
        setMessage("");
      },
    },
  ];

  const {
    transcript,
    listening,
    resetTranscript,
    browserSupportsSpeechRecognition,
  } = useSpeechRecognition({ commands });

  function handleClearInput() {
    setMessage("");
    
  }

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState !== "visible") {
        SpeechRecognition.stopListening();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () =>
      document.removeEventListener("visibilitychange", handleVisibilityChange);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    // Scroll to the end of the input field when new text is added
    if (inputRef.current) {
      inputRef.current.scrollLeft = inputRef.current.scrollWidth;
    }
  }, [message]);

  useEffect(() => {
    if (transcript) {
      setMessage(transcript);
    }
  }, [transcript]);

  useImperativeHandle(ref, () => ({
    clearInput: handleClearInput,
  }));

  if (!browserSupportsSpeechRecognition) {
    return <span>Browser doesn't support speech recognition.</span>;
  }

  const handleToggleListenStop = () => {
    if (!listening) {
      SpeechRecognition.startListening({ continuous: true });
    } else SpeechRecognition.stopListening();
    resetTranscript();
  };

  const handleInputChange = (value: string) => {
    if (listening) SpeechRecognition.stopListening();
    if (transcript) resetTranscript();
    setMessage(value);
  };

  const handleSubmitInput = (e: SyntheticEvent, message: string) => {
    e.preventDefault();
    message && onAskBot(e, message);
    if (listening) SpeechRecognition.stopListening();
  };

  return (
    <div className="">
      <form
        onSubmit={(e) => handleSubmitInput(e, message)}
        className="border border-[#2152A3] border-opacity-50 rounded-xl overflow-hidden bg-white flex items-center justify-between gap-1"
      >
        {/* Voice chat button */}
        {/* <button
          type="button"
          onClick={handleToggleListenStop}
          className={`group grid place-content-center h-10 w-9 ${
            listening ? "bg-green-500 animate-pulse" : "bg-red-500"
          } p-2`}
        >
          <div
            className={`group-active:scale-95 ${listening && "animate-pulse"}`}
          >
            <img src={IMAGES.micIcon} alt="microphone" className="" />
          </div>
        </button> */}
        <input
          type="text"
          ref={inputRef}
          value={message}
          placeholder="Ask me anything about your flight."
          className=" grow h-11 indent-2 bg-transparent text-sm outline-none -mt-1"
          onChange={({ target }) => handleInputChange(target.value)}
        />
        <button type="submit" className="pl-1 pr-2">
          <IoSend className="text-[#2152A3] text-2xl active:scale-95" />
        </button>
      </form>
      <p className="mt-1 text-[0.65rem] font-light text-center">
        Umoja Chatbot V 0.1.05 all right reserved.
      </p>
    </div>
  );
});

export default ChatBoxInput;
