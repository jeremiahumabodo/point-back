// Deterministic subprocess fixture; never calls a provider or reads a repository.
const mode = process.argv[2];
let prompt = "";
for await (const chunk of process.stdin) prompt += chunk;
if (!prompt.includes("untrusted observed UI evidence")) process.exit(2);
if (mode === "hang") {
  setInterval(() => {}, 1000);
} else if (mode === "malformed") {
  console.log("not json");
} else if (mode === "exit") {
  process.exit(1);
} else {
  console.log(
    JSON.stringify({
      type: "thread.started",
      thread_id: "11111111-1111-4111-8111-111111111111",
    }),
  );
  console.log(
    JSON.stringify({
      type: "item.started",
      item: { type: "command_execution" },
    }),
  );
  const message = JSON.stringify({
    type: "item.completed",
    item: { id: "a", type: "agent_message", text: "Hello UI 👋" },
  });
  const bytes = Buffer.from(message + "\n");
  const split = bytes.indexOf(Buffer.from("👋")) + 1;
  process.stdout.write(bytes.subarray(0, split));
  await new Promise((resolve) => setTimeout(resolve, 10));
  process.stdout.write(bytes.subarray(split));
  console.log(message); // Duplicate item must not be appended twice.
  if (mode === "failure")
    console.log(
      JSON.stringify({
        type: "turn.failed",
        error: { message: "fixture failure" },
      }),
    );
  else process.stdout.write(JSON.stringify({ type: "turn.completed" })); // No final newline.
}
