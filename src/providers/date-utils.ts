
export class DateUtils {

    static secondsToTimeHHmm(valueSeconds) {

        let sec_num = Math.abs(parseInt(valueSeconds, 10));
        let hours = Math.floor(sec_num / 3600);
        let minutes = Math.floor((sec_num - (hours * 3600)) / 60);

        let hoursString = hours + "";
        let minuteString = minutes + "";
        if (hours < 10) { hoursString = "0" + hours; }
        if (minutes < 10) { minuteString = "0" + minutes; }

        return hoursString + ':' + minuteString;
    }

    static secondsToTimeHHmmss(valueSeconds) {

        let sec_num = Math.abs(parseInt(valueSeconds, 10));
        let hours = Math.floor(sec_num / 3600);
        let minutes = Math.floor((sec_num - (hours * 3600)) / 60);
        var seconds = sec_num - (hours * 3600) - (minutes * 60);

        let hoursString = hours + "";
        let minuteString = minutes + "";
        let secondsString = seconds + "";
        if (hours < 10) { hoursString = "0" + hours; }
        if (minutes < 10) { minuteString = "0" + minutes; }
        if (seconds < 10) { secondsString = "0" + seconds; }

        return hoursString + ':' + minuteString + ":" + secondsString;
    }

}
