import { useState, type HTMLAttributes, type MouseEvent, type ReactNode } from "react";
import styles from "./message-bubble.module.css";

export type MessageRole = "user" | "assistant";

const dietics = ['this','that','these','those','it','here' ]

export type MessageBubbleProps = HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
  messageRole: MessageRole;
  dieticMode?: boolean;
};

export function MessageBubble({
  children,
  className,
  messageRole,
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
      const isDieticWord = normalizedWord !== "" && dietics.includes(normalizedWord);

      if (!isDieticWord) {
        return word;
      }

      const dieticKey = `${index}-${normalizedWord}`;

      function selectDietic(e: MouseEvent<HTMLButtonElement>): void {
        e.preventDefault();
        setSelectedDietic((current) => (current === dieticKey ? null : dieticKey));
      }

      return (
        <button
          key={dieticKey}
          type="button"
          onClick={selectDietic}
          style={{
            background: "none",
            border: "none",
            padding: 0,
            margin: 0,
            color: selectedDietic === dieticKey ? "#2563eb" : "inherit",
            textDecoration: "underline",
            cursor: "pointer",
          }}
          aria-label={`Dietic word: ${normalizedWord}`}
        >
          {word}
        </button>
      );
    });
  };

  return (
    <div
      className={[styles.root, styles[messageRole], className]
        .filter(Boolean)
        .join(" ")}
      {...props}
    >
      {processedChildren()}
    </div>
  );
}
