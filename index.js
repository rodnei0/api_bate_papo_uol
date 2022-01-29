import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import joi from "joi";
import dayjs from "dayjs";
import { MongoClient } from "mongodb";

const app = express();
app.use(express.json());
app.use(cors());

dotenv.config();
const mongoClient = new MongoClient(process.env.MONGO_URI);

const participantSchema = joi.object({
    name: joi.string().required()
  });

const messageSchema = joi.object({
    to: joi.string().required(),
    text: joi.string().required(),
    type: joi.string().pattern(new RegExp('(^message$)|(^private_message$)')).required()
  });

app.post("/participants", async (req, res) => {
    const name = req.body.name;
    const validation = participantSchema.validate({name});

    if (validation.error) {
        console.log(validation.error.details);
        res.status(422).send("Nome do usuário não pode ser uma string vazia!");
        return
    }

    try {
		await mongoClient.connect();
		const db = mongoClient.db(process.env.MONGO_NAME);
		const participantsCollection = db.collection(process.env.MONGO_PARTICIPANTS);

        const participant = await participantsCollection.findOne({ name: name });
        if (participant) {
            res.status(409).send("Nome de usuário já existe!");
            mongoClient.close();
            return
        }

        await participantsCollection.insertOne({name: name, lastStatus: Date.now()});
		res.sendStatus(201);
		mongoClient.close()
	 } catch (error) {
	    res.status(500).send('A culpa foi do estagiário');
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
	    res.status(500).send('A culpa foi do estagiário');
		mongoClient.close()
	 }
});

app.post("/messages", async (req, res) => {
    const from = req.headers.user;
    const messageInfo = req.body;
    
    const validation = messageSchema.validate(messageInfo, { abortEarly: false });
    if (validation.error) {
        validation.error.details.map(error => console.log(error));
        res.sendStatus(422);
        return
    }

    try {
		await mongoClient.connect();
        const now = dayjs().format("HH:mm:ss");
		const db = mongoClient.db(process.env.MONGO_NAME);

        const participantsCollection = db.collection(process.env.MONGO_PARTICIPANTS);
        const participant = await participantsCollection.findOne({ name: from });
        if (!participant) {
            res.sendStatus(422);
            mongoClient.close();
            return
        }

		const messagesCollection = db.collection(process.env.MONGO_MESSAGES);
        await messagesCollection.insertOne({from: from, to: messageInfo.to, text: messageInfo.text, type: messageInfo.type, time: now});
		res.sendStatus(201);
		mongoClient.close()
	 } catch (error) {
	    res.status(500).send('A culpa foi do estagiário');
		mongoClient.close()
	 }
});

app.get("/messages", async (req, res) => {
    const limit = parseInt(req.query.limit);
    const from = req.headers.user;

    try {
		await mongoClient.connect();
		const db = mongoClient.db(process.env.MONGO_NAME);
		const messagesCollection = db.collection(process.env.MONGO_MESSAGES);
        // const messages = await messagesCollection.find(
        //         {type: "message"},
        //         {$and: [{type: "private_message"},
        //                 {$or: [{to: from}, {from: from}]}
        //         ]}
        // ).toArray();
        const messages = await messagesCollection.find(
            {
            $or: [
                {type: "message"}, 
                {$and: 
                    [{type: "private_message"}, 
                    {$or: 
                        [{to: from}, {from: from}]
                    }]
                }]
            }
        ).toArray();
        // const messages = await messagesCollection.find({
        //     $or: [
        //         {type: "mesage"},
        //         $and, [
        //             {type: "private_message"},
        //             {to: from},
        //             {from: from}
        //         ]
        //     ]
        // }).toArray();

        if (limit) {
            res.send(messages.slice(-limit));
		    mongoClient.close();
            return
        }
        res.send(messages);
		mongoClient.close()
	 } catch (error) {
        console.log(error);
	    res.status(500).send('A culpa foi do estagiário')
		mongoClient.close()
	 }
});

app.listen(5000);