import { PREFIX } from "../../config.js";
import { InvalidParameterError } from "../../errors/index.js";

export default {
  name: "delete",
  description: "Excluo mensagens",
  commands: ["delete", "d", "apagar", "apaga", "del", "deletar"],
  usage: `${PREFIX}delete (mencione uma mensagem)`,
  /**
   * @param {CommandHandleProps} props
   */
  handle: async ({ deleteMessage, webMessage }) => {
    if (!webMessage?.message?.extendedTextMessage?.contextInfo) {
      throw new InvalidParameterError(
        "Você deve mencionar uma mensagem para excluir!",
      );
    }

    const { stanzaId, participant } =
      webMessage?.message?.extendedTextMessage?.contextInfo;

    if (!stanzaId || !participant) {
      throw new InvalidParameterError(
        "Você deve mencionar uma mensagem para excluir!",
      );
    }

    await deleteMessage({
      remoteJid: webMessage.key.remoteJid,
      fromMe: false,
      id: stanzaId,
      participant,
    });

    await deleteMessage(webMessage.key);
  },
};
