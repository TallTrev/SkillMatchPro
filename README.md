# SkillMatchPro Application Flow Documentation

## Overview
SkillMatchPro is a full-stack application built with TypeScript, using a client-server architecture. The application appears to be focused on processing PDF documents and extracting information from them.

## Architecture

### Backend (Server)
The server is built with Express.js and uses the following key components:

#### Database
- Uses Neon Database (PostgreSQL) with Drizzle ORM
- Connection is established through a connection pool
- Database URL is configured through environment variables

#### File Storage
- Implements a file upload system using Multer
- Supports PDF files only
- File size limit: 50MB
- Files are stored in an `uploads` directory

#### API Endpoints

1. **Document Upload**
   - Endpoint: `POST /api/documents`
   - Accepts multiple PDF files (up to 10)
   - Stores file metadata in database
   - Returns list of created documents

2. **Extraction Management**
   - Create Extraction: `POST /api/extractions`
     - Creates a new extraction job
     - Links documents to the extraction
     - Starts background processing
   
   - Get Extraction: `GET /api/extractions/:id`
     - Retrieves details of a specific extraction
   
   - List Extractions: `GET /api/extractions`
     - Returns all extractions
   
   - Download PDF: `GET /api/extractions/:id/pdf`
     - Downloads the processed PDF file
   
   - Get Summary: `GET /api/extractions/:id/summary`
     - Retrieves the summary of an extraction

### Frontend (Client)
The client is built with React and uses a modern component structure:

#### Directory Structure
```
client/
├── src/
│   ├── components/    # Reusable UI components
│   ├── hooks/        # Custom React hooks
│   ├── lib/          # Utility functions and shared code
│   ├── pages/        # Page components
│   ├── App.tsx       # Main application component
│   └── main.tsx      # Application entry point
```

#### Key Features
- Modern UI with Tailwind CSS
- TypeScript for type safety
- Vite as the build tool

## Data Flow

1. **Document Upload Flow**
   ```
   Client -> POST /api/documents -> Server
   Server -> Store File -> Create DB Record -> Response
   ```

2. **Extraction Process Flow**
   ```
   Client -> POST /api/extractions -> Server
   Server -> Create Extraction Record -> Link Documents -> Start Processing
   Background Process -> Process PDF -> Update Status -> Store Results
   ```

3. **Results Retrieval Flow**
   ```
   Client -> GET /api/extractions/:id -> Server
   Server -> Fetch Results -> Return to Client
   ```

## Security Features
- File type validation (PDF only)
- File size limits
- Environment variable configuration
- Error handling and validation

## Error Handling
- Comprehensive error handling on both client and server
- Validation using Zod schema
- Proper HTTP status codes
- Detailed error messages

## Dependencies
- Express.js for server
- React for client
- Drizzle ORM for database
- Neon Database (PostgreSQL)
- Multer for file uploads
- TypeScript for type safety
- Tailwind CSS for styling
- Vite for build tooling

This documentation provides a high-level overview of the application's architecture and flow. The system is designed to handle PDF document processing with a focus on scalability and maintainability. 