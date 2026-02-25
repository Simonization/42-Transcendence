/**
 * useRegistrationForm Composable Unit Tests
 * Tests form state management, step navigation, and validation for tournament registration
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { useRegistrationForm } from '../useRegistrationForm'

describe('useRegistrationForm', () => {
  describe('initial state', () => {
    it('should start on step 1', () => {
      const { currentStep } = useRegistrationForm()
      expect(currentStep.value).toBe(1)
    })

    it('should have no participation type selected', () => {
      const { formData } = useRegistrationForm()
      expect(formData.value.participationType).toBeNull()
    })

    it('should not have rules accepted', () => {
      const { formData } = useRegistrationForm()
      expect(formData.value.acceptRules).toBe(false)
    })

    it('should have empty teamMembers array', () => {
      const { formData } = useRegistrationForm()
      expect(formData.value.teamMembers).toHaveLength(0)
    })
  })

  describe('isSolo / isTeam computed', () => {
    it('isSolo should be true when participationType is "solo"', () => {
      const { formData, isSolo } = useRegistrationForm()
      formData.value.participationType = 'solo'
      expect(isSolo.value).toBe(true)
    })

    it('isTeam should be true when participationType is "team"', () => {
      const { formData, isTeam } = useRegistrationForm()
      formData.value.participationType = 'team'
      expect(isTeam.value).toBe(true)
    })

    it('isSolo should be false when type is "team"', () => {
      const { formData, isSolo } = useRegistrationForm()
      formData.value.participationType = 'team'
      expect(isSolo.value).toBe(false)
    })
  })

  describe('canProceedStep1', () => {
    it('should be false when no participationType selected', () => {
      const { canProceedStep1 } = useRegistrationForm()
      expect(canProceedStep1.value).toBe(false)
    })

    it('should be true when solo is selected', () => {
      const { formData, canProceedStep1 } = useRegistrationForm()
      formData.value.participationType = 'solo'
      expect(canProceedStep1.value).toBe(true)
    })

    it('should be true when team is selected', () => {
      const { formData, canProceedStep1 } = useRegistrationForm()
      formData.value.participationType = 'team'
      expect(canProceedStep1.value).toBe(true)
    })
  })

  describe('canProceedStep2 — solo mode', () => {
    it('should be false when inGameUsername is empty', () => {
      const { formData, canProceedStep2 } = useRegistrationForm()
      formData.value.participationType = 'solo'
      formData.value.inGameUsername = ''
      // displayName and email are pre-filled with mock values
      expect(canProceedStep2.value).toBe(false)
    })

    it('should be true when all solo fields are filled', () => {
      const { formData, canProceedStep2 } = useRegistrationForm()
      formData.value.participationType = 'solo'
      formData.value.displayName = 'Player Alpha'
      formData.value.email = 'player@example.com'
      formData.value.inGameUsername = 'pongmaster'
      expect(canProceedStep2.value).toBe(true)
    })
  })

  describe('canProceedStep2 — team mode', () => {
    it('should be false when teamName is empty', () => {
      const { formData, canProceedStep2 } = useRegistrationForm()
      formData.value.participationType = 'team'
      formData.value.teamName = ''
      formData.value.teamMembers = ['2']
      expect(canProceedStep2.value).toBe(false)
    })

    it('should be false when no team members selected', () => {
      const { formData, canProceedStep2 } = useRegistrationForm()
      formData.value.participationType = 'team'
      formData.value.teamName = 'Alpha Squad'
      formData.value.teamMembers = []
      expect(canProceedStep2.value).toBe(false)
    })

    it('should be true when teamName and at least 1 member', () => {
      const { formData, canProceedStep2 } = useRegistrationForm()
      formData.value.participationType = 'team'
      formData.value.teamName = 'Alpha Squad'
      formData.value.teamMembers = ['2']
      expect(canProceedStep2.value).toBe(true)
    })
  })

  describe('canSubmit', () => {
    it('should be false before rules are accepted', () => {
      const { canSubmit } = useRegistrationForm()
      expect(canSubmit.value).toBe(false)
    })

    it('should be true after accepting rules', () => {
      const { formData, canSubmit } = useRegistrationForm()
      formData.value.acceptRules = true
      expect(canSubmit.value).toBe(true)
    })
  })

  describe('goToNextStep / goToPreviousStep', () => {
    it('should not advance from step 1 when participationType is null', () => {
      const { currentStep, goToNextStep } = useRegistrationForm()
      goToNextStep()
      expect(currentStep.value).toBe(1)
    })

    it('should advance to step 2 from step 1 when type is selected', () => {
      const { formData, currentStep, goToNextStep } = useRegistrationForm()
      formData.value.participationType = 'solo'
      goToNextStep()
      expect(currentStep.value).toBe(2)
    })

    it('should go back from step 2 to step 1', () => {
      const { formData, currentStep, goToNextStep, goToPreviousStep } = useRegistrationForm()
      formData.value.participationType = 'solo'
      goToNextStep()
      expect(currentStep.value).toBe(2)

      goToPreviousStep()
      expect(currentStep.value).toBe(1)
    })

    it('should not go below step 1', () => {
      const { currentStep, goToPreviousStep } = useRegistrationForm()
      goToPreviousStep()
      expect(currentStep.value).toBe(1)
    })
  })

  describe('goToStep', () => {
    it('should jump back to any previous step', () => {
      const { formData, currentStep, goToNextStep, goToStep } = useRegistrationForm()
      formData.value.participationType = 'solo'
      goToNextStep() // step 2

      goToStep(1)
      expect(currentStep.value).toBe(1)
    })
  })

  describe('toggleTeamMember', () => {
    it('should add a member when not selected', () => {
      const { formData, toggleTeamMember } = useRegistrationForm()

      toggleTeamMember('5')
      expect(formData.value.teamMembers).toContain('5')
    })

    it('should remove a member when already selected', () => {
      const { formData, toggleTeamMember } = useRegistrationForm()

      toggleTeamMember('5')
      toggleTeamMember('5')
      expect(formData.value.teamMembers).not.toContain('5')
    })

    it('should not add more than 4 members', () => {
      const { formData, toggleTeamMember } = useRegistrationForm()

      toggleTeamMember('1')
      toggleTeamMember('2')
      toggleTeamMember('3')
      toggleTeamMember('4')
      toggleTeamMember('5') // should be rejected

      expect(formData.value.teamMembers).toHaveLength(4)
      expect(formData.value.teamMembers).not.toContain('5')
    })
  })

  describe('isTeamMemberSelected', () => {
    it('should return true when member is selected', () => {
      const { formData, isTeamMemberSelected } = useRegistrationForm()
      formData.value.teamMembers = ['5']

      expect(isTeamMemberSelected(5)).toBe(true)
    })

    it('should return false when member is not selected', () => {
      const { isTeamMemberSelected } = useRegistrationForm()
      expect(isTeamMemberSelected(99)).toBe(false)
    })
  })

  describe('validateStep', () => {
    it('should fail step 1 when no participationType', () => {
      const { validateStep, errors } = useRegistrationForm()
      const ok = validateStep(1)
      expect(ok).toBe(false)
      expect(errors.value.type).toBeTruthy()
    })

    it('should pass step 1 when participationType is set', () => {
      const { formData, validateStep } = useRegistrationForm()
      formData.value.participationType = 'team'
      expect(validateStep(1)).toBe(true)
    })

    it('should fail step 3 when rules not accepted', () => {
      const { validateStep, errors } = useRegistrationForm()
      const ok = validateStep(3)
      expect(ok).toBe(false)
      expect(errors.value.rules).toBeTruthy()
    })

    it('should pass step 3 when rules accepted', () => {
      const { formData, validateStep } = useRegistrationForm()
      formData.value.acceptRules = true
      expect(validateStep(3)).toBe(true)
    })
  })
})
