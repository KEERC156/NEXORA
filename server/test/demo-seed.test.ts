import assert from 'node:assert/strict'
import test from 'node:test'
import {
  canonicalDemoRecord,
  demoSeedKey,
  runDemoOperation,
  type DemoNote,
  type DemoOwnership,
  type DemoProfile,
  type DemoSeedStore,
  type DemoStoredRecord,
  type DemoTask,
  type DemoUser,
} from '../src/demo-seed.js'
import { buildDemoNotes, buildDemoTasks, demoStudents } from '../src/demo-data.js'

class FakeStore implements DemoSeedStore {
  readonly users: DemoUser[] = []
  readonly profiles = new Map<string, DemoProfile>()
  readonly records = new Map<string, DemoStoredRecord>()
  readonly ownership = new Map<string, DemoOwnership>()
  createUserCalls = 0
  seedRecordCalls = 0
  cleanupRecordCalls = 0
  failSeedAt = 0
  failCleanupAt = 0

  async listUsers() {
    return [...this.users]
  }

  async createUser(input: { email: string; password: string; display_name: string }) {
    assert.ok(input.password.length >= 12)
    this.createUserCalls += 1
    const user: DemoUser = {
      id: `demo-user-${this.createUserCalls}`,
      email: input.email,
      user_metadata: { display_name: input.display_name, nexora_demo: true },
    }
    this.users.push(user)
    this.profiles.set(user.id, { id: user.id, display_name: input.display_name })
    return user
  }

  async getProfile(id: string) {
    return this.profiles.get(id) ?? null
  }

  async insertProfile(profile: DemoProfile) {
    if (this.profiles.has(profile.id)) throw new Error('profile conflict')
    this.profiles.set(profile.id, profile)
  }

  async getRecord(type: 'task' | 'note', id: string) {
    return this.records.get(`${type}:${id}`) ?? null
  }

  async getOwnership(type: 'task' | 'note', id: string) {
    return this.ownership.get(`${type}:${id}`) ?? null
  }

  async listOwnership(seedKey: string) {
    return [...this.ownership.values()].filter((row) => row.seed_key === seedKey)
  }

  async seedRecord(record: DemoTask | DemoNote) {
    this.seedRecordCalls += 1
    if (this.failSeedAt === this.seedRecordCalls) throw new Error('injected partial failure')
    const type = 'priority' in record ? 'task' : 'note'
    const key = `${type}:${record.id}`
    if (this.ownership.has(key)) {
      const current = this.records.get(key)
      if (!current) this.records.set(key, { ...record })
      return
    }
    if (this.records.has(key)) throw new Error('unowned record conflict')
    const expected_data = canonicalDemoRecord(record)
    this.records.set(key, { ...record })
    this.ownership.set(key, {
      seed_key: demoSeedKey,
      record_type: type,
      record_id: record.id,
      user_id: record.user_id,
      expected_data,
    })
  }

  async cleanupRecord(record: DemoOwnership) {
    this.cleanupRecordCalls += 1
    if (this.failCleanupAt === this.cleanupRecordCalls) throw new Error('injected cleanup failure')
    const key = `${record.record_type}:${record.record_id}`
    const ownership = this.ownership.get(key)
    if (!ownership || ownership.user_id !== record.user_id
      || JSON.stringify(ownership.expected_data) !== JSON.stringify(record.expected_data)) {
      throw new Error('ownership conflict')
    }
    this.records.delete(key)
    this.ownership.delete(key)
  }
}

const password = 'local-demo-test-password'

test('dry-run previews exactly five accounts, profiles, tasks, and notes without mutations', async () => {
  const store = new FakeStore()
  const summary = await runDemoOperation(store, { mode: 'seed', dryRun: true })
  assert.equal(summary.accounts.create, 5)
  assert.equal(summary.profiles.create, 5)
  assert.equal(summary.tasks.create, 25)
  assert.equal(summary.notes.create, 15)
  assert.deepEqual(summary.students.map(({ email }) => email), demoStudents.map(({ email }) => email))
  assert.equal(store.createUserCalls, 0)
  assert.equal(store.seedRecordCalls, 0)
  assert.equal(store.cleanupRecordCalls, 0)
  assert.equal(store.records.size, 0)
  assert.equal(store.ownership.size, 0)
})

