// content.js
var lastJobNo = undefined;
var all_job_names = [];


// this should only be run once upon document load
function main() {
    // Check if the current site's base URL is localhost:8080
    if (
        window.location.href.includes('localhost:8080') || 
        window.location.href.includes('jenkins.canonical.com') 
    ) {
        console.log("--- CPC Jenkins Tweaks Extension ---")
        cleanupExisting();
        modifyBanner();
        getAllJobsFromLocalStorage();
        createReleaseFilters();
        doAlternateReleaseStuff();
        // Find the #main-panel div
        const mainPanel = document.querySelector('#main-panel');
        if (mainPanel) {
            console.log('injecting buttons!');
            injectButtons();
        } 
        createQuickSearch();
        // Add event listener to intercept keydown events
        document.addEventListener('keydown', handleKeyDown);
    } else {
        // console.log('Extension is not active on this page.');
    }
}

function fuzzySearch(query, list) {
    query = query.toLowerCase().replace(/\s/g, ''); // Remove spaces from the query
    return list.filter(item => {
        item = item.toLowerCase().replace(/\s/g, ''); // Remove spaces from the item
        let j = 0; // Pointer for query
        for (let i = 0; i < item.length; i++) {
            if (item[i] === query[j]) {
                j++;
            }
            if (j === query.length) {
                break; // Found all characters of query in item
            }
        }
        return j === query.length;
    });
}

function fuzzyFuzzySearch(query, list) {
    // Split query by hyphens or underscores and remove spaces
    const queryWords = query.toLowerCase().split(/[\s-_]/).filter(word => word !== '');

    return list.filter(item => {
        // Split item by hyphens or underscores and remove spaces
        const itemWords = item.toLowerCase().split(/[\s-_]/).filter(word => word !== '');

        // Check if each word in query matches at least one word in item
        return queryWords.every(queryWord => {
            // Check if any word in item matches the query word fuzzily
            return itemWords.some(itemWord => {
                let j = 0; // Pointer for query word
                for (let i = 0; i < itemWord.length; i++) {
                    if (itemWord[i] === queryWord[j]) {
                        j++;
                    }
                }
                return j === queryWord.length;
            });
        });
    });
}


function handleKeyDown(event) {
    // Check if Ctrl+K is pressed
    if (event.ctrlKey && event.key === 'k') {
        event.preventDefault(); // Prevent the default behavior
        // use our custom quick search
        const quickSearchDiv = document.querySelector('#quick-search');
        const tint = document.querySelector('#tint');
        if (quickSearchDiv.style.display === "flex") {
            quickSearchDiv.style.display = "none";
            tint.style.display = "none";
            quickSearchDiv.querySelector('#quick-search-input').value = "";
            return;
        }
        quickSearchDiv.style.display = "flex";
        tint.style.display = "block";
        const quickSearchInput = document.querySelector('#quick-search-input');
        // quickSearchInput.style.display = "flex";
        quickSearchInput.focus();
        console.log("ctrl+k pressed");
    }
}


