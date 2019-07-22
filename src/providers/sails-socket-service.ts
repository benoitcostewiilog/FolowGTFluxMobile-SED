import { Injectable } from '@angular/core';
import { LoggerService } from './orm/logger-service';
import * as io from 'socket.io-client';

import { Observable } from 'rxjs/Observable';

@Injectable()
export class SailsSocketService {


    public static reconnectionDelay = 5000;
    public static reconnectionDelayMax = 60000;
    public static reconnectionAttempts = Infinity;
    private static socket = null;



    static connect(serverHost, serverPort) {
        if (SailsSocketService.socket == null) {
            let url = "https://" + serverHost + ":" + serverPort;
            SailsSocketService.socket = io(url, {
                query: "__sails_io_sdk_version=0.13.7&__sails_io_sdk_platform=android&__sails_io_sdk_language=javascript",
                reconnection: true,
                reconnectionDelay: SailsSocketService.reconnectionDelay,
                reconnectionDelayMax: SailsSocketService.reconnectionDelayMax,
                reconnectionAttempts: SailsSocketService.reconnectionAttempts
            });
            SailsSocketService.on('disconnect').subscribe(() => { LoggerService.info("Socket disconnected"); });
            SailsSocketService.on('reconnect').subscribe((attempt) => { LoggerService.info("Socket reconnected after " + attempt + " attempts"); });
            SailsSocketService.on('reconnecting').subscribe((attempt) => { LoggerService.info("Socket try to reconnect " + attempt); });
            SailsSocketService.on('connect').subscribe(() => { LoggerService.info("Socket connected"); });
        }
    }

    static close() {
        if (SailsSocketService.socket) {
            SailsSocketService.socket.close();
            SailsSocketService.socket = null;
        }
    }

    static on(event) {
        return new Observable<any>(observer => {
            if (SailsSocketService.socket) {
                SailsSocketService.socket.on(event, (value) => { observer.next(value) }, (error) => { observer.error(error) });
            } else {
                observer.error("Socket not connected");
            }
        });

    }

    static get(url) {
        if (SailsSocketService.socket) {
            SailsSocketService.socket.emit('get', {
                method: 'get',
                headers: {},
                data: {},
                url: url.replace(/^(.+)\/*\s*$/, '$1')
            });
        }
    }


}