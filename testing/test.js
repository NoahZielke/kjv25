import { kjv25 } from '../kjv25FullText.js';


function getVerseCount(book, chapter) {
    if (book == 100) {
        return 0;
    } else if (kjv25[book] && kjv25[book][chapter]) {
        return kjv25[book][chapter].length;
    } else {
        return 0;
    }
}

function getChapterCount(book) {
    if (book == 100) {
        return 0;
    } else if (kjv25[book]) {
        return Object.keys(kjv25[book]).length;
    } else {
        return 0;
    }
}


function processInput(input) {
    const results = [];

    // Function to remove non-letter characters while preserving spaces
    function cleanText(text) {
        return text.replace(/[^a-zA-Z\s]/g, "").toLowerCase().trim();
    }

    // Check if input is surrounded by quotes for exact match mode
    const exactMatch = input.startsWith('"') && input.endsWith('"');
    let cleanedInput = cleanText(input);

    // If exact match mode, remove surrounding quotes
    if (exactMatch) {
        cleanedInput = cleanText(input.slice(1, -1)); // Remove quotes
    }

    // Clean and split the query into words for regex search
    const queryWords = cleanedInput.split(/\s+/).filter(word => word.length > 0);

    // Construct regex pattern: enforce word order, allow gaps
    const regexPattern = queryWords.map(word => `\\b${word}\\b`).join(".*?");
    const regex = new RegExp(regexPattern, "i"); // Case-insensitive regex

    for (const book in kjv25) {
        for (const chapter in kjv25[book]) {
            kjv25[book][chapter].forEach((verse, index) => {
                const cleanedVerse = cleanText(verse);

                // **Exact match mode**
                if (exactMatch) {
                    if (cleanedVerse.includes(cleanedInput)) {
                        results.push({
                            book: parseInt(book),
                            chapter: parseInt(chapter),
                            verse: index + 1, // Verses are 1-based
                        });
                    }
                } 
                // **Regex loose search (ordered words with gaps)**
                else {
                    if (regex.test(cleanedVerse)) {
                        results.push({
                            book: parseInt(book),
                            chapter: parseInt(chapter),
                            verse: index + 1, // Verses are 1-based
                        });
                    }
                }
            });
        }
    }

    console.log(results);
    return JSON.stringify([results], null, 2); // Return formatted JSON output for display
}


function getBookNameFromNumber(bookNum) {
    const bookNames = {
        1: "Genesis", 2: "Exodus", 3: "Leviticus", 4: "Numbers", 5: "Deuteronomy",
        6: "Joshua", 7: "Judges", 8: "Ruth", 9: "1 Samuel", 10: "2 Samuel",
        11: "1 Kings", 12: "2 Kings", 13: "1 Chronicles", 14: "2 Chronicles",
        15: "Ezra", 16: "Nehemiah", 17: "Esther", 18: "Job", 19: "Psalms",
        20: "Proverbs", 21: "Ecclesiastes", 22: "Song of Solomon", 23: "Isaiah",
        24: "Jeremiah", 25: "Lamentations", 26: "Ezekiel", 27: "Daniel", 28: "Hosea",
        29: "Joel", 30: "Amos", 31: "Obadiah", 32: "Jonah", 33: "Micah", 34: "Nahum",
        35: "Habakkuk", 36: "Zephaniah", 37: "Haggai", 38: "Zechariah", 39: "Malachi",
        40: "Matthew", 41: "Mark", 42: "Luke", 43: "John", 44: "Acts", 45: "Romans",
        46: "1 Corinthians", 47: "2 Corinthians", 48: "Galatians", 49: "Ephesians",
        50: "Philippians", 51: "Colossians", 52: "1 Thessalonians", 53: "2 Thessalonians",
        54: "1 Timothy", 55: "2 Timothy", 56: "Titus", 57: "Philemon", 58: "Hebrews",
        59: "James", 60: "1 Peter", 61: "2 Peter", 62: "1 John", 63: "2 John",
        64: "3 John", 65: "Jude", 66: "Revelation"
    };
    return bookNames[bookNum] || `[Unknown Book ${bookNum}]`;
}

