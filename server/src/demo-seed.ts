import { buildDemoNotes, buildDemoTasks, demoStudents } from './demo-data.js'

export const demoSeedKey = 'nexora-five-student-v1'
export const demoScheduleStart = new Date('2026-11-11T00:00:00.000Z')

export type DemoTask = ReturnType<typeof buildDemoTasks>[number] & { user_id: string }
export type DemoNote = ReturnType<typeof buildDemoNotes>[number] & { user_id: string }
export type DemoUser = {
  id: string
  email: string | null
  user_metadata: Record<string, unknown>
}

export type DemoProfile = { id: string; display_name: string }
export type DemoOwnership = {
  seed_key: string
  record_type: 'task' | 'note'
  record_id: string
  user_id: string
  expected_data: Record<string, unknown>
}
export type DemoStoredRecord = Record<string, unknown> & { id: string; user_id: string }

export interface DemoSeedStore {
  listUsers(): Promise<DemoUser[]>
  createUser(input: { email: string; password: string; display_name: string }): Promise<DemoUser>
  getProfile(id: string): Promise<DemoProfile | null>
  insertProfile(profile: DemoProfile): Promise<void>
  getRecord(type: 'task' | 'note', id: string): Promise<DemoStoredRecord | null>
  getOwnership(type: 'task' | 'note', id: string): Promise<DemoOwnership | null>
  listOwnership(seedKey: string): Promise<DemoOwnership[]>
  seedRecord(record: DemoTask | DemoNote): Promise<void>
  cleanupRecord(record: DemoOwnership): Promise<void>
}

export type DemoRunOptions = {
  mode: 'seed' | 'cleanup'
  dryRun: boolean
  password?: string
  today?: Date
}

export type DemoRunSummary = {
  dryRun: boolean
  mode: 'seed' | 'cleanup'
  accounts: { create: number; preserve: number; absent: number }
  profiles: { create: number; preserve: number; absent: number }
  tasks: { create: number; preserve: number; delete: number; missing: number }
  notes: { create: number; preserve: number; delete: number; missing: number }
  students: {
    name: string
    email: string
    account: 'create' | 'preserve' | 'absent'
    profile: 'create' | 'preserve' | 'absent'
    tasks: number
    notes: number
    tasksMissing: number
    notesMissing: number
  }[]
}

export function canonicalDemoRecord(record: DemoTask | DemoNote): Record<string, unknown> {
  if ('priority' in record) {
    return {
      id: record.id,
      user_id: record.user_id,
      title: record.title,
      description: record.description,
      priority: record.priority,
      category: record.category,
      due_date: record.due_date,
      status: record.status,
      completed_at: record.completed_at ? new Date(record.completed_at).toISOString() : null,
    }
  }
  return {
    id: record.id,
    user_id: record.user_id,
    title: record.title,
    content: record.content,
    category: record.category,
    is_pinned: record.is_pinned,
  }
}

function isMatchingRecord(actual: DemoStoredRecord, expected: DemoTask | DemoNote) {
  if (actual.id !== expected.id || actual.user_id !== expected.user_id) return false
  const keys = Object.keys(canonicalDemoRecord(expected))
  for (const key of keys) {
    const actualValue = actual[key]
    const expectedValue = canonicalDemoRecord(expected)[key]
    if (key === 'completed_at') {
      if (actualValue == null || expectedValue == null) {
        if (actualValue !== expectedValue) return false
      } else if (new Date(String(actualValue)).toISOString() !== expectedValue) return false
    } else if (actualValue !== expectedValue) {
      return false
    }
  }
  return true
}

