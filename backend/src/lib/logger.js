const LEVELS = { error: 0, warn: 1, info: 2, debug: 3 }
const CURRENT = LEVELS[process.env.LOG_LEVEL] ?? LEVELS.info

function timestamp() {
  return new Date().toISOString()
}

function log(level, message, meta = {}) {
  if (LEVELS[level] > CURRENT) return
  const entry = { time: timestamp(), level, message, ...meta }
  const output = JSON.stringify(entry)
  if (level === 'error') {
    process.stderr.write(output + '\n')
  } else {
    process.stdout.write(output + '\n')
  }
}

const logger = {
  info:  (msg, meta) => log('info',  msg, meta),
  warn:  (msg, meta) => log('warn',  msg, meta),
  error: (msg, meta) => log('error', msg, meta),
  debug: (msg, meta) => log('debug', msg, meta),
}

export default logger
