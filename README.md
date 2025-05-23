# HireMeNowAI

Local LLM-Powered Job Matching Using Resume Analysis and Indeed Job Scraping

## Features

- Resume analysis using local Ollama LLM (qwen3 model)
- Job search via Indeed scraping using JobSpy
- Intelligent job matching and scoring
- Clean, responsive web interface
- File upload support (PDF, DOC, DOCX, TXT)

## Prerequisites

- Node.js (v14 or higher)
- Python 3
- Ollama installed locally with qwen3 model
- JobSpy Python package
- NPM or Yarn package manager

## Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/HireMeNowAI.git
cd HireMeNowAI
```

2. Install dependencies:
```bash
npm install
pip install jobspy
```

3. Set up Ollama with qwen3 model:
```bash
ollama pull qwen3
```

4. Create .env file in the root directory:
```env
PORT=3000
OLLAMA_API_URL=http://localhost:11434
OLLAMA_MODEL=qwen3
```

5. Start the server:
```bash
npm start
```

The application will be available at `http://localhost:3000`

## Project Structure

```
HireMeNowAI/
├── public/           # Static files
│   ├── css/         # Stylesheets
│   └── js/          # Client-side JavaScript
├── views/           # EJS templates
├── uploads/         # Temporary resume storage
├── index.js         # Main application file
├── package.json     # Project dependencies
└── .env             # Environment variables
```

## How It Works

1. **Resume Analysis**
   - Upload resume in supported format
   - Local Ollama LLM (qwen3) extracts key information
   - Generates relevant job search phrases

2. **Job Search**
   - Scrapes Indeed jobs using JobSpy
   - Filters based on location and preferences
   - Aggregates results

3. **Match Scoring**
   - Compares job requirements with resume
   - Generates relevance scores
   - Ranks matches by compatibility

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.
