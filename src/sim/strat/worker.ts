// Worker thread: runs one task per message and posts back the result.
import { parentPort } from 'node:worker_threads';
import { runTask } from './tasks';
import type { Task } from './tasks';

parentPort?.on('message', (m: { id: number; task: Task }) => {
  parentPort?.postMessage({ id: m.id, result: runTask(m.task) });
});
