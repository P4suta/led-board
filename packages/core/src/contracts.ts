// Zero-dependency design-by-contract helpers using TypeScript `asserts` predicates.
// Contracts are *specifications*, not defensive code: they document the agreement
// between caller and callee. Internal redundant guards are still forbidden.

export type ContractKind = 'Precondition' | 'Postcondition' | 'Invariant';

const VERB: Record<ContractKind, string> = {
  Precondition: 'failed',
  Postcondition: 'failed',
  Invariant: 'violated',
};

export class ContractError extends Error {
  readonly kind: ContractKind;

  constructor(kind: ContractKind, message: string) {
    super(`${kind} ${VERB[kind]}: ${message}`);
    this.name = 'ContractError';
    this.kind = kind;
  }
}

export function requires(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new ContractError('Precondition', message);
  }
}

export function ensures(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new ContractError('Postcondition', message);
  }
}

export function invariant(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new ContractError('Invariant', message);
  }
}
