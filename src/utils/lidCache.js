import { onlyNumbers } from "./index.js";

const lidCache = new Map();

export function cacheContacts(contacts) {
  if (!Array.isArray(contacts)) return;

  for (const contact of contacts) {
    const { id, lid, phoneNumber, name, notify, username, verifiedName } =
      contact;

    const lidJid = lid || (id?.endsWith("@lid") ? id : null);
    const pnJid = phoneNumber || (id && !id.endsWith("@lid") ? id : null);

    if (!lidJid) continue;

    lidCache.set(onlyNumbers(lidJid), {
      name: name || null,
      notify: notify || null,
      username: username || null,
      verifiedName: verifiedName || null,
      phoneNumber: pnJid ? onlyNumbers(pnJid) : null,
    });
  }
}

export function getLidInfo(userLid) {
  return lidCache.get(onlyNumbers(userLid)) || null;
}
