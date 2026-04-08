import { describe, expect, it } from 'vitest';
import { ContractError, ensures, invariant, requires } from './contracts';

describe('contracts', () => {
  describe('requires (precondition)', () => {
    it('does not throw when the condition holds', () => {
      expect(() => {
        requires(true, 'always true');
      }).not.toThrow();
    });

    it('throws ContractError with "Precondition failed" when the condition is false', () => {
      expect(() => {
        requires(false, 'x must be positive');
      }).toThrow(ContractError);
      expect(() => {
        requires(false, 'x must be positive');
      }).toThrow('Precondition failed: x must be positive');
    });

    it('treats falsy values as failure (0)', () => {
      expect(() => {
        requires(0, 'cannot be zero');
      }).toThrow('Precondition failed: cannot be zero');
    });

    it('treats falsy values as failure (empty string)', () => {
      expect(() => {
        requires('', 'must not be empty');
      }).toThrow('Precondition failed: must not be empty');
    });

    it('treats truthy non-boolean values as success', () => {
      expect(() => {
        requires('non-empty', 'should hold');
      }).not.toThrow();
      expect(() => {
        requires(1, 'should hold');
      }).not.toThrow();
      expect(() => {
        requires({}, 'should hold');
      }).not.toThrow();
    });

    it('narrows the type via the asserts predicate', () => {
      const x: number | undefined = 5;
      requires(x !== undefined, 'x is defined');
      // After requires, TypeScript knows x is number — this line would fail to compile if not.
      const y: number = x;
      expect(y).toBe(5);
    });
  });

  describe('ensures (postcondition)', () => {
    it('does not throw when the condition holds', () => {
      expect(() => {
        ensures(true, 'always true');
      }).not.toThrow();
    });

    it('throws ContractError with "Postcondition failed" when the condition is false', () => {
      expect(() => {
        ensures(false, 'result has expected length');
      }).toThrow(ContractError);
      expect(() => {
        ensures(false, 'result has expected length');
      }).toThrow('Postcondition failed: result has expected length');
    });
  });

  describe('invariant', () => {
    it('does not throw when the condition holds', () => {
      expect(() => {
        invariant(true, 'always true');
      }).not.toThrow();
    });

    it('throws ContractError with "Invariant violated" when the condition is false', () => {
      expect(() => {
        invariant(false, 'index < length');
      }).toThrow(ContractError);
      expect(() => {
        invariant(false, 'index < length');
      }).toThrow('Invariant violated: index < length');
    });
  });

  describe('ContractError', () => {
    it('has name "ContractError"', () => {
      try {
        requires(false, 'test');
        expect.fail('should have thrown');
      } catch (err) {
        expect(err).toBeInstanceOf(ContractError);
        expect((err as ContractError).name).toBe('ContractError');
      }
    });

    it('is a subclass of Error (catchable as Error)', () => {
      try {
        ensures(false, 'test');
        expect.fail('should have thrown');
      } catch (err) {
        expect(err).toBeInstanceOf(Error);
      }
    });
  });
});
