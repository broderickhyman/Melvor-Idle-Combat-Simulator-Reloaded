const waitLoadOrder = (reqs: any, setup: any, id: any) => {
    if (typeof characterSelected === typeof undefined) {
        return;
    }
    let reqMet = characterSelected && confirmedLoaded;
    if (reqMet) {
        loadCounter++;
    }
    if (loadCounter > 100) {
        console.log('Failed to load ' + id);
        return;
    }
    // check requirements
    if ((window as any).MICSR === undefined) {
        reqMet = false;
        console.log(id + ' is waiting for the MICSR object');
    } else {
        for (const req of reqs) {
            if ((window as any).MICSR.loadedFiles[req]) {
                continue;
            }
            reqMet = false;
            // not defined yet: try again later
            if (loadCounter === 1) {
                (window as any).MICSR.log(id + ' is waiting for ' + req);
            }
        }
    }
    if (!reqMet) {
        setTimeout(() => waitLoadOrder(reqs, setup, id), 50);
        return;
    }
    // requirements met
    (window as any).MICSR.log('setting up ' + id);
    setup();
    // mark as loaded
    (window as any).MICSR.loadedFiles[id] = true;
}
