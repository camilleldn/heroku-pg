'use strict'

const co = require('co')
const cli = require('heroku-cli-util')

function * run (context, heroku) {
  const fetcher = require('../lib/fetcher')(heroku)
  const psql = require('../lib/psql')

  const {app, args, flags} = context

  let db = yield fetcher.database(app, args.database)
  cli.console.error(`--> Connecting to ${cli.color.addon(db.attachment.addon.name)}`)
  if (flags.command) {
    process.stdout.write(yield psql.exec(db, flags.command))
  } else {
    yield psql.interactive(db)
  }
}

let cmd = {
  description: 'open a psql shell to the database',
  needsApp: true,
  needsAuth: true,
  flags: [{name: 'command', char: 'c', description: 'SQL command to run', hasValue: true}],
  args: [{name: 'database', optional: true}],
  run: cli.command({preauth: true}, co.wrap(run))
}

module.exports = [
  Object.assign({topic: 'pg', command: 'psql'}, cmd),
  Object.assign({topic: 'psql'}, cmd)
]
