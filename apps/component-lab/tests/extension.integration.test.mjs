import { test } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const extension = fileURLToPath(
  new URL("../../browser-extension/.output/chrome-mv3", import.meta.url),
);
const threadId = "11111111-1111-4111-8111-111111111111";

test(
  "shared React UI in Shadow DOM preserves selection, editing, settings, streaming and history",
  { timeout: 60000 },
  async () => {
    const requests = [];
    const errors = [];
    let historyDelay = 0;
    let detailDelay = 0;
    const server = createServer(async (req, res) => {
      if (req.url === "/v1/messages") {
        let body = "";
        for await (const chunk of req) body += chunk;
        requests.push(JSON.parse(body));
        if (requests.at(-1).message.content === "Fail delivery") {
          res.writeHead(400, { "content-type": "application/json" });
          res.end(JSON.stringify({ error: "Fixture rejected message" }));
          return;
        }
        res.writeHead(200, { "content-type": "application/x-ndjson" });
        res.write(
          JSON.stringify({ type: "accepted", threadId, messageId: "message" }) +
            "\n",
        );
        res.write(
          JSON.stringify({
            type: "assistant",
            content: "Shared components are working.",
          }) + "\n",
        );
        setTimeout(
          () => res.end(JSON.stringify({ type: "completed" }) + "\n"),
          requests.at(-1).message.content === "Cancel response" ? 1500 : 250,
        );
      } else if (req.url === "/v1/threads") {
        res.setHeader("content-type", "application/json");
        setTimeout(
          () =>
            res.end(
              JSON.stringify({
                threads: [
                  {
                    id: threadId,
                    title: "Saved conversation",
                    updatedAt: new Date().toISOString(),
                  },
                ],
              }),
            ),
          historyDelay,
        );
      } else if (req.url === `/v1/threads/${threadId}`) {
        res.setHeader("content-type", "application/json");
        setTimeout(
          () =>
            res.end(
              JSON.stringify({
                id: threadId,
                title: "Saved conversation",
                updatedAt: new Date().toISOString(),
                messages: [
                  {
                    id: "old",
                    role: "assistant",
                    content: "Persisted response",
                    status: "completed",
                    createdAt: new Date().toISOString(),
                    references: [],
                    context: { selectedComponents: [] },
                  },
                ],
              }),
            ),
          detailDelay,
        );
      } else {
        res.setHeader("content-type", "text/html");
        res.end(`<!doctype html><html><head><style>
        button, input, aside, article, h2, p { font-size: 40px !important; color: red !important; }
        button { background: yellow !important; }
        body { min-height: 1800px; }
        #target { margin: 60px; width: 160px; height: 70px; }
        #other { margin: 40px; width: 160px; height: 70px; }
      </style></head><body><button id="target" data-component-name="Target">Target</button><button id="other">Other</button></body></html>`);
      }
    });
    await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
    const address = `http://127.0.0.1:${server.address().port}`;
    let context;
    try {
      context = await chromium.launchPersistentContext("", {
        channel: "chromium",
        headless: true,
        args: [
          `--disable-extensions-except=${extension}`,
          `--load-extension=${extension}`,
        ],
        viewport: { width: 1100, height: 850 },
      });
      const worker =
        context.serviceWorkers()[0] ??
        (await context.waitForEvent("serviceworker"));
      const page = await context.newPage();
      page.on("pageerror", (error) => errors.push(error.message));
      page.on("console", (message) => {
        if (message.type() === "error") errors.push(message.text());
      });
      await page.goto(address);
      await page.locator("#pointback-host").waitFor({ state: "attached" });
      const activate = () =>
        worker.evaluate(async () => {
          const tabs = await chrome.tabs.query({});
          const tab = tabs.find((tab) =>
            tab.url?.startsWith("http://127.0.0.1"),
          );
          await chrome.tabs.sendMessage(tab.id, {
            type: "pointback:open-panel",
          });
        });
      await activate();
      const panel = page.locator(".pb-panel");
      await panel.waitFor({ state: "visible" });
      assert.equal(
        await page.evaluate(() => document.querySelector(".pb-panel")),
        null,
        "UI should not be in page DOM",
      );
      assert.equal(
        await panel.evaluate(
          (node) => getComputedStyle(node.querySelector("h2")).fontSize,
        ),
        "14px",
      );
      assert.equal(await page.locator(".pb-send").isDisabled(), true);

      // A page-wide typing shortcut sees the shadow host, not the editor.
      // It must not steal focus or receive PointBack's editing events.
      await page.evaluate(() => {
        const field = document.createElement("input");
        field.id = "page-search";
        field.style.cssText = "position:fixed;left:10px;top:10px;width:180px";
        document.body.append(field);
        const events = [];
        const onKey = (event) => {
          events.push(event.type);
          const target = event.target;
          if (
            event.key.length === 1 &&
            !target.isContentEditable &&
            !target.matches("input,textarea")
          )
            field.focus();
        };
        const onEdit = (event) => events.push(event.type);
        for (const type of ["keydown", "keypress", "keyup"])
          document.addEventListener(type, onKey);
        for (const type of [
          "beforeinput",
          "input",
          "compositionstart",
          "compositionupdate",
          "compositionend",
          "copy",
          "cut",
          "paste",
        ])
          document.addEventListener(type, onEdit);
        window.keyboardFixture = { events, onKey, onEdit };
      });
      await page.locator(".pb-input").click();
      await page.keyboard.type("Typing stays here");
      assert.equal(
        await page.locator(".pb-input").innerText(),
        "Typing stays here",
      );
      assert.equal(
        await page
          .locator(".pb-input")
          .evaluate((node) => node.getRootNode().activeElement === node),
        true,
      );
      assert.equal(await page.locator("#page-search").inputValue(), "");
      assert.deepEqual(
        await page.evaluate(() => window.keyboardFixture.events),
        [],
      );
      // Native editing and React keyboard handling must continue to work.
      await page.keyboard.press("Shift+Enter");
      await page.keyboard.type("more");
      assert.equal(
        await page.locator(".pb-input").innerText(),
        "Typing stays here\nmore",
      );
      await page.locator(".pb-settings").click();
      await page.locator(".pb-bridge-token").click();
      await page.keyboard.type("private-token");
      assert.equal(
        await page.locator(".pb-bridge-token").inputValue(),
        "private-token",
      );
      assert.deepEqual(
        await page.evaluate(() => window.keyboardFixture.events),
        [],
      );
      await page.locator(".pb-settings-cancel").click();
      // Deliberately focusing the page should still allow normal page typing.
      await page.locator("#page-search").click();
      await page.keyboard.type("page text");
      assert.equal(
        await page.locator("#page-search").inputValue(),
        "page text",
      );
      assert.ok(
        (await page.evaluate(() => window.keyboardFixture.events)).includes(
          "input",
        ),
      );
      await page.evaluate(() => {
        const { onKey, onEdit } = window.keyboardFixture;
        for (const type of ["keydown", "keypress", "keyup"])
          document.removeEventListener(type, onKey);
        for (const type of [
          "beforeinput",
          "input",
          "compositionstart",
          "compositionupdate",
          "compositionend",
          "copy",
          "cut",
          "paste",
        ])
          document.removeEventListener(type, onEdit);
        document.querySelector("#page-search").remove();
        delete window.keyboardFixture;
      });
      await page.locator(".pb-new-chat").click();

      // MAIN-world metadata must still cross the isolated-world resolver boundary.
      await page.evaluate(() => {
        document.querySelector("#target").__reactFiber$fixture = {
          type: "button",
          return: {
            type: function TargetComponent() {},
            _debugSource: {
              fileName: "src/Target.tsx",
              lineNumber: 12,
              columnNumber: 3,
            },
            return: { type: function App() {} },
          },
        };
      });
      // Selection events are retargeted to the shadow host; UI clicks must not select it.
      await page.locator(".pb-select-components").click();
      await page.locator("#target").click();
      assert.equal(await page.locator(".pb-component-chip").count(), 1);
      await page.keyboard.press("Escape");
      await page.locator(".pb-component-chip").hover();
      await page.keyboard.down("Control");
      await page
        .locator(".pb-component-details-popover")
        .waitFor({ state: "visible" });
      assert.match(
        await page.locator(".pb-component-details-popover").innerText(),
        /TargetComponent/,
      );
      assert.match(
        await page.locator(".pb-component-details-popover").innerText(),
        /src\/Target\.tsx:12:3/,
      );
      assert.match(
        await page.locator(".pb-component-details-popover").innerText(),
        /React ancestry.*App/s,
      );
      await page.keyboard.up("Control");

      // Preserve caret inside Shadow DOM when rebuilding non-editable reference spans.
      const editor = page.locator(".pb-input");
      await editor.click();
      await page.keyboard.type("Explain this");
      await page.locator("#target").click();
      await page.keyboard.type(" please");
      assert.equal(await editor.innerText(), "Explain this please");
      assert.equal(
        await editor.locator(".pb-deictic-reference-linked").count(),
        1,
      );
      assert.equal(await page.locator(".pb-component-chip").count(), 1);

      await page.locator(".pb-settings").click();
      await page
        .locator(".pb-agent-bridge-address")
        .fill("https://example.com");
      await page.locator(".pb-settings-save").click();
      await page.waitForFunction(() =>
        document
          .querySelector("#pointback-host")
          .shadowRoot.querySelector(".pb-settings-status")
          ?.textContent.includes("loopback"),
      );
      assert.match(
        await page.locator(".pb-settings-status").innerText(),
        /loopback/,
      );
      await page.locator(".pb-agent-bridge-address").fill(address);
      await page.locator(".pb-bridge-token").fill("a".repeat(64));
      await page.locator(".pb-settings-save").click();
      await page.locator(".pb-settings-pane").waitFor({ state: "hidden" });
      assert.equal(await page.locator(".pb-bridge-token").inputValue(), "");
      await page.locator(".pb-send").click();
      await page.waitForFunction(
        () =>
          document
            .querySelector("#pointback-host")
            .shadowRoot.querySelector(".pb-assistant .pb-message-metadata")
            ?.textContent === "Assistant",
      );
      assert.equal(requests.length, 1);
      assert.equal(requests[0].message.content, "Explain this please");
      assert.equal(requests[0].message.references.length, 1);
      assert.equal(
        requests[0].message.references[0].components[0].id,
        "target",
      );
      assert.equal(
        requests[0].message.references[0].components[0].react.component.name,
        "TargetComponent",
      );
      assert.match(
        await page.locator(".pb-assistant").innerText(),
        /Shared components/,
      );
      await page.locator(".pb-user .pb-deictic-reference").hover();
      assert.equal(
        await page.locator(".pb-deictic-target-highlight").count(),
        1,
      );

      await page.locator(".pb-theme-toggle").click();
      assert.equal(
        await panel.evaluate((node) => node.classList.contains("pb-dark")),
        true,
      );
      await page.locator(".pb-history").click();
      await page.locator(".pb-history-thread").click();
      await page.locator(".pb-history-pane").waitFor({ state: "hidden" });
      assert.match(
        await page.locator(".pb-messages").innerText(),
        /Persisted response/,
      );
      await page.locator(".pb-new-chat").click();
      await page.locator(".pb-empty-state").waitFor();
      assert.equal(await page.locator(".pb-assistant").count(), 0);
      assert.equal(await page.locator(".pb-component-chip").count(), 0);

      // Late history responses cannot reopen a pane or replace the current chat.
      historyDelay = 200;
      await page.locator(".pb-history").click();
      await page.locator(".pb-history-close").click();
      await page.waitForTimeout(300);
      assert.equal(await page.locator(".pb-history-pane").isHidden(), true);
      assert.equal(await page.locator(".pb-message-scroll").isVisible(), true);
      historyDelay = 0;
      detailDelay = 200;
      await page.locator(".pb-history").click();
      await page.locator(".pb-history-thread").click();
      await page.locator(".pb-history-close").click();
      await page.waitForTimeout(300);
      assert.equal(await page.locator(".pb-empty-state").isVisible(), true);
      detailDelay = 0;

      // Settings/history are mutually exclusive props, including scroll wrappers.
      await page.locator(".pb-history").click();
      await page.locator(".pb-settings").click();
      assert.equal(await page.locator(".pb-history-pane").isHidden(), true);
      assert.equal(await page.locator(".pb-message-scroll").isHidden(), true);
      await page.locator(".pb-settings-close").click();

      // Drag and lasso remain in page coordinates, not shadow-host coordinates.
      const originalPanel = await panel.boundingBox();
      const header = await page.locator(".pb-component-name").boundingBox();
      await page.mouse.move(header.x + 15, header.y + 8);
      await page.mouse.down();
      await page.mouse.move(header.x - 40, header.y - 20, { steps: 5 });
      await page.mouse.up();
      assert.ok((await panel.boundingBox()).x < originalPanel.x);
      await page.locator(".pb-select-components").click();
      await page.mouse.move(20, 20);
      await page.mouse.down();
      await page.mouse.move(620, 235, { steps: 8 });
      await page.mouse.up();
      await page.keyboard.press("Escape");
      assert.equal(await page.locator(".pb-component-chip").count(), 2);
      await page.locator(".pb-component-chip").first().hover();
      await page.locator(".pb-remove-component").first().click();
      assert.equal(await page.locator(".pb-component-chip").count(), 1);
      await page.locator(".pb-component-chip").click();
      await page.locator("#target").click();
      assert.equal(await page.locator(".pb-component-chip").count(), 1);
      assert.equal(
        await page
          .locator("#target")
          .evaluate((node) => node.classList.contains("pointback-selected")),
        true,
      );
      await page.locator(".pb-new-chat").click();

      await editor.click();
      await page.keyboard.type("alpha");
      await page.keyboard.press("Shift+Enter");
      await page.keyboard.type("beta");
      assert.equal(await editor.innerText(), "alpha\nbeta");
      await page.locator(".pb-theme-toggle").click();
      assert.equal(
        await editor.innerText(),
        "alpha\nbeta",
        "unrelated React renders preserve native editing",
      );
      await page.locator(".pb-new-chat").click();
      await editor.click();
      await page.keyboard.type("Explain this");
      await page.keyboard.press("Escape");
      await page.locator(".pb-settings").click();
      await page.locator(".pb-deictic-settings-toggle").click();
      assert.equal(await page.locator(".pb-settings-pane").isHidden(), true);
      assert.equal(await editor.innerText(), "Explain this");
      assert.equal(await editor.locator(".pb-deictic-reference").count(), 0);
      await page.locator(".pb-settings").click();
      await page.locator(".pb-deictic-settings-toggle").click();
      assert.equal(await editor.locator(".pb-deictic-reference").count(), 1);
      await page.locator("#target").click();
      assert.equal(
        await editor.locator(".pb-deictic-reference-linked").count(),
        1,
      );
      await page.locator(".pb-new-chat").click();
      await editor.click();
      await page.keyboard.type("Fail delivery");
      await page.locator(".pb-send").click();
      await page.waitForFunction(
        () =>
          document
            .querySelector("#pointback-host")
            .shadowRoot.querySelector(".pb-assistant .pb-message-metadata")
            ?.textContent === "Fixture rejected message",
      );
      assert.equal(await editor.innerText(), "Fail delivery");
      assert.match(
        await page.locator(".pb-user").innerText(),
        /draft retained/,
      );
      await page.locator(".pb-new-chat").click();
      await editor.click();
      await page.keyboard.type("Cancel response");
      await page.locator(".pb-send").click();
      await page.locator(".pb-stop").waitFor({ state: "visible" });
      assert.equal(await page.locator(".pb-history").isDisabled(), true);
      await page.locator(".pb-stop").click();
      await page.locator(".pb-stop").waitFor({ state: "hidden" });
      assert.match(
        await page.locator(".pb-assistant").innerText(),
        /stopped|lost/,
      );

      // The single React root must preserve state when reopening/resetting.
      await page.locator(".pb-close").click();
      await activate();
      await panel.waitFor({ state: "visible" });
      assert.equal(await page.locator("#pointback-host").count(), 1);
      assert.match(
        await page.locator(".pb-assistant").innerText(),
        /stopped|lost/,
        "closing the panel does not discard React message state",
      );
      assert.deepEqual(errors, []);
    } finally {
      await context?.close();
      await new Promise((resolve) => server.close(resolve));
    }
  },
);
