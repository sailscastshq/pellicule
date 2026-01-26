#!/usr/bin/env node

import { parseArgs } from 'node:util'
import { resolve, join, dirname } from 'node:path'
import { existsSync, mkdirSync, readFileSync, writeFileSync, readdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const pkg = JSON.parse(readFileSync(resolve(__dirname, '../package.json'), 'utf-8'))
const VERSION = pkg.version

// ANSI colors
const colors = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  pellicule: '\x1b[38;2;66;184;131m',
  bgPellicule: '\x1b[48;2;66;184;131m'
}

const c = {
  error: (s) => `${colors.red}${s}${colors.reset}`,
  info: (s) => `${colors.cyan}${s}${colors.reset}`,
  dim: (s) => `${colors.dim}${s}${colors.reset}`,
  bold: (s) => `${colors.bold}${s}${colors.reset}`,
  highlight: (s) => `${colors.pellicule}${s}${colors.reset}`,
  brand: (s) => `${colors.bgPellicule}${colors.white}${colors.bold}${s}${colors.reset}`
}

const HELP = `
${c.bold('create-pellicule')} ${c.dim(`v${VERSION}`)} - Scaffold a new Pellicule project

${c.bold('USAGE')}
  ${c.highlight('npm create pellicule')}              ${c.dim('→ create in current directory')}
  ${c.highlight('npm create pellicule')} <name>       ${c.dim('→ create in new directory')}

${c.bold('OPTIONS')}
  ${c.info('--help')}     Show this help message
  ${c.info('--version')}  Show version number

${c.bold('EXAMPLES')}
  ${c.dim('# Create in current directory')}
  ${c.highlight('npm create pellicule')}

  ${c.dim('# Create in a new directory')}
  ${c.highlight('npm create pellicule')} my-video

${c.dim('Documentation: https://docs.sailscasts.com/pellicule')}
`

function copyTemplate(templateDir, targetDir, projectName) {
  const files = readdirSync(templateDir)

  for (const file of files) {
    const srcPath = join(templateDir, file)
    const destPath = join(targetDir, file)
    let content = readFileSync(srcPath, 'utf-8')

    // Replace template variables
    content = content.replace(/my-pellicule-video/g, projectName)

    writeFileSync(destPath, content)
  }
}

async function main() {
  const { values, positionals } = parseArgs({
    allowPositionals: true,
    options: {
      help: { type: 'boolean' },
      version: { type: 'boolean' }
    }
  })

  if (values.help) {
    console.log(HELP)
    process.exit(0)
  }

  if (values.version) {
    console.log(VERSION)
    process.exit(0)
  }

  const projectName = positionals[0] || '.'
  const targetDir = resolve(projectName)
  const isCurrentDir = projectName === '.'

  console.log()
  console.log(`  ${c.brand(' PELLICULE ')} ${c.dim('Create')}`)
  console.log()

  // Check if directory exists and has files
  if (existsSync(targetDir)) {
    const files = readdirSync(targetDir)
    const hasFiles = files.filter(f => !f.startsWith('.')).length > 0
    if (hasFiles && !isCurrentDir) {
      console.error(c.error(`  Error: Directory "${projectName}" already exists and is not empty.\n`))
      process.exit(1)
    }
  } else {
    mkdirSync(targetDir, { recursive: true })
  }

  // Copy template files
  const templateDir = resolve(__dirname, '../template')
  const displayName = isCurrentDir ? 'current directory' : projectName

  console.log(`  ${c.highlight('Scaffolding project')} in ${c.info(displayName)}...`)
  console.log()

  copyTemplate(templateDir, targetDir, isCurrentDir ? 'my-pellicule-video' : projectName)

  // Success message
  console.log(`  ${c.highlight('Done!')} Created Pellicule project.`)
  console.log()
  console.log(`  ${c.bold('Next steps:')}`)
  console.log()
  if (!isCurrentDir) {
    console.log(`  ${c.dim('1.')} cd ${projectName}`)
    console.log(`  ${c.dim('2.')} npm install`)
    console.log(`  ${c.dim('3.')} npx pellicule`)
  } else {
    console.log(`  ${c.dim('1.')} npm install`)
    console.log(`  ${c.dim('2.')} npx pellicule`)
  }
  console.log()
  console.log(`  ${c.dim('Documentation:')} https://docs.sailscasts.com/pellicule`)
  console.log()
}

main().catch((error) => {
  console.error(c.error(`\nError: ${error.message}\n`))
  process.exit(1)
})
