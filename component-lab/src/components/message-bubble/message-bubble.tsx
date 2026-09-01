import React, { useState, type HTMLAttributes, type MouseEvent, type ReactNode } from "react";
import styles from "./message-bubble.module.css";

export type MessageRole = "user" | "assistant";

const dietics = new Set(["this", "that", "these", "those", "it", "here"]);

export type MessageBubbleProps = HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
  messageRole: MessageRole;
  /** Identifies the sender, for example "You", "Codex", or another agent name. */
  author?: string;
  /** A display-ready message time, supplied by the caller. */
  timestamp: string;
  dieticMode?: boolean;
};

export function MessageBubble({
  children,
  className,
  messageRole,
  author = messageRole === "user" ? "You" : "Codex",
  timestamp,
  dieticMode = false,
  ...props
}: MessageBubbleProps) {
  const [selectedDietic, setSelectedDietic] = useState<string | null>(null);

  const processedChildren = (): ReactNode => {
    if (!dieticMode || typeof children !== "string") {
      return children;
    }

    return children.split(/(\s+)/).map((word, index) => {
      if (word.trim() === "") {
        return word;
      }

      const normalizedWord = word.toLowerCase().replace(/[^a-z]/g, "");
      const isDieticWord = normalizedWord !== "" && dietics.has(normalizedWord);

      if (!isDieticWord) {
        return word;
      }

      const dieticKey = `${index}-${normalizedWord}`;

      function selectDietic(e: MouseEvent<HTMLButtonElement>): void {
        e.preventDefault();
        setSelectedDietic((current: string | null) => (current === dieticKey ? null : dieticKey));
      }

      return React.createElement(
        "button",
        {
          key: dieticKey,
          type: "button",
          onClick: selectDietic,
          style: {
            background: "none",
            border: "none",
            padding: 0,
            margin: 0,
            color: selectedDietic === dieticKey ? "#2563eb" : "inherit",
            textDecoration: "underline",
            cursor: "pointer",
          },
          "aria-label": `Dietic word: ${normalizedWord}`,
        },
        word,
      );
    });
  };

  return React.createElement(
    "div",
    {
      className: [styles.root, styles[messageRole], className].filter(Boolean).join(" "),
      ...props,
    },
    React.createElement(
      "div",
      { className: styles.content },
      processedChildren(),
    ),
    React.createElement(
      "div",
      { className: styles.metadata },
      React.createElement("span", { className: styles.author }, author),
      React.createElement("time", { className: styles.timestamp }, timestamp),
    ),
  );
}
