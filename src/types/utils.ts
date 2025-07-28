// Utility types for TypeScript

import React from 'react';

// Generic utility types (excluding duplicates from mixer.ts)

export type Nullable<T> = T | null;

export type Optional<T> = T | undefined;

export type NonEmptyArray<T> = [T, ...T[]];

export type ValueOf<T> = T[keyof T];

export type KeysOfType<T, U> = {
  [K in keyof T]: T[K] extends U ? K : never;
}[keyof T];

export type Mutable<T> = {
  -readonly [P in keyof T]: T[P];
};

export type DeepReadonly<T> = {
  readonly [P in keyof T]: T[P] extends object ? DeepReadonly<T[P]> : T[P];
};

// Function utility types
export type AsyncFunction<T extends any[] = any[], R = any> = (
  ...args: T
) => Promise<R>;

export type SyncFunction<T extends any[] = any[], R = any> = (...args: T) => R;

export type EventHandler<T = Event> = (event: T) => void;

export type ChangeHandler<T = any> = (value: T) => void;

export type ErrorHandler = (error: Error) => void;

export type VoidFunction = () => void;

// React utility types
export type ComponentWithChildren<P = {}> = React.FC<
  P & { children?: React.ReactNode }
>;

export type ComponentWithoutChildren<P = {}> = React.FC<P>;

export type RefCallback<T> = (instance: T | null) => void;

export type ForwardRefComponent<T, P = {}> = React.ForwardRefExoticComponent<
  React.PropsWithoutRef<P> & React.RefAttributes<T>
>;

export type PolymorphicComponentProps<
  C extends React.ElementType,
  Props = {},
> = Props &
  Omit<React.ComponentPropsWithoutRef<C>, keyof Props> & {
    as?: C;
  };

export type PolymorphicRef<C extends React.ElementType> =
  React.ComponentPropsWithRef<C>['ref'];

export type PolymorphicComponentPropsWithRef<
  C extends React.ElementType,
  Props = {},
> = PolymorphicComponentProps<C, Props> & { ref?: PolymorphicRef<C> };

// State management utility types
export type StateUpdater<T> = T | ((prevState: T) => T);

export type StateSetterFunction<T> = (value: StateUpdater<T>) => void;

export type ReducerAction<T extends string = string, P = any> = {
  type: T;
  payload?: P;
};

export type ReducerFunction<S, A> = (state: S, action: A) => S;

// API utility types
export type ApiResponse<T> = {
  data: T;
  status: number;
  statusText: string;
  headers: Record<string, string>;
};

export type ApiErrorResponse = {
  error: {
    message: string;
    code?: string | number;
    details?: any;
  };
  status: number;
  statusText: string;
};

