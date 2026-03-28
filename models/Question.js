const mongoose = require("mongoose");

const QuestionSchema = new mongoose.Schema({
  question: { type: String, required: true },
  answer: { type: String, required: true },
  timeLimit: { type: Number, default: 8 },
  category: { type: String, default: "general" },
});

module.exports =
  mongoose.models.Question || mongoose.model("Question", QuestionSchema);
