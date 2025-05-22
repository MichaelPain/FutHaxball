const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');
const zlib = require('zlib');
const { promisify } = require('util');
const exec = promisify(require('child_process').exec);
const mongoose = require('mongoose');
const config = require('../config');

class BackupService {
  constructor(options = {}) {
    this.backupDir = options.backupDir || path.join(__dirname, '../../backups');
    this.maxBackups = options.maxBackups || 30; // Keep 30 days of backups
    this.encryptionKey = options.encryptionKey || process.env.BACKUP_ENCRYPTION_KEY;
    this.compressionLevel = options.compressionLevel || 9;
    this.verifyBackups = options.verifyBackups !== false;
    
    // Ensure backup directory exists
    this.ensureBackupDir();
  }

  async ensureBackupDir() {
    try {
      await fs.mkdir(this.backupDir, { recursive: true });
    } catch (error) {
      console.error('Failed to create backup directory:', error);
      throw error;
    }
  }

  async createBackup() {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupName = `backup-${timestamp}`;
    const backupPath = path.join(this.backupDir, backupName);
    
    try {
      // Create temporary directory for backup
      const tempDir = path.join(this.backupDir, 'temp');
      await fs.mkdir(tempDir, { recursive: true });

      // Export MongoDB data
      await this.exportMongoDB(tempDir);

      // Compress the backup
      const compressedPath = await this.compressBackup(tempDir, backupPath);

      // Encrypt the backup
      const encryptedPath = await this.encryptBackup(compressedPath);

      // Verify the backup if enabled
      if (this.verifyBackups) {
        await this.verifyBackup(encryptedPath);
      }

      // Clean up temporary files
      await this.cleanupTempFiles(tempDir, compressedPath);

      // Update backup metadata
      await this.updateBackupMetadata(encryptedPath, {
        timestamp: new Date(),
        size: (await fs.stat(encryptedPath)).size,
        verified: this.verifyBackups
      });

      return encryptedPath;
    } catch (error) {
      console.error('Backup creation failed:', error);
      throw error;
    }
  }

  async exportMongoDB(tempDir) {
    const dbName = mongoose.connection.db.databaseName;
    const dumpPath = path.join(tempDir, 'dump');
    
    try {
      // Use mongodump to export the database
      await exec(`mongodump --db ${dbName} --out ${dumpPath}`);
    } catch (error) {
      console.error('MongoDB export failed:', error);
      throw error;
    }
  }

  async compressBackup(sourcePath, targetPath) {
    return new Promise((resolve, reject) => {
      const gzip = zlib.createGzip({ level: this.compressionLevel });
      const input = fs.createReadStream(sourcePath);
      const output = fs.createWriteStream(targetPath + '.gz');

      input.pipe(gzip).pipe(output);

      output.on('finish', () => resolve(targetPath + '.gz'));
      output.on('error', reject);
    });
  }

  async encryptBackup(sourcePath) {
    const targetPath = sourcePath + '.enc';
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-gcm', this.encryptionKey, iv);

    return new Promise((resolve, reject) => {
      const input = fs.createReadStream(sourcePath);
      const output = fs.createWriteStream(targetPath);

      // Write IV at the start of the file
      output.write(iv);

      input.pipe(cipher).pipe(output);

      output.on('finish', () => resolve(targetPath));
      output.on('error', reject);
    });
  }

  async verifyBackup(backupPath) {
    try {
      // Decrypt and decompress a small portion of the backup
      const iv = await fs.readFile(backupPath, { start: 0, end: 16 });
      const decipher = crypto.createDecipheriv('aes-256-gcm', this.encryptionKey, iv);
      
      const input = fs.createReadStream(backupPath, { start: 16, end: 1024 });
      const gunzip = zlib.createGunzip();
      
      return new Promise((resolve, reject) => {
        input.pipe(decipher).pipe(gunzip);
        
        gunzip.on('data', () => {
          // If we can read data, the backup is valid
          resolve(true);
        });
        
        gunzip.on('error', reject);
      });
    } catch (error) {
      console.error('Backup verification failed:', error);
      throw error;
    }
  }

