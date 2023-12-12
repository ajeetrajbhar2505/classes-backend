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
    const response = await database.collection("contentDetails").find({ view: { $gt: 0 } }).toArray();
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
  const contentId = new ObjectId(req.body.contentId);
  const viewer = req.body.userProfile;

  try {
    // Remove existing viewer
    const pullOperation = {
      $pull: { viewers: { userId: viewer.userId } }
    };

    await database.collection("contentDetails").updateOne(
      { _id: contentId },
      pullOperation
    );

    // Add the new viewer
    const pushOperation = {
      $inc: { view: 1 },
      $push: { viewers: viewer } // Add the new viewer
    };

    let response = await database.collection("contentDetails").updateOne(
      { _id: contentId },
      pushOperation,
      { upsert: true }
    );

    if (response.modifiedCount === 1) {
      res.status(200).send({ status: 200, response: response });
    }
  } catch (error) {
    console.error("Error in upsertViewCount:", error);
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
    // Remove existing viewer
    const pullOperation = {
      $pull: { viewers: { userId: viewer.userId } }
    };

    await database.collection("contentDetails").updateOne(
      { _id: contentId },
      pullOperation
    );

    // Add the new viewer
    const pushOperation = {
      $push: { viewers: viewer } // Add the new viewer
    };

    let response = await database.collection("contentDetails").updateOne(
      { _id: contentId },
      pushOperation,
      { upsert: true }
    );

    if (response.modifiedCount === 1) {
      res.status(200).send({ status: 200, response: response });
    }
  } catch (error) {
    console.error("Error in upsertViewCount:", error);
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

app.get("/content/:classId/:lec_id/:content_id", authorizeToken, async (req, res) => {
  try {
    const { classId, lec_id, content_id } = req.params;
    const response = await database
      .collection("contentDetails")
      .find({ _id: new ObjectId(content_id) })
      .toArray();

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
  const { otp } = req.body;
  try {
    const response = await database.collection("tokens").findOne({ otp: otp });
    if (response) {
      return res.status(200).send({
        status: 200,
        response: { userId: response.userId, token: response._id.toString() },
      });
    } else {
      res.send({ status: 204, response: "OTP is Invalid" });
    }
  } catch (error) {
    res.send({ status: 500, response: "Internal server error" });
  }
});

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
        text: `A one-time password is ${otp}`,
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
            text: `A one-time password is ${otp}`,
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
            text: `A one-time password is ${otp}`,
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
