# Backend Server for Vachanamrut

This is the Node.js backend server that handles all business logic for the Vachanamrut application.

## Setup

1. Install dependencies:
```bash
npm install
```

2. Create a `.env` file in the `backend/` folder:
```bash
GOOGLE_AI_API_KEY=your_google_gemini_api_key_here
PORT=4000
```

## Running the Server

### Local Development
```bash
npm start
# or with auto-reload:
npm run dev
```

The server will run on `http://localhost:4000`

### Using Ngrok (for production/external access)

1. Start the backend server:
```bash
npm start
```

2. In another terminal, start ngrok:
```bash
ngrok http 4000
```

3. Copy the HTTPS URL from ngrok (e.g., `https://abcd-1234.ngrok-free.app`)

4. Update your frontend `.env.local`:
```bash
NEXT_PUBLIC_BACKEND_URL=https://your-ngrok-url.ngrok-free.app
```

## API Endpoints

All endpoints are prefixed with `/api`:

- `POST /api/gemini` - Get AI response for a question
- `POST /api/tts` - Generate text-to-speech audio
- `GET /api/history/list` - List all history sessions
- `POST /api/history/find` - Find a history session by question
- `POST /api/history/save-audio` - Save audio and session data
- `POST /api/history/audio` - Get audio data for a session

## Data Storage

All history data is stored in the `backend/history/` folder:
- Each session has a timestamp-based folder
- Audio files are stored as base64 in `.b64` files
- Metadata is stored in `.json` files
- Session summaries are in `session.json`

## Notes

- All business logic is in the backend
- Frontend only makes API calls to the backend
- History is stored locally in the backend folder
- The backend must be running for the frontend to work
- For production, expose the backend via ngrok and update frontend environment variable

# Vachanamrut_backend
