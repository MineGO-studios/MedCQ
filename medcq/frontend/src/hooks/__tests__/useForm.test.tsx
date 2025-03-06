// src/hooks/__tests__/useForm.test.tsx

import { describe, test, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react-hooks';
import useForm from '../useForm';
import { validationRules } from '../../utils/validation';

describe('useForm Hook', () => {
  test('initializes with initial values', () => {
    const initialValues = { name: '', email: '' };
    
    const { result } = renderHook(() => useForm({ initialValues }));
    
    expect(result.current.formState.values).toEqual(initialValues);
    expect(result.current.formState.isValid).toBe(true);
    expect(result.current.formState.isSubmitting).toBe(false);
    expect(result.current.formState.isSubmitted).toBe(false);
  });
  
  test('updates field value', () => {
    const initialValues = { name: '' };
    
    const { result } = renderHook(() => useForm({ initialValues }));
    
    act(() => {
      result.current.formActions.setFieldValue('name', 'John Doe');
    });
    
    expect(result.current.formState.values.name).toBe('John Doe');
  });
  
  test('validates fields on submit', async () => {
    const initialValues = { name: '', email: '' };
    const validationSchema = {
      name: [validationRules.required('Name is required')],
      email: [validationRules.email('Invalid email')]
    };
    const onSubmit = vi.fn();
    
    const { result } = renderHook(() => 
      useForm({ initialValues, validationSchema, onSubmit })
    );
    
    // Submit form with empty values
    await act(async () => {
      await result.current.formActions.submitForm();
    });
    
    // Verify fields have errors
    expect(result.current.formState.fieldState.name.error).toBe('Name is required');
    expect(result.current.formState.isValid).toBe(false);
    
    // Verify onSubmit was not called
    expect(onSubmit).not.toHaveBeenCalled();
    
    // Fix validation errors
    act(() => {
      result.current.formActions.setFieldValue('name', 'John Doe');
      result.current.formActions.setFieldValue('email', 'john@example.com');
    });
    
    // Submit form again
    await act(async () => {
      await result.current.formActions.submitForm();
    });
    
    // Verify no errors and onSubmit was called
    expect(result.current.formState.isValid).toBe(true);
    expect(onSubmit).toHaveBeenCalledWith({ 
      name: 'John Doe', 
      email: 'john@example.com' 
    });
  });
  
  test('validates fields on change when enabled', () => {
    const initialValues = { name: '' };
    const validationSchema = {
      name: [validationRules.required('Name is required')]
    };
    
    const { result } = renderHook(() => 
      useForm({ initialValues, validationSchema, validateOnChange: true })
    );
    
    // Set field to invalid value
    act(() => {
      result.current.formActions.setFieldValue('name', '');
    });
    
    // Error should be set immediately due to validateOnChange
    expect(result.current.formState.fieldState.name.error).toBe('Name is required');
    
    // Set field to valid value
    act(() => {
      result.current.formActions.setFieldValue('name', 'John Doe');
    });
    
    // Error should be cleared
    expect(result.current.formState.fieldState.name.error).toBeNull();
  });
  
  test('validates fields on blur', () => {
    const initialValues = { name: '' };
    const validationSchema = {
      name: [validationRules.required('Name is required')]
    };
    
    const { result } = renderHook(() => 
      useForm({ initialValues, validationSchema })
    );
    
    // Set field as touched
    act(() => {
      result.current.formActions.setFieldTouched('name');
    });
    
    // Error should be set after blur
    expect(result.current.formState.fieldState.name.error).toBe('Name is required');
    
    // Set field to valid value
    act(() => {
      result.current.formActions.setFieldValue('name', 'John Doe');
      // Blur again
      result.current.formActions.setFieldTouched('name');
    });
    
    // Error should be cleared
    expect(result.current.formState.fieldState.name.error).toBeNull();
  });
  
  test('getFieldProps returns correct props', () => {
    const initialValues = { name: 'John Doe' };
    
    const { result } = renderHook(() => useForm({ initialValues }));
    
    const fieldProps = result.current.getFieldProps('name');
    
    expect(fieldProps).toEqual(expect.objectContaining({
      name: 'name',
      value: 'John Doe',
      onChange: expect.any(Function),
      onBlur: expect.any(Function),
      error: null,
      touched: false
    }));
  });
  
  test('resetForm returns to initial state', () => {
    const initialValues = { name: '', email: '' };
    
    const { result } = renderHook(() => useForm({ initialValues }));
    
    // Update values
    act(() => {
      result.current.formActions.setFieldValue('name', 'John Doe');
      result.current.formActions.setFieldTouched('name');
    });
    
    // Verify values changed
    expect(result.current.formState.values.name).toBe('John Doe');
    expect(result.current.formState.fieldState.name.touched).toBe(true);
    
    // Reset form
    act(() => {
      result.current.formActions.resetForm();
    });
    
    // Verify values reset
    expect(result.current.formState.values).toEqual(initialValues);
    expect(result.current.formState.fieldState.name.touched).toBe(false);
  });
});