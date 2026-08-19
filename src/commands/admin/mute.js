/**
 * Desenvolvido por: Mkg
 * Refatorado por: Dev Gui
 *
 * @author Dev Gui
 */
import { BOT_LID, OWNER_LID, PREFIX } from "../../config.js";
import { DangerError } from "../../errors/index.js";
import {
  checkIfMemberIsMuted,
  muteMember,
  scheduleUnmute,
  setMuteExpiration,
} from "../../utils/database.js";
import {
  formatDuration,
  onlyNumbers,
  parseDuration,
} from "../../utils/index.js";

export default {
  name: "mute",
  description:
    "Silencia um usuário no grupo (apaga as mensagens dele). Use com tempo opcional (ex: /mute @x 30m) para desilenciar sozinho.",
  commands: ["mute", "mutar"],
  usage: `${PREFIX}mute @usuario (ou responda à mensagem) | ${PREFIX}mute @usuario 30m`,
  /**
   * @param {CommandHandleProps} props
   */
  handle: async ({
    words,
    remoteJid,
    replyLid,
    sendErrorReply,
    sendSuccessReply,
    getGroupMetadata,
    isGroup,
  }) => {
    if (!isGroup) {
      throw new DangerError("Este comando só pode ser usado em grupos.");
    }

    const durationArg = words[words.length - 1];
    const durationMs = parseDuration(durationArg);
    const mentionArgs = durationMs ? words.slice(0, -1) : words;

    const mention = mentionArgs.find((arg) => arg.includes("@"));

    if (!mentionArgs.length && !replyLid) {
      throw new DangerError(
        `Você precisa mencionar um usuário ou responder à mensagem do usuário que deseja mutar.\n\n` +
          `Exemplo: ${PREFIX}mute @fulano\n` +
          `Com tempo: ${PREFIX}mute @fulano 30m`,
      );
    }

    const userId = replyLid
      ? replyLid
      : mention
      ? `${onlyNumbers(mention)}@lid`
      : null;

    if (!userId) {
      throw new DangerError(
        `Mencione um usuário válido!\n\nExemplo: ${PREFIX}mute @fulano`,
      );
    }

    const targetUserNumber = onlyNumbers(userId);

    if (OWNER_LID && onlyNumbers(userId) === onlyNumbers(OWNER_LID)) {
      throw new DangerError("Você não pode mutar o dono do bot!");
    }

    if (BOT_LID && onlyNumbers(userId) === onlyNumbers(BOT_LID)) {
      throw new DangerError("Você não pode mutar o bot.");
    }

    const groupMetadata = await getGroupMetadata();
    const isUserInGroup = groupMetadata.participants.some(
      (participant) => onlyNumbers(participant.id) === targetUserNumber
    );

    if (!isUserInGroup) {
      return sendErrorReply(
        `O usuário @${targetUserNumber} não está neste grupo.`,
        [userId]
      );
    }

    const isTargetAdmin = groupMetadata.participants.some(
      (participant) =>
        onlyNumbers(participant.id) === targetUserNumber && participant.admin
    );

    if (isTargetAdmin) {
      throw new DangerError("Você não pode mutar um administrador.");
    }

    if (checkIfMemberIsMuted(remoteJid, userId)) {
      return sendErrorReply(
        `O usuário @${targetUserNumber} já está silenciado neste grupo.`,
        [userId]
      );
    }

    muteMember(remoteJid, userId);

    if (durationMs) {
      const expiresAt = Date.now() + durationMs;
      setMuteExpiration(remoteJid, userId, expiresAt);
      scheduleUnmute(remoteJid, userId, expiresAt);

      await sendSuccessReply(
        `@${targetUserNumber} silenciado por *${formatDuration(durationMs)}*!\nVou desilenciar sozinho.`,
        [userId]
      );
      return;
    }

    await sendSuccessReply(
      `@${targetUserNumber} foi mutado com sucesso neste grupo!`,
      [userId]
    );
  },
};
