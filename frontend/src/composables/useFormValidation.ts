import { ref, computed } from 'vue'
import { i18n } from '@/i18n'

type ValidationRule = string | [string, ...unknown[]]

interface ValidationRuleDefinition {
  (value: string, ...args: unknown[]): { valid: boolean; error?: string }
}

const validationRules: Record<string, ValidationRuleDefinition> = {
  required: (value: string) => {
    const valid = value.trim().length > 0
    return {
      valid,
      error: valid ? undefined : i18n.global.t('validation.required'),
    }
  },

  email: (value: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    const valid = emailRegex.test(value)
    return {
      valid,
      error: valid ? undefined : i18n.global.t('validation.email'),
    }
  },

  minLength: (value: string, min: unknown) => {
    const minNum = Number(min)
    const valid = value.length >= minNum
    return {
      valid,
      error: valid ? undefined : i18n.global.t('validation.minLength', { min: minNum }),
    }
  },

  maxLength: (value: string, max: unknown) => {
    const maxNum = Number(max)
    const valid = value.length <= maxNum
    return {
      valid,
      error: valid ? undefined : i18n.global.t('validation.maxLength', { max: maxNum }),
    }
  },

  username: (value: string) => {
    const usernameRegex = /^[a-zA-Z0-9_-]{3,20}$/
    const valid = usernameRegex.test(value)
    return {
      valid,
      error: valid
        ? undefined
        : i18n.global.t('validation.username'),
    }
  },

  password: (value: string) => {
    const valid = value.length >= 8
    return {
      valid,
      error: valid ? undefined : i18n.global.t('validation.password'),
    }
  },

  sanitize: (value: string) => {
    // XSS prevention: reject dangerous HTML/JS patterns
    const xssPatterns = [
      /<script/i,
      /<iframe/i,
      /javascript:/i,
      /on\w+\s*=/i, // event handlers like onclick=
      /<embed/i,
      /<object/i,
    ]

    const valid = !xssPatterns.some(pattern => pattern.test(value))
    return {
      valid,
      error: valid ? undefined : i18n.global.t('validation.sanitize'),
    }
  },
}

export function useFormValidation() {
  const errors = ref<Record<string, string>>({})

  const isValid = computed(() => Object.keys(errors.value).length === 0)

  const validate = (
    value: string,
    rulesList: ValidationRule[],
    fieldName: string
  ): boolean => {
    for (const rule of rulesList) {
      let ruleName: string
      let ruleArgs: unknown[] = []

      if (typeof rule === 'string') {
        ruleName = rule
      } else if (Array.isArray(rule)) {
        ;[ruleName, ...ruleArgs] = rule
      } else {
        continue
      }

      const ruleFunc = validationRules[ruleName]
      if (!ruleFunc) continue

      const result = ruleFunc(value, ...ruleArgs)
      if (!result.valid) {
        errors.value[fieldName] = result.error || i18n.global.t('validation.failed')
        return false
      }
    }

    // Validation passed, clear any existing error for this field
    delete errors.value[fieldName]
    return true
  }

  const clearErrors = () => {
    errors.value = {}
  }

  return {
    errors: errors as Readonly<typeof errors>,
    isValid,
    validate,
    clearErrors,
  }
}
