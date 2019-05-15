onPageReady(function () {
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
	var initialIndent = 1;
	if (document.getElementById("use-custom-indent").checked) {
		initialIndent = parseInt(document.getElementById("custom-indent").value, 10);
	}

	
	document.getElementById("output").innerText = stringify(dialogueTree, initialIndent);
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
		if (areTheSame(currentChild, read)) {
			// Keep things in sync after restarts.
			return;
		}
		if (currentChild.next) {
			// We've been here before
			if (areTheSame(read, currentChild.next)) {
				currentChild = currentChild.next;
				return;
			} else {
				// We're probably dealing with random/conditional dialogue
				// TODO: Deal with that in a reasonable manner
				// (for now, we just ignore the old dialogue in favour of the new)

				// (by which I mean we fall through to the code we'd've ended up in
				//  had currentChild.next not been set)
			}
		}
		currentChild.next = read;
		read.parent = currentChild;
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
	setupOptButtons(read.opts);
	read.parent = currentChild;


	if (currentChild.opts[index].next) {
		// We've been here before
		if (areTheSame(read, currentChild.opts[index].next)) {
			currentChild = currentChild.opts[index].next;
			return;
		} else {
			// We're probably dealing with random/conditional dialogue
			// TODO: Deal with that in a reasonable manner
			// (for now, we just ignore the old dialogue in favour of the new)

			// (by which I mean we fall through to the code we'd've ended up in
			//  had currentChild.opts[index].next not been set)
		}
	}
		
	currentChild.opts[index].next = read;
	read.parent = currentChild;
	
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
		retVal += "*".repeat(indentLevel + 1);
		retVal += " ";
		retVal += dialogue.title[0].toUpperCase() + dialogue.title.slice(1).toLowerCase();

		for (var i = 0; i < dialogue.opts.length; ++i) {
			retVal += "\n";
			retVal += "*".repeat(indentLevel + 2);
			retVal += dialogue.opts[i].str;
			if (dialogue.opts[i].next) {
				retVal += stringify(dialogue.opts[i].next, indentLevel + 3);
			} else {
				retVal += "\n" + "*".repeat(indentLevel + 3) + " {{Transcript missing}}";
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
		if (dialogue.next) retVal += stringify(dialogue.next, indentLevel);
		return retVal;
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
		return ttl[0].toUpperCase() + ttl.slice(1).toLowerCase();
	}
}


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


function eventSelect(evt) {
	var read = reader.read(a1lib.bindfullrs());

	if (!read) return;
	if (!isOpts(read)) return;
	
	console.log(evt);
	for (var i = 0; i < read.opts.length; ++i) {
		if (read.opts[i].hover) {
			console.log("Selected option " + i + " by pressing Alt1");
			console.log(read.opts[i]);
			select(i);
			return;
		}
	}

	console.log("Selected no option on Alt1 press");
	// if (currentChild.opts) {
	// 	var chosenIndex = undefined;
	// 	for (var i = 0; i < currentChild.opts.length; ++i) {
	// 		var opt = currentChild.opts[i];
	// 		if (opt.x <= evt.x
	// 			&& opt.x + opt.w >= evt.x
	// 			&& opt.y <= evt.y
	// 			&& opt.y + opt.h >= evt.y
	// 		   ) {
	// 			select(i);
	// 		}
			
	// 	}
	// 	if (chosenIndex === undefined) {
	// 		console.log("None of the available options from the following child were selected:");
	// 		console.log(currentChild);
	// 	} else {
	// 		select(chosenIndex);
	// 	}
	// }
}
