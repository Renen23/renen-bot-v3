import { PREFIX } from "../../config.js";
import { InvalidParameterError, WarningError } from "../../errors/index.js";
import {
  activateAntifakeGroup,
  deactivateAntifakeGroup,
  isActiveAntifakeGroup,
} from "../../utils/database.js";
import { isFalse, isTrue } from "../../utils/index.js";

export default {
  name: "antifake",
  description:
    "Remove automaticamente membros com número estrangeiro; números brasileiros começam por 55.",
  commands: ["antifake", "anti-fake", "bloquear-estrangeiro", "sem-estrangeiro"],
  usage: `${PREFIX}antifake (1/0)`,

  handle: async ({ args, sendReply, sendSuccessReact, remoteJid }) => {
    if (!args.length) {
      throw new InvalidParameterError(
        `Use ${PREFIX}antifake 1 para ativar ou ${PREFIX}antifake 0 para desativar.`,
      );
    }

    const enable = isTrue(args[0]);
    const disable = isFalse(args[0]);

    if (!enable && !disable) {
      throw new InvalidParameterError(
        `Use ${PREFIX}antifake 1 para ativar ou ${PREFIX}antifake 0 para desativar.`,
      );
    }

    const alreadyActive = enable && isActiveAntifakeGroup(remoteJid);
    const alreadyInactive = disable && !isActiveAntifakeGroup(remoteJid);

    if (alreadyActive || alreadyInactive) {
      throw new WarningError(
        `O antifake já está ${enable ? "ativado" : "desativado"}.`,
      );
    }

    if (enable) {
      activateAntifakeGroup(remoteJid);
    } else {
      deactivateAntifakeGroup(remoteJid);
    }

    await sendSuccessReact();
    await sendReply(
      enable
        ? "🛡️ Antifake ativado! Números estrangeiros serão removidos quando o bot conseguir identificar o número real."
        : "🛡️ Antifake desativado com sucesso!",
    );
  },
};
