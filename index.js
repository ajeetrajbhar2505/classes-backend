const express = require("express");
const app = express();
app.use(express.urlencoded({ extended: false }));
app.use(express.json());
const cors = require("cors");
const dotenv = require("dotenv");
const { v4: uuidv4 } = require("uuid");
const http = require("http");
const { ObjectId } = require("mongodb");
const multer = require("multer");
const path = require("path");
dotenv.config();
app.use(cors());

const nodemailer = require("nodemailer");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const genAI = new GoogleGenerativeAI(process.env.gemini_api_key);


const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    // TODO: replace `user` and `pass` values from <https://forwardemail.net>
    user: "ajeetrajbhar2504@gmail.com",
    pass: "yhjm bskd feyc ezmo",
  },
});

const fs = require("fs");
const { google } = require("googleapis");
const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;

// Serve static files from the 'public' directory
app.use(express.static(__dirname + "/public"));

// Configure session middleware
app.use(
  require("express-session")({
    secret: process.env.private_key,
    resave: true,
    saveUninitialized: true,
  })
);

// Initialize Passport
app.use(passport.initialize());
app.use(passport.session());

// Connection URI
const MongoClient = require("mongodb").MongoClient;
const uri = process.env.mongo_url; // Change this to your MongoDB server URI

const client = new MongoClient(uri);
var database;
async function connectToMongoDB() {
  try {
    database = client.db("class"); // Specify the database name
    if (database) {
      console.log("database connected!");
    }
  } catch (err) {
    console.error("Error connecting to MongoDB:", err);
  }
}

// Authorization function middleware
async function authorizeToken(req, res, next) {
  // Get the token from the request
  if (!req.headers.authorization) {
    return res.sendFile(__dirname + "/public/index.html");
  }
  const token = req.headers.authorization.substring("Bearer ".length);
  if (!token) {
    return res.sendFile(__dirname + "/public/index.html");
  }

  try {
    const tokenExists = await database
      .collection("tokens")
      .findOne({ _id: new ObjectId(token) });
    if (!tokenExists) {
      return res.sendFile(__dirname + "/public/index.html");
    }

    // Continue with the route handling
    next();
  } catch (error) {
    return res.status(401).send("Unauthorized");
  }
}

app.get("/classDetails", authorizeToken, async (req, res) => {
  try {
    const response = await database.collection("classDetails").find({}).toArray();
    res.status(200).send({ status: 200, response: response });
  } catch (error) {
    console.error("Error in classDetails:", error);
    res.status(500).send({ status: 500, error: "Internal Server Error" });
  }
});

app.get("/mostWatched", authorizeToken, async (req, res) => {
  try {
    const pipeline = [
      {
        $match: {
          "viewers": { $exists: true, $not: { $size: 0 } }
        }
      },
      {
        $project: {
          _id: 1,
          classId: 1,
          lec_id: 1,
          content_icon: 1,
          content_link: 1,
          content_title: 1,
          content: 1,
          published_at: 1,
          author: 1,
          authorId: 1,
          viewers: 1
        }
      },
      {
        $unwind: "$viewers"
      },
      {
        $group: {
          _id: "$_id",
          classId: { $first: "$classId" },
          lec_id: { $first: "$lec_id" },
          content_icon: { $first: "$content_icon" },
          content_link: { $first: "$content_link" },
          content_title: { $first: "$content_title" },
          content: { $first: "$content" },
          published_at: { $first: "$published_at" },
          author: { $first: "$author" },
          authorId: { $first: "$authorId" },
          totalWatchcount: { $sum: "$viewers.multipleWatchcount" }
        }
      },
      {
        $match: {
          totalWatchcount: { $gt: 0 }
        }
      },
      {
        $sort: { totalWatchcount: -1 }
      }
    ];

    const response = await database.collection("contentDetails").aggregate(pipeline).toArray();
    res.status(200).send({ status: 200, response: response });
  } catch (error) {
    console.error("Error in mostWatched:", error);
    res.status(500).send({ status: 500, error: "Internal Server Error" });
  }
});



app.get("/lectureDetails", authorizeToken, async (req, res) => {
  try {
    const { classId } = req.params;
    const response = await database.collection("lectureDetails").find({}).toArray();
    res.status(200).send({ status: 200, response: response });
  } catch (error) {
    console.error("Error in lectureDetails:", error);
    res.status(500).send({ status: 500, error: "Internal Server Error" });
  }
});

app.get("/lectureDetails/:classId", authorizeToken, async (req, res) => {
  try {
    const { classId } = req.params;
    const response = await database.collection("lectureDetails").find({ classId: classId }).toArray();
    res.status(200).send({ status: 200, response: response });
  } catch (error) {
    console.error("Error in lectureDetails:", error);
    res.status(500).send({ status: 500, error: "Internal Server Error" });
  }
});

app.post("/upsertGroup", authorizeToken, async (req, res) => {
  try {
    const response = await database.collection("classDetails").insertOne(req.body)
    if (response.insertedCount > 0) {
      res.status(200).send({ status: 200, response: response.ops });
    } else {
      res.status(200).send({ status: 200, response: "Something went wrong" });
    }
  } catch (error) {
    console.error("Error in lectureDetails:", error);
    res.status(500).send({ status: 500, error: "Internal Server Error" });
  }
});

app.post("/upsertLecture", authorizeToken, async (req, res) => {
  try {
    const response = await database.collection("lectureDetails").insertOne(req.body)
    if (response.insertedCount > 0) {
      res.status(200).send({ status: 200, response: response.ops });
    } else {
      res.status(200).send({ status: 200, response: "Something went wrong" });
    }
  } catch (error) {
    console.error("Error in lectureDetails:", error);
    res.status(500).send({ status: 500, error: "Internal Server Error" });
  }
});

app.post("/upsertAttemptedUsers", authorizeToken, async (req, res) => {
  const user = req.body.userProfile;
  const paperId = new ObjectId(req.body.paperId);

  try {
    const filter = { _id: paperId };
    const existingDocument = await database.collection("quizes").findOne(filter);

    if (existingDocument) {
      // Check if the users array exists
      if (existingDocument.users) {
        const existingUserIndex = existingDocument.users.findIndex(u => u.userId === user.userId);

        if (existingUserIndex !== -1) {
          // If the user exists, update the multipleAttemptCount
          const updateOperation = {
            $inc: { [`users.${existingUserIndex}.multipleAttemptCount`]: 1 },
            $set: { [`users.${existingUserIndex}.time`]: new Date().toISOString() }
          };

          await database.collection("quizes").updateOne(filter, updateOperation);
        } else {
          // If the user doesn't exist, add the new user
          const pushOperation = {
            $push: {
              users: {
                userId: user.userId,
                time: new Date().toISOString(),
                multipleAttemptCount: 1
              }
            }
          };

          await database.collection("quizes").updateOne(filter, pushOperation);
        }
      } else {
        // If the users array doesn't exist, create it with the user
        const setOperation = {
          $set: {
            users: [{
              userId: user.userId,
              time: new Date().toISOString(),
              multipleAttemptCount: 1
            }]
          }
        };

        await database.collection("quizes").updateOne(filter, setOperation);
      }
    } else {
      // If the document doesn't exist, create it with the user
      const insertOperation = {
        _id: paperId,
        users: [{
          userId: user.userId,
          time: new Date().toISOString(),
          multipleAttemptCount: 1
        }]
      };

      await database.collection("quizes").insertOne(insertOperation);
    }

    res.status(200).send({ status: 200, response: "User updated/added successfully" });
  } catch (error) {
    console.error("Error in upsertAttemptedUsers:", error);
    res.status(500).send({ status: 500, error: "Internal Server Error" });
  }
});



app.post("/upsertViewCount", authorizeToken, async (req, res) => {
  const user = req.body.userProfile;
  const contentId = new ObjectId(req.body.contentId);

  try {
    const filter = { _id: contentId };
    const existingDocument = await database.collection("contentDetails").findOne(filter);

    if (existingDocument) {
      // Check if the users array exists
      if (existingDocument.viewers) {
        const existingUserIndex = existingDocument.viewers.findIndex(u => u.userId === user.userid);

        if (existingUserIndex !== -1) {
          // If the user exists, update the multipleWatchcount
          const updateOperation = {
            $inc: { [`viewers.${existingUserIndex}.multipleWatchcount`]: 1 },
            $set: { [`viewers.${existingUserIndex}.datetime`]: new Date().toISOString() }
          };

          await database.collection("contentDetails").updateOne(filter, updateOperation);
        } else {
          // If the user doesn't exist, add the new user
          const pushOperation = {
            $push: {
              viewers: {
                userId: user.userid,
                datetime: new Date().toISOString(),
                multipleWatchcount: 1
              }
            }
          };

          await database.collection("contentDetails").updateOne(filter, pushOperation);
        }
      } else {
        // If the viewers array doesn't exist, create it with the user
        const setOperation = {
          $set: {
            viewers: [{
              userId: user.userid,
              datetime: new Date().toISOString(),
              multipleWatchcount: 1
            }]
          }
        };

        await database.collection("contentDetails").updateOne(filter, setOperation, { upsert: true });
      }
    } else {
      // If the document doesn't exist, create it with the user
      const insertOperation = {
        _id: contentId,
        viewers: [{
          userId: user.userid,
          datetime: new Date().toISOString(),
          multipleAttemptCount: 1
        }]
      };

      await database.collection("contentDetails").insertOne(insertOperation);
    }

    res.status(200).send({ status: 200, response: "User updated/added successfully" });
  } catch (error) {
    console.error("Error in upsertViewCount:", error);
    res.status(500).send({ status: 500, error: "Internal Server Error" });
  }
});


app.get("/scoreCard", authorizeToken, async (req, res) => {
  try {


    const result = await database.collection('users').aggregate([
      {
        '$project': {
          'user_id': {
            '$toString': '$_id'
          },
          'picture': 1,
          'email': 1,
          'name': 1,
          'address1': 1
        }
      },
      {
        '$lookup': {
          'from': 'quizes',
          'let': { 'user_id': '$user_id' },
          'pipeline': [
            {
              '$unwind': '$users'
            },
            {
              '$match': {
                '$expr': {
                  '$eq': ['$users.userId', '$$user_id']
                }
              }
            }
          ],
          'as': 'quizAttempts'
        }
      }
    ]).toArray();




    res.status(200).send({ status: 200, response: result });
  } catch (error) {
    console.error("Error in fetching popular lecture details:", error);
    res.status(500).send({ status: 500, error: "Internal Server Error" });
  }
});


app.get("/popular_lectureDetails", authorizeToken, async (req, res) => {
  try {

    const result = await database.collection('lectureDetails').aggregate([
      {
        $project: {
          lec_id: { '$toString': '$_id' },
          lec_icon: 1,
          lec_title: 1,
          classId: 1
        }
      },
      {
        $lookup: {
          from: 'quizes',
          localField: 'lec_id',
          foreignField: 'lec_id',
          as: 'quizDetails'
        }
      },
      {
        $unwind: '$quizDetails'
      },
      {
        $unwind: '$quizDetails.users'
      },
      {
        $group: {
          _id: '$_id',
          lec_id: { $first: '$lec_id' },
          lec_icon: { $first: '$lec_icon' },
          lec_title: { $first: '$lec_title' },
          classId: { $first: '$classId' },
          quizDetails: { $push: '$quizDetails' },
          uniqueUsers: { $addToSet: '$quizDetails.users' }
        }
      },
      {
        $addFields: {
          quizDetailsCount: { $size: '$quizDetails' },
          usersCount: { $size: '$uniqueUsers' }
        }
      },
      {
        $project: {
          lec_id: 1,
          lec_icon: 1,
          lec_title: 1,
          classId: 1,
          quizDetailsCount: 1,
          usersCount: 1,
          quizDetails: 1
        }
      },
    ]).toArray();



    res.status(200).send({ status: 200, response: result });
  } catch (error) {
    console.error("Error in fetching popular lecture details:", error);
    res.status(500).send({ status: 500, error: "Internal Server Error" });
  }
});



app.post("/upsertWatchTime", authorizeToken, async (req, res) => {
  const contentId = new ObjectId(req.body.contentId);
  const viewer = req.body.userProfile;

  try {
    // Update existing viewer based on userId
    const updateOperation = {
      $set: {
        "viewers.$[element].datetime": new Date().toISOString(),
        "viewers.$[element].watchTime": viewer.watchTime,
        "viewers.$[element].duration": viewer.duration,
      }
    };

    const arrayFilters = [
      { "element.userId": viewer.userid }
    ];

    const updateResponse = await database.collection("contentDetails").updateOne(
      { _id: contentId },
      updateOperation,
      { arrayFilters: arrayFilters }
    );

    // If no document matched for the update, add the new viewer
    if (updateResponse.matchedCount === 0) {
      const pushOperation = {
        $push: { viewers: viewer } // Add the new viewer
      };

      await database.collection("contentDetails").updateOne(
        { _id: contentId },
        pushOperation,
        { upsert: true }
      );
    }

    res.status(200).send({ status: 200, response: "Operation performed successfully" });
  } catch (error) {
    console.error("Error in upsertWatchTime:", error);
    res.status(500).send({ status: 500, error: "Internal Server Error" });
  }
});





