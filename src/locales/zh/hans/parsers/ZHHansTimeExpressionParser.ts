import { ParsingContext } from "../../../../chrono";
import { AbstractParserWithWordBoundaryChecking } from "../../../../common/parsers/AbstractParserWithWordBoundary";
import { NUMBER, zhStringToNumber } from "../constants";

const FIRST_REG_PATTERN = new RegExp(
    "(?:从|自)?" +
        "(?:" +
        "(今|明|前|大前|后|大后|昨)(早|朝|晚)|" +
        "(上(?:午)|早(?:上)|下(?:午)|晚(?:上)|夜(?:晚)?|中(?:午)|凌(?:晨))|" +
        "(今|明|前|大前|后|大后|昨)(?:日|天)" +
        "(?:[\\s,，]*)" +
        "(?:(上(?:午)|早(?:上)|下(?:午)|晚(?:上)|夜(?:晚)?|中(?:午)|凌(?:晨)))?" +
        ")?" +
        "(?:[\\s,，]*)" +
        "(?:(\\d+|[" +
        Object.keys(NUMBER).join("") +
        "]+)(?:\\s*)(?:点|时|:|：)" +
        "(?:\\s*)" +
        "(\\d+|半|正|整|[" +
        Object.keys(NUMBER).join("") +
        "]+)?(?:\\s*)(?:分|:|：)?" +
        "(?:\\s*)" +
        "(\\d+|[" +
        Object.keys(NUMBER).join("") +
        "]+)?(?:\\s*)(?:秒)?)" +
        "(?:\\s*(A.M.|P.M.|AM?|PM?))?",
    "i"
);

const SECOND_REG_PATTERN = new RegExp(
    "(?:^\\s*(?:到|至|\\-|\\–|\\~|\\〜)\\s*)" +
        "(?:" +
        "(今|明|前|大前|后|大后|昨)(早|朝|晚)|" +
        "(上(?:午)|早(?:上)|下(?:午)|晚(?:上)|夜(?:晚)?|中(?:午)|凌(?:晨))|" +
        "(今|明|前|大前|后|大后|昨)(?:日|天)" +
        "(?:[\\s,，]*)" +
        "(?:(上(?:午)|早(?:上)|下(?:午)|晚(?:上)|夜(?:晚)?|中(?:午)|凌(?:晨)))?" +
        ")?" +
        "(?:[\\s,，]*)" +
        "(?:(\\d+|[" +
        Object.keys(NUMBER).join("") +
        "]+)(?:\\s*)(?:点|时|:|：)" +
        "(?:\\s*)" +
        "(\\d+|半|正|整|[" +
        Object.keys(NUMBER).join("") +
        "]+)?(?:\\s*)(?:分|:|：)?" +
        "(?:\\s*)" +
        "(\\d+|[" +
        Object.keys(NUMBER).join("") +
        "]+)?(?:\\s*)(?:秒)?)" +
        "(?:\\s*(A.M.|P.M.|AM?|PM?))?",
    "i"
);

const DAY_GROUP_1 = 1;
const ZH_AM_PM_HOUR_GROUP_1 = 2;
const ZH_AM_PM_HOUR_GROUP_2 = 3;
const DAY_GROUP_3 = 4;
const ZH_AM_PM_HOUR_GROUP_3 = 5;
const HOUR_GROUP = 6;
const MINUTE_GROUP = 7;
const SECOND_GROUP = 8;
const AM_PM_HOUR_GROUP = 9;

export default class ZHHansTimeExpressionParser extends AbstractParserWithWordBoundaryChecking {
    innerPattern(): RegExp {
        return FIRST_REG_PATTERN;
    }