function createQuickSearch() {
    // there is another element on the page that consumes the ctrl+k shortcut
    // so we need to add a new input element to the page that will consume the ctrl+k shortcut
    // and prevent the other element from consuming it
    const quickSearchDiv = document.createElement('div');
    quickSearchDiv.id = "quick-search";
    // start with the input hidden
    quickSearchDiv.style.display = "none";
    quickSearchDiv.style.position = "fixed";
    quickSearchDiv.style.width = "50%";
    // quickSearchDiv.style.margin = "0 auto";
    // quickSearchDiv.style.height = "50px";
    // quickSearchDiv.style.backgroundColor = "#fff";
    // quickSearchDiv.style.borderBottom = "1px solid #ccc";
    quickSearchDiv.style.zIndex = "1000";
    quickSearchDiv.style.alignItems = "center";
    quickSearchDiv.style.padding = "20px 50px";
    // center in middle of screen
    quickSearchDiv.style.left = "50%";
    quickSearchDiv.style.top = "45%";
    quickSearchDiv.style.transform = "translateX(-50%)";
    // quickSearchDiv.style.boxShadow = "0px 2px 2px 0px rgba(0,0,0,0.2)";
    // quickSearchDiv.style.borderRadius = "15px";
    quickSearchDiv.style.textAlign = "center";
    // quickSearchDiv.style.display = "flex";
    quickSearchDiv.style.flexDirection = "column"; // Set flex direction to column

    // add slight tint to the entire screen to make the quick search more visible
    const tint = document.createElement('div');
    tint.id = "tint";
    tint.style.position = "fixed";
    tint.style.width = "100%";
    tint.style.height = "100%";
    tint.style.backgroundColor = "rgba(0, 0, 0, 0.5)";
    tint.style.zIndex = "999";
    tint.style.top = "0";
    tint.style.left = "0";
    document.body.appendChild(tint);

    // start tint hidden
    tint.style.display = "none";

    const header = document.createElement('h2');
    header.textContent = "Quick Search For Job";
    header.style.margin = "0";
    header.style.fontSize = "20px";
    header.style.fontWeight = "normal";
    header.style.color = "#eee";
    quickSearchDiv.appendChild(header);
    const quickSearchInput = document.createElement('input');
    quickSearchInput.id = "quick-search-input";
    quickSearchInput.style.width = "100%";
    quickSearchInput.style.height = "30px";
    quickSearchInput.style.border = "1px solid #ccc";
    quickSearchInput.style.borderRadius = "5px";
    quickSearchInput.style.padding = "5px";
    quickSearchInput.style.fontSize = "16px";
    quickSearchInput.style.margin = "20px 0";
    quickSearchInput.type = "text";
    // prevent default ctrl+k behavior
    quickSearchDiv.appendChild(quickSearchInput);
    
    const resultsDiv = document.createElement('div');
    resultsDiv.id = "quick-search-results";
    resultsDiv.style.width = "100%";
    resultsDiv.style.height = "auto";
    resultsDiv.textAlign = "left";
    quickSearchDiv.appendChild(resultsDiv);

    // quickSearchInput.addEventListener('keydown', (event) => {
    //     if (event.ctrlKey && event.key === '') {
    //         event.preventDefault();
    //         quickSearchInput.style.display = "flex";
    //         quickSearchInput.focus();
    //         console.log("ctrl+k pressed");
    //     }
    // });

    // delete the search form if it exists
    const searchForm = document.querySelector('#searchform');
    if (searchForm) {
       searchForm.style.display = "none";
    }
    
    document.body.appendChild(quickSearchDiv);

    quickSearchInput.addEventListener('input', (event) => {
        const query = event.target.value;
        const matches = fuzzySearch(query, all_job_names);
        console.log(matches);
        // for each match create a new simple <a> element and append to the resultsDiv
        resultsDiv.innerHTML = "";
        matches.forEach((match) => {
            const matchElement = document.createElement('a');
            matchElement.textContent = match;
            matchElement.href = getJobUrlFromName(match);
            matchElement.style.display = "block";
            matchElement.style.padding = "4px";
            matchElement.style.color = "#eee";
            matchElement.style.textShadow = "0px 2px 2px rgba(0,0,0,0.1)";
            matchElement.style.cursor = "pointer";
            // remove all normal "a" styles
            matchElement.style.textDecoration = "none";
            // make underlined when hovered
            matchElement.addEventListener('mouseover', () => {
                matchElement.style.textDecoration = "underline";
            });
            matchElement.addEventListener('mouseout', () => {
                matchElement.style.textDecoration = "none";
            });
            resultsDiv.appendChild(matchElement);
        });
    });

    // // hide search input when user clicks outside of it
    // document.addEventListener('click', (event) => {
    //     if (event.target !== quickSearchInput) {
    //         quickSearchInput.style.display = "none";
    //     }
    // });

}