app.post("/upsertUsersResponse", authorizeToken, async (req, res) => {
  const user = req.body.userProfile;
  const paperId = new ObjectId(req.body.paperId);
  const { scored, totalMarks } = user;

  try {
    const filter = { _id: paperId };
    const updateOperation = {
      $set: {
        [`users.$[elem].scored`]: scored,
        [`users.$[elem].totalMarks`]: totalMarks
      },
    };
    const arrayFilters = [{ "elem.userId": user.userId }];

    const result = await database.collection("quizes").updateOne(
      filter,
      updateOperation,
      { upsert: true, arrayFilters: arrayFilters }
    );

    if (result.modifiedCount === 0 && result.upsertedCount === 0) {
      // If neither modified nor upserted, it means the document already existed with the same values
      res.status(200).send({ status: 200, response: "User already existed with the same values" });
    } else {
      res.status(200).send({ status: 200, response: "User updated/added successfully" });
    }
  } catch (error) {
    console.error("Error in upsertUsersResponse:", error);
    res.status(500).send({ status: 500, error: "Internal Server Error" });
  }
});




app.get("/contentDetails/:classId/:lec_id", authorizeToken, async (req, res) => {
  try {
    const { classId, lec_id } = req.params;
    const response = await database
      .collection("contentDetails")
      .find({ classId: classId, lec_id: lec_id })
      .toArray();

    res.status(200).send({ status: 200, response: response });
  } catch (error) {
    console.error("Error in contentDetails:", error);
    res.status(500).send({ status: 500, error: "Internal Server Error" });
  }
});

app.get("/content/:content_id", authorizeToken, async (req, res) => {
  try {
    const { content_id } = req.params;
    const response = await database
      .collection("contentDetails")
      .findOne({ _id: new ObjectId(content_id) })
    if (response && response.viewers) {
      for (let i = 0; i < response.viewers.length; i++) {
        const viewer = response.viewers[i].userId;
        const userResponse = await database
          .collection("users")
          .find({ _id: new ObjectId(viewer) }).project({ name: 1, picture: 1 }).toArray()
        response.viewers[i] = { ...response.viewers[i], ...userResponse[0] }
      }
    }

    res.status(200).send({ status: 200, response: response });
  } catch (error) {
    console.error("Error in content:", error);
    res.status(500).send({ status: 500, error: "Internal Server Error" });
  }
});

app.get("/notifications", authorizeToken, async (req, res) => {
  try {
    const response = await database.collection("notifications").find({}).toArray();
    const token = req.headers.authorization.substring("Bearer ".length);
    const userData = await verifyTokenAndFetchUser(token);

    if (response && userData) {
      const filteredResponse = response.filter(
        (notification) => notification.authorId !== userData.userId
      );

      res.status(200).send({ status: 200, response: filteredResponse });
    } else {
      res.status(200).send({ status: 200, response: "Something went wrong" });
    }
  } catch (error) {
    console.error("Error in notifications:", error);
    res.status(500).send({ status: 500, error: "Internal Server Error" });
  }
});

app.get("/contentDetails", authorizeToken, async (req, res) => {
  try {
    const response = await database.collection("contentDetails").find({}).toArray();
    res.status(200).send({ status: 200, response: response });
  } catch (error) {
    console.error("Error in contentDetails:", error);
    res.status(500).send({ status: 500, error: "Internal Server Error" });
  }
});

app.post("/search_contentDetails", authorizeToken, async (req, res) => {
  try {
    const { searchText } = req.body;

    // Using a regular expression for case-insensitive search
    const query = { "content_title": { $regex: new RegExp(searchText, 'i') } };

    // Fetching data from MongoDB
    const response = await database.collection("contentDetails").find(query).toArray();

    res.status(200).send({ status: 200, response: response });
  } catch (error) {
    console.error("Error in search_contentDetails:", error);
    res.status(500).send({ status: 500, error: "Internal Server Error" });
  }
});

app.get("/calenderDetails/:desiredMonth", authorizeToken, async (req, res) => {
  const { desiredMonth } = req.params;
  try {
    const response = await database
      .collection("calenderDetails")
      .find({ month: desiredMonth })
      .toArray();

    res.status(200).send({ status: 200, response: response });
  } catch (error) {
    console.error("Error in calenderDetails:", error);
    res.status(500).send({ status: 500, error: "Internal Server Error" });
  }
});

app.post("/upsertCalenderDetails", authorizeToken, async (req, res) => {
  try {
    const response = await database
      .collection("calenderDetails")
      .insertOne(req.body);

    if (response.insertedCount > 0) {
      res.status(200).send({ status: 200, response: response.ops });
    } else {
      res.status(200).send({ status: 200, response: "Something went wrong" });
    }
  } catch (error) {
    console.error("Error in upsertCalenderDetails:", error);
    res.status(500).send({ status: 500, error: "Internal Server Error" });
  }
});

app.get("/Querries/:contentId", authorizeToken, async (req, res) => {
  const { contentId } = req.params;
  try {
    const response = await database
      .collection("Querries")
      .find({ contentId: contentId })
      .toArray();

    res.status(200).send({ status: 200, response: response });
  } catch (error) {
    console.error("Error in Querries:", error);
    res.status(500).send({ status: 500, error: "Internal Server Error" });
  }
});

app.post("/register", async (req, res) => {
  try {
    const response = await database
      .collection("users")
      .insertOne(req.body);

    if (response.insertedCount > 0) {
      res.status(200).send({ status: 200, response: response.ops });
    } else {
      res.status(200).send({ status: 200, response: "Something went wrong" });
    }
  } catch (error) {
    console.error("Error in register:", error);
    res.status(500).send({ status: 500, error: "Internal Server Error" });
  }
});

app.post("/upsertUserQuerries", async (req, res) => {
  try {
    const notificationsBody = req.body.notification;
    delete req.body.notification;
    const body = req.body;
    const token = req.headers.authorization.substring("Bearer ".length);

    const userData = await verifyTokenAndFetchUser(token);

    if (userData) {
      // Merge the user data with the query body
      Object.assign(body, {
        author: userData.author,
        authorId: userData.userId,
        authorProfile: userData.authorProfile,
        date: new Date(),
      });
    }

    const response = await database.collection("Querries").insertOne(body);
    Object.assign(body, { _id: response.insertedId.toString() });

    if (response.insertedCount > 0) {
      // Send the query as a response
      io.emit(body.contentId, body);

      // Create a notification object and insert it into the "notifications" collection
      const notification = Object.assign(notificationsBody, {
        author: body.author,
        authorId: body.authorId,
        contentId: body.contentId,
        info: ` Hello ${body.author}, I have a question on topic ${notificationsBody.topic}. Can you please assist me?`,
        notificationDate: new Date(),
      });

      const notificationResponse = await database
        .collection("notifications")
        .insertOne(notification);
      io.emit("notification", notification);

      res.status(200).send({ status: 200, response: "Message sent successfully!" });
    } else {
      res.status(200).send({ status: 200, response: "Something went wrong" });
    }
  } catch (error) {
    console.error("Error in upsertUserQuerries:", error);
    res.status(500).send({ status: 500, error: "Internal server error" });
  }
});


app.post("/upsertTeacherResponse", async (req, res) => {
  try {
    const notificationsBody = req.body.notification;
    delete req.body.notification;
    const body = req.body;
    const token = req.headers.authorization.substring("Bearer ".length);

    const userData = await verifyTokenAndFetchUser(token);

    if (userData) {
      // Merge the user data with the body
      Object.assign(body, {
        teacher: userData.author,
        teacherId: userData.userId,
        responseDate: new Date(),
      });

      let response = await database.collection("Querries").updateOne(
        { _id: new ObjectId(body.id) },
        {
          $set: body,
        },
        { upsert: true }
      );

      if (response.modifiedCount === 1) {
        // Document was successfully updated

        // Retrieve the updated document
        const updatedDocument = await database.collection("Querries").findOne({
          _id: new ObjectId(body.id),
        });

        if (updatedDocument) {
          // Send the updated document as a response to the user
          io.emit(body.contentId, updatedDocument);

          // Create a notification object and insert it into the "notifications" collection
          const notification = Object.assign(notificationsBody, {
            author: body.teacher,
            authorId: body.teacherId,
            contentId: body.contentId,
            info: `Teacher ${body.teacher} has answered your question! on topic ${notificationsBody.topic}`,
            notificationDate: new Date(),
          });

          let notificationResponse = await database
            .collection("notifications")
            .insertOne(notification);
          io.emit("notification", notification);
          res.send({ status: 200, message: "Content gone live successfully!" });
        } else {
          // Handle the case when the document retrieval fails
          res
            .status(500)
            .json({ error: "Failed to retrieve the updated document." });
        }
      } else {
        // Handle the case when the document update fails
        res.status(500).json({ error: "Failed to update the document." });
      }
    } else {
      // Handle the case when token verification fails
      res.status(401).json({ error: "Unauthorized" });
    }
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
  }
});

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

server.listen(process.env.PORT, connectToMongoDB(), () => {
  console.log("app running faster");
});

app.post("/live", authorizeToken, async (req, res) => {
  const { lec_id, live } = req.body;
  let response = await database.collection("contentDetails").updateOne(
    { _id: new ObjectId(lec_id) },
    {
      $set: {
        live: live,
        date: Date(),
      },
    },
    { upsert: true }
  );
  if (response) {
    res.send({ status: 200, message: "Content gone live successfull !" });
  } else {
    res.send({ status: 403, message: "Something went wrong !" });
  }
});

app.post("/quizes", authorizeToken, async (req, res) => {
  try {
    let response = await database.collection("quizes").insertOne(req.body);
    if (response) {
      res.send({ status: 200, response: "Quiz uploaded successfully" });
    } else {
      res.send({ status: 200, response: "Something went wrong" });
    }
  } catch (error) {
    res.send({ status: 500, response: "Internal server error" });
  }
});

app.get("/fetchquizes/:classId/:lec_id", authorizeToken, async (req, res) => {
  const { classId, lec_id } = req.params;
  try {
    const classDetails = await database
      .collection("classDetails")
      .find({ _id: new ObjectId(classId) })
      .toArray();
    if (classDetails.length === 0) {
      return res.status(404).send({ status: 404, response: "Class not found" });
    }
    const className = classDetails[0].classNamme || "";
    const response = await database
      .collection("quizes")
      .find({ classId, lec_id })
      .toArray();
    response.forEach((element) => {
      element.className = className;
    });
    if (response) {
      res.send({ status: 200, response: response });
    } else {
      res.send({ status: 200, response: "Something went wrong" });
    }
  } catch (error) {
    res.send({ status: 500, response: "Internal server error" });
  }
});

app.get("/fetchpaper/:paperId", authorizeToken, async (req, res) => {
  const { paperId } = req.params;
  try {
    const response = await database
      .collection("quizes")
      .findOne({ _id: new ObjectId(paperId) });
    if (response) {
      res.send({ status: 200, response: response });
    } else {
      res.send({ status: 200, response: "Something went wrong" });
    }
  } catch (error) {
    res.send({ status: 500, response: "Internal server error" });
  }
});


app.post("/verifyOTP", async (req, res) => {
  try {
    const { otp } = req.body;

    // Check if OTP exists in the "tokens" collection
    const tokenResponse = await database.collection("tokens").findOne({ otp: otp });

    if (tokenResponse) {
      // If OTP is valid, retrieve user information from the "users" collection
      const userId = tokenResponse.userId;
      const usersResponse = await database.collection("users").findOne({ _id: new ObjectId(userId) });

      if (usersResponse) {
        // Send a successful response with user details
        return res.status(200).send({
          status: 200,
          response: {
            userId: userId,
            token: tokenResponse._id.toString(),
            picture: usersResponse.picture
          },
        });
      } else {
        // Handle the case where user information is not found
        res.status(500).send({ status: 500, response: "User not found" });
      }
    } else {
      // Handle the case where the OTP is invalid
      res.status(204).send({ status: 204, response: "OTP is invalid" });
    }
  } catch (error) {
    // Handle other errors
    console.error(error);
    res.status(500).send({ status: 500, response: "Internal server error" });
  }
})

