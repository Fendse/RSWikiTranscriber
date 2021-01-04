onPageReady(function () {
	var warningsOutput = document.getElementById("warnings");
	// This one has to be present from the start - we can't exactly use a script to add it otherwise
	warningsOutput.removeChild(document.getElementById("warn-noscript"));

	if (window.alt1) {
		stopAndClear();
		document.getElementById("clear").onclick = stopAndClear;
		document.getElementById("export").onclick = exportTree;
		a1lib.identifyUrl("appconfig.json");
		playerInputField = document.getElementById("playername");
		document.getElementById("use-custom-indent").addEventListener("change", function(evt) {
			document.getElementById("custom-indent").disabled = !evt.target.checked;
		});
		window.alt1.events.alt1pressed.push(eventSelect);
	} else {
		warn("Could not detect Alt1.\nThis app can only be installed from inside Alt1's browser app.", "warn-no-alt1", true);	
	}
	if (uuid === undefined) {
		warn("Missing submodule: uuid\nIf you installed the app locally, make sure the \"uuid\" folder is present and not empty.\nIf you installed using Git, the following command should fix the problem: \"git submodule update --init --recursive\".", "warn-submodule-uuid", true);
	}
});

/**
 * Add a warning with the given text to the element with id "warnings"
 * The warning contains a "dismiss" button that shows up unless this is called with permanent = true
 * The warning will have the "warning" class and the specified ID if one is present, and no ID otherwise
 */
function warn(text, id, permanent = false) {
	warning = document.createElement("p");
	warning.innerText = text;
	warning.classList.add("warning");

	if (id !== undefined) {
		warning.id = id;
	}
	if (!permanent) {
		dismissButton = document.createElement("button");
		dismissButton.classList.add("dismiss-warning");
		dismissButton.onclick = function (w) {
			return function () {
				console.log("Removing a warning");
				console.log(w);
				w.parentNode.removeChild(w);
			}
		} (warning);
		dismissButton.innerText = "🗙";

		warning.appendChild(dismissButton);
	}
	document.getElementById("warnings").appendChild(warning);

	console.log("Warning: " + text);
}

var interval = null;
function startTranscribe() {
	var startButton = document.getElementById("start-stop");
	startButton.onclick = stopTranscribe;
	startButton.innerText = "Stop";
	interval = setInterval(spacebar, 400);
}

function stopTranscribe() {
	var stopButton = document.getElementById("start-stop");
	stopButton.onclick = startTranscribe;
	stopButton.innerText = "Start";
	clearInterval(interval);
	interval = null;
	setupOpts(null);
	currentChild = dialogueTree;
}

var reader = new DialogFullReader();
var dialogueTree = null;
var currentChild = null;
var lastRead = null;

/**
* Stops the transcribing and also clears the dialogue tree.
*/
function stopAndClear() {
	stopTranscribe();
	clear();
	// What exactly did you expect?
}

/**
* Clears the dialogue tree.
*/
function clear() {
	dialogueTree = null;
	currentChild = dialogueTree;
	lastRead = null;
	document.getElementById("output").innerText = "";
}

/**
* Exports the generated dialogue tree to a text format.
* Write it to a dedicated output area.
*/
function exportTree() {
	var initialIndent = 1;
	if (document.getElementById("use-custom-indent").checked) {
		initialIndent = parseInt(document.getElementById("custom-indent").value, 10);
	}

	
	document.getElementById("output").innerText = stringify(dialogueTree, initialIndent, null);
	return;
	
	var itemsToParse = [dialogueTree];

	while (itemsToParse.length) {
		var next = itemsToParse[0];
	}
	
}


