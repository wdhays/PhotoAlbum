/*Modules*/
var fs = require('fs');
var http = require("http");
var staticServer = require("node-static");
var sqlite3 = require("sqlite3").verbose();

/*Set up some globals.*/
var fileServer = new staticServer.Server("./public");
var dbFileName = "./PhotoAlbum.db";
var imgSourceURL = "http://wdhays.com/public/PhotoAlbum/";
var db = new sqlite3.Database(dbFileName, dbOpenCallback);

/*Server handler */
function handleServerRequest(request, response) {

    var url = request.url;
    console.log("Got a request!");
    console.log(url);
    let urlSplit = url.split("/");

    /*  If the request begins with 'query' then we attempt to process that.
        Otherwise we attempt to serve a file from public directory.
        Note: If directory "./public/query/" were to exist, it wouldn't work. */
    if ((urlSplit.length === 2) && (urlSplit[1].startsWith("query"))) {

        /* Request is for query */
        let querySplit = url.split("?");

        /* Create a query request dictionary so we can populate it with arguments we received */
        let queryRequest = {};

        for (var queryIndex = 1; queryIndex < querySplit.length; querySplit++) {

            /* Since a query can have multiple arguments, iterate over all of them and handle each */
            let argumentSplit = querySplit[queryIndex].split("=");

            if (argumentSplit.length === 1 || argumentSplit[0] === '' || argumentSplit[1] === '') {
                /* The argument is keyless, or otherwise missing some part, error. */
                continue;
            }

            let argumentName = argumentSplit[0];
            let argumentValues = argumentSplit[1].split("+");
            queryRequest[argumentName] = argumentValues;
        }

        /*Verify that there are image numbers and they are valid for the different query types.*/
        let goodListFlag = verifyArgList(queryRequest);
        let goodKeyListFlag = verifyArgKeyList(queryRequest);
        let goodAllTagsFlag = verifyArgAllTags(queryRequest);

        if (typeof queryRequest['addTagTo'] !== 'undefined') {
            addTagFlag = true;
        } else {
            addTagFlag = false;
        }

        if (typeof queryRequest['removeTagFrom'] !== 'undefined') {
            removeTagFlag = true;
        } else {
            removeTagFlag = false;
        }

        /*One of these flags will be set if we received a valid query.*/
        if (goodListFlag) {
            response.writeHead(200, { "Content-Type": "application/json" });
            var requestedImages = queryRequest["numList"].join();
            getAndSendImageInfo(requestedImages);
        } else if (goodKeyListFlag) {
            response.writeHead(200, { "Content-Type": "application/json" });
            var requestedImages = queryRequest["keyList"];
            getAndSendImageInfoKeyList(requestedImages);
        } else if (goodAllTagsFlag) {
            response.writeHead(200, { "Content-Type": "application/json" });
            getAllTags(queryRequest["allTags"]);
        } else if (addTagFlag) {
            response.writeHead(200, { "Content-Type": "text/plain" });
            selectRowTags(queryRequest["addTagTo"][0], decodeURIComponent(queryRequest["addTagTo"][1]), 'add');
        } else if (removeTagFlag) {
            response.writeHead(200, { "Content-Type": "text/plain" });
            selectRowTags(queryRequest["removeTagFrom"][0], decodeURIComponent(queryRequest["removeTagFrom"][1]), 'remove');
        } else {
            /* We got a bad query request. */
            response.writeHead(400, { "Content-Type": "text/html" });
            response.write("Bad Query Request!");
            response.end();
        }

    } else {
        /* Requst is for public directory */
        request.addListener('end', servePublicFile).resume();
    }

    /*Send a file from the public directory.*/
    function servePublicFile() {

        //Serve the file
        fileServer.serve(request, response, servePublicFileCallback);

        /**/
        function servePublicFileCallback(error, result) {

            /* The file has not been found */
            if (error && (error.status === 404)) {
                fileServer.serveFile('/not-found.html', 404, {}, request, response);
            }

            /*  Otherwise if there was no error, then we pass the retrieved file.
                Which serves as a living proof that communism works for retrieving files
                from ./public directory. */
        }
    }

    /*Get all the image names in the DB for a list of photo ids.*/
    function getAndSendImageInfo(imgNums) {

        /*Build and execute the query string*/
        db.all('SELECT * FROM photoTags WHERE id IN (' + imgNums + ')', dbSelectCallback);

        /*Called when the db is finished with the query.*/
        function dbSelectCallback(err, allRowData) {
            if (err) {
                console.log("SELECT Error: ", err);
            } else {
                for (var i = 0; i < allRowData.length; i++) {
                    //This is the format that React expects later.
                    allRowData[i].src = imgSourceURL + allRowData[i].name;
                }
                //Send the response in a JSON string.
                response.write(JSON.stringify(allRowData));
                response.end();
            }
        }
    }

    /*Get the names of all images that have a specific set of tags.*/
    function getAndSendImageInfoKeyList(imgTags) {

        /*Build and execute the query string*/
        let queryString = 'SELECT * FROM photoTags WHERE (';
        let sqlQueryVariables = [];

        /*Build a query string that will get all the images that match a set of tags.*/
        for (var i = 0; i < imgTags.length; i++) {
            var singleTag = decodeURIComponent(imgTags[i]);

            queryString += ' (location = ? OR (tags LIKE ? OR tags LIKE ? OR tags LIKE ? OR tags LIKE ?))'
            sqlQueryVariables.push(singleTag, singleTag, "%," + singleTag, singleTag + ",%", "%," + singleTag + ",%");

            if (i + 1 < imgTags.length) {
                queryString += ' AND';
            }
        }
        // Close out the string.
        queryString += ") LIMIT 30;";

        // Run the query.
        db.all(queryString, sqlQueryVariables, dbSelectCallback);

        /*Called when the db is finished with the query.*/
        function dbSelectCallback(err, allRowData) {
            if (err) {
                console.log("SELECT Error: ", err);
            } else {
                for (var i = 0; i < allRowData.length; i++) {
                    //This is the format that React expects later.
                    allRowData[i].src = imgSourceURL + allRowData[i].name;
                }
                response.write(JSON.stringify(allRowData));
                response.end();
            }
        }
    }

    /*Used in the auto complete, looks in the DB for tags that are similar to the string being entered
      by the user.*/
    function getAllTags(givenTags) {

        /*Build and execute the query string*/
        let queryString = 'SELECT location, tags FROM photoTags WHERE ';
        let sqlQueryVariables = [];

        for (var i = 0; i < givenTags.length; i++) {

            queryString += ' location LIKE ? OR (tags LIKE ? OR tags LIKE ?)';
            sqlQueryVariables.push("%" + givenTags[i] + "%", givenTags[i] + "%", "%," + givenTags[i] + "%");

            if (i + 1 < givenTags.length) {
                queryString += ' OR';
            }
        }
        // Close out the string.
        queryString += ";";

        // Run the query.
        db.all(queryString, sqlQueryVariables, dbSelectCallback);

        /*Called when the db is finished with the query.*/
        function dbSelectCallback(err, allRowData) {
            if (err) {
                console.log("SELECT Error: ", err);
            } else {

                returnData = {};
                returnData["tags"] = [];
                returnData["locations"] = [];

                // Make sure that we are only sending distict tags and locations. 
                for (var i = 0; i < allRowData.length; i++) {

                    var entryTags = allRowData[i].tags.split(",");
                    var entryLocation = allRowData[i].location;

                    for (var j = 0; j < givenTags.length; j++) {
                        var givenTag = givenTags[j];

                        if (givenTag.length === 0) {
                            continue;
                        }

                        /* Song and dance to push distinct tags */
                        for (var tagIndex = 0; tagIndex < entryTags.length; tagIndex++) {
                            if ((entryTags[tagIndex].length > 0) && (returnData["tags"].indexOf(entryTags[tagIndex]) === -1) &&
                                (entryTags[tagIndex].toString().toLowerCase()).startsWith(givenTag.toString().toLowerCase()) &&
                                ((entryTags[tagIndex].toString().toLowerCase()) !== (givenTag.toString().toLowerCase()))) {
                                returnData["tags"].push(entryTags[tagIndex]);
                            }
                        }

                        if ((entryLocation.length > 0) && (returnData["locations"].indexOf(entryLocation) === -1) &&
                            (entryLocation.toString().toLowerCase()).startsWith(givenTag.toString().toLowerCase())) {
                            returnData["locations"].push(entryLocation);
                        }
                    }
                }

                // Sort the arrays
                returnData["tags"].sort();
                returnData["locations"].sort();
                // Send the response as a JSON string.
                response.write(JSON.stringify(returnData));
                response.end();
            }
        }
    }

    /*This function handles both adding a new tag to an image and removing an old tag from the image.*/
    function selectRowTags(index, tagName, type) {

        cmdStr = `SELECT tags FROM photoTags where id = ?`;

        if (type == 'add') {
            // console.log(cmdStr);
            db.get(cmdStr, index, addAfterSelectCallback);
        } else {
            // console.log(cmdStr);
            db.get(cmdStr, index, removeAfterSelectCallback);
        }

        function addAfterSelectCallback(err, row) {
            console.log("Adding Tag!");
            if (err) {
                console.log("Add Select Error: ", err);
            } else {
                // Do some formatting before the update.
                oldTags = row['tags']
                newTags = oldTags + ',' + tagName;
                newTags = newTags.replace(',,', ',');
                if (newTags.endsWith(',')) { newTags = newTags.slice(0, -1); }
                if (newTags.startsWith(',')) { newTags = newTags.slice(1); }
                newTags = newTags.trim();
                // console.log(newTags);
                cmdStr = `UPDATE photoTags SET tags = ? WHERE id = ?`;
                // console.log(cmdStr);
                db.run(cmdStr, [newTags, index], dbUpdateCallback);

            }
        }

        function removeAfterSelectCallback(err, row) {
            console.log("Removing Tag!");
            if (err) {
                console.log("Remove Select Error: ", err);
            } else {
                // Do some formatting before the update.
                oldTags = row['tags']
                newTags = oldTags.replace(tagName, '');
                newTags = newTags.replace(',,', ',');
                if (newTags.endsWith(',')) { newTags = newTags.slice(0, -1); }
                if (newTags.startsWith(',')) { newTags = newTags.slice(1); }
                newTags = newTags.trim();
                //console.log(newTags);
                cmdStr = `UPDATE photoTags SET tags = ? WHERE id = ?`;
                //console.log(cmdStr);
                db.run(cmdStr, [newTags, index], dbUpdateCallback);
            }
        }

        /**/
        function dbUpdateCallback(err) {
            if (err) {
                console.log("Tag Update Error: ", err);
            } else {
                response.write('Done!');
                response.end();
            }
        }
    }
}

