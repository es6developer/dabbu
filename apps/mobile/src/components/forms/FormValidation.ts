export function validateRequired(value: string, label: string): string | null {
  if (!value.trim()) return `${label} is required`;
  return null;
}

export function validateAmount(value: string): string | null {
  if (!value || isNaN(Number(value)) || Number(value) <= 0) {
    return 'Enter a valid amount';
  }
  return null;
}

export function validateEmail(value: string): string | null {
  if (!value.trim()) return 'Email is required';
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!re.test(value.trim())) return 'Enter a valid email address';
  return null;
}

export function validatePhone(value: string): string | null {
  const digits = value.replace(/[^0-9]/g, '');
  if (digits.length < 10) return 'Enter a valid phone number';
  return null;
}

export function validateMinLength(value: string, min: number, label: string): string | null {
  if (value.trim().length < min) return `${label} must be at least ${min} characters`;
  return null;
}
