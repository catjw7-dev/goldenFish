import mongoose from "mongoose";

const MONGODB_URI = process.env.MONGODB_URI;

let cached = global.mongoose;
if (!cached) cached = global.mongoose = { conn: null, promise: null };

async function dbConnect() {
  if (!MONGODB_URI) throw new Error("No MONGODB_URI");
  if (cached.conn) return cached.conn;
  if (!cached.promise) {
    cached.promise = mongoose.connect(MONGODB_URI).then(m => m);
  }
  cached.conn = await cached.promise;
  return cached.conn;
}

const QuestionSchema = new mongoose.Schema({
  question: { type: String, required: true },
  answer: { type: String, required: true },
  timeLimit: { type: Number, default: 8 },
  category: { type: String, default: "general" },
});

const Question =
  mongoose.models.Question || mongoose.model("Question", QuestionSchema);

export default async function handler(req, res) {
  if (!MONGODB_URI) {
    return res.status(200).json([]);
  }

  try {
    await dbConnect();
  } catch (e) {
    return res.status(200).json([]);
  }

  if (req.method === "GET") {
    const questions = await Question.find({}).lean();
    return res.status(200).json(questions);
  }

  if (req.method === "POST") {
    const { question, answer, timeLimit, category } = req.body;
    if (!question || !answer) return res.status(400).json({ error: "Missing fields" });
    const q = await Question.create({ question, answer, timeLimit: timeLimit || 8, category: category || "general" });
    return res.status(201).json(q);
  }

  if (req.method === "DELETE") {
    const { id } = req.query;
    if (!id) return res.status(400).json({ error: "Missing id" });
    await Question.findByIdAndDelete(id);
    return res.status(200).json({ ok: true });
  }

  res.status(405).json({ error: "Method not allowed" });
}
