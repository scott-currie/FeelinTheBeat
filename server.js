'use strict';
// build dependencies, 
const express = require('express');
const cors = require('cors');
const superagent = require('superagent');
const pg = require('pg');
const querystring = require('querystring');
require('dotenv').config();
const PORT = process.env.PORT || 3001;
const client_id = process.env.CLIENT_ID;
const client_secret = process.env.CLIENT_SECRET;

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



app.use(express.static('Public'));
app.set('view engine', 'ejs');

app.use(express.urlencoded({extended:true}));


app.get('/', getData);
app.get('/vision', getGoogleVision);




// Middleware pathing shite
app.get('/', (req, res) => res.render('pages/index'));

app.get('/auth', getToken);

app.post('/search', renderSearch);

app.post('/spotifySearch', spotifySearch);

app.post('/makePlaylist/:id', makePlaylist);


function getToken(req, res) {
  return superagent
    .post('https://accounts.spotify.com/api/token')
    .send('grant_type=client_credentials')
    .set('Authorization', 'Basic ' + (Buffer.from(client_id + ':' + client_secret).toString('base64')))
    .then(results => {
      console.log('got a nu token');
      process.env.SPOTIFY_CLIENT_TOKEN = results.body.access_token;
      spotify_token = results.body.access_token;
    })
    .catch(err => res.send(err));
}

function renderSearch(req, res) {
  let danceability = req.body.danceability;
  let valence = req.body.valence;
  res.render('pages/search', {danceability: danceability, valence: valence});
}

function spotifySearch(req, res) {
  console.log('in spotify search');
  return getToken(req, res)
    .then(() => {
    //TODO: make dynamic with form results
    let query = req.body.trackQuery;
    let valence = req.body.valence;
    let danceability = req.body.danceability;
    return superagent
      .get(`https://api.spotify.com/v1/search?q=${query}&type=track`)
      .set('Authorization', 'Bearer ' + spotify_token)
      .then(results => {
        //TODO: put render functionality here; need to get image IDs, track ID, track name. Will send to our awesome results form. 
        let trackResults = results.body.tracks.items.map(track => {
          return {id: track.id, name: track.name, artists: track.artists.map(artist => artist.name), album_img_url: track.album.images[2].url};
        });
        res.render('pages/chooseSeeds', {trackResults: trackResults, danceability: danceability, valence: valence});
      })
      .catch(err => res.send(err));
    })
    .catch(err => console.log('rick is gr8 but the token ain\'t'));
}

function makePlaylist(req, res) {
  // TODO: take in ID, mood parameters. Send request to spotify API for related tracks with the 'mood' features we want.
  // TODO:    1. Need to build mood-> track feature first
  // TODO:    2. Figure out how we can specify feature ranges to the Spotify API
  // TODO:    3. Return array of related tracks from API
  let trackID = req.params.id;
  let valence = req.body.valence / 100;
  let paramRange = .1;
  let max_valence = valence + paramRange;
  let min_valence = valence - paramRange;
  let danceability = req.body.danceability / 100;
  return getToken(req, res)
    .then(() => {
      let recs = spotifyRecs(req, res, max_valence, min_valence);
      if (recs > 4) {
        res.send({results: recs});
        //res.render('pages/playlist', {results: recs});
      } else {
        max_valence += .1;
        min_valence -= .1;
        recs = spotifyRecs(req, res, max_valence, min_valence);
        if (recs > 4) {
          res.render('pages/playlist', {results: recs});
        } else {
          max_valence += .15;
          min_valence -= .15;
          recs = spotifyRecs(req, res, max_valence, min_valence);
          if (recs > 4) {
            res.render('pages/playlist', {results: recs});
          } else {
            recs = spotifyRecs(req, res, 1, 0);
            res.render('pages/playlist', {results: recs, response: 'We couldn\'t find results that fit those emotions. Here\'s a consolation playlist based off the track you selected.'})
          }
        }
      }
    })
    .catch(err => console.log('rick is gr8'));
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
  this.img_url = imageData.img_url;
  this.img_name = imageData.img_url.slice(imageData.img_url.lastIndexOf('/') + 1);
  this.labels = imageData.labelAnnotations.map(la => la['description']);
}

function getGoogleVision(req, res) {
  // const img_url = 'public/images/scott_and_milo.jpg';
  const img_url = 'public/images/milo_ugh_face.jpg';
  // const img_url = 'https://i.imgur.com/KU3wt6U.jpg';
  const type = 'face';
  if (type === 'face') {
    visionClient.labelDetection(img_url)
      .then(results => {
        console.log(results);
        results[0]['img_url'] = img_url;
        res.send(new AnnotatedImage(results[0]));
      })
      .catch(err => {
        console.log(err);
      });
  } else {
    visionClient.faceDetection(img_url)
      .then(results => {
        console.log(results[0]);
        // console.log(results[0].faceAnnotations);
        console.log(results[0].faceAnnotations[0].landmarks);
        results[0]['img_url'] = img_url;
        res.send(new AnnotatedImage(results[0]));
      })
      .catch(err => {
        console.log(err);
      });
  }
}

app.listen(PORT, () => console.log(`Listening on port ${PORT}`));

