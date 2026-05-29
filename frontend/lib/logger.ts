function timestamp() {
  return new Date().toISOString().slice(11, 23); // HH:MM:SS.mmm
}

export function log(context: string, msg: string, data?: unknown) {
  if (data !== undefined) {
    console.log(`[${timestamp()}] [${context}] ${msg}`, data);
  } else {
    console.log(`[${timestamp()}] [${context}] ${msg}`);
  }
}

export function logError(context: string, msg: string, err: unknown) {
  const detail = err instanceof Error ? err.message : String(err);
  console.error(`[${timestamp()}] [${context}] ERROR ${msg}: ${detail}`);
}
