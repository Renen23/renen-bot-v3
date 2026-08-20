import { PREFIX } from "../../config.js";
import { WarningError } from "../../errors/index.js";
import { onlyNumbers } from "../../utils/index.js";

export default {
  name: "listafake",
  description: "Lista todos os números no grupo que não são do Brasil (+55).",
  commands: ["listafake", "listafakes"],
  usage: `${PREFIX}listafake`,

  handle: async ({
    isGroup,
    socket,
    remoteJid,
    sendReply,
    sendSuccessReact,
    sendErrorReply,
    sendWarningReply,
  }) => {
    try {
      if (!isGroup) {
        throw new WarningError("Este comando só pode ser usado em grupos.");
      }

      const metadata = await socket.groupMetadata(remoteJid);
      const participants = metadata.participants || [];

      const fakes = participants.filter((p) => {
        if (!p.id.endsWith("@s.whatsapp.net")) return false;
        const number = onlyNumbers(p.id);
        return number.length > 0 && !number.startsWith("55");
      });

      if (!fakes.length) {
        await sendSuccessReact();
        await sendReply("Nenhum número estrangeiro encontrado no grupo.");
        return;
      }

      const list = fakes
        .map((p, i) => `${i + 1}. +${onlyNumbers(p.id)}`)
        .join("\n");

      await sendSuccessReact();
      await sendReply(
        `Números estrangeiros encontrados (${fakes.length}):\n\n${list}`,
      );
    } catch (error) {
      await sendErrorReply(`Erro ao listar fakes: ${error.message}`);
    }
  },
};
