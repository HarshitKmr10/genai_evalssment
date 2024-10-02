import { useEffect, useRef, useState } from "react";
import { PaperPlaneIcon, ReloadIcon } from "@radix-ui/react-icons";
import { cn } from "../lib/utils";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "../components/ui/select"; // Import Shadcn components
import { Button } from "../components/ui/button";
import { askDSATutor } from "../features/script";

type CustomLinkProps = {
  href?: string;
  children?: React.ReactNode;
};

type Message = {
  role: "user" | "assistant";
  text: string;
};

function CustomLink({ href, children }: CustomLinkProps) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      style={{ color: "#38bdf8", textDecoration: "underline" }}
    >
      {children}
    </a>
  );
}

const MAX_TEXTAREA_HEIGHT = 100;

const Chat = () => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [chatMessages, setChatMessages] = useState<Message[]>([]);
  const [chatLoading, setChatLoading] = useState(false);
  const [utterance, setUtterance] = useState<SpeechSynthesisUtterance | null>(
    null,
  );
  const [speechRate, setSpeechRate] = useState(1.2); // Default speech rate
  const [currentPosition, setCurrentPosition] = useState(0);
  const [isSpeaking, setIsSpeaking] = useState(false);

  useEffect(() => {
    if (chatMessages.length === 0) return;
    const lastMessage = chatMessages.at(-1);
    if (lastMessage?.role === "assistant") {
      speakMessage(lastMessage.text, speechRate);
    }
    document
      .querySelectorAll(".message")
      ?.item(chatMessages.length - 1)
      ?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages, speechRate]);

  function resetTextareaHeight() {
    const textarea = textareaRef.current!;
    textarea.style.height = "auto";
    textarea.style.height =
      Math.min(textarea.scrollHeight, MAX_TEXTAREA_HEIGHT) + "px";
    const maxHeightReached = textarea.scrollHeight >= MAX_TEXTAREA_HEIGHT;
    textarea.classList.toggle("overflow-y-hidden", !maxHeightReached);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (userCannotSendMessage()) return false;
      addUserMessage();
      resetTextareaHeight();
    }
  }

  function userCannotSendMessage() {
    return textareaRef.current!.value === "" || chatLoading;
  }

  function handleClick() {
    if (userCannotSendMessage()) return;
    addUserMessage();
  }

  function addUserMessage() {
    const message = textareaRef.current!.value;
    setChatMessages((prev) => [...prev, { role: "user", text: message }]);
    textareaRef.current!.value = "";
    askQuestion(message);
  }

  async function askQuestion(query: string) {
    setChatLoading(true);
    const response = await askDSATutor(query);
    if (response) {
      setChatMessages((prev) => [
        ...prev,
        { role: "assistant", text: response },
      ]);
    }
    setChatLoading(false);
  }

  function speakMessage(message: string, rate: number) {
    if (utterance) {
      window.speechSynthesis.cancel();
    }

    const newUtterance = new SpeechSynthesisUtterance(message);
    newUtterance.lang = "en-US";
    newUtterance.pitch = 1; // Default pitch
    newUtterance.rate = rate; // Use the passed rate

    newUtterance.onboundary = (event) => {
      if (event.charIndex >= 0) {
        setCurrentPosition(event.charIndex); // Track position
      }
    };

    newUtterance.onstart = () => {
      setIsSpeaking(true); // Set speaking state to true
    };

    newUtterance.onend = () => {
      setIsSpeaking(false); // Set speaking state to false when done
      setCurrentPosition(0); // Reset position if needed
    };

    window.speechSynthesis.speak(newUtterance);
    setUtterance(newUtterance);
  }

  function changeRateAndResume(message: string) {
    if (currentPosition < message.length) {
      const newMessagePart = message.slice(currentPosition);
      stopSpeech(); // Stop current speech
      speakMessage(newMessagePart, speechRate); // Pass the current rate
    }
  }

  function pauseSpeech() {
    if (window.speechSynthesis.speaking) {
      window.speechSynthesis.pause();
      setIsSpeaking(false); // Set speaking state to false
    }
  }

  function resumeSpeech() {
    if (window.speechSynthesis.paused) {
      window.speechSynthesis.resume();
      setIsSpeaking(true); // Set speaking state to true
    }
  }

  function stopSpeech() {
    window.speechSynthesis.cancel();
    setIsSpeaking(false); // Set speaking state to false
    setCurrentPosition(0); // Reset position if needed
  }

  return (
    <div className="relative flex h-full shrink-0 flex-col gap-4 rounded-lg p-2 shadow">
      <div className="flex items-center justify-between px-4">
        <h3 className="text-lg font-semibold text-gray-300">Chat</h3>
        {chatMessages.length > 0 &&
          chatMessages.at(-1)?.role === "assistant" && (
            <div className="flex items-center gap-2">
              <Select
                value={speechRate.toString()}
                onValueChange={(value) => {
                  setSpeechRate(parseFloat(value));
                  changeRateAndResume(chatMessages.at(-1)?.text ?? ""); // Resume speaking
                }}
              >
                <SelectTrigger className="w-20">
                  <SelectValue placeholder="Rate" />
                </SelectTrigger>
                <SelectContent className="z-[999999] bg-neutral-900 text-foreground">
                  <SelectItem value="0.5">0.5x</SelectItem>
                  <SelectItem value="1">1.0x</SelectItem>
                  <SelectItem value="1.2">1.2x</SelectItem>
                  <SelectItem value="1.5">1.5x</SelectItem>
                  <SelectItem value="2">2.0x</SelectItem>
                </SelectContent>
              </Select>
              {isSpeaking && (
                <Button
                  onClick={pauseSpeech}
                  variant="default"
                  size="sm"
                  className="bg-blue-500 text-white hover:bg-blue-500/80"
                >
                  Pause
                </Button>
              )}
              {!isSpeaking && (
                <Button
                  onClick={resumeSpeech}
                  variant="default"
                  size="sm"
                  className="bg-green-500 text-white hover:bg-green-500/80"
                >
                  Resume
                </Button>
              )}
              {isSpeaking && (
                <Button
                  onClick={stopSpeech}
                  variant="destructive"
                  size="sm"
                  disabled={!isSpeaking} // Disable if not speaking
                >
                  Stop
                </Button>
              )}
            </div>
          )}
      </div>
      <div className="grow">
        <div className="h-[400px] overflow-auto whitespace-pre-wrap">
          <div className="mb-16 space-y-2">
            {chatMessages.map((message, index) => (
              <div
                key={index}
                className={cn(
                  "message flex w-max max-w-[75%] flex-col gap-2 rounded-lg px-3 py-2 text-sm",
                  message.role === "user"
                    ? "ml-auto bg-neutral-950"
                    : "bg-neutral-700",
                )}
              >
                {message.role === "user" ? (
                  message.text
                ) : (
                  <Markdown
                    remarkPlugins={[remarkGfm]}
                    components={{ a: CustomLink }}
                  >
                    {message.text}
                  </Markdown>
                )}
              </div>
            ))}
            {chatLoading && (
              <div className="message flex w-max max-w-[75%] items-center gap-2 rounded-lg bg-neutral-700 px-3 py-2 text-sm">
                <ReloadIcon className="animate-spin" />
              </div>
            )}
          </div>
        </div>
      </div>
      <div className="absolute bottom-0 left-0 mb-4 w-full px-4">
        <div className="relative flex w-full rounded-md bg-zinc-800 py-2 shadow-lg md:py-3 md:pl-4">
          <textarea
            ref={textareaRef}
            name="user-message"
            rows={1}
            className="max-h-[200px] w-full resize-none overflow-y-hidden border-0 bg-transparent pl-2 pr-7 text-foreground outline-none md:pl-0"
            placeholder="Ask Something..."
            onInput={resetTextareaHeight}
            onKeyDown={handleKeyDown}
          ></textarea>
          <button
            type="submit"
            className="absolute bottom-1.5 right-1 p-1 text-lg text-[#91ADF6] md:bottom-2.5 md:right-2"
            onClick={handleClick}
          >
            <PaperPlaneIcon />
          </button>
        </div>
      </div>
    </div>
  );
};

export default Chat;
