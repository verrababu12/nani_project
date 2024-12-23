const express = require("express");
const mongoose = require("mongoose");
const bodyParser = require("body-parser");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const passport = require("passport");
const { Strategy: JwtStrategy, ExtractJwt } = require("passport-jwt");

const app = express();

// Middleware
app.use(cors());
app.use(bodyParser.json());

// MongoDB connection
mongoose.connect("mongodb://localhost:27017/videoApp", {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});
const VideoSchema = new mongoose.Schema({
  title: String,
  description: String,
  tags: [String],
  fileSize: Number,
  duration: String,
  owner: mongoose.Schema.Types.ObjectId,
});
const Video = mongoose.model("Video", VideoSchema);

const UserSchema = new mongoose.Schema({
  username: String,
  password: String,
});
const User = mongoose.model("User", UserSchema);

// JWT Config
const jwtOptions = {
  jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
  secretOrKey: "secretKey",
};
passport.use(
  new JwtStrategy(jwtOptions, (payload, done) => {
    User.findById(payload.id, (err, user) => {
      if (err) return done(err, false);
      if (user) return done(null, user);
      return done(null, false);
    });
  })
);

app.use(passport.initialize());

// Routes
app.post("/login", async (req, res) => {
  const { username, password } = req.body;
  const user = await User.findOne({ username, password });
  if (user) {
    const token = jwt.sign({ id: user._id }, jwtOptions.secretOrKey);
    res.json({ token });
  } else {
    res.status(401).json({ message: "Invalid credentials" });
  }
});

app.get(
  "/videos",
  passport.authenticate("jwt", { session: false }),
  async (req, res) => {
    const videos = await Video.find({ owner: req.user._id });
    res.json(videos);
  }
);

app.post(
  "/videos",
  passport.authenticate("jwt", { session: false }),
  async (req, res) => {
    const { title, description, tags, fileSize, duration } = req.body;
    const video = new Video({
      title,
      description,
      tags,
      fileSize,
      duration,
      owner: req.user._id,
    });
    await video.save();
    res.status(201).json(video);
  }
);

app.listen(5000, () => console.log("Server started on port 5000"));
