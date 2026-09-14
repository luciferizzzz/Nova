#!/usr/bin/env node

const { startServer } = require('../backend/server')

function main() {
  const args = process.argv.slice(2)
  const command = args[0]

  switch (command) {
    case 'status':
      console.log('NOVA status')
      break
    case 'stop':
      console.log('NOVA stop: not yet implemented')
      break
    case 'update':
      console.log('NOVA update: not yet implemented')
      break
    case 'doctor':
      console.log('NOVA doctor: not yet implemented')
      break
    case 'help':
    case '--help':
    case '-h':
      printHelp()
      break
    case undefined:
      startServer()
      break
    default:
      console.error(`Unknown command: ${command}`)
      printHelp()
      process.exit(1)
  }
}

function printHelp() {
  console.log('')
  console.log('NOVA — Local News Intelligence System')
  console.log('')
  console.log('Usage: nova [command]')
  console.log('')
  console.log('Commands:')
  console.log('  (no command)  Start NOVA services')
  console.log('  status        Show NOVA status')
  console.log('  stop          Stop NOVA services')
  console.log('  update        Update NOVA')
  console.log('  doctor        Diagnose NOVA installation')
  console.log('  help          Show this help')
  console.log('')
}

main()
