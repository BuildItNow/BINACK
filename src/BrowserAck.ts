import BINAck, { AckParams, EAck } from "./BINAck";

class BrowserAck extends BINAck {
    private imgId: number;
    private imgs: { [key: string]: any };

    public init() {
        super.init();

        this.imgId = 0;
        this.imgs = {};

        // Hook global error handle
        this.hookGlobalError();

        // Hook document ready event to ack ready data
        this.hookReady();

        // Hook unload
        this.hookUnload();
    }

    protected ackReady() {
        try {
            // Collect performance data
            const TIME_SPAN_CONFIG = {
                RRT: ['requestStart', 'responseStart'], // 
                DNS: ['domainLookupStart', 'domainLookupEnd'], // 
                CNT: ['connectStart', 'connectEnd'], // 
                TTFB: ['fetchStart', 'responseStart'], // 
                DLD: ['fetchStart', 'domContentLoadedEventStart'], //
                FLD: ['fetchStart', 'loadEventStart'], //
            };

            const timing = performance.timing;
            const params: AckParams = {
                _ack: EAck.READY,
            };

            for (const name in TIME_SPAN_CONFIG) {
                if (!TIME_SPAN_CONFIG.hasOwnProperty(name)) {
                    continue;
                }
                const span = TIME_SPAN_CONFIG[name];

                const s = timing[span[0]];
                const e = timing[span[1]];

                if (!s || !e) {
                    continue;
                }

                const c = e - s;
                if (c >= 0 && c < 86400000) {
                    params[name] = c;
                }
            }

            const connection = (window.navigator as any).connection;
            if (connection) {
                params['NT'] = connection.effectiveType || connection.type || '';
            }

            this.ack(params as AckParams, true);
        } catch (e) {
            //
        }
    }

    protected send(params: AckParams) {
        // TODO: Image object pool
        const id = ++this.imgId;
        const img = new Image();
        this.imgs[id] = img;

        img.onload = img.onerror = () => {
            this.imgs[id] = undefined;
            delete this.imgs[id];
        };

        const options = this.options;

        // TODO: Use navigator.sendBeacon
        // navigator.sendBeacon is a new feature
        const queryString = this.genQueryString(params);
        img.src = options.host + queryString;
    }

    private hookGlobalError() {
        const oldOnError = window.onerror;
        const self = this;
        window.onerror = function(message: any, file: string, line: number, column: number, error: Error) {
            if (oldOnError) {
                oldOnError.apply(this, arguments);
            }

            if (!message) {
                return;
            }

            try {
                const type = typeof message;
                if (type === 'object' && message.message) {
                    const evt = message;
                    
                    message = evt.message;
                    file = file || evt.filename;
                    line = line || evt.lineno;
                    column = column || evt.colno;
                } else if (type === 'object') {
                    message = JSON.stringify(message);
                }
            } catch (e) {
                //
            }

            if (typeof message !== 'string') {
                return;
            }

            if (file) {
                self.ackError(message, 'sys', {
                    file,
                    line,
                    column,
                    stack: (error && error.stack) || '',
                });
            } else {
                self.ackError(message, 'sys');
            }
        };
    }

    private hookReady() {
        if (document.readyState === 'complete') {
            this.ready();
            return;
        }

        const onDocumentReady = () => {
            if (document.addEventListener) {
                document.removeEventListener('DOMContentLoaded', onDocumentReady, false);
            } else if ((document as any).attachEvent) {
                (document as any).detachEvent('onreadystatechange', onDocumentReady);
            }

            this.ready();
        };

        if (document.addEventListener) {
            document.addEventListener('DOMContentLoaded', onDocumentReady, false);
        } else if ((document as any).attachEvent) {
            (document as any).attachEvent('onreadystatechange', onDocumentReady);
        }
    }

    private hookUnload() {
        const onUnload = () => {
            this.flushAckQueue();
        };

        if (window.addEventListener) {
            window.addEventListener('beforeunload', onUnload, false);
        } else if ((window as any).attachEvent) {
            (window as any).attachEvent('onbeforeunload', onUnload);
        }
    }

    private genQueryString(params: AckParams): string {
        const kvs: string[] = [];
        try {
            for (const key in params) {
                if (!params.hasOwnProperty(key)) {
                    continue;
                }
                let val = params[key];
                if (key === '_app') {
                    val = encodeURI(val);
                } else {
                    val = encodeURIComponent(val);
                }
                kvs.push(key + '=' + val);
            } 
        } catch (e) {
            //
        }
        
        return kvs.join('&');
    }
}

export default BrowserAck;
