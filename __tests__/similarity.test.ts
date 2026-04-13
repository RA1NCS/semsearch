import { describe, it, expect } from 'vitest';
import { cosineSimilarity } from '../lib/similarity';

describe('cosineSimilarity', () => {
    it('returns 1 for identical vectors', () => {
        expect(cosineSimilarity([1, 0, 0], [1, 0, 0])).toBeCloseTo(1.0);
    });

    it('returns 0 for orthogonal vectors', () => {
        expect(cosineSimilarity([1, 0, 0], [0, 1, 0])).toBeCloseTo(0.0);
    });

    it('returns -1 for opposite vectors', () => {
        expect(cosineSimilarity([1, 0, 0], [-1, 0, 0])).toBeCloseTo(-1.0);
    });

    it('returns 1 for proportional vectors (same direction)', () => {
        expect(cosineSimilarity([1, 2, 3], [2, 4, 6])).toBeCloseTo(1.0);
    });

    it('returns 0 when one vector is zero', () => {
        expect(cosineSimilarity([0, 0, 0], [1, 2, 3])).toBe(0);
    });

    it('handles high-dimensional vectors', () => {
        const a = Array.from({ length: 3072 }, (_, i) => Math.sin(i));
        const b = Array.from({ length: 3072 }, (_, i) => Math.sin(i));
        expect(cosineSimilarity(a, b)).toBeCloseTo(1.0);
    });

    it('returns value between -1 and 1 for arbitrary vectors', () => {
        const a = [0.5, -0.3, 0.8, 0.1];
        const b = [0.2, 0.7, -0.1, 0.4];
        const result = cosineSimilarity(a, b);
        expect(result).toBeGreaterThanOrEqual(-1);
        expect(result).toBeLessThanOrEqual(1);
    });
});
