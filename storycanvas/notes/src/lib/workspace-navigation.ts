export async function saveBeforeLeaving(
  flush: () => Promise<unknown>,
  statuses: () => Record<string, string>,
): Promise<boolean> {
  try {
    await flush();
    return !Object.values(statuses()).some(status => status === 'error' || status === 'saving');
  } catch {
    return false;
  }
}
