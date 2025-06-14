#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  McpError,
  ErrorCode,
} from '@modelcontextprotocol/sdk/types.js';
import axios, { AxiosInstance } from 'axios';
import { wrapper } from 'axios-cookiejar-support';
import { CookieJar } from 'tough-cookie';
import FormData from 'form-data';
import fs from 'fs';
import path from 'path';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

interface ServerConfig {
  apiUrl: string;
  authToken?: string;
  email?: string;
  password?: string;
  supabaseUrl?: string;
  supabaseAnonKey?: string;
}

class StillMotionMCPServer {
  private server: Server;
  private apiClient: AxiosInstance;
  private config: ServerConfig;
  private authToken: string | null = null;
  private supabase: SupabaseClient | null = null;
  private supabaseSession: any = null;

  constructor() {
    this.server = new Server(
      {
        name: 'stillmotion-mcp',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    // Load configuration from environment variables
    this.config = {
      apiUrl: process.env.STILLMOTION_API_URL || 'http://localhost:3000',
      authToken: process.env.STILLMOTION_AUTH_TOKEN,
      email: process.env.STILLMOTION_EMAIL,
      password: process.env.STILLMOTION_PASSWORD,
      supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://afzjzoefogvzdnqmnidz.supabase.co',
      supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFmemp6b2Vmb2d2emRucW1uaWR6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQ1NTQwMjYsImV4cCI6MjA2MDEzMDAyNn0.1Kx2xysfuPAHS6gd19VsaFBtowkr-itDl48oUQLyvNM',
    };

    // Initialize Supabase client
    if (this.config.supabaseUrl && this.config.supabaseAnonKey) {
      this.supabase = createClient(this.config.supabaseUrl, this.config.supabaseAnonKey);
    }

    // Create cookie jar
    const jar = new CookieJar();
    
    // Initialize axios client with cookie support
    this.apiClient = axios.create({
      baseURL: this.config.apiUrl,
      headers: {
        'Content-Type': 'application/json',
      },
      withCredentials: true,
    });
    
    // Apply cookie jar wrapper
    wrapper(this.apiClient);
    
    // Attach jar to client for cookie support
    (this.apiClient as any).defaults.jar = jar;

    // Add auth interceptor
    this.apiClient.interceptors.request.use((config) => {
      if (this.authToken) {
        config.headers.Authorization = `Bearer ${this.authToken}`;
      }
      return config;
    });

    this.setupHandlers();
    this.error = this.error.bind(this);
  }

  private error(code: ErrorCode, message: string): never {
    throw new McpError(code, message);
  }

  private async authenticate(): Promise<void> {
    if (this.authToken) {
      // Already authenticated
      return;
    }

    if (this.config.authToken) {
      this.authToken = this.config.authToken;
      return;
    }

    if (!this.config.email || !this.config.password) {
      this.error(
        ErrorCode.InvalidParams,
        'Either STILLMOTION_AUTH_TOKEN or both STILLMOTION_EMAIL and STILLMOTION_PASSWORD must be set'
      );
    }

    try {
      // Use the login API endpoint
      const response = await this.apiClient.post('/api/login', {
        email: this.config.email!,
        password: this.config.password!,
      });

      if (response.data.token) {
        this.authToken = response.data.token;
        // Cookie jar will automatically store the cookies
      } else {
        this.error(ErrorCode.InternalError, 'Failed to obtain auth token');
      }
    } catch (error) {
      if (axios.isAxiosError(error) && error.response) {
        const errorMessage = error.response.data?.error || error.response.statusText;
        this.error(ErrorCode.InternalError, `Authentication failed: ${errorMessage}`);
      }
      this.error(
        ErrorCode.InternalError,
        `Authentication failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  private setupHandlers(): void {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: 'authenticate',
          description: 'Authenticate with StillMotion.ai using email and password',
          inputSchema: {
            type: 'object',
            properties: {
              email: {
                type: 'string',
                description: 'User email address',
              },
              password: {
                type: 'string',
                description: 'User password',
              },
            },
            required: ['email', 'password'],
          },
        },
        {
          name: 'generate_gif',
          description: 'Generate a GIF from an image with animation prompt',
          inputSchema: {
            type: 'object',
            properties: {
              imageUrl: {
                type: 'string',
                description: 'URL of the image to animate (or local file path)',
              },
              prompt: {
                type: 'string',
                description: 'Animation prompt describing how the image should move',
              },
              generationType: {
                type: 'string',
                enum: ['standard', 'premium'],
                description: 'Generation quality type (default: standard)',
              },
              enhancePrompt: {
                type: 'boolean',
                description: 'Whether to auto-enhance the prompt (default: true)',
              },
              numberOfGenerations: {
                type: 'number',
                description: 'Number of GIFs to generate (1-10, default: 1)',
                minimum: 1,
                maximum: 10,
              },
              sampleSteps: {
                type: 'number',
                description: 'Sample steps for premium generation (1-40, default: 30)',
                minimum: 1,
                maximum: 40,
              },
              sampleGuideScale: {
                type: 'number',
                description: 'Guide scale for premium generation (0-10, default: 5)',
                minimum: 0,
                maximum: 10,
              },
            },
            required: ['imageUrl', 'prompt'],
          },
        },
        {
          name: 'check_generation_status',
          description: 'Check the status of a GIF generation',
          inputSchema: {
            type: 'object',
            properties: {
              videoId: {
                type: 'string',
                description: 'The video ID returned from generate_gif',
              },
            },
            required: ['videoId'],
          },
        },
        {
          name: 'get_user_info',
          description: 'Get current user information including credit balance',
          inputSchema: {
            type: 'object',
            properties: {},
          },
        },
        {
          name: 'get_gallery',
          description: 'Get user\'s generated GIFs',
          inputSchema: {
            type: 'object',
            properties: {
              limit: {
                type: 'number',
                description: 'Number of items to return (default: 10)',
                minimum: 1,
                maximum: 100,
              },
              offset: {
                type: 'number',
                description: 'Offset for pagination (default: 0)',
                minimum: 0,
              },
            },
          },
        },
        {
          name: 'upload_image',
          description: 'Upload a local image file and get its URL',
          inputSchema: {
            type: 'object',
            properties: {
              filePath: {
                type: 'string',
                description: 'Path to the local image file',
              },
            },
            required: ['filePath'],
          },
        },
      ],
    }));

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case 'authenticate':
            return await this.handleAuthenticate(args);
          case 'generate_gif':
            return await this.handleGenerateGif(args);
          case 'check_generation_status':
            return await this.handleCheckStatus(args);
          case 'get_user_info':
            return await this.handleGetUserInfo();
          case 'get_gallery':
            return await this.handleGetGallery(args);
          case 'upload_image':
            return await this.handleUploadImage(args);
          default:
            this.error(ErrorCode.MethodNotFound, `Unknown tool: ${name}`);
        }
      } catch (error) {
        if (error instanceof McpError) {
          throw error;
        }
        
        const message = error instanceof Error ? error.message : 'Unknown error';
        this.error(ErrorCode.InternalError, `Tool execution failed: ${message}`);
      }
    });
  }

  private async handleAuthenticate(args: any) {
    const { email, password } = args;
    
    try {
      // Use the login API endpoint
      const response = await this.apiClient.post('/api/login', {
        email,
        password,
      });

      if (response.data.token) {
        this.authToken = response.data.token;
        this.config.email = email;
        this.config.password = password;
        // Cookie jar will automatically store the cookies
        
        return {
          content: [
            {
              type: 'text',
              text: 'Authentication successful',
            },
          ],
        };
      } else {
        this.error(ErrorCode.InvalidRequest, 'Authentication failed: No token received');
      }
    } catch (error) {
      if (axios.isAxiosError(error) && error.response) {
        const errorMessage = error.response.data?.error || error.response.statusText;
        this.error(ErrorCode.InvalidRequest, `Authentication failed: ${errorMessage}`);
      }
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.error(ErrorCode.InvalidRequest, `Authentication failed: ${message}`);
    }
  }

  private async handleGenerateGif(args: any) {
    await this.ensureAuthenticated();
    
    const {
      imageUrl,
      prompt,
      generationType = 'standard',
      enhancePrompt = true,
      numberOfGenerations = 1,
      sampleSteps = 30,
      sampleGuideScale = 5,
    } = args;

    let finalImageUrl = imageUrl;

    // If imageUrl is a local file path, upload it first
    if (!imageUrl.startsWith('http://') && !imageUrl.startsWith('https://')) {
      const uploadResult = await this.handleUploadImage({ filePath: imageUrl });
      const textContent = uploadResult.content.find((c: any) => c.type === 'text');
      if (textContent) {
        const match = textContent.text.match(/URL: (https?:\/\/[^\s]+)/);
        if (match) {
          finalImageUrl = match[1];
        } else {
          this.error(ErrorCode.InternalError, 'Failed to extract URL from upload result');
        }
      }
    }

    try {
      const requests = [];
      for (let i = 0; i < numberOfGenerations; i++) {
        const payload: any = {
          imageUrl: finalImageUrl,
          prompt,
          generationType,
          enhancePrompt,
        };

        if (generationType === 'premium') {
          payload.sampleSteps = sampleSteps;
          payload.sampleGuideScale = sampleGuideScale;
        }

        requests.push(this.apiClient.post('/api/generate-video', payload));
      }

      const responses = await Promise.all(requests);
      const videoIds = responses.map((r) => r.data.videoId);

      return {
        content: [
          {
            type: 'text',
            text: `Successfully initiated ${numberOfGenerations} GIF generation${
              numberOfGenerations > 1 ? 's' : ''
            }.\n\nVideo ID${numberOfGenerations > 1 ? 's' : ''}: ${videoIds.join(', ')}\n\nUse check_generation_status to monitor progress.`,
          },
        ],
      };
    } catch (error) {
      if (axios.isAxiosError(error) && error.response) {
        if (error.response.status === 402) {
          this.error(ErrorCode.InvalidRequest, 'Insufficient credits');
        }
        this.error(
          ErrorCode.InvalidRequest,
          `Generation failed: ${error.response.data || error.response.statusText}`
        );
      }
      throw error;
    }
  }

  private async handleCheckStatus(args: any) {
    await this.ensureAuthenticated();
    
    const { videoId } = args;

    try {
      const response = await this.apiClient.get('/api/check-status', {
        params: { videoId },
      });

      const video = response.data;
      let statusText = `Status: ${video.status}\n`;
      
      if (video.status === 'completed') {
        statusText += `GIF URL: ${video.gifUrl}\n`;
        if (video.videoUrl) {
          statusText += `Video URL: ${video.videoUrl}\n`;
        }
      } else if (video.status === 'failed') {
        statusText += `Error: ${video.error || 'Generation failed'}\n`;
      }

      statusText += `\nPrompt: ${video.prompt}\n`;
      statusText += `Type: ${video.type}\n`;
      statusText += `Created: ${new Date(video.createdAt).toLocaleString()}`;

      return {
        content: [
          {
            type: 'text',
            text: statusText,
          },
        ],
      };
    } catch (error) {
      if (axios.isAxiosError(error) && error.response) {
        this.error(
          ErrorCode.InvalidRequest,
          `Status check failed: ${error.response.data || error.response.statusText}`
        );
      }
      throw error;
    }
  }

  private async handleGetUserInfo() {
    await this.ensureAuthenticated();

    try {
      const response = await this.apiClient.get('/api/user');
      const user = response.data;

      return {
        content: [
          {
            type: 'text',
            text: `User: ${user.email}\nCredits: ${user.credits}\nAdmin: ${user.isAdmin ? 'Yes' : 'No'}`,
          },
        ],
      };
    } catch (error) {
      if (axios.isAxiosError(error) && error.response) {
        this.error(
          ErrorCode.InvalidRequest,
          `Failed to get user info: ${error.response.data || error.response.statusText}`
        );
      }
      throw error;
    }
  }

  private async handleGetGallery(args: any) {
    await this.ensureAuthenticated();
    
    const { limit = 10, offset = 0 } = args;

    try {
      const response = await this.apiClient.get('/api/videos', {
        params: { limit, offset },
      });

      let videos = response.data;
      
      // Since the API doesn't support pagination, we'll slice the results
      videos = videos.slice(offset, offset + limit);
      
      if (videos.length === 0) {
        return {
          content: [
            {
              type: 'text',
              text: 'No generated GIFs found.',
            },
          ],
        };
      }

      const galleryText = videos
        .map((video: any, index: number) => {
          const num = offset + index + 1;
          let text = `${num}. ${video.prompt}\n`;
          text += `   Status: ${video.status}\n`;
          text += `   Type: ${video.type}\n`;
          text += `   Created: ${new Date(video.createdAt).toLocaleString()}\n`;
          if (video.gifUrl) {
            text += `   GIF: ${video.gifUrl}\n`;
          }
          text += `   ID: ${video.id}`;
          return text;
        })
        .join('\n\n');

      return {
        content: [
          {
            type: 'text',
            text: `Gallery (showing ${videos.length} items starting from ${offset}):\n\n${galleryText}`,
          },
        ],
      };
    } catch (error) {
      if (axios.isAxiosError(error) && error.response) {
        this.error(
          ErrorCode.InvalidRequest,
          `Failed to get gallery: ${error.response.data || error.response.statusText}`
        );
      }
      throw error;
    }
  }

  private async handleUploadImage(args: any) {
    await this.ensureAuthenticated();
    
    const { filePath } = args;

    // Check if file exists
    if (!fs.existsSync(filePath)) {
      this.error(ErrorCode.InvalidParams, `File not found: ${filePath}`);
    }

    const stats = fs.statSync(filePath);
    if (stats.size > 5 * 1024 * 1024) {
      this.error(ErrorCode.InvalidParams, 'File size exceeds 5MB limit');
    }

    const ext = path.extname(filePath).toLowerCase();
    if (!['.jpg', '.jpeg', '.png'].includes(ext)) {
      this.error(ErrorCode.InvalidParams, 'Only JPG and PNG files are supported');
    }

    try {
      const form = new FormData();
      form.append('file', fs.createReadStream(filePath));

      const response = await this.apiClient.post('/api/upload', form, {
        headers: {
          ...form.getHeaders(),
        },
        maxContentLength: Infinity,
        maxBodyLength: Infinity,
      });

      return {
        content: [
          {
            type: 'text',
            text: `Image uploaded successfully!\nURL: ${response.data.url}`,
          },
        ],
      };
    } catch (error) {
      if (axios.isAxiosError(error) && error.response) {
        this.error(
          ErrorCode.InvalidRequest,
          `Upload failed: ${error.response.data || error.response.statusText}`
        );
      }
      throw error;
    }
  }

  private async ensureAuthenticated(): Promise<void> {
    if (!this.authToken) {
      await this.authenticate();
    }
  }

  async run(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('StillMotion MCP server running');
  }
}

const server = new StillMotionMCPServer();
server.run().catch(console.error);