function ownershipMatches(ownership: DemoOwnership, record: DemoTask | DemoNote) {
  const canonical = canonicalDemoRecord(record)
  const expected = { ...ownership.expected_data }
  if ('completed_at' in expected && typeof expected.completed_at === 'string') {
    expected.completed_at = new Date(expected.completed_at).toISOString()
  }
  return ownership.seed_key === demoSeedKey
    && ownership.record_id === record.id
    && ownership.user_id === record.user_id
    && ownership.expected_data.id === canonical.id
    && ownership.expected_data.user_id === canonical.user_id
    && JSON.stringify(Object.keys(canonical).sort().map((key) => [key, expected[key]]))
      === JSON.stringify(Object.keys(canonical).sort().map((key) => [key, canonical[key]]))
}

function accountIsMarked(user: DemoUser, student: (typeof demoStudents)[number]) {
  return user.email?.toLowerCase() === student.email
    && user.user_metadata.nexora_demo === true
    && user.user_metadata.display_name === student.name
}

function assertProfileMatches(profile: DemoProfile | null, student: (typeof demoStudents)[number]) {
  if (profile && profile.display_name !== student.name) {
    throw new Error(`The reserved demo account ${student.email} has a different profile; refusing to overwrite it.`)
  }
}

function makeRecords(studentKey: string, userId: string, today: Date) {
  return [
    ...buildDemoTasks(studentKey, today).map((task) => ({ ...task, user_id: userId })),
    ...buildDemoNotes(studentKey).map((note) => ({ ...note, user_id: userId })),
  ]
}

function recordType(record: DemoTask | DemoNote): 'task' | 'note' {
  return 'priority' in record ? 'task' : 'note'
}

async function inspectSeed(
  store: DemoSeedStore,
  student: (typeof demoStudents)[number],
  user: DemoUser | undefined,
  today: Date,
) {
  const profile = user ? await store.getProfile(user.id) : null
  assertProfileMatches(profile, student)

  const records = makeRecords(student.key, user?.id ?? '', today)
  for (const record of records) {
    const type = recordType(record)
    const [stored, ownership] = await Promise.all([
      store.getRecord(type, record.id),
      store.getOwnership(type, record.id),
    ])
    if (!user) {
      if (stored || ownership) {
        throw new Error(`A reserved demo record ID for ${student.email} is already occupied; refusing to affect an unknown account.`)
      }
      continue
    }
    if (!ownership) {
      if (stored) throw new Error(`A task or note ID for ${student.email} exists without durable seed ownership; refusing to overwrite it.`)
      continue
    }
    if (!ownershipMatches(ownership, record)) {
      throw new Error(`Durable ownership for a record belonging to ${student.email} does not match; refusing to modify it.`)
    }
    if (stored && !isMatchingRecord(stored, record)) {
      throw new Error(`A tracked record for ${student.email} was modified; refusing to overwrite it.`)
    }
  }
}

