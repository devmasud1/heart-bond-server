const express = require("express");
const cors = require("cors");
require("dotenv").config();
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const stripe = require("stripe")(process.env.STRIPE_KEY);

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
    const userCollection = client.db("hurtBondDB").collection("users");
    const allBioDataCollection = client
      .db("hurtBondDB")
      .collection("allBioData");
    const premiumBioDataCollection = client
      .db("hurtBondDB")
      .collection("premiumBioData");
    const reviewsCollection = client.db("hurtBondDB").collection("reviews");
    const requestPremiumCollection = client
      .db("hurtBondDB")
      .collection("requestPremium");
    const favoritesBioCollection = client
      .db("hurtBondDB")
      .collection("favorites");
    const paymentCollection = client.db("hurtBondDB").collection("payments");

    //payment method
    app.post("/create-payment-intent", async (req, res) => {
      const { price } = req.body;
      const amount = parseInt(price * 100);

      const paymentIntent = await stripe.paymentIntents.create({
        amount: amount,
        currency: "usd",
        payment_method_types: ["card"],
      });
      res.send({
        clientSecret: paymentIntent.client_secret,
      });
    });

    app.post("/payment", async (req, res) => {
      const paymentInfo = req.body;
      const paymentResult = await paymentCollection.insertOne(paymentInfo);

      res.send(paymentResult);
    });

    //find admin api
    app.get("/admin/:email", async (req, res) => {
      const email = req.params.email;

      const query = { email: email };
      const user = await userCollection.findOne(query);

      let admin = false;
      if (user) {
        admin = user?.role === "admin";
      }
      res.send({ admin });
    });

    //contact request
    app.get("/contact-request", async (req, res) => {
      const result = await paymentCollection.find().toArray();
      res.send(result);
    });
    app.get("/contact-request/:email", async (req, res) => {
      const email = req.params.email;
      const filter = { email: email };
      const result = await paymentCollection.find(filter).toArray();
      res.send(result);
    });

    app.patch("/approve-request/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { bioDataId: id };
      const updateDoc = {
        $set: {
          status: "approved",
        },
      };
      const result = await paymentCollection.updateOne(filter, updateDoc);
      res.send(result);
    });

    app.delete("/delete-request/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await paymentCollection.deleteOne(query);
      res.send(result);
    });
    //contact request end

    //user api
    app.get("/user/:email", async (req, res) => {
      const email = req.params.email;
      const query = { email: email };
      const user = await userCollection.findOne(query);

      let premium = false;
      if (user) {
        premium = user?.status === "premium";
      }
      res.send({ premium });
    });

    app.post("/users", async (req, res) => {
      const user = req.body;
      const query = { email: user?.email };
      const exitingUser = await userCollection.findOne(query);
      if (exitingUser) {
        return res.send({ message: "user already exist", insertId: null });
      }
      const result = await userCollection.insertOne(user);
      res.send(result);
    });

    app.get("/users", async (req, res) => {
      const result = await userCollection.find().toArray();
      res.send(result);
    });

    app.patch("/users/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: {
          role: "admin",
        },
      };
      const result = await userCollection.updateOne(filter, updateDoc);
      res.send(result);
    });

    app.patch("/users/make-premium/:id", async (req, res) => {
      const id = req.params.id;
      console.log(id);
      const filter = { _id: new ObjectId(id) };
      console.log(filter);
      const updateDoc = {
        $set: {
          status: "premium",
        },
      };
      const result = await userCollection.updateOne(filter, updateDoc);
      res.send(result);
    });
    //user api end

    //all-bio-data
    const getLastBioDataId = async () => {
      try {
        const lastBioDataId = await allBioDataCollection
          .find()
          .sort({ Biodata_Id: -1 })
          .limit(1)
          .toArray();
        if (lastBioDataId.length > 0) {
          return lastBioDataId[0].Biodata_Id + 1;
        } else {
          return 1;
        }
      } catch (error) {
        throw error;
      }
    };
    app.post("/biodata", async (req, res) => {
      const bioDataInfo = req.body;

      try {
        const newBioDataId = await getLastBioDataId();
        bioDataInfo.Biodata_Id = newBioDataId;

        const result = await allBioDataCollection.insertOne(bioDataInfo);
        res.send(result);
      } catch (error) {
        res.status(500).send("Error creating bioData");
      }
    });

    app.get("/allBioData", async (req, res) => {
      const result = await allBioDataCollection.find().toArray();
      res.send(result);
    });

    app.get("/biodata/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await allBioDataCollection.findOne(query);
      res.send(result);
    });

    app.get("/biodata", async (req, res) => {
      const email = req.query.email;
      const query = { Email: email };
      const result = await allBioDataCollection.find(query).toArray();
      res.send(result);
    });
    //all-bio-data close

    //premium-bio-data
    app.get("/premium-bioData", async (req, res) => {
      const result = await premiumBioDataCollection.find().toArray();
      res.send(result);
    });

    app.get("/premium-bioData/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await premiumBioDataCollection.findOne(query);
      res.send(result);
    });
    //premium-bio-data close

    //request for premium
    app.get("/allPreRequest", async (req, res) => {
      const result = await requestPremiumCollection.find().toArray();
      res.send(result);
    });

    app.post("/biodata/make-premium", async (req, res) => {
      const premiumInfo = req.body;
      const result = await requestPremiumCollection.insertOne(premiumInfo);
      res.send(result);
    });
    //request for premium ens

    //review api
    app.post("/review", async(req, res) => {
      const reviewInfo = req.body;
      const result = await reviewsCollection.insertOne(reviewInfo);
      res.send(result);
     })

    app.get("/reviews", async (req, res) => {
      const result = await reviewsCollection.find().toArray();
      res.send(result);
    });
    //review api end

    //favorites api
    app.get("/favorite", async (req, res) => {
      const email = req.query.email;
      const query = { email: email };
      const result = await favoritesBioCollection.find(query).toArray();
      res.send(result);
    });

    app.post("/favorite", async (req, res) => {
      const favoriteItem = req.body;
      const result = await favoritesBioCollection.insertOne(favoriteItem);
      res.send(result);
    });

    app.delete("/favorite/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await favoritesBioCollection.deleteOne(query);
      res.send(result);
    });
    //favorites api end

    //admin api
    app.patch("/make-premium/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { Biodata_Id: parseInt(id) };
      const filter2 = { bioDataId: parseInt(id) };
      const updateDoc = { $set: { status: "premium" } };
      const result = await allBioDataCollection.updateOne(filter, updateDoc);
      const result2 = await requestPremiumCollection.updateOne(
        filter2,
        updateDoc
      );
      res.send({ result, result2 });
    });
    //admin api end

    //checkOut api
    app.post("/checkout", async (req, res) => {});
    //checkOut api end
    
    //analytics
    app.get("/admin-analytics", async (req, res) => {
      const totalBioData = await allBioDataCollection.estimatedDocumentCount();
      const completeMarriage = await reviewsCollection.estimatedDocumentCount();
      const premiumBioData = await premiumBioDataCollection.estimatedDocumentCount();

      const result = await paymentCollection
        .aggregate([
          {
            $group: {
              _id: null,
              totalRevenue: {
                $sum: "$price",
              },
            },
          },
        ])
        .toArray();
      const revenue = result.length > 0 ? result[0].totalRevenue : 0;

      const genderData = await allBioDataCollection.aggregate([
        {
          $group:{
            _id: "$Biodata_Type",
            count: {$sum: 1}
          }
        }
      ]).toArray();
      let totalMale = 0;
      let totalFemale = 0;

      genderData.forEach((item) => {
        if(item._id === 'Male'){
          totalMale = item.count
        }
        else if (item._id === 'Female') {
          totalFemale = item.count
        }
      })

      res.send({ totalBioData, premiumBioData, 
        totalMale,totalFemale,completeMarriage, revenue });
    });

    await client.db("admin").command({ ping: 1 });
    console.log("successfully connected to MongoDB!");
  } finally {
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Hello - Heart bond is running!");
});

app.listen(port, () => {
  console.log(`Heart bond listening on port ${port}`);
});
