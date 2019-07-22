import { Injectable, NgZone } from '@angular/core';
import { Observable } from 'rxjs/Observable';
import { ConnectableObservable } from 'rxjs/observable/ConnectableObservable';
import { Subscriber } from 'rxjs/Subscriber';

import { LoggerService } from './orm/logger-service';
import { Media } from '@ionic-native/media';
import { Subject } from 'rxjs';

declare var datawedge: any
@Injectable()
export class ScannerService {

    private package = "com.mobileit.gtracking.ACTION";

    private stream: Subject<any>;

    private lastKeyUp = 0;
    private nbKey = 0;
    private pressed = false;
    private barcode = "";


    public static TYPE_KEYBOARD = "keyboard";
    public static TYPE_INTENT = "intent";

    public inputType = ScannerService.TYPE_INTENT;

    private preventDefault = false;

    constructor(private zone: NgZone, private media: Media) {
    }

    private keypress(e: KeyboardEvent) {
        if (e.keyCode == 13) {
            this.validateBarcode();
        } else {
            if (e.keyCode >= 48 && e.key && e.key.length == 1) {
                this.detectScan(e);
            }
        }


    }

    private detectScan(e) {

        let date = new Date();
        let milliseconds = date.getMilliseconds();
        let diff = milliseconds - this.lastKeyUp;
        this.lastKeyUp = milliseconds;
        if (diff < 100) {
            this.nbKey++;
        } else {
            this.nbKey = 0;
            this.barcode = "";
        }
        this.barcode = this.barcode + e.key;
        if (this.pressed == false) {
            setTimeout(() => {
                this.validateBarcode();
                this.pressed = false;
            }, 350);
        }
        this.pressed = true;

    }

    private validateBarcode() {
        if (this.nbKey > 3 && this.barcode.length > 3) {

            let codeScanner = this.barcode;
            this.barcode = "";
            this.nbKey = 0;
            this.publish(codeScanner);

        }
    }

    private init() {
        if (!this.stream) {
            this.stream = new Subject();

            //dans le cas de la sortie intent datawedge zebra
            if (datawedge) {
                datawedge.start(this.package);
                datawedge.registerForBarcode((data) => {
                    if (this.inputType == ScannerService.TYPE_INTENT) {
                        this.barcode = "";
                        this.nbKey = 0;
                        let labelType = data.type;
                        let barcode = data.barcode;

                        this.publish(barcode);
                    }
                });
            }

            //dans le cas de la sortie clavier
            Observable.fromEvent(document, 'keydown').subscribe(e => {
                let event: any = e;
                if (this.preventDefault) {
                    event.preventDefault();
                }
                if (this.inputType == ScannerService.TYPE_KEYBOARD) {

                    this.keypress(event);
                }
            });

        }
    }


    public publish(barcode: string) {
        this.init();
        if (!this.stream || !this.stream.observers || this.stream.observers.length == 0) {
            this.errorScan();
        }
        this.zone.run(() => {
            this.stream.next(barcode);
        });
    }

    public getObservable(): Observable<string> {
        this.init();
        return this.stream;
    }

    public disableKeyDown() {
        this.preventDefault = true;
    }
    public enableKeyDown() {
        this.preventDefault = false;
    }


    errorScan() {
        let file = this.media.create("/android_asset/www/sound/0342.mp3");
        file.setVolume(0.8);


        // play the file
        file.play({ numberOfLoops: 1 });

        setTimeout(function () {
            // stop playing the file
            file.stop();
            file.release();
        }, 3000);

    }
}