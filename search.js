import { kjv25 } from './kjv25FullText.js';


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

function getVerseLists(input) {
    let result = referenceMatcher(input);
    
    if (result.length === 0) {
        result = stringSearch(input);
        return { verses: result, isSearchMode: true }; // Search mode
    }

    return { verses: result, isSearchMode: false }; // Reference mode
}


function referenceMatcher(input) {
    const searchTerms = input.split(/\s*,\s*/); // Split input by commas and trim spaces

    // This prevents the bug. It was rooted in bad regexes which did "catastrophic backtracking"
    const terminator = searchTerms[0].split(" ");
    if (getBookNumberFromName(terminator[0]) == 100 && getBookNumberFromName(terminator[0] + " " + terminator[1]) == 100) {
        return [];
    }

    let rawVerseRanges = [];

    const fullBookRegex = /(\d*\s*\w+(?:\s+\w+)*)\s+(all)/;                                     // John all
    const fullChapterRegex = /(\d*\s*\w+(?:\s+\w+)*)\s+(\d+)(?:-(\d+))?/;                       // John 1, John 1-3
    const fullVerseRegexColon = /(\d*\s*\w+(?:\s+\w+)*)\s+(\d+):(\d+)(?:-(\d+):(\d+))?/;        // John 1:23-1:24, John 1:23-2:34
    const fullVerseRegexNoColon = /(\d*\s*\w+(?:\s+\w+)*)\s+(\d+):(\d+)(?:-(\d+))?/;            // John 1:23, John 1:23-24
    const partialVerseRegexColon = /(\d+):(\d+)(?:-(\d+))?:?(\d+)?/;                            // 1:29, 1:30-31, 1:31-1:32
    const partialVerseRegexVerseRange = /(\d+)(?:-(\d+))?/;                                     // 26, 26-27

    // Get unfiltered verse ranges from input
    searchTerms.forEach(term => {
        term = term.trim();
        let match = null;
        let parsedResult = {
            book: null,
            startChapter: null,
            endChapter: null,
            startVerse: null,
            endVerse: null
        };

        
        // Match full verse reference with chapter and verse range (e.g., John 1:23-1:24, John 1:23-2:34)
        if ((match = term.match(fullVerseRegexColon)) && match[4] && match[5]) {
            parsedResult.book = getBookNumberFromName(match[1].toLowerCase().replace(/\s/g, ''));
            parsedResult.startChapter = match[2];
            parsedResult.endChapter = match[4];
            parsedResult.startVerse = match[3];
            parsedResult.endVerse = match[5];

            rawVerseRanges.push(parsedResult);
        }
        // Match full verse reference without chapter change (e.g., John 1:23, John 1:23-24)
        else if ((match = term.match(fullVerseRegexNoColon))) {
            if (match[3] && match[4]) {
                parsedResult.book = getBookNumberFromName(match[1].toLowerCase().replace(/\s/g, ''));
                parsedResult.startChapter = match[2];
                parsedResult.endChapter = match[2];
                parsedResult.startVerse = match[3];
                parsedResult.endVerse = match[4];
            } else {
                parsedResult.book = getBookNumberFromName(match[1].toLowerCase().replace(/\s/g, ''));
                parsedResult.startChapter = match[2];
                parsedResult.endChapter = match[2];
                parsedResult.startVerse = match[3];
                parsedResult.endVerse = match[3]; // assume start and end are the same if there is no end
            }

            rawVerseRanges.push(parsedResult);
        }
        // Match full book reference (e.g. John all)
        else if ((match = term.match(fullBookRegex))) {
            let book = getBookNumberFromName(match[1].toLowerCase().replace(/\s/g, ''));
            let chapter = getChapterCount(book);
            parsedResult.book = book;
            parsedResult.startChapter = 1;
            parsedResult.endChapter = chapter;
            parsedResult.startVerse = 1;
            parsedResult.endVerse = getVerseCount(book, chapter);

            rawVerseRanges.push(parsedResult);
        }
        // Match full chapter reference (e.g., John 1, John 1-3)
        else if ((match = term.match(fullChapterRegex))) {
            if (match[3]) {
                let book = getBookNumberFromName(match[1].toLowerCase().replace(/\s/g, ''));
                parsedResult.book = book;
                parsedResult.startChapter = match[2];
                parsedResult.endChapter = match[3];
                parsedResult.startVerse = 1;
                parsedResult.endVerse = getVerseCount(book, match[3]);
            } else {
                let book = getBookNumberFromName(match[1].toLowerCase().replace(/\s/g, ''));
                parsedResult.book = book;
                parsedResult.startChapter = match[2];
                parsedResult.endChapter = match[2]; // assume start and end are the same if there is no end
                parsedResult.startVerse = 1;
                parsedResult.endVerse = getVerseCount(book, match[2]);
            }
            rawVerseRanges.push(parsedResult);
        }
        // Match partial verse reference with chapter (e.g., 1:29, 1:30-31, 1:31-1:32)
        else if ((match = term.match(partialVerseRegexColon))) {
            if (match[4]) {
                parsedResult.startChapter = match[1];
                parsedResult.endChapter = match[3];
                parsedResult.startVerse = match[2];
                parsedResult.endVerse = match[4];
            } else if (match[3]) {
                parsedResult.startChapter = match[1];
                parsedResult.endChapter = match[1];
                parsedResult.startVerse = match[2];
                parsedResult.endVerse = match[3];
            } else {
                parsedResult.startChapter = match[1];
                parsedResult.endChapter = match[1];
                parsedResult.startVerse = match[2];
                parsedResult.endVerse = match[2]; // assume start and end are the same if there is no end
            }
            rawVerseRanges.push(parsedResult);
        }
        // Match verse-only range (e.g., 26, 26-27)
        else if ((match = term.match(partialVerseRegexVerseRange))) {
            if (match[2]) {
                parsedResult.startVerse = match[1];
                parsedResult.endVerse = match[2];
            } else {
                parsedResult.startVerse = match[1];
                parsedResult.endVerse = match[1]; // assume start and end are the same if there is no end
            }
            rawVerseRanges.push(parsedResult);
        }


    });

    if (rawVerseRanges.length > 0) {
        // Inheritance of book and chapter for refs without that info
        let lastBook = null;
        let lastChapter = null;
        rawVerseRanges.forEach(entry => {
            if (entry.book === null && lastBook !== null) {
                entry.book = lastBook; // Update missing book
            } else {
                lastBook = entry.book; // Store last valid book
            }
        
            if (entry.endChapter === null && lastChapter !== null) {
                entry.endChapter = lastChapter; // Update missing chapter
                entry.startChapter = lastChapter;
            } else {
                lastChapter = entry.endChapter; // Store last valid chapter
            }
        });

        // Remove any results whose books didn't exist
        let filteredVerseRanges = rawVerseRanges.filter(entry => {
            return entry.book != "100" && entry.endVerse != "0" && entry.endChapter != "0";
        });

        // Create (book, chapter, verse) lists while ensuring verses exist
        let verseList = filteredVerseRanges.map(range => {
            let { book, startChapter, endChapter, startVerse, endVerse } = range;
            book = parseInt(book, 10);
            startChapter = parseInt(startChapter, 10);
            endChapter = parseInt(endChapter, 10);
            startVerse = parseInt(startVerse, 10);
            endVerse = parseInt(endVerse, 10);

            let verses = [];

            for (let chapter = startChapter; chapter <= endChapter; chapter++) {
                let maxVerseCount = getVerseCount(book, chapter); // Ensure chapter exists
                if (maxVerseCount === 0) continue; // Skip non-existent chapters

                let firstVerse = (chapter === startChapter) ? startVerse : 1;
                let lastVerse = (chapter === endChapter) ? endVerse : maxVerseCount;

                // Ensure endVerse does not exceed actual verse count
                lastVerse = Math.min(lastVerse, maxVerseCount);

                for (let verse = firstVerse; verse <= lastVerse; verse++) {
                    verses.push({ book, chapter, verse });
                }
            }

            return verses;  // A list of lists of verse entries. List[search term[verse entry, ...], search term[...], ...]
        });

        // Strip empty lists, each represent an empty comma-separated query term
        verseList = verseList.filter(verses => verses.length > 0);

        return verseList;
    } else {
        return [];
    }
}

