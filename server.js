const Together = require("together-ai");

const together = new Together({ apiKey: "e75b393184141776bc0b30d8301b061f1a334e06c66f73ca06a4ce10302703d8" });

const longPrompt = `
You are a world-class historian AI tasked with generating an exhaustive and detailed chronological history of human civilization from the earliest tribal societies up to the modern-day 21st century. Include the following:

- Key events, wars, treaties, inventions, and sociopolitical changes.
- Distinct eras: Stone Age, Bronze Age, Iron Age, Classical Antiquity, Middle Ages, Renaissance, Enlightenment, Industrial Revolution, 20th and 21st century.
- Detailed paragraphs for each century.
- Integrate parallel developments from multiple regions: Europe, Asia, Africa, Americas, Oceania.
- Include cultural, economic, religious, and philosophical developments.

Aim to make this as long, detailed, and structured as possible, consuming at least 10,000 tokens in total.
`;

(async () => {
  const response = await together.chat.completions.create({
    model: "deepseek-ai/DeepSeek-V3",
    messages: [
      {
        role: "user",
        content: longPrompt
      }
    ],
    max_tokens: 8192 // Some models max out at 8192; you can use multiple calls to reach 10k
  });

  console.log(response.choices[0].message.content);
})();