import type { InputEvent, TextareaHTMLAttributes } from "react";
import styles from "./input-field.module.css";

export type InputFieldProps = TextareaHTMLAttributes<HTMLTextAreaElement>;

export function InputField({ className, onInput, ...props }: InputFieldProps) {
  function handleInput(event: InputEvent<HTMLTextAreaElement>) {
    const textarea = event.currentTarget;
    textarea.style.height = "auto";
    textarea.style.height = `${textarea.scrollHeight}px`;
    onInput?.(event);
  }

  return (
    <div className={[styles.root, className].filter(Boolean).join(" ")}>
      <textarea
        rows={1}
        className={styles.input}
        placeholder="Ask about this component..."
        onInput={handleInput}
        {...props}
      />
    </div>
  );
}