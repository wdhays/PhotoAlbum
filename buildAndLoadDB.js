/*Modules*/
var sqlite3 = require("sqlite3").verbose();
var fs = require("fs");
var url = require('url');
var http = require('http');
var imgSize = require('image-size');
var APIrequest = require('request');
http.globalAgent.maxSockets = 1;

/*Globals*/
/*NOTE: If you plan to run this code you will need to use your own Google Vision API key.*/
var googleVisionAPIKey = "REDACTED";
var dbFileName = "./PhotoAlbum.db";
var imgSourceURL = "http://wdhays.com/public/PhotoAlbum/";
var visionURL = 'https://vision.googleapis.com/v1/images:annotate?key=' + googleVisionAPIKey;
var imageMasterList = [];
var queue = [];
var COUNTER = 0
var IMAGE_COUNT = 988

/*Do some initial work.*/
parseJSONPhotos();
buildGoogleAPIRequestQueue();
/*Start the chain, the callback begins the process.*/
var db = new sqlite3.Database(dbFileName, dbCreateCallback);

/*Parse and fix any photo names.*/
function parseJSONPhotos() {
    var data = fs.readFileSync('photoList.json');
    if (!data) {
        console.log("cannot read photoList.json");
        return false;
    } else {

        listObj = JSON.parse(data);
        imgList = listObj.photoURLs;

        for (let index = 0; index < imgList.length; index++) {

            let imgName = imgList[index].replace("&#39;", "%26%2339%3b");
            let imgUrl = imgSourceURL + imgName;
            imageMasterList.push(imgName);
        }

        return true;
    }
}

/*Loop over each image, collect some more info, insert the image into the DB.*/
/*We are using the image size module to get the height and width of each image.*/
function loadImageListIntoDB() {

    for (let index = 0; index < imgList.length; index++) {

        let options = url.parse(imgSourceURL + imageMasterList[index]);

        http.get(options, function(response) {

            var chunks = [];

            response.on('data', function(chunk) {
                chunks.push(chunk); //Only got a chunk, need it all.
            }).on('end', function() {

                //Out the chunks together.
                var buffer = Buffer.concat(chunks);

                //Get the data we want.
                var imgHeight = imgSize(buffer).height;
                var imgWidth = imgSize(buffer).width;

                //Do the DB insertion.
                insertRow(index, imageMasterList[index], imgWidth, imgHeight);

            });
        });
    }
}

/*We are going to build a queue of function calls for hitting the Google Vision API*/
/*We need to do this to meter the number of API calls we make per minute, otherwise*/
/*Google will lock us out of the service for a period of time.*/
function buildGoogleAPIRequestQueue() {
    /* LET is important here! VAR will result in broken closures! */
    for (let i = 0; i < imageMasterList.length; i++) {
        /* Don't give to http module immediately; hold on to request for now */
        queue.push(() => loadImageTagsIntoDB(i));
    }
}

/*A simple function we call when we are ready to make the next API call.*/
function next() {
    if (queue.length > 0) {
        queue.pop()();
    } else {
        console.log("All Done!");
    }
}

/*Make the request to the Google Vision API, once we get a responce we will collect
  the information we want(location and labels) then insert it into the DB for image.*/
function loadImageTagsIntoDB(index) {

    console.log("Requesting tags for image: " + index);
    // Request google vision API
    APIrequestObject = {
        "requests": [{
            "image": {
                "source": { "imageUri": imgSourceURL + imageMasterList[index] }
            },
            "features": [{ "type": "LABEL_DETECTION" }, { "type": "LANDMARK_DETECTION" }]
        }]
    };
    // The code that makes a request to the API
    // Uses the Node request module, which packs up and sends off an HTTP message
    // containing the request to the API server
    APIrequest({ // HTTP header stuff
            url: visionURL,
            method: "POST",
            headers: { "content-type": "application/json" },
            json: APIrequestObject
        },
        // Set up the callback function for API request.
        APIcallback
    );

    // Callback function, called when data is received from API
    function APIcallback(err, APIresponse, body) {
        if ((err) || (APIresponse.statusCode != 200)) {
            console.log("Got API error");
            console.log(body);
        } else {

            // We got a valid response
            APIresponseJSON = body.responses[0];
            
            // Do some formatting on the data.
            var landmark = '';

            if (typeof APIresponseJSON.landmarkAnnotations !== 'undefined') {
                landmark = APIresponseJSON.landmarkAnnotations[0].description;
            }

            if (typeof landmark !== 'undefined') {
                landmark = landmark.replace(/"/g, "");
            } else {
                landmark = '';
            }

            var label_list = [];
            var labels = '';

            if (typeof APIresponseJSON.labelAnnotations !== 'undefined') {
                tag_info = APIresponseJSON.labelAnnotations
                count = APIresponseJSON.labelAnnotations.length
                for (var i = 0; i < count; i++) {
                    /*We only want 6 labels for each image.*/
                    if (i == 6) {
                        break;
                    }
                    label_list.push(tag_info[i].description);
                }

                /*Turn the list into a comma diliminated string.*/
                labels = label_list.join(',');

                if (typeof labels !== 'undefined') {
                    labels = labels.replace(/"/g, "");
                } else {
                    labels = '';
                }
            }

            // Insert the data into the DB.
            updateRow(index, landmark, labels);
            wait(300);
            next();
        }
    }
}

/*Insert a new row into the DB, this is for the first step to add the image
  name, image width and image height.*/
function insertRow(index, imgName, imgWidth, imgHeight) {
    cmdStr = `INSERT OR REPLACE INTO photoTags VALUES ({},"{}", {}, {}, "", "")`.format(index, imgName, imgWidth, imgHeight);
    console.log(cmdStr);
    db.run(cmdStr, dbInsertCallback);
}

/*Update a row in the DB, this is for the second step, add the image labels
  and location tags that we got from the Google Vision API*/
function updateRow(index, location, tags) {
    cmdStr = `UPDATE photoTags SET location = "{}", tags = "{}" WHERE id = {}`.format(location, tags, index);
    console.log(cmdStr);
    db.run(cmdStr, dbUpdataCallback);
}

/*Once the DB connection has been made we start building the DB*/
function dbCreateCallback(err) {
    if (err) {
        console.error(err.message);
    }
    console.log('Connected to the database.');
    console.log("Loading image names and dimensions.");
    /**/
    loadImageListIntoDB();
}

/*Once all the image names, heights and widths are inserted in the DB we will
  move onto the Google Vision API step.*/
function dbInsertCallback(err) {
    if (err) {
        console.log(err);
    } else {
        if (COUNTER == IMAGE_COUNT) {
            doneWithImages();
        } else {
            COUNTER++;
        }
    }
}

/**/
function dbUpdataCallback(err) {
    if (err) {
        console.log(err);
    }
}

/**/
function doneWithImages() {
    console.log("Done with image names and dimensions.");
    console.log("Loading image tags and landmarks.");
    next();
}

/*Got sick of having to concant strings.*/
String.prototype.format = function() {
    var i = 0,
        args = arguments;
    return this.replace(/{}/g, function() {
        return typeof args[i] != 'undefined' ? args[i++] : '';
    });
};

/*Create a delay*/
function wait(ms) {
    var d = new Date();
    var d2 = null;
    do { d2 = new Date(); }
    while (d2 - d < ms);
}