/**
* Runs every 400ms, adding any dialogue boxes it finds to the tree.
* If it finds an option box, it stops itself from looping, and sets up buttons to pick an option.
* These buttons delegate to the select() function.
*/
function spacebar() {
	var image = a1lib.bindfullrs();
	var foundBox = reader.find(image);

	if (!foundBox) return;

	var read = reader.read(image);
	if (!read) return;
	if (!isNewRead(read)) return;
	lastRead = read;
	
	if (isOpts(read)) {
		clearInterval(interval);
		interval = null;
		
	}

	var continuingFromOld = false;
	var equalNode;
	if (currentChild) {
		if (areTheSame(currentChild, read)) {
			// Keep things in sync after restarts.
			return;
		}
		if (currentChild.next) {
			// We've been here before
			if (areTheSame(read, currentChild.next)) {
				currentChild = currentChild.next;
				setupOpts(currentChild.opts);
				if (document.getElementById("auto-export").checked) {
					exportTree();
				}
				return;
			} else {
				// We're probably dealing with random/conditional dialogue
				// TODO: Deal with that in a reasonable manner
				// (for now, we just ignore the old dialogue in favour of the new)
				
				// (by which I mean we fall through to the code we'd've ended up in
				//  had currentChild.next not been set)
			}
		}
		equalNode = findEqualNode(read);
		if (equalNode) {
			currentChild.next = equalNode;
			equalNode.parents.push(currentChild);
			if (!equalNode.anchor) {
				equalNode.anchor = uuid();
			}
		} else {
			currentChild.next = read;
			read.parents = [currentChild];
		}
	}

	if (equalNode) {
		currentChild = equalNode;
		if (!equalNode.anchor) {
			equalNode.anchor = uuid();
		}
	} else {
		currentChild = read;
	}
	setupOpts(currentChild.opts);
	if (!dialogueTree) {
		currentChild.parents = [null];
		dialogueTree = currentChild;
	}
	if (document.getElementById("auto-export").checked) {
		exportTree();
	}
}

/**
* Pressing one of the option buttons fires this function, causing the resulting dialogue to be
* appended to the proper option in the tree.
* Runs every 400ms until a new box is found, and restarts the spacebar() loop unless that
* box is another options box.
*/
function select(index) {
	if (interval == null) {
		interval = setInterval(function() {
			select(index);
		}, 400);
	}
	var image = a1lib.bindfullrs();
	var foundBox = reader.find(image);

	if (!foundBox) return;

	var read = reader.read(image);
	if (!read) return;	
	if (!isNewRead(read)) return;
	lastRead = read;
	
	clearInterval(interval);
	interval = null;
	
	if (!isOpts(read)) {
		interval = setInterval(spacebar, 400);
	}
	read.parents = [currentChild];

	var equalNode = findEqualNode(read);
	if (currentChild.opts[index].next) {
		// We've been here before
		if (areTheSame(read, currentChild.opts[index].next)) {
			currentChild = currentChild.opts[index].next;
			setupOpts(currentChild.opts);
			if (document.getElementById("auto-export").checked) {
				exportTree();
			}
			return;
		} else {
			// We're probably dealing with random/conditional dialogue
			// TODO: Deal with that in a reasonable manner
			// (for now, we just ignore the old dialogue in favour of the new)

			// (by which I mean we fall through to the code we'd've ended up in
			//  had currentChild.opts[index].next not been set)
		}
	}

	if (equalNode) {
		currentChild.opts[index].next = equalNode;
		equalNode.parents.push(currentChild);

		currentChild = equalNode;
	} else {
		currentChild.opts[index].next = read;
		read.parents = [currentChild];
	
		currentChild = read;
	}
	setupOpts(currentChild.opts);
	if (document.getElementById("auto-export").checked) {
		exportTree();
	}
}

function isNewRead(read) {
	// If there was no last read, any read is a new one
	if (lastRead == null && read != null) {
		return true;
	}

	// If one has text but not the other, the read is new
	if ((lastRead.text == null) != (read.text == null)) return true;

	// If both have texts...
	if (lastRead.text && read.text) {
		// ...the read is new iff the texts are different
		if (lastRead.text.length != read.text.length) return true;
		for (var i = 0; i < read.text.length; ++i) {
			if (lastRead.text[i] != read.text[i]) return true;
		}
		return false;
	}

	// If we get here, neither has text. Thus both are options.
	if (read.opts.length != lastRead.opts.length) return true;
	for (var i = 0; i < read.opts.length; ++i) {
		if (lastRead.opts[i].str != read.opts[i].str) return true;
	}
	return false;
}

