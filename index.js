const express = require('express');
const multer = require('multer');
const path = require('path');
const dotenv = require('dotenv');
const expressLayouts = require('express-ejs-layouts');
const fs = require('fs').promises;

// Import services
const resumeAnalyzer = require('./src/resumeAnalyzer');
const jobSearch = require('./src/jobSearch');
const matchScorer = require('./src/matchScorer');

// Load environment variables
dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

// Set up EJS with layouts
app.use(expressLayouts);
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.set('layout', 'layout');
app.use(express.static(path.join(__dirname, 'public')));

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + '-' + file.originalname);
    }
});

const upload = multer({
    storage: storage,
    fileFilter: (req, file, cb) => {
        const allowedTypes = ['.pdf', '.doc', '.docx', '.txt'];
        const ext = path.extname(file.originalname).toLowerCase();
        if (allowedTypes.includes(ext)) {
            cb(null, true);
        } else {
            cb(new Error('Invalid file type. Only PDF, DOC, DOCX, and TXT files are allowed.'));
        }
    },
    limits: {
        fileSize: parseInt(process.env.MAX_FILE_SIZE) || 16 * 1024 * 1024
    }
});

// Routes
app.get('/', (req, res) => {
    res.render('index', { 
        title: 'HireMeNowAI - Resume Analysis',
        error: null
    });
});

app.post('/upload', upload.single('resume'), async (req, res) => {
    try {
        if (!req.file) {
            throw new Error('Please upload a resume file.');
        }

        const location = req.body.location;
        const maxJobsPerPosition = parseInt(req.body.maxJobsPerPosition) || 5;
        const daysOld = parseInt(req.body.daysOld) || 14;
        const positionsToGenerate = parseInt(req.body.positionsToGenerate) || 5;

        // Analyze resume with specified number of positions
        const resumeAnalysis = await resumeAnalyzer.analyzeResume(req.file.path, positionsToGenerate);
        
        // Search for jobs for each position type using the exact job titles
        const jobs = await jobSearch.searchMultipleQueries(
            resumeAnalysis.jobTitles,
            location,
            maxJobsPerPosition,
            daysOld
        );
        
        // Score and rank jobs based on resume match
        const scoredJobs = await matchScorer.batchProcessJobs(resumeAnalysis, jobs);
        
        // Store results
        const resultsPath = path.join(__dirname, 'uploads', `results-${Date.now()}.json`);
        await fs.writeFile(resultsPath, JSON.stringify({
            timestamp: new Date(),
            resumeAnalysis,
            jobs: scoredJobs,
            searchStats: {
                queriesGenerated: resumeAnalysis.jobTitles.length,
                totalJobs: jobs.length,
                maxPerPosition: maxJobsPerPosition,
                positionsGenerated: positionsToGenerate,
                daysOld: daysOld
            }
        }));

        res.redirect(`/results?id=${path.basename(resultsPath, '.json')}`);
    } catch (error) {
        console.error('Error processing resume:', error);
        res.render('index', { 
            title: 'HireMeNowAI - Resume Analysis',
            error: error.message 
        });
    }
});

app.get('/results', async (req, res) => {
    try {
        const resultsId = req.query.id;
        if (!resultsId) {
            return res.redirect('/');
        }

        const resultsPath = path.join(__dirname, 'uploads', `${resultsId}.json`);
        const results = JSON.parse(await fs.readFile(resultsPath, 'utf8'));

        res.render('results', { 
            title: 'HireMeNowAI - Job Matches',
            jobs: results.jobs,
            analysis: results.resumeAnalysis,
            stats: results.searchStats
        });
    } catch (error) {
        console.error('Error displaying results:', error);
        res.status(404).render('error', {
            title: 'Error',
            message: 'Results not found. Please try your search again.'
        });
    }
});

// Cleanup old results periodically
setInterval(async () => {
    try {
        const uploadsDir = path.join(__dirname, 'uploads');
        const files = await fs.readdir(uploadsDir);
        const now = Date.now();

        for (const file of files) {
            if (file.startsWith('results-')) {
                const filePath = path.join(uploadsDir, file);
                const stats = await fs.stat(filePath);
                const age = now - stats.mtime;

                // Delete files older than 1 hour
                if (age > 3600000) {
                    await fs.unlink(filePath);
                }
            }
        }
    } catch (error) {
        console.error('Error cleaning up old results:', error);
    }
}, 900000); // Run every 15 minutes

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).render('error', {
        title: 'Error',
        message: 'Something went wrong! Please try again.'
    });
});

// Create required directories
(async () => {
    try {
        await fs.mkdir('uploads').catch(() => {});
    } catch (error) {
        console.error('Error creating uploads directory:', error);
    }
})();

// Start server
app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});
