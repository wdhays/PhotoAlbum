/*START REACT STUFF*/
/*Where the photo information for the AJAX response will go.*/
var photos = [];

/*A react component for a tag*/
class Tag extends React.Component {

    render() {
        //
        var _tag = this.props.tagName;
        var _imageID = this.props.imageID;
        //
        return React.createElement('div', { className: 'regular-tag', onClick: (event) => { event.stopPropagation(); } },
            // Tag Content
            React.createElement('p', {}, _tag),
            React.createElement('div', {
                onClick: (event) => {
                    // Stop onclick from going to parents and up.
                    event.stopPropagation();
                    removeRemoteTag("" + _imageID + "", "" + _tag + "");
                    this.props.tagAction(_tag);
                }
            }, "x")
        );
    }
};

/*A react component for a tag creator*/
/*This is the empty tag that will allow us to create a new tag*/
/*This guy will only be present when the current image has less than serven tags.*/
class TagCreator extends React.Component {

    constructor(props) {
        super(props);
        this.state = {tagName: ""};
    }

    render() {
        // Set up some variables.
        var _imageID = this.props.imageID;
        
        return React.createElement('div', { className: 'regular-tag creator-tag', onClick: (event) => { event.stopPropagation(); } },
            // Tag Creator Content
            // The part where the user enters the name of the new tag.
            React.createElement('input', {
                value: this.state.tagName,
                onClick: (event) => { event.stopPropagation(); },
                onChange: (event) => { this.setState({ tagName: event.target.value }); }
            }),
            // The part where the user clicks to actually add the tag to the DB.
            React.createElement('div', {
                onClick: (event) => {
                    event.stopPropagation();
                    if (this.state.tagName.length > 0) {
                        createRemoteTag("" + _imageID + "", "" + this.state.tagName + "");
                        this.props.tagAction(this.state.tagName);
                        this.setState({ tagName: "" });
                    }
                }
            }, "+") // The input box and the + are the only visible parts.
        );
    }
};


/*A react component for controls on an image tile*/
class TileControl extends React.Component {

    constructor(props) {
        super(props);
        this.state = {
            individualTags: props.tags.split(",").splice(0, 7), // Split by space and store only first 7
        };
    }

    render() {
        // Set up some variables.
        var _selected = this.props.selected;
        var _imageID = this.props.imageID;
        var _tags = this.props.tags;
        var _location = this.props.location;
        var _imgWidth = this.props.imageWidth;
        var _imgHeight = this.props.imageHeight;
        var tagElements = [];

        // Create a Tag component for each of this image's tags.
        for (var i = 0; i < this.state.individualTags.length; i++) {
            if (this.state.individualTags[i].length > 0) {
                var singleTagComp = React.createElement(Tag, {
                    key: i,
                    tagName: this.state.individualTags[i],
                    imageID: _imageID,
                    //Set up the tag action to remove a tag from this images state.
                    tagAction: (tag) => {
                        var tagIndex = this.state.individualTags.indexOf(tag);
                        if (tagIndex !== -1) {
                            var tagsCopy = this.state.individualTags;
                            tagsCopy.splice(tagIndex, 1);
                            this.setState({ individualTags: tagsCopy });
                        }
                    }
                });
                tagElements.push(singleTagComp);
            }
        }

        // If the image has less than 7 tags create a TagCreator component.
        if (tagElements.length < 7) {
            tagElements.push(
                React.createElement(TagCreator, {
                    key: 9999,
                    imageID: _imageID,
                    // Set up the tag action to add a new tag to this images state.
                    tagAction: (tag) => {
                        var tagsCopy = this.state.individualTags;
                        tagsCopy.push(tag);
                        this.setState({ individualTags: tagsCopy });
                    }
                })
            );
        }

        return (React.createElement('div', { className: _selected ? 'selectedControls' : 'normalControls', style: { width: _imgWidth, height: _imgHeight } },
                tagElements
            )
        )
    }
};


/*A react component for an image tile*/
class ImageTile extends React.Component {

    render() {
        // onClick function needs to remember these as a closure.
        var _onClick = this.props.onClick;
        var _index = this.props.index;
        var _photo = this.props.photo;
        var _selected = _photo.selected;

        return (
            React.createElement('div', {
                    style: { margin: this.props.margin, width: _photo.width },
                    className: 'tile',
                    onClick: function onClick(e) {
                        console.log("tile onclick");
                        // call Gallery's onclick
                        return _onClick(e, { index: _index, photo: _photo })
                    }
                },
                // Div contents, the tag controls and an Image
                React.createElement(TileControl, {
                    selected: _selected,
                    imageID: _photo.id,
                    tags: _photo.tags,
                    location: _photo.location,
                    imageWidth: _photo.width,
                    imageHeight: _photo.height
                }),
                React.createElement('img', {
                    className: _selected ? 'selected' : 'normal',
                    src: _photo.src,
                    width: _photo.width,
                    height: _photo.height
                })
            )
        );
    }
}


