import assert from "node:assert/strict";
import todos from "./src/commands/member/todos.js";
import { checkPermission } from "./src/middlewares/index.js";

const sent = [];
const params = {
  fullArgs: "Oi tudo bem povo",
  remoteJid: "123@g.us",
  userLid: "999@lid",
  isGroup: true,
  socket: {
    sendMessage: async (...args) => sent.push(args),
  },
  webMessage: { key: { id: "msg-1", remoteJid: "123@g.us" } },
  sendSuccessReact: async () => {},
};

await todos.handle(params);
assert.equal(sent.length, 1);
assert.equal(sent[0][0], "123@g.us");
assert.equal(sent[0][1].text, "Oi tudo bem povo");
assert.equal(sent[0][1].mentionAll, true);
assert.equal(sent[0][1].text.includes("@"), false);
assert.equal(sent[0][2].quoted, params.webMessage);
assert.equal(
  await checkPermission({
    type: "member",
    userLid: "999@lid",
    remoteJid: "123@g.us",
  }),
  true,
);

let cooldownMessage = "";
try {
  await todos.handle(params);
} catch (error) {
  cooldownMessage = error.message;
}
assert.match(cooldownMessage, /Aguarde/);
console.log("todos mentionAll: OK");
