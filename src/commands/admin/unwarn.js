import { BOT_LID, OWNER_LID, PREFIX } from "../../config.js";
import { DangerError, InvalidParameterError } from "../../errors/index.js";
import { onlyNumbers } from "../../utils/index.js";
import { errorLog } from "../../utils/logger.js";
import {
  getAllWarns,
  removeLastWarn,
  revokeWarnByIndex,
} from "../../utils/warnSystem.js";

export default {
  name: "unwarn",
  description: "Remove ou lista advertências válidas.",
  commands: [
    "unwarn",
    "perdoaradvertência",
    "perdoaradvt",
    "removeradvertencia",
    "advtremove",
  ],
  usage: `${PREFIX}unwarn @usuario | ${PREFIX}unwarn @usuario list | ${PREFIX}unwarn @usuario <número>`,
  /**
   * @param {CommandHandleProps} props
   */
  handle: async ({
    words,
    isReply,
    replyLid,
    remoteJid,
    sendReply,
    sendErrorReply,
  }) => {
    try {
      if (!words.length && !isReply) {
        throw new InvalidParameterError(
          "Mencione um usuário ou responda a uma mensagem.",
        );
      }

      if (words.length && !words[0].includes("@")) {
        throw new InvalidParameterError('Use "@" ao mencionar um usuário.');
      }

      const targetLid = isReply ? replyLid : `${onlyNumbers(words[0])}@lid`;

      if (!targetLid) {
        throw new InvalidParameterError("Membro inválido!");
      }

      if (
        onlyNumbers(targetLid) === onlyNumbers(BOT_LID) ||
        onlyNumbers(targetLid) === onlyNumbers(OWNER_LID)
      ) {
        throw new DangerError(
          "Não é possível alterar advertências deste usuário.",
        );
      }

      const action = words[1]?.toLowerCase();
      const allWarns = getAllWarns(remoteJid, targetLid);
      const validWarns = allWarns.filter((w) => w.valid);

      if (validWarns.length === 0) {
        return sendReply("Usuário não tem advertências válidas.");
      }

      if (action === "list") {
        let msg = `📋 *Advertências válidas de @${targetLid.split("@")[0]}:*\n\n`;
        validWarns.forEach((w, i) => {
          const date = new Date(w.timestamp).toLocaleDateString("pt-BR");
          msg += `${i + 1}. "${w.reason}" (${date})\n`;
        });

        return sendReply(msg, [targetLid]);
      }

      if (action && !isNaN(action)) {
        const index = parseInt(action, 10) - 1;
        if (index >= 0 && index < validWarns.length) {
          revokeWarnByIndex(remoteJid, targetLid, index);
          return sendReply(`✅ Advertência #${index + 1} removida.`);
        }
      }

      removeLastWarn(remoteJid, targetLid);
      await sendReply(`✅ Última advertência removida.`);
    } catch (error) {
      errorLog(JSON.stringify(error, null, 2));
      await sendErrorReply(`Erro: ${error.message}`);
    }
  },
};
