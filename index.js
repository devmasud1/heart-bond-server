const express = require("express");
const cors = require("cors");
require("dotenv").config();
const { MongoClient, ServerApiVersion } = require("mongodb");

const app = express();
const port = process.env.PORT || 5000;

//middleware
app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.aunb3y8.mongodb.net/?retryWrites=true&w=majority`;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    const allBioDataCollection = client.db("hurtBondDB").collection("allBioData");
    const premiumBioDataCollection = client.db("hurtBondDB").collection("premiumBioData");
    const reviewsCollection = client.db("hurtBondDB").collection("reviews");

      //all-bio-data
      app.get('/bioData', async(req, res) => {
        const result = await allBioDataCollection.find().toArray();
        res.send(result);
      })

      //premium-bio-data
      app.get('/premium-bioData', async(req, res) => {
        const result = await premiumBioDataCollection.find().toArray();
        res.send(result);
      })

      //review
      app.get('/reviews', async(req, res) => {
        const result = await reviewsCollection.find().toArray();
        res.send(result);
      })

    await client.db("admin").command({ ping: 1 });
    console.log("successfully connected to MongoDB!");
  } finally {
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Hello - Heart bond!");
});

app.listen(port, () => {
  console.log(`Heart bond listening on port ${port}`);
});
