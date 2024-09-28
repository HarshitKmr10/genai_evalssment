import { useEffect, useRef, useState } from "react";
import { PaperPlaneIcon, ReloadIcon } from "@radix-ui/react-icons";
import { cn } from "../lib/utils";
import { webSearch, webSearchModel } from "../features/webSearch";

const MAX_TEXTAREA_HEIGHT = 100;

const Chat = () => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [chatMessages, setChatMessages] = useState<string[]>([]);
  const [chatLoading, setChatLoading] = useState(false);

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

  useEffect(() => {
    if (chatMessages.length === 0) return;
    document
      .querySelectorAll(".message")
      ?.item(chatMessages.length - 1)
      ?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  function userCannotSendMessage() {
    return (
      chatMessages.length % 2 !== 0 ||
      textareaRef.current!.value === "" ||
      chatLoading
    );
  }

  function handleClick() {
    if (userCannotSendMessage()) return;
    addUserMessage();
  }

  function addUserMessage() {
    const message = textareaRef.current!.value;
    setChatMessages((prev) => [...prev, message]);
    textareaRef.current!.value = "";
    askQuestion(message);
  }

  async function askQuestion(query: string) {
    setChatLoading(true);
    await new Promise((res) => setTimeout(res, 3000));
    // const response = "hiii";
    const response = await webSearch(query);
    if (response) {
      setChatMessages((prev) => [...prev, response]);
    }
    setChatLoading(false);
  }

  return (
    <div className="relative flex h-full shrink-0 flex-col gap-4 rounded-lg p-2 shadow">
      <h3 className="text-center text-lg font-semibold text-gray-300">Chat</h3>
      <div className="grow">
        <div className="h-[250px] overflow-auto whitespace-pre-wrap">
          <div className="mb-16 space-y-2">
            {chatMessages.map((message, index) => (
              <div
                key={index}
                className={cn(
                  "message flex w-max max-w-[75%] flex-col gap-2 rounded-lg px-3 py-2 text-sm",
                  index % 2 === 0 ? "ml-auto bg-neutral-950" : "bg-neutral-700",
                )}
              >
                {message}
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
