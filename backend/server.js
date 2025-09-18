// backend/server.js
const express = require('express');
const cors = require('cors');
const axios = require('axios');
const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
// Use gemini-1.5-flash which is the current available model
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

// Middleware
app.use(cors());
app.use(express.json());

// Store chat history for context
const chatSessions = new Map();

// Fetch papers from arXiv API
async function fetchArxivPapers(query, maxResults = 5) {
  try {
    const searchQuery = encodeURIComponent(query);
    const url = `http://export.arxiv.org/api/query?search_query=all:${searchQuery}&start=0&max_results=${maxResults}`;
    
    console.log('Fetching from arXiv:', url);
    const response = await axios.get(url);
    const papers = parseArxivResponse(response.data);
    console.log(`Found ${papers.length} papers`);
    return papers;
  } catch (error) {
    console.error('Error fetching arXiv papers:', error);
    return [];
  }
}

// Parse arXiv XML response
function parseArxivResponse(xmlData) {
  const papers = [];
  const entries = xmlData.match(/<entry>[\s\S]*?<\/entry>/g) || [];
  
  entries.forEach(entry => {
    const title = (entry.match(/<title>([\s\S]*?)<\/title>/) || [])[1]?.trim().replace(/\n/g, ' ');
    const summary = (entry.match(/<summary>([\s\S]*?)<\/summary>/) || [])[1]?.trim().replace(/\n/g, ' ');
    const authors = [];
    const authorMatches = entry.match(/<author>[\s\S]*?<\/author>/g) || [];
    
    authorMatches.forEach(author => {
      const name = (author.match(/<name>([\s\S]*?)<\/name>/) || [])[1]?.trim();
      if (name) authors.push(name);
    });
    
    const published = (entry.match(/<published>([\s\S]*?)<\/published>/) || [])[1]?.trim();
    const link = (entry.match(/<id>([\s\S]*?)<\/id>/) || [])[1]?.trim();
    
    if (title && summary) {
      papers.push({
        title,
        summary: summary.length > 500 ? summary.substring(0, 500) + '...' : summary,
        authors: authors.slice(0, 3),
        published,
        link
      });
    }
  });
  
  return papers;
}

// Generate research report using Gemini
async function generateReport(papers, topic) {
  if (papers.length === 0) {
    return `No research papers found for "${topic}". Please try a different search term.`;
  }

  const papersContext = papers.slice(0, 3).map((p, i) => 
    `Paper ${i + 1}: "${p.title}" - ${p.summary.substring(0, 300)}...`
  ).join('\n\n');
  
  const prompt = `
    Based on these research papers about "${topic}", create a comprehensive research report.
    
    Papers:
    ${papersContext}
    
    Write a formal research synthesis with these sections:
    
    EXECUTIVE SUMMARY
    Provide a 2-3 sentence overview of the key insights.
    
    KEY FINDINGS
    List 3-5 main discoveries or insights from the papers.
    
    METHODOLOGY OVERVIEW
    Briefly describe the research approaches mentioned.
    
    DETAILED ANALYSIS
    Write 2-3 paragraphs analyzing the research findings.
    
    FUTURE RESEARCH DIRECTIONS
    Suggest 2-3 areas for future investigation.
    
    CONCLUSION
    Summarize in 2-3 sentences.
    
    Use formal academic language and be specific.
  `;
  
  try {
    console.log('Generating report with Gemini...');
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    console.log('Report generated successfully');
    return text;
  } catch (error) {
    console.error('Error generating report:', error);
    return `Error generating report: ${error.message}. Please ensure your Gemini API key is valid.`;
  }
}