app.post("/Login", async (req, res) => {
  const { username, password } = req.body;
  try {
    const userExists = await database
      .collection("users")
      .findOne({ email: username, password: password });
    if (userExists) {
      const otp = generateOTP();
      await database.collection("users").updateOne(
        { _id: new ObjectId(userExists._id) },
        {
          $set: {
            logged: true,
            date: Date(),
          },
        },
        { upsert: true }
      );
      // User exists, check for an token'
      const createToken = await database.collection("tokens").insertOne({
        userId: userExists._id.toString(),
        email: userExists.email,
        dateTime: new Date(),
        otp: otp,
      });

      var mailOption = {
        from: "ajeetrajbhar2504@gmail.com",
        to: userExists.email,
        subject: "A one-time password of Class App",
        html: `<!DOCTYPE HTML PUBLIC "-//W3C//DTD XHTML 1.0 Transitional //EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
        <html xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
        <head>
        <!--[if gte mso 9]>
        <xml>
          <o:OfficeDocumentSettings>
            <o:AllowPNG/>
            <o:PixelsPerInch>96</o:PixelsPerInch>
          </o:OfficeDocumentSettings>
        </xml>
        <![endif]-->
          <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <meta name="x-apple-disable-message-reformatting">
          <!--[if !mso]><!--><meta http-equiv="X-UA-Compatible" content="IE=edge"><!--<![endif]-->
          <title></title>
          
            <style type="text/css">
              @media only screen and (min-width: 620px) {
          .u-row {
            width: 600px !important;
          }
          .u-row .u-col {
            vertical-align: top;
          }
        
          .u-row .u-col-33p33 {
            width: 199.98px !important;
          }
        
          .u-row .u-col-100 {
            width: 600px !important;
          }
        
        }
        
        @media (max-width: 620px) {
          .u-row-container {
            max-width: 100% !important;
            padding-left: 0px !important;
            padding-right: 0px !important;
          }
          .u-row .u-col {
            min-width: 320px !important;
            max-width: 100% !important;
            display: block !important;
          }
          .u-row {
            width: 100% !important;
          }
          .u-col {
            width: 100% !important;
          }
          .u-col > div {
            margin: 0 auto;
          }
        }
        body {
          margin: 0;
          padding: 0;
        }
        
        table,
        tr,
        td {
          vertical-align: top;
          border-collapse: collapse;
        }
        
        p {
          margin: 0;
        }
        
        .ie-container table,
        .mso-container table {
          table-layout: fixed;
        }
        
        * {
          line-height: inherit;
        }
        
        a[x-apple-data-detectors='true'] {
          color: inherit !important;
          text-decoration: none !important;
        }
        
        @media (max-width: 480px) {
          .hide-mobile {
            max-height: 0px;
            overflow: hidden;
            display: none !important;
          }
        }
        
        table, td { color: #000000; } #u_body a { color: #0000ee; text-decoration: underline; } @media (max-width: 480px) { #u_content_button_1 .v-size-width { width: 76% !important; } }
            </style>
          
          
        
        <!--[if !mso]><!--><link href="https://fonts.googleapis.com/css?family=Montserrat:400,700&display=swap" rel="stylesheet" type="text/css"><link href="https://fonts.googleapis.com/css?family=Open+Sans:400,700&display=swap" rel="stylesheet" type="text/css"><!--<![endif]-->
        
        </head>
        
        <body class="clean-body u_body" style="margin: 0;padding: 0;-webkit-text-size-adjust: 100%;background-color: #f0f0f0;color: #000000">
          <!--[if IE]><div class="ie-container"><![endif]-->
          <!--[if mso]><div class="mso-container"><![endif]-->
          <table id="u_body" style="border-collapse: collapse;table-layout: fixed;border-spacing: 0;mso-table-lspace: 0pt;mso-table-rspace: 0pt;vertical-align: top;min-width: 320px;Margin: 0 auto;background-color: #f0f0f0;width:100%" cellpadding="0" cellspacing="0">
          <tbody>
          <tr style="vertical-align: top">
            <td style="word-break: break-word;border-collapse: collapse !important;vertical-align: top">
            <!--[if (mso)|(IE)]><table width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td align="center" style="background-color: #f0f0f0;"><![endif]-->
            
          
          
        <div class="u-row-container" style="padding: 0px;background-color: transparent">
          <div class="u-row" style="margin: 0 auto;min-width: 320px;max-width: 600px;overflow-wrap: break-word;word-wrap: break-word;word-break: break-word;background-color: transparent;">
            <div style="border-collapse: collapse;display: table;width: 100%;height: 100%;background-color: transparent;">
              <!--[if (mso)|(IE)]><table width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td style="padding: 0px;background-color: transparent;" align="center"><table cellpadding="0" cellspacing="0" border="0" style="width:600px;"><tr style="background-color: transparent;"><![endif]-->
              
        <!--[if (mso)|(IE)]><td align="center" width="600" style="background-color: #ddffe7;width: 600px;padding: 0px;border-top: 0px solid transparent;border-left: 0px solid transparent;border-right: 0px solid transparent;border-bottom: 0px solid transparent;" valign="top"><![endif]-->
        <div class="u-col u-col-100" style="max-width: 320px;min-width: 600px;display: table-cell;vertical-align: top;">
          <div style="background-color: #ddffe7;height: 100%;width: 100% !important;">
          <!--[if (!mso)&(!IE)]><!--><div style="box-sizing: border-box; height: 100%; padding: 0px;border-top: 0px solid transparent;border-left: 0px solid transparent;border-right: 0px solid transparent;border-bottom: 0px solid transparent;"><!--<![endif]-->
          
        <table style="font-family:arial,helvetica,sans-serif;" role="presentation" cellpadding="0" cellspacing="0" width="100%" border="0">
          <tbody>
            <tr>
              <td style="overflow-wrap:break-word;word-break:break-word;padding:10px;font-family:arial,helvetica,sans-serif;" align="left">
                
        <table width="100%" cellpadding="0" cellspacing="0" border="0">
          <tr>
            <td style="padding-right: 0px;padding-left: 0px;" align="center">
              
              <img align="center" border="0" src="images/image-4.png" alt="image" title="image" style="outline: none;text-decoration: none;-ms-interpolation-mode: bicubic;clear: both;display: inline-block !important;border: none;height: auto;float: none;width: 100%;max-width: 190px;" width="190"/>
              
            </td>
          </tr>
        </table>
        
              </td>
            </tr>
          </tbody>
        </table>
        
          <!--[if (!mso)&(!IE)]><!--></div><!--<![endif]-->
          </div>
        </div>
        <!--[if (mso)|(IE)]></td><![endif]-->
              <!--[if (mso)|(IE)]></tr></table></td></tr></table><![endif]-->
            </div>
          </div>
          </div>
          
        
        
          
          
        <div class="u-row-container" style="padding: 0px;background-color: transparent">
          <div class="u-row" style="margin: 0 auto;min-width: 320px;max-width: 600px;overflow-wrap: break-word;word-wrap: break-word;word-break: break-word;background-color: transparent;">
            <div style="border-collapse: collapse;display: table;width: 100%;height: 100%;background-color: transparent;">
              <!--[if (mso)|(IE)]><table width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td style="padding: 0px;background-color: transparent;" align="center"><table cellpadding="0" cellspacing="0" border="0" style="width:600px;"><tr style="background-color: transparent;"><![endif]-->
              
        <!--[if (mso)|(IE)]><td align="center" width="600" style="background-color: #ffffff;width: 600px;padding: 0px;border-top: 0px solid transparent;border-left: 0px solid transparent;border-right: 0px solid transparent;border-bottom: 0px solid transparent;border-radius: 0px;-webkit-border-radius: 0px; -moz-border-radius: 0px;" valign="top"><![endif]-->
        <div class="u-col u-col-100" style="max-width: 320px;min-width: 600px;display: table-cell;vertical-align: top;">
          <div style="background-color: #ffffff;height: 100%;width: 100% !important;border-radius: 0px;-webkit-border-radius: 0px; -moz-border-radius: 0px;">
          <!--[if (!mso)&(!IE)]><!--><div style="box-sizing: border-box; height: 100%; padding: 0px;border-top: 0px solid transparent;border-left: 0px solid transparent;border-right: 0px solid transparent;border-bottom: 0px solid transparent;border-radius: 0px;-webkit-border-radius: 0px; -moz-border-radius: 0px;"><!--<![endif]-->
          
        <table style="font-family:arial,helvetica,sans-serif;" role="presentation" cellpadding="0" cellspacing="0" width="100%" border="0">
          <tbody>
            <tr>
              <td style="overflow-wrap:break-word;word-break:break-word;padding:30px 10px 10px;font-family:arial,helvetica,sans-serif;" align="left">
                
          <!--[if mso]><table width="100%"><tr><td><![endif]-->
            <h1 style="margin: 0px; line-height: 140%; text-align: center; word-wrap: break-word; font-family: 'Montserrat',sans-serif; font-size: 22px; font-weight: 700;"><span><span>Your one-time code is</span></span></h1>
          <!--[if mso]></td></tr></table><![endif]-->
        
              </td>
            </tr>
          </tbody>
        </table>
        
        <table style="font-family:arial,helvetica,sans-serif;" role="presentation" cellpadding="0" cellspacing="0" width="100%" border="0">
          <tbody>
            <tr>
              <td style="overflow-wrap:break-word;word-break:break-word;padding:10px;font-family:arial,helvetica,sans-serif;" align="left">
                
          <!--[if mso]><style>.v-button {background: transparent !important;}</style><![endif]-->
        <div align="center">
          <!--[if mso]><v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="https://unlayer.com" style="height:42px; v-text-anchor:middle; width:216px;" arcsize="0%"  strokecolor="#000000" strokeweight="2px" fillcolor="#ffffff"><w:anchorlock/><center style="color:#000000;"><![endif]-->
            <a href="https://unlayer.com" target="_blank" class="v-button v-size-width" style="box-sizing: border-box;display: inline-block;text-decoration: none;-webkit-text-size-adjust: none;text-align: center;color: #000000; background-color: #ffffff; border-radius: 0px;-webkit-border-radius: 0px; -moz-border-radius: 0px; width:38%; max-width:100%; overflow-wrap: break-word; word-break: break-word; word-wrap:break-word; mso-border-alt: none;border-top-color: #000000; border-top-style: solid; border-top-width: 2px; border-left-color: #000000; border-left-style: solid; border-left-width: 2px; border-right-color: #000000; border-right-style: solid; border-right-width: 2px; border-bottom-color: #000000; border-bottom-style: solid; border-bottom-width: 2px;font-size: 18px;">
              <span style="display:block;padding:10px 20px;line-height:120%;">264301</span>
            </a>
            <!--[if mso]></center></v:roundrect><![endif]-->
        </div>
        
              </td>
            </tr>
          </tbody>
        </table>
        
        <table style="font-family:arial,helvetica,sans-serif;" role="presentation" cellpadding="0" cellspacing="0" width="100%" border="0">
          <tbody>
            <tr>
              <td style="overflow-wrap:break-word;word-break:break-word;padding:30px 10px 10px;font-family:arial,helvetica,sans-serif;" align="left">
                
          <div style="font-size: 14px; line-height: 140%; text-align: center; word-wrap: break-word;">
            <p style="line-height: 140%;">Please verify you're really you by entering this</p>
        <p style="line-height: 140%;">6-digit code when you sign in. Just a heads up, this code will expire</p>
        <p style="line-height: 140%;">in 20 minutes for security reasons.</p>
          </div>
        
              </td>
            </tr>
          </tbody>
        </table>
        
          <!--[if (!mso)&(!IE)]><!--></div><!--<![endif]-->
          </div>
        </div>
        <!--[if (mso)|(IE)]></td><![endif]-->
              <!--[if (mso)|(IE)]></tr></table></td></tr></table><![endif]-->
            </div>
          </div>
          </div>
          
        
        
          
          
        <div class="u-row-container" style="padding: 0px;background-color: transparent">
          <div class="u-row" style="margin: 0 auto;min-width: 320px;max-width: 600px;overflow-wrap: break-word;word-wrap: break-word;word-break: break-word;background-color: transparent;">
            <div style="border-collapse: collapse;display: table;width: 100%;height: 100%;background-color: transparent;">
              <!--[if (mso)|(IE)]><table width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td style="padding: 0px;background-color: transparent;" align="center"><table cellpadding="0" cellspacing="0" border="0" style="width:600px;"><tr style="background-color: transparent;"><![endif]-->
              
        <!--[if (mso)|(IE)]><td align="center" width="200" style="background-color: #ffffff;width: 200px;padding: 0px;border-top: 0px solid transparent;border-left: 0px solid transparent;border-right: 0px solid transparent;border-bottom: 0px solid transparent;border-radius: 0px;-webkit-border-radius: 0px; -moz-border-radius: 0px;" valign="top"><![endif]-->
        <div class="u-col u-col-33p33" style="max-width: 320px;min-width: 200px;display: table-cell;vertical-align: top;">
          <div style="background-color: #ffffff;height: 100%;width: 100% !important;border-radius: 0px;-webkit-border-radius: 0px; -moz-border-radius: 0px;">
          <!--[if (!mso)&(!IE)]><!--><div style="box-sizing: border-box; height: 100%; padding: 0px;border-top: 0px solid transparent;border-left: 0px solid transparent;border-right: 0px solid transparent;border-bottom: 0px solid transparent;border-radius: 0px;-webkit-border-radius: 0px; -moz-border-radius: 0px;"><!--<![endif]-->
          
          <!--[if (!mso)&(!IE)]><!--></div><!--<![endif]-->
          </div>
        </div>
        <!--[if (mso)|(IE)]></td><![endif]-->
        <!--[if (mso)|(IE)]><td align="center" width="200" style="background-color: #ffffff;width: 200px;padding: 0px;border-top: 0px solid transparent;border-left: 0px solid transparent;border-right: 0px solid transparent;border-bottom: 0px solid transparent;border-radius: 0px;-webkit-border-radius: 0px; -moz-border-radius: 0px;" valign="top"><![endif]-->
        <div class="u-col u-col-33p33" style="max-width: 320px;min-width: 200px;display: table-cell;vertical-align: top;">
          <div style="background-color: #ffffff;height: 100%;width: 100% !important;border-radius: 0px;-webkit-border-radius: 0px; -moz-border-radius: 0px;">
          <!--[if (!mso)&(!IE)]><!--><div style="box-sizing: border-box; height: 100%; padding: 0px;border-top: 0px solid transparent;border-left: 0px solid transparent;border-right: 0px solid transparent;border-bottom: 0px solid transparent;border-radius: 0px;-webkit-border-radius: 0px; -moz-border-radius: 0px;"><!--<![endif]-->
          
          <!--[if (!mso)&(!IE)]><!--></div><!--<![endif]-->
          </div>
        </div>
        <!--[if (mso)|(IE)]></td><![endif]-->
        <!--[if (mso)|(IE)]><td align="center" width="200" style="background-color: #ffffff;width: 200px;padding: 0px;border-top: 0px solid transparent;border-left: 0px solid transparent;border-right: 0px solid transparent;border-bottom: 0px solid transparent;border-radius: 0px;-webkit-border-radius: 0px; -moz-border-radius: 0px;" valign="top"><![endif]-->
        <div class="u-col u-col-33p33" style="max-width: 320px;min-width: 200px;display: table-cell;vertical-align: top;">
          <div style="background-color: #ffffff;height: 100%;width: 100% !important;border-radius: 0px;-webkit-border-radius: 0px; -moz-border-radius: 0px;">
          <!--[if (!mso)&(!IE)]><!--><div style="box-sizing: border-box; height: 100%; padding: 0px;border-top: 0px solid transparent;border-left: 0px solid transparent;border-right: 0px solid transparent;border-bottom: 0px solid transparent;border-radius: 0px;-webkit-border-radius: 0px; -moz-border-radius: 0px;"><!--<![endif]-->
          
          <!--[if (!mso)&(!IE)]><!--></div><!--<![endif]-->
          </div>
        </div>
        <!--[if (mso)|(IE)]></td><![endif]-->
              <!--[if (mso)|(IE)]></tr></table></td></tr></table><![endif]-->
            </div>
          </div>
          </div>
          
        
        
          
          
        <div class="u-row-container" style="padding: 0px;background-color: transparent">
          <div class="u-row" style="margin: 0 auto;min-width: 320px;max-width: 600px;overflow-wrap: break-word;word-wrap: break-word;word-break: break-word;background-color: transparent;">
            <div style="border-collapse: collapse;display: table;width: 100%;height: 100%;background-color: transparent;">
              <!--[if (mso)|(IE)]><table width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td style="padding: 0px;background-color: transparent;" align="center"><table cellpadding="0" cellspacing="0" border="0" style="width:600px;"><tr style="background-color: transparent;"><![endif]-->
              
        <!--[if (mso)|(IE)]><td align="center" width="600" style="background-color: #ffffff;width: 600px;padding: 0px;border-top: 0px solid transparent;border-left: 0px solid transparent;border-right: 0px solid transparent;border-bottom: 0px solid transparent;border-radius: 0px;-webkit-border-radius: 0px; -moz-border-radius: 0px;" valign="top"><![endif]-->
        <div class="u-col u-col-100" style="max-width: 320px;min-width: 600px;display: table-cell;vertical-align: top;">
          <div style="background-color: #ffffff;height: 100%;width: 100% !important;border-radius: 0px;-webkit-border-radius: 0px; -moz-border-radius: 0px;">
          <!--[if (!mso)&(!IE)]><!--><div style="box-sizing: border-box; height: 100%; padding: 0px;border-top: 0px solid transparent;border-left: 0px solid transparent;border-right: 0px solid transparent;border-bottom: 0px solid transparent;border-radius: 0px;-webkit-border-radius: 0px; -moz-border-radius: 0px;"><!--<![endif]-->
          
        <table style="font-family:arial,helvetica,sans-serif;" role="presentation" cellpadding="0" cellspacing="0" width="100%" border="0">
          <tbody>
            <tr>
              <td style="overflow-wrap:break-word;word-break:break-word;padding:30px 10px 10px;font-family:arial,helvetica,sans-serif;" align="left">
                
          <!--[if mso]><table width="100%"><tr><td><![endif]-->
            <h1 style="margin: 0px; line-height: 140%; text-align: center; word-wrap: break-word; font-family: 'Montserrat',sans-serif; font-size: 16px; font-weight: 400;"><span>If you didn't just try to sign in,<br />we recommend you reset your password here:</span></h1>
          <!--[if mso]></td></tr></table><![endif]-->
        
              </td>
            </tr>
          </tbody>
        </table>
        
        <table id="u_content_button_1" style="font-family:arial,helvetica,sans-serif;" role="presentation" cellpadding="0" cellspacing="0" width="100%" border="0">
          <tbody>
            <tr>
              <td style="overflow-wrap:break-word;word-break:break-word;padding:10px 10px 30px;font-family:arial,helvetica,sans-serif;" align="left">
                
          <!--[if mso]><style>.v-button {background: transparent !important;}</style><![endif]-->
        <div align="center">
          <!--[if mso]><v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="" style="height:40px; v-text-anchor:middle; width:274px;" arcsize="0%"  strokecolor="#000000" strokeweight="2px" fillcolor="#000000"><w:anchorlock/><center style="color:#ffffff;"><![endif]-->
            <a href="" target="_blank" class="v-button v-size-width" style="box-sizing: border-box;display: inline-block;text-decoration: none;-webkit-text-size-adjust: none;text-align: center;color: #ffffff; background-color: #000000; border-radius: 0px;-webkit-border-radius: 0px; -moz-border-radius: 0px; width:48%; max-width:100%; overflow-wrap: break-word; word-break: break-word; word-wrap:break-word; mso-border-alt: none;border-top-color: #000000; border-top-style: solid; border-top-width: 2px; border-left-color: #000000; border-left-style: solid; border-left-width: 2px; border-right-color: #000000; border-right-style: solid; border-right-width: 2px; border-bottom-color: #000000; border-bottom-style: solid; border-bottom-width: 2px;font-size: 18px;">
              <span style="display:block;padding:10px 20px 8px;line-height:120%;">Reset Your Password</span>
            </a>
            <!--[if mso]></center></v:roundrect><![endif]-->
        </div>
        
              </td>
            </tr>
          </tbody>
        </table>
        
          <!--[if (!mso)&(!IE)]><!--></div><!--<![endif]-->
          </div>
        </div>
        <!--[if (mso)|(IE)]></td><![endif]-->
              <!--[if (mso)|(IE)]></tr></table></td></tr></table><![endif]-->
            </div>
          </div>
          </div>
          
        
        
          
          
        <div class="u-row-container" style="padding: 2px 0px 0px;background-color: transparent">
          <div class="u-row" style="margin: 0 auto;min-width: 320px;max-width: 600px;overflow-wrap: break-word;word-wrap: break-word;word-break: break-word;background-color: transparent;">
            <div style="border-collapse: collapse;display: table;width: 100%;height: 100%;background-color: transparent;">
              <!--[if (mso)|(IE)]><table width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td style="padding: 2px 0px 0px;background-color: transparent;" align="center"><table cellpadding="0" cellspacing="0" border="0" style="width:600px;"><tr style="background-color: transparent;"><![endif]-->
              
        <!--[if (mso)|(IE)]><td align="center" width="600" style="background-color: #ffffff;width: 600px;padding: 0px;border-top: 0px solid transparent;border-left: 0px solid transparent;border-right: 0px solid transparent;border-bottom: 0px solid transparent;border-radius: 0px;-webkit-border-radius: 0px; -moz-border-radius: 0px;" valign="top"><![endif]-->
        <div class="u-col u-col-100" style="max-width: 320px;min-width: 600px;display: table-cell;vertical-align: top;">
          <div style="background-color: #ffffff;height: 100%;width: 100% !important;border-radius: 0px;-webkit-border-radius: 0px; -moz-border-radius: 0px;">
          <!--[if (!mso)&(!IE)]><!--><div style="box-sizing: border-box; height: 100%; padding: 0px;border-top: 0px solid transparent;border-left: 0px solid transparent;border-right: 0px solid transparent;border-bottom: 0px solid transparent;border-radius: 0px;-webkit-border-radius: 0px; -moz-border-radius: 0px;"><!--<![endif]-->
          
        <table style="font-family:arial,helvetica,sans-serif;" role="presentation" cellpadding="0" cellspacing="0" width="100%" border="0">
          <tbody>
            <tr>
              <td style="overflow-wrap:break-word;word-break:break-word;padding:30px 10px 10px;font-family:arial,helvetica,sans-serif;" align="left">
                
          <!--[if mso]><table width="100%"><tr><td><![endif]-->
            <h1 style="margin: 0px; line-height: 140%; text-align: center; word-wrap: break-word; font-family: 'Montserrat',sans-serif; font-size: 13px; font-weight: 400;"><span><span><span><span>If you have any questions, contact our Website  Guides.<br />Or, visit our Help Center.</span></span></span></span></h1>
          <!--[if mso]></td></tr></table><![endif]-->
        
              </td>
            </tr>
          </tbody>
        </table>
        
          <!--[if (!mso)&(!IE)]><!--></div><!--<![endif]-->
          </div>
        </div>
        <!--[if (mso)|(IE)]></td><![endif]-->
              <!--[if (mso)|(IE)]></tr></table></td></tr></table><![endif]-->
            </div>
          </div>
          </div>
          
        
        
          
          
        
        
            <!--[if (mso)|(IE)]></td></tr></table><![endif]-->
            </td>
          </tr>
          </tbody>
          </table>
          <!--[if mso]></div><![endif]-->
          <!--[if IE]></div><![endif]-->
        </body>
        
        </html>
        `,
      };

      transporter.sendMail(mailOption, function (err, info) {
        if (err) {
          res.send({ status: 200, response: "Otp send failed" });
        }
        res.send({ status: 200, response: "Otp send successfully" });
      });
    } else {
      res.send({ status: 204, response: "Credentials are incorrect" });
    }
  } catch (error) {
    res.send({ status: 500, response: "Internal server error" });
  }
});

