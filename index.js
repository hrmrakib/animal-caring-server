const express = require("express");
const cors = require("cors");
const app = express();
require("dotenv").config();
const port = process.env.PORT || 8000;

// middleware
app.use(express.json());
app.use(
  cors({
    origin: ["http://localhost:5173", "http://localhost:5174"],
    credentials: true,
    optionsSuccessStatus: 200,
  })
);

const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.dmwxvyo.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

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
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();
    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });

    // all database collection
    const database = client.db("petAdoption");
    const petCollection = database.collection("pets");
    const userCollection = database.collection("users");
    const adoptReqCollection = database.collection("adoptRequest");

    // get all pet data
    app.get("/pets", async (req, res) => {
      const result = await petCollection.find({ adopted: false }).toArray();
      res.send(result);
    });

    // get a single pet data
    app.get("/pets/:id", async (req, res) => {
      const id = req.params.id;
      const result = await petCollection.findOne({ _id: new ObjectId(id) });
      res.send(result);
    });

    // get all adopt request
    app.get("/adopt-request", async (req, res) => {
      const result = await adoptReqCollection.find().toArray();
      res.send(result);
    });

    // adopt request
    app.post("/adopt-request", async (req, res) => {
      const petAdpot = req.body;

      // checking own pet
      // TODO: please, do it

      // chacking is exist!
      const query = { adoptId: petAdpot.adoptId };
      const isExist = await adoptReqCollection.findOne(query);
      console.log({ isExist, query });

      if (isExist) {
        return res.send({ isExist: true });
      }

      const result = await adoptReqCollection.insertOne(petAdpot);
      res.send(result);
    });

    // update pet by user
    app.put("/updatePet", async (req, res) => {});

    // get all pets by admin
    app.get("/petsByAdmin", async (req, res) => {
      const result = await petCollection.find().toArray();
      res.send(result);
    });

    // get all users by admin
    app.get("/users", async (req, res) => {
      const result = await userCollection.find().toArray();
      res.send(result);
    });

    // create a user
    app.post("/users", async (req, res) => {
      const user = req.body;

      const query = { email: user.email };

      const existingUser = await userCollection.findOne(query);

      if (existingUser) {
        return res.send({ message: "user already exist!" });
      }

      const result = await userCollection.insertOne(user);
      res.send(result);
    });

    // get pets data by user email (my added pets)

    // TODO: update by email params
    // app.get("/my-added-pets/:email", async (req, res) => {
    app.get("/my-added-pets", async (req, res) => {
      const query = req.params.email;
      const result = await petCollection.find().toArray();
      res.send(result);
    });

    // add user pets
    app.post("/pets", async (req, res) => {
      const pet = req.body;
      const result = await petCollection.insertOne(pet);
      res.send(result);
    });

    // delete user added pets
    app.delete("/pets/:id", async (req, res) => {
      const id = req.params.id;
      const deletedPet = await petCollection.deleteOne(id);
      res.send(deletedPet);
    });

    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.listen(port, () => {
  console.log(`Server is listening on ${port}`);
});
