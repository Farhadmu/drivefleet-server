require("dotenv").config();
const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const jwt = require("jsonwebtoken");

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "http://localhost:3000",
      "https://drivefleet-client-kappa.vercel.app",
    ],
    credentials: true,
  })
);
app.use(express.json());
app.use(cookieParser());

// MongoDB Connection
const uri = process.env.MONGODB_URI;
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

// JWT Middleware
const verifyToken = (req, res, next) => {
  const token = req.cookies?.token;
  if (!token) {
    return res.status(401).json({ message: "Unauthorized access" });
  }
  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(401).json({ message: "Unauthorized access" });
    }
    req.user = decoded;
    next();
  });
};

async function run() {
  try {
    await client.connect();
    console.log("Connected to MongoDB!");

    const db = client.db("drivefleet");
    const carsCollection = db.collection("cars");
    const bookingsCollection = db.collection("bookings");

    // ─── AUTH ROUTES ─────────────────────────────────────────────

   // JWT generate - localhost  fix
app.post("/jwt", (req, res) => {
  const user = req.body;
  const token = jwt.sign(user, process.env.JWT_SECRET, { expiresIn: "7d" });

  res.cookie("token", token, {
  httpOnly: true,
  secure: true,
  sameSite: "none",
})
    .json({ success: true });
});

// Logout
app.post("/logout", (req, res) => {
  
 res.clearCookie("token", {
  httpOnly: true,
  secure: true,
  sameSite: "none",
})
    .json({ success: true });
});


    // ─── CARS ROUTES ─────────────────────────────────────────────

    // GET all cars (with search and filter)
    app.get("/cars", async (req, res) => {
      try {
        const { search, type, sort } = req.query;
        let query = {};

        if (search) {
          query.carName = { $regex: search, $options: "i" };
        }
        if (type && type !== "all") {
          query.carType = { $in: [type] };
        }

        let sortOption = {};
        if (sort === "price_asc") sortOption = { dailyRentPrice: 1 };
        else if (sort === "price_desc") sortOption = { dailyRentPrice: -1 };
        else if (sort === "newest") sortOption = { dateAdded: -1 };

        const cars = await carsCollection.find(query).sort(sortOption).toArray();
        res.json(cars);
      } catch (error) {
        res.status(500).json({ message: error.message });
      }
    });

    // GET single car by ID
    app.get("/cars/:id", async (req, res) => {
      try {
        const id = req.params.id;
        const car = await carsCollection.findOne({ _id: new ObjectId(id) });
        if (!car) return res.status(404).json({ message: "Car not found" });
        res.json(car);
      } catch (error) {
        res.status(500).json({ message: error.message });
      }
    });

    // GET cars by owner email (private)
    app.get("/my-cars", verifyToken, async (req, res) => {
      try {
        const email = req.query.email;
        if (req.user.email !== email) {
          return res.status(403).json({ message: "Forbidden access" });
        }
        const cars = await carsCollection
          .find({ ownerEmail: email })
          .sort({ dateAdded: -1 })
          .toArray();
        res.json(cars);
      } catch (error) {
        res.status(500).json({ message: error.message });
      }
    });

    // POST add a car (private)
    app.post("/cars", verifyToken, async (req, res) => {
      try {
        const car = {
          ...req.body,
          bookingCount: 0,
          dateAdded: new Date(),
        };
        const result = await carsCollection.insertOne(car);
        res.json(result);
      } catch (error) {
        res.status(500).json({ message: error.message });
      }
    });

    // PUT update a car (private)
    app.put("/cars/:id", verifyToken, async (req, res) => {
      try {
        const id = req.params.id;
        const updatedCar = req.body;
        delete updatedCar._id;
        const result = await carsCollection.updateOne(
          { _id: new ObjectId(id) },
          { $set: updatedCar }
        );
        res.json(result);
      } catch (error) {
        res.status(500).json({ message: error.message });
      }
    });

    // DELETE a car (private)
    app.delete("/cars/:id", verifyToken, async (req, res) => {
      try {
        const id = req.params.id;
        const result = await carsCollection.deleteOne({ _id: new ObjectId(id) });
        res.json(result);
      } catch (error) {
        res.status(500).json({ message: error.message });
      }
    });

    // ─── BOOKINGS ROUTES ─────────────────────────────────────────

    // GET user bookings (private)
    app.get("/bookings", verifyToken, async (req, res) => {
      try {
        const email = req.query.email;
        if (req.user.email !== email) {
          return res.status(403).json({ message: "Forbidden access" });
        }
        const bookings = await bookingsCollection
          .find({ userEmail: email })
          .sort({ bookingDate: -1 })
          .toArray();
        res.json(bookings);
      } catch (error) {
        res.status(500).json({ message: error.message });
      }
    });

    // POST book a car (private)
    app.post("/bookings", verifyToken, async (req, res) => {
      try {
        const booking = {
          ...req.body,
          bookingDate: new Date(),
          status: "Confirmed",
        };
        const result = await bookingsCollection.insertOne(booking);

        await carsCollection.updateOne(
          { _id: new ObjectId(booking.carId) },
          { $inc: { bookingCount: 1 } }
        );

        res.json(result);
      } catch (error) {
        res.status(500).json({ message: error.message });
      }
    });

    // DELETE a booking (private)
    app.delete("/bookings/:id", verifyToken, async (req, res) => {
      try {
        const id = req.params.id;
        const booking = await bookingsCollection.findOne({ _id: new ObjectId(id) });
        const result = await bookingsCollection.deleteOne({ _id: new ObjectId(id) });

        if (booking) {
          await carsCollection.updateOne(
            { _id: new ObjectId(booking.carId) },
            { $inc: { bookingCount: -1 } }
          );
        }
        res.json(result);
      } catch (error) {
        res.status(500).json({ message: error.message });
      }
    });

    // Health check
    app.get("/", (req, res) => {
      res.json({ message: "DriveFleet Server is running!" });
    });

    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error("MongoDB connection error:", error);
  }
}

run();