const scope = ["https://www.googleapis.com/auth/drive"];

async function authorize() {
  const jwtClient = new google.auth.JWT(
    process.env.client_email,
    null,
    process.env.private_key,
    scope
  );

  await jwtClient.authorize();

  return jwtClient;
}

// Create the "uploads" directory if it doesn't exist
const uploadDirectory = "files/";
const streamifier = require("streamifier");
const { object } = require("webidl-conversions");


// Function to upload a file to Google Drive
async function uploadFile(authClient, fileInfo) {
  return new Promise((resolve, reject) => {
    const drive = google.drive({ version: "v3", auth: authClient });

    const fileMetaData = {
      name: fileInfo.filename,
      parents: ["1CBsb1iOv_zEVn3A8JdxiiH3nWOrcUXpI"],
    };

    drive.files.create(
      {
        resource: fileMetaData,
        media: {
          mimeType: fileInfo.mimetype,
          body: streamifier.createReadStream(fileInfo.buffer),
        },
        fields: "id",
      },
      function (err, file) {
        if (err) {
          return reject(err);
        }
        resolve(file);
      }
    );
  });
}

// Configure Multer to specify where to store uploaded files and their names.
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    if (!fs.existsSync(uploadDirectory)) {
      fs.mkdirSync(uploadDirectory);
    }
    cb(null, uploadDirectory); // Specify the directory where files will be stored.
  },
  filename: function (req, file, cb) {
    // Use the current timestamp as a unique file name.
    cb(null, Date.now() + file.originalname);
  },
});

// Configure multer to specify where to store uploaded files
const upload = multer({ storage: multer.memoryStorage() });

// Route to handle file upload
app.post("/upload", upload.single("file"), authorizeToken, async (req, res) => {
  if (!req.file) {
    return res.status(400).send("No file uploaded.");
  }

  try {
    const authClient = await authorize(); // Implement your authorization logic here
    const uploadedFile = await uploadFile(authClient, req.file);
    const fileId = uploadedFile.data.id;
    const filePath =
      req.body.content == "document"
        ? `https://drive.google.com/file/d/${fileId}/preview`
        : `https://drive.google.com/uc?id=${fileId}`;
    const body = { ...req.body, content_link: filePath };
    const token = req.headers.authorization.substring("Bearer ".length);
    // Verify if the provided token exists in the "tokens" collection
    const verifyToken = await database
      .collection("tokens")
      .findOne({ _id: new ObjectId(token) });

    if (verifyToken) {
      // Token is valid; retrieve user data based on the token's userId
      const userId = verifyToken.userId;
      const userResponse = await database
        .collection("users")
        .findOne({ _id: new ObjectId(userId) });
      // Create an author object
      const author = {
        author: userResponse.given_name + " " + userResponse.family_name,
        authorId: userId,
      };

      // Merge the author object with the body
      Object.assign(body, author);
    }

    const contentDetailsResponse = await database
      .collection("contentDetails")
      .insertOne(body);
    if (contentDetailsResponse) {
      const notificationObject = {
        icon:
          req.body.content == "document"
            ? "document-text-outline"
            : "" || req.body.content == "video"
              ? "play-circle-outline"
              : "" || req.body.content == "audio"
                ? "musical-notes-outline"
                : "",
        info: `Teacher ${body.author} uploaded a new ${req.body.content}`,
        content: req.body.content,
        classId: req.body.classId,
        lec_id: req.body.lec_id,
        contentId: contentDetailsResponse.insertedId.toString(),
        from: "/tabs/home",
        author: body.author,
        authorId: body.authorId,
      };
      let notificationResponse = await database
        .collection("notifications")
        .insertOne(notificationObject);
      io.emit("notification", notificationObject);
      res.send({ status: 200, response: "Content uploaded sucessfully" });
    } else {
      res.send({ status: 400, response: "something went wrong" });
    }
  } catch (error) {
    console.error("Error:", error);
    res.status(500).send("An error occurred while uploading the file.");
  }
});

app.post("/upsertContentDetails", authorizeToken, async (req, res) => { });

// Google signup
// Configure Google OAuth Strategy
passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.OAuth_client_id,
      clientSecret: process.env.OAuth_Client_secret,
      callbackURL: process.env.OAuth_Callback_url,
      scope: "email",
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        console.log(profile);
        return done(null, profile);
      } catch (error) {
        console.error("Error in Google OAuth strategy:", error);
        return done(error);
      }
    }
  )
);

// Serialize user into the session
passport.serializeUser((profile, done) => {
  done(null, profile);
});

// Deserialize user from the session
passport.deserializeUser((profile, done) => {
  // Retrieve user data from the database based on id.
  // Example: const user = findUserById(id);
  done(null, profile);
});