test('dry-run recognizes an already seeded dataset without proposing mutations', async () => {
  const store = new FakeStore()
  await runDemoOperation(store, { mode: 'seed', dryRun: false, password })
  const before = store.seedRecordCalls
  const summary = await runDemoOperation(store, { mode: 'seed', dryRun: true })
  assert.equal(summary.accounts.create, 0)
  assert.equal(summary.accounts.preserve, 5)
  assert.equal(summary.profiles.create, 0)
  assert.equal(summary.profiles.preserve, 5)
  assert.equal(summary.tasks.create, 0)
  assert.equal(summary.tasks.preserve, 25)
  assert.equal(summary.notes.create, 0)
  assert.equal(summary.notes.preserve, 15)
  assert.equal(store.seedRecordCalls, before)
})

test('duplicate seed runs preserve the same accounts and records', async () => {
  const store = new FakeStore()
  const first = await runDemoOperation(store, { mode: 'seed', dryRun: false, password })
  const second = await runDemoOperation(store, { mode: 'seed', dryRun: false, password })
  assert.equal(first.accounts.create, 5)
  assert.equal(first.tasks.create, 25)
  assert.equal(first.notes.create, 15)
  assert.equal(second.accounts.create, 0)
  assert.equal(second.tasks.create, 0)
  assert.equal(second.tasks.preserve, 25)
  assert.equal(second.notes.create, 0)
  assert.equal(second.notes.preserve, 15)
  assert.equal(store.createUserCalls, 5)
  assert.equal(store.records.size, 40)
  assert.equal(store.ownership.size, 40)
})

test('unowned task and note IDs are conflicts and are never overwritten', async () => {
  const store = new FakeStore()
  const student = demoStudents[0]
  const user: DemoUser = {
    id: 'existing-demo-user',
    email: student.email,
    user_metadata: { display_name: student.name, nexora_demo: true },
  }
  store.users.push(user)
  store.profiles.set(user.id, { id: user.id, display_name: student.name })
  const task = { ...buildDemoTasks(student.key)[0], user_id: user.id }
  store.records.set(`task:${task.id}`, { ...task, title: 'Unrelated existing task' })
  await assert.rejects(
    runDemoOperation(store, { mode: 'seed', dryRun: false, password }),
    /without durable seed ownership/,
  )
  assert.equal(store.records.get(`task:${task.id}`)?.title, 'Unrelated existing task')
  assert.equal(store.createUserCalls, 0)
  assert.equal(store.seedRecordCalls, 0)
})

test('an unowned note ID is a conflict and is never overwritten', async () => {
  const store = new FakeStore()
  const student = demoStudents[0]
  const user: DemoUser = {
    id: 'existing-demo-user',
    email: student.email,
    user_metadata: { display_name: student.name, nexora_demo: true },
  }
  store.users.push(user)
  store.profiles.set(user.id, { id: user.id, display_name: student.name })
  const note = { ...buildDemoNotes(student.key)[0], user_id: user.id }
  store.records.set(`note:${note.id}`, { ...note, content: 'Unrelated existing note' })

  await assert.rejects(
    runDemoOperation(store, { mode: 'seed', dryRun: true }),
    /without durable seed ownership/,
  )

  assert.equal(store.records.get(`note:${note.id}`)?.content, 'Unrelated existing note')
  assert.equal(store.createUserCalls, 0)
  assert.equal(store.seedRecordCalls, 0)
})

test('a mismatched existing profile is preserved and blocks seeding', async () => {
  const store = new FakeStore()
  const student = demoStudents[0]
  const user: DemoUser = {
    id: 'existing-demo-user',
    email: student.email,
    user_metadata: { display_name: student.name, nexora_demo: true },
  }
  store.users.push(user)
  store.profiles.set(user.id, { id: user.id, display_name: 'Unrelated profile' })

  await assert.rejects(
    runDemoOperation(store, { mode: 'seed', dryRun: true }),
    /different profile/,
  )

  assert.equal(store.profiles.get(user.id)?.display_name, 'Unrelated profile')
  assert.equal(store.createUserCalls, 0)
  assert.equal(store.seedRecordCalls, 0)
})

