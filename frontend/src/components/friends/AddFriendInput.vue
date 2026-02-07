<script setup lang="ts">
import { ref } from 'vue'

const emit = defineEmits<{
  add: [friendId: number]
}>()

const friendId = ref('')
const inputError = ref('')

const handleSubmit = () => {
  const id = parseInt(friendId.value, 10)
  if (isNaN(id) || id <= 0) {
    inputError.value = 'Enter a valid user ID'
    return
  }
  inputError.value = ''
  emit('add', id)
  friendId.value = ''
}
</script>

<template>
  <div class="add-friend">
    <form @submit.prevent="handleSubmit" class="add-friend-form">
      <input
        v-model="friendId"
        type="text"
        class="input add-friend-input"
        placeholder="User ID"
        inputmode="numeric"
        aria-label="User ID to add as friend"
      />
      <button type="submit" class="btn btn-primary btn-sm">ADD</button>
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
