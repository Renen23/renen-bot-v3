import { PREFIX } from "../../config.js";
import { InvalidParameterError, WarningError } from "../../errors/index.js";
import {
  resetWelcomeMessage,
  setWelcomeMessage,
} from "../../utils/database.js";
import { removeAccentsAndSpecialCharacters } from "../../utils/index.js";

export default {
  name: "setwelcome",
  description: "Altera a mensagem de boas-vindas deste grupo.",
  commands: ["setwelcome", "set-welcome", "set-bemvindo", "set-boasvindas", "mudar-boasvindas"],
  usage: `${PREFIX}setwelcome <mensagem com @member>`,
  /**
   * @param {CommandHandleProps} props
   */
  handle: async ({ fullArgs, remoteJid, isGroup, sendSuccessReply }) => {
    if (!isGroup) {
      throw new WarningError("Este comando só pode ser usado em grupos.");
    }

    if (!fullArgs) {
      throw new InvalidParameterError(
        `Envie a nova mensagem de boas-vindas com @member no lugar do nome.\n\nExemplo: ${PREFIX}set-welcome Bem-vindo @member!`,
      );
    }

    const normalized = removeAccentsAndSpecialCharacters(
      fullArgs.trim().toLowerCase(),
    );

    if (["padrao", "default", "reset"].includes(normalized)) {
      resetWelcomeMessage(remoteJid);
      await sendSuccessReply(
        "Mensagem de boas-vindas restaurada para a padrão!",
      );
      return;
    }

    setWelcomeMessage(remoteJid, fullArgs.trim());
    await sendSuccessReply("Mensagem de boas-vindas atualizada com sucesso!");
  },
};