/**
* Given a list of dialogue options, replaces any existing dialogue option buttons with buttons
* matching the options in the list. 
* If the Overlay permission has been granted, also shows an icon by the dialogue options
* indicating whether they've been visited in the past, and whether they've been selected.

* The supplied list may be empty, or null, or undefined.
* In that case, the buttons are simply removed and any overlays are cleared.
*/
function setupOpts(opts) {
	// Set up buttons
	var optButtonField = document.getElementById("options");
	var optButtons = optButtonField.getElementsByClassName("select-button");
	for (var i = optButtons.length - 1; i >= 0; --i) {
		optButtonField.removeChild(optButtons[i]);
	}
	if (window.alt1.permissionsOverlay) {
		window.alt1.overLayClearGroup("RSWT");
	}
	if (!opts) return;
	for (var i = 0; i < opts.length; ++i) {
		var button = document.createElement("DIV");
		button.classList.add("nisbutton");
		button.classList.add("select-button");
		button.onclick = makeOptButtonCallback(i);
		button.innerText = opts[i].str;
		optButtonField.appendChild(button);
	}

	// Set up overlays
	if (window.alt1.permissionOverlay) {
		window.alt1.overLaySetGroup("RSWT");
		for (var i = 0; i < opts.length; ++i) {
			var color;
			if (opts[i].next) {
				color = a1lib.mixcolor(0, 255, 0);
			} else {
				color = a1lib.mixcolor(255, 0, 0);
			}

			window.alt1.overLayRect(color, opts[i].buttonx, opts[i].y - 8, opts[i].w, 18, 3600000, 2);
			// TODO: Maybe use intervals to make the overlay last longer than 20s
		}
	} else {
		console.log("Missing overlay permission");
	}
}
/**
* Required because closures apparently don't work the way I thought they would.
*/
function makeOptButtonCallback(index) {
	return function() {
		select(index);
	}
}

/**
* Returns true if the provided box is a "speech box" - one that has a title and some text.
* Returns false otherwise.
* It probably also has a chathead, and respresents a line of spoken dialogue.
*/
function isSpeech(read) {
	if (!read) return false;
	return (read.text && read.title && !read.opts) ? true : false;
}

/**
* Returns true if the provided box is an "options box" - one that has a title and some options.
* Returns false otherwise.
*/
function isOpts(read) {
	if (!read) return false;
	return (!read.text && read.title && read.opts) ? true : false;
}

/**
* Returns true if the provided box is a "message box" - one that has text but no title and no options.
* Returns false otherwise.
*/
function isMessage(read) {
	if (!read) return false;
	return (read.text && !read.title && !read.opts) ? true : false;
}


/**
* Turns a dialogue tree into a string.
*/
var anchorsVisited;
/**
* Turns a dialogue tree into a string.
*/
function stringify(dialogue, indentLevel=1, parent) {
	var autoGenCat = "[[Category:Autogenerated dialogue that needs checking]]";
	if (dialogue == null) return ""; // Is this sensible or do we want {{transcript missing}}?
	var playerName = new RegExp(playerInputField.value, "gi");
	if (!parent) anchorsVisited = {};

	if (dialogue.anchor) {
		if (anchorsVisited[dialogue.anchor]) {
			return "\n" + "*".repeat(indentLevel) + " ''(continues at [[#" + dialogue.anchor + "]])''" + autoGenCat;
		} else {
			anchorsVisited[dialogue.anchor] = true;
		}
	}

	var retVal = "";
	if (isOpts(dialogue)) {
		retVal = "\n";
		retVal += "*".repeat(indentLevel);
		retVal += " ";
		retVal += dialogue.title[0].toUpperCase() + dialogue.title.slice(1).toLowerCase();
		
		if (dialogue.anchor) {
			retVal += "<sup><span id=\"" + dialogue.anchor + "\"></span>" + autoGenCat + dialogue.anchor + "</span></sup>";
		}

		for (var i = 0; i < dialogue.opts.length; ++i) {
			retVal += "\n";
			retVal += "*".repeat(indentLevel + 1);
			retVal += dialogue.opts[i].str.replace(playerName, "Player");



			if (dialogue.opts[i].next) {
				retVal += stringify(dialogue.opts[i].next, indentLevel + 2, dialogue);
			} else {
				retVal += "\n" + "*".repeat(indentLevel + 2) + " {{Transcript missing}}";
			}
			
		}
	} else if (isSpeech(dialogue)) {
		if (parent
			&& !dialogue.anchor
			&& isSpeech(parent)
			&& parent.title == dialogue.title) {
			retVal =  " " + dialogue.text.join(" ").replace(playerName, "Player");
		} else {
			retVal = "\n"
				+ "*".repeat(indentLevel)
				+ " '''"
				+ titleOrPlayerName(dialogue.title)
				+ ":''' "
				+ dialogue.text.join(" ").replace(playerName, "Player");
		}
		if (dialogue.anchor) {
			retVal += "<sup><span id=\"" + dialogue.anchor + "\"></span>" + autoGenCat + dialogue.anchor + "</span></sup>";
		}
		
		if (dialogue.next) retVal += stringify(dialogue.next, indentLevel, dialogue);
	} else if (isMessage(dialogue)) {
		if (parent
			&& !dialogue.anchor
			&& isMessage(parent)) {
			retVal = " " + dialogue.text.join(" ").replace(playerName, "Player");
		} else {
			retVal = "\n" + "*".repeat(indentLevel) + " " + dialogue.text.join(" ").replace(playerName, "Player");
		}
		if (dialogue.anchor) {
			retVal += "<sup><span id=\"" + dialogue.anchor + "\"></span>" + autoGenCat + dialogue.anchor + "</span></sup>";
		}
		
		if (dialogue.next) retVal += stringify(dialogue.next, indentLevel, dialogue);
	} else {
		console.log("Could not make sense of the following dialogue entry:");
		console.log(dialogue);
	}
	return retVal;
}

