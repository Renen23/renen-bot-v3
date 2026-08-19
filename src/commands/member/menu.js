import path from "node:path";
import { ASSETS_DIR, PREFIX } from "../../config.js";
import { menuMessage } from "../../menu.js";

export default {
  name: "menu",
  description: "Abre o menu completo de comandos do bot.",
  commands: ["menu"],
  usage: `${PREFIX}menu`,
  /**
   * @param {CommandHandleProps} props
   */
  handle: async ({ remoteJid, sendSuccessReact, sendImageFromFile }) => {
    await sendSuccessReact();

    const imagePath = path.join(ASSETS_DIR, "images", "renen-bot.webp");
    await sendImageFromFile(imagePath, `\n\n${menuMessage(remoteJid)}`);
  },
};
