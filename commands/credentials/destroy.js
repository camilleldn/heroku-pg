'use strict'

const co = require('co')
const cli = require('heroku-cli-util')

function * run (context, heroku) {
  const fetcher = require('../../lib/fetcher')(heroku)
  const host = require('../../lib/host')
  const util = require('../../lib/util')

  const {app, args, flags} = context
  let cred = flags.name

  let db = yield fetcher.addon(app, args.database)
  if (util.starterPlan(db)) throw new Error('This operation is not supported by Hobby tier databases.')

  let attachments = yield heroku.get(`/addons/${db.name}/addon-attachments`)
  let credAttachments = attachments.filter(a => a.namespace === `credential:${flags.name}`)
  if (credAttachments.length > 0) throw new Error(`Credential ${flags.name} must be detached from all other apps before destroying.`)

  yield cli.confirmApp(app, flags.confirm, `WARNING: Destructive action`)

  yield cli.action(`Destroying credential ${cli.color.cmd(cred)}`, co(function * () {
    yield heroku.delete(`/postgres/v0/databases/${db.name}/credentials/${encodeURIComponent(cred)}`, {host: host(db)})
  }))

  cli.log(`The credential has been destroyed within ${db.name}.`)
  cli.log(`Database objects owned by ${cred} will be assigned to the default credential.`)
}

module.exports = {
  topic: 'pg',
  command: 'credentials:destroy',
  description: 'destroy credential within database',
  needsApp: true,
  needsAuth: true,
  help: `
Example Usage:
  heroku pg:credentials:destroy postgresql-transparent-56874 --name cred-name -a woodstock-production
`,
  args: [{name: 'database', optional: true}],
  flags: [
    {name: 'name', char: 'n', hasValue: true, required: true, description: 'unique identifier for the credential'},
    {name: 'confirm', char: 'c', hasValue: true}
  ],
  run: cli.command({preauth: true}, co.wrap(run))
}
