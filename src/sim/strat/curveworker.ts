// Worker thread of the curve measurements: one task per message, the result posted back.
import { parentPort } from 'node:worker_threads';
import { runCurveTask } from './curve';
import type { CurveTask } from './curve';

parentPort?.on('message', (m: { id: number; task: CurveTask }) => {
  parentPort?.postMessage({ id: m.id, result: runCurveTask(m.task) });
});