function renderResults(verseList, inputText) {
    const outputDiv = document.getElementById("output");
    outputDiv.innerHTML = ""; // Clear previous results

    // Show the search query at the top
    let searchHeading = document.createElement("h3");
    searchHeading.textContent = `You searched for "${inputText}"`;
    outputDiv.appendChild(searchHeading);
    outputDiv.appendChild(document.createElement("hr"));

    // Organize results by search query
    verseList.forEach((verses, queryIndex) => {
        if (verses.length === 0) return;

        let groupedByChapter = {};

        // Group verses inside the search query by chapter
        verses.forEach(({ book, chapter, verse }) => {
            let bookName = getBookNameFromNumber(book);
            let key = `${bookName} ${chapter}`;

            if (!groupedByChapter[key]) {
                groupedByChapter[key] = [];
            }

            groupedByChapter[key].push({ verse, text: kjv25[book]?.[chapter]?.[verse - 1] || "[Verse Not Found]" });
        });

        // Print separate chapter headers for this search term
        Object.entries(groupedByChapter).forEach(([chapterRef, verses]) => {
            let startVerse = verses[0].verse;
            let endVerse = verses[verses.length - 1].verse;

            let lastSpaceIndex = chapterRef.lastIndexOf(" ");
            let bookName = chapterRef.substring(0, lastSpaceIndex);
            let chapter = parseInt(chapterRef.substring(lastSpaceIndex + 1), 10);
            let totalVersesInChapter = getVerseCount(getBookNumberFromName(bookName), chapter);

            let headingText =
                startVerse === 1 && endVerse === totalVersesInChapter
                    ? `${bookName} ${chapter}` // Full chapter case
                    : `${bookName} ${chapter}:${startVerse}${startVerse !== endVerse ? `-${endVerse}` : ""}`; // Partial chapter case

            let heading = document.createElement("h2");
            heading.textContent = headingText;
            outputDiv.appendChild(heading);

            verses.forEach(({ verse, text }) => {
                let verseElement = document.createElement("p");
                verseElement.innerHTML = `<strong>${verse}</strong> ${text}`;
                outputDiv.appendChild(verseElement);
            });

            outputDiv.appendChild(document.createElement("br")); // Add spacing between sections
        });

        // Add separation between search terms
        if (queryIndex < verseList.length - 1) {
            outputDiv.appendChild(document.createElement("hr"));
        }
    });
}

// Event Listener for Button Click
document.getElementById("myButton").addEventListener("click", function() {
    const userInput = document.getElementById("textInput").value;
    let processedResults = JSON.parse(processInput(userInput)); // Get structured (book, chapter, verse) data
    renderResults(processedResults, userInput); // Render results properly
});

