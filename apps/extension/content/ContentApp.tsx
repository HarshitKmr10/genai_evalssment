import { useState } from "react";
import Draggable from "react-draggable";
import { buttonVariants } from "../components/ui/button";
import { DragHandleDots2Icon } from "@radix-ui/react-icons";
import { cn } from "../lib/utils";
import clsx from "clsx";
import Chat from "./Chat";

export default function ContentApp() {
  const [isOpen, setIsOpen] = useState(false);

  const toggleDropdown = () => {
    setIsOpen((prev) => !prev);
  };

  return (
    <Draggable handle="#drag-handle">
      <div className="relative inline-block">
        <div
          className={cn(
            buttonVariants({ variant: "default", size: "lg" }),
            "px-0 pr-4 hover:bg-primary",
            clsx({
              "rounded-b-none": isOpen,
              "shadow-lg": !isOpen,
            }),
          )}
        >
          <div className="px-2">
            <DragHandleDots2Icon
              id="drag-handle"
              className="h-4 w-4 cursor-grab"
            />
          </div>
          <button onClick={toggleDropdown} className="focus:outline-none">
            DSA Tutor
          </button>
        </div>

        <div
          className={cn(
            "absolute left-0 z-50 hidden w-[300px] rounded-md rounded-tl-none bg-primary text-primary-foreground shadow-2xl",
            clsx({ block: isOpen }),
          )}
        >
          <Chat />
        </div>
      </div>
    </Draggable>
  );
}
