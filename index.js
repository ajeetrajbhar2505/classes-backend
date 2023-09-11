const express = require("express");
const app = express();
app.use(express.urlencoded({ extended: false }));
app.use(express.json());
const cors = require("cors");
const dotenv = require("dotenv");
const { v4: uuidv4 } = require("uuid");
const { ObjectId } = require("mongodb");
dotenv.config();
app.use(cors());


const MongoClient = require('mongodb').MongoClient;


// Connection URI
const uri = process.env.mongo_url; // Change this to your MongoDB server URI

const client = new MongoClient(uri);
var database;

async function connectToMongoDB() {
    try {
        database = client.db('class'); // Specify the database name

    } catch (err) {
        console.error('Error connecting to MongoDB:', err);
    }
}
connectToMongoDB();

app.listen(process.env.PORT, connectToMongoDB(), () => {
    console.log('app running fast');
})

app.get('/classDetails', async (req, res) => {
    let response = await database.collection('classDetails').find({}).toArray()
    if (response) {
        res.send(response)
    }
})


app.get('/lectureDetails/:classId', async (req, res) => {
    const { classId } = req.params
    let response = await database.collection('lectureDetails').find({classId : classId}).toArray()
    if (response) {
        res.send(response)
    }
})


app.get('/contentDetails/:classId/:lec_id', async (req, res) => {
    const { classId,lec_id} = req.params
    let response = await database.collection('contentDetails').find({classId : classId,lec_id:lec_id}).toArray()
    if (response) {
        res.send(response)
    }
})



app.post('/upsertContentDetails', async (req, res) => {
    let body = req.body
    let response = await database.collection('contentDetails').insertOne(body)
    if (response) {
        res.send({ status: 200, response: 'Content uploaded sucessfully' })
    } else {
        res.send({ status: 400, response: 'something went wrong' })

    }
})





