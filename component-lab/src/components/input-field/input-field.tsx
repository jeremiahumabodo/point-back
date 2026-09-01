import styles from "./input-field.module.css";

function handleInput(event: React.FormEvent<HTMLTextAreaElement>) {
    const textarea = event.currentTarget;
    textarea.style.height = "auto";
    textarea.style.height = `${textarea.scrollHeight}px`
}

export function InputField() {

    return (
    <div className={styles.root}>
      <textarea 
        rows={1}        
        className={styles.input}
        placeholder="Ask about this component..."
        onInput={handleInput}
      />
    </div>
  );
}