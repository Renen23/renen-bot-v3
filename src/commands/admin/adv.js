import { BOT_LID, OWNER_LID, PREFIX } from "../../config.js";
import { DangerError, InvalidParameterError } from "../../errors/index.js";
import {
  checkIfMemberIsMuted,
  muteMember,
  scheduleUnmute,
  setMuteExpiration,
} from "../../utils/database.js";
import { formatDuration, onlyNumbers, parseDuration } from "../../utils/index.js";

export default {
  name: "adv",
  description:
    "Silencia um usuário por um tempo e desilencia sozinho (30m, 2h, 1d...).",
  commands: [
    "adv",
    "tmpmute",
    "tempomute",
    "mute-temp",
    "mute-temporario",
    "timemute",
  ],
  usage: `${PREFIX}adv @usuario 30m`,
  /**
   * @param {CommandHandleProps} props
   */
  handle: async ({
    words,
    isReply,
    replyLid,
    remoteJid,
    sendReply,
    sendSuccessReply,
    sendErrorReply,
    getGroupMetadata,
  }) => {
    const durationArg = words[words.length - 1];
    const durationMs = parseDuration(durationArg);

    if (!durationMs) {
      throw new InvalidParameterError(
        `Você precisa informar o tempo!\n\n` +
          `Exemplos:\n${PREFIX}adv @fulano 30m\n` +
          `${PREFIX}adv @fulano 2h\n${PREFIX}adv @fulano 1d`,
      );
    }

    const mention = words.find((arg) => arg.includes("@"));
    const targetLid = isReply ? replyLid : null;

    if (!mention && !targetLid) {
      throw new InvalidParameterError(
        `Mencione o usuário e o tempo!\n\n` +
          `Exemplos:\n${PREFIX}adv @fulano 30m\n${PREFIX}adv @fulano 2h`,
      );
    }

    const memberLid = targetLid || `${onlyNumbers(mention)}@lid`;

    if (onlyNumbers(memberLid) === onlyNumbers(OWNER_LID)) {
      throw new DangerError("Você não pode silenciar o dono do bot!");
    }

    if (onlyNumbers(memberLid) === onlyNumbers(BOT_LID)) {
      throw new DangerError("Você não pode me silenciar!");
    }

    const groupMetadata = await getGroupMetadata();
    const isUserInGroup = groupMetadata.participants.some(
      (participant) => onlyNumbers(participant.id) === onlyNumbers(memberLid),
    );

    if (!isUserInGroup) {
      return sendErrorReply(`O usuário @${onlyNumbers(memberLid)} não está neste grupo.`, [
        memberLid,
      ]);
    }

    const isTargetAdmin = groupMetadata.participants.some(
      (participant) =>
        onlyNumbers(participant.id) === onlyNumbers(memberLid) &&
        participant.admin,
    );

    if (isTargetAdmin) {
      throw new DangerError("Você não pode silenciar um administrador.");
    }

    const expiresAt = Date.now() + durationMs;

    if (checkIfMemberIsMuted(remoteJid, memberLid)) {
      setMuteExpiration(remoteJid, memberLid, expiresAt);
      scheduleUnmute(remoteJid, memberLid, expiresAt);

      await sendSuccessReply(
        `⏰ @${onlyNumbers(memberLid)} silenciado por mais ${formatDuration(durationMs)}!`,
        [memberLid],
      );
      return;
    }

    muteMember(remoteJid, memberLid);
    setMuteExpiration(remoteJid, memberLid, expiresAt);
    scheduleUnmute(remoteJid, memberLid, expiresAt);

    await sendReply(
      `🔇 *@${onlyNumbers(memberLid)}* silenciado por *${formatDuration(durationMs)}*.\n\n` +
        `Vou desilenciar sozinho quando o tempo acabar!`,
      [memberLid],
    );
  },
};
