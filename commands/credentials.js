'use strict'

const co = require('co')
const cli = require('heroku-cli-util')

function * run (context, heroku) {
  const fetcher = require('../lib/fetcher')(heroku)
  const host = require('../lib/host')

  const {app, args} = context

  let db = yield fetcher.addon(app, args.database)

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
  description: 'show information on credentials in the database',
  needsApp: true,
  needsAuth: true,
  help: `
Example Usage:
  heroku pg:credentials postgresql-transparent-12345 --name chucks-role -a woodstock-production
`,
  args: [{name: 'database', optional: true}],
  run: cli.command({preauth: true}, co.wrap(run))
}
