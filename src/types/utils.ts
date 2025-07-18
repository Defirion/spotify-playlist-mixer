// Utility types for common patterns and generic operations

// Generic API response wrapper
export interface ApiResponse<T> {
  data: T;
  success: boolean;
  error?: string;
  timestamp: Date;
}

// Generic loading state wrapper
export interface LoadingState<T> {
  data: T | null;
  isLoading: boolean;
  error: string | null;
}

// Generic async operation result
export type AsyncResult<T, E = Error> = Promise<
  | { success: true; data: T }
  | { success: false; error: E }
>;

// Generic event handler types
export type EventHandler<T = void> = (data: T) => void;
export type AsyncEventHandler<T = void> = (data: T) => Promise<void>;

// Generic callback types
export type Callback<T = void> = () => T;
export type AsyncCallback<T = void> = () => Promise<T>;

// Generic predicate types
export type Predicate<T> = (item: T) => boolean;
export type AsyncPredicate<T> = (item: T) => Promise<boolean>;

// Generic transformer types
export type Transformer<T, U> = (input: T) => U;
export type AsyncTransformer<T, U> = (input: T) => Promise<U>;

// Generic comparator types
export type Comparator<T> = (a: T, b: T) => number;

// Generic reducer types
export type Reducer<S, A> = (state: S, action: A) => S;

// Generic action types for state management
export interface Action<T = any> {
  type: string;
  payload?: T;
}

// Generic service interface
export interface Service {
  initialize?(): Promise<void>;
  cleanup?(): Promise<void>;
}

// Generic repository interface
export interface Repository<T, K = string> {
  findById(id: K): Promise<T | null>;
  findAll(): Promise<T[]>;
  create(item: Omit<T, 'id'>): Promise<T>;
  update(id: K, item: Partial<T>): Promise<T>;
  delete(id: K): Promise<void>;
}

// Generic cache interface
export interface Cache<T> {
  get(key: string): T | null;
  set(key: string, value: T, ttl?: number): void;
  delete(key: string): void;
  clear(): void;
  has(key: string): boolean;
}

// Generic configuration interface
export interface Config {
  [key: string]: any;
}

// Generic validation result
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings?: string[];
}

// Generic pagination types
export interface PaginationParams {
  page: number;
  limit: number;
  offset?: number;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  hasNext: boolean;
  hasPrevious: boolean;
}

// Generic search types
export interface SearchParams {
  query: string;
  filters?: Record<string, any>;
  sort?: {
    field: string;
    direction: 'asc' | 'desc';
  };
}

export interface SearchResult<T> {
  items: T[];
  total: number;
  query: string;
  executionTime: number;
}

// Utility type helpers
export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;
export type RequiredFields<T, K extends keyof T> = T & Required<Pick<T, K>>;
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};
export type DeepRequired<T> = {
  [P in keyof T]-?: T[P] extends object ? DeepRequired<T[P]> : T[P];
};

// Function utility types
export type Awaited<T> = T extends Promise<infer U> ? U : T;
export type ReturnTypeAsync<T extends (...args: any[]) => Promise<any>> = 
  T extends (...args: any[]) => Promise<infer R> ? R : never;

// Object utility types
export type KeysOfType<T, U> = {
  [K in keyof T]: T[K] extends U ? K : never;
}[keyof T];

export type ValuesOf<T> = T[keyof T];

// Array utility types
export type ArrayElement<T> = T extends (infer U)[] ? U : never;
export type NonEmptyArray<T> = [T, ...T[]];

// String utility types
export type StringKeys<T> = Extract<keyof T, string>;
export type NumberKeys<T> = Extract<keyof T, number>;

// Environment types
export type Environment = 'development' | 'production' | 'test';

// Feature flag types
export interface FeatureFlags {
  [key: string]: boolean;
}