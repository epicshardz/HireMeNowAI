const axios = require('axios');

class MatchScorer {
    constructor() {
        this.ollamaUrl = process.env.OLLAMA_API_URL || 'http://localhost:11434';
        this.model = process.env.OLLAMA_MODEL || 'qwen3';
        this.lastRequestTime = 0;
        this.requestDelay = 3000; // 3 seconds between requests to prevent overload
    }

    async batchProcessJobs(resumeAnalysis, jobs) {
        const scoredJobs = [];
        let batchCounter = 0;

        for (const job of jobs) {
            try {
                // Throttle requests
                const now = Date.now();
                const timeSinceLastRequest = now - this.lastRequestTime;
                if (timeSinceLastRequest < this.requestDelay) {
                    await new Promise(resolve => setTimeout(resolve, this.requestDelay - timeSinceLastRequest));
                }
                this.lastRequestTime = Date.now();

                const score = await this.calculateMatchScore(resumeAnalysis, job);
                scoredJobs.push({
                    ...job,
                    matchScore: score
                });

                batchCounter++;
                if (batchCounter % 10 === 0) {
                    console.log(`Processed ${batchCounter} of ${jobs.length} jobs`);
                }
            } catch (error) {
                console.error(`Error scoring job ${job.jobId}:`, error);
                scoredJobs.push({
                    ...job,
                    matchScore: 0
                });
            }
        }

        return scoredJobs;
    }

    async calculateMatchScore(resumeAnalysis, job) {
        try {
            // Expert hiring manager prompt with score tagging
            const systemPrompt = `You are an expert hiring manager with 30+ years of experience in technical recruitment.
            Analyze the candidate's qualifications against the job requirements with the precision of a professional recruiter.
            
            Evaluate the match on a continuous scale from 0.00 to 1.00 where:
            - Higher scores indicate better matches
            - Consider all aspects including skills, experience level, industry background
            - Be precise in your evaluation, using the full range between 0 and 1

            IMPORTANT: Place your final score within \\matchScore{} tags
            Example: \\matchScore{0.75}`;

            const prompt = `${systemPrompt}

            Compare this candidate's qualifications to the job requirements and provide your expert assessment score:

            CANDIDATE QUALIFICATIONS:
            • Experience Level: ${resumeAnalysis.experienceLevel}
            • Technical Skills: ${resumeAnalysis.skills.join(', ')}
            • Industry Background: ${resumeAnalysis.industries.join(', ')}
            • Target Position Type: ${resumeAnalysis.jobTitles.join(', ')}

            JOB REQUIREMENTS:
            • Position: ${job.title}
            • Company: ${job.company}
            • Required Qualifications: ${job.description}

            Evaluate the match and respond with only a number between 0.00 and 1.00.
            `;

            // Call Ollama API with strict parameters
            const response = await axios.post(`${this.ollamaUrl}/api/generate`, {
                model: this.model,
                prompt: prompt,
                stream: false,
                temperature: 0.1  // Low temperature for more consistent, focused responses
            });

            // Extract and validate score from response
            const rawResponse = response.data.response;
            
            // Extract score from \matchScore{} tags
            const scoreMatch = rawResponse.match(/\\matchScore\{(0|1|0\.\d{1,2}|1\.00)\}/);
            
            if (!scoreMatch) {
                console.error('No matchScore tag found in response:', rawResponse);
                return 0.50;
            }
            
            // Get the score from the captured group and validate
            const score = parseFloat(scoreMatch[1]);
            if (isNaN(score) || score < 0 || score > 1) {
                console.error('Score out of valid range:', score);
                return 0.50;
            }

            return score;

        } catch (error) {
            console.error('Error calculating match score:', error);
            return 0;
        }
    }
}

module.exports = new MatchScorer();
