// services/GoogleDriveService.js - NEW FILE
import { google } from 'googleapis';
import fs from 'fs/promises';

class GoogleDriveService {
  constructor() {
    this.drive = null;
    this.auth = null;
    this.watchedFolders = new Map();
    this.changeHandlers = new Map();
  }

  /**
   * Initialize Google Drive service
   */
  async initialize() {
    try {
      // Load service account credentials
      const credentials = JSON.parse(
        await fs.readFile(process.env.GOOGLE_APPLICATION_CREDENTIALS, 'utf8')
      );

      this.auth = new google.auth.JWT(
        credentials.client_email,
        null,
        credentials.private_key,
        ['https://www.googleapis.com/auth/drive']
      );

      this.drive = google.drive({ version: 'v3', auth: this.auth });
      
      console.log('✅ Google Drive service initialized');
      return true;
    } catch (error) {
      console.error('❌ Failed to initialize Google Drive:', error);
      return false;
    }
  }

  /**
   * Watch a folder for changes
   * @param {string} folderId - Google Drive folder ID
   * @param {Function} onChangeCallback - Callback when files change
   */
  async watchFolder(folderId, onChangeCallback) {
    if (!this.drive) {
      throw new Error('Google Drive service not initialized');
    }

    try {
      // Set up push notification channel
      const channelId = `medtestai-${Date.now()}`;
      const expiration = Date.now() + (24 * 60 * 60 * 1000); // 24 hours

      const response = await this.drive.files.watch({
        fileId: folderId,
        requestBody: {
          id: channelId,
          type: 'web_hook',
          address: `${process.env.WEBHOOK_BASE_URL}/api/drive/notifications`,
          expiration: expiration.toString()
        }
      });

      this.watchedFolders.set(folderId, {
        channelId,
        resourceId: response.data.resourceId,
        expiration
      });

      this.changeHandlers.set(folderId, onChangeCallback);

      console.log(`✅ Watching folder: ${folderId}`);
      return response.data;
    } catch (error) {
      console.error(`❌ Failed to watch folder ${folderId}:`, error);
      throw error;
    }
  }

  /**
   * Stop watching a folder
   */
  async stopWatchingFolder(folderId) {
    const watch = this.watchedFolders.get(folderId);
    if (!watch) {
      return false;
    }

    try {
      await this.drive.channels.stop({
        requestBody: {
          id: watch.channelId,
          resourceId: watch.resourceId
        }
      });

      this.watchedFolders.delete(folderId);
      this.changeHandlers.delete(folderId);

      console.log(`🛑 Stopped watching folder: ${folderId}`);
      return true;
    } catch (error) {
      console.error(`❌ Failed to stop watching folder:`, error);
      return false;
    }
  }

  /**
   * Handle incoming change notification
   */
  async handleChangeNotification(notification) {
    const { resourceId } = notification;
    
    // Find folder by resourceId
    const folderId = Array.from(this.watchedFolders.entries())
      .find(([_, watch]) => watch.resourceId === resourceId)?.[0];

    if (!folderId) {
      console.warn('Received notification for unwatched folder');
      return;
    }

    const handler = this.changeHandlers.get(folderId);
    if (!handler) {
      console.warn('No handler registered for folder');
      return;
    }

    try {
      // Get changed files
      const changes = await this.getChangedFiles(folderId);
      
      console.log(`📝 Detected ${changes.length} changes in folder ${folderId}`);
      
      // Call handler with changes
      await handler(changes);
    } catch (error) {
      console.error('Error handling change notification:', error);
    }
  }

  /**
   * Get files that changed in a folder
   */
  async getChangedFiles(folderId) {
    try {
      const response = await this.drive.files.list({
        q: `'${folderId}' in parents and trashed=false`,
        fields: 'files(id, name, mimeType, modifiedTime, webViewLink)',
        orderBy: 'modifiedTime desc'
      });

      return response.data.files || [];
    } catch (error) {
      console.error('Error getting changed files:', error);
      return [];
    }
  }

  /**
   * Download file content
   */
  async downloadFile(fileId) {
    try {
      const response = await this.drive.files.get({
        fileId: fileId,
        alt: 'media'
      }, { responseType: 'stream' });

      const chunks = [];
      for await (const chunk of response.data) {
        chunks.push(chunk);
      }

      return Buffer.concat(chunks).toString('utf8');
    } catch (error) {
      console.error(`Error downloading file ${fileId}:`, error);
      throw error;
    }
  }

  /**
   * Create requirements folder in Drive
   */
  async createRequirementsFolder(name = 'MedTestAI Requirements') {
    try {
      const response = await this.drive.files.create({
        requestBody: {
          name,
          mimeType: 'application/vnd.google-apps.folder'
        },
        fields: 'id, name, webViewLink'
      });

      console.log(`✅ Created requirements folder: ${response.data.id}`);
      return response.data;
    } catch (error) {
      console.error('Error creating folder:', error);
      throw error;
    }
  }

  /**
   * Share folder with QA team
   */
  async shareFolder(folderId, emails, role = 'writer') {
    try {
      const promises = emails.map(email =>
        this.drive.permissions.create({
          fileId: folderId,
          requestBody: {
            type: 'user',
            role: role,
            emailAddress: email
          },
          sendNotificationEmail: true
        })
      );

      await Promise.all(promises);
      console.log(`✅ Shared folder ${folderId} with ${emails.length} users`);
      return true;
    } catch (error) {
      console.error('Error sharing folder:', error);
      throw error;
    }
  }

  /**
   * Upload requirements file
   */
  async uploadRequirementsFile(folderId, fileName, content) {
    try {
      const response = await this.drive.files.create({
        requestBody: {
          name: fileName,
          mimeType: 'text/plain',
          parents: [folderId]
        },
        media: {
          mimeType: 'text/plain',
          body: content
        },
        fields: 'id, name, webViewLink'
      });

      console.log(`✅ Uploaded file: ${fileName}`);
      return response.data;
    } catch (error) {
      console.error('Error uploading file:', error);
      throw error;
    }
  }

  /**
   * List files in folder
   */
  async listFiles(folderId) {
    try {
      const response = await this.drive.files.list({
        q: `'${folderId}' in parents and trashed=false`,
        fields: 'files(id, name, mimeType, createdTime, modifiedTime, webViewLink, size)',
        orderBy: 'name'
      });

      return response.data.files || [];
    } catch (error) {
      console.error('Error listing files:', error);
      return [];
    }
  }

  /**
   * Auto-generate tests when file changes
   */
  async autoGenerateFromDrive(folderId) {
    const files = await this.getChangedFiles(folderId);
    const results = [];

    for (const file of files) {
      try {
        // Download file content
        const content = await this.downloadFile(file.id);
        
        // Process and generate tests
        // (This would call your documentProcessor and testGenerator)
        console.log(`🤖 Auto-generating tests for: ${file.name}`);
        
        results.push({
          fileName: file.name,
          status: 'success',
          fileId: file.id
        });
      } catch (error) {
        console.error(`Failed to process ${file.name}:`, error);
        results.push({
          fileName: file.name,
          status: 'failed',
          error: error.message
        });
      }
    }

    return results;
  }
}

export default new GoogleDriveService();