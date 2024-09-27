const express = require ("express");
const cors = require ("cors");
const { GoogleGenerativeAI } = require("@google/generative-ai");
require ('dotenv').config();

const genAI = new GoogleGenerativeAI(process.env.AI_API_KEY)
const app = express();
const port = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());


app.get("/quiz", async(req, res)=>{
    const category = req.query?.category;
    const skill = req.query?.skill
    const model = genAI.getGenerativeModel({model: "gemini-pro"});

    const prompt = `generate a json containing 10 multiple choice question on ${category} and the questions must be declared as "question". Prepare the questions assuming the examinee as a ${skill} learner. The question must have four answer options declared as "options". The question can be fill-up the blanks, find the true statement or other. The answer options must be in a different array inside the question object. The correct answer's index will also be provided in a different variable as a string which will also kept inside the question object and will be declared as "correct_answer". Each of the questions must be unique and must have an unique id which will be an index number as a string declared as "id". Provide the json only, avoid any extra information while providing the result. result must be a json array. avoid the heading in reply.`;

    
    const result = await model.generateContent(prompt);


    const response = await result.response;

    const text = await response.text();
    
    const cleanedText = text.replace(/\\\"/g, '"')          // Removes escaped quotes
    .replace(/```json/g, '')                                // Removes '```json' code block markers
    .replace(/```/g, '')                                    // Removes any other triple backticks
    .replace(/`/g, '')                                      // Removes single backticks
    .trim();
    const jsonResult = JSON.parse(cleanedText);
    res.json(jsonResult); 
})


app.get("/", (req, res)=>{
    res.send("Quizlytics server is running")
})

app.listen(port, ()=>{
    console.log(`Listening to the port: ${port}`)
})