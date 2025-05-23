const { spawn } = require('child_process');
const path = require('path');

class JobSearch {
    constructor() {
        this.maxJobsPerPosition = parseInt(process.env.MAX_JOBS_PER_POSITION) || 50;
        this.pythonScript = path.join(__dirname, 'job_search.py');
    }

    async searchJobs(query, location, limit = 10, daysOld = 14) {
        try {
            const jobs = await this.runPythonScript(query, location, Math.min(limit, this.maxJobsPerPosition), daysOld);
            if (!Array.isArray(jobs)) {
                if (jobs.error) {
                    throw new Error(jobs.error);
                }
                throw new Error('Invalid response from job search');
            }
            return this.processJobResults(jobs);
        } catch (error) {
            console.error('Error searching jobs:', error);
            throw new Error(`Failed to search jobs on Indeed: ${error.message}`);
        }
    }

    async searchMultipleQueries(queries, location, jobsPerPosition = 10, daysOld = 14) {
        const allJobs = [];
        const errors = [];

        // Process each query (position type) sequentially
        for (const query of queries) {
            try {
                const jobs = await this.searchJobs(query, location, jobsPerPosition, daysOld);
                if (Array.isArray(jobs)) {
                    // Add query information to each job
                    const jobsWithSource = jobs.map(job => ({
                        ...job,
                        sourceQuery: query
                    }));
                    allJobs.push(...jobsWithSource);
                }
            } catch (error) {
                console.error(`Error searching for query "${query}":`, error);
                errors.push(`${query}: ${error.message}`);
                // Continue with other queries even if one fails
            }
        }

        if (allJobs.length === 0 && errors.length > 0) {
            throw new Error(`All queries failed: ${errors.join('; ')}`);
        }

        // Group jobs by position type (query) and take top N from each
        const jobsByQuery = new Map();
        allJobs.forEach(job => {
            if (!jobsByQuery.has(job.sourceQuery)) {
                jobsByQuery.set(job.sourceQuery, []);
            }
            jobsByQuery.get(job.sourceQuery).push(job);
        });

        // Take top N jobs from each position type
        const limitedJobs = [];
        jobsByQuery.forEach((jobs, query) => {
            const topJobs = jobs.slice(0, jobsPerPosition);
            limitedJobs.push(...topJobs);
        });

        // Remove duplicates based on job ID and URL
        return [...new Map(limitedJobs.map(job => [
            job.jobId + job.url,
            job
        ])).values()];
    }

    runPythonScript(query, location, limit, daysOld = 14) {
        return new Promise((resolve, reject) => {
            const python = spawn('python', [
                this.pythonScript,
                query,
                location,
                limit.toString(),
                daysOld.toString()
            ]);

            let dataString = '';
            let errorString = '';

            python.stdout.on('data', (data) => {
                dataString += data.toString();
            });

            python.stderr.on('data', (data) => {
                errorString += data.toString();
                console.error(`Python Script Error: ${data}`);
            });

            python.on('close', (code) => {
                if (code !== 0) {
                    // Try to parse error message if it's JSON
                    try {
                        const error = JSON.parse(errorString);
                        return reject(new Error(error.error || `Python script exited with code ${code}`));
                    } catch (_) {
                        return reject(new Error(errorString || `Python script exited with code ${code}`));
                    }
                }

                try {
                    const result = JSON.parse(dataString);
                    if (result.error) {
                        return reject(new Error(result.error));
                    }
                    resolve(result);
                } catch (error) {
                    console.error('Error parsing Python output:', error);
                    console.error('Raw output:', dataString);
                    reject(new Error(`Failed to parse Python script output: ${error.message}`));
                }
            });

            python.on('error', (error) => {
                reject(new Error(`Failed to start Python script: ${error.message}`));
            });
        });
    }

    processJobResults(jobs) {
        if (!Array.isArray(jobs)) {
            return [];
        }

        return jobs.map(job => ({
            ...job,
            // Make sure required fields are present
            jobId: job.jobId || '',
            title: job.title || '',
            company: job.company || '',
            location: job.location || '',
            description: job.description || '',
            url: job.url || '',
            datePosted: job.datePosted || '',
            salary: job.salary || 'Not specified',
            jobType: job.jobType || 'Not specified',
            matchScore: job.matchScore || 0.0
        }));
    }
}

module.exports = new JobSearch();