// Route for Google authentication
app.get(
  "/google",
  passport.authenticate("google", { scope: ["profile", "email"] })
);

app.get("/logout", authorizeToken, authorizeToken, async (req, res) => {
  const token = req.headers.authorization.substring("Bearer ".length);
  // Verify if the provided token exists in the "tokens" collection
  const verifyToken = await database
    .collection("tokens")
    .findOne({ _id: new ObjectId(token) });
  let response = await database.collection("users").updateOne(
    { _id: new ObjectId(verifyToken.userId) },
    {
      $set: {
        logged: false,
        date: Date(),
      },
    },
    { upsert: true }
  );
  if (response) {
    res.send({
      status: 200,
      message: `${verifyToken.email} logout successfull !`,
    });
  } else {
    res.send({ status: 403, message: "Something went wrong !" });
  }
});

app.post("/updateProfile", authorizeToken, async (req, res) => {
  try {
    const { _id, ...profileData } = req.body;
    profileData.updated = new Date();

    if (!_id) {
      return res
        .status(400)
        .json({ status: 400, response: "Missing user _id" });
    }

    const updateId = new ObjectId(_id);
    delete profileData._id;

    const response = await database
      .collection("users")
      .updateOne({ _id: updateId }, { $set: profileData }, { upsert: true });

    if (response.matchedCount === 0) {
      return res.status(404).json({ status: 404, response: "User not found" });
    }

    if (response.modifiedCount === 0) {
      return res.status(200).json({ status: 200, response: "No changes made" });
    }

    res
      .status(200)
      .json({ status: 200, response: "Profile updated successfully" });
  } catch (error) {
    console.error("Error in /updateProfile:", error);
    res.status(500).json({ status: 500, response: "Internal server error" });
  }
});

app.get("/profile", authorizeToken, authorizeToken, async (req, res) => {
  try {
    const token = req.headers.authorization.substring("Bearer ".length);
    // Verify if the provided token exists in the "tokens" collection
    const verifyToken = await database
      .collection("tokens")
      .findOne({ _id: new ObjectId(token) });

    if (verifyToken) {
      // Token is valid; retrieve user data based on the token's userId
      const userId = verifyToken.userId;
      const userResponse = await database
        .collection("users")
        .findOne({ _id: new ObjectId(userId) });

      if (userResponse) {
        // User found; send the user's data in the response
        res.status(200).send({ status: 200, response: userResponse });
      } else {
        // User not found; return a 404 response
        res.status(404).send("User not found");
      }
    } else {
      // Token not valid; return a 404 response
      res.status(404).send("Token not valid");
    }
  } catch (error) {
    // Handle any errors that may occur during database operations
    console.error("Error in /profile route:", error);
    res.status(500).send("Internal Server Error");
  }
});