    innerExtract(context: ParsingContext, match: RegExpMatchArray) {
        // This pattern can be overlaped Ex. [12] AM, 1[2] AM
        if (match.index > 0 && context.text[match.index - 1].match(/\w/)) {
            return null;
        }

        const result = context.createParsingResult(match.index, match[0]);
        const startMoment = new Date(context.refDate.getTime());

        // ----- Day
        if (match[DAY_GROUP_1]) {
            const day1 = match[DAY_GROUP_1];
            if (day1 == "明") {
                // Check not "Tomorrow" on late night
                if (context.refDate.getHours() > 1) {
                    startMoment.setDate(startMoment.getDate() + 1);
                }
            } else if (day1 == "昨") {
                startMoment.setDate(startMoment.getDate() - 1);
            } else if (day1 == "前") {
                startMoment.setDate(startMoment.getDate() - 2);
            } else if (day1 == "大前") {
                startMoment.setDate(startMoment.getDate() - 3);
            } else if (day1 == "后") {
                startMoment.setDate(startMoment.getDate() + 2);
            } else if (day1 == "大后") {
                startMoment.setDate(startMoment.getDate() + 3);
            }
            result.start.assign("day", startMoment.getDate());
            result.start.assign("month", startMoment.getMonth() + 1);
            result.start.assign("year", startMoment.getFullYear());
        } else if (match[DAY_GROUP_3]) {
            const day3 = match[DAY_GROUP_3];
            if (day3 == "明") {
                startMoment.setDate(startMoment.getDate() + 1);
            } else if (day3 == "昨") {
                startMoment.setDate(startMoment.getDate() - 1);
            } else if (day3 == "前") {
                startMoment.setDate(startMoment.getDate() - 2);
            } else if (day3 == "大前") {
                startMoment.setDate(startMoment.getDate() - 3);
            } else if (day3 == "后") {
                startMoment.setDate(startMoment.getDate() + 2);
            } else if (day3 == "大后") {
                startMoment.setDate(startMoment.getDate() + 3);
            }
            result.start.assign("day", startMoment.getDate());
            result.start.assign("month", startMoment.getMonth() + 1);
            result.start.assign("year", startMoment.getFullYear());
        } else {
            result.start.imply("day", startMoment.getDate());
            result.start.imply("month", startMoment.getMonth() + 1);
            result.start.imply("year", startMoment.getFullYear());
        }

        let hour = 0;
        let minute = 0;
        let meridiem = -1;

        // ----- Second
        if (match[SECOND_GROUP]) {
            let second = parseInt(match[SECOND_GROUP]);
            if (isNaN(second)) {
                second = zhStringToNumber(match[SECOND_GROUP]);
            }
            if (second >= 60) return null;
            result.start.assign("second", second);
        }

        hour = parseInt(match[HOUR_GROUP]);
        if (isNaN(hour)) {
            hour = zhStringToNumber(match[HOUR_GROUP]);
        }

        // ----- Minutes
        if (match[MINUTE_GROUP]) {
            if (match[MINUTE_GROUP] == "半") {
                minute = 30;
            } else if (match[MINUTE_GROUP] == "正" || match[MINUTE_GROUP] == "整") {
                minute = 0;
            } else {
                minute = parseInt(match[MINUTE_GROUP]);
                if (isNaN(minute)) {
                    minute = zhStringToNumber(match[MINUTE_GROUP]);
                }
            }
        } else if (hour > 100) {
            minute = hour % 100;
            hour = Math.floor(hour / 100);
        }

        if (minute >= 60) {
            return null;
        }

        if (hour > 24) {
            return null;
        }
        if (hour >= 12) {
            meridiem = 1;
        }

        // ----- AM & PM
        if (match[AM_PM_HOUR_GROUP]) {
            if (hour > 12) return null;
            const ampm = match[AM_PM_HOUR_GROUP][0].toLowerCase();
            if (ampm == "a") {
                meridiem = 0;
                if (hour == 12) hour = 0;
            }

            if (ampm == "p") {
                meridiem = 1;
                if (hour != 12) hour += 12;
            }
        } else if (match[ZH_AM_PM_HOUR_GROUP_1]) {
            const zhAMPMString1 = match[ZH_AM_PM_HOUR_GROUP_1];
            const zhAMPM1 = zhAMPMString1[0];
            if (zhAMPM1 == "早") {
                meridiem = 0;
                if (hour == 12) hour = 0;
            } else if (zhAMPM1 == "晚") {
                meridiem = 1;
                if (hour != 12) hour += 12;
            }
        } else if (match[ZH_AM_PM_HOUR_GROUP_2]) {
            const zhAMPMString2 = match[ZH_AM_PM_HOUR_GROUP_2];
            const zhAMPM2 = zhAMPMString2[0];
            if (zhAMPM2 == "上" || zhAMPM2 == "早" || zhAMPM2 == "凌") {
                meridiem = 0;
                if (hour == 12) hour = 0;
            } else if (zhAMPM2 == "下" || zhAMPM2 == "晚") {
                meridiem = 1;
                if (hour != 12) hour += 12;
            }
        } else if (match[ZH_AM_PM_HOUR_GROUP_3]) {
            const zhAMPMString3 = match[ZH_AM_PM_HOUR_GROUP_3];
            const zhAMPM3 = zhAMPMString3[0];
            if (zhAMPM3 == "上" || zhAMPM3 == "早" || zhAMPM3 == "凌") {
                meridiem = 0;
                if (hour == 12) hour = 0;
            } else if (zhAMPM3 == "下" || zhAMPM3 == "晚") {
                meridiem = 1;
                if (hour != 12) hour += 12;
            }
        }

        result.start.assign("hour", hour);
        result.start.assign("minute", minute);

        if (meridiem >= 0) {
            result.start.assign("meridiem", meridiem);
        } else {
            if (hour < 12) {
                result.start.imply("meridiem", 0);
            } else {
                result.start.imply("meridiem", 1);
            }
        }

        // ==============================================================
        //                  Extracting the 'to' chunk
        // ==============================================================

        const secondMatch = SECOND_REG_PATTERN.exec(context.text.substring(result.index + result.text.length));
        if (!secondMatch) {
            // Not accept number only result
            if (result.text.match(/^\d+$/)) {
                return null;
            }
            return result;
        }

        const endMoment = new Date(startMoment.getTime());
        result.end = context.createParsingComponents();

        // ----- Day
        if (secondMatch[DAY_GROUP_1]) {
            const day1 = secondMatch[DAY_GROUP_1];
            if (day1 == "明") {
                // Check not "Tomorrow" on late night
                if (context.refDate.getHours() > 1) {
                    endMoment.setDate(endMoment.getDate() + 1);
                }
            } else if (day1 == "昨") {
                endMoment.setDate(endMoment.getDate() - 1);
            } else if (day1 == "前") {
                endMoment.setDate(endMoment.getDate() - 2);
            } else if (day1 == "大前") {
                endMoment.setDate(endMoment.getDate() - 3);
            } else if (day1 == "后") {
                endMoment.setDate(endMoment.getDate() + 2);
            } else if (day1 == "大后") {
                endMoment.setDate(endMoment.getDate() + 3);
            }
            result.end.assign("day", endMoment.getDate());
            result.end.assign("month", endMoment.getMonth() + 1);
            result.end.assign("year", endMoment.getFullYear());
        } else if (secondMatch[DAY_GROUP_3]) {
            const day3 = secondMatch[DAY_GROUP_3];
            if (day3 == "明") {
                endMoment.setDate(endMoment.getDate() + 1);
            } else if (day3 == "昨") {
                endMoment.setDate(endMoment.getDate() - 1);
            } else if (day3 == "前") {
                endMoment.setDate(endMoment.getDate() - 2);
            } else if (day3 == "大前") {
                endMoment.setDate(endMoment.getDate() - 3);
            } else if (day3 == "后") {
                endMoment.setDate(endMoment.getDate() + 2);
            } else if (day3 == "大后") {
                endMoment.setDate(endMoment.getDate() + 3);
            }
            result.end.assign("day", endMoment.getDate());
            result.end.assign("month", endMoment.getMonth() + 1);
            result.end.assign("year", endMoment.getFullYear());
        } else {
            result.end.imply("day", endMoment.getDate());
            result.end.imply("month", endMoment.getMonth() + 1);
            result.end.imply("year", endMoment.getFullYear());
        }

        hour = 0;
        minute = 0;
        meridiem = -1;

        // ----- Second
        if (secondMatch[SECOND_GROUP]) {
            let second = parseInt(secondMatch[SECOND_GROUP]);
            if (isNaN(second)) {
                second = zhStringToNumber(secondMatch[SECOND_GROUP]);
            }

            if (second >= 60) return null;
            result.end.assign("second", second);
        }

        hour = parseInt(secondMatch[HOUR_GROUP]);
        if (isNaN(hour)) {
            hour = zhStringToNumber(secondMatch[HOUR_GROUP]);
        }

        // ----- Minutes
        if (secondMatch[MINUTE_GROUP]) {
            if (secondMatch[MINUTE_GROUP] == "半") {
                minute = 30;
            } else if (secondMatch[MINUTE_GROUP] == "正" || secondMatch[MINUTE_GROUP] == "整") {
                minute = 0;
            } else {
                minute = parseInt(secondMatch[MINUTE_GROUP]);
                if (isNaN(minute)) {
                    minute = zhStringToNumber(secondMatch[MINUTE_GROUP]);
                }
            }
        } else if (hour > 100) {
            minute = hour % 100;
            hour = Math.floor(hour / 100);
        }

        if (minute >= 60) {
            return null;
        }

        if (hour > 24) {
            return null;
        }
        meridiem = -1;

        // ----- AM & PM
        if (secondMatch[AM_PM_HOUR_GROUP]) {
            if (hour > 12) return null;
            const ampm = secondMatch[AM_PM_HOUR_GROUP][0].toLowerCase();
            if (ampm == "a") {
                meridiem = 0;
                if (hour == 12) hour = 0;
            }

            if (ampm == "p") {
                meridiem = 1;
                if (hour != 12) hour += 12;
            }

            if (!result.start.isCertain("meridiem")) {
                // 只有结束端带 am/pm（如 "1点pm到3点"），开始端在能形成当天短区间时顺着结束端取。
                const startHour = result.start.get("hour");
                const sameSideHour =
                    meridiem == 1 ? (startHour === 12 ? 12 : startHour + 12) : startHour === 12 ? 0 : startHour;
                if (sameSideHour < hour) {
                    result.start.assign("meridiem", meridiem);
                    if (meridiem == 1) {
                        if (startHour != 12) {
                            result.start.assign("hour", startHour + 12);
                        }
                    } else {
                        if (startHour == 12) {
                            result.start.assign("hour", 0);
                        }
                    }
                } else {
                    result.start.imply("meridiem", meridiem == 1 ? 0 : 1);
                    if (meridiem == 0 && startHour != 12) {
                        result.start.assign("hour", startHour + 12);
                    }
                }
            }
        } else if (secondMatch[ZH_AM_PM_HOUR_GROUP_1]) {
            const zhAMPMString1 = secondMatch[ZH_AM_PM_HOUR_GROUP_1];
            const zhAMPM1 = zhAMPMString1[0];
            if (zhAMPM1 == "早") {
                meridiem = 0;
                if (hour == 12) hour = 0;
            } else if (zhAMPM1 == "晚") {
                meridiem = 1;
                if (hour != 12) hour += 12;
            }
        } else if (secondMatch[ZH_AM_PM_HOUR_GROUP_2]) {
            const zhAMPMString2 = secondMatch[ZH_AM_PM_HOUR_GROUP_2];
            const zhAMPM2 = zhAMPMString2[0];
            if (zhAMPM2 == "上" || zhAMPM2 == "早" || zhAMPM2 == "凌") {
                meridiem = 0;
                if (hour == 12) hour = 0;
            } else if (zhAMPM2 == "下" || zhAMPM2 == "晚") {
                meridiem = 1;
                if (hour != 12) hour += 12;
            }
        } else if (secondMatch[ZH_AM_PM_HOUR_GROUP_3]) {
            const zhAMPMString3 = secondMatch[ZH_AM_PM_HOUR_GROUP_3];
            const zhAMPM3 = zhAMPMString3[0];
            if (zhAMPM3 == "上" || zhAMPM3 == "早" || zhAMPM3 == "凌") {
                meridiem = 0;
                if (hour == 12) hour = 0;
            } else if (zhAMPM3 == "下" || zhAMPM3 == "晚") {
                meridiem = 1;
                if (hour != 12) hour += 12;
            }
        }

        if (
            meridiem >= 0 &&
            (secondMatch[ZH_AM_PM_HOUR_GROUP_1] ||
                secondMatch[ZH_AM_PM_HOUR_GROUP_2] ||
                secondMatch[ZH_AM_PM_HOUR_GROUP_3]) &&
            !result.start.isCertain("meridiem")
        ) {
            // 只有结束端带上午/下午等词（如 "3点到下午5点"），开始端在能形成当天短区间时顺着结束端取。
            const startHour = result.start.get("hour");
            const sameSideHour =
                meridiem == 1 ? (startHour === 12 ? 12 : startHour + 12) : startHour === 12 ? 0 : startHour;
            if (sameSideHour < hour) {
                result.start.assign("meridiem", meridiem);
                if (meridiem == 1) {
                    if (startHour != 12) {
                        result.start.assign("hour", startHour + 12);
                    }
                } else {
                    if (startHour == 12) {
                        result.start.assign("hour", 0);
                    }
                }
            } else {
                result.start.imply("meridiem", meridiem == 1 ? 0 : 1);
                if (meridiem == 0 && startHour != 12) {
                    result.start.assign("hour", startHour + 12);
                }
            }
        }

        result.text = result.text + secondMatch[0];
        result.end.assign("hour", hour);
        result.end.assign("minute", minute);
        if (meridiem >= 0) {
            result.end.assign("meridiem", meridiem);
        } else if (hour > 12) {
            // 24 小时制的裸钟点，如 "13点到21点"
            result.end.imply("meridiem", 1);
        } else if (result.start.isCertain("meridiem")) {
            // 只有开始端带上下午等词（如 "下午3点到5点"、"上午10点到2点"），
            // 结束端尽量顺着它取当天的时间，取不下时才跨到凌晨（如 "晚上11点到1点"）。
            const startHour = result.start.get("hour");
            if (result.start.get("meridiem") == 1) {
                if (hour === 12 || startHour >= (hour === 12 ? 24 : hour + 12)) {
                    // 晚上11点到1点：跨夜
                    if (hour === 12) {
                        hour = 0;
                        result.end.assign("hour", hour);
                    }
                    result.end.imply("meridiem", 0);
                } else {
                    hour = hour + 12;
                    result.end.assign("hour", hour);
                    result.end.assign("meridiem", 1);
                }
            } else {
                if (hour !== 12 && startHour < hour) {
                    // 凌晨1点到3点：仍在上午
                    result.end.imply("meridiem", 0);
                } else {
                    // 上午10点到2点：进入下午；上午11点到12点：当天中午
                    hour = hour === 12 ? 12 : hour + 12;
                    result.end.assign("hour", hour);
                    result.end.assign("meridiem", 1);
                }
            }
        } else if (hour === 12) {
            // 两端都没有上下午提示时，裸 12 点仍按中午
            result.end.imply("meridiem", 1);
        }

        if (result.end.date().getTime() < result.start.date().getTime()) {
            result.end.imply("day", result.end.get("day") + 1);
        }

        return result;
    }
}
