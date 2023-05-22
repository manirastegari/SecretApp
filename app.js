//jshint esversion:6
require('dotenv').config()
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");
const session = require('express-session');
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const findOrCreate = require('mongoose-findorcreate')

// const encrypt = require("mongoose-encryption");
// const md5 = require("md5");
// console.log(md5("message"));
// const bcrypt = require("bcrypt");
// const saltRounds = 10;


const app = express();

// console.log(process.env.API_KEY);

app.use(express.static("public"));
app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({
    extended: true
}));

app.use(session({
    secret: "Our little secret.",
    resave: false,
    saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());


mongoose.connect("mongodb+srv://mani16032:mani16032@cluster0.idomekg.mongodb.net/?retryWrites=true&w=majority", {useNewUrlParser: true});
// mongoose.set("useCreateIndex", true);

const userSchema = new mongoose.Schema({
    email: String,
    password: String,
    googleId: String,
    secret: String
});

// const secret = "Thisisourlittlesecret.";   move this to .env for security
// userSchema.plugin(encrypt, { secret: process.env.SECRET, encryptedFields: ["password"] });

userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);


const User = new mongoose.model("User", userSchema);

passport.use(User.createStrategy());

// passport.serializeUser(User.serializeUser());
// passport.deserializeUser(User.deserializeUser());

passport.serializeUser(function(user, done){
    done(null, user.id);
});

passport.deserializeUser(function(id, done){
    User.findById(id)
    .then(user => {
        done(null, user);
    })
    .catch(err => {
        done(err);
    });

    // User.findById(id, function(err, user){
    //     done(err, user);
    // });
});

passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/google/secrets",
    userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo"
  },
  function(accessToken, refreshToken, profile, cb) {
    console.log(profile);
    User.findOrCreate({ googleId: profile.id }, function (err, user) {
      return cb(err, user);
    });
  }
));

app.get("/", function(req, res){
    res.render("home");
});

app.get("/auth/google",
  passport.authenticate('google', { scope: ['profile'] })
  );
  app.get("/auth/google/secrets", 
  passport.authenticate('google', { failureRedirect: '/login' }),
  function(req, res) {
    // Successful authentication, redirect to Secrets.
    res.redirect('/secrets');
  });

// app/get("/login", function(req, res){
//     passport.authenticate("google", {scope: ["profile"] })
// });

app.get("/login", function(req, res){
    res.render("login");
});

app.get("/register", function(req, res){
    res.render("register");
});

app.get("/secrets", function(req, res){

    User.find({"secret": {$ne: null}})
    .then(foundUsers => {
        if (foundUsers) {
            res.render("secrets", {usersWithSecrets: foundUsers});
        }
    })
    .catch(err => {
        console.log(err);
    });

    // User.find({"secret": {$ne: null}}, function(err, foundUsers){
    //     if(err){
    //         console.log(err);
    //     } else {
    //         if(foundUsers){
    //             res.render("secrets", {usersWithSecrets: foundUsers});
    //         }
    //     }
    // });
    // if (req.isAuthenticated()){
    //     res.render("secrets");
    // } else {
    //     res.redirect("/login");
    // }
});

app.get("/submit", function(req, res){
    if (req.isAuthenticated()){
        res.render("submit");
    } else {
        res.redirect("/login");
    }
});

app.post("/submit", function(req, res){
    const submittedSecret = req.body.secret;

    console.log(req.user.id);


    User.findById(req.user.id)
    .then(foundUser => {
        if (foundUser) {
            foundUser.secret = submittedSecret;
            return foundUser.save();
        }
    })
    .then(() => {
        res.redirect("/secrets");
    })
    .catch(err => {
        console.log(err);
    });

    // User.findById(req.user.id, function(err, foundUser){
    //     if(err){
    //         console.log(err);
    //     } else {
    //         if(foundUser){
    //             foundUser.secret = submittedSecret;
    //             foundUser.save(function(){
    //                 res.redirect("/secrets");
    //             });
    //         }
    //     }
    // });
});

app.get("/logout", function(req, res){
    req.logout(function(err){
        console.log(err);
    });
    res.redirect("/");
});


app.post("/register", function(req, res){

    User.register({username: req.body.username}, req.body.password, function(err, user){
        if(err) {
            console.log(err);
            res.redirect("/register");
        } else {
            passport.authenticate("local")(req, res, function(){
                res.redirect("/secrets");
            });
        }
    });

    
});


app.post("/login", function(req, res){

    const user = new User({
        username: req.body.username,
        password: req.body.password
    });

    req.login(user, function(err){
        if(err){
            console.log(err);
        } else {
            passport.authenticate("local")(req, res, function(){
                res.redirect("/secrets");
            });
        }
    });

});

app.listen(3000, function(){
    console.log("Server started on port 3000");
});