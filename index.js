const express = require("express");
const cors = require("cors");
const { MongoClient, ServerApiVersion } = require('mongodb');
const { GoogleGenerativeAI } = require("@google/generative-ai");
require('dotenv').config();
const bcrypt = require('bcrypt');
const app = express();
const port = process.env.PORT || 5000;

const genAI = new GoogleGenerativeAI(process.env.AI_API_KEY)


// middleware 
app.use(cors({
    origin: [
      // 'https://quizlytics.vercel.app',
      'http://localhost:3000'
    ],
  }));
  app.use(express.json());
app.use(express.json());


// ======================= MongoDB Connection URI ==================================
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.9nu6wnq.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    // All DB Collections
    const registeredUsersCollection = client.db('quiz_lytics_database').collection('registered_users');
    const allExamDataCollection = client.db('quiz_lytics_database').collection('all_exam');
    const onlyUserMarkCollection = client.db('quiz_lytics_database').collection('onlyUserMark');

    // ===== API using AI
    app.get("/quiz", async(req, res)=>{
        const category = req.query?.category;
        const skill = req.query?.skill
        const model = genAI.getGenerativeModel({model: "gemini-pro"});
        const prompt = `generate a json containing 10 multiple choice question on ${category} and the questions must be declared as "question". Prepare the questions assuming the examinee as a ${skill} learner. The question must have four answer options declared as "options". The question can be fill-up the blanks, find the true statement or other. The answer options must be in a different array inside the question object. The correct answer's index-number will also be provided in a different variable as a string which will also kept inside the question object and will be declared as "correct_answer". Each of the questions must be unique and must have an unique id which will be an index number as a string declared as "id". Provide the json only, avoid any extra information while providing the result. result must be a json array. avoid the heading in reply.`;
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
    
    // API route for registering users with register form
    app.post('/registered_users', async (req, res) => {
      try {
        const newUser = req.body;
        const exist = await registeredUsersCollection.findOne({ email: newUser.email });
        if (exist) {
          return res.status(409).json({ message: "User already exists!" });
        }
        const hashedPassword = bcrypt.hashSync(newUser.password, 14);
        const response = await registeredUsersCollection.insertOne({ ...newUser, password: hashedPassword });
        return res.status(200).json({ message: "New user successfully created" });
      } catch (error) {
        return res.status(500).json({ message: "Internal Server Error", error });
      }
    });

    // API route for authenticating user with social provider
    app.post('/authenticating_with_providers', async (req, res) => {
      try {
        const newUser = req.body;
        const exist = await registeredUsersCollection.findOne({ email: newUser.email });
        if (exist) {
          return res.status(409).json({ message: "User already exist!" });
        }
        const response = await registeredUsersCollection.insertOne(newUser);
        return res.status(200).json({ message: "New user successfully created!" })
      } catch (error) {
        return res.status(500).json({ message: "Internal Server Error", error });
      }
    })

    // api route for userExamData send to database
    app.post('/user_exam_data', async (req, res) => {
      try {
        const userExamData = req.body;
        console.log(userExamData);
        const result = await allExamDataCollection.insertMany(userExamData); 
        return res.status(200).json({ message: "New Exam Data successfully saved" });
      } catch (error) {
        return res.status(500).json({ message: "Oops! Exam data not saved!", error });
      }
    });

    app.get('/all_exam_data', async(req, res) => {
      try {
        const allExamData = req.body;
        const result = await allExamDataCollection.find().toArray();
        return res.send(result);
      } catch (error) {
        return res.status(500); 
      }
    })

    // Only user mark sending to database
    app.post('/only_user_mark', async(req, res) => {
      try {
        const onlyMark = req.body;
        const result = await onlyUserMarkCollection.insertOne(onlyMark);
        return res.status(200).json({message: "Only User Mark saved!"});
      } catch (error) {
        return res.status(500).json({message: "No! Only user mark has not saved"});
      }
    })     


    // mongodb connected successfully
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);
// ======================================================


app.get("/", (req, res)=>{
    res.send("Quizlytics server is running")
})

app.listen(port, ()=>{
    console.log(`Listening to the port: ${port}`)
})