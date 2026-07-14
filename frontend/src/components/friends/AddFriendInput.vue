<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { usersApi } from '../../api/users'

const { t } = useI18n()

const emit = defineEmits<{
  add: [friendId: number]
}>()

const friendId = ref('') 
const inputError = ref('')
const isSearching = ref(false)

const handleSubmit = async () => {
  const inputVal = friendId.value.trim()
  const id = parseInt(inputVal, 10)
  const isIdInput = Number.isInteger(id) && String(id) === inputVal && id > 0

  if (!inputVal) {
    inputError.value = t('friends.invalidUserId')
    return
  }

  inputError.value = ''
  isSearching.value = true

  try {
    if (isIdInput) {
      emit('add', id)
      friendId.value = ''
      return
    }

    const results = await usersApi.search(inputVal, 5)
    const matchedUser = results.find(
      (u) => u.username.toLowerCase() === inputVal.toLowerCase(),
    )

    if (!matchedUser) {
      inputError.value = t('friends.invalidUserId')
      return
    }

    emit('add', matchedUser.id)
    friendId.value = ''
  } catch {
    inputError.value = t('friends.invalidUserId')
  } finally {
    isSearching.value = false
  }
}
</script>

<template>
  <div class="add-friend">
    <form @submit.prevent="handleSubmit" class="add-friend-form">
      <input
        v-model="friendId"
        type="text"
        class="input add-friend-input"
        :placeholder="$t('friends.addFriendPlaceholder')"
        :disabled="isSearching"
        :aria-label="$t('friends.addFriendPlaceholder')"
      />
      <button type="submit" class="btn btn-primary btn-sm" :disabled="isSearching">
        {{ isSearching ? '...' : $t('friends.add') }}
      </button>
    </form>
    <p v-if="inputError" class="input-error-text">{{ inputError }}</p>
  </div>
</template>

<style scoped>
.add-friend-form {
  display: flex;
  gap: var(--space-2);
}

.add-friend-input {
  flex: 1;
  min-width: 0;
}

.input-error-text {
  font-size: var(--text-xs);
  color: var(--color-error);
  margin: var(--space-1) 0 0 0;
}
</style>