test('partial seed failures are resumable without replacing already tracked rows', async () => {
  const store = new FakeStore()
  store.failSeedAt = 9
  await assert.rejects(
    runDemoOperation(store, { mode: 'seed', dryRun: false, password }),
    /injected partial failure/,
  )
  const partialRecords: [string, unknown][] = [...store.records.entries()]
    .map(([key, row]) => [key, row.title])
  assert.ok(partialRecords.length > 0 && partialRecords.length < 40)
  store.failSeedAt = 0
  const summary = await runDemoOperation(store, { mode: 'seed', dryRun: false, password })
  assert.equal(summary.tasks.create + summary.tasks.preserve, 25)
  assert.equal(summary.notes.create + summary.notes.preserve, 15)
  assert.equal(store.createUserCalls, 5)
  assert.equal(store.records.size, 40)
  for (const [key, title] of partialRecords) assert.equal(store.records.get(key)?.title, title)
})

test('cleanup deletes only tracked rows and preserves every Auth user and profile', async () => {
  const store = new FakeStore()
  await runDemoOperation(store, { mode: 'seed', dryRun: false, password })
  const usersBefore = structuredClone(store.users)
  const profilesBefore = structuredClone([...store.profiles.entries()])
  const summary = await runDemoOperation(store, { mode: 'cleanup', dryRun: false })
  assert.equal(summary.accounts.preserve, 5)
  assert.equal(summary.profiles.preserve, 5)
  assert.equal(summary.tasks.delete, 25)
  assert.equal(summary.notes.delete, 15)
  assert.equal(store.records.size, 0)
  assert.equal(store.ownership.size, 0)
  assert.deepEqual(store.users, usersBefore)
  assert.deepEqual([...store.profiles.entries()], profilesBefore)
  assert.equal(store.createUserCalls, 5)
})

test('cleanup dry-run previews affected identities and exact record counts without mutations', async () => {
  const store = new FakeStore()
  await runDemoOperation(store, { mode: 'seed', dryRun: false, password })
  const cleanupCallsBefore = store.cleanupRecordCalls
  const usersBefore = structuredClone(store.users)
  const profilesBefore = structuredClone([...store.profiles.entries()])
  const recordsBefore = structuredClone([...store.records.entries()])
  const ownershipBefore = structuredClone([...store.ownership.entries()])

  const summary = await runDemoOperation(store, { mode: 'cleanup', dryRun: true })

  assert.equal(summary.accounts.preserve, 5)
  assert.equal(summary.accounts.absent, 0)
  assert.equal(summary.profiles.preserve, 5)
  assert.equal(summary.profiles.absent, 0)
  assert.equal(summary.tasks.delete, 25)
  assert.equal(summary.tasks.missing, 0)
  assert.equal(summary.notes.delete, 15)
  assert.equal(summary.notes.missing, 0)
  assert.ok(summary.students.every(({ account, profile, tasks, notes }) =>
    account === 'preserve' && profile === 'preserve' && tasks === 5 && notes === 3))
  assert.equal(store.cleanupRecordCalls, cleanupCallsBefore)
  assert.deepEqual(store.users, usersBefore)
  assert.deepEqual([...store.profiles.entries()], profilesBefore)
  assert.deepEqual([...store.records.entries()], recordsBefore)
  assert.deepEqual([...store.ownership.entries()], ownershipBefore)
})

test('cleanup dry-run marks absent accounts and profiles without proposing deletion', async () => {
  const store = new FakeStore()
  const summary = await runDemoOperation(store, { mode: 'cleanup', dryRun: true })

  assert.equal(summary.accounts.absent, 5)
  assert.equal(summary.profiles.absent, 5)
  assert.equal(summary.tasks.delete, 0)
  assert.equal(summary.notes.delete, 0)
  assert.ok(summary.students.every(({ account, profile }) => account === 'absent' && profile === 'absent'))
  assert.equal(store.cleanupRecordCalls, 0)
  assert.equal(store.records.size, 0)
  assert.equal(store.ownership.size, 0)
})

