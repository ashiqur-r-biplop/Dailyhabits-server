require("dotenv").config();
const express = require("express");
const cors = require("cors");
const app = express();
const jwt = require("jsonwebtoken");
const port = process.env.PORT || 5000;
// const stripe = require("stripe")(process.env.PAYMENT_SECRET_KEY);

const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
// middleware
app.use(cors());
app.use(express.json());
const username = process.env.USER_NAME;
const password = process.env.PASSWORD;

const uri = `mongodb+srv://${username}:${password}@cluster0.klmvqmu.mongodb.net/?retryWrites=true&w=majority`;
const verifyJWT = (req, res, next) => {
  const authorization = req.headers.authorization;
  // console.log(authorization);
  if (!authorization) {
    return res
      .status(401)
      .send({ error: true, message: "unauthorized access" });
  }

  const token = authorization.split(" ")[1];
  // console.log(token);
  jwt.verify(token, process.env.ACCESS_SECRET_TOKEN, (err, decoded) => {
    if (err) {
      return res
        .status(401)
        .send({ error: true, message: "unauthorized access2" });
    }

    req.decoded = decoded;
    next();
  });
};
// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    const userCollection = client.db("habitReminder").collection("users");
    const habitCollection = client.db("habitReminder").collection("habit");
    const notesCollection = client.db("habitReminder").collection("notes");

    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();
    // Send a ping to confirm a successful connection
    app.post("/jwt", (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_SECRET_TOKEN, {
        expiresIn: "1h",
      });
      res.send({ token });
    });

    app.post("/users", async (req, res) => {
      const userEmail = req.body;
      const query = { email: userEmail.email };
      const existingUser = await userCollection.findOne(query);
      console.log(query);
      if (existingUser) {
        return res.send({ message: "user already exists" });
      }
      const result = await userCollection.insertOne(userEmail);
      res.send(result);
    });

    app.post("/habit", verifyJWT, async (req, res) => {
      try {
        const habit = req.body;
        const query = await habitCollection
          .find({ email: habit.email })
          .toArray();
        console.log(query);
        if (query) {
          const order = { ...habit, habitNumber: query.length + 1, archive: 0 };
          const result = await habitCollection.insertOne(order);
          res.send(result);
        } else {
          const order = { ...habit, habitNumber: 1, archive: 0 };
          const result = await habitCollection.insertOne(order);
          res.send(result);
        }
      } catch (error) {
        console.log(error);
      }
    });
    app.get("/habit/:email", verifyJWT, async (req, res) => {
      try {
        const query = req.params;
        const result = await habitCollection
          .find({ userEmail: query.email })
          .toArray();
        res.send(result);
      } catch (error) {
        console.log(error);
      }
    });
    app.post("/notes/:email", verifyJWT, async (req, res) => {
      const body = req.body;
      const result = await notesCollection.insertOne(body);
      res.send(result);
    });

    app.get("/notes/:email", verifyJWT, async (req, res) => {
      try {
        const query = req.params;
        const result = await notesCollection
          .find({ email: query.email })
          .toArray();
        res.send(result);
      } catch (error) {
        console.log(error);
      }
    });
    app.delete("/delete-note/:id", verifyJWT, async (req, res) => {
      try {
        const id = req.params.id;
        const query = { _id: new ObjectId(id) };
        const result = await notesCollection.deleteOne(query);
        res.send(result);
      } catch (error) {
        console.log(error);
      }
    });
    app.patch("/update-notes/:id", verifyJWT, async (req, res) => {
      try {
        const id = req.params.id;
        const query = { _id: new ObjectId(id) };
        const body = req.body;
        const note = await notesCollection.findOne(query);
        const options = { upsert: true };

        const updatePhoto = {
          $set: {
            text: body?.text ? body?.text : note.text,
          },
        };
        const result = await notesCollection.updateOne(
          query,
          updatePhoto,
          options
        );
        res.send(result);
      } catch (error) {
        console.log(error);
      }
    });
    app.patch("/update-habit/:id", verifyJWT, async (req, res) => {
      try {
        const id = req.params.id;
        const query = { _id: new ObjectId(id) };
        const body = req.body;
        const habit = await habitCollection.findOne(query);
        const options = { upsert: true };
        const updatePhoto = {
          $set: {
            habit: body?.habit ? body?.habit : habit.habit,
            goal: body?.goal ? body?.goal : habit?.goal,
          },
        };
        const result = await habitCollection.updateOne(
          query,
          updatePhoto,
          options
        );
        res.send(result);
      } catch (error) {
        console.log(error);
      }
    });

    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", async (req, res) => {
  res.send("habit testing server");
});

app.listen(port, () => {
  console.log(`habit server running is sitting on the port ${port}`);
});
