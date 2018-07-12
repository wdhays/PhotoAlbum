var sqlite3 = require("sqlite3").verbose();
var fs = require("fs");

// Set up the DB object.
var dbFileName = "PhotoAlbum.db";
var db = new sqlite3.Database(dbFileName);

// Create a query string to create a single table.
var cmdStr = "CREATE TABLE photoTags ( \
		id INTEGER PRIMARY KEY, \
		name TEXT,\
		width INTEGER,\
		height INTEGER,\
		location TEXT,\
		tags TEXT\
	)";

// Run the SQL query.
db.run(cmdStr, tableCreationCallback);

// Print the error if any, otherwise close the DB.
function tableCreationCallback(err) {
    if (err) {
        console.log("Table creation error: ", err);
    } else {
        console.log("Database created");
        db.close();
    }
}