test('cleanup refuses changed tracked data before deleting any row', async () => {
  const store = new FakeStore()
  await runDemoOperation(store, { mode: 'seed', dryRun: false, password })
  const student = demoStudents[0]
  const task = buildDemoTasks(student.key)[0]
  const user = store.users[0]
  store.records.get(`task:${task.id}`)!.title = 'Student-edited task'
  const before = store.records.size
  await assert.rejects(
    runDemoOperation(store, { mode: 'cleanup', dryRun: false }),
    /was modified/,
  )
  assert.equal(store.records.size, before)
  assert.equal(store.cleanupRecordCalls, 0)
  assert.ok(store.users.includes(user))
})

test('cleanup refuses ownership conflicts before deleting any row', async () => {
  const store = new FakeStore()
  await runDemoOperation(store, { mode: 'seed', dryRun: false, password })
  const [key, ownership] = [...store.ownership.entries()][0]
  store.ownership.set(key, { ...ownership, user_id: 'different-user' })
  const recordsBefore = store.records.size

  await assert.rejects(
    runDemoOperation(store, { mode: 'cleanup', dryRun: false }),
    /unexpected or mismatched record/,
  )

  assert.equal(store.records.size, recordsBefore)
  assert.equal(store.cleanupRecordCalls, 0)
})

test('partial cleanup failures can be retried without touching preserved accounts or profiles', async () => {
  const store = new FakeStore()
  await runDemoOperation(store, { mode: 'seed', dryRun: false, password })
  const usersBefore = structuredClone(store.users)
  const profilesBefore = structuredClone([...store.profiles.entries()])
  store.failCleanupAt = 9

  await assert.rejects(
    runDemoOperation(store, { mode: 'cleanup', dryRun: false }),
    /injected cleanup failure/,
  )
  assert.ok(store.records.size > 0 && store.records.size < 40)
  assert.equal(store.records.size, store.ownership.size)

  const remainingRecordCount = store.records.size
  store.failCleanupAt = 0
  const summary = await runDemoOperation(store, { mode: 'cleanup', dryRun: false })
  assert.equal(summary.tasks.delete + summary.notes.delete, remainingRecordCount)
  assert.equal(store.records.size, 0)
  assert.equal(store.ownership.size, 0)
  assert.deepEqual(store.users, usersBefore)
  assert.deepEqual([...store.profiles.entries()], profilesBefore)
})

test('cleanup preserves untracked user data and never removes Auth users or profiles', async () => {
  const store = new FakeStore()
  await runDemoOperation(store, { mode: 'seed', dryRun: false, password })
  const user = store.users[0]
  store.records.set('task:unrelated-task-id', {
    id: 'unrelated-task-id',
    user_id: user.id,
    title: 'User-created task',
  })
  await runDemoOperation(store, { mode: 'cleanup', dryRun: false })
  assert.equal(store.records.get('task:unrelated-task-id')?.title, 'User-created task')
  assert.equal(store.users.length, 5)
  assert.equal(store.profiles.size, 5)
})

test('a dry-run detects reserved email conflicts without creating accounts', async () => {
  const store = new FakeStore()
  store.users.push({
    id: 'real-user',
    email: demoStudents[0].email,
    user_metadata: { display_name: demoStudents[0].name },
  })
  await assert.rejects(
    runDemoOperation(store, { mode: 'seed', dryRun: true }),
    /unmarked account/,
  )
  assert.equal(store.createUserCalls, 0)
  assert.equal(store.seedRecordCalls, 0)
})

test('a repeated cleanup is idempotent and keeps Auth accounts and profiles', async () => {
  const store = new FakeStore()
  await runDemoOperation(store, { mode: 'seed', dryRun: false, password })
  await runDemoOperation(store, { mode: 'cleanup', dryRun: false })
  const usersBefore = structuredClone(store.users)
  const profilesBefore = structuredClone([...store.profiles.entries()])
  const second = await runDemoOperation(store, { mode: 'cleanup', dryRun: false })
  assert.equal(second.tasks.delete, 0)
  assert.equal(second.notes.delete, 0)
  assert.deepEqual(store.users, usersBefore)
  assert.deepEqual([...store.profiles.entries()], profilesBefore)
})

test('fixture outputs have exactly the expected task and note counts', () => {
  const tasks = demoStudents.flatMap((student) => buildDemoTasks(student.key))
  const notes = demoStudents.flatMap((student) => buildDemoNotes(student.key))
  assert.equal(tasks.length, 25)
  assert.equal(notes.length, 15)
})
