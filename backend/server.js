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
const model = genAI.getGenerativeModel({ model: "gemini-pro" });

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
    
    const response = await axios.get(url);
    const papers = parseArxivResponse(response.data);
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
    const title = (entry.match(/<title>([\s\S]*?)<\/title>/) || [])[1]?.trim();
    const summary = (entry.match(/<summary>([\s\S]*?)<\/summary>/) || [])[1]?.trim();
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
        summary: summary.substring(0, 500) + '...',
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
  const papersContext = papers.map(p => 
    `Title: ${p.title}\nAuthors: ${p.authors.join(', ')}\nSummary: ${p.summary}`
  ).join('\n\n');
  
  const prompt = `
    As an expert research analyst, create a comprehensive, formal research report on "${topic}" based on these papers:
    
    ${papersContext}
    
    Generate a structured report with:
    1. Executive Summary (2-3 sentences)
    2. Key Findings (3-5 bullet points)
    3. Methodology Overview
    4. Detailed Analysis (2-3 paragraphs)
    5. Future Research Directions
    6. Conclusion
    
    Use formal academic language, be precise, and include specific insights from the papers.
  `;
  
  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text();
  } catch (error) {
    console.error('Error generating report:', error);
    return 'Report generation failed. Please try again.';
  }
}

// Generate mind map data
async function generateMindMap(papers, topic) {
  const prompt = `
    Create a mind map structure for the topic "${topic}" based on these research papers.
    Return ONLY a JSON object with this exact structure, no other text:
    {
      "name": "topic name",
      "children": [
        {
          "name": "subtopic 1",
          "children": [
            {"name": "detail 1"},
            {"name": "detail 2"}
          ]
        },
        {
          "name": "subtopic 2",
          "children": [
            {"name": "detail 3"},
            {"name": "detail 4"}
          ]
        }
      ]
    }
    
    Base it on these papers: ${papers.slice(0, 3).map(p => p.title).join(', ')}
  `;
  
  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    // Extract JSON from response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    
    // Fallback structure
    return {
      name: topic,
      children: [
        {
          name: "Core Concepts",
          children: [
            { name: "Theory" },
            { name: "Applications" }
          ]
        },
        {
          name: "Research Areas",
          children: [
            { name: "Current Studies" },
            { name: "Future Directions" }
          ]
        }
      ]
    };
  } catch (error) {
    console.error('Error generating mind map:', error);
    return {
      name: topic,
      children: [
        { name: "Loading...", children: [] }
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
    
    // Fetch papers from arXiv
    const papers = await fetchArxivPapers(topic);
    
    if (papers.length === 0) {
      return res.status(404).json({ error: 'No papers found for this topic' });
    }
    
    // Generate report and mind map in parallel
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
    res.status(500).json({ error: 'Failed to process research request' });
  }
});

// Chatbot endpoint
app.post('/api/chat', async (req, res) => {
  try {
    const { sessionId, message } = req.body;
    
    if (!sessionId || !message) {
      return res.status(400).json({ error: 'Session ID and message are required' });
    }
    
    const session = chatSessions.get(sessionId);
    
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }
    
    const context = `
      You are Professor AI, an expert on "${session.topic}".
      You have access to this research report: ${session.report}
      
      Previous conversation: ${session.history.join('\n')}
      
      Student question: ${message}
      
      Respond as a knowledgeable, friendly professor. Be concise but informative.
      Use the research data to support your answers.
    `;
    
    const result = await model.generateContent(context);
    const response = await result.response;
    const answer = response.text();
    
    // Update history
    session.history.push(`Student: ${message}`);
    session.history.push(`Professor: ${answer}`);
    
    // Keep only last 10 exchanges
    if (session.history.length > 20) {
      session.history = session.history.slice(-20);
    }
    
    res.json({
      success: true,
      answer
    });
  } catch (error) {
    console.error('Chat error:', error);
    res.status(500).json({ error: 'Failed to process chat message' });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 AI Research Co-Pilot Backend running on port ${PORT}`);
});



