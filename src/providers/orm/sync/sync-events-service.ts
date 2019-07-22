import { Injectable } from '@angular/core';
import { Observable } from 'rxjs/Observable';
import { ConnectableObservable } from 'rxjs/observable/ConnectableObservable';
import { Subscriber } from 'rxjs/Subscriber';

@Injectable()
export class SyncEventsService {

    private static stream: ConnectableObservable<any>;
    private static observer: Subscriber<any>;

    private static topicSyncDown = "sync:down:";
    private static topicDataUpdated = "data:updated:";

    private static init() {
        if (!SyncEventsService.stream) {
            SyncEventsService.stream = new Observable<any>(observer => { SyncEventsService.observer = observer }).publish();
            SyncEventsService.stream.connect();
        }
    }

    public static publishSyncDownOver(tableName) {
        SyncEventsService.publish(SyncEventsService.topicSyncDown + tableName, {});
    }

    public static publishDataUpdated(tableName) {
        SyncEventsService.publish(SyncEventsService.topicDataUpdated + tableName, {});
    }

    public static publish(topic, data) {
        SyncEventsService.init();
        SyncEventsService.observer.next({ topic: topic, data: data });
    }

    public static getObservableSyncDownOver(tableName): Observable<any> {
        return SyncEventsService.getObservable(SyncEventsService.topicSyncDown + tableName);
    }
    public static getObservableDataUpdated(tableName): Observable<any> {
        return SyncEventsService.getObservable(SyncEventsService.topicDataUpdated + tableName);
    }
    public static getObservable(topic): Observable<any> {
        SyncEventsService.init();
        return SyncEventsService.stream.filter((value, index) => {
            return topic == value.topic;
        });
    }



}