// The react component for the whole image gallery
// Most of the code for this is in the included library
class App extends React.Component {

    constructor(props) {
        super(props);
        this.state = { photos: photos };
        this.selectTile = this.selectTile.bind(this);
    }

    //Set up an event for when the user clicks on an image.
    selectTile(event, obj) {
        console.log("in onclick!", obj);
        let photos = this.state.photos;
        //Toggle showing the tags if the user clicks on an image.
        photos[obj.index].selected = !photos[obj.index].selected;
        //Redraw
        this.setState({ photos: photos });
    }

    render() {
        let isMobile = document.documentElement.clientWidth <= 430;
        let hasPhotos = this.state.photos.length === 0;

        // Control what is displayed in the gallery.
        if (hasPhotos) {
            return (
                React.createElement('div', { id: `noSearch` },
                    React.createElement('p', {}, "Nothing's been searched yet!"),
                    React.createElement('p', {}, "Use the search above")
                )
            );
        } else {
            if (isMobile) {
                return (
                    React.createElement(Gallery, {
                        photos: this.state.photos,
                        onClick: this.selectTile,
                        ImageComponent: ImageTile,
                        columns: 1
                    })
                );
            } else {
                return (
                    React.createElement(Gallery, {
                        photos: this.state.photos,
                        onClick: this.selectTile,
                        ImageComponent: ImageTile
                    })
                );
            }
        }
    }
}

/* Finally, we actually run some code */
const reactContainer = document.getElementById("photoDisplay");
var reactApp = ReactDOM.render(React.createElement(App), reactContainer);
/* Workaround for bug in gallery where it isn't properly arranged at init */
window.dispatchEvent(new Event('resize'));
/*END REACT STUFF*/

/*START OTHER STUFF*/
var createdTags = [];
var searchedTags = [];

// Used when the user removes a tag from ones they added in a search.
// There are two ways into the function, when the user adds a tag or when they remove a tag.
function updateImages(ignoreSearchBox) {
    // The user added a tag.
    if (!ignoreSearchBox) {

        var inputTags = document.getElementById("input-text").value;

        // If there are currently no tags and the user entered no input.
        if (!inputTags && searchedTags.length === 0) {
            reactApp.setState({ photos: [] });
            return;
        }

        //Format the user input into a list of usable tags, including multiword tags.
        let tagsList = [];
        let temptag = "";
        let tagParsingMultiWord = false;
        
        for (var i = 0; i < inputTags.length; i++) {
            if (inputTags[i] === ' ' && !tagParsingMultiWord) {
                tagsList.push(temptag);
                temptag = "";
            } else if (inputTags[i] === '"') {
                if (tagParsingMultiWord) {
                    tagsList.push(temptag);
                    temptag = "";
                    tagParsingMultiWord = false;
                } else {
                    tagParsingMultiWord = true;
                }
            } else {
                temptag += inputTags[i];
            }
        }

        if (temptag.length > 0) {
            tagsList.push(temptag);
        }

        // Add the tags to the current searched tags list.
        for (var i = 0; i < tagsList.length; i++) {
            if (tagsList[i].length > 0) {
                searchedTags.push(tagsList[i]);
            }
        }

    } else {
        //The user has not added any image tags.
        if (searchedTags.length === 0) {
            //Empty out old photos if there were any.
            reactApp.setState({ photos: [] });
            return;
        }
    }

    // Build out the query string for the http request.
    var tagsQuery = "";
    for (var i = 0; i < searchedTags.length; i++) {
        tagsQuery += searchedTags[i];
        if (i + 1 < searchedTags.length) {
            tagsQuery += '+';
        }
    }

    // This part sends the request to get the image URLS from the DB.
    if (tagsQuery.length > 0) {
        var xhr = new XMLHttpRequest();
        xhr.open("GET", "/query?keyList=" + tagsQuery);
        xhr.addEventListener("load", (evt) => {
            if (xhr.status == 200) {
                console.log("Got images from the server!");
                // Update the state photos.
                reactApp.setState({ photos: JSON.parse(xhr.responseText) });
                // If the user added a tag clear the input and redraw.
                if (!ignoreSearchBox) {
                    hideSearchAssistant();
                    document.getElementById("input-text").value = "";
                    redrawSearchedTags();
                }
                window.dispatchEvent(new Event('resize'));
            } else {
                console.log("XHR Error!", xhr.responseText);
            }
        });
        console.log("Sending request!");
        xhr.send();
    }
}

