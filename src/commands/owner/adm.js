import { OWNER_LID, PREFIX } from "../../config.js";
import { InvalidParameterError, WarningError } from "../../errors/index.js";
import {
  addBotAdmin,
  getBotAdmins,
  isBotAdmin,
  removeBotAdmin,
} from "../../utils/database.js";
import {
  onlyNumbers,
  removeAccentsAndSpecialCharacters,
} from "../../utils/index.js";

export default {
  name: "adm",
  description:
    "Painel de quem pode usar os comandos do bot no grupo (só o dono gerencia).",
  commands: ["adm", "autorizados", "liberar-comandos", "admin-bot", "adminbot"],
  usage: `${PREFIX}adm | ${PREFIX}adm @usuario | ${PREFIX}adm rm @usuario`,
  /**
   * @param {CommandHandleProps} props
   */
  handle: async ({
    words,
    isReply,
    replyLid,
    remoteJid,
    isGroup,
    sendReply,
    sendSuccessReply,
  }) => {
    if (!isGroup) {
      throw new WarningError("Este comando deve ser usado dentro de um grupo.");
    }

    const commandWord = words.length ? words[0] : "";
    const normalized = removeAccentsAndSpecialCharacters(
      commandWord.toLowerCase(),
    );

    if (!words.length || ["lista", "listar", "list"].includes(normalized)) {
      const admins = getBotAdmins(remoteJid);

      const baseText =
        `👑 *Dono:* @${onlyNumbers(OWNER_LID)}\n\n` +
        `🔐 *Quem pode usar meus comandos neste grupo:*\n\n`;

      if (!admins.length) {
        await sendReply(
          baseText +
            `Ninguém além do dono.\n\n` +
            `Para liberar alguém: ${PREFIX}adm @usuario\n` +
            `Para remover: ${PREFIX}adm rm @usuario`,
        );
        return;
      }

      const list = admins
        .map((lid, index) => `${index + 1}. @${onlyNumbers(lid)}`)
        .join("\n");

      await sendReply(baseText + list, admins.map((a) => `${a}@lid`));
      return;
    }

    const isRemoveAction = ["rm", "remover", "remove", "tirar"].includes(
      normalized,
    );

    const mention = words.find((arg) => arg.includes("@"));
    const targetLid = isReply ? replyLid : null;

    if (!mention && !targetLid) {
      throw new InvalidParameterError(
        `Mencione um usuário (@) ou responda a mensagem dele.\n\n` +
          `Exemplos:\n${PREFIX}adm @fulano\n${PREFIX}adm rm @fulano`,
      );
    }

    const memberLid = targetLid || `${onlyNumbers(mention)}@lid`;

    if (onlyNumbers(memberLid) === onlyNumbers(OWNER_LID)) {
      throw new WarningError("Você já é o dono, não precisa se liberar!");
    }

    if (isRemoveAction) {
      if (!isBotAdmin(remoteJid, memberLid)) {
        await sendReply("Este usuário não está autorizado.");
        return;
      }

      removeBotAdmin(remoteJid, memberLid);
      await sendSuccessReply(
        `@${onlyNumbers(memberLid)} perdeu o acesso aos meus comandos neste grupo!`,
        [memberLid],
      );
      return;
    }

    if (isBotAdmin(remoteJid, memberLid)) {
      await sendReply(
        `@${onlyNumbers(memberLid)} já está autorizado neste grupo.`,
        [memberLid],
      );
      return;
    }

    addBotAdmin(remoteJid, memberLid);
    await sendSuccessReply(
      `@${onlyNumbers(memberLid)} agora pode usar meus comandos neste grupo!`,
      [memberLid],
    );
  },
};