async function runSeed(store: DemoSeedStore, options: DemoRunOptions): Promise<DemoRunSummary> {
  if (!options.dryRun && (!options.password || options.password.length < 12)) {
    throw new Error('Set DEMO_ACCOUNT_PASSWORD to a strong password of at least 12 characters.')
  }
  const users = await store.listUsers()
  const userByStudent = new Map<string, DemoUser>()
  for (const student of demoStudents) {
    const matching = users.filter((user) => user.email?.toLowerCase() === student.email)
    if (matching.length > 1) throw new Error(`Multiple Auth users use the reserved email ${student.email}.`)
    const user = matching[0]
    if (user && !accountIsMarked(user, student)) {
      throw new Error(`The reserved address ${student.email} belongs to an unmarked account; refusing to use it.`)
    }
    if (user) userByStudent.set(student.key, user)
  }

  const today = options.today ?? demoScheduleStart
  const expectedRecords = new Map<string, DemoTask | DemoNote>()
  for (const student of demoStudents) {
    const user = userByStudent.get(student.key)
    for (const record of makeRecords(student.key, user?.id ?? '', today)) {
      expectedRecords.set(`${recordType(record)}:${record.id}`, record)
    }
  }
  for (const ownership of await store.listOwnership(demoSeedKey)) {
    const record = expectedRecords.get(`${ownership.record_type}:${ownership.record_id}`)
    if (!record || !ownershipMatches(ownership, record)) {
      throw new Error('The seed ownership ledger contains an unexpected or mismatched record; refusing to seed.')
    }
  }

  for (const student of demoStudents) {
    await inspectSeed(store, student, userByStudent.get(student.key), today)
  }

  const summary: DemoRunSummary = {
    dryRun: options.dryRun,
    mode: 'seed',
    accounts: { create: demoStudents.length - userByStudent.size, preserve: userByStudent.size, absent: 0 },
    profiles: { create: 0, preserve: 0, absent: 0 },
    tasks: { create: 0, preserve: 0, delete: 0, missing: 0 },
    notes: { create: 0, preserve: 0, delete: 0, missing: 0 },
    students: demoStudents.map((student) => ({
      name: student.name,
      email: student.email,
      account: userByStudent.has(student.key) ? 'preserve' : 'create',
      profile: userByStudent.has(student.key) ? 'preserve' : 'create',
      tasks: 0,
      notes: 0,
      tasksMissing: 0,
      notesMissing: 0,
    })),
  }

  for (let index = 0; index < demoStudents.length; index += 1) {
    const student = demoStudents[index]
    const user = userByStudent.get(student.key)
    const profile = user ? await store.getProfile(user.id) : null
    if (profile) {
      summary.profiles.preserve += 1
      summary.students[index].profile = 'preserve'
    } else {
      summary.profiles.create += 1
      summary.students[index].profile = 'create'
    }
  }

  for (let studentIndex = 0; studentIndex < demoStudents.length; studentIndex += 1) {
    const student = demoStudents[studentIndex]
    let user = userByStudent.get(student.key)
    if (!user) {
      if (options.dryRun) {
        summary.tasks.create += 5
        summary.notes.create += 3
        summary.students[studentIndex].tasks = 5
        summary.students[studentIndex].notes = 3
        continue
      }
      user = await store.createUser({
        email: student.email,
        password: options.password!,
        display_name: student.name,
      })
      if (!accountIsMarked(user, student)) {
        throw new Error(`Auth returned an unexpected account for ${student.email}; refusing to continue.`)
      }
      userByStudent.set(student.key, user)
    }
    let profile = await store.getProfile(user.id)
    if (!profile) {
      await store.insertProfile({ id: user.id, display_name: student.name })
      profile = await store.getProfile(user.id)
    }
    assertProfileMatches(profile, student)
    if (!profile) throw new Error(`Unable to verify the profile for ${student.email}.`)

    for (const record of makeRecords(student.key, user.id, today)) {
      const type = recordType(record)
      const [stored, ownership] = await Promise.all([
        store.getRecord(type, record.id),
        store.getOwnership(type, record.id),
      ])
      const counts = type === 'task' ? summary.tasks : summary.notes
      const studentCounts = type === 'task' ? summary.students[studentIndex].tasks : summary.students[studentIndex].notes
      if (ownership && stored) {
        counts.preserve += 1
        if (type === 'task') summary.students[studentIndex].tasks = studentCounts + 1
        else summary.students[studentIndex].notes = studentCounts + 1
      } else {
        counts.create += 1
        if (type === 'task') summary.students[studentIndex].tasks = studentCounts + 1
        else summary.students[studentIndex].notes = studentCounts + 1
        if (!options.dryRun) await store.seedRecord(record)
      }
    }
  }

  return summary
}

