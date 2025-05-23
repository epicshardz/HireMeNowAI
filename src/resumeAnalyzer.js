const axios = require('axios');
const pdfParse = require('pdf-parse');
const fs = require('fs');

class ResumeAnalyzer {
    constructor() {
        this.ollamaUrl = process.env.OLLAMA_API_URL || 'http://localhost:11434';
        this.model = process.env.OLLAMA_MODEL || 'qwen3';
    }

    async extractText(filePath) {
        const fileExt = filePath.split('.').pop().toLowerCase();
        
        if (fileExt === 'pdf') {
            const dataBuffer = fs.readFileSync(filePath);
            const data = await pdfParse(dataBuffer);
            return data.text;
        } else if (fileExt === 'txt') {
            return fs.readFileSync(filePath, 'utf8');
        } else {
            throw new Error('Unsupported file format. Only PDF and TXT files are supported for analysis.');
        }
    }

    async analyzeResume(filePath, positionsToGenerate = 5) {
        try {
            const text = await this.extractText(filePath);
            
            // Prompt for Ollama to extract relevant information
            const prompt = `
            Analyze this resume and provide job position recommendations.
            Consider the candidate's experience, skills, and career progression.
            
            IMPORTANT: You must return EXACTLY ${positionsToGenerate} job positions, no more, no less.
            Failure to provide exactly ${positionsToGenerate} positions will invalidate the response.
            
            Resume text:
            ${text}

            Provide the output in this exact JSON format:
            {
                "jobTitles": [Array of EXACTLY ${positionsToGenerate} job titles],
                "skills": [key technical and soft skills],
                "experienceLevel": "entry/mid/senior",
                "industries": [relevant industries],
                "searchKeywords": [important terms for job search]
            }

            Rules:
            1. The jobTitles array MUST contain exactly ${positionsToGenerate} items
            2. Each job title should be unique
            3. Titles should be ordered from most to least relevant
            4. If not enough direct matches, suggest related roles that fit the candidate's skills
            `;

            const response = await axios.post(`${this.ollamaUrl}/api/generate`, {
                model: this.model,
                prompt: prompt,
                stream: false
            }, {
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            // Parse and validate the LLM response
            const responseText = response.data.response;
            const startIndex = responseText.indexOf('{');
            const endIndex = responseText.lastIndexOf('}') + 1;
            const jsonStr = responseText.substring(startIndex, endIndex);
            
            let analysis = JSON.parse(jsonStr);

            // Validate and process job titles
            if (!Array.isArray(analysis.jobTitles)) {
                throw new Error('Invalid response: jobTitles is not an array');
            }

            // Ensure we have exactly the requested number of positions
            if (analysis.jobTitles.length > positionsToGenerate) {
                // Trim to the requested number, keeping most relevant positions
                analysis.jobTitles = analysis.jobTitles.slice(0, positionsToGenerate);
            } else if (analysis.jobTitles.length < positionsToGenerate) {
                throw new Error(`AI did not generate enough positions (got ${analysis.jobTitles.length}, need ${positionsToGenerate})`);
            }

            // Remove any duplicate job titles
            analysis.jobTitles = [...new Set(analysis.jobTitles)];

            // If removing duplicates reduced the count, throw error
            if (analysis.jobTitles.length !== positionsToGenerate) {
                throw new Error('After removing duplicates, not enough unique positions remained');
            }

            return analysis;

        } catch (error) {
            console.error('Error analyzing resume:', error);
            throw new Error('Failed to analyze resume. ' + error.message);
        }
    }

    generateSearchQueries(analysis) {
        const queries = [];

        // Combine job titles with experience level and skills
        for (const title of analysis.jobTitles) {
            // Base query with just the title
            queries.push(title);
            
            // Add experience level to job titles
            if (analysis.experienceLevel) {
                queries.push(`${analysis.experienceLevel} ${title}`);
            }

            // Combine with top skills (if any)
            const topSkills = analysis.skills.slice(0, 2);
            for (const skill of topSkills) {
                queries.push(`${title} ${skill}`);
            }
        }

        // Add any explicit search keywords
        if (analysis.searchKeywords && analysis.searchKeywords.length > 0) {
            queries.push(...analysis.searchKeywords);
        }

        // Remove duplicates and return
        return [...new Set(queries)];
    }
}

module.exports = new ResumeAnalyzer();
