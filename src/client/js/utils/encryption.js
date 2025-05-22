// encryption.js - Message encryption utilities

import { Buffer } from 'buffer';

/**
 * Generates a random encryption key
 * @param {number} length - Key length in bytes
 * @returns {Uint8Array} Random key
 */
export function generateKey(length = 32) {
    return crypto.getRandomValues(new Uint8Array(length));
}

/**
 * Derives an encryption key from a password
 * @param {string} password - Password to derive key from
 * @param {Uint8Array} salt - Salt for key derivation
 * @returns {Promise<CryptoKey>} Derived key
 */
export async function deriveKey(password, salt) {
    const encoder = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
        'raw',
        encoder.encode(password),
        'PBKDF2',
        false,
        ['deriveBits', 'deriveKey']
    );

    return crypto.subtle.deriveKey(
        {
            name: 'PBKDF2',
            salt,
            iterations: 100000,
            hash: 'SHA-256'
        },
        keyMaterial,
        { name: 'AES-GCM', length: 256 },
        false,
        ['encrypt', 'decrypt']
    );
}

/**
 * Encrypts data using AES-GCM
 * @param {Object|string} data - Data to encrypt
 * @param {CryptoKey} key - Encryption key
 * @returns {Promise<Object>} Encrypted data with IV
 */
export async function encrypt(data, key) {
    try {
        const iv = crypto.getRandomValues(new Uint8Array(12));
        const encoder = new TextEncoder();
        const dataString = typeof data === 'string' ? data : JSON.stringify(data);
        const dataBuffer = encoder.encode(dataString);

        const encryptedBuffer = await crypto.subtle.encrypt(
            {
                name: 'AES-GCM',
                iv
            },
            key,
            dataBuffer
        );

        return {
            data: new Uint8Array(encryptedBuffer),
            iv
        };
    } catch (error) {
        console.error('Encryption error:', error);
        throw error;
    }
}

/**
 * Decrypts data using AES-GCM
 * @param {Object} encryptedData - Encrypted data with IV
 * @param {CryptoKey} key - Decryption key
 * @returns {Promise<Object>} Decrypted data
 */
export async function decrypt(encryptedData, key) {
    try {
        const { data, iv } = encryptedData;
        
        const decryptedBuffer = await crypto.subtle.decrypt(
            {
                name: 'AES-GCM',
                iv
            },
            key,
            data
        );

        const decoder = new TextDecoder();
        const decryptedString = decoder.decode(decryptedBuffer);
        
        try {
            return JSON.parse(decryptedString);
        } catch {
            return decryptedString;
        }
    } catch (error) {
        console.error('Decryption error:', error);
        throw error;
    }
}

/**
 * Generates a key pair for asymmetric encryption
 * @returns {Promise<CryptoKeyPair>} Key pair
 */
export async function generateKeyPair() {
    return crypto.subtle.generateKey(
        {
            name: 'RSA-OAEP',
            modulusLength: 2048,
            publicExponent: new Uint8Array([1, 0, 1]),
            hash: 'SHA-256'
        },
        true,
        ['encrypt', 'decrypt']
    );
}

/**
 * Exports a public key to a format suitable for transmission
 * @param {CryptoKey} publicKey - Public key to export
 * @returns {Promise<string>} Exported key
 */
export async function exportPublicKey(publicKey) {
    const exported = await crypto.subtle.exportKey('spki', publicKey);
    return Buffer.from(exported).toString('base64');
}

/**
 * Imports a public key from a transmitted format
 * @param {string} keyString - Exported key string
 * @returns {Promise<CryptoKey>} Imported key
 */
export async function importPublicKey(keyString) {
    const keyData = Buffer.from(keyString, 'base64');
    return crypto.subtle.importKey(
        'spki',
        keyData,
        {
            name: 'RSA-OAEP',
            hash: 'SHA-256'
        },
        true,
        ['encrypt']
    );
} 