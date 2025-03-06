// src/utils/__tests__/validation.test.ts

import { describe, test, expect } from 'vitest';
import { validateField, validateForm, validationRules } from '../validation';

describe('Validation Utilities', () => {
  describe('validateField', () => {
    test('returns null for valid field', () => {
      const value = 'test@example.com';
      const rules = [validationRules.email()];
      
      const result = validateField(value, rules);
      
      expect(result).toBeNull();
    });
    
    test('returns error message for invalid field', () => {
      const value = 'invalid-email';
      const rules = [validationRules.email()];
      
      const result = validateField(value, rules);
      
      expect(result).toBe('Please enter a valid email address');
    });
    
    test('validates against multiple rules in order', () => {
      const value = '';
      const rules = [
        validationRules.required('Required field'),
        validationRules.email()
      ];
      
      const result = validateField(value, rules);
      
      // Should fail on the first rule (required)
      expect(result).toBe('Required field');
    });
    
    test('supports cross-field validation', () => {
      const value = 'password123';
      const formValues = { password: 'password123', confirmPassword: 'password456' };
      const rules = [
        validationRules.match('confirmPassword', 'Passwords must match')
      ];
      
      const result = validateField(value, rules, formValues);
      
      expect(result).toBe('Passwords must match');
    });
  });
  
  describe('validateForm', () => {
    test('validates multiple fields', () => {
      const values = {
        name: '',
        email: 'invalid-email',
        password: 'pass'
      };
      
      const schema = {
        name: [validationRules.required('Name is required')],
        email: [validationRules.email()],
        password: [validationRules.minLength(8, 'Password too short')]
      };
      
      const result = validateForm(values, schema);
      
      expect(result).toEqual({
        name: 'Name is required',
        email: 'Please enter a valid email address',
        password: 'Password too short'
      });
    });
    
    test('returns null for valid fields', () => {
      const values = {
        name: 'John Doe',
        email: 'john@example.com',
        password: 'password123'
      };
      
      const schema = {
        name: [validationRules.required()],
        email: [validationRules.email()],
        password: [validationRules.minLength(8)]
      };
      
      const result = validateForm(values, schema);
      
      expect(result).toEqual({
        name: null,
        email: null,
        password: null
      });
    });
  });
  
  describe('validationRules', () => {
    test('required rule', () => {
      const rule = validationRules.required();
      
      expect(rule.test('')).toBe(false);
      expect(rule.test(null)).toBe(false);
      expect(rule.test(undefined)).toBe(false);
      expect(rule.test('value')).toBe(true);
      expect(rule.test(0)).toBe(true);
    });
    
    test('email rule', () => {
      const rule = validationRules.email();
      
      expect(rule.test('invalid')).toBe(false);
      expect(rule.test('user@')).toBe(false);
      expect(rule.test('user@domain')).toBe(false);
      expect(rule.test('user@domain.com')).toBe(true);
      expect(rule.test('')).toBe(true); // Empty is valid (use with required)
    });
    
    test('minLength rule', () => {
      const rule = validationRules.minLength(5);
      
      expect(rule.test('abc')).toBe(false);
      expect(rule.test('abcde')).toBe(true);
      expect(rule.test('abcdef')).toBe(true);
      expect(rule.test('')).toBe(true); // Empty is valid (use with required)
    });
    
    test('match rule', () => {
      const rule = validationRules.match('password');
      
      expect(rule.test('value', { password: 'different' })).toBe(false);
      expect(rule.test('value', { password: 'value' })).toBe(true);
    });
    
    test('custom rule', () => {
      const isEven = (value: number) => value % 2 === 0;
      const rule = validationRules.custom(isEven, 'Must be an even number');
      
      expect(rule.test(3)).toBe(false);
      expect(rule.test(4)).toBe(true);
    });
  });
});