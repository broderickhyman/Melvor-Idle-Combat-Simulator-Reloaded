
class SimGame extends Game {
  micsr: MICSR;
  // @ts-expect-error Force SimManager type
  combat: SimManager;

  constructor(micsr: MICSR){
    super()
    this.micsr = micsr;
    const demoNamespace = this.registeredNamespaces.getNamespace("melvorD")!;
    this.combat = new SimManager(this, demoNamespace) as any
  }

  initialize(){
    this.combat.initialize();
  }

  constructEventMatcher = (data: GameEventMatcherData): GameEventMatcher => {
    return {} as any;
  };
}