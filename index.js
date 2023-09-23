const express = require("express");
const app = express();
app.use(express.urlencoded({ extended: false }));
app.use(express.json());
const cors = require("cors");
const dotenv = require("dotenv");
const { v4: uuidv4 } = require("uuid");
const http = require("http")
const { ObjectId } = require("mongodb");
dotenv.config();
app.use(cors());

const fs  = require('fs')
const { google }=  require('googleapis')
const apiKeys = require('./apiKey.json')





// Connection URI
const MongoClient = require('mongodb').MongoClient;
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
    let response = await database.collection('lectureDetails').find({ classId: classId }).toArray()
    if (response) {
        res.send(response)
    }
})


app.get('/contentDetails/:classId/:lec_id', async (req, res) => {
    const { classId, lec_id } = req.params
    let response = await database.collection('contentDetails').find({ classId: classId, lec_id: lec_id }).toArray()
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



// Integrate Server
const server = http.createServer(app);
const { Server } = require("socket.io");
const io = new Server(server);




io.on("connection", (socket) => {
    // Emit a message to the client
    socket.on("message", (msg) => {
        io.emit("message", msg);
    });

    socket.on("notification", (msg) => {
        io.emit("notification", msg);
    });

    socket.on("live", (msg) => {
        io.emit("live", msg);
    });


    socket.on("credentials", (msg) => {
        io.emit("credentials", msg);
    });


});


app.post("/live", async (req, res) => {
    const { lec_id, live } = req.body
    let response = await database.collection('contentDetails').updateOne(
        { _id: new ObjectId(lec_id) },
        {
            $set:
            {
                live: live,
                date: Date()
            }
        },       { upsert: true }
    )
    if (response) {
        res.send({ status: 200, message: 'Content gone live successfull !' });
    } else {
        res.send({ status: 403, message: 'Something went wrong !' });

    }




});



const scope = ["https://www.googleapis.com/auth/drive"]

async function authorize(){
    const jwtClient = new google.auth.JWT(
        apiKeys.client_email,
        null,
        apiKeys.private_key,
        scope
    )

    await jwtClient.authorize()

    return jwtClient;
}

async function uploadFile(authClient){
    return new Promise((resolve,rejected)=>{

        const drive = google.drive({version:'v3',auth:authClient})

        var fileMetaData =  {
            name : 'photo.png',
            parents : ["1CBsb1iOv_zEVn3A8JdxiiH3nWOrcUXpI"]
        }

        drive.files.create({
            resource:fileMetaData,
            media : {
                body : fs.createReadStream('files/photo.png'),
                mimetype : 'image/png'   
            },
            fields : 'id'
        },function (err,file){
            if(err){
                return rejected(err)
            }
            resolve(file)
        })

    })
}


authorize().then(uploadFile).catch('E')

