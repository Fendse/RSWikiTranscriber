onPageReady(function () {
	if (window.alt1) {
		stopAndClear();
		document.getElementById("clear").onclick = stopAndClear;
		document.getElementById("export").onclick = exportTree;
		a1lib.identifyUrl("appconfig.json");
		playerInputField = document.getElementById("playername");
	} else {
		document.getElementById("output").innerText = "Could not detect Alt1";
	}
});

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
	setupOptButtons(null);
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
	if (dialogueTree == null) {
		document.getElementById("output").innerText = "{{transcript missing}}";
	}
	var result = "";

	document.getElementById("output").innerText = stringify(dialogueTree, 1);
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
		
		setupOptButtons(read.opts);
	}

	var continuingFromOld = false;
	if (currentChild) {
		if (currentChild.next) {
			// We've been here before
			if (isSpeech(read)
				&& isSpeech(currentChild.next)
				&& read.title == currentChild.next.title
				&& read.text.join(" ") == currentChild.next.text.join(" ")
			   ) {
				continuingFromOld = true;
				// It's the same text as earlier, so we move on.
			} else if (isOpts(read)
					   && isOpts(currentChild.next)
					  ) {
				// TODO: Maybe allow minor variation ("shows other options")
				// Also, probably refactor this into reparate function, since this is a check we might want to repeat elsewhere
				if (read.opts.length == currentChild.next.opts.length) {
					continuingFromOld = true;
					for (var i = 0; i < read.opts.length; ++i) {
						if (read.opts[i].str != currentChild.next.opts[i].str) {
							continuingFromOld = false;
							break;
						}
					}
				}
			} else if (isMessage(read)
					   && isMessage(currentChild.next)
					   && read.text.join(" ") == currentChild.next.text.join(" ")
					  ) {
				continuingFromOld = true;
			}
		}
		if (continuingFromOld) {
			currentChild = currentChild.next;
			return;
		} else {
			read.parent = currentChild;
			currentChild.next = read;
		}
	}
	
	currentChild = read;
	if (!dialogueTree) {
		dialogueTree = currentChild;
	}
}

/**
* Pressing one of the option buttons fires this function, causing the resulting dialogue to be
* appended to the proper option in the tree.
* Runs every 400ms until a new box is found, and restarts the spacebar() loop unless that
* box is another options box.
*/
function select(index) {
	interval = setInterval(function() {
		select(index);
	}, 400);
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
	setupOptButtons(read.opts);
	read.parent = currentChild;
	if (currentChild.opts) {
		currentChild.opts[index].next = read;
	} else {
		console.log("currentChild has no options in select()");
		console.log(currentChild);
	}
	currentChild = read;
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
* matching the options in the list. The supplied list may be empty, or null, or undefined.
* In that case, the bttons are simply removed.
*/
function setupOptButtons(opts) {
	var optButtonField = document.getElementById("options");
	var optButtons = optButtonField.getElementsByClassName("select-button");
	for (var i = optButtons.length - 1; i >= 0; --i) {
		optButtonField.removeChild(optButtons[i]);
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

function parseSpeech(read) {
	// Assume it's valid
	read.parent = currentChild;
	
}


function parseOpts(read) {
	
}


function stringify(dialogue, indentLevel) {
	if (dialogue == null) return ""; // Is this sensible or do we want {{transcript missing}}?
	if (isOpts(dialogue)) {
		var retVal = "\n";
		retVal += "*".repeat(indentLevel);
		retVal += " '''";
		retVal += dialogue.title;
		retVal += "'''";

		for (var i = 0; i < dialogue.opts.length; ++i) {
			retVal += "\n";
			retVal += "*".repeat(indentLevel + 1);
			retVal += dialogue.opts[i].str;
			if (dialogue.opts[i].next) {
				retVal += stringify(dialogue.opts[i].next, indentLevel + 2);
			} else {
				retVal += "\n" + "*".repeat(indentLevel + 2) + " {{Transcript missing}}";
			}
			
		}
		return retVal;
	} else if (isSpeech(dialogue)) {
		var retVal = "";
		if (dialogue.parent
			&& isSpeech(dialogue.parent)
			&& dialogue.parent.title == dialogue.title) {
				retVal =  " " + dialogue.text.join(" ");
		} else {
			retVal = "\n"
				+ "*".repeat(indentLevel)
				+ " '''"
				+ titleOrPlayerName(dialogue.title)
				+ ":''' "
				+ dialogue.text.join(" ");
		}
		if (dialogue.next) return retVal + stringify(dialogue.next, indentLevel);
		else return retVal;
	} else if (isMessage(dialogue)) {
		var retVal = "";
		if (dialogue.parent && isMessage(dialogue.parent)) {
			retVal = " " + dialogue.text.join(" ");
		} else {
			retVal = "\n" + "*".repeat(indentLevel) + " " + dialogue.text.join(" ");
		}
	} else {
		console.log("Could not make sense of the following dialogue entry:");
		console.log(dialogue);
	}
}

var playerInputField;
function titleOrPlayerName(ttl) {
	if (ttl.toUpperCase() == playerInputField.value.toUpperCase()) {
		return "Player";
	} else {
		return ttl;
	}
}