function getBookNumberFromName(bookRaw) {
    let book = bookRaw.toLowerCase().replace(/\s/g, '');
    
    if (book === "genesis" || book === "gen") {
        return 1;
    } else if (book === "exodus" || book === "ex") {
        return 2;
    } else if (book === "leviticus" || book === "lev") {
        return 3;
    } else if (book === "numbers" || book === "num") {
        return 4;
    } else if (book === "deuteronomy" || book === "deu" || book === "deut") {
        return 5;
    } else if (book === "joshua" || book === "josh") {
        return 6;
    } else if (book === "judges" || book === "judg") {
        return 7;
    } else if (book === "ruth") {
        return 8;
    } else if (book === "1samuel" || book === "1sam") {
        return 9;
    } else if (book === "2samuel" || book === "2sam") {
        return 10;
    } else if (book === "1kings" || book === "1ki") {
        return 11;
    } else if (book === "2kings" || book === "2ki") {
        return 12;
    } else if (book === "1chronicles" || book === "1chro" || book === "1chron") {
        return 13;
    } else if (book === "2chronicles" || book === "2chro" || book === "2chron") {
        return 14;
    } else if (book === "ezra") {
        return 15;
    } else if (book === "nehemia" || book === "neh") {
        return 16;
    } else if (book === "esther" || book === "esth") {
        return 17;
    } else if (book === "job") {
        return 18;
    } else if (book === "psalms" || book === "psalm" || book === "ps") {
        return 19;
    } else if (book === "proverbs" || book === "proverb" || book === "prov") {
        return 20;
    } else if (book === "ecclesiastes" || book === "ecc" || book === "eccl") {
        return 21;
    } else if (book === "songofsolomon" || book === "song") {
        return 22;
    } else if (book === "isaiah" || book === "isa" || book === "is") {
        return 23;
    } else if (book === "jeremiah" || book === "jer") {
        return 24;
    } else if (book === "lamentations" || book === "lam") {
        return 25;
    } else if (book === "ezekiel" || book === "ezek") {
        return 26;
    } else if (book === "daniel" || book === "dan") {
        return 27;
    } else if (book === "hosea" || book === "hos") {
        return 28;
    } else if (book === "joel") {
        return 29;
    } else if (book === "amos") {
        return 30;
    } else if (book === "obadiah" || book === "obad") {
        return 31;
    } else if (book === "jonah") {
        return 32;
    } else if (book === "micah" || book === "mic") {
        return 33;
    } else if (book === "nahum" || book === "nah") {
        return 34;
    } else if (book === "habakkuk" || book === "habak" || book === "hab") {
        return 35;
    } else if (book === "zephaniah" || book === "zeph" || book === "zep") {
        return 36;
    } else if (book === "haggai" || book === "hag") {
        return 37;
    } else if (book === "zechariah" || book === "zech") {
        return 38;
    } else if (book === "malachi" || book === "mal") {
        return 39;
    } else if (book === "matthew" || book === "matt" || book === "mat") {
        return 40;
    } else if (book === "mark") {
        return 41;
    } else if (book === "luke" || book === "luk") {
        return 42;
    } else if (book === "john") {
        return 43;
    } else if (book === "acts" || book === "act") {
        return 44;
    } else if (book === "romans" || book === "rom") {
        return 45;
    } else if (book === "1corinthians" || book === "1cor") {
        return 46;
    } else if (book === "2corinthians" || book === "2cor") {
        return 47;
    } else if (book === "galatians" || book === "gal") {
        return 48;
    } else if (book === "ephesians" || book === "eph") {
        return 49;
    } else if (book === "philippians" || book === "philip" || book === "phil") {
        return 50;
    } else if (book === "colossians" || book === "col") {
        return 51;
    } else if (book === "1thessalonians" || book === "1thess") {
        return 52;
    } else if (book === "2thessalonians" || book === "2thess") {
        return 53;
    } else if (book === "1timothy" || book === "1tim") {
        return 54;
    } else if (book === "2timothy" || book === "2tim") {
        return 55;
    } else if (book === "titus") {
        return 56;
    } else if (book === "philemon" || book === "philem") {
        return 57;
    } else if (book === "hebrews" || book === "heb") {
        return 58;
    } else if (book === "james" || book === "jas") {
        return 59;
    } else if (book === "1peter" || book === "1pet") {
        return 60;
    } else if (book === "2peter" || book === "2pet") {
        return 61;
    } else if (book === "1john") {
        return 62;
    } else if (book === "2john") {
        return 63;
    } else if (book === "3john") {
        return 64;
    } else if (book === "jude") {
        return 65;
    } else if (book === "revelation" || book === "rev") {
        return 66;
    } else {
        return 100; // Exception case
    }    
}

// search mode not working -> something to do with punctuation in the input and in the text being searched?
