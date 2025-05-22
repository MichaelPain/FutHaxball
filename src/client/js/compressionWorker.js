// compressionWorker.js - Web Worker for message compression

import { compress, decompress } from './utils/compression.js';

self.onmessage = async (e) => {
    const { type, data, id } = e.data;
    
    try {
        let result;
        
        switch (type) {
            case 'compress':
                result = await compress(data);
                break;
                
            case 'decompress':
                result = await decompress(data);
                break;
                
            default:
                throw new Error(`Unknown compression operation: ${type}`);
        }
        
        self.postMessage({
            id,
            success: true,
            result
        });
    } catch (error) {
        self.postMessage({
            id,
            success: false,
            error: error.message
        });
    }
}; 