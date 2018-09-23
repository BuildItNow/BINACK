import BrowserAck from "./BrowserAck";

const options = window['__BAck'];
if (options) {
    const ack = new BrowserAck(options);
    ack.init();

    window['__BAck'] = ack;
}
