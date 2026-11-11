import 'dotenv/config'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '../src/database.types.js'
import {
  demoSeedKey,
  runDemoOperation,
  type DemoNote,
  type DemoOwnership,
  type DemoSeedStore,
  type DemoStoredRecord,
  type DemoTask,
  type DemoUser,
} from '../src/demo-seed.js'

const confirmation = '--confirm-demo-scope=NEXORA-5-STUDENTS'
const allowedFlags = new Set(['--seed', '--cleanup', '--dry-run', confirmation])

function parseArguments(args: string[]) {
  if (args.some((argument) => !allowedFlags.has(argument))) {
    throw new Error('Unknown command-line option.')
  }
  const modes = args.filter((argument) => argument === '--seed' || argument === '--cleanup')
  const dryRun = args.includes('--dry-run')
  if (modes.length > 1 || (!dryRun && modes.length !== 1)) {
    throw new Error('Specify exactly one of --seed or --cleanup; --dry-run alone previews seeding.')
  }
  if (!args.includes(confirmation) || args.filter((argument) => argument === confirmation).length !== 1) {
    throw new Error(`Add the explicit scope confirmation: ${confirmation}`)
  }
  if (args.filter((argument) => argument === '--dry-run').length > 1) {
    throw new Error('Specify --dry-run only once.')
  }
  return {
    mode: (modes[0] === '--cleanup' ? 'cleanup' : 'seed') as 'seed' | 'cleanup',
    dryRun,
  }
}

function createStore(admin: SupabaseClient<Database>): DemoSeedStore {
  return {
    async listUsers() {
      const users: DemoUser[] = []
      for (let page = 1; ; page += 1) {
        const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 })
        if (error) throw new Error('Unable to safely inspect Auth users.')
        users.push(...data.users.map((user) => ({
          id: user.id,
          email: user.email ?? null,
          user_metadata: user.user_metadata,
        })))
        if (data.users.length < 1000) return users
      }
    },
    async createUser({ email, password, display_name }) {
      const { data, error } = await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { display_name, nexora_demo: true },
      })
      if (error || !data.user) throw new Error('Supabase Auth could not create a reserved demo account.')
      return {
        id: data.user.id,
        email: data.user.email ?? null,
        user_metadata: data.user.user_metadata,
      }
    },
    async getProfile(id) {
      const { data, error } = await admin.from('profiles').select('id,display_name').eq('id', id).maybeSingle()
      if (error) throw new Error('Unable to inspect a demo profile.')
      return data
    },
    async insertProfile(profile) {
      const { error } = await admin.from('profiles').insert(profile)
      if (!error) return
      const current = await this.getProfile(profile.id)
      if (current?.display_name === profile.display_name) return
      throw new Error('Unable to insert the missing demo profile without overwriting existing profile data.')
    },
    async getRecord(type, id) {
      if (type === 'task') {
        const { data, error } = await admin.from('tasks').select('*').eq('id', id).maybeSingle()
        if (error) throw new Error('Unable to inspect a task ID before modifying it.')
        return data as DemoStoredRecord | null
      }
      const { data, error } = await admin.from('notes').select('*').eq('id', id).maybeSingle()
      if (error) throw new Error('Unable to inspect a note ID before modifying it.')
      return data as DemoStoredRecord | null
    },
    async getOwnership(type, id) {
      const { data, error } = await admin
        .from('nexora_demo_seed_records')
        .select('seed_key,record_type,record_id,user_id,expected_data')
        .eq('seed_key', demoSeedKey)
        .eq('record_type', type)
        .eq('record_id', id)
        .maybeSingle()
      if (error) throw new Error('Unable to inspect durable demo record ownership; apply the prepared migration first.')
      return data as DemoOwnership | null
    },
    async listOwnership(seedKey) {
      const { data, error } = await admin
        .from('nexora_demo_seed_records')
        .select('seed_key,record_type,record_id,user_id,expected_data')
        .eq('seed_key', seedKey)
      if (error) throw new Error('Unable to inspect the demo ownership ledger; apply the prepared migration first.')
      return data as DemoOwnership[]
    },
    async seedRecord(record: DemoTask | DemoNote) {
      const type = 'priority' in record ? 'task' : 'note'
      const { error } = await admin.rpc('seed_demo_record', {
        p_seed_key: demoSeedKey,
        p_record_type: type,
        p_record_id: record.id,
        p_user_id: record.user_id,
        p_record: record,
      })
      if (error) throw new Error('The database refused a demo record because ownership could not be verified.')
    },
    async cleanupRecord(record) {
      const { error } = await admin.rpc('cleanup_demo_record', {
        p_seed_key: record.seed_key,
        p_record_type: record.record_type,
        p_record_id: record.record_id,
        p_user_id: record.user_id,
        p_expected_data: record.expected_data,
      })
      if (error) throw new Error('The database refused cleanup because durable record ownership could not be verified.')
    },
  }
}

function printSummary(summary: Awaited<ReturnType<typeof runDemoOperation>>) {
  console.log(JSON.stringify({
    mode: summary.mode,
    dryRun: summary.dryRun,
    affectedAccounts: summary.students,
    totals: {
      accounts: summary.accounts,
      profiles: summary.profiles,
      tasks: summary.tasks,
      notes: summary.notes,
    },
    authUsersAndProfilesDeleted: 0,
  }, null, 2))
}

async function main() {
  const { mode, dryRun } = parseArguments(process.argv.slice(2))
  const url = process.env.SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const password = process.env.DEMO_ACCOUNT_PASSWORD
  if (!url || !serviceRoleKey) {
    throw new Error('Configure SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in the server-only local environment.')
  }
  if (!url.startsWith('https://') || !url.includes('.supabase.co')) {
    throw new Error('SUPABASE_URL must be the configured Supabase project URL.')
  }

  const admin = createClient<Database>(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
  })
  const summary = await runDemoOperation(createStore(admin), { mode, dryRun, password })
  printSummary(summary)
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : 'Unexpected demo utility failure.'
  console.error(message)
  process.exitCode = 1
})
