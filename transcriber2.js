onPageReady(function () {
	if (window.alt1) {
		stopAndClear();
		document.getElementById("clear").onclick = stopAndClear;
		document.getElementById("export").onclick = exportTree;
		a1lib.identifyUrl("appconfig.json");
	} else {
		document.write("Could not detect Alt1");
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
	dialogueTree = {};
	currentChild = dialogueTree;
	lastRead = null;
}

/**
* Exports the generated dialogue tree to a text format. Exports directly to the clipboard,
* because that was easier than having a dedicated output area tbh.
*/
function exportTree() {
	// Actually, right now it just logs the tree straight to the console.
	console.log(dialogueTree); // TODO
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
		
		setupOptButtons(read.opts);
	}
	read.parent = currentChild;
	currentChild.next = read;
	currentChild = read;
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
	
	if (!isOpts(read)) {
		setInterval(spacebar, 400);
	}
	setupOptButtons(read.opts);
	read.parent = currentChild;
	currentChild.opts[index].next = read;
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
