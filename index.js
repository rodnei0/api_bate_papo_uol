import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import joi from "joi";
import { MongoClient } from "mongodb";

const app = express();
app.use(express.json());
app.use(cors());

dotenv.config();
const mongoClient = new MongoClient(process.env.MONGO_URI);

const participantSchema = joi.object({
    name: joi.string().required()
  });

app.post("/participants", async (req, res) => {
    const name = req.body;
    const validation = participantSchema.validate(name, { abortEarly: true });

    if (validation.error) {
        console.log(validation.error.details);
        res.status(422).send("Nome do usuário não pode ser uma string vazia!");
        mongoClient.close()
    }

    try {
		await mongoClient.connect();
		const db = mongoClient.db(process.env.MONGO_NAME);
		const participantsCollection = db.collection(process.env.MONGO_PARTICIPANTS);

        const participant = await participantsCollection.findOne({ name: name });
        if (participant) {
            res.status(409).send("Nome de usuário já existe!");
            mongoClient.close()
        }

        await participantsCollection.insertOne({name: name, lastStatus: Date.now()});
		res.sendStatus(201);
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