const ResumeAnalyzer = require('./resumeAnalyzer');
const fs = require('fs');

async function testFullFlow() {
    try {
        // Create a test resume file
        const testResumePath = 'test-resume.txt';
        const testResumeContent = `
            John Doe
            Software Engineer with 5 years experience
            Skills: JavaScript, Node.js, React, Python
            Previously worked at: Tech Corp, Software Inc.
        `;
        
        fs.writeFileSync(testResumePath, testResumeContent);

        // Test the full flow similar to index.js
        const positionsToGenerate = 5;
        
        console.log(`\n1. Resume Analysis (${positionsToGenerate} positions):`);
        const analysis = await ResumeAnalyzer.analyzeResume(testResumePath, positionsToGenerate);
        console.log('Job Titles from analysis:', analysis.jobTitles);
        console.log('Number of titles:', analysis.jobTitles.length);

        console.log('\n2. Search Query Generation:');
        const searchQueries = ResumeAnalyzer.generateSearchQueries(analysis);
        console.log('Generated search queries:', searchQueries);
        console.log('Number of search queries:', searchQueries.length);

        // Clean up test file
        fs.unlinkSync(testResumePath);
    } catch (error) {
        console.error('Test Error:', error.message);
    }
}

testFullFlow();