var playerInputField;

/**
* Returns the supplied string if it's equal (case insensitive) to the value contained in the playername input field,
* and return "Player" otherwise
*/
function titleOrPlayerName(ttl) {
	if (ttl.toUpperCase() == playerInputField.value.toUpperCase()) {
		return "Player";
	} else {
		return ttl[0].toUpperCase() + ttl.slice(1).toLowerCase();
	}
}


/**
* Returns whether two dialogue boxes are similar enough to be thought of as being the same.
* Currently, this is true if one of the following holds:
*     1. Both boxes are "speech boxes", their titles are identical, and their text is identical after replacing all linebreaks with spaces.
*     2. Both boxes are "option boxes", their titles are identical, and they feature the same number of options, with the same texts, in the same order.
*     3. Both boxes are "message boxes", and their text is identical after replacing all linebreaks with spaces.
* If one of the boxes is null or undefined, but the other is not, this returns false.
* In all other cases, undefined is returned.
*
* Some or all of these conditions may change in the future.
*/
function areTheSame(box1, box2) {
	if (!!box1 != !!box2) return false;

	if (isSpeech(box1)
		&& isSpeech(box2)
		&& box1.title == box2.title
		&& box1.text.join(" ") == box2.text.join(" ")
	   ) {
		return true;
	} else if (isOpts(box1)
			   && isOpts(box2)
			  ) {
		// TODO: Maybe allow minor variation ("shows other options")
		if (box1.opts.length != box2.opts.length) {
			return false;
		}
		for (var i = 0; i < box1.opts.length; ++i) {
			if (box1.opts[i].str != box2.opts[i].str) {
				return false;
			}
		}
		return true;
	} else if (isMessage(box1)
			   && isMessage(box2)
			   && box1.text.join(" ") == box2.text.join(" ")
			  ) {
		return true;
	}

}


/**
* Fired by Alt1-s event handler when Alt+1 is pressed.
* Delegates to select() if a dialogue option button is hovered.
* Does nothing otherwise.
*/
function eventSelect(evt) {
	var read = reader.read(a1lib.bindfullrs());

	if (!read) return;
	if (!isOpts(read)) return;
	
	for (var i = 0; i < read.opts.length; ++i) {
		if (read.opts[i].hover) {
			select(i);
			return;
		}
	}

	console.log("Selected no option on Alt1 press");
}


function findEqualNode(node, anchorsVisited={}) {
	var q = new Queue();
	q.enqueue(dialogueTree);
	while (!q.isEmpty()) {
		var candidate = q.dequeue();
		if (candidate.anchor) {
			if (anchorsVisited[candidate.anchor]) {
				continue; // Looping forever is bad, let's not
			} else {
				anchorsVisited[candidate.anchor] = true;
			}
		}
		if (areTheSame(node, candidate)) {
			return candidate;
		}
		if (isOpts(candidate)) {
			for (var i = 0; i < candidate.opts.length; ++i) {
				q.enqueue(candidate.opts[i]);
			}
		} else if (candidate.next) {
			q.enqueue(candidate.next);
		}
	}
}
