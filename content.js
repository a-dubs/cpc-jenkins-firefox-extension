// content.js
var lastJobNo = undefined;


// Start observing changes in the mainPanel


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

// this should only be run once upon document load
function main() {
    

    // Check if the current site's base URL is localhost:8080
    if (
        window.location.href.includes('localhost:8080') || 
        window.location.href.includes('jenkins.canonical.com') 
    ) {
        console.log("--- CPC Jenkins Tweaks Extension ---")
        cleanupExisting()
        createReleaseFilters()
        doAlternateReleaseStuff()
        modifyBanner()
        // Find the #main-panel div
        const mainPanel = document.querySelector('#main-panel');
        if (mainPanel) {
            console.log('injecting buttons!');
            injectButtons();
        } 
    } else {
        // console.log('Extension is not active on this page.');
    }
}

function addAlternateReleaseShortcuts(urls) {
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
    //https://stable-cloud-images-ps5.jenkins.canonical.com/view/Oracle/job/18.04-Base-Oracle-Build-Images/
    const release = url.split("/job/")[1].split("-")[0]
    return release
}

async function doAlternateReleaseStuff() {
    // use regex to check if document title starts with release number like "22.04"
    const release = getReleaseFromUrl(window.location.href)
    if (release) {
        console.log("job page found. doing alternate release stuff now.")
        const valid_urls = await getValidAlternativeReleaseUrls(window.location.href, release)
        console.log("valid_urls:", valid_urls)
        addAlternateReleaseShortcuts(valid_urls)
    }
}

