import { Injectable } from '@angular/core';
import { Network } from '@ionic-native/network';
import { LoggerService } from './orm/logger-service';
import { Observable } from 'rxjs/Observable';
import { ConnectableObservable } from 'rxjs/observable/ConnectableObservable';
import { Subscriber } from 'rxjs/Subscriber';
@Injectable()
export class NetworkService {



    private static isNetworkConnected = true;

    private static connectionType: string;

    private static disconnectSubscription = null;

    private static connectSubscription = null;

    private static stream: ConnectableObservable<any>;
    private static observer: Subscriber<any>;


    constructor(private network: Network) {

    }

    private static init() {
        if (!NetworkService.stream) {
            NetworkService.stream = new Observable<any>(observer => { NetworkService.observer = observer }).publish();
            NetworkService.stream.connect();
        }
    }

    public isConnected(): boolean {
        return NetworkService.isNetworkConnected;
    }

    public getConnectionType() {
        return NetworkService.connectionType;
    }

    public checkNetwork() {

        setTimeout(() => {
            if (this.network.type === "none") {
                this.setIsNetworkConnected(false);
                LoggerService.info("Device offline");
            } else {
                this.setIsNetworkConnected(true);
                LoggerService.info("Device online (" + this.network.type + ")");
            }
            NetworkService.connectionType = this.network.type;
        }, 3000);



        if (NetworkService.disconnectSubscription != null) {
            NetworkService.disconnectSubscription.unsubscribe();
        }

        if (NetworkService.connectSubscription != null) {
            NetworkService.connectSubscription.unsubscribe();
        }
        // watch network for a disconnect
        NetworkService.disconnectSubscription = this.network.onDisconnect().subscribe(() => {
            LoggerService.info("Device offline");
            this.setIsNetworkConnected(false);
        });
        // watch network for a connection
        NetworkService.connectSubscription = this.network.onConnect().subscribe(() => {
            this.setIsNetworkConnected(true);
            setTimeout(() => {
                LoggerService.info("Device online (" + this.network.type + ")");
                NetworkService.connectionType = this.network.type;
            }, 3000);
        });

    }

    private setIsNetworkConnected(isNetworkConnected) {
        NetworkService.isNetworkConnected = isNetworkConnected;
        this.publishChanged(isNetworkConnected);
    }

    private publishChanged(isNetworkConnected) {
        NetworkService.init();
        NetworkService.observer.next(isNetworkConnected);
    }

    public static getObservableOnChanged(): Observable<any> {
        NetworkService.init();
        return NetworkService.stream;
    }


}