function stringSearch(input) {
    let verseList = [];
    let results = [];

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

    verseList.push(results);
    return verseList;
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

function renderResults(verseData, inputText) {
    const outputDiv = document.getElementById("output");
    outputDiv.innerHTML = ""; // Clear previous results

    const { verses: verseList, isSearchMode } = verseData; // Extract verse list and mode

    // Count total number of verses
    let totalResults = verseList.reduce((sum, verses) => sum + verses.length, 0);

    // Show search heading based on mode
    let searchHeading = document.createElement("p");
    searchHeading.classList.add("gen", "ps-1", "pb-4");

    if (isSearchMode) {
        searchHeading.textContent = totalResults > 0 
            ? `${totalResults} results for "${inputText}"` 
            : `No results for "${inputText}"`;
    } else {
        searchHeading.textContent = `You searched for "${inputText}"`;
    }

    outputDiv.appendChild(searchHeading);

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
        Object.entries(groupedByChapter).forEach(([chapterRef, verses], chapterIndex) => {
            let lastSpaceIndex = chapterRef.lastIndexOf(" ");
            let bookName = chapterRef.substring(0, lastSpaceIndex);
            let chapter = parseInt(chapterRef.substring(lastSpaceIndex + 1), 10);

            // Sort verses numerically to ensure correct order
            verses.sort((a, b) => a.verse - b.verse);

            let verseNumbers = [];
            let tempGroup = [];
            let prevVerse = null;

            // Get total verse count in the chapter to check for full chapter selection
            const bookNum = getBookNumberFromName(bookName);
            const totalVerses = getVerseCount(bookNum, chapter);
            const allVerses = verses.length === totalVerses;

            verses.forEach(({ verse }) => {
                if (prevVerse !== null && verse !== prevVerse + 1) {
                    // If a gap exists, push the previous group and start a new one
                    verseNumbers.push(tempGroup.length > 1 ? `${tempGroup[0]}-${tempGroup[tempGroup.length - 1]}` : tempGroup[0]);
                    tempGroup = [];
                }
                tempGroup.push(verse);
                prevVerse = verse;
            });

            // Push the last group
            if (tempGroup.length > 0) {
                verseNumbers.push(tempGroup.length > 1 ? `${tempGroup[0]}-${tempGroup[tempGroup.length - 1]}` : tempGroup[0]);
            }

            // Generate heading - Only show verse numbers if NOT a full chapter
            let headingText = allVerses
                ? `${bookName} ${chapter}`  // Full chapter case, no verse numbers
                : `${bookName} ${chapter}:${verseNumbers.join(", ")}`;

            // Create a single paragraph for the passage
            let passageContainer = document.createElement("div");

            let passageText = document.createElement("p");
            passageText.classList.add("mb-1"); // Reduce space between verse and copy button

            // Add the heading
            let heading = document.createElement("span");
            heading.classList.add("passage-heading");
            heading.textContent = headingText;

            passageText.appendChild(heading);
            passageText.appendChild(document.createElement("br")); // Line break after heading

            // Add verses
            verses.forEach(({ verse, text }, index) => {
                let verseNumber = document.createElement("span");
                verseNumber.classList.add("verse-number");
                verseNumber.textContent = `${verse} `;

                let verseText = document.createElement("span");
                verseText.classList.add("verse-text");
                verseText.textContent = text;

                passageText.appendChild(verseNumber);
                passageText.appendChild(verseText);

                // **Remove the last `<br>`** to reduce space before the copy button
                if (index < verses.length - 1) {
                    passageText.appendChild(document.createElement("br"));
                }
            });

            passageContainer.appendChild(passageText);

            // ** Add Copy Button (aligned to bottom right) **
            let copyButtonContainer = document.createElement("div");
            copyButtonContainer.classList.add("d-flex", "justify-content-end", "mt-2"); // Reduce space before copy button

            let copyButton = document.createElement("button");
            copyButton.classList.add("btn", "btn-light", "btn-sm", "copy-button", "d-flex", "align-items-center");

            copyButton.innerHTML = `
                <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" fill="currentColor" class="bi bi-clipboard" viewBox="0 0 16 16">
                    <path d="M4 1.5H3a2 2 0 0 0-2 2V14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V3.5a2 2 0 0 0-2-2h-1v1h1a1 1 0 0 1 1 1V14a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V3.5a1 1 0 0 1 1-1h1z"/>
                    <path d="M9.5 1a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-3a.5.5 0 0 1-.5-.5v-1a.5.5 0 0 1 .5-.5zm-3-1A1.5 1.5 0 0 0 5 1.5v1A1.5 1.5 0 0 0 6.5 4h3A1.5 1.5 0 0 0 11 2.5v-1A1.5 1.5 0 0 0 9.5 0z"/>
                </svg>
                &nbsp;&nbsp;Copy
            `;

            // ** Copy Functionality **
            copyButton.addEventListener("click", () => {
                let textToCopy = `${headingText}\n\n` + verses.map(v => `${v.verse} ${v.text}`).join("\n");
                navigator.clipboard.writeText(textToCopy).then(() => {
                    copyButton.textContent = "Copied!";
                    setTimeout(() => copyButton.innerHTML = `
                        <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" fill="currentColor" class="bi bi-clipboard" viewBox="0 0 16 16">
                            <path d="M4 1.5H3a2 2 0 0 0-2 2V14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V3.5a2 2 0 0 0-2-2h-1v1h1a1 1 0 0 1 1 1V14a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V3.5a1 1 0 0 1 1-1h1z"/>
                            <path d="M9.5 1a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-3a.5.5 0 0 1-.5-.5v-1a.5.5 0 0 1 .5-.5zm-3-1A1.5 1.5 0 0 0 5 1.5v1A1.5 1.5 0 0 0 6.5 4h3A1.5 1.5 0 0 0 11 2.5v-1A1.5 1.5 0 0 0 9.5 0z"/>
                        </svg>
                        &nbsp;&nbsp;Copy
                    `, 1500);
                });
            });

            // Append copy button
            copyButtonContainer.appendChild(copyButton);
            passageContainer.appendChild(copyButtonContainer);
            outputDiv.appendChild(passageContainer);

            // ** Add `<hr>` except for the last passage **
            if (queryIndex < verseList.length - 1 || chapterIndex < Object.entries(groupedByChapter).length - 1) {
                let hr = document.createElement("hr");
                outputDiv.appendChild(hr);
            }
        });
    });
}




// Event Listener for Button Click
document.getElementById("searchForm").addEventListener("submit", function(event) {
    event.preventDefault(); // Prevent page reload

    const userInput = document.getElementById("textInput").value.trim();
    if (!userInput) return; // Prevent empty searches

    let processedResults = getVerseLists(userInput);
    renderResults(processedResults, userInput); // Render results properly

    document.getElementById("textInput").value = ""; // Clear the search bar after search
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
