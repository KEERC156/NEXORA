import assert from 'node:assert/strict'
import test from 'node:test'
import { noteCreateSchema, noteUpdateSchema, taskCreateSchema, taskUpdateSchema } from '../src/validators.js'

test('task create accepts the supported task shape and defaults', () => {
  assert.deepEqual(taskCreateSchema.parse({ title: '  Read chapter  ' }), {
    title: 'Read chapter',
    description: '',
    priority: 'medium',
    category: '',
    status: 'pending',
  })
})

test('task input rejects empty titles and client-supplied ownership', () => {
  assert.equal(taskCreateSchema.safeParse({ title: ' ' }).success, false)
  assert.equal(taskCreateSchema.safeParse({ title: 'Study', user_id: 'attacker' }).success, false)
})

test('task updates require a field and validate date/status values', () => {
  assert.equal(taskUpdateSchema.safeParse({}).success, false)
  assert.equal(taskUpdateSchema.safeParse({ due_date: '2026-02-31' }).success, false)
  assert.equal(taskUpdateSchema.safeParse({ status: 'completed' }).success, true)
})

test('notes enforce title, content size, and ownership boundaries', () => {
  assert.equal(noteCreateSchema.safeParse({ title: 'Class notes', content: 'Week one' }).success, true)
  assert.equal(noteCreateSchema.safeParse({ title: '', user_id: 'attacker' }).success, false)
  assert.equal(noteUpdateSchema.safeParse({ is_pinned: true }).success, true)
  assert.equal(noteUpdateSchema.safeParse({}).success, false)
})
