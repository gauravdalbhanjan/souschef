// Runs the on-device model off the main thread so the UI never stalls while
// it loads or generates. lib/llm.js talks to this worker.
import { WebWorkerMLCEngineHandler } from '@mlc-ai/web-llm'

const handler = new WebWorkerMLCEngineHandler()
self.onmessage = (msg) => handler.onmessage(msg)
