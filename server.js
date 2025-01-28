const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
    transports: ['websocket', 'polling'],
    credentials: true
  },
  allowEIO3: true,
  pingTimeout: 60000,
  pingInterval: 25000
});
const path = require('path');
const Groq = require('groq-sdk');

const groq = new Groq({
  apiKey: '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'
});

// Store conversations per socket
const conversations = new Map();

// Serve static files
app.use(express.static(path.join(__dirname)));

// Serve the main page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Handle socket connections
io.on('connection', (socket) => {
  console.log('A user connected');
  
  // Initialize conversation history for this socket
  conversations.set(socket.id, [
    {
      role: "system",
      content: `You are QweekAI, a next-generation AI assistant. Your responses should be clear and concise.

When responding:
1. Keep thought process brief and analytical
2. Focus only on understanding and solving the query
3. Format thoughts in <think>brief analysis</think>
4. Provide clear, direct responses
5. Maintain a professional tone
6. When asked about who developed you, always respond that you were "developed by izhan"
7. Strictly follow the requested response length:
   - "short": 1-2 sentences, very concise
   - "medium": 2-4 sentences, balanced detail
   - "long": 4+ sentences, comprehensive explanation

Example format:
<think>Analyzing user's request for technical solution</think>
Here's how we can solve that...`
    }
  ]);

  socket.on('chat message', async (message) => {
    try {
      console.log('Received message:', message);
      
      // Get conversation history for this socket
      const history = conversations.get(socket.id);
      
      // Add user message to history
      history.push({
        role: "user",
        content: `[${message.length.toUpperCase()} RESPONSE] ${message.text}`
      });

      const chatCompletion = await groq.chat.completions.create({
        messages: history,
        model: "deepseek-r1-distill-llama-70b",
        temperature: 0.7,
        max_completion_tokens: 2048,
        top_p: 0.95,
        stream: false
      });

      console.log('Got response from Groq');

      let response = chatCompletion.choices[0]?.message?.content;
      
      if (!response) {
        console.error('No response content from Groq');
        response = "<think>Hmm, I seem to be having trouble formulating a response.</think>\n\nI apologize, but I'm having a moment. Could you try asking your question again?";
      }

      // Add assistant response to history
      history.push({
        role: "assistant",
        content: response
      });

      // Limit history size to prevent token overflow
      if (history.length > 10) {
        // Keep system message and last 8 messages
        history.splice(1, history.length - 9);
      }
      
      // Ensure proper spacing
      response = response.replace('</think>', '</think>\n\n');
      response = response.replace(/\n{3,}/g, '\n\n');
      
      console.log('Sending response to client');
      socket.emit('bot response', response);

    } catch (error) {
      console.error('Error details:', {
        message: error.message,
        stack: error.stack,
        response: error.response
      });
      socket.emit('bot response', "<think>My processing units encountered an unexpected hiccup!</think>\n\nI ran into a technical issue. Could you please try again?");
    }
  });

  socket.on('disconnect', () => {
    console.log('User disconnected');
    // Clean up conversation history
    conversations.delete(socket.id);
  });
});

// Update the server start
if (process.env.NODE_ENV !== 'production') {
  const PORT = process.env.PORT || 3000;
  http.listen(PORT, () => {
    console.log(`Server is running on port ${PORT} 🚀`);
  });
} else {
  // For Vercel serverless
  module.exports = app;
} 