// Generate mind map data
async function generateMindMap(papers, topic) {
  if (papers.length === 0) {
    return {
      name: topic,
      children: [
        {
          name: "No data available",
          children: []
        }
      ]
    };
  }

  const paperTitles = papers.slice(0, 3).map(p => p.title).join(', ');
  
  const prompt = `
    Create a mind map for "${topic}" based on these papers: ${paperTitles}
    
    Return ONLY valid JSON in this exact format with no additional text:
    {
      "name": "${topic}",
      "children": [
        {
          "name": "subtopic1",
          "children": [
            {"name": "concept1"},
            {"name": "concept2"}
          ]
        },
        {
          "name": "subtopic2",
          "children": [
            {"name": "concept3"},
            {"name": "concept4"}
          ]
        },
        {
          "name": "subtopic3",
          "children": [
            {"name": "concept5"},
            {"name": "concept6"}
          ]
        }
      ]
    }
  `;
  
  try {
    console.log('Generating mind map...');
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    // Clean the response to extract JSON
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const mindMapData = JSON.parse(jsonMatch[0]);
      console.log('Mind map generated successfully');
      return mindMapData;
    }
    
    // Fallback if JSON parsing fails
    throw new Error('Invalid JSON response');
  } catch (error) {
    console.error('Error generating mind map:', error);
    
    // Return a default structure based on papers
    return {
      name: topic,
      children: [
        {
          name: "Research Papers",
          children: papers.slice(0, 3).map(p => ({
            name: p.title.substring(0, 30) + "..."
          }))
        },
        {
          name: "Key Themes",
          children: [
            { name: "Current Research" },
            { name: "Methodologies" },
            { name: "Applications" }
          ]
        },
        {
          name: "Future Directions",
          children: [
            { name: "Open Questions" },
            { name: "Emerging Trends" }
          ]
        }
      ]
    };
  }
}

// Routes
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'AI Research Co-Pilot Backend Running' });
});

// Main research endpoint
app.post('/api/research', async (req, res) => {
  try {
    const { topic } = req.body;
    
    if (!topic) {
      return res.status(400).json({ error: 'Topic is required' });
    }
    
    console.log(`Processing research request for: ${topic}`);
    
    // Fetch papers from arXiv
    const papers = await fetchArxivPapers(topic, 5);
    
    if (papers.length === 0) {
      console.log('No papers found, returning empty results');
      return res.json({
        success: true,
        data: {
          papers: [],
          report: `No research papers found for "${topic}". Try searching for:\n- A broader topic (e.g., "machine learning" instead of specific algorithms)\n- Academic terms (e.g., "neural networks", "quantum computing")\n- Research areas (e.g., "computer vision", "natural language processing")`,
          mindMap: {
            name: topic,
            children: [
              { name: "No papers found", children: [] }
            ]
          },
          sessionId: Date.now().toString()
        }
      });
    }
    
    // Generate report and mind map in parallel
    console.log('Generating report and mind map...');
    const [report, mindMap] = await Promise.all([
      generateReport(papers, topic),
      generateMindMap(papers, topic)
    ]);
    
    // Create a session for the chatbot
    const sessionId = Date.now().toString();
    chatSessions.set(sessionId, {
      topic,
      papers,
      report,
      history: []
    });
    
    console.log(`Research complete. Session ID: ${sessionId}`);
    
    res.json({
      success: true,
      data: {
        papers: papers.slice(0, 5),
        report,
        mindMap,
        sessionId
      }
    });
  } catch (error) {
    console.error('Research error:', error);
    res.status(500).json({ 
      error: 'Failed to process research request',
      message: error.message 
    });
  }
});

// Chatbot endpoint
app.post('/api/chat', async (req, res) => {
  try {
    const { sessionId, message } = req.body;
    
    console.log(`Chat request - Session: ${sessionId}, Message: ${message}`);
    
    if (!sessionId || !message) {
      return res.status(400).json({ error: 'Session ID and message are required' });
    }
    
    const session = chatSessions.get(sessionId);
    
    if (!session) {
      return res.status(404).json({ error: 'Session not found. Please generate a new research report.' });
    }
    
    const context = `
      You are a helpful research assistant discussing "${session.topic}".
      
      Based on this research report:
      ${session.report.substring(0, 2000)}
      
      Previous conversation:
      ${session.history.slice(-6).join('\n')}
      
      User question: ${message}
      
      Provide a concise, informative response. Be friendly but professional.
    `;
    
    const result = await model.generateContent(context);
    const response = await result.response;
    const answer = response.text();
    
    // Update history
    session.history.push(`User: ${message}`);
    session.history.push(`Assistant: ${answer}`);
    
    // Keep only last 10 exchanges
    if (session.history.length > 20) {
      session.history = session.history.slice(-20);
    }
    
    console.log('Chat response sent');
    
    res.json({
      success: true,
      answer
    });
  } catch (error) {
    console.error('Chat error:', error);
    res.status(500).json({ 
      error: 'Failed to process chat message',
      message: error.message 
    });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 AI Research Co-Pilot Backend running on port ${PORT}`);
  console.log(`📝 Make sure your GEMINI_API_KEY is set in .env file`);
  console.log(`🔗 Frontend should connect to http://localhost:${PORT}`);
});

