import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { MongoClient } from "mongodb";

const app = express();
app.use(express.json());
app.use(cors());

dotenv.config();
const mongoClient = new MongoClient(process.env.MONGO_URI);

app.post("/participants", async (req, res) => {
    const name = req.body;
    try {
		await mongoClient.connect();
		const db = mongoClient.db(process.env.MONGO_NAME);
		const participantsCollection = db.collection(process.env.MONGO_PARTICIPANTS);
        await participantsCollection.insertOne({name: name, lastStatus: Date.now()});
		res.status(201).send("deu bom");
		mongoClient.close()
	 } catch (error) {
	    res.status(500).send('A culpa foi do estagiário')
		mongoClient.close()
	 }
});

app.get("/participants", async (req, res) => {
    try {
		await mongoClient.connect();
		const db = mongoClient.db(process.env.MONGO_NAME);
		const participantsCollection = db.collection(process.env.MONGO_PARTICIPANTS);
        const participants = await participantsCollection.find({}).toArray();
		res.send(participants);
		mongoClient.close()
	 } catch (error) {
        console.log(error);
	    res.status(500).send('A culpa foi do estagiário')
		mongoClient.close()
	 }
});

app.listen(5000);