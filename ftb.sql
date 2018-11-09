DROP TABLE IF EXISTS moodplaylists;
DROP TABLE IF EXISTS sptfyusers;

CREATE TABLE IF NOT EXISTS
sptfyusers (
 userid SERIAL PRIMARY KEY,
 sptfyid VARCHAR(255) NOT NULL
);

CREATE TABLE IF NOT EXISTS
moodplaylists (
 playlistdbid SERIAL PRIMARY KEY,
 userid INT,
 FOREIGN KEY (userid) REFERENCES sptfyusers(userid),
 img_url TEXT,
 playlistid VARCHAR(255),
 seedtrackid VARCHAR(255)
);