/**/
function verifyArgList(queryRequest) {
    /*Make sure we have number to verify.*/
    if (typeof queryRequest["numList"] === 'undefined' || queryRequest["numList"].length === 0) {
        return false;
    }
    /*Verify the numbers.*/
    for (let argIndex = 0; argIndex < queryRequest["numList"].length; argIndex++) {
        let parsedArg = queryRequest["numList"][argIndex];
        if (isNaN(parsedArg) || parsedArg < 0 || parsedArg > 988) {
            return false;
        }
    }
    return true;
}

/**/
function verifyArgKeyList(queryRequest) {
    /*Make sure we have number to verify.*/
    if (typeof queryRequest["keyList"] === 'undefined' || queryRequest["keyList"].length === 0) {
        return false;
    }
    return true;
}

/**/
function verifyArgAllTags(queryRequest) {
    if (typeof queryRequest["allTags"] === 'undefined' || queryRequest["allTags"].length === 0) {
        return false;
    }
    return true;
}

/**/
function dbOpenCallback(err) {
    if (err) {
        console.log("DB Open Error: ", err);
    } else {
        console.log("Database Connected!");
    }
}

/*Got sick of having to concant strings.*/
String.prototype.format = function() {
    var i = 0,
        args = arguments;
    return this.replace(/{}/g, function() {
        return typeof args[i] != 'undefined' ? args[i++] : '';
    });
};

/*Set up the listener for the server.*/
var ourServer = http.createServer(handleServerRequest);
ourServer.listen(56954);