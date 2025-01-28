const express = require('express');
const app = express();
const path = require('path');
const Groq = require('groq-sdk');

const groq = new Groq({
  apiKey: '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'
});

// Message queue for responses
const messageQueue = new Map();

// Serve static files
app.use(express.static(path.join(__dirname)));
app.use(express.json());

// Serve the main page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Chat message endpoint
app.post('/chat', async (req, res) => {
  try {
    const { text, length } = req.body;
    const messageId = Date.now().toString();
    
    // Send immediate response with messageId
    res.json({ messageId });

    // Process message asynchronously
    const chatCompletion = await groq.chat.completions.create({
      messages: [
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
   - "long": 4+ sentences, comprehensive explanation`
        },
        {
          role: "user",
          content: `[${length.toUpperCase()}] ${text}`
        }
      ],
      model: "deepseek-r1-distill-llama-70b",
      temperature: 0.7,
      max_completion_tokens: 2048,
      top_p: 0.95,
      stream: false
    });

    const response = chatCompletion.choices[0]?.message?.content || 
      "<think>Hmm, I seem to be having trouble formulating a response.</think>\n\nI apologize, but I'm having a moment. Could you try asking your question again?";

    // Format and store response
    const formattedResponse = response.replace('</think>', '</think>\n\n').replace(/\n{3,}/g, '\n\n');
    messageQueue.set(messageId, formattedResponse);

    // Remove message from queue after 5 minutes
    setTimeout(() => {
      messageQueue.delete(messageId);
    }, 5 * 60 * 1000);

  } catch (error) {
    console.error('Error:', error);
    const errorResponse = "<think>My processing units encountered an unexpected hiccup!</think>\n\nI ran into a technical issue. Could you please try again?";
    messageQueue.set(messageId, errorResponse);
  }
});

// Poll for response endpoint
app.get('/poll/:messageId', (req, res) => {
  const { messageId } = req.params;
  const response = messageQueue.get(messageId);
  
  if (response) {
    messageQueue.delete(messageId);
    res.json({ content: response });
  } else {
    res.status(202).json({ status: 'pending' });
  }
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

module.exports = app; 