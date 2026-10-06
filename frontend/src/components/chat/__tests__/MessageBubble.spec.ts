import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import MessageBubble from '../MessageBubble.vue'
import type { Message } from '../../../types'

const message = (sender: Message['sender']): Message => ({
  id: 1,
  chatId: 1,
  senderId: 7,
  content: 'hello',
  createdAt: new Date().toISOString(),
  editedAt: null,
  deletedAt: null,
  sender,
})

describe('MessageBubble', () => {
  it('links a live sender to their profile', async () => {
    const wrapper = mount(MessageBubble, { props: { message: message({ id: 7, username: 'neo' }), currentUserId: 1 } })
    await wrapper.find('.sender-link').trigger('click')
    expect(wrapper.find('.sender-link').text()).toBe('neo')
    expect(wrapper.emitted('viewProfile')).toEqual([[7]])
  })

  it('keeps the message of a deleted account, from "Deleted user", with no profile link', () => {
    const wrapper = mount(MessageBubble, {
      props: { message: message({ id: 7, username: '', isDeleted: true }), currentUserId: 1 },
    })
    expect(wrapper.text()).toContain('hello')
    expect(wrapper.find('.sender-deleted').text()).toBe('Deleted user')
    expect(wrapper.find('.sender-link').exists()).toBe(false)
  })
})
