import { describe, it, expect } from 'vitest';
import { computeThreshold, rankResults } from '../lib/similarity';

describe('computeThreshold', () => {
    it('returns zero for empty array', () => {
        const result = computeThreshold([]);
        expect(result.mean).toBe(0);
        expect(result.stddev).toBe(0);
        expect(result.cutoff).toBe(0);
    });

    it('returns stddev 0 for uniform scores', () => {
        const result = computeThreshold([0.5, 0.5, 0.5, 0.5]);
        expect(result.mean).toBeCloseTo(0.5);
        expect(result.stddev).toBeCloseTo(0);
        expect(result.cutoff).toBeCloseTo(0.5);
    });

    it('computes correct threshold for bimodal distribution', () => {
        // low cluster + high cluster
        const scores = [0.3, 0.3, 0.3, 0.3, 0.8, 0.85, 0.9];
        const result = computeThreshold(scores);
        // cutoff should separate the two clusters
        expect(result.cutoff).toBeGreaterThan(0.5);
        expect(result.cutoff).toBeLessThan(0.9);
    });

    it('single outlier produces tight threshold', () => {
        const scores = [0.3, 0.3, 0.3, 0.3, 0.3, 0.9];
        const result = computeThreshold(scores);
        expect(result.cutoff).toBeGreaterThan(0.3);
        expect(result.cutoff).toBeLessThan(0.9);
    });
});

describe('rankResults', () => {
    it('filters results above threshold', () => {
        // wider spread so both high scores clearly pass
        const scores = [
            { text: 'low1', score: 0.2 },
            { text: 'low2', score: 0.2 },
            { text: 'low3', score: 0.2 },
            { text: 'low4', score: 0.2 },
            { text: 'high1', score: 0.85 },
            { text: 'high2', score: 0.9 },
        ];
        const { results } = rankResults(scores);
        const texts = results.map((r) => r.text);
        expect(texts).toContain('high1');
        expect(texts).toContain('high2');
        expect(texts).not.toContain('low1');
    });

    it('sorts results by descending score', () => {
        const scores = [
            { text: 'a', score: 0.7 },
            { text: 'b', score: 0.9 },
            { text: 'c', score: 0.8 },
            { text: 'd', score: 0.3 },
        ];
        const { results } = rankResults(scores);
        for (let i = 1; i < results.length; i++) {
            expect(results[i].score).toBeLessThanOrEqual(results[i - 1].score);
        }
    });

    it('assigns 1-indexed ranks', () => {
        const scores = [
            { text: 'a', score: 0.9 },
            { text: 'b', score: 0.85 },
            { text: 'c', score: 0.3 },
        ];
        const { results } = rankResults(scores);
        results.forEach((r, i) => {
            expect(r.rank).toBe(i + 1);
        });
    });

    it('caps results at maxResults', () => {
        const scores = Array.from({ length: 20 }, (_, i) => ({
            text: `doc${i}`,
            score: 0.8 + i * 0.005,
        }));
        scores.push(
            ...Array.from({ length: 20 }, (_, i) => ({
                text: `low${i}`,
                score: 0.3 + i * 0.005,
            }))
        );
        const { results } = rankResults(scores, 10);
        expect(results.length).toBeLessThanOrEqual(10);
    });

    it('returns few results for perfectly uniform scores', () => {
        // all identical scores = zero stddev = cutoff equals mean = nothing strictly above
        const scores = Array.from({ length: 50 }, (_, i) => ({
            text: `doc${i}`,
            score: 0.5,
        }));
        const { results } = rankResults(scores);
        expect(results.length).toBe(0);
    });
});
