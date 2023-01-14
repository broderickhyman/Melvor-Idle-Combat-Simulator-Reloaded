class SimGame extends Game {
    micsr: MICSR;
    // @ts-expect-error Force SimManager type
    combat: SimManager;
    isWebWorker: boolean;

    constructor(micsr: MICSR, isWebWorker: boolean) {
        super();
        this.micsr = micsr;
        this.isWebWorker = isWebWorker;
        const demoNamespace =
            this.registeredNamespaces.getNamespace("melvorD")!;
        this.combat = new SimManager(this, demoNamespace) as any;
        this.detachGlobals();

        // Fix SimPlayer object to match replaced Player object
        this.combat.player.registerStatProvider(this.petManager);
        this.combat.player.registerStatProvider(this.shop);
        this.combat.player.registerStatProvider(this.potions);
    }

    detachGlobals() {
        if (this.isWebWorker) {
            // Fake the township item
            this.township = {
                // @ts-expect-error
                tasks: {
                    updateMonsterTasks: () => null,
                },
            };
            // @ts-expect-error
            this.completion = {
                updatePet: () => null,
            };
            this.petManager.unlockPet = () => null;
            this.bank.addItem = () => true;
            this.gp.add = (amount) => {
                // Store gp on the SimPlayer
                this.combat.player.gp += amount;
            };
        }
    }

    onLoad() {
        // this.completion.onLoad();
        // this.bank.onLoad();
        // @ts-expect-error
        this.potions.computeProvidedStats(false);
        this.petManager.onLoad();
        this.shop.computeProvidedStats(false);
        this.combat.initialize();
        // this.gp.onLoad();
        // this.slayerCoins.onLoad();
        // this.raidCoins.onLoad();
        // this.settings.initializeToggles();
        // this.settings.initializeChoices();
        // this.township.postStatLoad();
        // this.township.tasks.onLoad();
        // this.settings.onLoad();
    }

    resetToBlankState() {
        this.combat.player.resetToBlankState();
    }

    constructEventMatcher(data: GameEventMatcherData): GameEventMatcher {
        switch (data.type) {
            case "EnemyAttack":
            case "FoodEaten":
            case "MonsterDrop":
            case "MonsterKilled":
            case "PlayerAttack":
            case "PlayerHitpointRegeneration":
            case "PlayerSummonAttack":
            case "PotionChargeUsed":
            case "PotionUsed":
            case "PrayerPointConsumption":
            case "RuneConsumption":
            case "SummonTabletUsed":
                return super.constructEventMatcher(data);
        }
        return new CustomEventMatcher();
    }

    generateSaveStringSimple(): string {
        // @ts-expect-error
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
        this.petManager.encode(writer);
        this.shop.encode(writer);
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
                !this.micsr.bannedSkills
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
        this.petManager.decode(reader, version);
        this.shop.decode(reader, version);
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

    // Don't render
    render() {}
}

class CustomEventMatcher extends GameEventMatcher {
    doesEventMatch(event: GameEvent): boolean {
        return false;
    }
}