function getAllJobsFromLocalStorage() {
    // first check if localStorage has the list of all jenkins jobs
    // if not, fetch the list of all jenkins jobs and store in localStorage
    var all_jobs_cache;
    if (window.location.href.includes('localhost:8080')) {
        all_jobs_cache = localStorage.getItem('localhost_all_jenkins_jobs');
    }
    else if (window.location.href.includes('stable-cloud-images-ps5.jenkins.canonical.com')) {
        all_jobs_cache = localStorage.getItem('scij_all_jenkins_jobs');
    }
    else {
        console.log("Not on a jenkins page. Not fetching all jenkins jobs.");
        return;
    }
    if (!all_jobs_cache) {
        console.log("No cached list of all jenkins jobs found. Fetching now.")
        fetchAllJenkinsJobs();
    }
    else {
        console.log("Cached list of all jenkins jobs found.")
        all_jobs_json = JSON.parse(all_jobs_cache);
        // check if the cache is older than 1 day
        const cache_date = new Date(all_jobs_json.date_fetched);
        const now = new Date();
        const diff = now - cache_date;
        const diff_in_hours = diff / (1000 * 60 * 60);
        if (diff_in_hours > 24) {
            console.log("Cached list of all jenkins jobs is older than 24 hours. Fetching now.")
            fetchAllJenkinsJobs();
        }
        else {
            console.log("Cached list of all jenkins jobs is less than 24 hours old.")
            all_job_names = all_jobs_json.jobs;
            if (!all_job_names.includes(getJobNameFromUrl(window.location.href))) {
                console.log("Current job not found in cached list of all jenkins jobs. Fetching now.")
                fetchAllJenkinsJobs();
            }
            console.log("All jenkins jobs found:", all_job_names);
        }
    }
}


function getBaseUrl() {
    /*
    Get the base URL of the current page. (Without trailing slash)

    Returns:
    - string: The base URL of the current page.
    */
    const url = window.location.href;
    if (url.includes('localhost:8080')) {
        return 'http://localhost:8080';
    }
    if (url.includes('stable-cloud-images-ps5.jenkins.canonical.com')) {
        return 'https://stable-cloud-images-ps5.jenkins.canonical.com';
    }
}


function fetchAllJenkinsJobs() {
    // fetch https://stable-cloud-images-ps5.jenkins.canonical.com/view/all/
    // parse as a document and then query all "#main-panel ol li a" elements
    // and then save the text of each element to a list
    const url = getBaseUrl() + "/view/all/";
    console.log("Fetching all jenkins jobs from:", url);
    query_string = ".jenkins-table__link.model-link.inside"
    fetch(url)
        .then(response => response.text())
        .then(text => {
            const parser = new DOMParser();
            const doc = parser.parseFromString(text, 'text/html');
            const elements = doc.querySelectorAll(query_string);
            all_job_names = [];
            elements.forEach((element) => {
                // make sure the text does not start with "#"
                if (element.innerText.splice(0, 1) !== "#") {
                    all_job_names.push(element.innerText);
                }
            });
            const job_storage_dict = {
                "jobs": all_job_names,
                "date_fetched": new Date().toISOString(),
            }
            console.log(all_job_names);
            // then store these values in firefox local storage so that we can use them later
            if (window.location.href.includes('stable-cloud-images-ps5.jenkins.canonical.com')) {
                localStorage.setItem('scij_all_jenkins_jobs', JSON.stringify(job_storage_dict));
                console.log("Stored all jenkins jobs in localStorage @ scij_all_jenkins_jobs.")
            }
            if (window.location.href.includes('localhost:8080')) {
                localStorage.setItem('localhost_all_jenkins_jobs', JSON.stringify(job_storage_dict));
                console.log("Stored all jenkins jobs in localStorage @ localhost_all_jenkins_jobs.")
            }
            doAlternateReleaseStuff();
        })
        .catch(error => console.error('Error:', error));
}


function cleanupExisting() {
    const filterDiv = document.querySelector('#release-filters')
    if (filterDiv) {
        filterDiv.remove()
    }
    const buttonDiv = document.querySelector('#alternate-release-buttons')
    if (buttonDiv) {
        buttonDiv.remove()
    }
    const customBranding = document.querySelector('.custom-branding')
    if (customBranding) {
        customBranding.remove()
    }
}

function modifyBanner() {
    const target_div = document.querySelector("#page-header .logo");
    const custom_branding = document.createElement("div");
    custom_branding.classList.add("custom-branding");
    const custom_branding_text = document.createElement("h1");
    custom_branding_text.textContent = "CPC Jenkins Tweaks Active";
    custom_branding_text.style.color = "#aaa";
    custom_branding_text.style.fontSize = "15px";
    custom_branding_text.style.fontWeight = "normal";
    custom_branding_text.style.margin = "0";
    custom_branding.style.width = "50%";
    custom_branding.style.marginLeft = "20px";
    custom_branding_text.style.top = "50%";
    custom_branding_text.style.transform = "translateY(-50%)";
    custom_branding_text.style.position = "absolute";
    custom_branding.style.position = "relative";
    custom_branding.appendChild(custom_branding_text);
    target_div.appendChild(custom_branding);
}

