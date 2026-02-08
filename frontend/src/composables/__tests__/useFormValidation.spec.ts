import { describe, it, expect } from 'vitest'
import { useFormValidation } from '../useFormValidation'

describe('useFormValidation', () => {
  it('should initialize with empty errors', () => {
    const { errors } = useFormValidation()
    expect(Object.keys(errors.value)).toHaveLength(0)
  })

  describe('validate', () => {
    it('should validate required field', () => {
      const { validate, errors } = useFormValidation()
      const result = validate('', ['required'], 'username')
      expect(result).toBe(false)
      expect(errors.value.username).toBeDefined()
    })

    it('should pass required validation for non-empty value', () => {
      const { validate, errors } = useFormValidation()
      const result = validate('john_doe', ['required'], 'username')
      expect(result).toBe(true)
      expect(errors.value.username).toBeUndefined()
    })

    it('should validate email format', () => {
      const { validate, errors } = useFormValidation()
      const result = validate('invalid-email', ['email'], 'email')
      expect(result).toBe(false)
      expect(errors.value.email).toBeDefined()
    })

    it('should pass email validation for valid format', () => {
      const { validate, errors } = useFormValidation()
      const result = validate('user@example.com', ['email'], 'email')
      expect(result).toBe(true)
      expect(errors.value.email).toBeUndefined()
    })

    it('should validate minLength rule', () => {
      const { validate, errors } = useFormValidation()
      const result = validate('short', [['minLength', 8]], 'password')
      expect(result).toBe(false)
      expect(errors.value.password).toBeDefined()
    })

    it('should pass minLength validation', () => {
      const { validate, errors } = useFormValidation()
      const result = validate('longenough', [['minLength', 8]], 'password')
      expect(result).toBe(true)
      expect(errors.value.password).toBeUndefined()
    })

    it('should validate maxLength rule', () => {
      const { validate, errors } = useFormValidation()
      const result = validate('thisistoolongtobevalid', [['maxLength', 10]], 'name')
      expect(result).toBe(false)
      expect(errors.value.name).toBeDefined()
    })

    it('should pass maxLength validation', () => {
      const { validate, errors } = useFormValidation()
      const result = validate('valid', [['maxLength', 10]], 'name')
      expect(result).toBe(true)
      expect(errors.value.name).toBeUndefined()
    })

    it('should validate username format', () => {
      const { validate, errors } = useFormValidation()
      // Invalid: too short
      let result = validate('ab', ['username'], 'username')
      expect(result).toBe(false)

      // Valid: alphanumeric with dash/underscore
      result = validate('john_doe', ['username'], 'username')
      expect(result).toBe(true)
      expect(errors.value.username).toBeUndefined()
    })

    it('should validate password minimum length', () => {
      const { validate, errors } = useFormValidation()
      const result = validate('short', ['password'], 'password')
      expect(result).toBe(false)
      expect(errors.value.password).toBeDefined()
    })

    it('should pass password validation', () => {
      const { validate, errors } = useFormValidation()
      const result = validate('securepassword123', ['password'], 'password')
      expect(result).toBe(true)
      expect(errors.value.password).toBeUndefined()
    })

    it('should sanitize XSS attempts - script tag', () => {
      const { validate, errors } = useFormValidation()
      const result = validate('<script>alert("xss")</script>', ['sanitize'], 'content')
      expect(result).toBe(false)
      expect(errors.value.content).toBeDefined()
    })

    it('should sanitize XSS attempts - iframe', () => {
      const { validate, errors } = useFormValidation()
      const result = validate('<iframe src="evil.com"></iframe>', ['sanitize'], 'content')
      expect(result).toBe(false)
      expect(errors.value.content).toBeDefined()
    })

    it('should sanitize XSS attempts - javascript protocol', () => {
      const { validate, errors } = useFormValidation()
      const result = validate('<a href="javascript:alert()">click</a>', ['sanitize'], 'link')
      expect(result).toBe(false)
      expect(errors.value.link).toBeDefined()
    })

    it('should sanitize XSS attempts - event handlers', () => {
      const { validate, errors } = useFormValidation()
      const result = validate('<img onerror="alert(1)" src=x>', ['sanitize'], 'img')
      expect(result).toBe(false)
      expect(errors.value.img).toBeDefined()
    })

    it('should pass sanitization for clean text', () => {
      const { validate, errors } = useFormValidation()
      const result = validate('This is clean text', ['sanitize'], 'content')
      expect(result).toBe(true)
      expect(errors.value.content).toBeUndefined()
    })

    it('should process multiple rules in order', () => {
      const { validate, errors } = useFormValidation()
      // Should fail on required first
      const result = validate('', ['required', 'email', ['minLength', 8]], 'field')
      expect(result).toBe(false)
      expect(errors.value.field).toContain('required')
    })

    it('should clear error when validation passes', () => {
      const { validate, errors } = useFormValidation()
      // First validation fails
      validate('', ['required'], 'username')
      expect(errors.value.username).toBeDefined()

      // Second validation passes
      validate('john', ['required'], 'username')
      expect(errors.value.username).toBeUndefined()
    })
  })

  describe('isValid computed property', () => {
    it('should be true when no errors exist', () => {
      const { isValid } = useFormValidation()
      expect(isValid.value).toBe(true)
    })

    it('should be false when errors exist', () => {
      const { validate, isValid } = useFormValidation()
      validate('', ['required'], 'username')
      expect(isValid.value).toBe(false)
    })

    it('should update when errors are cleared', () => {
      const { validate, isValid, clearErrors } = useFormValidation()
      validate('', ['required'], 'username')
      expect(isValid.value).toBe(false)

      clearErrors()
      expect(isValid.value).toBe(true)
    })
  })

  describe('clearErrors', () => {
    it('should clear all errors', () => {
      const { validate, errors, clearErrors } = useFormValidation()
      validate('', ['required'], 'username')
      validate('invalid', ['email'], 'email')
      expect(Object.keys(errors.value).length).toBeGreaterThan(0)

      clearErrors()
      expect(Object.keys(errors.value)).toHaveLength(0)
    })
  })

  describe('edge cases', () => {
    it('should handle whitespace-only strings in required validation', () => {
      const { validate, errors } = useFormValidation()
      const result = validate('   ', ['required'], 'field')
      expect(result).toBe(false)
      expect(errors.value.field).toBeDefined()
    })

    it('should validate email with multiple @ symbols', () => {
      const { validate } = useFormValidation()
      const result = validate('user@@example.com', ['email'], 'email')
      expect(result).toBe(false)
    })

    it('should validate email without domain', () => {
      const { validate } = useFormValidation()
      const result = validate('user@domain', ['email'], 'email')
      expect(result).toBe(false)
    })

    it('should handle combined validation rules', () => {
      const { validate, errors } = useFormValidation()
      const result = validate('john_doe123', ['required', ['minLength', 3], 'sanitize'], 'username')
      expect(result).toBe(true)
      expect(errors.value.username).toBeUndefined()
    })
  })
})
