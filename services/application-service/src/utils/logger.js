const env = require('../config/env');

const levels = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3,
};

const currentLevel = env.isProduction ? levels.info : levels.debug;

function formatLog(level, message, meta = {}) {
  const timestamp = new Date().toISOString();
  const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
  return `[${timestamp}] [${level.toUpperCase()}] [application-service]: ${message}${metaStr}`;
}

const logger = {
  error(msg, meta) {
    if (currentLevel >= levels.error) console.error(formatLog('error', msg, meta));
  },
  warn(msg, meta) {
    if (currentLevel >= levels.warn) console.warn(formatLog('warn', msg, meta));
  },
  info(msg, meta) {
    if (currentLevel >= levels.info) console.log(formatLog('info', msg, meta));
  },
  debug(msg, meta) {
    if (currentLevel >= levels.debug) console.log(formatLog('debug', msg, meta));
  },
};

module.exports = logger;

