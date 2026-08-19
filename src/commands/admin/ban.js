import { BOT_LID, OWNER_LID, PREFIX } from "../../config.js";
import { DangerError, InvalidParameterError } from "../../errors/index.js";
import { onlyNumbers } from "../../utils/index.js";
import { errorLog } from "../../utils/logger.js";

export default {
  name: "ban",
  description: "Removo um membro do grupo",
  commands: ["ban", "kick"],
  usage: `${PREFIX}ban @marcar_membro 

ou 

${PREFIX}ban (mencionando uma mensagem)`,
  /**
   * @param {CommandHandleProps} props
   */
  handle: async ({
    words,
    isReply,
    socket,
    remoteJid,
    replyLid,
    sendReply,
    userLid,
    sendSuccessReact,
    sendErrorReply,
  }) => {
    try {
      if (!words.length && !isReply) {
        throw new InvalidParameterError(
          "Você precisa mencionar ou marcar um membro!"
        );
      }

      if (words.length && !words[0].includes("@")) {
        throw new InvalidParameterError(
          'Você precisa mencionar um membro com "@"!'
        );
      }

      const userId = words[0] ? `${onlyNumbers(words[0])}@lid` : null;

      const memberToRemoveLid = isReply ? replyLid : userId;

      if (!memberToRemoveLid) {
        throw new InvalidParameterError("Membro inválido!");
      }

      if (onlyNumbers(memberToRemoveLid) === onlyNumbers(userLid)) {
        throw new DangerError("Você não pode remover você mesmo!");
      }

      const resolvedOwnerLid = OWNER_LID;

      if (
        resolvedOwnerLid &&
        onlyNumbers(memberToRemoveLid) === onlyNumbers(resolvedOwnerLid)
      ) {
        throw new DangerError("Você não pode remover o dono do bot!");
      }

      if (
        BOT_LID &&
        onlyNumbers(memberToRemoveLid) === onlyNumbers(BOT_LID)
      ) {
        throw new DangerError("Você não pode me remover!");
      }

      await socket.groupParticipantsUpdate(
        remoteJid,
        [memberToRemoveLid],
        "remove"
      );

      await sendSuccessReact();
      await sendReply("Membro removido com sucesso!");
    } catch (error) {
      errorLog(JSON.stringify(error, null, 2));
      await sendErrorReply(
        `Ocorreu um erro ao remover o membro: ${error.message}`
      );
    }
  },
};
