# StillMotion MCP Server

An MCP (Model Context Protocol) server that allows Claude to interact with the StillMotion.ai API to generate animated GIFs from static images.

## Features

- **Authentication**: Login with email/password or use an auth token
- **Generate GIFs**: Create animated GIFs from images with AI-powered animations
- **Check Status**: Monitor the progress of GIF generation
- **User Management**: Get user info and credit balance
- **Gallery Access**: Browse previously generated GIFs
- **Image Upload**: Upload local images to use for generation

## Installation

1. Navigate to the MCP server directory:
```bash
cd mcp-server
npm install
npm run build
```

## Configuration

The server can be configured using environment variables:

- `STILLMOTION_API_URL`: API base URL (default: `http://localhost:3000`)
- `STILLMOTION_AUTH_TOKEN`: Pre-authenticated token (optional)
- `STILLMOTION_EMAIL`: User email for authentication
- `STILLMOTION_PASSWORD`: User password for authentication

You must provide either:
- `STILLMOTION_AUTH_TOKEN` for token-based auth, OR
- Both `STILLMOTION_EMAIL` and `STILLMOTION_PASSWORD` for credential-based auth

## Usage with Claude Desktop

Add the following to your Claude Desktop configuration file:

### macOS
Location: `~/Library/Application Support/Claude/claude_desktop_config.json`

### Windows
Location: `%APPDATA%\Claude\claude_desktop_config.json`

### Configuration Example

```json
{
  "mcpServers": {
    "stillmotion": {
      "command": "node",
      "args": ["/path/to/i2v/mcp-server/dist/index.js"],
      "env": {
        "STILLMOTION_API_URL": "https://www.stillmotion.ai",
        "STILLMOTION_EMAIL": "your-email@example.com",
        "STILLMOTION_PASSWORD": "your-password"
      }
    }
  }
}
```

Or with token authentication:

```json
{
  "mcpServers": {
    "stillmotion": {
      "command": "node",
      "args": ["/path/to/i2v/mcp-server/dist/index.js"],
      "env": {
        "STILLMOTION_API_URL": "https://www.stillmotion.ai",
        "STILLMOTION_AUTH_TOKEN": "your-auth-token"
      }
    }
  }
}
```

## Available Tools

### 1. authenticate
Manually authenticate with email and password (useful for switching users).

```
authenticate(email: string, password: string)
```

### 2. generate_gif
Generate animated GIFs from images.

```
generate_gif(
  imageUrl: string,           // URL or local file path
  prompt: string,             // Animation description
  generationType?: 'standard' | 'premium',  // Default: 'standard'
  enhancePrompt?: boolean,    // Default: true
  numberOfGenerations?: number, // 1-10, default: 1
  sampleSteps?: number,       // Premium only: 1-40, default: 30
  sampleGuideScale?: number   // Premium only: 0-10, default: 5
)
```

### 3. check_generation_status
Check the status of a GIF generation.

```
check_generation_status(videoId: string)
```

### 4. get_user_info
Get current user information including credit balance.

```
get_user_info()
```

### 5. get_gallery
Get user's previously generated GIFs.

```
get_gallery(
  limit?: number,   // 1-100, default: 10
  offset?: number   // Default: 0
)
```

### 6. upload_image
Upload a local image file and get its URL.

```
upload_image(filePath: string)
```

## Example Usage in Claude

Once configured, you can use commands like:

- "Generate a GIF from /path/to/image.jpg with the prompt 'gentle waves flowing'"
- "Check the status of video ID abc123"
- "Show me my credit balance"
- "Show my last 5 generated GIFs"
- "Upload the image at /path/to/local/image.png"

## Development

To run in development mode:

```bash
npm run dev
```

To build:

```bash
npm run build
```

## Troubleshooting

1. **Authentication Errors**: Ensure your email/password or auth token is correct
2. **Connection Errors**: Verify the API URL is accessible
3. **File Upload Issues**: Check file size (max 5MB) and format (JPG/PNG only)
4. **Insufficient Credits**: Purchase more credits through the web interface

## Security Notes

- Store credentials securely
- Use environment variables for sensitive data
- Consider using auth tokens instead of passwords when possible
- The server only has access to the user account it's authenticated with