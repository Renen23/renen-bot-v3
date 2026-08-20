import { BOT_LID, OWNER_LID, PREFIX } from "../../config.js";
import { DangerError, WarningError } from "../../errors/index.js";
import { getLidInfo } from "../../utils/lidCache.js";
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

      const fakeIds = fakes
        .filter((p) => {
          if (OWNER_LID && p.number === onlyNumbers(OWNER_LID)) return false;
          if (BOT_LID && p.number === onlyNumbers(BOT_LID)) return false;
          if (p.number === onlyNumbers(userLid)) return false;
          return true;
        })
        .map((p) => p.id);

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

      await socket.groupParticipantsUpdate(remoteJid, fakeIds, "remove");
    } catch (error) {
      await sendErrorReply(`Erro ao remover fakes: ${error.message}`);
    }
  },
};
