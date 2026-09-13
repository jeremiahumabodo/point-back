import { timingSafeEqual } from "node:crypto";
import type { FastifyInstance } from "fastify";

export function authenticateRequests(app: FastifyInstance, token: string) {
  app.addHook("onRequest", async (request, reply) => {
    // No CORS grants. Reject web origins even if a token is accidentally exposed.
    const origin = request.headers.origin;
    const host = request.headers.host ?? "";
    if (
      !/^(127\.0\.0\.1|\[::1\])(?::\d+)?$/.test(host) ||
      (origin &&
        !/^(chrome-extension|moz-extension):\/\/[a-zA-Z0-9-]+$/.test(origin))
    )
      return reply.code(403).send({ error: "Forbidden origin or host." });
    const actual = Buffer.from(request.headers.authorization ?? "");
    const expected = Buffer.from(`Bearer ${token}`);
    if (
      actual.length !== expected.length ||
      !timingSafeEqual(actual, expected)
    ) {
      return reply.code(401).send({
        error:
          "Invalid bridge token. Copy the token from the bridge terminal into connection settings.",
      });
    }
  });
}
