/*  Melvor Idle Combat Simulator

    Copyright (C) <2020>  <Coolrox95>
    Modified Copyright (C) <2020> <Visua0>
    Modified Copyright (C) <2020, 2021> <G. Miclotte>

    This program is free software: you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU General Public License for more details.

    You should have received a copy of the GNU General Public License
    along with this program.  If not, see <http://www.gnu.org/licenses/>.
*/

// Set up listener from page
window.addEventListener('message', (event) => {
    // We only accept messages from ourselves
    if (event.source !== window) {
        return;
    }
    if (event.data.type && (event.data.type === 'MCS_FROM_PAGE')) {
        switch (event.data.action) {
            case 'REQUEST_URLS':
                // Send URLS of web accessible resources to page
                const urls = {
                    crossedOut: chrome.runtime.getURL('icons/crossedOut.svg'),
                    simulationWorker: chrome.runtime.getURL('sources/workers/simulator.js'),
                };
                window.postMessage({type: 'MCS_FROM_CONTENT', action: 'RECEIVE_URLS', urls: urls});
                break;
        }
    }
}, false);

// Perform script injection
/**
 * Injects a script onto the page of the
 * @param {string} scriptName
 */
function injectScript(scriptName) {
    const scriptID = `mcs-${scriptName}`;
    // Check if script already exists, if so delete it
    if (document.getElementById(scriptID)) {
        window.postMessage({type: 'MCS_FROM_CONTENT', action: 'UNLOAD'});
        document.getElementById(scriptID).remove();
    }
    // Inject script
    const scriptPath = chrome.runtime.getURL(`sources/injectable/${scriptName}.js`);
    const newScript = document.createElement('script');
    newScript.setAttribute('id', scriptID);
    newScript.src = scriptPath;
    document.body.appendChild(newScript);
}

// Inject the scripts
function injectScripts() {
    // Order of scripts shouldn't matter, `waitLoadOrder` takes care of appropriate loading order
    const injectableNames = [
        // MICSR object
        'MICSR',
        // common
        'util',
        'modifierNames',
        // class files
        'AgilityCourse',
        'Card',
        'CombatData',
        'Consumables',
        'DataExport',
        'ExportCheat',
        'Import',
        'Loot',
        'Plotter',
        'Menu',
        'Simulator',
        'SimEnemy',
        'SimManager',
        'SimPlayer',
        'TabCard',
        // uses the other classes
        'App',
        // should be last
        'main',
    ];
    for (let i = 0; i < injectableNames.length; i++) {
        injectScript(injectableNames[i]);
    }
}

injectScripts();