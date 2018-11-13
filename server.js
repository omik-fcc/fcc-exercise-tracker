// needs
const express = require('express');
const app = express();

const shortId = require('shortid');
const bodyParser = require('body-parser');
const cors = require('cors');


// mongoose + mongojs
const mongo = require('mongodb');
const mongojs = require('mongojs')
const db = mongojs(process.env.MONGO_URI)


// app.use
app.use(cors());
app.use(bodyParser.urlencoded({extended: false}));
app.use(bodyParser.json());
app.use(express.static('public'));

// routes
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});


/*
  User Stories 1:
  I can create a user by posting form data username to /api/exercise/new-user 
  and returned will be an object with username and _id.
*/
app.post('/api/exercise/new-user', function (req, res) {

  var userToSave = {};
  userToSave.user = req.body['username'];
  userToSave.userID = shortId.generate();

  db.collection('userSack').save(userToSave, function (err, saved) {
    if (err || !saved) {
      console.log("Record not saved");
      res.json({error: 'Outch! Something quite embarrassing happened... (DB Error)'});
    } else {
      console.log("Record saved");
      res.json(userToSave);
    };

  });

});


/*
  User Stories 2:
  I can get an array of all users by getting api/exercise/users 
  with the same info as when creating a user.
*/
app.get('/api/exercise/users', function (req, res) {

  db.collection('userSack').find(function (err, docs) {
    if (err || !docs) {
      res.json({error: 'Outch! Something quite embarrassing happened... (DB Error)'});
    } else {
      res.json(docs);
    };
  });
});


/*
  User Stories 3:
  I can add an exercise to any user by posting form data userId(_id), description, 
  duration, and optionally date to /api/exercise/add. If no date supplied it will use 
  current date. Returned will the the user object with also 
*/
app.post('/api/exercise/add', function (req, res) {

  // fillin' the exercise obj  
  var trackToSave = {};

  trackToSave.userID = req.body['userId'];
  trackToSave.description = req.body['description'];
  trackToSave.duration = req.body['duration'];

  // date not mandatory if not supplied > current date
  if (!req.body['date']) {
    trackToSave.date = new Date();
    //trackToSave.date = date.getFullYear()+'-' + (date.getMonth()+1) + '-'+date.getDate()
    console.log(trackToSave.date);
  } else {

    // if date supplied validate format
    // TODO: move this to a mighty function
    var d = new Date(req.body['date']);

    if (Number.isNaN(d.getTime())) {
      return res.json({error: 'Invalid date format. Use YYYY-MM-DD'});
    } else {
      trackToSave.date = new Date(req.body['date']);
      // console.log(date);
    };

  };

  // check if userID is in database
  var query = {userID: req.body['userId']};

  db.collection('userSack').findOne(query, function (err, result) {
    if (result == null) {

      console.log('error, not found');
      res.json({error: 'userID nnot found'});

    } else {

      // userID in DB lets save data to the exercises collection
      console.log('userid found');

      db.collection('trackSack').save(trackToSave, function (err, saved) {
        if (err || !saved) {

          console.log("Record not saved");
          res.json({error: 'Outch! Something quite embarrassing happened... (DB Error)'});

        } else {

          console.log("Record saved");
          res.json(trackToSave);

        };
      });
    };
  });


});


/*
  User Stories 4:
  I can retrieve a full exercise log of any user by getting /api/exercise/log with a parameter 
  of userId(_id). Return will be the user object with added array log and count (total exercise count).
*/
app.get('/api/exercise/log', function (req, res) {

  var query = {
    userID: req.query.userId
  };
  console.log(query);


  db.collection('trackSack').find(query, function (err, result) {
    if (err || Object.keys(result).length === 0) {

      console.log('error, not found');

      res.json({error: 'userID not found'});

    } else {
            
      // userID in DB lets save data to the exercises collection
      console.log('userid found');

      var fromDate = new Date(req.query.from);
      var toDate = new Date(req.query.to);
      var limit = req.query.limit || 100;

      if (req.query.from != undefined && req.query.to != undefined) {

        result = result.filter((x) => (x.date >= fromDate && x.date <= toDate));

      };

      result = result.slice(0, limit);

      res.json(result);


    };
  });

});


// Not found middleware
app.use((req, res, next) => {
  return next({
    status: 404,
    message: 'not found'
  })
})


// Error Handling middleware
app.use((err, req, res, next) => {
  let errCode, errMessage

  if (err.errors) {
    // mongoose validation error
    errCode = 400 // bad request
    const keys = Object.keys(err.errors)
    // report the first validation error
    errMessage = err.errors[keys[0]].message
  } else {
    // generic or custom error
    errCode = err.status || 500
    errMessage = err.message || 'Internal Server Error'
  }
  res.status(errCode).type('txt')
    .send(errMessage)
})

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})