async function runCleanup(store: DemoSeedStore, options: DemoRunOptions): Promise<DemoRunSummary> {
  const users = await store.listUsers()
  const userByStudent = new Map<string, DemoUser>()
  for (const student of demoStudents) {
    const matching = users.filter((user) => user.email?.toLowerCase() === student.email)
    if (matching.length > 1) throw new Error(`Multiple Auth users use the reserved email ${student.email}.`)
    const user = matching[0]
    if (user && !accountIsMarked(user, student)) {
      throw new Error(`The reserved address ${student.email} belongs to an unmarked account; refusing cleanup.`)
    }
    if (user) userByStudent.set(student.key, user)
  }

  const today = options.today ?? demoScheduleStart
  const expected = new Map<string, DemoTask | DemoNote>()
  let preservedProfiles = 0
  const profileByStudent = new Map<string, boolean>()
  for (const student of demoStudents) {
    const user = userByStudent.get(student.key)
    const profile = user ? await store.getProfile(user.id) : null
    profileByStudent.set(student.key, profile !== null)
    if (profile) preservedProfiles += 1
    if (!user) continue
    for (const record of makeRecords(student.key, user.id, today)) {
      expected.set(`${recordType(record)}:${record.id}`, record)
    }
  }

  const ownershipRows = await store.listOwnership(demoSeedKey)
  for (const ownership of ownershipRows) {
    const key = `${ownership.record_type}:${ownership.record_id}`
    const record = expected.get(key)
    if (!record || !ownershipMatches(ownership, record)) {
      throw new Error('The seed ownership ledger contains an unexpected or mismatched record; refusing cleanup.')
    }
  }

  const planned: { record: DemoTask | DemoNote; ownership: DemoOwnership; recordExists: boolean }[] = []
  for (const record of expected.values()) {
    const type = recordType(record)
    const [stored, ownership] = await Promise.all([
      store.getRecord(type, record.id),
      store.getOwnership(type, record.id),
    ])
    if (!ownership) {
      if (stored) throw new Error('An expected demo record exists without durable ownership; refusing cleanup.')
      continue
    }
    if (!ownershipMatches(ownership, record)) {
      throw new Error('A demo record has mismatched durable ownership; refusing cleanup.')
    }
    if (stored && !isMatchingRecord(stored, record)) {
      throw new Error('A tracked demo record was modified; refusing cleanup.')
    }
    planned.push({ record, ownership, recordExists: stored !== null })
  }

  const summary: DemoRunSummary = {
    dryRun: options.dryRun,
    mode: 'cleanup',
    accounts: { create: 0, preserve: userByStudent.size, absent: demoStudents.length - userByStudent.size },
    profiles: { create: 0, preserve: preservedProfiles, absent: demoStudents.length - preservedProfiles },
    tasks: { create: 0, preserve: 0, delete: 0, missing: 0 },
    notes: { create: 0, preserve: 0, delete: 0, missing: 0 },
    students: demoStudents.map((student) => {
      const user = userByStudent.get(student.key)
      return {
        name: student.name,
        email: student.email,
        account: user ? 'preserve' as const : 'absent' as const,
        profile: profileByStudent.get(student.key) ? 'preserve' as const : 'absent' as const,
        tasks: 0,
        notes: 0,
        tasksMissing: 0,
        notesMissing: 0,
      }
    }),
  }
  const studentIndexByUserId = new Map(
    [...userByStudent.entries()].map(([key, user]) => [user.id, demoStudents.findIndex((student) => student.key === key)]),
  )
  for (const { record, ownership, recordExists } of planned) {
    const type = recordType(record)
    const counts = type === 'task' ? summary.tasks : summary.notes
    if (recordExists) counts.delete += 1
    else counts.missing += 1
    const index = studentIndexByUserId.get(ownership.user_id) ?? -1
    if (index >= 0) {
      if (type === 'task') {
        if (recordExists) summary.students[index].tasks += 1
        else summary.students[index].tasksMissing += 1
      } else if (recordExists) {
        summary.students[index].notes += 1
      } else {
        summary.students[index].notesMissing += 1
      }
    }
    if (!options.dryRun) await store.cleanupRecord(ownership)
  }
  return summary
}

export async function runDemoOperation(store: DemoSeedStore, options: DemoRunOptions): Promise<DemoRunSummary> {
  return options.mode === 'seed' ? runSeed(store, options) : runCleanup(store, options)
}
