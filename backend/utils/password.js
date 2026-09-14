const { hashSync, verifySync } = require('@node-rs/argon2')

const DEFAULT_OPTIONS = {
  memoryCost: 19456,
  timeCost: 2,
  parallelism: 1
}

function hashPassword(password) {
  return hashSync(password, DEFAULT_OPTIONS)
}

function verifyPassword(hash, password) {
  try {
    return verifySync(hash, password)
  } catch {
    return false
  }
}

module.exports = { hashPassword, verifyPassword }