// Callback route after Google authentication
app.get(
  "/google/callback",
  passport.authenticate("google", { failureRedirect: "/" }),
  async (req, res) => {
    try {
      if (req.isAuthenticated()) {
        const otp = generateOTP();

        // Check if the user exists in the database
        const userExists = await database
          .collection("users")
          .findOne({ email: req.user._json.email });
        console.log(userExists);
        if (userExists) {
          await database.collection("users").updateOne(
            { _id: new ObjectId(userExists._id) },
            {
              $set: {
                logged: true,
                date: Date(),
              },
            },
            { upsert: true }
          );
          // User exists, check for an token'
          const response = await database.collection("tokens").insertOne({
            userId: userExists._id.toString(),
            email: req.user._json.email,
            dateTime: new Date(),
            otp: otp,
          });

          var mailOption = {
            from: "ajeetrajbhar2504@gmail.com",
            to: req.user._json.email,
            subject: "A one-time password of Class App",
            html: `<!DOCTYPE HTML PUBLIC "-//W3C//DTD XHTML 1.0 Transitional //EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
            <html xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
            <head>
            <!--[if gte mso 9]>
            <xml>
              <o:OfficeDocumentSettings>
                <o:AllowPNG/>
                <o:PixelsPerInch>96</o:PixelsPerInch>
              </o:OfficeDocumentSettings>
            </xml>
            <![endif]-->
              <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <meta name="x-apple-disable-message-reformatting">
              <!--[if !mso]><!--><meta http-equiv="X-UA-Compatible" content="IE=edge"><!--<![endif]-->
              <title></title>
              
                <style type="text/css">
                  @media only screen and (min-width: 620px) {
              .u-row {
                width: 600px !important;
              }
              .u-row .u-col {
                vertical-align: top;
              }
            
              .u-row .u-col-33p33 {
                width: 199.98px !important;
              }
            
              .u-row .u-col-100 {
                width: 600px !important;
              }
            
            }
            
            @media (max-width: 620px) {
              .u-row-container {
                max-width: 100% !important;
                padding-left: 0px !important;
                padding-right: 0px !important;
              }
              .u-row .u-col {
                min-width: 320px !important;
                max-width: 100% !important;
                display: block !important;
              }
              .u-row {
                width: 100% !important;
              }
              .u-col {
                width: 100% !important;
              }
              .u-col > div {
                margin: 0 auto;
              }
            }
            body {
              margin: 0;
              padding: 0;
            }
            
            table,
            tr,
            td {
              vertical-align: top;
              border-collapse: collapse;
            }
            
            p {
              margin: 0;
            }
            
            .ie-container table,
            .mso-container table {
              table-layout: fixed;
            }
            
            * {
              line-height: inherit;
            }
            
            a[x-apple-data-detectors='true'] {
              color: inherit !important;
              text-decoration: none !important;
            }
            
            @media (max-width: 480px) {
              .hide-mobile {
                max-height: 0px;
                overflow: hidden;
                display: none !important;
              }
            }
            
            table, td { color: #000000; } #u_body a { color: #0000ee; text-decoration: underline; } @media (max-width: 480px) { #u_content_button_1 .v-size-width { width: 76% !important; } }
                </style>
              
              
            
            <!--[if !mso]><!--><link href="https://fonts.googleapis.com/css?family=Montserrat:400,700&display=swap" rel="stylesheet" type="text/css"><link href="https://fonts.googleapis.com/css?family=Open+Sans:400,700&display=swap" rel="stylesheet" type="text/css"><!--<![endif]-->
            
            </head>
            
            <body class="clean-body u_body" style="margin: 0;padding: 0;-webkit-text-size-adjust: 100%;background-color: #f0f0f0;color: #000000">
              <!--[if IE]><div class="ie-container"><![endif]-->
              <!--[if mso]><div class="mso-container"><![endif]-->
              <table id="u_body" style="border-collapse: collapse;table-layout: fixed;border-spacing: 0;mso-table-lspace: 0pt;mso-table-rspace: 0pt;vertical-align: top;min-width: 320px;Margin: 0 auto;background-color: #f0f0f0;width:100%" cellpadding="0" cellspacing="0">
              <tbody>
              <tr style="vertical-align: top">
                <td style="word-break: break-word;border-collapse: collapse !important;vertical-align: top">
                <!--[if (mso)|(IE)]><table width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td align="center" style="background-color: #f0f0f0;"><![endif]-->
                
              
              
            <div class="u-row-container" style="padding: 0px;background-color: transparent">
              <div class="u-row" style="margin: 0 auto;min-width: 320px;max-width: 600px;overflow-wrap: break-word;word-wrap: break-word;word-break: break-word;background-color: transparent;">
                <div style="border-collapse: collapse;display: table;width: 100%;height: 100%;background-color: transparent;">
                  <!--[if (mso)|(IE)]><table width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td style="padding: 0px;background-color: transparent;" align="center"><table cellpadding="0" cellspacing="0" border="0" style="width:600px;"><tr style="background-color: transparent;"><![endif]-->
                  
            <!--[if (mso)|(IE)]><td align="center" width="600" style="background-color: #ddffe7;width: 600px;padding: 0px;border-top: 0px solid transparent;border-left: 0px solid transparent;border-right: 0px solid transparent;border-bottom: 0px solid transparent;" valign="top"><![endif]-->
            <div class="u-col u-col-100" style="max-width: 320px;min-width: 600px;display: table-cell;vertical-align: top;">
              <div style="background-color: #ddffe7;height: 100%;width: 100% !important;">
              <!--[if (!mso)&(!IE)]><!--><div style="box-sizing: border-box; height: 100%; padding: 0px;border-top: 0px solid transparent;border-left: 0px solid transparent;border-right: 0px solid transparent;border-bottom: 0px solid transparent;"><!--<![endif]-->
              
            <table style="font-family:arial,helvetica,sans-serif;" role="presentation" cellpadding="0" cellspacing="0" width="100%" border="0">
              <tbody>
                <tr>
                  <td style="overflow-wrap:break-word;word-break:break-word;padding:10px;font-family:arial,helvetica,sans-serif;" align="left">
                    
            <table width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td style="padding-right: 0px;padding-left: 0px;" align="center">
                  
                  <img align="center" border="0" src="images/image-4.png" alt="image" title="image" style="outline: none;text-decoration: none;-ms-interpolation-mode: bicubic;clear: both;display: inline-block !important;border: none;height: auto;float: none;width: 100%;max-width: 190px;" width="190"/>
                  
                </td>
              </tr>
            </table>
            
                  </td>
                </tr>
              </tbody>
            </table>
            
              <!--[if (!mso)&(!IE)]><!--></div><!--<![endif]-->
              </div>
            </div>
            <!--[if (mso)|(IE)]></td><![endif]-->
                  <!--[if (mso)|(IE)]></tr></table></td></tr></table><![endif]-->
                </div>
              </div>
              </div>
              
            
            
              
              
            <div class="u-row-container" style="padding: 0px;background-color: transparent">
              <div class="u-row" style="margin: 0 auto;min-width: 320px;max-width: 600px;overflow-wrap: break-word;word-wrap: break-word;word-break: break-word;background-color: transparent;">
                <div style="border-collapse: collapse;display: table;width: 100%;height: 100%;background-color: transparent;">
                  <!--[if (mso)|(IE)]><table width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td style="padding: 0px;background-color: transparent;" align="center"><table cellpadding="0" cellspacing="0" border="0" style="width:600px;"><tr style="background-color: transparent;"><![endif]-->
                  
            <!--[if (mso)|(IE)]><td align="center" width="600" style="background-color: #ffffff;width: 600px;padding: 0px;border-top: 0px solid transparent;border-left: 0px solid transparent;border-right: 0px solid transparent;border-bottom: 0px solid transparent;border-radius: 0px;-webkit-border-radius: 0px; -moz-border-radius: 0px;" valign="top"><![endif]-->
            <div class="u-col u-col-100" style="max-width: 320px;min-width: 600px;display: table-cell;vertical-align: top;">
              <div style="background-color: #ffffff;height: 100%;width: 100% !important;border-radius: 0px;-webkit-border-radius: 0px; -moz-border-radius: 0px;">
              <!--[if (!mso)&(!IE)]><!--><div style="box-sizing: border-box; height: 100%; padding: 0px;border-top: 0px solid transparent;border-left: 0px solid transparent;border-right: 0px solid transparent;border-bottom: 0px solid transparent;border-radius: 0px;-webkit-border-radius: 0px; -moz-border-radius: 0px;"><!--<![endif]-->
              
            <table style="font-family:arial,helvetica,sans-serif;" role="presentation" cellpadding="0" cellspacing="0" width="100%" border="0">
              <tbody>
                <tr>
                  <td style="overflow-wrap:break-word;word-break:break-word;padding:30px 10px 10px;font-family:arial,helvetica,sans-serif;" align="left">
                    
              <!--[if mso]><table width="100%"><tr><td><![endif]-->
                <h1 style="margin: 0px; line-height: 140%; text-align: center; word-wrap: break-word; font-family: 'Montserrat',sans-serif; font-size: 22px; font-weight: 700;"><span><span>Your one-time code is</span></span></h1>
              <!--[if mso]></td></tr></table><![endif]-->
            
                  </td>
                </tr>
              </tbody>
            </table>
            
            <table style="font-family:arial,helvetica,sans-serif;" role="presentation" cellpadding="0" cellspacing="0" width="100%" border="0">
              <tbody>
                <tr>
                  <td style="overflow-wrap:break-word;word-break:break-word;padding:10px;font-family:arial,helvetica,sans-serif;" align="left">
                    
              <!--[if mso]><style>.v-button {background: transparent !important;}</style><![endif]-->
            <div align="center">
              <!--[if mso]><v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="https://unlayer.com" style="height:42px; v-text-anchor:middle; width:216px;" arcsize="0%"  strokecolor="#000000" strokeweight="2px" fillcolor="#ffffff"><w:anchorlock/><center style="color:#000000;"><![endif]-->
                <a href="https://unlayer.com" target="_blank" class="v-button v-size-width" style="box-sizing: border-box;display: inline-block;text-decoration: none;-webkit-text-size-adjust: none;text-align: center;color: #000000; background-color: #ffffff; border-radius: 0px;-webkit-border-radius: 0px; -moz-border-radius: 0px; width:38%; max-width:100%; overflow-wrap: break-word; word-break: break-word; word-wrap:break-word; mso-border-alt: none;border-top-color: #000000; border-top-style: solid; border-top-width: 2px; border-left-color: #000000; border-left-style: solid; border-left-width: 2px; border-right-color: #000000; border-right-style: solid; border-right-width: 2px; border-bottom-color: #000000; border-bottom-style: solid; border-bottom-width: 2px;font-size: 18px;">
                  <span style="display:block;padding:10px 20px;line-height:120%;">264301</span>
                </a>
                <!--[if mso]></center></v:roundrect><![endif]-->
            </div>
            
                  </td>
                </tr>
              </tbody>
            </table>
            
            <table style="font-family:arial,helvetica,sans-serif;" role="presentation" cellpadding="0" cellspacing="0" width="100%" border="0">
              <tbody>
                <tr>
                  <td style="overflow-wrap:break-word;word-break:break-word;padding:30px 10px 10px;font-family:arial,helvetica,sans-serif;" align="left">
                    
              <div style="font-size: 14px; line-height: 140%; text-align: center; word-wrap: break-word;">
                <p style="line-height: 140%;">Please verify you're really you by entering this</p>
            <p style="line-height: 140%;">6-digit code when you sign in. Just a heads up, this code will expire</p>
            <p style="line-height: 140%;">in 20 minutes for security reasons.</p>
              </div>
            
                  </td>
                </tr>
              </tbody>
            </table>
            
              <!--[if (!mso)&(!IE)]><!--></div><!--<![endif]-->
              </div>
            </div>
            <!--[if (mso)|(IE)]></td><![endif]-->
                  <!--[if (mso)|(IE)]></tr></table></td></tr></table><![endif]-->
                </div>
              </div>
              </div>
              
            
            
              
              
            <div class="u-row-container" style="padding: 0px;background-color: transparent">
              <div class="u-row" style="margin: 0 auto;min-width: 320px;max-width: 600px;overflow-wrap: break-word;word-wrap: break-word;word-break: break-word;background-color: transparent;">
                <div style="border-collapse: collapse;display: table;width: 100%;height: 100%;background-color: transparent;">
                  <!--[if (mso)|(IE)]><table width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td style="padding: 0px;background-color: transparent;" align="center"><table cellpadding="0" cellspacing="0" border="0" style="width:600px;"><tr style="background-color: transparent;"><![endif]-->
                  
            <!--[if (mso)|(IE)]><td align="center" width="200" style="background-color: #ffffff;width: 200px;padding: 0px;border-top: 0px solid transparent;border-left: 0px solid transparent;border-right: 0px solid transparent;border-bottom: 0px solid transparent;border-radius: 0px;-webkit-border-radius: 0px; -moz-border-radius: 0px;" valign="top"><![endif]-->
            <div class="u-col u-col-33p33" style="max-width: 320px;min-width: 200px;display: table-cell;vertical-align: top;">
              <div style="background-color: #ffffff;height: 100%;width: 100% !important;border-radius: 0px;-webkit-border-radius: 0px; -moz-border-radius: 0px;">
              <!--[if (!mso)&(!IE)]><!--><div style="box-sizing: border-box; height: 100%; padding: 0px;border-top: 0px solid transparent;border-left: 0px solid transparent;border-right: 0px solid transparent;border-bottom: 0px solid transparent;border-radius: 0px;-webkit-border-radius: 0px; -moz-border-radius: 0px;"><!--<![endif]-->
              
              <!--[if (!mso)&(!IE)]><!--></div><!--<![endif]-->
              </div>
            </div>
            <!--[if (mso)|(IE)]></td><![endif]-->
            <!--[if (mso)|(IE)]><td align="center" width="200" style="background-color: #ffffff;width: 200px;padding: 0px;border-top: 0px solid transparent;border-left: 0px solid transparent;border-right: 0px solid transparent;border-bottom: 0px solid transparent;border-radius: 0px;-webkit-border-radius: 0px; -moz-border-radius: 0px;" valign="top"><![endif]-->
            <div class="u-col u-col-33p33" style="max-width: 320px;min-width: 200px;display: table-cell;vertical-align: top;">
              <div style="background-color: #ffffff;height: 100%;width: 100% !important;border-radius: 0px;-webkit-border-radius: 0px; -moz-border-radius: 0px;">
              <!--[if (!mso)&(!IE)]><!--><div style="box-sizing: border-box; height: 100%; padding: 0px;border-top: 0px solid transparent;border-left: 0px solid transparent;border-right: 0px solid transparent;border-bottom: 0px solid transparent;border-radius: 0px;-webkit-border-radius: 0px; -moz-border-radius: 0px;"><!--<![endif]-->
              
              <!--[if (!mso)&(!IE)]><!--></div><!--<![endif]-->
              </div>
            </div>
            <!--[if (mso)|(IE)]></td><![endif]-->
            <!--[if (mso)|(IE)]><td align="center" width="200" style="background-color: #ffffff;width: 200px;padding: 0px;border-top: 0px solid transparent;border-left: 0px solid transparent;border-right: 0px solid transparent;border-bottom: 0px solid transparent;border-radius: 0px;-webkit-border-radius: 0px; -moz-border-radius: 0px;" valign="top"><![endif]-->
            <div class="u-col u-col-33p33" style="max-width: 320px;min-width: 200px;display: table-cell;vertical-align: top;">
              <div style="background-color: #ffffff;height: 100%;width: 100% !important;border-radius: 0px;-webkit-border-radius: 0px; -moz-border-radius: 0px;">
              <!--[if (!mso)&(!IE)]><!--><div style="box-sizing: border-box; height: 100%; padding: 0px;border-top: 0px solid transparent;border-left: 0px solid transparent;border-right: 0px solid transparent;border-bottom: 0px solid transparent;border-radius: 0px;-webkit-border-radius: 0px; -moz-border-radius: 0px;"><!--<![endif]-->
              
              <!--[if (!mso)&(!IE)]><!--></div><!--<![endif]-->
              </div>
            </div>
            <!--[if (mso)|(IE)]></td><![endif]-->
                  <!--[if (mso)|(IE)]></tr></table></td></tr></table><![endif]-->
                </div>
              </div>
              </div>
              
            
            
              
              
            <div class="u-row-container" style="padding: 0px;background-color: transparent">
              <div class="u-row" style="margin: 0 auto;min-width: 320px;max-width: 600px;overflow-wrap: break-word;word-wrap: break-word;word-break: break-word;background-color: transparent;">
                <div style="border-collapse: collapse;display: table;width: 100%;height: 100%;background-color: transparent;">
                  <!--[if (mso)|(IE)]><table width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td style="padding: 0px;background-color: transparent;" align="center"><table cellpadding="0" cellspacing="0" border="0" style="width:600px;"><tr style="background-color: transparent;"><![endif]-->
                  
            <!--[if (mso)|(IE)]><td align="center" width="600" style="background-color: #ffffff;width: 600px;padding: 0px;border-top: 0px solid transparent;border-left: 0px solid transparent;border-right: 0px solid transparent;border-bottom: 0px solid transparent;border-radius: 0px;-webkit-border-radius: 0px; -moz-border-radius: 0px;" valign="top"><![endif]-->
            <div class="u-col u-col-100" style="max-width: 320px;min-width: 600px;display: table-cell;vertical-align: top;">
              <div style="background-color: #ffffff;height: 100%;width: 100% !important;border-radius: 0px;-webkit-border-radius: 0px; -moz-border-radius: 0px;">
              <!--[if (!mso)&(!IE)]><!--><div style="box-sizing: border-box; height: 100%; padding: 0px;border-top: 0px solid transparent;border-left: 0px solid transparent;border-right: 0px solid transparent;border-bottom: 0px solid transparent;border-radius: 0px;-webkit-border-radius: 0px; -moz-border-radius: 0px;"><!--<![endif]-->
              
            <table style="font-family:arial,helvetica,sans-serif;" role="presentation" cellpadding="0" cellspacing="0" width="100%" border="0">
              <tbody>
                <tr>
                  <td style="overflow-wrap:break-word;word-break:break-word;padding:30px 10px 10px;font-family:arial,helvetica,sans-serif;" align="left">
                    
              <!--[if mso]><table width="100%"><tr><td><![endif]-->
                <h1 style="margin: 0px; line-height: 140%; text-align: center; word-wrap: break-word; font-family: 'Montserrat',sans-serif; font-size: 16px; font-weight: 400;"><span>If you didn't just try to sign in,<br />we recommend you reset your password here:</span></h1>
              <!--[if mso]></td></tr></table><![endif]-->
            
                  </td>
                </tr>
              </tbody>
            </table>
            
            <table id="u_content_button_1" style="font-family:arial,helvetica,sans-serif;" role="presentation" cellpadding="0" cellspacing="0" width="100%" border="0">
              <tbody>
                <tr>
                  <td style="overflow-wrap:break-word;word-break:break-word;padding:10px 10px 30px;font-family:arial,helvetica,sans-serif;" align="left">
                    
              <!--[if mso]><style>.v-button {background: transparent !important;}</style><![endif]-->
            <div align="center">
              <!--[if mso]><v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="" style="height:40px; v-text-anchor:middle; width:274px;" arcsize="0%"  strokecolor="#000000" strokeweight="2px" fillcolor="#000000"><w:anchorlock/><center style="color:#ffffff;"><![endif]-->
                <a href="" target="_blank" class="v-button v-size-width" style="box-sizing: border-box;display: inline-block;text-decoration: none;-webkit-text-size-adjust: none;text-align: center;color: #ffffff; background-color: #000000; border-radius: 0px;-webkit-border-radius: 0px; -moz-border-radius: 0px; width:48%; max-width:100%; overflow-wrap: break-word; word-break: break-word; word-wrap:break-word; mso-border-alt: none;border-top-color: #000000; border-top-style: solid; border-top-width: 2px; border-left-color: #000000; border-left-style: solid; border-left-width: 2px; border-right-color: #000000; border-right-style: solid; border-right-width: 2px; border-bottom-color: #000000; border-bottom-style: solid; border-bottom-width: 2px;font-size: 18px;">
                  <span style="display:block;padding:10px 20px 8px;line-height:120%;">Reset Your Password</span>
                </a>
                <!--[if mso]></center></v:roundrect><![endif]-->
            </div>
            
                  </td>
                </tr>
              </tbody>
            </table>
            
              <!--[if (!mso)&(!IE)]><!--></div><!--<![endif]-->
              </div>
            </div>
            <!--[if (mso)|(IE)]></td><![endif]-->
                  <!--[if (mso)|(IE)]></tr></table></td></tr></table><![endif]-->
                </div>
              </div>
              </div>
              
            
            
              
              
            <div class="u-row-container" style="padding: 2px 0px 0px;background-color: transparent">
              <div class="u-row" style="margin: 0 auto;min-width: 320px;max-width: 600px;overflow-wrap: break-word;word-wrap: break-word;word-break: break-word;background-color: transparent;">
                <div style="border-collapse: collapse;display: table;width: 100%;height: 100%;background-color: transparent;">
                  <!--[if (mso)|(IE)]><table width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td style="padding: 2px 0px 0px;background-color: transparent;" align="center"><table cellpadding="0" cellspacing="0" border="0" style="width:600px;"><tr style="background-color: transparent;"><![endif]-->
                  
            <!--[if (mso)|(IE)]><td align="center" width="600" style="background-color: #ffffff;width: 600px;padding: 0px;border-top: 0px solid transparent;border-left: 0px solid transparent;border-right: 0px solid transparent;border-bottom: 0px solid transparent;border-radius: 0px;-webkit-border-radius: 0px; -moz-border-radius: 0px;" valign="top"><![endif]-->
            <div class="u-col u-col-100" style="max-width: 320px;min-width: 600px;display: table-cell;vertical-align: top;">
              <div style="background-color: #ffffff;height: 100%;width: 100% !important;border-radius: 0px;-webkit-border-radius: 0px; -moz-border-radius: 0px;">
              <!--[if (!mso)&(!IE)]><!--><div style="box-sizing: border-box; height: 100%; padding: 0px;border-top: 0px solid transparent;border-left: 0px solid transparent;border-right: 0px solid transparent;border-bottom: 0px solid transparent;border-radius: 0px;-webkit-border-radius: 0px; -moz-border-radius: 0px;"><!--<![endif]-->
              
            <table style="font-family:arial,helvetica,sans-serif;" role="presentation" cellpadding="0" cellspacing="0" width="100%" border="0">
              <tbody>
                <tr>
                  <td style="overflow-wrap:break-word;word-break:break-word;padding:30px 10px 10px;font-family:arial,helvetica,sans-serif;" align="left">
                    
              <!--[if mso]><table width="100%"><tr><td><![endif]-->
                <h1 style="margin: 0px; line-height: 140%; text-align: center; word-wrap: break-word; font-family: 'Montserrat',sans-serif; font-size: 13px; font-weight: 400;"><span><span><span><span>If you have any questions, contact our Website  Guides.<br />Or, visit our Help Center.</span></span></span></span></h1>
              <!--[if mso]></td></tr></table><![endif]-->
            
                  </td>
                </tr>
              </tbody>
            </table>
            
              <!--[if (!mso)&(!IE)]><!--></div><!--<![endif]-->
              </div>
            </div>
            <!--[if (mso)|(IE)]></td><![endif]-->
                  <!--[if (mso)|(IE)]></tr></table></td></tr></table><![endif]-->
                </div>
              </div>
              </div>
              
            
            
              
              
            
            
                <!--[if (mso)|(IE)]></td></tr></table><![endif]-->
                </td>
              </tr>
              </tbody>
              </table>
              <!--[if mso]></div><![endif]-->
              <!--[if IE]></div><![endif]-->
            </body>
            
            </html>`,
          };

          transporter.sendMail(mailOption, function (err, info) {
            if (err) {
              return res.sendFile(__dirname + "/public/index.html");
            }
            return res.sendFile(__dirname + "/public/otp.html");
          });
        } else {
          // User doesn't exist, create a new user
          const response = await database
            .collection("users")
            .insertOne({ ...req.user._json, logged: true });

          const tokenData = {
            userId: response.insertedId.toString(),
            email: req.user._json.email,
            dateTime: new Date(),
            otp: otp,
          };

          // Generate a token (assuming you have a function for this)
          const token = await generateToken(tokenData);

          if (!token) {
            // Handle token generation failure
            return res.status(500).send("Token generation failed");
          }

          // Send the token in the response

          var mailOption = {
            from: "ajeetrajbhar2504@gmail.com",
            to: req.user._json.email,
            subject: "A one-time password of Class App",
            html: `<!DOCTYPE HTML PUBLIC "-//W3C//DTD XHTML 1.0 Transitional //EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
            <html xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
            <head>
            <!--[if gte mso 9]>
            <xml>
              <o:OfficeDocumentSettings>
                <o:AllowPNG/>
                <o:PixelsPerInch>96</o:PixelsPerInch>
              </o:OfficeDocumentSettings>
            </xml>
            <![endif]-->
              <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <meta name="x-apple-disable-message-reformatting">
              <!--[if !mso]><!--><meta http-equiv="X-UA-Compatible" content="IE=edge"><!--<![endif]-->
              <title></title>
              
                <style type="text/css">
                  @media only screen and (min-width: 620px) {
              .u-row {
                width: 600px !important;
              }
              .u-row .u-col {
                vertical-align: top;
              }
            
              .u-row .u-col-33p33 {
                width: 199.98px !important;
              }
            
              .u-row .u-col-100 {
                width: 600px !important;
              }
            
            }
            
            @media (max-width: 620px) {
              .u-row-container {
                max-width: 100% !important;
                padding-left: 0px !important;
                padding-right: 0px !important;
              }
              .u-row .u-col {
                min-width: 320px !important;
                max-width: 100% !important;
                display: block !important;
              }
              .u-row {
                width: 100% !important;
              }
              .u-col {
                width: 100% !important;
              }
              .u-col > div {
                margin: 0 auto;
              }
            }
            body {
              margin: 0;
              padding: 0;
            }
            
            table,
            tr,
            td {
              vertical-align: top;
              border-collapse: collapse;
            }
            
            p {
              margin: 0;
            }
            
            .ie-container table,
            .mso-container table {
              table-layout: fixed;
            }
            
            * {
              line-height: inherit;
            }
            
            a[x-apple-data-detectors='true'] {
              color: inherit !important;
              text-decoration: none !important;
            }
            
            @media (max-width: 480px) {
              .hide-mobile {
                max-height: 0px;
                overflow: hidden;
                display: none !important;
              }
            }
            
            table, td { color: #000000; } #u_body a { color: #0000ee; text-decoration: underline; } @media (max-width: 480px) { #u_content_button_1 .v-size-width { width: 76% !important; } }
                </style>
              
              
            
            <!--[if !mso]><!--><link href="https://fonts.googleapis.com/css?family=Montserrat:400,700&display=swap" rel="stylesheet" type="text/css"><link href="https://fonts.googleapis.com/css?family=Open+Sans:400,700&display=swap" rel="stylesheet" type="text/css"><!--<![endif]-->
            
            </head>
            
            <body class="clean-body u_body" style="margin: 0;padding: 0;-webkit-text-size-adjust: 100%;background-color: #f0f0f0;color: #000000">
              <!--[if IE]><div class="ie-container"><![endif]-->
              <!--[if mso]><div class="mso-container"><![endif]-->
              <table id="u_body" style="border-collapse: collapse;table-layout: fixed;border-spacing: 0;mso-table-lspace: 0pt;mso-table-rspace: 0pt;vertical-align: top;min-width: 320px;Margin: 0 auto;background-color: #f0f0f0;width:100%" cellpadding="0" cellspacing="0">
              <tbody>
              <tr style="vertical-align: top">
                <td style="word-break: break-word;border-collapse: collapse !important;vertical-align: top">
                <!--[if (mso)|(IE)]><table width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td align="center" style="background-color: #f0f0f0;"><![endif]-->
                
              
              
            <div class="u-row-container" style="padding: 0px;background-color: transparent">
              <div class="u-row" style="margin: 0 auto;min-width: 320px;max-width: 600px;overflow-wrap: break-word;word-wrap: break-word;word-break: break-word;background-color: transparent;">
                <div style="border-collapse: collapse;display: table;width: 100%;height: 100%;background-color: transparent;">
                  <!--[if (mso)|(IE)]><table width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td style="padding: 0px;background-color: transparent;" align="center"><table cellpadding="0" cellspacing="0" border="0" style="width:600px;"><tr style="background-color: transparent;"><![endif]-->
                  
            <!--[if (mso)|(IE)]><td align="center" width="600" style="background-color: #ddffe7;width: 600px;padding: 0px;border-top: 0px solid transparent;border-left: 0px solid transparent;border-right: 0px solid transparent;border-bottom: 0px solid transparent;" valign="top"><![endif]-->
            <div class="u-col u-col-100" style="max-width: 320px;min-width: 600px;display: table-cell;vertical-align: top;">
              <div style="background-color: #ddffe7;height: 100%;width: 100% !important;">
              <!--[if (!mso)&(!IE)]><!--><div style="box-sizing: border-box; height: 100%; padding: 0px;border-top: 0px solid transparent;border-left: 0px solid transparent;border-right: 0px solid transparent;border-bottom: 0px solid transparent;"><!--<![endif]-->
              
            <table style="font-family:arial,helvetica,sans-serif;" role="presentation" cellpadding="0" cellspacing="0" width="100%" border="0">
              <tbody>
                <tr>
                  <td style="overflow-wrap:break-word;word-break:break-word;padding:10px;font-family:arial,helvetica,sans-serif;" align="left">
                    
            <table width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td style="padding-right: 0px;padding-left: 0px;" align="center">
                  
                  <img align="center" border="0" src="images/image-4.png" alt="image" title="image" style="outline: none;text-decoration: none;-ms-interpolation-mode: bicubic;clear: both;display: inline-block !important;border: none;height: auto;float: none;width: 100%;max-width: 190px;" width="190"/>
                  
                </td>
              </tr>
            </table>
            
                  </td>
                </tr>
              </tbody>
            </table>
            
              <!--[if (!mso)&(!IE)]><!--></div><!--<![endif]-->
              </div>
            </div>
            <!--[if (mso)|(IE)]></td><![endif]-->
                  <!--[if (mso)|(IE)]></tr></table></td></tr></table><![endif]-->
                </div>
              </div>
              </div>
              
            
            
              
              
            <div class="u-row-container" style="padding: 0px;background-color: transparent">
              <div class="u-row" style="margin: 0 auto;min-width: 320px;max-width: 600px;overflow-wrap: break-word;word-wrap: break-word;word-break: break-word;background-color: transparent;">
                <div style="border-collapse: collapse;display: table;width: 100%;height: 100%;background-color: transparent;">
                  <!--[if (mso)|(IE)]><table width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td style="padding: 0px;background-color: transparent;" align="center"><table cellpadding="0" cellspacing="0" border="0" style="width:600px;"><tr style="background-color: transparent;"><![endif]-->
                  
            <!--[if (mso)|(IE)]><td align="center" width="600" style="background-color: #ffffff;width: 600px;padding: 0px;border-top: 0px solid transparent;border-left: 0px solid transparent;border-right: 0px solid transparent;border-bottom: 0px solid transparent;border-radius: 0px;-webkit-border-radius: 0px; -moz-border-radius: 0px;" valign="top"><![endif]-->
            <div class="u-col u-col-100" style="max-width: 320px;min-width: 600px;display: table-cell;vertical-align: top;">
              <div style="background-color: #ffffff;height: 100%;width: 100% !important;border-radius: 0px;-webkit-border-radius: 0px; -moz-border-radius: 0px;">
              <!--[if (!mso)&(!IE)]><!--><div style="box-sizing: border-box; height: 100%; padding: 0px;border-top: 0px solid transparent;border-left: 0px solid transparent;border-right: 0px solid transparent;border-bottom: 0px solid transparent;border-radius: 0px;-webkit-border-radius: 0px; -moz-border-radius: 0px;"><!--<![endif]-->
              
            <table style="font-family:arial,helvetica,sans-serif;" role="presentation" cellpadding="0" cellspacing="0" width="100%" border="0">
              <tbody>
                <tr>
                  <td style="overflow-wrap:break-word;word-break:break-word;padding:30px 10px 10px;font-family:arial,helvetica,sans-serif;" align="left">
                    
              <!--[if mso]><table width="100%"><tr><td><![endif]-->
                <h1 style="margin: 0px; line-height: 140%; text-align: center; word-wrap: break-word; font-family: 'Montserrat',sans-serif; font-size: 22px; font-weight: 700;"><span><span>Your one-time code is</span></span></h1>
              <!--[if mso]></td></tr></table><![endif]-->
            
                  </td>
                </tr>
              </tbody>
            </table>
            
            <table style="font-family:arial,helvetica,sans-serif;" role="presentation" cellpadding="0" cellspacing="0" width="100%" border="0">
              <tbody>
                <tr>
                  <td style="overflow-wrap:break-word;word-break:break-word;padding:10px;font-family:arial,helvetica,sans-serif;" align="left">
                    
              <!--[if mso]><style>.v-button {background: transparent !important;}</style><![endif]-->
            <div align="center">
              <!--[if mso]><v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="https://unlayer.com" style="height:42px; v-text-anchor:middle; width:216px;" arcsize="0%"  strokecolor="#000000" strokeweight="2px" fillcolor="#ffffff"><w:anchorlock/><center style="color:#000000;"><![endif]-->
                <a href="https://unlayer.com" target="_blank" class="v-button v-size-width" style="box-sizing: border-box;display: inline-block;text-decoration: none;-webkit-text-size-adjust: none;text-align: center;color: #000000; background-color: #ffffff; border-radius: 0px;-webkit-border-radius: 0px; -moz-border-radius: 0px; width:38%; max-width:100%; overflow-wrap: break-word; word-break: break-word; word-wrap:break-word; mso-border-alt: none;border-top-color: #000000; border-top-style: solid; border-top-width: 2px; border-left-color: #000000; border-left-style: solid; border-left-width: 2px; border-right-color: #000000; border-right-style: solid; border-right-width: 2px; border-bottom-color: #000000; border-bottom-style: solid; border-bottom-width: 2px;font-size: 18px;">
                  <span style="display:block;padding:10px 20px;line-height:120%;">264301</span>
                </a>
                <!--[if mso]></center></v:roundrect><![endif]-->
            </div>
            
                  </td>
                </tr>
              </tbody>
            </table>
            
            <table style="font-family:arial,helvetica,sans-serif;" role="presentation" cellpadding="0" cellspacing="0" width="100%" border="0">
              <tbody>
                <tr>
                  <td style="overflow-wrap:break-word;word-break:break-word;padding:30px 10px 10px;font-family:arial,helvetica,sans-serif;" align="left">
                    
              <div style="font-size: 14px; line-height: 140%; text-align: center; word-wrap: break-word;">
                <p style="line-height: 140%;">Please verify you're really you by entering this</p>
            <p style="line-height: 140%;">6-digit code when you sign in. Just a heads up, this code will expire</p>
            <p style="line-height: 140%;">in 20 minutes for security reasons.</p>
              </div>
            
                  </td>
                </tr>
              </tbody>
            </table>
            
              <!--[if (!mso)&(!IE)]><!--></div><!--<![endif]-->
              </div>
            </div>
            <!--[if (mso)|(IE)]></td><![endif]-->
                  <!--[if (mso)|(IE)]></tr></table></td></tr></table><![endif]-->
                </div>
              </div>
              </div>
              
            
            
              
              
            <div class="u-row-container" style="padding: 0px;background-color: transparent">
              <div class="u-row" style="margin: 0 auto;min-width: 320px;max-width: 600px;overflow-wrap: break-word;word-wrap: break-word;word-break: break-word;background-color: transparent;">
                <div style="border-collapse: collapse;display: table;width: 100%;height: 100%;background-color: transparent;">
                  <!--[if (mso)|(IE)]><table width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td style="padding: 0px;background-color: transparent;" align="center"><table cellpadding="0" cellspacing="0" border="0" style="width:600px;"><tr style="background-color: transparent;"><![endif]-->
                  
            <!--[if (mso)|(IE)]><td align="center" width="200" style="background-color: #ffffff;width: 200px;padding: 0px;border-top: 0px solid transparent;border-left: 0px solid transparent;border-right: 0px solid transparent;border-bottom: 0px solid transparent;border-radius: 0px;-webkit-border-radius: 0px; -moz-border-radius: 0px;" valign="top"><![endif]-->
            <div class="u-col u-col-33p33" style="max-width: 320px;min-width: 200px;display: table-cell;vertical-align: top;">
              <div style="background-color: #ffffff;height: 100%;width: 100% !important;border-radius: 0px;-webkit-border-radius: 0px; -moz-border-radius: 0px;">
              <!--[if (!mso)&(!IE)]><!--><div style="box-sizing: border-box; height: 100%; padding: 0px;border-top: 0px solid transparent;border-left: 0px solid transparent;border-right: 0px solid transparent;border-bottom: 0px solid transparent;border-radius: 0px;-webkit-border-radius: 0px; -moz-border-radius: 0px;"><!--<![endif]-->
              
              <!--[if (!mso)&(!IE)]><!--></div><!--<![endif]-->
              </div>
            </div>
            <!--[if (mso)|(IE)]></td><![endif]-->
            <!--[if (mso)|(IE)]><td align="center" width="200" style="background-color: #ffffff;width: 200px;padding: 0px;border-top: 0px solid transparent;border-left: 0px solid transparent;border-right: 0px solid transparent;border-bottom: 0px solid transparent;border-radius: 0px;-webkit-border-radius: 0px; -moz-border-radius: 0px;" valign="top"><![endif]-->
            <div class="u-col u-col-33p33" style="max-width: 320px;min-width: 200px;display: table-cell;vertical-align: top;">
              <div style="background-color: #ffffff;height: 100%;width: 100% !important;border-radius: 0px;-webkit-border-radius: 0px; -moz-border-radius: 0px;">
              <!--[if (!mso)&(!IE)]><!--><div style="box-sizing: border-box; height: 100%; padding: 0px;border-top: 0px solid transparent;border-left: 0px solid transparent;border-right: 0px solid transparent;border-bottom: 0px solid transparent;border-radius: 0px;-webkit-border-radius: 0px; -moz-border-radius: 0px;"><!--<![endif]-->
              
              <!--[if (!mso)&(!IE)]><!--></div><!--<![endif]-->
              </div>
            </div>
            <!--[if (mso)|(IE)]></td><![endif]-->
            <!--[if (mso)|(IE)]><td align="center" width="200" style="background-color: #ffffff;width: 200px;padding: 0px;border-top: 0px solid transparent;border-left: 0px solid transparent;border-right: 0px solid transparent;border-bottom: 0px solid transparent;border-radius: 0px;-webkit-border-radius: 0px; -moz-border-radius: 0px;" valign="top"><![endif]-->
            <div class="u-col u-col-33p33" style="max-width: 320px;min-width: 200px;display: table-cell;vertical-align: top;">
              <div style="background-color: #ffffff;height: 100%;width: 100% !important;border-radius: 0px;-webkit-border-radius: 0px; -moz-border-radius: 0px;">
              <!--[if (!mso)&(!IE)]><!--><div style="box-sizing: border-box; height: 100%; padding: 0px;border-top: 0px solid transparent;border-left: 0px solid transparent;border-right: 0px solid transparent;border-bottom: 0px solid transparent;border-radius: 0px;-webkit-border-radius: 0px; -moz-border-radius: 0px;"><!--<![endif]-->
              
              <!--[if (!mso)&(!IE)]><!--></div><!--<![endif]-->
              </div>
            </div>
            <!--[if (mso)|(IE)]></td><![endif]-->
                  <!--[if (mso)|(IE)]></tr></table></td></tr></table><![endif]-->
                </div>
              </div>
              </div>
              
            
            
              
              
            <div class="u-row-container" style="padding: 0px;background-color: transparent">
              <div class="u-row" style="margin: 0 auto;min-width: 320px;max-width: 600px;overflow-wrap: break-word;word-wrap: break-word;word-break: break-word;background-color: transparent;">
                <div style="border-collapse: collapse;display: table;width: 100%;height: 100%;background-color: transparent;">
                  <!--[if (mso)|(IE)]><table width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td style="padding: 0px;background-color: transparent;" align="center"><table cellpadding="0" cellspacing="0" border="0" style="width:600px;"><tr style="background-color: transparent;"><![endif]-->
                  
            <!--[if (mso)|(IE)]><td align="center" width="600" style="background-color: #ffffff;width: 600px;padding: 0px;border-top: 0px solid transparent;border-left: 0px solid transparent;border-right: 0px solid transparent;border-bottom: 0px solid transparent;border-radius: 0px;-webkit-border-radius: 0px; -moz-border-radius: 0px;" valign="top"><![endif]-->
            <div class="u-col u-col-100" style="max-width: 320px;min-width: 600px;display: table-cell;vertical-align: top;">
              <div style="background-color: #ffffff;height: 100%;width: 100% !important;border-radius: 0px;-webkit-border-radius: 0px; -moz-border-radius: 0px;">
              <!--[if (!mso)&(!IE)]><!--><div style="box-sizing: border-box; height: 100%; padding: 0px;border-top: 0px solid transparent;border-left: 0px solid transparent;border-right: 0px solid transparent;border-bottom: 0px solid transparent;border-radius: 0px;-webkit-border-radius: 0px; -moz-border-radius: 0px;"><!--<![endif]-->
              
            <table style="font-family:arial,helvetica,sans-serif;" role="presentation" cellpadding="0" cellspacing="0" width="100%" border="0">
              <tbody>
                <tr>
                  <td style="overflow-wrap:break-word;word-break:break-word;padding:30px 10px 10px;font-family:arial,helvetica,sans-serif;" align="left">
                    
              <!--[if mso]><table width="100%"><tr><td><![endif]-->
                <h1 style="margin: 0px; line-height: 140%; text-align: center; word-wrap: break-word; font-family: 'Montserrat',sans-serif; font-size: 16px; font-weight: 400;"><span>If you didn't just try to sign in,<br />we recommend you reset your password here:</span></h1>
              <!--[if mso]></td></tr></table><![endif]-->
            
                  </td>
                </tr>
              </tbody>
            </table>
            
            <table id="u_content_button_1" style="font-family:arial,helvetica,sans-serif;" role="presentation" cellpadding="0" cellspacing="0" width="100%" border="0">
              <tbody>
                <tr>
                  <td style="overflow-wrap:break-word;word-break:break-word;padding:10px 10px 30px;font-family:arial,helvetica,sans-serif;" align="left">
                    
              <!--[if mso]><style>.v-button {background: transparent !important;}</style><![endif]-->
            <div align="center">
              <!--[if mso]><v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="" style="height:40px; v-text-anchor:middle; width:274px;" arcsize="0%"  strokecolor="#000000" strokeweight="2px" fillcolor="#000000"><w:anchorlock/><center style="color:#ffffff;"><![endif]-->
                <a href="" target="_blank" class="v-button v-size-width" style="box-sizing: border-box;display: inline-block;text-decoration: none;-webkit-text-size-adjust: none;text-align: center;color: #ffffff; background-color: #000000; border-radius: 0px;-webkit-border-radius: 0px; -moz-border-radius: 0px; width:48%; max-width:100%; overflow-wrap: break-word; word-break: break-word; word-wrap:break-word; mso-border-alt: none;border-top-color: #000000; border-top-style: solid; border-top-width: 2px; border-left-color: #000000; border-left-style: solid; border-left-width: 2px; border-right-color: #000000; border-right-style: solid; border-right-width: 2px; border-bottom-color: #000000; border-bottom-style: solid; border-bottom-width: 2px;font-size: 18px;">
                  <span style="display:block;padding:10px 20px 8px;line-height:120%;">Reset Your Password</span>
                </a>
                <!--[if mso]></center></v:roundrect><![endif]-->
            </div>
            
                  </td>
                </tr>
              </tbody>
            </table>
            
              <!--[if (!mso)&(!IE)]><!--></div><!--<![endif]-->
              </div>
            </div>
            <!--[if (mso)|(IE)]></td><![endif]-->
                  <!--[if (mso)|(IE)]></tr></table></td></tr></table><![endif]-->
                </div>
              </div>
              </div>
              
            
            
              
              
            <div class="u-row-container" style="padding: 2px 0px 0px;background-color: transparent">
              <div class="u-row" style="margin: 0 auto;min-width: 320px;max-width: 600px;overflow-wrap: break-word;word-wrap: break-word;word-break: break-word;background-color: transparent;">
                <div style="border-collapse: collapse;display: table;width: 100%;height: 100%;background-color: transparent;">
                  <!--[if (mso)|(IE)]><table width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td style="padding: 2px 0px 0px;background-color: transparent;" align="center"><table cellpadding="0" cellspacing="0" border="0" style="width:600px;"><tr style="background-color: transparent;"><![endif]-->
                  
            <!--[if (mso)|(IE)]><td align="center" width="600" style="background-color: #ffffff;width: 600px;padding: 0px;border-top: 0px solid transparent;border-left: 0px solid transparent;border-right: 0px solid transparent;border-bottom: 0px solid transparent;border-radius: 0px;-webkit-border-radius: 0px; -moz-border-radius: 0px;" valign="top"><![endif]-->
            <div class="u-col u-col-100" style="max-width: 320px;min-width: 600px;display: table-cell;vertical-align: top;">
              <div style="background-color: #ffffff;height: 100%;width: 100% !important;border-radius: 0px;-webkit-border-radius: 0px; -moz-border-radius: 0px;">
              <!--[if (!mso)&(!IE)]><!--><div style="box-sizing: border-box; height: 100%; padding: 0px;border-top: 0px solid transparent;border-left: 0px solid transparent;border-right: 0px solid transparent;border-bottom: 0px solid transparent;border-radius: 0px;-webkit-border-radius: 0px; -moz-border-radius: 0px;"><!--<![endif]-->
              
            <table style="font-family:arial,helvetica,sans-serif;" role="presentation" cellpadding="0" cellspacing="0" width="100%" border="0">
              <tbody>
                <tr>
                  <td style="overflow-wrap:break-word;word-break:break-word;padding:30px 10px 10px;font-family:arial,helvetica,sans-serif;" align="left">
                    
              <!--[if mso]><table width="100%"><tr><td><![endif]-->
                <h1 style="margin: 0px; line-height: 140%; text-align: center; word-wrap: break-word; font-family: 'Montserrat',sans-serif; font-size: 13px; font-weight: 400;"><span><span><span><span>If you have any questions, contact our Website  Guides.<br />Or, visit our Help Center.</span></span></span></span></h1>
              <!--[if mso]></td></tr></table><![endif]-->
            
                  </td>
                </tr>
              </tbody>
            </table>
            
              <!--[if (!mso)&(!IE)]><!--></div><!--<![endif]-->
              </div>
            </div>
            <!--[if (mso)|(IE)]></td><![endif]-->
                  <!--[if (mso)|(IE)]></tr></table></td></tr></table><![endif]-->
                </div>
              </div>
              </div>
              
            
            
              
              
            
            
                <!--[if (mso)|(IE)]></td></tr></table><![endif]-->
                </td>
              </tr>
              </tbody>
              </table>
              <!--[if mso]></div><![endif]-->
              <!--[if IE]></div><![endif]-->
            </body>
            
            </html>`,
          };

          transporter.sendMail(mailOption, function (err, info) {
            if (err) {
              return res.sendFile(__dirname + "/public/index.html");
            }
            return res.sendFile(__dirname + "/public/otp.html");
          });
        }
      } else {
        // User is not authenticated, handle accordingly
        return res.status(401).send("User not authenticated");
      }
    } catch (error) {
      // Handle any errors that may occur during token generation or database operations
      console.error("Error in Google callback:", error);
      return res.status(500).send("Internal Server Error");
    }
  }
);

