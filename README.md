This is a WIP [Alt1](https://runeapps.org/alt1) app for transcribing [RuneScape](https://rs.game) dialogue in the [format](https://rs.wiki/RS:Style_guide/Transcripts) used by the [RuneScape Wiki](https://rs.wiki).

# Installing

This app must be run through Alt1. It will refuse to work if it isn't. Alt1 can be downloaded [here](https://runeapps.org).

Once you have installed Alt1, you should navigate to [https://fendse.github.io/RSWikiTranscriber](https://fendse.github.io/RSWikiTranscriber) in the Alt1 browser. After doing do, you should see an "Add App" button in the upper right corner. Clicking that will make the app available.

Alternatively, you can install the app locally, by cloning or downloading this repository and using the Alt1 browser to navigate to the "index.html" file of your downloaded copy. Then, add the app as normal by pressing the "Add App" button in the upper right corner. Do *not* delete the downloaded files as long as you still want to keep using the app.

# Using RSWikiTranscriber

1. Launch RSWikiTranscriber from Alt1.
1. Enter your name in the text area that says Player Name, if you want your name to be automatically replaced with the word Player
1. Press Start
1. Talk to an NPC
1. When you're given a dialogue option, make sure you click the corresponding button on the RSWikiTranscriber window. You can do this before *or* after clicking the option.
    * Alternatively, you can hover your mouse over a dialogue option and press Alt+1. You'll have to do this *before* clicking the option.
1. At any time, press Export to print the current state of the dialogue tree.
1. If you need to go through a dialogue multiple times, pressing Stop then Start again will allow you to try to combine several paths through a conversation into a single tree.
1. Press Clear to completely clear the dialogue tree and start over.

The app only requires the "View screen" permission to function, but enabling the "Show overlay" permission lets the app show an overlay to which keeps track of which dialogue options you have selected in the past.
Currently, this overlay only lasts for up to about 20 seconds, due to limitations of the Alt1 overlay API.
