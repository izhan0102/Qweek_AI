const Groq = require('groq-sdk');

const groq = new Groq({
  apiKey: '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'
});

async function generateChemistryPaper() {
  try {
    const prompt = `Act like a firendly human robot.`;

    const chatCompletion = await groq.chat.completions.create({
      messages: [
        {
          role: "system",
          content: "You are a knowledgeable chemistry educator with expertise in creating examination papers."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      model: "deepseek-r1-distill-llama-70b",
      temperature: 0.6,
      max_completion_tokens: 4096,
      top_p: 0.95,
      stream: true,
      stop: null
    });

    console.log("\n🧪 Generating 2025 Chemistry Paper Prediction...\n");
    console.log("----------------------------------------\n");

    for await (const chunk of chatCompletion) {
      process.stdout.write(chunk.choices[0]?.delta?.content || '');
    }
    
    console.log("\n----------------------------------------\n");
    console.log("Paper generation complete! ✨");

  } catch (error) {
    console.error("Error generating chemistry paper:", error.message);
  }
}

// Run the bot
generateChemistryPaper(); 