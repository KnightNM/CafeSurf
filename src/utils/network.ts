import os from 'os';

/**
 * Returns the first non-internal IPv4 address found on the machine.
 * Useful for printing a LAN-accessible URL at server startup.
 */
export function getLocalIPv4(): string {
  const interfaces = os.networkInterfaces();

  for (const name of Object.keys(interfaces)) {
    const ifaceGroup = interfaces[name];
    if (!ifaceGroup) continue;

    for (const iface of ifaceGroup) {
      // Node 18+ may return family as number 4 instead of string 'IPv4'
      const isIPv4 = iface.family === 'IPv4' || (iface.family as unknown) === 4;
      if (isIPv4 && !iface.internal) {
        return iface.address;
      }
    }
  }

  return '127.0.0.1';
}
