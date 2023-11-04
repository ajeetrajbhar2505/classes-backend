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


// files
const PORT = 3000
const mongo_url =  "mongodb+srv://ajeet:fYLvMkLPRY6vwbGy@cluster0.e5pj6.mongodb.net/"
const API_KEY = "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"
const Google_apiKey = "AIzaSyDawuFcZATmMq4CWIkWXJIDbK4VnAtRYw4"
const cx = "216b4fc1a48f24748"
const OAuth_client_id = "137958169014-s5s64uk9bpfm5m03t0sm6ci991lolke2.apps.googleusercontent.com"
const OAuth_Client_secret = "c"
const OAuth_Callback_url = "https://scary-slippers-lamb.cyclic.app/google/callback"

const type =  "service_account"
const project_id =  "uploadfiles-399908"
const private_key_id =  "265a376b488ddb81d6ed0af307f7453cbb94c23d"
const private_key =  "-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQCxHUp8F6Oib483\ntW1S4/OF17ewS4r2qkCYLH8GIh7qnZXme6r0gG2At1391avTc4Ev/iUqyhIJYXpv\nnyyXENI/WCNqoL7jtHGOD3LjVDTsnkasrrv+WzExLoWYRN9E+5QQhMF2BAtPFKeY\n57Qfxd5Qh56c3mB8WhTXspSOY8k3M4W8HBwVnwyvUY+LIGc3KgSlpSHWNlcjhvEV\nubsqsOcfDkgoV8SrArpD9xQW05XGx7BoYiwzRRpyeds9y4xvzdol3sQZYm/xjBoO\np4mlnSgyilH6YDTl6BG9S96Ofi17ldAvaycfWu59NBaYiJ54TAnToCEjyL1vOOcu\nZt+iostnAgMBAAECggEATkV+DdIamCYKGln82tVvYPZgsLHp0zGRQ07iwfChThjf\nTpDXj58UBX7DtHJRsaxJas67WSodB3VDOQIUoBwodiL639vzEElFp7zPDoS/sNQP\nsq+z1+gwGKaRFqZVLzSpDhXFM2T9JHEh0fKPyTzWDyuoHnYuGLZsoJhEi5qwqUpI\nU0ZTDtTDqQgYoE5k3mtyHZFP/ykjhsFSt4Ko815hL1XHwbea29UgHMKMUXiPBMNg\nlx6CyoTnjudUA26Pw6TN9G5F63h2zBcv9zCPAgGpGRQNKFuHHHURj/w/SKxVSTZ5\nypPkleyufJbNe4o+MQSwJ0zsNzOAiIO9KMu95BIuzQKBgQDnb2I0KFPLjxJJTDqf\n2mJ4u70DAu7qGHB/hxmpm8/yaTL8zW0j1WiH636rgR4ou4wCQ3ltH4l3UdtSvdQ5\nQnxIZ8jC6VrBhlSSRCSRP6DyH/YbInzQHDIA5qJdmIwIHGcIAfo+aF9ZryrWB0V/\nz7Fh82Pj7zdPPQyTu4Yoz3OvPQKBgQDD6eQzvyNgk7V+reOQI00OHeBYjr115GDn\nWOqD+psR2uoctjB9vVgCtpCOWEvaU53jLsbrlxDU1deaYP96J7/bdTTNFFfCrEWv\nhOQQrbd8qKoEm4nJ2DOABQUgabEXWAi5u+yi2lGadZuqW8wivo1uWyrsXfWTDfYy\n30sqSmiPcwKBgGFsXeae40dZXtVEJZmNEM7KGPLflTsuNo04jfD8Cjl9V11cDIl9\nGJe+5n/DxrJW4MVDKiZplDCKYM0f4+qGtlK0faqvGOlGZut7i/ko09OY6Lzbc7cX\nZ2VBsS+9O5Vef3C7hGApB5p1Ro76WKNJBt642l/lH19Xz6eQ1RTw3z3xAoGBAIxz\nue5/MVWjj5JqB6LmK+/a62ORsbI7MF2rGTXVDCcY0o4S72C1xcrsJ2ZlVrwHBkJA\n3ss3WhG73P4IXB+vL5SdymTcGK6v4qWamAZ9A/aS1JDJEVdrcEBvWOWL4DHkIx1E\n5Lk72xTpC9huR0MBaVOceIFMOypZ8A84liKThbKRAoGAIL5jmr2PRZLn+YwZ/BK8\nQmMkuncrpFwkJKY8O16/ZGx6ffMNZIcmTBGi7BNCd/bwUDY96RiQ2A2XZuj1EYvC\n7r7A+Jlwacp2tp9tw7v7HHS/WIdf3L4OoExsJ+dXOZotHR6tat7gSRS33mpFhmfB\const nELMEPaEIsc3hf8ZFyiXNQG4=\n-----END PRIVATE KEY-----\n"
const client_email =  "fileupload@uploadfiles-399908.iam.gserviceaccount.com"
const client_id =  "106242195859709849813"
const client_secret = "65a376b488ddb81d6ed0af307f7453cbb94c23d"
const auth_uri =  "https://accounts.google.com/o/oauth2/auth"
const token_uri =  "https://oauth2.googleapis.com/token"
const auth_provider_x509_cert_url =  "https://www.googleapis.com/oauth2/v1/certs"
const client_x509_cert_url =  "https://www.googleapis.com/robot/v1/metadata/x509/fileupload%40uploadfiles-399908.iam.gserviceaccount.com"
const universe_domain =  "googleapis.com"




