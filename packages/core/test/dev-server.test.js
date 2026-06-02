import test from 'node:test'
import assert from 'node:assert/strict'

import { getBrowserOpenCommand, openBrowser } from '../src/dev/server.js'

test('getBrowserOpenCommand uses open on macOS', () => {
  assert.deepEqual(
    getBrowserOpenCommand('http://localhost:5173', 'darwin'),
    {
      command: 'open',
      args: ['http://localhost:5173']
    }
  )
})

test('getBrowserOpenCommand uses cmd start with a quoted URL on Windows', () => {
  assert.deepEqual(
    getBrowserOpenCommand('http://localhost:5173/pellicule?preview=1&fps=30', 'win32'),
    {
      command: 'cmd',
      args: ['/d', '/s', '/c', 'start "" "http://localhost:5173/pellicule?preview=1&fps=30"']
    }
  )
})

test('getBrowserOpenCommand uses xdg-open on Linux', () => {
  assert.deepEqual(
    getBrowserOpenCommand('http://localhost:5173', 'linux'),
    {
      command: 'xdg-open',
      args: ['http://localhost:5173']
    }
  )
})

test('openBrowser resolves after launching the opener command', async () => {
  /** @type {{ command?: string, args?: string[], options?: { windowsHide: boolean }, unrefCalled: boolean }} */
  const call = { unrefCalled: false }

  await openBrowser('http://localhost:5173', {
    platform: 'linux',
    execFileRef(command, args, options, callback) {
      call.command = command
      call.args = args
      call.options = options

      queueMicrotask(() => callback(null))

      return {
        unref() {
          call.unrefCalled = true
        }
      }
    }
  })

  assert.equal(call.command, 'xdg-open')
  assert.deepEqual(call.args, ['http://localhost:5173'])
  assert.deepEqual(call.options, { windowsHide: true })
  assert.equal(call.unrefCalled, true)
})

test('openBrowser rejects when the opener command fails', async () => {
  const error = new Error('spawn xdg-open ENOENT')

  await assert.rejects(
    openBrowser('http://localhost:5173', {
      platform: 'linux',
      execFileRef(_command, _args, _options, callback) {
        queueMicrotask(() => callback(error))
        return {
          unref() {}
        }
      }
    }),
    /spawn xdg-open ENOENT/
  )
})
