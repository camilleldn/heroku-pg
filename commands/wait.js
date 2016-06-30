'use strict'

const cli = require('heroku-cli-util')
const co = require('co')

function * run (context) {
  const fetcher = require('../lib/fetcher')
  const host = require('../lib/host')
  const app = context.app
  const db = context.args.database

  let waitFor = co.wrap(function * waitFor (db) {
    const wait = require('co-wait')
    let interval = parseInt(context.args.interval)
    if (!interval || interval < 0) interval = 1

    let status
    let waiting = false

    while (true) {
      status = yield cli.heroku.request({
        host: host(db),
        path: `/client/v11/databases/${db.name}/wait_status`
      })

      if (status['error?']) {
        cli.error(status['message'])
        cli.exit(1)
      }

      if (!status['waiting?']) {
        if (waiting) cli.action.done(status.message)
        return
      }

      if (!waiting) {
        waiting = true
        cli.action.start(`Waiting for database ${cli.color.addon(db.name)}`)
      }

      cli.action.status(status.message)

      yield wait(interval * 1000)
    }
  })

  let dbs = []
  if (db) dbs = yield [fetcher.addon(app, db)]
  else dbs = yield fetcher.all(app)

  for (let db of dbs) yield waitFor(db)
}

module.exports = {
  topic: 'pg',
  command: 'wait',
  needsApp: true,
  needsAuth: true,
  args: [{name: 'database', optional: true}],
  run: cli.command({preauth: true}, co.wrap(run))
}