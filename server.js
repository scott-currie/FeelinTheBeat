'use strict';
// build dependencies,
const express = require('express');
const cors = require('cors');
const superagent = require('superagent');
const querystring = require('query-string');
const pg = require('pg');
require('dotenv').config();
const multer = require('multer');
const imgUpload = multer({dest: 'public/images/uploaded/'});
const fs = require('fs');
const PORT = process.env.PORT || 3001;
const client_id = process.env.CLIENT_ID;
const client_secret = process.env.CLIENT_SECRET;
const redirect_uri = `http://localhost:${PORT}/authRedirect`;
console.log(redirect_uri)


let spotify_token;

// const client = new pg.Client(process.env.DATABASE_URL);
// client.connect();
// client.on('err', err => console.log(err));


// Bring in Goolge Vision module
const vision = require('@google-cloud/vision');
const visionClient = new vision.ImageAnnotatorClient({
  projectId: '112671846952584603154',
  keyFilename: './.auth/Code301Final-3b92b5c2ad48.json',
});

const app = express();
app.use(cors());



app.use(express.static('public'));

app.set('view engine', 'ejs');

app.use(express.urlencoded({extended:true}));

app.use(express.json());

// Middleware pathing shite
app.get('/', (req, res) => {
  getToken(req, res)
    .then(() => res.render('pages/index'))
    .catch(err => res.send(err));
});

app.get('/auth', getUserAuth);

app.get('/authRedirect', getUserToken)

app.post('/search', renderSearch);

app.post('/spotifySearch', spotifySearch);

app.post('/makePlaylist/:id', makePlaylist);

app.post('/upload', imgUpload.single('fileUploaded'), uploadImage);

app.get('/vision/:filename', getGoogleVision);

function getToken(req, res) {
  return superagent
    .post('https://accounts.spotify.com/api/token')
    .send('grant_type=client_credentials')
    .set('Authorization', 'Basic ' + (Buffer.from(client_id + ':' + client_secret).toString('base64')))
    .then(results => {
      process.env.SPOTIFY_CLIENT_TOKEN = results.body.access_token;
      spotify_token = results.body.access_token;
      console.log('spotify token: ', spotify_token);
    })
    .catch(err => res.send(err));
}

function getUserAuth(req, res) {
  let query = querystring.stringify({client_id: client_id, response_type: 'code', redirect_uri: redirect_uri});
  res.redirect('https://accounts.spotify.com/authorize?' + query);
}

function getUserToken (req, res) {
  let code = req.query.code;
  console.log('entered getUserToken function');
  return superagent
    .post('https://accounts.spotify.com/api/token')
    .set('Authorization', 'Basic ' + (Buffer.from(client_id + ':' + client_secret).toString('base64')))
    .type('form')
    .send(`code=${code}`)
    .send(`redirect_uri=${redirect_uri}`)
    .send('grant_type=authorization_code')
    .then(response => {
      let access_token = response.body.access_token;
      let refresh_token = response.body.refresh_token;
      res.render('pages/upload', {access_token: access_token, refresh_token: refresh_token});
    })
    .catch(err => {
      console.log('getuserToken err');
      res.send(err);
    });
}


function renderSearch(req, res) {
  let valence = req.body.valence;
  let access_token = req.body.access_token;
  let refresh_token = req.body.refresh_token;
  res.render('pages/search', {
    valence: valence,
    access_token: access_token,
    refresh_token: refresh_token
  });
}

function spotifySearch(req, res) {
  console.log('in spotify search');
  let query = req.body.trackQuery;
  let valence = req.body.valence;
  let access_token = req.body.access_token;
  let refresh_token = req.body.refresh_token;
  console.log('Spotify search - refresh token: ', refresh_token);
  return superagent
    .get(`https://api.spotify.com/v1/search?q=${query}&type=track`)
    .set('Authorization', 'Bearer ' + spotify_token)
    .then(results => {
      console.log('got results');
      return results.body.tracks.items.map(track => {
        return {id: track.id, name: track.name, artists: track.artists.map(artist => artist.name), album_img_url: track.album.images[2].url};
      });
    })
    .then(trackResults => {
      return superagent
        .post('https://accounts.spotify.com/api/token')
        .set('Authorization', 'Basic ' + (Buffer.from(client_id + ':' + client_secret).toString('base64')))
        .send('grant_type=refresh_token')
        .send(`refresh_token=${refresh_token}`)
        .then(results => {
          console.log('inside refresh logic');
          if (results.status == '200') {
            res.render('pages/chooseSeeds', {
              trackResults: trackResults,
              valence: valence,
              access_token: results.body.access_token,
              refresh_token: refresh_token
            });
          } else {
            throw 'a hissyfit';
          }
        })
        .catch(err=> res.send(err));

    })
    .catch(err => res.send(err));
}

