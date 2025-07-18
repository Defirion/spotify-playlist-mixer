// Error types and error handling utilities

export type ErrorType = 'NETWORK' | 'AUTH' | 'VALIDATION' | 'API' | 'UNKNOWN';

export interface AppError {
  type: ErrorType;
  message: string;
  details?: any;
  timestamp: Date;
  code?: string;
}

export interface NetworkError extends AppError {
  type: 'NETWORK';
  status?: number;
  statusText?: string;
}

export interface AuthError extends AppError {
  type: 'AUTH';
  reason: 'TOKEN_EXPIRED' | 'INVALID_TOKEN' | 'UNAUTHORIZED' | 'LOGIN_FAILED';
}

export interface ValidationError extends AppError {
  type: 'VALIDATION';
  field?: string;
  validationRules?: string[];
}

export interface APIError extends AppError {
  type: 'API';
  endpoint?: string;
  method?: string;
  response?: any;
}

// Error factory functions
export const createNetworkError = (
  message: string,
  status?: number,
  statusText?: string,
  details?: any
): NetworkError => ({
  type: 'NETWORK',
  message,
  status,
  statusText,
  details,
  timestamp: new Date(),
});

export const createAuthError = (
  message: string,
  reason: AuthError['reason'],
  details?: any
): AuthError => ({
  type: 'AUTH',
  message,
  reason,
  details,
  timestamp: new Date(),
});

export const createValidationError = (
  message: string,
  field?: string,
  validationRules?: string[],
  details?: any
): ValidationError => ({
  type: 'VALIDATION',
  message,
  field,
  validationRules,
  details,
  timestamp: new Date(),
});

export const createAPIError = (
  message: string,
  endpoint?: string,
  method?: string,
  response?: any,
  details?: any
): APIError => ({
  type: 'API',
  message,
  endpoint,
  method,
  response,
  details,
  timestamp: new Date(),
});

export const createAppError = (
  type: ErrorType,
  message: string,
  details?: any,
  code?: string
): AppError => ({
  type,
  message,
  details,
  code,
  timestamp: new Date(),
});

// Error type guards
export const isNetworkError = (error: AppError): error is NetworkError =>
  error.type === 'NETWORK';

export const isAuthError = (error: AppError): error is AuthError =>
  error.type === 'AUTH';

export const isValidationError = (error: AppError): error is ValidationError =>
  error.type === 'VALIDATION';

export const isAPIError = (error: AppError): error is APIError =>
  error.type === 'API';