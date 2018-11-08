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
const PORT = process.env.PORT || 3002;
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
// Write the keyfile from the environment variable. This should protect the keyfile when deployed.
fs.writeFileSync('auth.json', process.env.VISION_KEYFILE_JSON);
const visionClient = new vision.ImageAnnotatorClient({
  projectId: '112671846952584603154',
  keyFilename: 'auth.json'
});
// Delete the keyfile we made
fs.unlinkSync('auth.json');

const app = express();
app.use(cors());




app.use(express.static('public'));

app.set('view engine', 'ejs');

app.use(express.urlencoded({extended:true}));

// app.use(express.json());

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
    })
    .catch(err => res.send(err));
}

function getUserAuth(req, res) {
  const scope = 'playlist-modify-public playlist-modify-private user-read-private';
  let query = querystring.stringify({client_id: client_id, response_type: 'code', redirect_uri: redirect_uri, scope: scope});
  res.redirect('https://accounts.spotify.com/authorize?' + query);
}

function getUserToken (req, res) {
  let code = req.query.code;
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
  let query = req.body.trackQuery;
  let valence = req.body.valence;
  let access_token = req.body.access_token;
  let refresh_token = req.body.refresh_token;
  return superagent
    .get(`https://api.spotify.com/v1/search?q=${query}&type=track`)
    .set('Authorization', 'Bearer ' + spotify_token)
    .then(results => {
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
  console.log('We hit top of MakePlayList Function');
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
      console.log('Inside first .then Chain');
      spotifyRecs(req, res, max_valence, min_valence, trackID)
        .then(recs => {
          if (recs.length > 4) {
            return {recs: recs, moody: true};
          } else {
            max_valence += .1;
            min_valence -= .1;
            recs = spotifyRecs(req, res, max_valence, min_valence, trackID);
            if (recs.length > 4) {
              return {recs: recs, moody: true};
            } else {
              max_valence += .15;
              min_valence -= .15;
              recs = spotifyRecs(req, res, max_valence, min_valence, trackID);
              if (recs.length > 4) {
                return {recs: recs, moody: true};
              } else {
                recs = spotifyRecs(req, res, 1, 0);
                return {recs: recs, moody: false};
              }
            }
          }
        })
        .then(trackList => {
          console.log('Inside second .then chain', trackList);
          return superagent
            .get('https://api.spotify.com/v1/me')
            .set('Authorization', 'Bearer ' + access_token)
            .then(userObj => {
              let userhref = JSON.parse(userObj.text).href;
              let userListInfo = {userhref: userhref, trackList: trackList }
              return userListInfo;
            })
            .catch(err=> {
              console.log('USER ID FOR PLAYLIST FUCKED');
              res.send(err)});
        })
        .then(userListInfo => {
          console.log('Inside third .then Chain', userListInfo.userhref);
          // let numberMath.random().toString(36).substring(7)
          return superagent
            .post(userListInfo.userhref + '/playlists')
            .set('Authorization', 'Bearer ' + access_token)
            .set('Content-Type', 'application/json')
            .send({name: "moodPlaylist"})
            .then(playList => {
              console.log('third spotify return: ', playList.body.id);
              let obj = {playListId: playList.body.id, trackList: userListInfo.trackList};
              console.log('-------------------------------------------------------------------------------------------------------------------------',obj);
              return obj;
            })
            .catch((err) => {
              console.error('inside third err', err);
            })
        })
        .then(playListObj => {
          console.log('Inside fourth .then Chain', playListObj);
          let formattedTracks = playListObj.trackList.recs.map(trackId => {
            return `spotify:track:${trackId}`;
          });
          console.log('EYYYYYYYYYYYYYYYY',formattedTracks, playListObj.playListId);

          return superagent
            .post(`https://api.spotify.com/v1/playlists/${playListObj.playListId}/tracks`)
            .set('Authorization', 'Bearer ' + access_token)
            .set('Content-Type', 'application/json')
            .send({uris: formattedTracks})
            .then(() => {
              console.log('in fourth .then results', playListObj.playListId);
              return playListObj.playListId;
            })
            .catch(err=> res.send(err));

        })
        .then(playListId => {
          console.log('Inside last .then Chain');
          // console.log('in render .then for ', playListId)
          res.render(`pages/playlist`, {playListId: playListId})
        })
    })
    .catch(err=> res.send(err));
}


function spotifyRecs (req, res, max_valence, min_valence, trackID) {
  if (max_valence > 1) {
    max_valence = 1;
  }
  if (min_valence <= 0) {
    min_valence = 0.01;
  }
  return superagent
    .get(`https://api.spotify.com/v1/recommendations?seed_tracks=${trackID}&max_valence=${max_valence}&min_valence=${min_valence}`)
    .set('Authorization', 'Bearer ' + spotify_token)
    .then(results => {
      return results.body.tracks.map(track => track.id);
    })
    .catch(err => res.send(err));
}

function AnnotatedImage(imageData) {
  if (imageData.faceAnnotations[0]) {
    this.fileName = `images/uploaded/${imageData.fileName}`;
    const descriptorToScore = ['VERY_UNLIKELY', 'UNLIKELY', 'POSSIBLE', 'LIKELY', 'VERY_LIKELY'];
    this.joyScore = descriptorToScore.indexOf(this.joyDescriptor);
    this.sorrowScore = descriptorToScore.indexOf(this.sorrowDescriptor);
    this.angerScore = descriptorToScore.indexOf(this.angerDescriptor);
    this.surpriseScore = descriptorToScore.indexOf(this.surpriseDescriptor);
    this.energy = .5; // TODO: some math
    this.valence = ((this.joyScore - this.sorrowScore) / 8) + .5;
  }
  else {
    this.fileName = 'images/no_face_found.jpg';
  }
}

function getGoogleVision(req, res) {

  const img_url = req.file.path;

  visionClient.faceDetection(img_url)
    .then(results => {
      results[0].fileName = req.file.filename;
      const ai = new AnnotatedImage(results[0]);
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

function deleteUploadedImages() {
  fs.readdir('public/images/uploaded/', (err, files) => {
    files.forEach(file => {
      console.log(`public/images/uploaded/${file}`);
      fs.unlinkSync(`public/images/uploaded/${file}`);
    });
  });
}

app.listen(PORT, () => console.log(`Listening on port ${PORT}`));