// Create a tag, one of these can be used serveral different locations.
function createTagElement(tag, isSearch, isLocation, isRemovable) {
    // Create a new div for the tag.
    var divElem = document.createElement("div");
    divElem.classList.add("regular-tag");

    // If this tag is a location add the location flag.
    if (isLocation) {
        divElem.classList.add("location-tag");
    }

    // Create the tag label.
    var tagNameElem = document.createElement("p");
    tagNameElem.appendChild(document.createTextNode(tag.toString()));
    divElem.appendChild(tagNameElem);

    // If the tag is removeable add some extra bits.
    if (isRemovable) {
        var tagDeleteElem = document.createElement("div");
        tagDeleteElem.appendChild(document.createTextNode("x"));
        if(isSearch) {
            tagDeleteElem.onclick = function() { removeSearchTag("" + tag + "") };
        } else {
            tagDeleteElem.onclick = function() { removeRemoteTag(""+ imageID +"", ""+ tag +"") };
        }
        
        divElem.appendChild(tagDeleteElem);
    }

    return divElem;
}

// Create a suggested tags for the auto complete feature.
// Regular tags are displayed differently than the location tags.
function createTagSuggestionElement(tag, isLocation) {

    // Create the tag element.
    var tagElem = createTagElement(tag, false, isLocation, false);

    // Create a container for the suggested tags.
    var tagElemContainer = document.createElement("div");
    tagElemContainer.classList.add("suggested-tags-list");
    tagElemContainer.appendChild(tagElem);

    // Create and add the arrow image to the container.
    var tagElemUse = document.createElement("img");
    tagElemUse.src = "use_tag_icon.png";
    tagElemContainer.appendChild(tagElemUse);

    // Make the whole div clickable.
    // This will move the suggested tag to the input box when the user clicks it.
    tagElemContainer.onclick = function() { useTag("" + tag + "") };

    return tagElemContainer;
}

// Remove a tag from the list of tags added to the serch by the user.
function removeSearchTag(tagName) {

    // Get the index of the tag to remove.
    var tagIndex = searchedTags.indexOf(tagName);

    // It exists, remove it and redraw.
    if (tagIndex !== -1) {
        searchedTags.splice(tagIndex, 1);
        redrawSearchedTags();
        updateImages(true);
    }
}

// Redraw the the part that has the tags the user already reached for.
function redrawSearchedTags() {

    // Get the DOM elements
    var messageElement = document.getElementById("searched-tag-message");
    var tagsElement = document.getElementById("searched-tag-list");

    // Remove the 'You searched for' message.
    if (messageElement.firstChild) {
        messageElement.removeChild(messageElement.firstChild);
    }

    // Remove all the current children(tags).
    while (tagsElement.firstChild) {
        tagsElement.removeChild(tagsElement.firstChild);
    }

    // If there are still tags just build it again from scrtch.
    if (searchedTags.length !== 0) {
        var tagNameElem = document.createElement("p");
        tagNameElem.appendChild(document.createTextNode("You searched for"));
        messageElement.appendChild(tagNameElem);

        for (var i = 0; i < searchedTags.length; i++) {
            var tagElem = createTagElement(searchedTags[i], true, false, true);
            tagsElement.appendChild(tagElem);
        }
    }
}

// This is the onclick when the user want to use one of the suggested tags.
function useTag(tagName) {

    var inputElement = document.getElementById("input-text");
    var inputText = inputElement.value;

    //No query?
    if (!inputText) {
        return;
    }

    // This works when the user has entered multiple tags seperated by spaces.
    // We only want to update the last one with a suggested tag on click.
    let tagsSplit = inputText.split(' ');

    // There are no tags!
    // Maybe the user only entered spaces?
    if (tagsSplit.length === 0) {
        return;
    }

    //Replace the last tag(the one the user was typing) with the suggested tag.
    tagsSplit[tagsSplit.length - 1] = tagName;

    // Build a new string of tags.
    var new_tags = "";
    for (var i = 0; i < tagsSplit.length; i++) {
        var tag = tagsSplit[i];
        // Does the suggested tag have more than one word?
        var multi_word = tag.split(' ').length > 1;
        // If so wrap it in quotes.
        if (multi_word) {
            tag = '"' + tag + '"';
        }
        //Add the tag to the string.
        new_tags += tag + " ";
    }

    // Update the input element with the updated tag list.
    inputElement.value = new_tags;

    // Continue checking for new suggestions.
    document.getElementById("input-text").focus();
    getTags();
}

