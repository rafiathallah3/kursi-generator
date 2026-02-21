import { EventEmitter } from 'events';

const globalForEmitter = global as unknown as { emitter: EventEmitter };

export const emitter = globalForEmitter.emitter || new EventEmitter();

if (process.env.NODE_ENV !== 'production') globalForEmitter.emitter = emitter;
