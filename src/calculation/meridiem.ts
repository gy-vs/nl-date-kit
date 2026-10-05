import { Meridiem } from "../types";

/**
 * Decide the meridiem (AM/PM) for one side of a time range that does not have
 * an explicit meridiem marker, e.g. the ending "5" in "9am - 5" or the start
 * "11" in "11 - 1pm".
 *
 * The other side of the range is already resolved (in 24-hour form). The
 * ambiguous hour is interpreted as either the AM or PM clock position, and the
 * interpretation producing a short forward interval is chosen:
 *
 * - "9am - 5"  => 9:00 - 17:00 (instead of the next day at 5:00)
 * - "11 - 1pm" => 11:00 - 13:00 (instead of 23:00 - next day 13:00)
 *
 * A positive duration is preferred over an empty one, so "9am - 9" resolves to
 * 9:00 - 21:00 rather than a zero-length range.
 *
 * @param ambiguousHour The hour (1-12) without an explicit meridiem
 * @param ambiguousMinute The minute of the hour without an explicit meridiem
 * @param referenceHour The resolved hour (0-23) of the other side of the range
 * @param referenceMinute The resolved minute of the other side of the range
 * @param ambiguousIsEnd Whether the ambiguous hour is the ending side
 * @param ambiguousDayOffset Day difference of the ambiguous side's date
 * relative to the reference side (e.g. "下午3点到明天5点" passes 1 for the end)
 */
export function inferRangeMeridiem(
    ambiguousHour: number,
    ambiguousMinute: number,
    referenceHour: number,
    referenceMinute: number,
    ambiguousIsEnd: boolean,
    ambiguousDayOffset = 0
): Meridiem {
    const DAY_IN_MINUTES = 24 * 60;
    const referenceTime = referenceHour * 60 + referenceMinute;

    // Forward distance (in minutes) from the reference time to the candidate,
    // wrapping around the day and avoiding a zero-length interval.
    const forwardGap = (candidateHour: number): number => {
        const candidateTime = candidateHour * 60 + ambiguousMinute + ambiguousDayOffset * DAY_IN_MINUTES;
        const gap = ambiguousIsEnd ? candidateTime - referenceTime : referenceTime - candidateTime;
        return gap > 0 ? gap : gap + DAY_IN_MINUTES;
    };

    const amGap = forwardGap(to24Hour(ambiguousHour, Meridiem.AM));
    const pmGap = forwardGap(to24Hour(ambiguousHour, Meridiem.PM));
    return amGap <= pmGap ? Meridiem.AM : Meridiem.PM;
}

export function to24Hour(hour: number, meridiem: Meridiem): number {
    if (meridiem === Meridiem.PM) {
        return hour === 12 ? 12 : hour + 12;
    }
    return hour === 12 ? 0 : hour;
}
