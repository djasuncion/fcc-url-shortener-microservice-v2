"use strict";

var express = require("express");
var mongo = require("mongodb");
var mongoose = require("mongoose");
var shortid = require("shortid");
var dns = require("dns");

var cors = require("cors");

var app = express();

// Basic Configuration
var port = process.env.PORT || 3000;

/** this project needs a db !! **/

mongoose
  .connect(process.env.DB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    useCreateIndex: true
  })
  .catch(error => {
    console.log(error);
  });
mongoose.connection.on("open", () => console.log("MongoDB is Connected"));
mongoose.connection.on("error", e => console.log(e));

var Schema = mongoose.Schema;

var LinkSchema = new Schema({
  _id: {
    type: String,
    default: shortid.generate
  },
  Link: {
    type: String,
    required: true,
    unique: true
  }
});

var Link = mongoose.model("Link", LinkSchema);

app.use(cors());

/** this project needs to parse POST bodies **/
// you should mount the body-parser here
app.use(express.urlencoded({ extended: true }));

app.use("/public", express.static(process.cwd() + "/public"));

app.get("/", function(req, res) {
  res.sendFile(process.cwd() + "/views/index.html");
});

// your first API endpoint...
app.get("/api/hello", function(req, res) {
  res.json({ greeting: "hello API" });
});

app.post("/api/shorturl/new", (req, res) => {
  const https = /^https?:\/\//i;
  const host = req.body.url;
  const newHost = host.replace(https, "");

  console.log(`url: ${newHost}`);

  Link.findOne({ Link: host }, (err, link) => {
    if (err) return console.error(err);

    if (link) {
      res.json({
        original_url: host,
        short_url: link._id
      });
    } else {
      dns.lookup(newHost, { all: true, verbatim: true }, (err, address) => {
        if (!err) {
          const link = new Link({
            _id: shortid.generate(),
            Link: host
          });

          link.save(err => {
            if (err) return console.error(err);
          });

          res.json({
            original_url: host,
            short_url: link._id
          });
        } else {
          console.log(err);
          res.json({
            error: `Invalid URL for ${host}`
          });
        }
      });
    }
  });
});

app.get("/:id", (req, res) => {
  const id = req.params.id;
  Link.findById(id, (err, link) => {
    if (err) return console.error(err);

    if (!link) {
      res.json({
        error: `Your id: ${id} is not yet in our database...`
      });
    } else {
      res.redirect(link.Link);
    }
  });
});

app.listen(port, function() {
  console.log("Node.js listening ...");
});