const fs = require("fs");
const { google } = require("googleapis");
const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;

// Serve static files from the 'public' directory
app.use(express.static(__dirname + "/public"));

// Configure session middleware
app.use(
  require("express-session")({
    secret: private_key,
    resave: true,
    saveUninitialized: true,
  })
);

// Initialize Passport
app.use(passport.initialize());
app.use(passport.session());

// Connection URI
const MongoClient = require("mongodb").MongoClient;
const uri = mongo_url; // Change this to your MongoDB server URI

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
  let response = await database.collection("classDetails").find({}).toArray();
  if (response) {
    res.send({ status: 200, response: response });
  }
});

app.get("/mostWatched", authorizeToken, async (req, res) => {
  let response = await database.collection("lectureDetails").find({}).toArray();
  if (response) {
    res.send({ status: 200, response: response });
  }
});

app.get("/lectureDetails/:classId", authorizeToken, async (req, res) => {
  const { classId } = req.params;
  let response = await database
    .collection("lectureDetails")
    .find({ classId: classId })
    .toArray();
  if (response) {
    res.send({ status: 200, response: response });
  }
});

app.get(
  "/contentDetails/:classId/:lec_id",
  authorizeToken,
  async (req, res) => {
    const { classId, lec_id } = req.params;
    let response = await database
      .collection("contentDetails")
      .find({ classId: classId, lec_id: lec_id })
      .toArray();
    if (response) {
      res.send({ status: 200, response: response });
    }
  }
);

app.get(
  "/content/:classId/:lec_id/:content_id",
  authorizeToken,
  async (req, res) => {
    const { classId, lec_id, content_id } = req.params;
    let response = await database
      .collection("contentDetails")
      .find({ _id: new ObjectId(content_id) })
      .toArray();
    if (response) {
      res.send({ status: 200, response: response });
    }
  }
);

app.get("/notifications", authorizeToken, async (req, res) => {
  let response = await database.collection("notifications").find({}).toArray();
  const token = req.headers.authorization.substring("Bearer ".length);
  const userData = await verifyTokenAndFetchUser(token);
  if (response && userData) {
    response = response.filter(notification => notification.authorId !== userData.userId);
    res.send({ status: 200, response: response });
  }
  else{
    res.send({ status: 200, response: "Something went wrong" });
  }
});

app.get("/contentDetails", authorizeToken, async (req, res) => {
  const { classId, lec_id, content_id } = req.params;
  let response = await database.collection("contentDetails").find({}).toArray();
  if (response) {
    res.send({ status: 200, response: response });
  }
});

app.get("/calenderDetails/:desiredMonth", authorizeToken, async (req, res) => {
  const { desiredMonth } = req.params;
  try {
    const response = await database
      .collection("calenderDetails")
      .find({ month: desiredMonth })
      .toArray();

    res.send({ status: 200, response: response });
  } catch (error) {
    console.error(error);
    res.status(500).send({ status: 500, message: "Internal Server Error" });
  }
});

app.post("/upsertCalenderDetails", authorizeToken, async (req, res) => {
  try {
    let response = await database
      .collection("calenderDetails")
      .insertOne(req.body);
    if (response) {
      res.send({ status: 200, response: response });
    } else {
      res.send({ status: 200, response: "Something went wrong" });
    }
  } catch (error) {
    res.send({ status: 500, response: "Internal server error" });
  }
});

