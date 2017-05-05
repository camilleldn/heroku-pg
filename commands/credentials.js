'use strict'

const co = require('co')
const cli = require('heroku-cli-util')

function * run (context, heroku) {
  const fetcher = require('../lib/fetcher')(heroku)
  const host = require('../lib/host')

  const {app, args} = context

  let db = yield fetcher.addon(app, args.database)

  let reset = co.wrap(function * () {
    const host = require('../lib/host')
    let db = yield fetcher.addon(app, args.database)
    yield cli.action(`Resetting credentials on ${cli.color.addon(db.name)}`, co(function * () {
      yield heroku.post(`/client/v11/databases/${db.id}/credentials_rotation`, {host: host(db)})
    }))
  })
  let credentials = yield heroku.get(`/postgres/v0/databases/${db.name}/credentials`,
                                     { host: host(db) })
  cli.table(credentials, {
    columns: [
      {key: 'name', label: 'Credential'},
      {key: 'state', label: 'State'}
    ]
  })
}

module.exports = {
  topic: 'pg',
  command: 'credentials',
  description: 'manage the database credentials',
  needsApp: true,
  needsAuth: true,
  flags: [{name: 'reset', description: 'reset database credentials'}],
  args: [{name: 'database', optional: true}],
  run: cli.command({preauth: true}, co.wrap(run))
}
