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
/// <reference path="../typedefs.js" />

(() => {
    const reqs = [
        'util',
        'App',
    ];

    const setup = () => {
        const MICSR = window.MICSR;

        // Define the message listeners from the content script
        function onMessage(event) {
            // We only accept messages from ourselves
            if (event.source !== window) {
                return;
            }
            if (event.data.type && (event.data.type === 'MCS_FROM_CONTENT')) {
                // MICSR.log('Message received from content script');
                switch (event.data.action) {
                    case 'RECEIVE_URLS':
                        // MICSR.log('Loading sim with provided URLS');
                        let tryLoad = true;
                        let wrongVersion = false;
                        if (gameVersion !== MICSR.gameVersion && gameVersion !== localStorage.getItem('MICSR-gameVersion')) {
                            wrongVersion = true;
                            tryLoad = window.confirm(`${MICSR.name} ${MICSR.version}\n`
                                + `A different game version was detected (expected: ${MICSR.gameVersion}).\n`
                                + `Loading the combat sim may cause unexpected behaviour.\n`
                                + `After a successful load, this popup will be skipped for Melvor ${gameVersion}\n`
                                + `Try loading the simulator?`);
                        }
                        if (tryLoad) {
                            try {
                                MICSR.melvorCombatSim = new MICSR.App(event.data.urls);
                                if (wrongVersion) {
                                    MICSR.log(`${MICSR.name} ${MICSR.version} loaded, but simulation results may be inaccurate due to game version incompatibility.`);
                                    MICSR.log(`No further warnings will be given when loading the simulator in Melvor ${gameVersion}`);
                                    localStorage.setItem('MICSR-gameVersion', gameVersion);
                                } else {
                                    MICSR.log(`${MICSR.name} ${MICSR.version} loaded.`);
                                }
                            } catch (error) {
                                MICSR.warn(`${MICSR.name} ${MICSR.version} was not loaded due to the following error:`);
                                MICSR.error(error);
                            }
                        } else {
                            MICSR.warn(`${MICSR.name} ${MICSR.version} was not loaded due to game version incompatibility.`);
                        }
                        break;
                    case 'UNLOAD':
                        window.removeEventListener('message', onMessage);
                        if (MICSR.melvorCombatSim) {
                            MICSR.melvorCombatSim.destroy();
                            MICSR.melvorCombatSim = undefined;
                        }
                        break;
                }
            }
        }

        window.addEventListener('message', onMessage, false);

        // Wait for page to finish loading, then create an instance of the combat sim
        if (typeof confirmedLoaded !== 'undefined') {
            const melvorCombatSimLoader = setInterval(() => {
                if (confirmedLoaded) {
                    clearInterval(melvorCombatSimLoader);
                    window.postMessage({type: 'MCS_FROM_PAGE', action: 'REQUEST_URLS'});
                }
            }, 200);
        }
    }

    let loadCounter = 0;
    const waitLoadOrder = (reqs, setup, id) => {
        if (typeof characterSelected === typeof undefined) {
            return;
        }
        if (characterSelected && !characterLoading) {
            loadCounter++;
        }
        if (loadCounter > 100) {
            console.log('Failed to load ' + id);
            return;
        }
        // check requirements
        let reqMet = characterSelected && !characterLoading;
        if (window.MICSR === undefined) {
            reqMet = false;
            console.log(id + ' is waiting for the MICSR object');
        } else {
            for (const req of reqs) {
                if (window.MICSR.loadedFiles[req]) {
                    continue;
                }
                reqMet = false;
                // not defined yet: try again later
                if (loadCounter === 1) {
                    window.MICSR.log(id + ' is waiting for ' + req);
                }
            }
        }
        if (!reqMet) {
            setTimeout(() => waitLoadOrder(reqs, setup, id), 50);
            return;
        }
        // requirements met
        window.MICSR.log('setting up ' + id);
        setup();
        // mark as loaded
        window.MICSR.loadedFiles[id] = true;
    }
    waitLoadOrder(reqs, setup, 'main');

})();
