import Fastify from "fastify";

type SourceLocation = {
  fileName: string;
  lineNumber?: number;
  columnNumber?: number;
};

type ReactComponent = {
  name: string;
  source?: SourceLocation;
};

type ComponentFootprint = {
  name: string;
  tagName: string;
  id?: string;
  componentName?: string;
  ariaLabel?: string;
  role?: string;
  testId?: string;
  textExcerpt?: string;
  domPath: string[];
  selector: string;
  page: { origin: string; path: string; title?: string };
  react?: { component: ReactComponent; ancestry: ReactComponent[] };
};

type PointBackMessage = {
  projectDirectory: string;
  message: {
    content: string;
    references: Array<{
      id: string;
      term: string;
      start: number;
      end: number;
      components: ComponentFootprint[];
    }>;
  };
  context: { selectedComponents: ComponentFootprint[] };
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isString(value: unknown, maximumLength = 10_000): value is string {
  return typeof value === "string" && value.length <= maximumLength;
}

function isSourceLocation(value: unknown): value is SourceLocation {
  if (!isRecord(value) || !isString(value.fileName, 4_096)) return false;
  return (value.lineNumber === undefined || typeof value.lineNumber === "number")
    && (value.columnNumber === undefined || typeof value.columnNumber === "number");
}

function isReactComponent(value: unknown): value is ReactComponent {
  return isRecord(value)
    && isString(value.name, 512)
    && (value.source === undefined || isSourceLocation(value.source));
}

function isComponentFootprint(value: unknown): value is ComponentFootprint {
  if (!isRecord(value)
    || !isString(value.name, 512)
    || !isString(value.tagName, 128)
    || !Array.isArray(value.domPath)
    || value.domPath.length > 12
    || !value.domPath.every((part) => isString(part, 1_024))
    || !isString(value.selector, 8_192)
    || !isRecord(value.page)
    || !isString(value.page.origin, 2_048)
    || !isString(value.page.path, 4_096)) return false;

  const optionalStrings = [value.id, value.componentName, value.ariaLabel, value.role, value.testId, value.textExcerpt, value.page.title];
  if (!optionalStrings.every((field) => field === undefined || isString(field))) return false;

  return value.react === undefined
    || (isRecord(value.react)
      && isReactComponent(value.react.component)
      && Array.isArray(value.react.ancestry)
      && value.react.ancestry.length <= 50
      && value.react.ancestry.every(isReactComponent));
}

function isPointBackMessage(value: unknown): value is PointBackMessage {
  if (!isRecord(value)
    || !isString(value.projectDirectory, 4_096)
    || !isRecord(value.message)
    || !isString(value.message.content, 20_000)
    || !Array.isArray(value.message.references)
    || value.message.references.length > 50
    || !isRecord(value.context)
    || !Array.isArray(value.context.selectedComponents)
    || value.context.selectedComponents.length > 50
    || !value.context.selectedComponents.every(isComponentFootprint)) return false;

  return value.message.references.every((reference) => isRecord(reference)
    && isString(reference.id, 256)
    && isString(reference.term, 1_024)
    && typeof reference.start === "number"
    && typeof reference.end === "number"
    && Array.isArray(reference.components)
    && reference.components.length <= 50
    && reference.components.every(isComponentFootprint));
}

const app = Fastify({
  logger: true,
  bodyLimit: 1_000_000,
});

app.post("/v1/messages", async (request, reply) => {
  if (!isPointBackMessage(request.body)) {
    return reply.code(400).send({ error: "Invalid PointBack message payload" });
  }

  const messageId = crypto.randomUUID();
  // Agent/session dispatch belongs behind this endpoint. Do not log the message
  // body: it may contain source paths, UI text, or developer prompts.
  request.log.info({ messageId, references: request.body.message.references.length }, "PointBack message accepted");
  return reply.code(202).send({ messageId });
});

app.get("/health", async () => ({ status: "ok" }));

await app.listen({ host: "127.0.0.1", port: 3000 });
