/**
 * ManageUsersTab: a deleted account (tombstone, `isDeleted: true`) is shown as "Deleted user"
 * instead of its placeholder name, with no edit / ban / promote / avatar actions. Live accounts
 * keep all of theirs.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { i18n } from '../../../i18n'

const { adminApi } = vi.hoisted(() => ({
  adminApi: {
    getUsers: vi.fn(),
    updateUser: vi.fn(),
  },
}))

vi.mock('../../../api/admin', () => ({ adminApi }))

import ManageUsersTab from '../ManageUsersTab.vue'

const t = (key: string) => i18n.global.t(key)

const LIVE = {
  id: 1,
  username: 'alice',
  mail: 'alice@example.com',
  role: 0,
  status: 0,
  isDeleted: false,
  avatarUrl: '/uploads/a.png',
  profile: { displayName: 'Alice' },
}

const DELETED = {
  id: 2,
  username: 'deleted-user-2',
  mail: 'deleted-2@deleted.invalid',
  role: 0,
  status: 0,
  isDeleted: true,
  avatarUrl: null,
  profile: { displayName: '' },
}

async function mountTab(users: unknown[]) {
  adminApi.getUsers.mockResolvedValue({ users, total: users.length })
  const wrapper = mount(ManageUsersTab)
  await flushPromises()
  return wrapper
}

describe('ManageUsersTab: deleted accounts', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('shows a deleted account as "Deleted user", not its placeholder name', async () => {
    const wrapper = await mountTab([LIVE, DELETED])
    const rows = wrapper.findAll('tbody tr')
    expect(rows).toHaveLength(2)
    expect(rows[1].text()).toContain(t('user.deletedUser'))
    expect(rows[1].text()).not.toContain('deleted-user-2')
    expect(rows[1].text()).not.toContain('deleted.invalid')
  })

  it('offers no edit, ban, unban or avatar action on a deleted account', async () => {
    const wrapper = await mountTab([DELETED])
    expect(wrapper.findAll('tbody tr')[0].findAll('button')).toHaveLength(0)
  })

  it('keeps every action on a live account', async () => {
    const wrapper = await mountTab([LIVE])
    const labels = wrapper.findAll('tbody tr')[0].findAll('button').map((b) => b.text())
    expect(labels).toContain(t('admin.banAction'))
    expect(labels).toContain(t('admin.removeAvatar'))
    expect(labels.length).toBeGreaterThanOrEqual(4)
    expect(wrapper.findAll('tbody tr')[0].text()).toContain('alice')
  })
})