// Get tags from the database, this is used to pull suggested tags for the autocomplete feature.
function getTags() {

    var textInput = document.getElementById("input-text").value;
    var search_assistant = document.getElementById("search-assistant");

    //If there is no user input or the input is less than two characters.
    if (!textInput || textInput.length < 2) {
        hideSearchAssistant();
        return;
    }

    // This works when the user has entered multiple tags seperated by spaces.
    // We only want to get suggested tags for the last one the user in entering.
    let tagsSplit = textInput.split(' ');

    // There are no tags!
    if (tagsSplit.length === 0) {
        hideSearchAssistant();
        return;
    }

    let tag_in_question = tagsSplit[tagsSplit.length - 1];

    // We only want to show suggestions when the user enters 2 or more characters.
    if (tag_in_question.length < 2) {
        hideSearchAssistant();
        return;
    }

    var xhr = new XMLHttpRequest();
    xhr.open("GET", "/query?allTags=" + tag_in_question.replace(/ /g, "+")); // We want more input sanitization than this!
    xhr.addEventListener("load", (evt) => {
        if (xhr.status == 200) {
            console.log("We got some suggested tags!");
            var parsedData = JSON.parse(xhr.responseText);

            // Update the suggested tags
            var search_assistant_suggestions = document.getElementById("search-assistant-suggested-tags");

            // Remove the old suggestions.
            while (search_assistant_suggestions.firstChild) {
                search_assistant_suggestions.removeChild(search_assistant_suggestions.firstChild);
            }

            // Populate with tags
            for (var tagIndex = 0; tagIndex < parsedData.tags.length && tagIndex < 5; tagIndex++) {
                var tag = parsedData.tags[tagIndex];
                var tagElement = createTagSuggestionElement(tag, false);
                search_assistant_suggestions.appendChild(tagElement);
            }

            // Populate with locations
            for (var locIndex = 0; locIndex < parsedData.locations.length && locIndex < 3; locIndex++) {
                var tag = parsedData.locations[locIndex];
                var tagElement = createTagSuggestionElement(tag, true);
                search_assistant_suggestions.appendChild(tagElement);
            }

            // Update the position of our assistant
            redrawSearchAssistant();

            if (!search_assistant.classList.contains("active")) {
                search_assistant.classList.add("active");
            }

        } else {
            console.log("XHR Error!", xhr.responseText);
        }
    });
    console.log("Sending request!");
    xhr.send();
}

// Send a request to the server to add a new tag to an image.
function createRemoteTag(imageID, tag) {
    // Send command to create remote tag
    if (tag.length > 0) {
        var xhr = new XMLHttpRequest();
        xhr.open("GET", "/query?addTagTo=" + imageID + '+' + tag);
        xhr.addEventListener("load", (evt) => {
            if (xhr.status == 200) {
                console.log("Tag Added!");
            } else {
                console.log("XHR Error!", xhr.responseText);
            }
        });
        console.log("Sending add request!");
        xhr.send();
    }
}

// Send a request to remove a tag from an image.
function removeRemoteTag(imageID, tag) {
    // Send command to remove remote tag
    if (tag.length > 0) {
        var xhr = new XMLHttpRequest();
        xhr.open("GET", "/query?removeTagFrom=" + imageID + '+' + tag); // We want more input sanitization than this!
        xhr.addEventListener("load", (evt) => {
            if (xhr.status == 200) {
                console.log("Tag Removed!");
                updateImages(true);
            } else {
                console.log("XHR Error!", xhr.responseText);
            }
        });
        console.log("Sending remove request!");
        xhr.send();
    }
}

// Unhide the search bar when in mobile view.
function unHideSearch() {
    let isMobile = document.documentElement.clientWidth <= 430;
    if (isMobile) {
        document.getElementById("input-text").classList.remove("hidden");
        document.getElementById("logo").classList.add("hidden");
    }
}

// Hide the search bar when in mobile view.
function hideSearch() {
    let isMobile = document.documentElement.clientWidth <= 430;
    if (isMobile) {
        document.getElementById("input-text").classList.add("hidden");
        document.getElementById("logo").classList.remove("hidden");
    }
}

// Redraw the updated suggested tab dropdown.
function redrawSearchAssistant() {
    var search_assistant = document.getElementById("search-assistant");
    var search_bar_position = document.getElementById("input-text").getBoundingClientRect();

    search_assistant.style.top = (search_bar_position.bottom + 5) + "px";
    search_assistant.style.left = search_bar_position.left + "px";
    search_assistant.style.width = (search_bar_position.width - 2 - 20) + "px";
}

// Hide the suggested tags drop down.
function hideSearchAssistant() {
    document.getElementById("search-assistant").classList.remove("active");
}

//
function viewResize() {
    redrawSearchAssistant();
    hideSearch();
}

// Make the main input box submit when the user pushes enter.
var input = document.getElementById("input-text");
// Execute a function when the user releases a key on the keyboard
input.addEventListener("keyup", function(event) {
    event.preventDefault();
    // Number 13 is the "Enter" key on the keyboard
    if (event.keyCode === 13) {
        // Trigger the button element with a click
        document.getElementById("search-button").click();
    }
});

hideSearchAssistant();
hideSearch();
/*END OTHER STUFF*/
