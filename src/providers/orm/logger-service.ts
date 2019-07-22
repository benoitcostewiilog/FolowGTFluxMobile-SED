import { Injectable } from '@angular/core';

@Injectable()
export class LoggerService {

    public static logLevel = 1;

    public static get LOG_ERROR(): number { return 1; }
    public static get LOG_WARNING(): number { return 2; }
    public static get LOG_INFO(): number { return 3; }
    public static get LOG_DEBUG(): number { return 4; }


    public static log(message: any, type: number, ...data: any[]) {
        if (!data && data.length <= 0) {
            data = null;
        }
        if (type <= LoggerService.logLevel) {
            switch (type) {
                case LoggerService.LOG_ERROR:
                    console.error(message, data);
                    break;
                case LoggerService.LOG_WARNING:
                    console.warn(message, data);
                    break;
                case LoggerService.LOG_INFO:
                    console.info(message, data);
                    break;
                case LoggerService.LOG_DEBUG:
                    console.log(message, data);
                    break;
                default:
                    console.log(message, data);
                    break;
            }
        }
    }

    public static error(message: any, ...data: any[]) {
        LoggerService.log(message, LoggerService.LOG_ERROR, data);
    }
    public static warning(message: any, ...data: any[]) {
        LoggerService.log(message, LoggerService.LOG_WARNING, data);
    }
    public static info(message: any, ...data: any[]) {
        LoggerService.log(message, LoggerService.LOG_INFO, data);
    }
    public static debug(message: any, ...data: any[]) {
        LoggerService.log(message, LoggerService.LOG_DEBUG, data);
    }

}