function addAlternateReleaseShortcuts(urls) {
    // delete existing buttons if they exist
    const existingButtons = document.querySelectorAll('.alternate-release-button')
    existingButtons.forEach((button) => {
        button.remove()
    })
    const buttonDiv = document.createElement('div')
    buttonDiv.id = "alternate-release-buttons"
    // buttonDiv.style.padding = "20px 10px 20px 10px"
    buttonDiv.style.width = "100%"
    buttonDiv.style.boxSizing = "border-box"
    // parent element is display: flex
    // so make the buttonDiv start on a new row 
    buttonDiv.style.flexBasis = "100%"
    urls.forEach((url) => {
        const button = document.createElement('a')
        button.classList.add('alternate-release-button')
        button.textContent = getReleaseFromUrl(url)
        // add <a href=url> to each button
        button.href = url
        button.display = "block"
        button.style.backgroundColor = "#fff"
        button.style.borderRadius = "5px"
        // button.style.border = "2px solid #e9e9ed"
        button.style.padding = "5px 10px"
        button.style.margin = "0 5px"
        // add soft shadow to button
        button.style.boxShadow = "0px 2px 2px 0px rgba(0,0,0,0.2)"
        // if the url is the current url, disable the button and grey it out
        if (url === window.location.href) {
            button.style.pointerEvents = "none"
            button.style.color = "#aaa"
        }
        buttonDiv.appendChild(button)
    });    
    const breadcrumbBar = document.querySelector('#breadcrumbBar')
    // insert after breadcrumbBar
    // breadcrumbBar.parentNode.insertBefore(buttonDiv, breadcrumbBar.nextSibling)
    breadcrumbBar.appendChild(buttonDiv);
}

function getReleaseFromUrl(url) {
    // check if "/job/" is in url
    if (!url.includes("/job/")) {
        return
    }
    const release = url.split("/job/")[1].split("-")[0]
    return release
}

function createUrlFromRelease(current_url, new_release) {
    // replace the release number in the url with the new release number
    const current_release = getReleaseFromUrl(current_url)
    const new_url = current_url.replace(current_release, new_release)
    return new_url
}

function getJobNameFromUrl(url) {
    // check if "/job/" is in url
    if (!url.includes("/job/")) {
        return
    }
    const job_name = url.split("/job/")[1].split("/")[0];
    return job_name;
}

function getJobUrlFromName(job_name) {
    const base_url = getBaseUrl();
    const job_url = base_url + "/job/" + job_name + "/";
    return job_url;
}

function doAlternateReleaseStuff() {
    if (all_job_names.length > 0) {
        console.log("doing alternate release stuff now.")
        // use regex to check if document title starts with release number like "22.04"
        const release = getReleaseFromUrl(window.location.href)
        if (release) {
            console.log("job page found. doing alternate release stuff now.")
            const valid_urls = getValidAlternativeReleaseUrls(window.location.href, release)
            console.log("valid_urls:", valid_urls)
            addAlternateReleaseShortcuts(valid_urls)
        }
    }
}

function jobExists(job_name) {
    console.log("checking if job exists:", job_name)
    return all_job_names.includes(job_name)
}

function getValidAlternativeReleaseUrls(original_url, original_release) {
    const possible_releases = ["16.04", "18.04", "20.04", "22.04", "23.10", "24.04"]
    var valid_urls = [];
    const job_name = getJobNameFromUrl(original_url);
    possible_releases.forEach((release) => {
        if (jobExists(job_name.replace(original_release, release))) {
            valid_urls.push(createUrlFromRelease(original_url, release))
        }
    });
    return valid_urls
    
    // // remove original release from possible_releases
    // possible_releases.splice(possible_releases.indexOf(original_release), 1)
    // console.log(original_url, original_release)
    // const possible_urls = []
    // possible_releases.forEach((release) => {
    //     possible_urls.push(original_url.replace(original_release, release))
    // })
    // // let valid_urls = []
    // try {
    //     const valid_urls = await getUrlsWith200Status(possible_urls);
    //     // console.log('URLs with 200 status code:', valid_urls);
    //     return valid_urls;
    // } catch (error) {
    //     console.error('Error:', error);
    //     return [];
    // }
    
}

