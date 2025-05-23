const ResumeAnalyzer = require('./resumeAnalyzer');
const MatchScorer = require('./matchScorer');

async function runTests() {
    console.log('Running tests...\n');

    // Test Resume Analyzer
    console.log('Testing ResumeAnalyzer...');
    try {
        const analyzer = ResumeAnalyzer;
        // Create a temporary test file
        const fs = require('fs');
        const testResumePath = 'test-resume.txt';
        const testResumeContent = `
            John Doe
            Software Engineer with 5 years experience
            Skills: JavaScript, Node.js, React, Python
            Previously worked at: Tech Corp, Software Inc.
        `;
        
        fs.writeFileSync(testResumePath, testResumeContent);

        console.log('Testing with 5 positions...');
        const analysis = await analyzer.analyzeResume(testResumePath, 5);
        
        // Clean up test file
        fs.unlinkSync(testResumePath);
        console.log('Job Titles returned:', analysis.jobTitles.length);
        console.log('Titles:', analysis.jobTitles);
        console.log('Resume analysis successful!\n');
    } catch (error) {
        console.error('Resume Analyzer Test Error:', error.message, '\n');
    }

    // Test Match Scorer
    console.log('Testing MatchScorer...');
    try {
        const scorer = MatchScorer;
        const testAnalysis = {
            experienceLevel: 'senior',
            skills: ['JavaScript', 'Node.js', 'React'],
            industries: ['Technology'],
            jobTitles: ['Software Engineer']
        };

        const testJob = {
            title: 'Senior Software Engineer',
            company: 'Tech Corp',
            description: 'Looking for experienced JavaScript and React developer'
        };

        console.log('Testing match score calculation...');
        const score = await scorer.calculateMatchScore(testAnalysis, testJob);
        console.log('Match Score:', score);
        console.log('Score is within valid range:', score >= 0 && score <= 1);
        console.log('Score has proper format:', /^(0|1|0\.\d{1,2}|1\.00)$/.test(score.toString()));
        console.log('Match scoring successful!');
    } catch (error) {
        console.error('Match Scorer Test Error:', error.message);
    }
}

runTests();