  async restoreBackup(backupPath) {
    try {
      // Create temporary directory for restoration
      const tempDir = path.join(this.backupDir, 'temp-restore');
      await fs.mkdir(tempDir, { recursive: true });

      // Decrypt the backup
      const decryptedPath = await this.decryptBackup(backupPath, tempDir);

      // Decompress the backup
      const decompressedPath = await this.decompressBackup(decryptedPath, tempDir);

      // Import the data into MongoDB
      await this.importMongoDB(decompressedPath);

      // Clean up temporary files
      await this.cleanupTempFiles(tempDir);

      return true;
    } catch (error) {
      console.error('Backup restoration failed:', error);
      throw error;
    }
  }

  async decryptBackup(sourcePath, targetDir) {
    const targetPath = path.join(targetDir, 'decrypted.gz');
    const iv = await fs.readFile(sourcePath, { start: 0, end: 16 });
    const decipher = crypto.createDecipheriv('aes-256-gcm', this.encryptionKey, iv);

    return new Promise((resolve, reject) => {
      const input = fs.createReadStream(sourcePath, { start: 16 });
      const output = fs.createWriteStream(targetPath);

      input.pipe(decipher).pipe(output);

      output.on('finish', () => resolve(targetPath));
      output.on('error', reject);
    });
  }

  async decompressBackup(sourcePath, targetDir) {
    const targetPath = path.join(targetDir, 'decompressed');
    await fs.mkdir(targetPath, { recursive: true });

    return new Promise((resolve, reject) => {
      const gunzip = zlib.createGunzip();
      const input = fs.createReadStream(sourcePath);
      const output = fs.createWriteStream(targetPath);

      input.pipe(gunzip).pipe(output);

      output.on('finish', () => resolve(targetPath));
      output.on('error', reject);
    });
  }

  async importMongoDB(sourcePath) {
    const dbName = mongoose.connection.db.databaseName;
    
    try {
      // Use mongorestore to import the database
      await exec(`mongorestore --db ${dbName} ${sourcePath}`);
    } catch (error) {
      console.error('MongoDB import failed:', error);
      throw error;
    }
  }

  async listBackups() {
    try {
      const files = await fs.readdir(this.backupDir);
      const backups = await Promise.all(
        files
          .filter(file => file.endsWith('.enc'))
          .map(async file => {
            const filePath = path.join(this.backupDir, file);
            const stats = await fs.stat(filePath);
            const metadata = await this.getBackupMetadata(filePath);
            
            return {
              name: file,
              path: filePath,
              size: stats.size,
              created: stats.birthtime,
              ...metadata
            };
          })
      );

      return backups.sort((a, b) => b.created - a.created);
    } catch (error) {
      console.error('Failed to list backups:', error);
      throw error;
    }
  }

  async deleteBackup(backupPath) {
    try {
      await fs.unlink(backupPath);
      await this.deleteBackupMetadata(backupPath);
    } catch (error) {
      console.error('Failed to delete backup:', error);
      throw error;
    }
  }

  async cleanupOldBackups() {
    try {
      const backups = await this.listBackups();
      if (backups.length > this.maxBackups) {
        const toDelete = backups.slice(this.maxBackups);
        await Promise.all(
          toDelete.map(backup => this.deleteBackup(backup.path))
        );
      }
    } catch (error) {
      console.error('Failed to cleanup old backups:', error);
      throw error;
    }
  }

  async updateBackupMetadata(backupPath, metadata) {
    const metadataPath = backupPath + '.meta';
    try {
      await fs.writeFile(metadataPath, JSON.stringify(metadata, null, 2));
    } catch (error) {
      console.error('Failed to update backup metadata:', error);
      throw error;
    }
  }

  async getBackupMetadata(backupPath) {
    const metadataPath = backupPath + '.meta';
    try {
      const data = await fs.readFile(metadataPath, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      return {};
    }
  }

  async deleteBackupMetadata(backupPath) {
    const metadataPath = backupPath + '.meta';
    try {
      await fs.unlink(metadataPath);
    } catch (error) {
      // Ignore error if metadata file doesn't exist
    }
  }

  async cleanupTempFiles(...paths) {
    try {
      await Promise.all(
        paths.map(async path => {
          try {
            await fs.rm(path, { recursive: true, force: true });
          } catch (error) {
            // Ignore errors for individual files
          }
        })
      );
    } catch (error) {
      console.error('Failed to cleanup temporary files:', error);
    }
  }
}

module.exports = new BackupService(); 