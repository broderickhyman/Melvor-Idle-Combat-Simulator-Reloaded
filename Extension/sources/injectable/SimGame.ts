class SimGame extends Game {
    micsr: MICSR;
    // @ts-expect-error Force SimManager type
    combat: SimManager;

    static bannedSkills = [
        "Woodcutting",
        "Firemaking",
        "Fishing",
        "Mining",
        "Cooking",
        "Smithing",
        "Farming",
        "Summoning",
        "Thieving",
        "Fletching",
        "Crafting",
        "Runecrafting",
        "Herblore",
        "Agility",
        "Astrology",
        "Township",
    ];

    constructor(micsr: MICSR, isWebWorker: boolean) {
        super();
        this.micsr = micsr;
        const demoNamespace =
            this.registeredNamespaces.getNamespace("melvorD")!;
        this.combat = new SimManager(this, demoNamespace) as any;
        if (isWebWorker) {
            // Fake the township item
            this.township = {
                // @ts-expect-error
                tasks: {
                    updateMonsterTasks: () => {},
                },
            };
            // @ts-expect-error
            this.completion = {
                updatePet: () => {},
            };
            this.petManager.unlockPet = () => {};
        }
    }

    initialize() {
        this.combat.initialize();
    }

    constructEventMatcher(data: GameEventMatcherData): GameEventMatcher {
        return new CustomEventMatcher();
    }

    generateSaveStringSimple(): string {
        const header = this.getSaveHeader();
        const writer = new SaveWriter("Write", 512);
        this.encodeSimple(writer);
        return writer.getSaveString(header);
    }

    encodeSimple(writer: SaveWriter): SaveWriter {
        // writer.writeFloat64(this.tickTimestamp);
        // writer.writeFloat64(this.saveTimestamp);
        // writer.writeBoolean(this.activeAction !== undefined);
        // if (this.activeAction !== undefined)
        //     writer.writeNamespacedObject(this.activeAction);
        // writer.writeBoolean(this.pausedAction !== undefined);
        // if (this.pausedAction !== undefined)
        //     writer.writeNamespacedObject(this.pausedAction);
        // writer.writeBoolean(this._isPaused);
        writer.writeBoolean(this.merchantsPermitRead);
        writer.writeNamespacedObject(this.currentGamemode);
        // writer.writeString(this.characterName);
        // this.bank.encode(writer);
        this.combat.encode(writer);
        // this.golbinRaid.encode(writer);
        // this.minibar.encode(writer);
        // this.petManager.encode(writer);
        // this.shop.encode(writer);
        // this.itemCharges.encode(writer);
        this.tutorial.encode(writer);
        // this.potions.encode(writer);
        // this.stats.encode(writer);
        // this.settings.encode(writer);
        // this.gp.encode(writer);
        // this.slayerCoins.encode(writer);
        // this.raidCoins.encode(writer);
        // writer.writeArray(this.readNewsIDs, (newsID, writer) => {
        //     writer.writeString(newsID);
        // });
        // writer.writeString(this.lastLoadedGameVersion);
        // nativeManager.encode(writer);

        const goodSkills = this.skills.filter(
            (x) =>
                !SimGame.bannedSkills
                    .map((bannedSkill: string) => `melvorD:${bannedSkill}`)
                    .includes(x.id)
        );

        writer.writeUint32(goodSkills.length);
        goodSkills.forEach((skill) => {
            writer.writeNamespacedObject(skill);
            writer.startMarkingWriteRegion();
            skill.encode(writer);
            writer.stopMarkingWriteRegion();
        });
        // mod.encode(writer);
        // this.completion.encode(writer);
        return writer;
    }

    decodeSimple(reader: SaveWriter, version: number): void {
        // let resetPaused = false;
        // this.tickTimestamp = reader.getFloat64();
        // this.saveTimestamp = reader.getFloat64();
        // if (reader.getBoolean()) {
        //     const activeAction = reader.getNamespacedObject(this.activeActions);
        //     if (typeof activeAction !== "string")
        //         this.activeAction = activeAction;
        // }
        // if (reader.getBoolean()) {
        //     const pausedAction = reader.getNamespacedObject(this.activeActions);
        //     if (typeof pausedAction === "string") resetPaused = true;
        //     else this.pausedAction = pausedAction;
        // }
        // this._isPaused = reader.getBoolean();
        this.merchantsPermitRead = reader.getBoolean();
        const gamemode = reader.getNamespacedObject(this.gamemodes);
        if (typeof gamemode === "string")
            throw new Error("Error loading save. Gamemode is not registered.");
        this.currentGamemode = gamemode;
        // this.characterName = reader.getString();
        // this.bank.decode(reader, version);
        this.combat.decode(reader, version);
        // this.golbinRaid.decode(reader, version);
        // this.minibar.decode(reader, version);
        // this.petManager.decode(reader, version);
        // this.shop.decode(reader, version);
        // this.itemCharges.decode(reader, version);
        this.tutorial.decode(reader, version);
        // this.potions.decode(reader, version);
        // this.stats.decode(reader, version);
        // this.settings.decode(reader, version);
        // this.gp.decode(reader, version);
        // this.slayerCoins.decode(reader, version);
        // this.raidCoins.decode(reader, version);
        // this.readNewsIDs = reader.getArray((reader) => reader.getString());
        // this.lastLoadedGameVersion = reader.getString();
        // nativeManager.decode(reader, version);
        const numSkills = reader.getUint32();
        for (let i = 0; i < numSkills; i++) {
            const skill = reader.getNamespacedObject(this.skills);
            const skillDataSize = reader.getUint32();
            if (typeof skill === "string")
                reader.getFixedLengthBuffer(skillDataSize);
            else skill.decode(reader, version);
        }
        // mod.decode(reader, version);
        // if (version >= 26) this.completion.decode(reader, version);
        // if (resetPaused) {
        //     if (!this.isGolbinRaid) this._isPaused = false;
        // }
    }
}

class CustomEventMatcher extends GameEventMatcher {
    doesEventMatch(event: GameEvent): boolean {
        return false;
    }
}
