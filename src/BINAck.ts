export interface Options {
    app: string;
    sample?: number;
    nick?: string;
    host?: string;
}

const DEFAULT_OPTIONS: Options = {
    app: '',
    sample: 10,
    nick: '',
    host: '/a.png?',
};

export enum EAck {
    READY = 'rdy',
    SPEED = 'spd',
    ERROR = 'err',
    API = 'api',
    COUNT = 'cnt',
    STATISTIC = 'sta',
    LOG = 'log',
}

export interface AckParams {
    _ack: EAck;
    _app?: string;
    _time?: number;
    _nick?: string;
    
    [propName: string]: any;
}

export interface ErrorParams {
    file: string;
    line: number;
    column: number;
    stack: string;
}

const MAX_STRING = 1000;

abstract class BINAck {
    protected options: Options;

    private ackQueue: AckParams[];
    private ackTimer: any;

    constructor(options: Options) {
        this.options = {...DEFAULT_OPTIONS};
        this.setOptions(options);
    }

    public init() {
        this.ackQueue = [];
    }

    public setOptions(options: Options) {
        for (const k in options) {
            if (options.hasOwnProperty(k)) {
                this.options[k] = options[k];
            }
        }
    }
    
    // public ackSpeed(point: number, cost?: number) {

    // }

    public ackError(message: string, type?: string, params?: ErrorParams) {
        if (message.length > MAX_STRING) {
            message = message.substring(0, MAX_STRING);
        }

        type = type || 'sys';

        if (params) {
            if (params.stack && params.stack.length > MAX_STRING) {
                params.stack = params.stack.substring(0, MAX_STRING);
            }
            this.ack({
                _ack: EAck.ERROR,
                msg: message,
                type,
                ...params,
            }, false, 1);
        } else {
            this.ack({
                _ack: EAck.ERROR,
                msg: message,
                type,
            }, false, 1);
        }
    }

    public ackApi(api: string, succeed: boolean, cost?: number, code?: string, detail?: string) {
        const params: AckParams = {
            _ack: EAck.API,
            api,
            succeed,
        };

        if (cost !== undefined) {
            params.cost = cost;
        }

        if (code !== undefined) {
            params.code = code;
        }

        if (detail !== undefined) {
            params.detail = detail;
        }

        this.ack(params, false, 1);
    }

    public ackCount(name: string) {
        this.ack({
            _ack: EAck.COUNT,
            name,
        });
    }

    public ackStatistic(name: string, value: number) {
        this.ack({
            _ack: EAck.STATISTIC,
            name,
            value,
        });
    }

    public ackLog(message: string) {
        this.ack({
            _ack: EAck.LOG,
            msg: message,
        }, false, 1);
    }

    protected ack(params: AckParams, rightNow?: boolean, sample?: number) {
        if (!this.options.app) {
            return;
        }

        params._app = this.options.app;
        params._time = Date.now();
        if (this.options.nick) {
            params._nick = this.options.nick;
        }

        if (rightNow) {
            this.send(params);
            return;
        }

        if (params._ack === EAck.ERROR && params.type === 'sys' && this.ackQueue.length > 0) {
            const last = this.ackQueue[this.ackQueue.length - 1];
            if (last._ack === EAck.ERROR && last.type === 'sys' && last.message === params.message) {
                return;
            }
        }

        sample = sample || this.options.sample || 1;
        if (sample !== 1 && Math.floor(Math.random() * sample) !== 1) {
            return;
        }

        this.ackQueue.push(params);
        if (!this.ackTimer) {
            this.ackTimer = setTimeout(() => {
                this.ackTimer = 0;
                this.flushAckQueue();
            });
        }
    }

    protected ready() {
        this.ackReady();
    }

    protected flushAckQueue() {
        const queue = this.ackQueue;
        this.ackQueue = [];
        
        for (let i = 0, iz = queue.length; i < iz; ++i) {
            this.send(queue[i]);
        }

        if (this.ackTimer) {
            clearTimeout(this.ackTimer);
            this.ackTimer = 0;
        }
    }

    protected abstract ackReady();
    protected abstract send(params: AckParams);
}

export default BINAck;