async function getValidAlternativeReleaseUrls(original_url, original_release) {
    const possible_releases = ["16.04", "18.04", "20.04", "22.04", "23.10", "24.04"]
    // remove original release from possible_releases
    possible_releases.splice(possible_releases.indexOf(original_release), 1)
    console.log(original_url, original_release)
    const possible_urls = []
    possible_releases.forEach((release) => {
        possible_urls.push(original_url.replace(original_release, release))
    })
    // let valid_urls = []
    try {
        const valid_urls = await getUrlsWith200Status(possible_urls);
        // console.log('URLs with 200 status code:', valid_urls);
        return valid_urls;
    } catch (error) {
        console.error('Error:', error);
        return [];
    }
    
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



// // check if we are one job page
// if (document.title.endsWith("[Jenkins]") && document.querySelector('#buildHistory')) {
//     fetch('http://localhost:3039/start-ssh-tunnel', {
//         method: 'POST',
//     })
//         .then(response => response.text())
//         .then(data => console.log(data))
//         .catch(error => console.error('Error:', error));



//     // Interval to check for changes in mostRecentJobNo and update buttons
//     const intervalId = setInterval(() => {
//         injectButtons(); // Check and inject buttons periodically
//     }, 5000); // Adjust the interval as needed (e.g., every 5 seconds)

//     // Stop the interval when the page is unloaded (optional)
//     window.addEventListener('unload', () => {
//         clearInterval(intervalId);
//     });
// }


// // Function to check for changes in the element
// function checkForChanges() {
//     // Find the element you want to monitor for changes
//     const buildHistory = document.querySelector('#buildHistory');
//     if (!buildHistory) {
//         return;
//     }
//     const mostRecentJobEntry = buildHistory.querySelector('td.build-row-cell')


//     if (mostRecentJobEntry) {
//         const status = mostRecentJobEntry.querySelector(".build-status-link").getAttribute('tooltip').split(" > ")[0]
//         // Get the current content of the element
//         const currentContent = status;
//         console.log("status: " + status)
//         if (checkForChanges.lastContent === undefined) {
//             checkForChanges.lastContent = currentContent;
//             return;
//         }
//         // Check if the content has changed since the last check
//         else if (currentContent !== checkForChanges.lastContent && (status === "Success" || status === "Failed")) {
//             // Content has changed, trigger a push notification
//             if (status === "Success") {
//                 sendNotification("Build Succeeded", "Job " + document.title.split(" [")[0] + " has completed successfully.");
//             }
//             else if (status === "Failed") {
//                 sendNotification("Build Failed", "Job " + document.title.split(" [")[0] + " has failed.");
//             }

//             // Update the lastContent with the current content
//             checkForChanges.lastContent = currentContent;
//         }
//     }
// }


// listen for when the site makes a request to
// https://stable-cloud-images-ps5.jenkins.canonical.com/job/24.04-Base-Oracle-Daily-Test/ajaxMatrix
// and log to console
// const observer = new MutationObserver((mutations) => {
//     mutations.forEach((mutation) => {
//         console.log(mutation);
//     });

// });

// checkForChanges.lastContent = undefined; // Set the initial content - assume it's "Success" so that the first check will only trigger if the content changes from "Success" to "Running" or "Failed"
// // Initial check for changes
// checkForChanges();


// // Interval to check for changes in the element
// const intervalId = setInterval(() => {
//     checkForChanges(); // Check for changes periodically
// }, 5000); // Adjust the interval as needed (e.g., every 5 seconds)




// REPLACING MATRIX DIV INPLACE WITH LINKS STRAIGHT TO CONSOLE //
// const mainpanel = document.querySelector('#main-panel');
// if (mainpanel) {
//     const observer = new MutationObserver((mutations) => {
//         // check all elements that have changed and check if any are the #matrix element
//         mutations.forEach((mutation) => {
//             console.log(mutation);  
//             mutations.forEach((mutation) => {
//                 mutation.addedNodes.forEach((node) => {
//                     if (node.id === "matrix") {
//                         console.log("matrix element added!")
//                         // create duplicate of matrix table and inject it in a div after the matrix div
//                         const customMatrix = node.cloneNode(true);
//                         // change id of customMatrix to "custom-matrix"
//                         customMatrix.id = "custom-matrix";
//                         // append all hrefs in the customMatrix with the suffix "lastBuild/console"
//                         customMatrix.querySelectorAll('a').forEach((link) => {
//                             const href = link.getAttribute('href');
//                             const new_href = href + 'lastBuild/console';
//                             link.setAttribute('href', new_href);
//                         });
//                         // insert the customMatrix after the matrix div
//                         // delete any existing customMatrix
//                         const existingCustomMatrix = document.querySelector('#custom-matrix');
//                         if (existingCustomMatrix) {
//                             existingCustomMatrix.remove();
//                         }
//                         node.parentNode.insertBefore(customMatrix, node.nextSibling);
//                         node.style.display = "none";
//                     }
//                 });
//             });
//         });
//     });
//     observer.observe(mainpanel, { childList: true,  });
// }

// // Function to send a push notification
// function sendNotification(title, message) {
//     // Check if the browser supports notifications
//     if ("Notification" in window) {
//         // Request permission to show notifications if not already granted
//         if (Notification.permission === "granted") {
//             // Create and show the notification
//             new Notification(title, { body: message });
//         } else if (Notification.permission !== "denied") {
//             Notification.requestPermission().then(function (permission) {
//                 if (permission === "granted") {
//                     // Create and show the notification
//                     new Notification(title, { body: message });
//                 }
//             });
//         }
//     }
// }

//   // Observe changes in the DOM
//   const observer = new MutationObserver(() => {
//     injectButtons();
//   });



// Function to create and inject a button for requesting permission
// function createPermissionButton() {
//     // check if button already exists
//     if (document.querySelector('#requestPermissionButton')) {
//         return;
//     }

//     const button = document.createElement('button');
//     button.textContent = 'Enable Notification Permission';
//     button.addEventListener('click', requestNotificationPermission);

//     const buildHistory = document.querySelector('#buildHistory');

//     // style button so that it has nice padding and takes up 100% width 
//     button.style.display = 'block';
//     button.style.width = '90%';
//     button.style.padding = '5px 10px'; // Adjust padding as needed
//     // button.style.marginTop = '5px'; // Add margin to separate links
//     button.style.margin = "10px 5%";
//     button.style.backgroundColor = '#fff'; // Background color
//     button.style.border = '1px solid #000'; // Border
//     button.style.borderRadius = '5px'; // Rounded border
//     button.style.cursor = "pointer";

//     // insert the button after the build history table
    
//     if ("Notification" in window) {
//         Notification.requestPermission().then(function (permission) {
//             if (permission === "granted") {
//                 //   button.textContent = 'Notification permission granted.';
//                 //   button.style.cursor = "not-allowed";
//                 return;
//             }
//         });
//     }
//     buildHistory.parentNode.insertBefore(button, buildHistory.previousSibling);
//     // Append the button to the page (you can choose a suitable location)
//     // document.body.appendChild(button);
// }

// // Function to request notification permission
// function requestNotificationPermission() {
//     if ("Notification" in window) {
//         Notification.requestPermission().then(function (permission) {
//             if (permission === "granted") {
//                 console.log('Notification permission granted.');
//                 // You can now use the sendNotification function to display notifications.
//             } else {
//                 console.log('Notification permission denied.');
//             }
//         });
//     }
// }



// function getEnabledUrls() {
//     // Retrieve all currently enabled URLs for notifications
//     fetch('http://localhost:3039/enabled-urls')
//         .then((response) => response.json())
//         .then((data) => {
//             console.log('Currently enabled URLs:', data);
//         })
//         .catch((error) => {
//             console.error('Error:', error);
//         });
// }

// // Send a POST request to enable/disable notifications for a URL
// function enableNotificationForPage() {
//     const enabled = true; // Set to true to enable notifications, false to disable
//     const url = window.location.href;
//     fetch('http://localhost:3039/notification-settings', {
//         method: 'POST',
//         headers: {
//           'Content-Type': 'application/json',
//         },
//         body: JSON.stringify({ url, enabled }),
//       })
//       .then((response) => {
//           if (response.status === 200) {
//               console.log(`Notification settings updated for ${url}`);
//           } else {
//               console.error('Failed to update notification settings');
//           }
//         })
//         .catch((error) => {
//           console.error('Error:', error);
//       });
      
// }

// function createNotificationToggleButton() {
//     const button = document.createElement('button');
//     button.textContent = 'Enable Notification Permission';
//     button.addEventListener('click', enableNotificationForPage);
    
    
//     // style button so that it has nice padding and takes up 100% width 
//     button.style.display = 'block';
//     button.style.width = '90%';
//     button.style.padding = '5px 10px'; // Adjust padding as needed
//     // button.style.marginTop = '5px'; // Add margin to separate links
//     button.style.margin = "10px 5%";
//     button.style.backgroundColor = '#fff'; // Background color
//     button.style.border = '1px solid #000'; // Border
//     button.style.borderRadius = '5px'; // Rounded border
//     button.style.cursor = "pointer";
    
//     const buildHistory = document.querySelector('#buildHistory');
//     buildHistory.parentNode.insertBefore(button, buildHistory.previousSibling);
// }

// // Call the function to create and inject the permission button
// createPermissionButton();
