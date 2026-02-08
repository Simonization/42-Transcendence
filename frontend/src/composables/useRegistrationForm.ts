/**
 * Registration Form Composable
 * Manages tournament registration form state and validation
 */

import { ref, computed } from 'vue'
import { useFormValidation } from './useFormValidation'

export type Step = 1 | 2 | 3
export type ParticipationType = 'solo' | 'team'

export interface FormData {
  participationType: ParticipationType | null
  displayName: string
  email: string
  inGameUsername: string
  teamName: string
  teamMembers: string[]
  acceptRules: boolean
}

export function useRegistrationForm() {
  const currentStep = ref<Step>(1)
  const formData = ref<FormData>({
    participationType: null,
    displayName: 'Player Alpha', // Mock auto-fill
    email: 'player@example.com', // Mock auto-fill
    inGameUsername: '',
    teamName: '',
    teamMembers: [],
    acceptRules: false,
  })

  const errors = ref<Record<string, string>>({})
  const { validate: validateField } = useFormValidation()

  // Computed properties
  const isSolo = computed(() => formData.value.participationType === 'solo')
  const isTeam = computed(() => formData.value.participationType === 'team')

  const canProceedStep1 = computed(() => formData.value.participationType !== null)

  const canProceedStep2 = computed(() => {
    if (!formData.value.participationType) return false

    if (isSolo.value) {
      return (
        formData.value.displayName.trim() !== '' &&
        formData.value.email.trim() !== '' &&
        formData.value.inGameUsername.trim() !== ''
      )
    }

    if (isTeam.value) {
      return (
        formData.value.teamName.trim() !== '' &&
        formData.value.teamMembers.length >= 1 &&
        formData.value.teamMembers.length <= 4
      )
    }

    return false
  })

  const canSubmit = computed(() => formData.value.acceptRules)

  // Validation
  const validateStep = (step: Step): boolean => {
    errors.value = {}

    if (step === 1) {
      if (!formData.value.participationType) {
        errors.value.type = 'Please select a participation type'
        return false
      }
      return true
    }

    if (step === 2) {
      if (isSolo.value) {
        if (!formData.value.displayName.trim()) {
          errors.value.displayName = 'Display name is required'
        } else if (!validateField(formData.value.displayName, ['sanitize'], 'temp')) {
          errors.value.displayName = 'Display name contains invalid characters'
        }
        if (!formData.value.email.trim()) {
          errors.value.email = 'Email is required'
        } else if (!validateField(formData.value.email, ['email', 'sanitize'], 'temp')) {
          errors.value.email = 'Please enter a valid email address'
        }
        if (!formData.value.inGameUsername.trim()) {
          errors.value.inGameUsername = 'In-game username is required'
        } else if (!validateField(formData.value.inGameUsername, ['sanitize'], 'temp')) {
          errors.value.inGameUsername = 'In-game username contains invalid characters'
        }
      }

      if (isTeam.value) {
        if (!formData.value.teamName.trim()) {
          errors.value.teamName = 'Team name is required'
        } else if (!validateField(formData.value.teamName, ['sanitize'], 'temp')) {
          errors.value.teamName = 'Team name contains invalid characters'
        }
        if (formData.value.teamMembers.length === 0) {
          errors.value.teamMembers = 'Select at least one teammate'
        }
        if (formData.value.teamMembers.length > 4) {
          errors.value.teamMembers = 'Maximum 4 teammates allowed'
        }
      }

      return Object.keys(errors.value).length === 0
    }

    if (step === 3) {
      if (!formData.value.acceptRules) {
        errors.value.rules = 'You must accept the rules to proceed'
        return false
      }
      return true
    }

    return false
  }

  // Step navigation
  const goToStep = (step: Step) => {
    if (step < currentStep.value) {
      currentStep.value = step
    } else if (step > currentStep.value && validateStep(currentStep.value)) {
      currentStep.value = step
    }
  }

  const goToNextStep = () => {
    if (validateStep(currentStep.value)) {
      if (currentStep.value < 3) {
        currentStep.value = (currentStep.value + 1) as Step
      }
    }
  }

  const goToPreviousStep = () => {
    if (currentStep.value > 1) {
      currentStep.value = (currentStep.value - 1) as Step
    }
  }

  // Team member management
  const toggleTeamMember = (memberId: string) => {
    const idx = formData.value.teamMembers.indexOf(memberId)
    if (idx > -1) {
      formData.value.teamMembers.splice(idx, 1)
    } else if (formData.value.teamMembers.length < 4) {
      formData.value.teamMembers.push(memberId)
    }
  }

  const isTeamMemberSelected = (memberId: number): boolean => {
    return formData.value.teamMembers.includes(memberId.toString())
  }

  return {
    // State
    currentStep,
    formData,
    errors,

    // Computed
    isSolo,
    isTeam,
    canProceedStep1,
    canProceedStep2,
    canSubmit,

    // Methods
    validateStep,
    goToStep,
    goToNextStep,
    goToPreviousStep,
    toggleTeamMember,
    isTeamMemberSelected,
  }
}
