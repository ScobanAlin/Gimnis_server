// src/models/logModel.ts
type LogEntry = {
  timestamp: string;
  message: string;
};

let logs: LogEntry[] = [];

export function addLog(message: string) {
  const entry = { timestamp: new Date().toISOString(), message };
  logs.push(entry);
  if (logs.length > 100) logs.shift(); // keep last 100
  return entry;
}

export function getLogs() {
  return logs;
}