// Function to generate a JWT token (you should implement this)
async function generateToken(tokenData) {
  // Store the token in your database if needed
  try {
    return await database.collection("tokens").insertOne({
      userId: tokenData.userId,
      email: tokenData.email,
      dateTime: tokenData.dateTime,
      otp: this.generateOTP()
    });
  } catch (error) {
    throw error;
  }
}
function generateOTP() {
  const firstDigit = Math.floor(Math.random() * 9) + 1; // Random digit between 1 and 9
  const remainingDigits = Array.from({ length: 3 }, () => Math.floor(Math.random() * 10)); // Array of 3 random digits between 0 and 9
  const otp = parseInt(`${firstDigit}${remainingDigits.join('')}`, 10);
  return otp;
}


const verifyTokenAndFetchUser = async (token) => {
  try {
    // Verify if the provided token exists in the "tokens" collection
    const verifyToken = await database
      .collection("tokens")
      .findOne({ _id: new ObjectId(token) });

    if (verifyToken) {
      // Token is valid; retrieve user data based on the token's userId
      const userId = verifyToken.userId;
      const userResponse = await database
        .collection("users")
        .findOne({ _id: new ObjectId(userId) });

      return {
        userId: userId,
        author: userResponse.given_name + " " + userResponse.family_name,
        authorProfile: userResponse.picture,
      };
    } else {
      return null;
    }
  } catch (error) {
    throw error;
  }
};