async function getUrlsWith200Status(urls) {
    const validUrls = [];

    for (const url of urls) {
        try {
            const response = await fetch(url);
            // const content = await response.text();
            // console.log("content:", content)
            if (response.status === 200) {
                validUrls.push(url);
            }
        } catch (error) {
            console.error(`Unexpected error fetching ${url}:`, error);
        }
    }
    return validUrls;
}

async function isValidJobUrl(url) {
    // check if url is valid by checking if it returns 200
    fetch(url)
    .then(response => {
        return response.status === 200;
    })
    .catch(error => {
        console.error('Error:', error);
        return false; // Handle errors appropriately
    });
}

function getReleases() {
    const tb = document.querySelector('table#projectstatus')
    if (!tb) {
        return
    }
    console.log(tb)
    const rows = tb.querySelectorAll('tr')
    // get .innerText from all ".jenkins-table__link model-link inside" elements and split on "-"
    // and keep the first part to ge the release name.
    // save list of unique release names. 
    let releases = []
    rows.forEach((row) => {
        const release = row.querySelector('.jenkins-table__link.model-link.inside')
        if (!release) {
            return
        }
        const release_no = release.innerText.split("-")[0]
        // check if its in format XX.XX 
        if (release_no.split(".").length !== 2) {
            return
        }
        
        if (!releases.includes(release_no)) {
            releases.push(release_no)
        }
    })
    console.log(`releases: ${releases}`)
    return releases
}

var filteredReleases = []


function filterByRelease(event) {
    const release = event.target.textContent
    if (filteredReleases.includes(release)) {
        // remove release from filteredReleases
        const index = filteredReleases.indexOf(release)
        filteredReleases.splice(index, 1)
        
        // change button color to indicate that it is not active
        event.target.style.border = "#000"
        event.target.style.color = "#000"
        
    }
    else {  // if release is not already selected
        filteredReleases.push(release)
        // change button color to indicate that it is active
        event.target.style.border = "2px solid #081"
        event.target.style.color = "#081"
        // make font bold to indicate that it is active
        event.target.style.fontWeight = "bold"
        
    }
    console.log(`filteredReleases: ${filteredReleases}`)
    const tb = document.querySelector('table#projectstatus')
    const rows = tb.querySelectorAll('tr')
    rows.forEach((row) => {
        // if filteredReleases is empty, show all rows
        if (filteredReleases.length === 0) {
            row.style.display = ""
            return
        }
        // otherwise, hide all rows containing releases that are not in filteredReleases
        const release_text = row.querySelector('.jenkins-table__link.model-link.inside')
        if (!release_text) {
            return
        }
        console.log(release_text.innerText)
        const release_no = release_text.innerText.split("-")[0]
        // check if release is in filteredReleases
        if (!filteredReleases.includes(release_no)) {
            row.style.display = "none"
        }
        else {
            row.style.display = ""
        }
    })
}


function createReleaseFilters() {
    const releases = getReleases();

    if (!releases) {
        return
    }

    // create new div after "#projectstatus-tabBar"
    const projectStatusTabBar = document.querySelector('#projectstatus-tabBar')
    const releaseFiltersDiv = document.createElement('div')
    releaseFiltersDiv.id = "release-filters"
    // create a button for each release
    releases.forEach((release) => {
        const button = document.createElement('button')
        button.classList.add('release-filter')

        button.textContent = release
        button.addEventListener('click', filterByRelease)
        // STYLE THE BUTTONS //
        // add pointer cursor to button
        button.style.cursor = "pointer"
        
        // append each button to the releaseFiltersDiv
        button.style.borderRadius = "5px"
        // button.style.border = "2px solid #e9e9ed"
        button.style.padding = "10px 16px"
        button.style.margin = "5px"
        button.style.marginBottom = "15px"
        button.style.marginTop = "-5px"
        // add soft shadow to button
        button.style.boxShadow = "0px 2px 2px 0px rgba(0,0,0,0.2)"
        
        releaseFiltersDiv.appendChild(button)
    })
    // append the releaseFiltersDiv to the page
    projectStatusTabBar.parentNode.insertBefore(releaseFiltersDiv, projectStatusTabBar.nextSibling)
}


