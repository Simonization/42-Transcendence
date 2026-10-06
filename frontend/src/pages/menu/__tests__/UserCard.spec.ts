/**
 * UserCard — the delete-account flow: what is erased and kept, typed confirmation.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { ref } from 'vue'

const { push, deleteAccount, logout, user } = vi.hoisted(() => ({
  push: vi.fn(),
  deleteAccount: vi.fn(),
  logout: vi.fn(),
  user: { value: { id: 42, username: 'neo' } as { id: number; username: string } | null },
}))

vi.mock('vue-router', () => ({ useRouter: () => ({ push }) }))
vi.mock('../../../api/users', () => ({ usersApi: { deleteAccount } }))
vi.mock('pinia', async (importOriginal) => ({
  ...(await importOriginal<typeof import('pinia')>()),
  storeToRefs: () => ({ user: ref(user.value) }),
}))
vi.mock('../../../stores/auth', () => ({
  useAuthStore: () => ({ checkAuth: vi.fn(), logout }),
}))

import UserCard from '../UserCard.vue'

const mountCard = () =>
  mount(UserCard, {
    global: {
      stubs: { ProfileSection: true, SettingsSection: true, SecuritySection: true, teleport: true },
    },
  })

describe('UserCard — delete account', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    deleteAccount.mockResolvedValue({ message: 'Account deleted' })
  })

  it('explains what is erased and what is kept before anything happens', async () => {
    const wrapper = mountCard()
    await wrapper.find('.section-danger .btn-danger').trigger('click')

    const dialog = wrapper.find('[role="dialog"]')
    expect(dialog.find('.delete-erased').text()).toContain('email')
    expect(dialog.find('.delete-kept').text()).toContain('messages you sent')
    expect(dialog.text()).toContain('Deleted user')
    expect(deleteAccount).not.toHaveBeenCalled()
  })

  it('keeps the delete button disabled until the username is typed, then deletes and signs out', async () => {
    const wrapper = mountCard()
    await wrapper.find('.section-danger .btn-danger').trigger('click')

    const confirm = () => wrapper.find('[role="dialog"] .dialog-actions .btn-danger')
    expect(confirm().attributes('disabled')).toBeDefined()

    await wrapper.find('#delete-confirm-input').setValue('ne')
    expect(confirm().attributes('disabled')).toBeDefined()
    await confirm().trigger('click')
    expect(deleteAccount).not.toHaveBeenCalled()

    await wrapper.find('#delete-confirm-input').setValue('neo')
    expect(confirm().attributes('disabled')).toBeUndefined()
    await confirm().trigger('click')
    await flushPromises()

    expect(deleteAccount).toHaveBeenCalledWith(42)
    expect(logout).toHaveBeenCalled()
    expect(push).toHaveBeenCalledWith('/auth')
  })
})