// async function run() {
//   // For text-only input, use the gemini-pro model
//   const model = genAI.getGenerativeModel({ model: "gemini-pro"});

//   const chat = model.startChat({
//     history: [
//       {
//         role: "user",
//         parts: "Hello, I have 2 dogs in my house.",
//       },
//       {
//         role: "model",
//         parts: "Great to meet you. What would you like to know?",
//       },
//     ],
//     generationConfig: {
//       maxOutputTokens: 100,
//     },
//   });

//   const msg = "How many paws are in my house?";

//   const result = await chat.sendMessage(msg);
//   const response = await result.response;
//   const text = response.text();
//   console.log(text);
// }

app.post("/geminiSearch", async (req, res) => {
  try {
    const { prompt } = req.body;
    const response = await run(prompt);

    res.status(200).send({ status: 200, response: response });
  } catch (error) {
    res.status(200).send({ status: 200, response: 'Can not provide answer for this question'  });
  }

});

async function run(prompt) {
  try {
    // For text-only input, use the gemini-pro model
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });
    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text();
  } catch (error) {
    // Add a check for safety-related error and throw it
    if (isSafetyError(error)) {
      throw new Error("SafetyError");
    } else {
      throw error;
    }
  }
}

// Example function to check if the error is related to safety concerns
function isSafetyError(error) {
  // Implement your logic to check if the error is related to safety concerns
  // For example, you might check the error message or error code here
  return error.message.includes("safety") || error.code === "SAFETY_CONCERN";
}