export type PaginatedApiResponse<T> = {
  items: T[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
  nextCursor?: string;
};

// Form utility types
export type FormFieldValue =
  | string
  | number
  | boolean
  | string[]
  | File
  | File[];

export type FormValues = Record<string, FormFieldValue>;

export type FormErrors = Record<string, string | string[]>;

export type FormTouched = Record<string, boolean>;

export type ValidationRule<T = any> = {
  required?: boolean;
  min?: number;
  max?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  custom?: (value: T) => string | null;
};

export type ValidationRules = Record<string, ValidationRule>;

// Event utility types
export type KeyboardEventHandler = (event: React.KeyboardEvent) => void;

export type MouseEventHandler = (event: React.MouseEvent) => void;

export type TouchEventHandler = (event: React.TouchEvent) => void;

export type DragEventHandler = (event: React.DragEvent) => void;

export type FocusEventHandler = (event: React.FocusEvent) => void;

export type ChangeEventHandler = (event: React.ChangeEvent) => void;

export type SubmitEventHandler = (event: React.FormEvent) => void;

// CSS utility types
export type CSSLength = string | number;

export type CSSColor = string;

export type CSSPosition =
  | 'static'
  | 'relative'
  | 'absolute'
  | 'fixed'
  | 'sticky';

export type CSSDisplay =
  | 'block'
  | 'inline'
  | 'inline-block'
  | 'flex'
  | 'grid'
  | 'none';

export type CSSFlexDirection =
  | 'row'
  | 'row-reverse'
  | 'column'
  | 'column-reverse';

export type CSSJustifyContent =
  | 'flex-start'
  | 'flex-end'
  | 'center'
  | 'space-between'
  | 'space-around'
  | 'space-evenly';

export type CSSAlignItems =
  | 'flex-start'
  | 'flex-end'
  | 'center'
  | 'baseline'
  | 'stretch';

// Animation utility types
export type AnimationDuration = number | string;

export type AnimationEasing =
  | 'linear'
  | 'ease'
  | 'ease-in'
  | 'ease-out'
  | 'ease-in-out'
  | 'cubic-bezier(number, number, number, number)';

export type AnimationDirection =
  | 'normal'
  | 'reverse'
  | 'alternate'
  | 'alternate-reverse';

export type AnimationFillMode = 'none' | 'forwards' | 'backwards' | 'both';

// Theme utility types
export type ThemeMode = 'light' | 'dark' | 'auto';

export type ThemeColor = {
  50: string;
  100: string;
  200: string;
  300: string;
  400: string;
  500: string;
  600: string;
  700: string;
  800: string;
  900: string;
};

export type ThemeSpacing = {
  xs: string;
  sm: string;
  md: string;
  lg: string;
  xl: string;
  '2xl': string;
  '3xl': string;
  '4xl': string;
};

export type ThemeBreakpoint = {
  xs: string;
  sm: string;
  md: string;
  lg: string;
  xl: string;
  '2xl': string;
};

// Data structure utility types
export type TreeNode<T> = {
  id: string;
  data: T;
  children?: TreeNode<T>[];
  parent?: TreeNode<T>;
};

export type ListNode<T> = {
  data: T;
  next?: ListNode<T>;
  prev?: ListNode<T>;
};

export type GraphNode<T> = {
  id: string;
  data: T;
  edges: string[];
};

export type Graph<T> = {
  nodes: Record<string, GraphNode<T>>;
  edges: Record<string, { from: string; to: string; weight?: number }>;
};

// Validation utility types
export type ValidationResult = {
  isValid: boolean;
  errors: string[];
  warnings?: string[];
};

export type ValidatorFunction<T> = (value: T) => ValidationResult;

export type AsyncValidatorFunction<T> = (value: T) => Promise<ValidationResult>;

// Cache utility types
export type CacheKey = string | number | symbol;

export type CacheValue<T> = {
  data: T;
  timestamp: number;
  ttl?: number;
  hits: number;
};

export type CacheStrategy = 'lru' | 'lfu' | 'fifo' | 'ttl';

// Performance utility types
export type PerformanceMetric = {
  name: string;
  value: number;
  unit: 'ms' | 'bytes' | 'count' | 'percentage';
  timestamp: number;
};

export type PerformanceEntry = {
  name: string;
  startTime: number;
  duration: number;
  entryType: string;
};

// Testing utility types
export type MockFunction<T extends (...args: any[]) => any> = T & {
  mockImplementation: (fn: T) => MockFunction<T>;
  mockReturnValue: (value: ReturnType<T>) => MockFunction<T>;
  mockResolvedValue: (value: ReturnType<T>) => MockFunction<T>;
  mockRejectedValue: (error: any) => MockFunction<T>;
  mockClear: () => void;
  mockReset: () => void;
  mockRestore: () => void;
};

export type MockedClass<T> = T & {
  [K in keyof T]: T[K] extends (...args: any[]) => any
    ? MockFunction<T[K]>
    : T[K];
};

export type TestProps<T> = Partial<T> & {
  testId?: string;
};

export type RenderResult = {
  container: HTMLElement;
  baseElement: HTMLElement;
  debug: (element?: HTMLElement) => void;
  rerender: (ui: React.ReactElement) => void;
  unmount: () => void;
  asFragment: () => DocumentFragment;
};

// Conditional types
export type If<C extends boolean, T, F> = C extends true ? T : F;

export type IsEqual<T, U> = T extends U ? (U extends T ? true : false) : false;

export type IsNever<T> = [T] extends [never] ? true : false;

export type IsAny<T> = 0 extends 1 & T ? true : false;

export type IsUnknown<T> =
  IsAny<T> extends true ? false : unknown extends T ? true : false;

// String utility types
export type StringLiteral<T> = T extends string
  ? string extends T
    ? never
    : T
  : never;

export type Split<
  S extends string,
  D extends string,
> = S extends `${infer T}${D}${infer U}` ? [T, ...Split<U, D>] : [S];

export type Join<
  T extends readonly string[],
  D extends string,
> = T extends readonly [infer F, ...infer R]
  ? F extends string
    ? R extends readonly string[]
      ? R['length'] extends 0
        ? F
        : `${F}${D}${Join<R, D>}`
      : never
    : never
  : '';

export type Capitalize<S extends string> = S extends `${infer F}${infer R}`
  ? `${Uppercase<F>}${R}`
  : S;

export type Uncapitalize<S extends string> = S extends `${infer F}${infer R}`
  ? `${Lowercase<F>}${R}`
  : S;

// Number utility types
export type Increment<N extends number> = N extends 0
  ? 1
  : N extends 1
    ? 2
    : N extends 2
      ? 3
      : N extends 3
        ? 4
        : N extends 4
          ? 5
          : number;

export type Decrement<N extends number> = N extends 1
  ? 0
  : N extends 2
    ? 1
    : N extends 3
      ? 2
      : N extends 4
        ? 3
        : N extends 5
          ? 4
          : number;

// Array utility types
export type Head<T extends readonly any[]> = T extends readonly [
  infer H,
  ...any[],
]
  ? H
  : never;

export type Tail<T extends readonly any[]> = T extends readonly [
  any,
  ...infer R,
]
  ? R
  : [];

export type Last<T extends readonly any[]> = T extends readonly [
  ...any[],
  infer L,
]
  ? L
  : never;

export type Length<T extends readonly any[]> = T['length'];

export type Reverse<T extends readonly any[]> = T extends readonly [
  ...infer R,
  infer L,
]
  ? [L, ...Reverse<R>]
  : [];

// Object utility types
export type PickByType<T, U> = Pick<T, KeysOfType<T, U>>;

export type OmitByType<T, U> = Omit<T, KeysOfType<T, U>>;

export type PartialBy<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

export type RequiredBy<T, K extends keyof T> = Omit<T, K> &
  Required<Pick<T, K>>;

export type Flatten<T> = T extends readonly (infer U)[] ? U : T;

export type DeepFlatten<T> = T extends readonly (infer U)[]
  ? U extends readonly any[]
    ? DeepFlatten<U>
    : U
  : T;