function makePlaylist(req, res) {
  // TODO: take in ID, mood parameters. Send request to spotify API for related tracks with the 'mood' features we want.
  // TODO:    1. Need to build mood-> track feature first
  // TODO:    2. Figure out how we can specify feature ranges to the Spotify API
  // TODO:    3. Return array of related tracks from API
  let refresh_token = req.body.refresh_token,
    access_token = req.body.access_token,
    trackID = req.params.id,
    valence = req.body.valence / 100,
    paramRange = .2,
    max_valence = valence + paramRange,
    min_valence = valence - paramRange;
  getToken(req, res)
    .then(() => {
      spotifyRecs(req, res, max_valence, min_valence)
        .then(recs => {
          if (recs.length > 4) {
            console.log(recs);
            res.render('pages/playlist', {results: recs});
          } else {
            max_valence += .1;
            min_valence -= .1;
            recs = spotifyRecs(req, res, max_valence, min_valence);
            if (recs.length > 4) {
              res.render('pages/playlist', {results: recs});
            } else {
              max_valence += .15;
              min_valence -= .15;
              recs = spotifyRecs(req, res, max_valence, min_valence);
              if (recs.length > 4) {
                res.render('pages/playlist', {results: recs, access_token: access_token, refresh_token});
              } else {
                recs = spotifyRecs(req, res, 1, 0);
                res.render('pages/playlist', {results: recs, response: 'We couldn\'t find results that fit those emotions. Here\'s a consolation playlist based off the track you selected.'})
              }
            }
          }
        })
    })
    .catch(err=> res.send(err));
}


function spotifyRecs (req, res, max_valence, min_valence) {
  if (max_valence > 1) {
    max_valence = 1;
  }
  if (min_valence <= 0) {
    min_valence = 0.01;
  }
  return superagent
    .get(`https://api.spotify.com/v1/recommendations?seed_tracks=${trackID}&max_valence=${max_valence}&min_valence=${min_valence}`)
    .set('Authorization', 'Bearer ' + spotify_token)
    .then(results => results.body.tracks.items)
    .catch(err => res.send(err));
}

function AnnotatedImage(imageData) {
  this.fileName = `images/uploaded/${imageData.fileName}`;
  this.joyDescriptor = imageData.faceAnnotations[0].joyLikelihood;
  this.sorrowDescriptor = imageData.faceAnnotations[0].sorrowLikelihood;
  this.angerDescriptor = imageData.faceAnnotations[0].angerLikelihood;
  this.surpriseDescriptor = imageData.faceAnnotations[0].surpriseLikelihood;
  const descriptorToScore = ['VERY_UNLIKELY', 'UNLIKELY', 'POSSIBLE', 'LIKELY', 'VERY_LIKELY'];
  this.joyScore = descriptorToScore.indexOf(this.joyDescriptor);
  this.sorrowScore = descriptorToScore.indexOf(this.sorrowDescriptor);
  this.angerScore = descriptorToScore.indexOf(this.angerDescriptor);
  this.surpriseScore = descriptorToScore.indexOf(this.surpriseDescriptor);
  this.energy = .5; // TODO: some math
  this.valence = ((this.joyScore - this.sorrowScore) / 8) + .5;
}

function getGoogleVision(req, res) {
  console.log('Getting Google Vision');
  const img_url = req.file.path;
  console.log(img_url);
  console.log('getGoogleVision access_token:', req.body.access_token);
  console.log('getGoogleVision refresh_token:', req.body.refresh_token);
  visionClient.faceDetection(img_url)
    .then(results => {
      console.log('Sending new image');
      results[0].fileName = req.file.filename;
      const ai = new AnnotatedImage(results[0]);
      console.log('getGoogleVision req.body', req.body);
      res.render('pages/showimage', {image: ai, access_token: req.body.access_token, refresh_token: req.body.refresh_token});

    })
    .catch(err => {
      console.log(err);
    });
}

function uploadImage(req, res) {
  // Call the Vision API as part of this request
  getGoogleVision(req, res);
}

app.listen(PORT, () => console.log(`Listening on port ${PORT}`));
