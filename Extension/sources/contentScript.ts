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

async function loadScripts(ctx: Modding.ModContext) {
    const injectableNames = [
        // MICSR object
        "MICSR",
        // common
        "util",
        "modifierNames",
        // class files
        "AgilityCourse",
        "Card",
        "CombatData",
        "CloneData",
        "Consumables",
        "DataExport",
        "Import",
        "ExportCheat",
        "Loot",
        "Plotter",
        "Menu",
        "Simulator",
        "SimGame",
        "SimEnemy",
        "SimManager",
        "SimPlayer",
        "TabCard",
        // uses the other classes
        "App",
    ];
    for (let i = 0; i < injectableNames.length; i++) {
        const scriptPath = `built/injectable/${injectableNames[i]}.js`;
        await ctx.loadScript(scriptPath);
    }
    // await ctx.loadScript('built/workers/simulator.js');
}

export function setup(setupContext: Modding.ModContext) {
    const isDev = true;
    loadScripts(setupContext);

    setupContext.onCharacterSelectionLoaded(() => {
        if (isDev) {
            console.clear();
            // Load character
            $("#save-slot-display-3")
                .find("button.btn-gamemode-standard")
                .trigger("click");
            // Accept warning
            $("button.swal2-confirm").trigger("click");
        }
    });

    setupContext.onInterfaceReady(async (characterContext) => {
        const urls = {
            crossedOut: characterContext.getResourceUrl("icons/crossedOut.svg"),
            simulationWorker: characterContext.getResourceUrl(
                "built/workers/simulator.js"
            ),
        };
        const micsr = new MICSR(isDev);

        // micsr.log('Loading sim with provided URLS');
        let tryLoad = true;
        let wrongVersion = false;
        if (
            gameVersion !== micsr.gameVersion &&
            gameVersion !== localStorage.getItem("MICSR-gameVersion")
        ) {
            wrongVersion = true;
            tryLoad = window.confirm(
                `${micsr.name} ${micsr.version}\n` +
                    `A different game version was detected (expected: ${micsr.gameVersion}).\n` +
                    `Loading the combat sim may cause unexpected behaviour.\n` +
                    `After a successful load, this popup will be skipped for Melvor ${gameVersion}\n` +
                    `Try loading the simulator?`
            );
        }
        if (tryLoad) {
            try {
                // debugger;
                const saveString = game.generateSaveString();
                const reader = new SaveWriter("Read", 1);
                const saveVersion = reader.setDataFromSaveString(saveString);
                const simGame = new SimGame(micsr, false);

                await micsr.fetchData();
                await micsr.initialize(simGame, game);

                simGame.decode(reader, saveVersion);

                const app = new App(simGame);
                await app.initialize(urls);
                if (wrongVersion) {
                    micsr.log(
                        `${micsr.name} ${micsr.version} loaded, but simulation results may be inaccurate due to game version incompatibility.`
                    );
                    micsr.log(
                        `No further warnings will be given when loading the simulator in Melvor ${gameVersion}`
                    );
                    localStorage.setItem("MICSR-gameVersion", gameVersion);
                } else {
                    micsr.log(`${micsr.name} ${micsr.version} loaded.`);
                }
                if (micsr.isDev) {
                    // Auto open the combat sim menu
                    $("#mcsButton").children().first().trigger("click");
                    // Import set
                    $("[id='MCS 1 Button']").trigger("click");
                    // Start sim
                    $("[id='MCS Simulate All Button']").trigger("click");
                }
            } catch (error) {
                micsr.warn(
                    `${micsr.name} ${micsr.version} was not loaded due to the following error:`
                );
                micsr.error(error);
            }
        } else {
            micsr.warn(
                `${micsr.name} ${micsr.version} was not loaded due to game version incompatibility.`
            );
        }
    });
}
