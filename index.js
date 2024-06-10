const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const app = express();
require("dotenv").config();
const port = process.env.PORT || 8000;

// middleware
app.use(express.json());
app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "https://animal-carings.web.app",
      "https://animal-carings.firebaseapp.com",
    ],
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
    // await client.connect();
    // Send a ping to confirm a successful connection
    // await client.db("admin").command({ ping: 1 });

    // all database collection
    const database = client.db("petAdoption");
    const petCollection = database.collection("pets");
    const userCollection = database.collection("users");
    const adoptReqCollection = database.collection("adoptRequest");
    // const donationCollection = database.collection("donations");
    const donationCampaignsCollection =
      database.collection("donationCampaigns");
    const paymentCollection = database.collection("payments");

    // jwt
    app.post("/jwt", async (req, res) => {
      const userEmail = req.body;
      const token = jwt.sign(userEmail, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: "365d",
      });
      res.send({ token });
    });

    // middlewares
    const verifyToken = (req, res, next) => {
      if (!req.headers.authorization) {
        return res.status(401).send({ message: "access forbidden!" });
      }
      const token = req.headers.authorization.split(" ")[1];

      jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
        if (err) {
          return res.status(401).send({ message: "forbidden access" });
        }

        req.decoded = decoded;
        // console.log(decoded);
        next();
      });
    };

    const verifyAdmin = async (req, res, next) => {
      const email = req.decoded?.email;
      const query = { email: email };
      const user = await userCollection.findOne(query);
      const isAdmin = user?.role === "admin";

      if (!isAdmin) {
        return res.status(403).send({ message: "forbidden access" });
      }
      next();
    };

    app.get("/", (req, res) => {
      res.send("I am always running on!");
    });

    // isAdmin - check
    app.get("/user/admin/:email", verifyToken, async (req, res) => {
      const email = req.params.email;
      if (email !== req.decoded.email) {
        return res.status(403).send({ message: "unauthorized access" });
      }

      const query = { email: email };
      const user = await userCollection.findOne(query);

      let admin = false;
      if (user) {
        admin = user?.role === "admin";
      }

      res.send({ admin });
    });

    // get all pet data
    app.get("/pets", async (req, res) => {
      const query = { adopted: false };
      const result = await petCollection.find(query).toArray();
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
      // console.log({ isExist, query });

      if (isExist) {
        return res.send({ isExist: true });
      }

      const result = await adoptReqCollection.insertOne(petAdpot);
      res.send(result);
    });

    app.put(`/accept-adopt-req/:id`, async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };

      const updatedDocs = {
        $set: {
          accept: true,
        },
      };
      const result = await adoptReqCollection.updateOne(filter, updatedDocs);
      res.send(result);
    });

    app.delete("/adopt-request/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const result = await adoptReqCollection.deleteOne(filter);
      res.send(result);
    });

    // update pet by user
    // app.put("/updatePet", async (req, res) => {});

    // get all pets by admin
    app.get("/petsByAdmin", async (req, res) => {
      const result = await petCollection.find().toArray();
      res.send(result);
    });

    // get all users by admin
    app.get("/users", verifyToken, verifyAdmin, async (req, res) => {
      const result = await userCollection.find().toArray();
      res.send(result);
    });

    // get all donation by admin
    app.get(
      "/get-all-donation-by-admin",
      verifyToken,
      verifyAdmin,
      async (req, res) => {
        const result = await donationCampaignsCollection.find().toArray();
        res.send(result);
      }
    );
    // get signle donation by admin
    app.get("/get-signle-donation-by-admin/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await donationCampaignsCollection.findOne(query);
      res.send(result);
    });

    // update donation data by admin
    app.put("/update-donation/:id", async (req, res) => {
      const id = req.params.id;
      const {
        getDonationAmount,
        lastDate,
        longDescription,
        maxDonationAmount,
        name,
        image,
        shortDescription,
      } = req.body;

      const filter = { _id: new ObjectId(id) };

      const updatedDocs = {
        $set: {
          getDonationAmount,
          lastDate,
          longDescription,
          maxDonationAmount,
          name,
          image,
          shortDescription,
        },
      };

      const result = await donationCampaignsCollection.updateOne(
        filter,
        updatedDocs
      );
      res.send(result);
    });

    // delete donation by admin
    app.delete("/delete-donation/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await donationCampaignsCollection.deleteOne(query);
      res.send(result);
    });

    // pause - donation campaign
    app.put("/donation-status/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };

      const campaignItem = await donationCampaignsCollection.findOne(query);
      const isPause = campaignItem?.pause;
      console.log({ isPause });
      if (isPause) {
        const update = {
          $set: {
            pause: false,
          },
        };
        const result = await donationCampaignsCollection.updateOne(
          query,
          update
        );
        res.send(result);
      } else {
        const update = {
          $set: {
            pause: true,
          },
        };
        const result = await donationCampaignsCollection.updateOne(
          query,
          update
        );
        res.send(result);
      }
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

    app.patch("/make-admin/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const makeAdmin = {
        $set: {
          role: "admin",
        },
      };
      const result = await userCollection.updateOne(filter, makeAdmin);
      res.send(result);
    });

    // get pets data by user email (my added pets)

    // TODO: update by email params
    // app.get("/my-added-pets/:email", async (req, res) => {
    app.get("/my-added-pets/:email", async (req, res) => {
      const email = req.params.email;
      const query = { userEmail: email };
      const result = await petCollection.find(query).toArray();
      res.send(result);
    });

    // add user pets
    app.post("/pets", async (req, res) => {
      const {
        name,
        age,
        userEmail,
        category,
        location,
        shortDescription,
        longDescription,
        image,
      } = req.body;

      const newPet = {
        name,
        age,
        userEmail,
        category,
        location,
        shortDescription,
        longDescription,
        adopted: false,
        image,
        createdAt: new Date(),
      };

      const result = await petCollection.insertOne(newPet);
      res.send(result);
    });

    app.put("/pets/:id", async (req, res) => {
      const id = req.params.id;
      const {
        name,
        age,
        image,
        category,
        location,
        shortDescription,
        longDescription,
      } = req.body;

      const filter = { _id: new ObjectId(id) };
      const updatedDocs = {
        $set: {
          name,
          age,
          image,
          category,
          location,
          shortDescription,
          longDescription,
        },
      };

      const result = await petCollection.updateOne(filter, updatedDocs);
      res.send(result);
    });

    app.patch("/mark-adopt/:id", verifyToken, async (req, res) => {
      const id = req.params.id;
      console.log({ id });
      const filter = { _id: new ObjectId(id) };
      const markAdpot = {
        $set: {
          adopted: true,
        },
      };
      const result = await petCollection.updateOne(filter, markAdpot);
      res.send(result);
    });

    app.patch(
      "/mark-not-adopt/:id",
      verifyToken,
      verifyAdmin,
      async (req, res) => {
        const id = req.params.id;
        console.log({ id });
        const filter = { _id: new ObjectId(id) };
        const markAdopt = {
          $set: {
            adopted: false,
          },
        };
        const result = await petCollection.updateOne(filter, markAdopt);
        res.send(result);
      }
    );

    // delete user added pets
    app.delete("/pets/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const deletedPet = await petCollection.deleteOne(query);
      res.send(deletedPet);
    });

    // get all donation for home page
    app.get("/donations", async (req, res) => {
      const result = await donationCampaignsCollection.find().toArray();
      res.send(result);
    });

    // get single donation for home page details
    app.get("/donations/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await donationCampaignsCollection.findOne(query);
      res.send(result);
    });

    // get my donation (campaign)
    app.get("/my-donation-campaign/:email", async (req, res) => {
      const result = await donationCampaignsCollection.find().toArray();
      res.send(result);
    });

    // create donation campaign
    app.post("/create-donation-campaign", async (req, res) => {
      const {
        name,
        image,
        lastDate,
        maxDonationAmount,
        shortDescription,
        longDescription,
      } = req.body;

      const newCampaign = {
        name,
        image,
        maxDonationAmount,
        getDonationAmount: 0,
        lastDate,
        shortDescription,
        longDescription,
        createdAt: new Date(),
        pause: false,
        isClose: false,
      };

      const result = await donationCampaignsCollection.insertOne(newCampaign);
      res.send(result);
    });

    // payment intent
    app.post("/create-payment-intent", async (req, res) => {
      const { price } = req.body;
      const amount = parseInt(price * 100);

      const paymentIntent = await stripe.paymentIntents.create({
        amount,
        currency: "usd",
        payment_method_types: ["card"],
      });

      res.send({ clientSecret: paymentIntent.client_secret });
    });

    app.get("/payments/:email", verifyToken, async (req, res) => {
      const query = { email: req.params.email };
      if (req.params.email !== req.decoded.email) {
        return res.status(403).send({ message: "forbidden access" });
      }
      const result = await paymentCollection.find(query).toArray();
      res.send(result);
    });

    app.post("/payments", async (req, res) => {
      const payment = req.body;
      const paymentResult = await paymentCollection.insertOne(payment);

      // carefully delete each item from the cart
      console.log({ payment });
      const query = {
        _id: {
          $in: payment.cartIds.map((id) => new ObjectId(id)),
        },
      };

      // const deleteResult = await cartCollection.deleteMany(query);

      res.send({ paymentResult, deleteResult });
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
