// compression.js - Message compression utilities

import pako from 'pako';

/**
 * Compresses data using pako (zlib) compression
 * @param {Object|string} data - Data to compress
 * @returns {Uint8Array} Compressed data
 */
export async function compress(data) {
    try {
        const jsonString = typeof data === 'string' ? data : JSON.stringify(data);
        const compressed = pako.deflate(jsonString);
        return compressed;
    } catch (error) {
        console.error('Compression error:', error);
        throw error;
    }
}

/**
 * Decompresses data using pako (zlib) decompression
 * @param {Uint8Array} data - Compressed data
 * @returns {Object} Decompressed data
 */
export async function decompress(data) {
    try {
        const decompressed = pako.inflate(data, { to: 'string' });
        return JSON.parse(decompressed);
    } catch (error) {
        console.error('Decompression error:', error);
        throw error;
    }
}

/**
 * Estimates compression ratio for given data
 * @param {Object|string} data - Data to analyze
 * @returns {number} Compression ratio (0-1)
 */
export async function estimateCompressionRatio(data) {
    try {
        const originalSize = typeof data === 'string' ? data.length : JSON.stringify(data).length;
        const compressed = await compress(data);
        return compressed.length / originalSize;
    } catch (error) {
        console.error('Compression ratio estimation error:', error);
        return 1; // Return 1 (no compression) on error
    }
}

/**
 * Determines if data should be compressed based on size and content
 * @param {Object|string} data - Data to analyze
 * @returns {boolean} Whether data should be compressed
 */
export async function shouldCompress(data) {
    const ratio = await estimateCompressionRatio(data);
 