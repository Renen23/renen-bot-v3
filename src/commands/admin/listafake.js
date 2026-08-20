import { PREFIX } from "../../config.js";
import { WarningError } from "../../errors/index.js";
import { getLidInfo } from "../../utils/lidCache.js";
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

      const fakes = [];

      for (const p of participants) {
        let number = null;

        if (p.id.endsWith("@s.whatsapp.net")) {
          number = onlyNumbers(p.id);
        } else if (p.id.endsWith("@lid")) {
          const lidInfo = getLidInfo(p.id);
          if (lidInfo?.phoneNumber) {
            number = lidInfo.phoneNumber;
          }
        }

        if (number && number.length > 0 && !number.startsWith("55")) {
          fakes.push({ id: p.id, number });
        }
      }

      if (!fakes.length) {
        await sendSuccessReact();
        await sendReply("Nenhum número estrangeiro encontrado no grupo.");
        return;
      }

      const list = fakes
        .map((p, i) => `${i + 1}. +${p.number}`)
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
