# Feelin the Beat

**Authors**: Scott Currie, Rick Flinn, Shalom Belaineh, Patrick McNamee

**Version**: 1.0.0


## Overview
Feeln the Beat is a mobile application that allows users to submit photos of their (or others') faces and select a starting song from Spotify, then receive a playlist of recommended songs based on the starting song and the emotional score attached to the uploaded image.


## Getting Started
The app is designed to run on NodeJS and a PostgreSQL database. Install all the required modules, run the sql script ftb.sql, and set up the environment variables. Note that a valid Google Cloud serive account will be required, as well as a Spotify account.  


## Architecture
The app was tested on NodeJS version 8.10.0 and requires NodeJS modules: express, cors, superagent, querystring, pg, dotenv, multer, fs, @google-cloud/vision.


## Change Log
<!-- Use this area to document the iterative changes made to your application as each feature is successfully implemented. Use time stamps. Here's an examples:

11-02-2018 18:00:00 - Project is underway. Created the express server and "hello world" functionality.
11-05-2018 16:00:00 - Google Vision requests are working.
11-05-2018 16:00:00 - Spotify requests are working.
11-06-2018 17:00:00 - Added ability to seed track.
11-06-2018 18:00:00 - File uploads working.
11-07-2018 10:30:00 - Rewrote file uploads with multer.
11-07-2018 18:00:00 - Reached MVP. Able to take a user through the app from start to finish.
11-08-2018 16:00:00 - Basic layout and styling done.
11-08-2018 18:00:00 - Heroku deployment working.
11-09-2018 14:15:00 - Final code changes merged into master.


## Credits and Collaborations

While no code was copied and pasted into this project, general problem solving approaches were suggested by classmates and contributors to Stack Overflow. We thank everyone who inspired us and acknowledge this work to be a collaborative effort between ourselves, our classmates, and others on the internet sharing their knowledge and experience.
