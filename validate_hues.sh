function isHueInRange {
    local HUE=$1
    local LOWER_BOUND=$2
    local UPPER_BOUND=$3

    if (( $HUE >= $LOWER_BOUND )) && (( $HUE < $UPPER_BOUND )); then
        echo true
    elif (( $LOWER_BOUND > $UPPER_BOUND )); then
        if (( $HUE >= $LOWER_BOUND )) || (( $HUE < $UPPER_BOUND )); then
            echo true
        else
            echo false
        fi
    else
        echo false
    fi
}

if [ $# -eq 0 ]; then
    echo "Usage: $0 accentArrayName"
    exit 1
fi

ACCENT_ARRAY=$1

HUE_RANGES=($(pcregrep -M "$ACCENT_ARRAY = \[(.|\n)*?\]" extension.js | \
    grep -Eo 'HueRange\(.*\)' | grep -o '[0-9]* *, *[0-9]*' | tr -d ' '))

INTERVALS=($(seq 0 1 360))

for INTERVAL in ${INTERVALS[*]}; do
    IN_RANGE=false

    for RANGE in ${HUE_RANGES[*]}; do
        LOWER_BOUND=$(echo $RANGE | cut -d ',' -f1)
        UPPER_BOUND=$(echo $RANGE | cut -d ',' -f2)

        IN_RANGE="$(isHueInRange $INTERVAL $LOWER_BOUND $UPPER_BOUND)"
        #echo $INTERVAL in \($LOWER_BOUND, $UPPER_BOUND\): $IN_RANGE

        if ($IN_RANGE); then
            break
        fi
    done

    if [[ $IN_RANGE == false ]]; then
        echo Hue value $INTERVAL is not covered by a hue range.
        exit 1
    fi
done

echo No problems with hue ranges.
