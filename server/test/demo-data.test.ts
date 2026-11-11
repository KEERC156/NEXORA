import assert from 'node:assert/strict'
import test from 'node:test'
import { buildDemoNotes, buildDemoTasks, demoRecordId, demoStudents } from '../src/demo-data.js'

test('demo fixtures cover exactly five reserved fictional identities', () => {
  assert.equal(demoStudents.length, 5)
  assert.deepEqual(demoStudents.map(({ name }) => name), [
    'Aanya Sharma',
    'Rahul Verma',
    'Priya Nair',
    'Arjun Rao',
    'Sneha Patel',
  ])
  assert.ok(demoStudents.every(({ email }) => email.endsWith('@nexora-demo.invalid')))
})

test('demo fixtures produce the expected varied record counts and stable IDs', () => {
  const tasks = demoStudents.flatMap(({ key }) => buildDemoTasks(key, new Date('2026-11-10T12:00:00Z')))
  const notes = demoStudents.flatMap(({ key }) => buildDemoNotes(key))
  assert.equal(tasks.length, 25)
  assert.equal(notes.length, 15)
  assert.equal(new Set([...tasks, ...notes].map(({ id }) => id)).size, 40)
  assert.equal(demoRecordId('task', 'aanya-sharma', 0), demoRecordId('task', 'aanya-sharma', 0))
  assert.equal(new Set(tasks.map(({ priority }) => priority)).size, 3)
  assert.equal(new Set(tasks.map(({ status }) => status)).size, 2)
  assert.equal(new Set(tasks.map(({ category }) => category)).size, 5)
  assert.ok(new Set(tasks.map(({ due_date }) => due_date)).size > 1)
  assert.equal(notes.filter(({ is_pinned }) => is_pinned).length, 5)
})