function injectButtons() {
    const mainPanel = document.querySelector('#main-panel');

    // Find the #matrix div inside the main panel
    const matrixDiv = mainPanel.querySelector('#matrix');
    
    ////////////////// DO MATRIX JOB SHORTCUTS //////////////////
    if (matrixDiv) {
        matrixTable = matrixDiv.querySelector('table#configuration-matrix')
        if (matrixTable) {
            const buildHistory = document.querySelector('#buildHistory');

            const mostRecentJobEntry = buildHistory.querySelector('td.build-row-cell')
            if (mostRecentJobEntry) {
                const mostRecentJobNoStr = mostRecentJobEntry.querySelector("a.model-link").innerText;
                const mostRecentJobNo = parseInt(mostRecentJobNoStr.slice(1), 10);
                if (lastJobNo === undefined || lastJobNo !== mostRecentJobNo) {
                    console.log('lastJobNo: ' + lastJobNo);
                    lastJobNo = mostRecentJobNo;
                    // create a new table that matches the matrix table and inject in a div after the matrix div
                    // and make it position absolute and left: *width of matrix div* + 20px
                    // and top: *top of matrix div*
                    shortcutTable = matrixTable.cloneNode(true)
                    noColumnsToKeep = shortcutTable.querySelectorAll('tr')[0].querySelectorAll('td').length - 1
                    console.log("noColumnsToKeep: " + noColumnsToKeep)
                    // iterate through the rows and only keep the last two columns
                    shortcutTable.querySelectorAll('tr').forEach((row) => {
                        const rowLen = row.querySelectorAll('td').length
                        row.querySelectorAll('td').forEach((cell, index) => {
                            if (index < rowLen - noColumnsToKeep) {
                                cell.remove()
                            }
                        })
                    });
                    // add a class to the table
                    shortcutTable.id = "shortcut-table"
                    // modify the <a> elements to point to the console
                    shortcutTable.querySelectorAll('a').forEach((link) => {
                        const href = link.getAttribute('href');
                        const target_url = window.location.href + mostRecentJobNo + '/' +
                            href + 'console';
                        link.setAttribute('href', target_url)
                    });
                    // set each row to have the same height as the matrix table
                    shortcutTable.querySelectorAll('tr').forEach((row) => {
                        row.style.height = matrixTable.querySelectorAll('tr')[0].offsetHeight + "px"
                    });
                    // set the css styles
                    shortcutTable.style.position = "absolute"
                    // get calculated width of matrix table
                    shortcutTable.style.left = matrixDiv.offsetLeft + matrixTable.offsetWidth + 10 + "px"
                    shortcutTable.style.top = matrixDiv.offsetTop + "px"
                    shortcutTable.style.backgroundColor = "#fff"
                    shortcutTable.style.color = "#ccc"
                    shortcutTable.style.border = "1px solid #f10"
                    // Apply border-collapse: collapse to the inner tbody
                    // shortcutTable.querySelector('tbody').style.borderCollapse = "collapse"
                    shortcutTable.style.borderCollapse = "collapse"
                    // remove old table if it exists
                    const existingTable = document.querySelector('#shortcut-table');
                    if (existingTable) {
                        existingTable.remove();
                    }

                    // inject the table
                    matrixDiv.parentNode.insertBefore(shortcutTable, matrixDiv.nextSibling);
                } else {
                    console.log('No new jobs have been run yet. Skipping injecting shortcut table.');
                }
            }
        }
        // when there is a matrix but no matrix table, create our own buttons
        else {
            // Find all <a> elements with class "model-link" in the matrix div
            const modelLinks = matrixDiv.querySelectorAll('a.model-link');

            if (modelLinks.length > 0) {
                // Find the number of <td> elements with class "build-row-cell" in #buildHistory
                const buildHistory = document.querySelector('#buildHistory');

                const mostRecentJobEntry = buildHistory.querySelector('td.build-row-cell')
                if (mostRecentJobEntry) {
                    const mostRecentJobNoStr = mostRecentJobEntry.querySelector("a.model-link").innerText;
                    const mostRecentJobNo = parseInt(mostRecentJobNoStr.slice(1), 10);
                    if (lastJobNo === undefined || lastJobNo !== mostRecentJobNo) {
                        lastJobNo = mostRecentJobNo;

                        // Check if buttons have already been injected
                        const existingButtonsDiv = mainPanel.querySelectorAll('#latest-matrix-jobs-shortcuts');
                        if (existingButtonsDiv.length > 0) {
                            // Remove the old buttons
                            existingButtonsDiv.forEach((div) => {
                                div.remove();
                            });
                        }

                        // Create a base URL
                        const base_url = window.location.href + mostRecentJobNo + '/';

                        // Create a new div to hold the buttons
                        const buttonsDiv = document.createElement('div');
                        buttonsDiv.id = "latest-matrix-jobs-shortcuts"
                        buttonsDiv.style.marginBottom = "25px";

                        const buttonsDivHeader = document.createElement("h4")
                        buttonsDivHeader.textContent = "Shortcuts to Latest Matrix Jobs' Console"
                        buttonsDivHeader.style.marginTop = "20px";
                        buttonsDivHeader.style.marginBottom = "5px";



                        buttonsDiv.appendChild(buttonsDivHeader)
                        // Create an array of dictionaries
                        const buttonsArray = [];

                        modelLinks.forEach((link) => {
                            const svg_icon = link.querySelector(".build-status-icon__wrapper").cloneNode(true)
                            const href = link.getAttribute('href');
                            const target_url = base_url + href + 'console';
                            const name = link.innerText;

                            // Create a dictionary and add it to the array
                            buttonsArray.push({ name, target_url, svg_icon });
                        });

                        // Create and inject HTML buttons
                        buttonsArray.forEach((button) => {
                            const wrapperElement = document.createElement("a");
                            wrapperElement.href = button.target_url;
                            const svgElement = button.svg_icon;
                            wrapperElement.appendChild(svgElement);

                            const textElement = document.createElement('span');
                            // spanElement.style.display = 'inline-block';

                            // spanElement.style.color = '#ffffff'; // Text color
                            textElement.style.marginLeft = "3px";
                            textElement.textContent = button.name;
                            wrapperElement.appendChild(textElement);

                            // Add a class to the links for styling
                            wrapperElement.classList.add('extension-button');

                            // Apply CSS styles directly to the links

                            wrapperElement.style.display = 'inline-block';
                            wrapperElement.style.padding = '5px 10px'; // Adjust padding as needed
                            wrapperElement.style.marginTop = '5px'; // Add margin to separate links
                            wrapperElement.style.marginRight = "20px";
                            wrapperElement.style.textDecoration = 'none';
                            wrapperElement.style.backgroundColor = '#fff'; // Background color
                            wrapperElement.style.color = '#000'; // Text color
                            wrapperElement.style.border = '1px solid #000'; // Border
                            wrapperElement.style.borderRadius = '5px'; // Rounded border

                            // make button have underline on hover and remove underline on mouseout
                            wrapperElement.addEventListener('mouseover', () => {
                                wrapperElement.style.textDecoration = 'underline';
                            });
                            wrapperElement.addEventListener('mouseout', () => {
                                wrapperElement.style.textDecoration = 'none';
                            });

                            // Add the buttons to the buttons div

                            buttonsDiv.appendChild(wrapperElement);
                        });



                        // Insert the buttons div right after the matrix div
                        matrixDiv.parentNode.insertBefore(buttonsDiv, matrixDiv.nextSibling);

                        console.log('Buttons injected successfully.');
                    } else {
                        console.log('No new jobs have been run yet. Skipping injecting new buttons.');
                    }
                } else {
                    console.log('No jobs have been run yet.');
                }
            } else {
                console.log('No .model-link elements found in #matrix div.');
            }
        }
    }
    else {
        console.log('#matrix div not found in main panel.');
    }
    ////////////////// DO PERMALINK SHORTCUTS //////////////////
    if (document.querySelector('.permalink-link')) {
        console.log("permalinks found!")
        // iterate through the permalinks and add a small icon next to each one linking to the console output
        const permalinks = document.querySelectorAll('.permalink-link')
        // first check if the console output link already exists
        if (document.querySelector('.console-output-link')) {
            console.log("console output link already exists!")
            return;
        }

        permalinks.forEach((link) => {
            const href = link.getAttribute('href');
            const target_url = window.location.href + href + 'console';

            // const svg_icon = link.querySelector(".build-status-icon__wrapper").cloneNode(true)
            const wrapperElement = document.createElement("a");
            wrapperElement.innerText = "[console output]"
            wrapperElement.href = target_url;
            wrapperElement.classList.add('console-output-link');
            // wrapperElement.appendChild(svg_icon);
            link.parentNode.insertBefore(wrapperElement, link.nextSibling);
        })
    }
    else {
        console.log('permalinks not found in main panel.');
    }   
}

// Initial injection of buttons

main()



