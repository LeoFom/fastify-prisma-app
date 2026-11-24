const assert = require('node:assert/strict')
const test = require('node:test')
const nodemailer = require('nodemailer')

test('mail helper renders a message through Nodemailer without an external SMTP connection', async (t) => {
  const previousSender = process.env.NODEMAILER_EMAIL
  const createTransport = nodemailer.createTransport.bind(nodemailer)
  process.env.NODEMAILER_EMAIL = 'sender@example.test'
  // Replace only the network transport; exercise the application's actual helper.
  t.mock.method(nodemailer, 'createTransport', () => createTransport({
    streamTransport: true, buffer: true, newline: 'unix',
  }))
  try {
    const { sendEmail } = require('../dist/jobs/send-mail.job')
    const result = await sendEmail('recipient@example.test', 'Synthetic compatibility check', 'Synthetic message body')
    assert.deepEqual(result.envelope.to, ['recipient@example.test'])
    assert.equal(result.envelope.from, 'sender@example.test')
    const message = result.message.toString('utf8')
    assert.match(message, /Subject: Synthetic compatibility check/)
    assert.match(message, /Synthetic message body/)
  } finally {
    if (previousSender === undefined) delete process.env.NODEMAILER_EMAIL
    else process.env.NODEMAILER_EMAIL = previousSender
  }
})