app.get("/Querries/:contentId", authorizeToken, async (req, res) => {
  const { contentId } = req.params;
  try {
    const response = await database
      .collection("Querries")
      .find({ contentId: contentId })
      .toArray();

    res.send({ status: 200, response: response });
  } catch (error) {
    console.error(error);
    res.status(500).send({ status: 500, message: "Internal Server Error" });
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

    let response = await database.collection("Querries").insertOne(body);
    Object.assign(body, { _id: response.insertedId.toString() });

    if (response) {
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

      let notificationResponse = await database
        .collection("notifications")
        .insertOne(notification);
      io.emit("notification", notification);

      res.send({ status: 200, response: "Message send successfully!" });
    } else {
      res.send({ status: 200, response: "Something went wrong" });
    }
  } catch (error) {
    res.send({ status: 500, response: "Internal server error" });
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

server.listen(PORT, connectToMongoDB(), () => {
  console.log("app running fast");
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
    let response = await database
      .collection("quizes")
      .insertOne(req.body);
    if (response) {
      res.send({ status: 200, response: 'Quiz uploaded successfully' });
    } else {
      res.send({ status: 200, response: "Something went wrong" });
    }
  } catch (error) {
    res.send({ status: 500, response: "Internal server error" });
  }
});

app.get("/fetchquizes/:classId/:lec_id", authorizeToken, async (req, res) => {
  const { classId,lec_id} = req.params
  try {
    const classDetails = await database
      .collection("classDetails").find({_id : new ObjectId(classId)}).toArray()
      if (classDetails.length === 0) {
        return res.status(404).send({ status: 404, response: "Class not found" });
      }
    const className = classDetails[0].classNamme || ''
    const response = await database
      .collection("quizes").find({ classId, lec_id }).toArray()
      response.forEach(element => {
        element.className = className
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
  const { paperId } = req.params
  try {
    const response = await database
      .collection("quizes").findOne({_id :new ObjectId(paperId)})
    if (response) {
      res.send({ status: 200, response: response });
    } else {
      res.send({ status: 200, response: "Something went wrong" });
    }
  } catch (error) {
    res.send({ status: 500, response: "Internal server error" });
  }
});

const scope = ["https://www.googleapis.com/auth/drive"];

async function authorize() {
  const jwtClient = new google.auth.JWT(
    client_email,
    null,
    private_key,
    scope
  );

  await jwtClient.authorize();

  return jwtClient;
}

// Create the "uploads" directory if it doesn't exist
const uploadDirectory = "files/";

// Function to upload a file to Google Drive
async function uploadFile(authClient, fileInfo) {
  return new Promise((resolve, reject) => {
    const drive = google.drive({ version: "v3", auth: authClient });

    const fileMetaData = {
      name: fileInfo.originalname,
      parents: ["1CBsb1iOv_zEVn3A8JdxiiH3nWOrcUXpI"],
    };

    drive.files.create(
      {
        resource: fileMetaData,
        media: {
          mimeType: fileInfo.mimetype,
          body: fs.createReadStream(`${uploadDirectory + fileInfo.filename}`),
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
const upload = multer({ storage });

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

app.post("/upsertContentDetails", authorizeToken, async (req, res) => {});

// Google signup
// Configure Google OAuth Strategy
passport.use(
  new GoogleStrategy(
    {
      clientID: OAuth_client_id,
      clientSecret: OAuth_Client_secret,
      callbackURL: OAuth_Callback_url,
      scope: 'email',
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
      return res.status(400).json({ status: 400, response: "Missing user _id" });
    }

    const updateId = new ObjectId(_id);
    delete profileData._id

    const response = await database.collection("users").updateOne(
      { _id: updateId },
      { $set: profileData },
      { upsert: true }
    );

    if (response.matchedCount === 0) {
      return res.status(404).json({ status: 404, response: "User not found" });
    }

    if (response.modifiedCount === 0) {
      return res.status(200).json({ status: 200, response: "No changes made" });
    }

    res.status(200).json({ status: 200, response: "Profile updated successfully" });
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
          });
          return res
            .status(200)
            .redirect(
              "http://localhost:8100/sucessfull/" +
                userExists._id.toString() +
                "/" +
                response.insertedId
            );
        } else {
          // User doesn't exist, create a new user
          const response = await database
            .collection("users")
            .insertOne({ ...req.user._json, logged: true });

          const tokenData = {
            userId: response.insertedId.toString(),
            email: req.user._json.email,
            dateTime: new Date(),
          };

          // Generate a token (assuming you have a function for this)
          const token = await generateToken(tokenData);

          if (!token) {
            // Handle token generation failure
            return res.status(500).send("Token generation failed");
          }

          // Send the token in the response
          return res
            .status(200)
            .redirect(
              "http://localhost:8100/sucessfull/" +
                response.insertedId.toString() +
                "/" +
                token.insertedId
            );
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