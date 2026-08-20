import { BOT_LID, OWNER_LID, PREFIX } from "../../config.js";
import { DangerError, WarningError } from "../../errors/index.js";
import { onlyNumbers } from "../../utils/index.js";

export default {
  name: "removefake",
  description: "Remove todos os números que não são do Brasil (+55) do grupo.",
  commands: ["removefake", "removefakes"],
  usage: `${PREFIX}removefake`,

  handle: async ({
    isGroup,
    socket,
    remoteJid,
    userLid,
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
        const number = onlyNumbers(p.id);
        return number.length > 0 && !number.startsWith("55");
      });

      if (!fakes.length) {
        await sendSuccessReact();
        await sendReply("Nenhum número estrangeiro encontrado no grupo.");
        return;
      }

      const fakeIds = fakes
        .map((p) => onlyNumbers(p.id))
        .filter((num) => {
          if (OWNER_LID && num === onlyNumbers(OWNER_LID)) return false;
          if (BOT_LID && num === onlyNumbers(BOT_LID)) return false;
          if (num === onlyNumbers(userLid)) return false;
          return true;
        });

      if (!fakeIds.length) {
        await sendWarningReply(
          "Nenhum fake para remover (todos são protegidos).",
        );
        return;
      }

      await sendSuccessReact();
      await sendReply(
        `Removendo ${fakeIds.length} números estrangeiros...`,
      );

      await socket.groupParticipantsUpdate(
        remoteJid,
        fakeIds.map((num) => `${num}@lid`),
        "remove",
      );
    } catch (error) {
      await sendErrorReply(`Erro ao remover fakes: ${error.message}`);
    }
  },
};
