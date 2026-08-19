import { InvalidParameterError, WarningError } from "../../errors/index.js";

const cooldowns = new Map();
const COOLDOWN_MS = 15_000;

export default {
  name: "todos",
  description: "Envia uma mensagem usando a menção coletiva do grupo.",
  commands: ["todos", "todo", "marcartodos", "marcar-todos"],
  usage: "/todos <mensagem>",

  handle: async ({
    fullArgs,
    remoteJid,
    userLid,
    isGroup,
    socket,
    webMessage,
    sendSuccessReact,
  }) => {
    if (!isGroup) {
      throw new WarningError("Este comando só pode ser usado em grupos.");
    }

    const text = fullArgs?.trim();
    if (!text) {
      throw new InvalidParameterError(
        "Escreva a mensagem que deve ser enviada. Exemplo: /todos Oi, pessoal!",
      );
    }

    const cooldownKey = `${remoteJid}:${String(userLid || "anonimo")}`;
    const lastUsedAt = cooldowns.get(cooldownKey) || 0;
    const remaining = COOLDOWN_MS - (Date.now() - lastUsedAt);
    if (remaining > 0) {
      throw new WarningError(
        `Aguarde ${Math.ceil(remaining / 1000)} segundos antes de usar este comando novamente.`,
      );
    }

    cooldowns.set(cooldownKey, Date.now());
    await sendSuccessReact();
    await socket.sendMessage(
      remoteJid,
      { text, mentionAll: true },
      { quoted: webMessage },
    );
  },
};
